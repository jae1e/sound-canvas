package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Bundle
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
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

/**
 * Session speech output: Supertonic (sherpa-onnx, in-process) when configured and loaded, else Android TextToSpeech.
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
  )

  // ---- Supertonic path state (guarded by stLock) ----
  private val stLock = Any()
  private var stEngine: SherpaTtsEngine? = null
  private val stQueue = ArrayDeque<String>()
  private var stCurrent: String? = null
  private var shutdownFlag = false
  @Volatile private var loadFailed = false
  @Volatile private var lastEngine: String? = null

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

  /** @param priority "high"/"cue" flush the queue; anything else appends. */
  fun speak(text: String, priority: String, cueId: String?, source: String): String {
    val id = "u${seq.incrementAndGet()}"
    val requestedRt = SystemClock.elapsedRealtime()
    val flush = priority == "high" || priority == "cue"
    if (stEngine == null && !loadFailed) ensureSupertonic()
    // Appended items stay on the engine of whatever is still queued so two engines never overlap.
    val engine = if (!flush && activeCount.get() > 0 && lastEngine != null) lastEngine!!
    else if (SessionTts.wantsSupertonic() && stEngine != null) "supertonic" else "platform"
    lastEngine = engine
    pending[id] = Pending(text, cueId, source, requestedRt, engine)
    if (activeCount.incrementAndGet() == 1) onActiveChanged?.invoke(true)
    log.log("tts_request", mapOf("utteranceId" to id, "priority" to priority, "cueId" to cueId, "source" to source, "chars" to text.length, "engine" to engine))
    if (engine == "supertonic") speakSupertonic(id, flush) else {
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

  /** Loads the Supertonic engine in the background if wanted and the model is downloaded. Never blocks the caller. */
  fun ensureSupertonic() {
    if (!SessionTts.wantsSupertonic()) return
    if (!SessionTts.modelReady(context)) {
      SessionTts.lastError = "Model ${SessionTts.SUPERTONIC_SET} is not downloaded; using platform TTS"
      return
    }
    synchronized(stLock) {
      if (shutdownFlag || stEngine != null || SessionTts.loading) return
      SessionTts.loading = true
    }
    loadFailed = false
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
          loadFailed = true
          SessionTts.lastError = (r["error"] ?: "prepare failed").toString()
          discard = true
        }
      }
      log.log("tts_session_supertonic_load", mapOf("ok" to !discard, "result" to r.filterKeys { it != "modelLang" }))
      if (discard) try { e.release() } catch (_: Throwable) {}
    }, "vlc-st-load").start()
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
      val id = stQueue.removeFirstOrNull() ?: return
      val p = pending[id] ?: continue
      val eng = stEngine
      if (eng == null) {
        stCurrent = null
        fallbackToPlatform(id, "engine_released")
        continue
      }
      stCurrent = id
      try {
        requestFocus(SpeechOutput.trackUsage())
        val req = SpeakRequest(id, p.text, locale, SessionTts.voice.toString(), p.requestedRt, mapOf("steps" to SessionTts.steps))
        eng.speak(req, object : SpeakCallback {
          override fun onFirstAudio(rt: Long, routed: AudioDeviceInfo?, info: Map<String, Any?>) {
            if (stCurrent == id) markStarted(id, rt, routed)
          }

          override fun onFinished(outcome: String, info: Map<String, Any?>) = onStFinished(id, outcome)
        })
      } catch (t: Throwable) {
        stCurrent = null
        SessionTts.lastError = t.chainText()
        fallbackToPlatform(id, t.chainText())
      }
    }
  }

  private fun onStFinished(id: String, outcome: String) {
    synchronized(stLock) {
      if (stCurrent != id) return // flushed/stopped by us; already reconciled
      stCurrent = null
    }
    if (outcome.startsWith("error")) {
      SessionTts.lastError = outcome
      // The rest of the queue moves to platform too so the two engines never overlap.
      val rest = synchronized(stLock) { stQueue.toList().also { stQueue.clear() } }
      fallbackToPlatform(id, outcome)
      rest.forEach { fallbackToPlatform(it, "queue_after_error") }
      return
    }
    finish(id, outcome)
    synchronized(stLock) { pumpLocked() }
  }

  private fun fallbackToPlatform(id: String, reason: String) {
    val p = pending[id] ?: return
    log.log("tts_engine_fallback", mapOf("utteranceId" to id, "from" to "supertonic", "to" to "platform", "reason" to reason))
    p.engine = "platform"
    lastEngine = "platform"
    speakPlatform(id, p.text, false)
  }

  private fun markStarted(id: String, rt: Long, routed: AudioDeviceInfo?) {
    val p = pending[id] ?: return
    if (p.started) return
    p.started = true
    lastActivityRt.set(rt)
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
    fun localeFor(language: String): Locale = if (language.startsWith("en")) Locale.US else Locale.KOREA
  }
}
