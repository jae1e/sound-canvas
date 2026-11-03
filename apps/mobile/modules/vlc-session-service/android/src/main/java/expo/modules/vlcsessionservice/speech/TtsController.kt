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
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
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
  private class Pending(val text: String, val cueId: String?, val source: String, val requestedRt: Long)

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

  /** True while an utterance is queued/playing or finished within [graceMs] (echo tail). */
  fun isActive(graceMs: Long = 0): Boolean =
    activeCount.get() > 0 || (graceMs > 0 && SystemClock.elapsedRealtime() - lastActivityRt.get() < graceMs)

  fun init(language: String) {
    locale = localeFor(language)
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
    pending[id] = Pending(text, cueId, source, requestedRt)
    activeCount.incrementAndGet()
    val action = {
      val t = tts
      if (t == null) {
        finish(id, "error")
      } else {
        // Forced-speaker mode switches routing and attributes here (platform engine = other process).
        SpeechOutput.beginSpeech(context, inProcess = false)
        t.setAudioAttributes(SpeechOutput.attributes(currentUsage()))
        requestFocus()
        val mode = if (priority == "high" || priority == "cue") TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
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
    log.log("tts_request", mapOf("utteranceId" to id, "priority" to priority, "cueId" to cueId, "source" to source, "chars" to text.length))
    return id
  }

  private fun reconcileAfterFlush(keepId: String) {
    for (k in pending.keys.toList()) {
      if (k != keepId) finish(k, "flushed")
    }
  }

  fun stop(reason: String) {
    tts?.stop()
    for (k in pending.keys.toList()) finish(k, reason)
    log.log("tts_stop", mapOf("reason" to reason))
  }

  fun shutdown() {
    stop("shutdown")
    tts?.shutdown()
    tts = null
    ready = false
    abandonFocus()
  }

  private val listener = object : UtteranceProgressListener() {
    override fun onStart(utteranceId: String) {
      val rt = SystemClock.elapsedRealtime()
      val p = pending[utteranceId] ?: return
      lastActivityRt.set(rt)
      log.log("tts_start", mapOf("utteranceId" to utteranceId, "cueId" to p.cueId, "speakToStartMs" to rt - p.requestedRt))
      // Logs `speech_output_route` + emits `speechOutputRoute`: where this utterance is actually going.
      val route = SpeechOutput.report("tts_start", currentUsage(), null, mapOf("utteranceId" to utteranceId))
      emit("ttsStart", mapOf("utteranceId" to utteranceId, "text" to p.text, "cueId" to p.cueId, "speakToStartMs" to rt - p.requestedRt, "routeLabel" to route["label"]))
      onAudibleStart(utteranceId, p.cueId, rt, p.source)
    }

    override fun onDone(utteranceId: String) = finish(utteranceId, "done")

    @Deprecated("Deprecated in Java")
    override fun onError(utteranceId: String) = finish(utteranceId, "error")

    override fun onError(utteranceId: String, errorCode: Int) {
      log.log("error", mapOf("where" to "tts_utterance", "utteranceId" to utteranceId, "errorCode" to errorCode))
      finish(utteranceId, "error:$errorCode")
    }

    override fun onStop(utteranceId: String, interrupted: Boolean) = finish(utteranceId, if (interrupted) "interrupted" else "stopped")
  }

  private fun finish(utteranceId: String, outcome: String) {
    val p = pending.remove(utteranceId) ?: return
    lastActivityRt.set(SystemClock.elapsedRealtime())
    if (activeCount.decrementAndGet() <= 0) {
      activeCount.set(0)
      abandonFocus()
      // Forced-speaker mode holds MODE_IN_COMMUNICATION only while speaking; release it between cues.
      SpeechOutput.onSpeechIdle(context)
    }
    log.log("tts_done", mapOf("utteranceId" to utteranceId, "outcome" to outcome, "cueId" to p.cueId))
    emit("ttsDone", mapOf("utteranceId" to utteranceId, "outcome" to outcome, "cueId" to p.cueId))
  }

  private fun requestFocus() {
    if (focusRequest != null) return
    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
      .setAudioAttributes(SpeechOutput.attributes(currentUsage()))
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
