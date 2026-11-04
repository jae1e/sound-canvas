package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Bundle
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import expo.modules.vlcsessionservice.audio.EarconPlayer
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
import expo.modules.vlcsessionservice.speech.engine.SherpaTtsEngine
import expo.modules.vlcsessionservice.speech.engine.SpeakCallback
import expo.modules.vlcsessionservice.speech.engine.SpeakRequest
import android.media.AudioDeviceInfo
import java.io.File
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/** Per-utterance options: an earcon to play now while the voice is not ready, and when the phrase stops being true. */
data class SpeakOpts(val earcon: String? = null, val staleAtEpochMs: Long = 0L)

/**
 * Session speech output with ONE voice per session. [init] chooses the voice once: Supertonic (sherpa-onnx, in-process)
 * when wanted and its model is downloaded, else Android TextToSpeech for the whole session. Nothing mixes engines:
 *  - a cue whose audio is not ready gets an earcon (when the caller asked for one), then speech in the session voice as
 *    soon as it is ready, unless it went stale (`speech_late`, `speech_dropped_stale`);
 *  - if the Supertonic engine fails (error outcome, load failure) it is reloaded once, with earcons in the meantime; if
 *    that fails too, the platform voice announces the change once and takes over for the rest of the session
 *    (`voice_switched`). That is the only allowed mid-session switch.
 * Android TextToSpeech wrapper living inside the foreground service.
 * `onStart` of UtteranceProgressListener is our "audible start" proxy (the engine has begun
 * to synthesise/play; real acoustic output can lag by tens of ms).
 */
class TtsController(
  private val context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
  /** Called on every TTS audible start with (utteranceId, cueId, startElapsedRealtime). */
  private val onAudibleStart: (String, String?, Long, String) -> Unit,
) {
  private class Pending(
    val text: String,
    val cueId: String?,
    val source: String,
    val requestedRt: Long,
    @Volatile var engine: String,
    @Volatile var started: Boolean = false,
    val earcon: String? = null,
    val staleAtEpochMs: Long = 0L,
    @Volatile var earconPlayed: Boolean = false,
    @Volatile var attempts: Int = 0,
  )

  // ---- Supertonic path state (guarded by stLock) ----
  private val stLock = Any()
  private var stEngine: SherpaTtsEngine? = null
  private val stQueue = ArrayDeque<String>()
  private var stCurrent: String? = null
  private var shutdownFlag = false

  // ---- session voice (chosen once in init) ----
  /** "supertonic" or "platform"; changes only through [switchToPlatform]. */
  @Volatile var sessionVoice: String = "platform"
    private set
  @Volatile var sessionSid: Int = 0
    private set
  @Volatile var sessionSteps: Int = 8
    private set
  /** Why the session voice is the platform voice although Supertonic was wanted ("model_missing", ...), else null. */
  @Volatile var degradedReason: String? = null
    private set
  @Volatile var voiceSwitched = false
    private set
  @Volatile private var reloadsUsed = 0
  @Volatile private var spokeInSupertonic = false
  /** Set by the service; plays the earcon of a cue whose speech is not ready. */
  @Volatile var earcons: EarconPlayer? = null
  /** Called whenever the session voice state changes (start decision, reload, switch). */
  @Volatile var onVoiceEvent: ((Map<String, Any?>) -> Unit)? = null

  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var tts: TextToSpeech? = null
  @Volatile private var ready = false
  @Volatile private var locale: Locale = Locale.KOREA
  @Volatile private var communicationUsage = false
  private val seq = AtomicInteger()
  private val pending = ConcurrentHashMap<String, Pending>()
  private val activeCount = AtomicInteger()
  private val lastActivityRt = AtomicLong(0)
  private var focusRequest: AudioFocusRequest? = null
  private val queuedBeforeReady = ArrayList<() -> Unit>()

  /** Called with true when the first utterance is queued and false when the last one finished (half-duplex STT pause/resume). */
  @Volatile var onActiveChanged: ((Boolean) -> Unit)? = null

  /** True while an utterance is queued/playing or finished within [graceMs] (echo tail). */
  fun isActive(graceMs: Long = 0): Boolean =
    activeCount.get() > 0 || (graceMs > 0 && SystemClock.elapsedRealtime() - lastActivityRt.get() < graceMs)

  fun init(language: String) {
    locale = localeFor(language)
    // The voice is decided here, once. Later setSessionTts changes apply to the next session.
    sessionSid = SessionTts.voice
    sessionSteps = SessionTts.steps
    val wants = SessionTts.wantsSupertonic()
    if (wants && SessionTts.modelReady(context)) {
      sessionVoice = "supertonic"
      degradedReason = null
    } else {
      sessionVoice = "platform"
      degradedReason = if (wants) "model_missing" else null
    }
    log.log("session_voice_chosen", voiceInfo())
    onVoiceEvent?.invoke(voiceInfo())
    ensureSupertonic()
    tts = TextToSpeech(context) { status ->
      synchronized(queuedBeforeReady) {
        if (status != TextToSpeech.SUCCESS) {
          log.log("error", mapOf("where" to "tts_init", "status" to status))
          emit("sessionError", mapOf("code" to "TTS_INIT_FAILED", "message" to "TextToSpeech init failed ($status)"))
          return@TextToSpeech
        }
        tts?.setOnUtteranceProgressListener(listener)
        applyLanguage()
        ready = true
        log.log("tts_ready", mapOf("engine" to tts?.defaultEngine, "locale" to locale.toLanguageTag()))
        queuedBeforeReady.forEach { it() }
        queuedBeforeReady.clear()
      }
    }
  }

  fun setLanguage(language: String) {
    locale = localeFor(language)
    if (ready) applyLanguage()
  }

  fun setCommunicationUsage(enabled: Boolean) {
    communicationUsage = enabled
  }

  private fun currentUsage() = SpeechOutput.usageFor(inProcess = false, communicationMode = communicationUsage)

  private fun applyLanguage() {
    val t = tts ?: return
    val r = t.setLanguage(locale)
    log.log("tts_language", mapOf("locale" to locale.toLanguageTag(), "result" to r))
    if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
      emit("sessionError", mapOf("code" to "TTS_LANGUAGE_UNAVAILABLE", "message" to "TTS has no voice for ${locale.toLanguageTag()} (result $r)"))
    }
  }

  fun voiceInfo(): Map<String, Any?> = mapOf(
    "voice" to sessionVoice,
    "degraded" to (degradedReason != null),
    "reason" to degradedReason,
    "switched" to voiceSwitched,
    "reloadsUsed" to reloadsUsed,
    "loaded" to (synchronized(stLock) { stEngine != null }),
    "reloading" to (sessionVoice == "supertonic" && reloadsUsed > 0 && synchronized(stLock) { stEngine == null }),
    "voiceId" to sessionSid,
    "steps" to sessionSteps,
  )

  /** The user has heard the Supertonic voice (live or cached clip), so a later change of voice must be announced. */
  fun noteSupertonicHeard() {
    if (sessionVoice == "supertonic") spokeInSupertonic = true
  }

  /** @param priority "high"/"cue" flush the queue; anything else appends. */
  fun speak(text: String, priority: String, cueId: String?, source: String, opts: SpeakOpts = SpeakOpts()): String {
    val id = "u${seq.incrementAndGet()}"
    val requestedRt = SystemClock.elapsedRealtime()
    val flush = priority == "high" || priority == "cue"
    if (sessionVoice == "supertonic" && stEngine == null) ensureSupertonic()
    val engine = sessionVoice // one voice per session: never chosen per utterance
    val p = Pending(text, cueId, source, requestedRt, engine, earcon = if (engine == "supertonic") opts.earcon else null, staleAtEpochMs = opts.staleAtEpochMs)
    pending[id] = p
    if (activeCount.incrementAndGet() == 1) onActiveChanged?.invoke(true)
    log.log("tts_request", mapOf("utteranceId" to id, "priority" to priority, "cueId" to cueId, "source" to source, "chars" to text.length, "engine" to engine, "earcon" to p.earcon, "staleAtEpochMs" to opts.staleAtEpochMs))
    if (engine == "supertonic") {
      // Synthesis takes about 1.8 s and is not streamed: mask it with the earcon, then speak when ready.
      p.earcon?.let { name -> p.earconPlayed = earcons?.play(name, "speech:${cueId ?: source}") == true }
      speakSupertonic(id, flush)
    } else {
      if (flush) stClear()
      speakPlatform(id, text, flush)
    }
    return id
  }

  private fun speakPlatform(id: String, text: String, flush: Boolean) {
    val action = {
      val t = tts
      if (t == null) {
        finish(id, "error")
      } else {
        // Forced-speaker mode switches routing and attributes here (platform engine = other process).
        SpeechOutput.beginSpeech(context, inProcess = false)
        t.setAudioAttributes(SpeechOutput.attributes(currentUsage()))
        requestFocus(currentUsage())
        val mode = if (flush) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
        val r = t.speak(text, mode, Bundle(), id)
        if (r != TextToSpeech.SUCCESS) {
          log.log("error", mapOf("where" to "tts_speak", "result" to r))
          emit("sessionError", mapOf("code" to "TTS_SPEAK_FAILED", "message" to "TextToSpeech.speak returned $r"))
          finish(id, "error")
        } else if (mode == TextToSpeech.QUEUE_FLUSH) {
          // Flushed utterances never report onDone; reconcile counters.
          reconcileAfterFlush(id)
        }
      }
    }
    synchronized(queuedBeforeReady) {
      if (ready) action() else queuedBeforeReady.add(action)
    }
  }

  // ---- Supertonic path ----------------------------------------------------------------------------

  /** Loads the Supertonic engine in the background if it is the session voice. Never blocks the caller. */
  fun ensureSupertonic() {
    if (sessionVoice != "supertonic") return
    if (!SessionTts.modelReady(context)) {
      SessionTts.lastError = "Model ${SessionTts.SUPERTONIC_SET} is not downloaded"
      return
    }
    startLoad()
  }

  private fun startLoad() {
    synchronized(stLock) {
      if (shutdownFlag || stEngine != null || SessionTts.loading) return
      SessionTts.loading = true
    }
    Thread({
      val e = SherpaTtsEngine(context, "supertonic", "Supertonic 3", SherpaTtsEngine.Kind.SUPERTONIC)
      val r = try { e.prepare(locale) } catch (t: Throwable) { mapOf("ok" to false, "error" to t.chainText()) }
      var discard = false
      synchronized(stLock) {
        SessionTts.loading = false
        if (shutdownFlag) discard = true
        else if (r["ok"] == true) {
          stEngine = e
          SessionTts.loaded = true
          SessionTts.lastError = null
        } else {
          SessionTts.lastError = (r["error"] ?: "prepare failed").toString()
          discard = true
        }
      }
      log.log("tts_session_supertonic_load", mapOf("ok" to !discard, "reloads" to reloadsUsed, "result" to r.filterKeys { it != "modelLang" }))
      if (discard) {
        try { e.release() } catch (_: Throwable) {}
        if (!shutdownFlag) onEngineLost("load_failed:${SessionTts.lastError}")
      } else {
        onVoiceEvent?.invoke(voiceInfo())
        synchronized(stLock) { pumpLocked() } // queued cues waited for the engine
      }
    }, "vlc-st-load").start()
  }

  /**
   * The Supertonic engine is gone (load failed, error outcome, unloaded). Reload it once; the cues that need it wait
   * behind their earcons. After the second loss, switch the whole session to the platform voice.
   */
  private fun onEngineLost(reason: String) {
    if (sessionVoice != "supertonic" || shutdownFlag) return
    val old = synchronized(stLock) { stEngine.also { stEngine = null } }
    SessionTts.loaded = false
    if (old != null) Thread({ try { old.release() } catch (_: Throwable) {} }, "vlc-st-release").start()
    log.log("voice_engine_lost", mapOf("reason" to reason, "reloadsUsed" to reloadsUsed, "spokeInSupertonic" to spokeInSupertonic))
    if (reloadsUsed < 1) {
      reloadsUsed++
      log.log("voice_reload", mapOf("reason" to reason))
      onVoiceEvent?.invoke(voiceInfo())
      startLoad()
    } else {
      switchToPlatform(reason, announce = spokeInSupertonic)
    }
  }

  /** The one allowed mid-session switch. Announces it once in the new voice when the user had already heard Supertonic. */
  private fun switchToPlatform(reason: String, announce: Boolean) {
    val waiting: List<String>
    synchronized(stLock) {
      sessionVoice = "platform"
      voiceSwitched = announce
      degradedReason = if (announce) "voice_switched" else "load_failed"
      waiting = stQueue.toList()
      stQueue.clear()
      stCurrent = null
    }
    log.log("voice_switched", mapOf("from" to "supertonic", "to" to "platform", "reason" to reason, "announced" to announce, "queued" to waiting.size))
    onVoiceEvent?.invoke(voiceInfo())
    waiting.forEach { id -> pending[id]?.let { p -> p.engine = "platform" } }
    if (announce) speak(VOICE_SWITCH_MESSAGES[if (locale.language == "en") "en" else "ko"]!!, "normal", null, "voice_switch")
    waiting.forEach { id -> pending[id]?.let { speakPlatform(id, it.text, false) } }
  }

  /** Stops the Supertonic engine and forgets queued items; their `pending` entries are the caller's to finish. */
  private fun stClear() {
    val e: SherpaTtsEngine?
    synchronized(stLock) {
      stQueue.clear()
      stCurrent = null
      e = stEngine
    }
    e?.stop()
  }

  private fun speakSupertonic(id: String, flush: Boolean) {
    if (flush) {
      tts?.stop()
      stClear()
    }
    synchronized(stLock) {
      stQueue.addLast(id)
      pumpLocked()
    }
    if (flush) reconcileAfterFlush(id)
  }

  private fun pumpLocked() {
    while (stCurrent == null) {
      val id = stQueue.firstOrNull() ?: return
      val p = pending[id]
      if (p == null) { stQueue.removeFirst(); continue }
      if (isStale(p)) { stQueue.removeFirst(); dropStale(id, p, "queue"); continue }
      val eng = stEngine ?: return // loading or reloading: the load thread pumps again; the cue's earcon already played
      stQueue.removeFirst()
      stCurrent = id
      p.attempts++
      try {
        requestFocus(SpeechOutput.trackUsage())
        val req = SpeakRequest(id, p.text, locale, sessionSid.toString(), p.requestedRt, mapOf("steps" to sessionSteps, "staleAtEpochMs" to p.staleAtEpochMs))
        eng.speak(req, object : SpeakCallback {
          override fun onFirstAudio(rt: Long, routed: AudioDeviceInfo?, info: Map<String, Any?>) {
            if (stCurrent == id) markStarted(id, rt, routed)
          }

          override fun onFinished(outcome: String, info: Map<String, Any?>) = onStFinished(id, outcome)
        })
      } catch (t: Throwable) {
        stCurrent = null
        SessionTts.lastError = t.chainText()
        requeueOrFail(id, p)
        Thread({ onEngineLost("speak_threw:${t.chainText()}") }, "vlc-st-lost").start()
        return
      }
    }
  }

  private fun isStale(p: Pending) = p.staleAtEpochMs > 0 && System.currentTimeMillis() > p.staleAtEpochMs

  private fun dropStale(id: String, p: Pending, stage: String) {
    log.log("speech_dropped_stale", mapOf("utteranceId" to id, "cueId" to p.cueId, "text" to p.text, "stage" to stage, "lateMs" to System.currentTimeMillis() - p.staleAtEpochMs, "afterRequestMs" to SystemClock.elapsedRealtime() - p.requestedRt, "earconPlayed" to p.earconPlayed))
    finish(id, "dropped_stale")
  }

  /** A failed utterance goes back to the front of the Supertonic queue once (same engine, after the reload); then it is dropped. */
  private fun requeueOrFail(id: String, p: Pending) {
    if (p.attempts < 2) synchronized(stLock) { stQueue.addFirst(id) } else finish(id, "error")
  }

  private fun onStFinished(id: String, outcome: String) {
    val p = pending[id]
    synchronized(stLock) {
      if (stCurrent != id) return // flushed/stopped by us; already reconciled
      stCurrent = null
    }
    if (outcome.startsWith("error")) {
      SessionTts.lastError = outcome
      if (p != null) requeueOrFail(id, p)
      // Reload happens off this callback thread (release() waits for generation to leave).
      Thread({ onEngineLost(outcome) }, "vlc-st-lost").start()
      return
    }
    if (outcome == "dropped_stale" && p != null) dropStale(id, p, "generated") else finish(id, outcome)
    synchronized(stLock) { pumpLocked() }
  }

  private fun markStarted(id: String, rt: Long, routed: AudioDeviceInfo?) {
    val p = pending[id] ?: return
    if (p.started) return
    p.started = true
    lastActivityRt.set(rt)
    if (p.engine == "supertonic") spokeInSupertonic = true
    if (p.earconPlayed || p.staleAtEpochMs > 0) {
      log.log("speech_late", mapOf("utteranceId" to id, "cueId" to p.cueId, "lateMs" to rt - p.requestedRt, "earconPlayed" to p.earconPlayed, "earcon" to p.earcon))
    }
    log.log("tts_start", mapOf("utteranceId" to id, "cueId" to p.cueId, "speakToStartMs" to rt - p.requestedRt, "engine" to p.engine))
    // Logs `speech_output_route` + emits `speechOutputRoute`: where this utterance is actually going.
    val usage = if (p.engine == "supertonic") SpeechOutput.trackUsage() else currentUsage()
    val route = SpeechOutput.report("tts_start", usage, routed, mapOf("utteranceId" to id, "engine" to p.engine))
    emit("ttsStart", mapOf("utteranceId" to id, "text" to p.text, "cueId" to p.cueId, "speakToStartMs" to rt - p.requestedRt, "routeLabel" to route["label"], "engine" to p.engine))
    onAudibleStart(id, p.cueId, rt, p.source)
  }

  private fun reconcileAfterFlush(keepId: String) {
    for (k in pending.keys.toList()) {
      if (k != keepId) finish(k, "flushed")
    }
  }

  fun stop(reason: String) {
    stClear()
    tts?.stop()
    for (k in pending.keys.toList()) finish(k, reason)
    log.log("tts_stop", mapOf("reason" to reason))
  }

  fun shutdown() {
    stop("shutdown")
    val e = synchronized(stLock) { shutdownFlag = true; stEngine.also { stEngine = null } }
    earcons = null
    SessionTts.loaded = false
    // release() waits for native generation to leave; keep that off the caller (may be the main thread).
    if (e != null) Thread({ try { e.release() } catch (_: Throwable) {} }, "vlc-st-release").start()
    tts?.shutdown()
    tts = null
    ready = false
    abandonFocus()
  }

  // ---- Pacing clip synthesis (no playback) -----------------------------------------------------------

  private class PaceWait { val latch = CountDownLatch(1); @Volatile var ok = false }
  private val paceWaiters = ConcurrentHashMap<String, PaceWait>()

  /** The loaded Supertonic engine, or null. Used by the pacing cache to synthesise clips offline. */
  fun supertonicEngine(): SherpaTtsEngine? = synchronized(stLock) { stEngine }

  /**
   * Renders [text] to a WAV file with the platform engine (`synthesizeToFile`); plays nothing. Blocking, call off the
   * main thread. Restores the session language afterwards. Utterance ids use the `pace-` prefix, which the live
   * listener ignores (no `pending` entry).
   */
  fun synthesizePlatformToFile(text: String, loc: Locale, file: File, timeoutMs: Long = 20_000): Boolean {
    val deadline = SystemClock.elapsedRealtime() + 6_000
    while (!ready && SystemClock.elapsedRealtime() < deadline) Thread.sleep(50)
    val t = tts ?: return false
    if (!ready) return false
    val id = "pace-${seq.incrementAndGet()}"
    val w = PaceWait()
    paceWaiters[id] = w
    try {
      val lr = t.setLanguage(loc)
      if (lr == TextToSpeech.LANG_MISSING_DATA || lr == TextToSpeech.LANG_NOT_SUPPORTED) return false
      if (t.synthesizeToFile(text, Bundle(), file, id) != TextToSpeech.SUCCESS) return false
      return w.latch.await(timeoutMs, TimeUnit.MILLISECONDS) && w.ok
    } finally {
      paceWaiters.remove(id)
      try { t.setLanguage(locale) } catch (_: Throwable) {}
    }
  }

  private fun paceDone(id: String, ok: Boolean): Boolean {
    val w = paceWaiters[id] ?: return false
    w.ok = ok
    w.latch.countDown()
    return true
  }

  private val listener = object : UtteranceProgressListener() {
    override fun onStart(utteranceId: String) {
      val p = pending[utteranceId] ?: return
      if (p.engine != "platform") return
      markStarted(utteranceId, SystemClock.elapsedRealtime(), null)
    }

    override fun onDone(utteranceId: String) {
      if (paceDone(utteranceId, true)) return
      finish(utteranceId, "done")
    }

    @Deprecated("Deprecated in Java")
    override fun onError(utteranceId: String) {
      if (paceDone(utteranceId, false)) return
      finish(utteranceId, "error")
    }

    override fun onError(utteranceId: String, errorCode: Int) {
      if (paceDone(utteranceId, false)) return
      log.log("error", mapOf("where" to "tts_utterance", "utteranceId" to utteranceId, "errorCode" to errorCode))
      finish(utteranceId, "error:$errorCode")
    }

    override fun onStop(utteranceId: String, interrupted: Boolean) {
      if (paceDone(utteranceId, false)) return
      finish(utteranceId, if (interrupted) "interrupted" else "stopped")
    }
  }

  private fun finish(utteranceId: String, outcome: String) {
    val p = pending.remove(utteranceId) ?: return
    lastActivityRt.set(SystemClock.elapsedRealtime())
    if (activeCount.decrementAndGet() <= 0) {
      activeCount.set(0)
      onActiveChanged?.invoke(false)
      abandonFocus()
      // Forced-speaker mode holds MODE_IN_COMMUNICATION only while speaking; release it between cues.
      SpeechOutput.onSpeechIdle(context)
    }
    log.log("tts_done", mapOf("utteranceId" to utteranceId, "outcome" to outcome, "cueId" to p.cueId, "engine" to p.engine))
    emit("ttsDone", mapOf("utteranceId" to utteranceId, "outcome" to outcome, "cueId" to p.cueId, "engine" to p.engine))
  }

  private fun requestFocus(usage: Int) {
    if (focusRequest != null) return
    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
      .setAudioAttributes(SpeechOutput.attributes(usage))
      .setOnAudioFocusChangeListener { }
      .build()
    val r = audioManager.requestAudioFocus(req)
    focusRequest = req
    if (r != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) log.log("audio_focus", mapOf("granted" to false, "result" to r))
  }

  private fun abandonFocus() {
    focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    focusRequest = null
  }

  companion object {
    /** Spoken once, in the platform voice, when the Supertonic voice is lost for good mid-session. */
    val VOICE_SWITCH_MESSAGES = mapOf(
      "ko" to "음성 엔진에 문제가 생겨서, 지금부터 목소리가 바뀌어요.",
      "en" to "The voice engine had a problem, so my voice will change for the rest of this session.",
    )

    fun localeFor(language: String): Locale = if (language.startsWith("en")) Locale.US else Locale.KOREA
  }
}
