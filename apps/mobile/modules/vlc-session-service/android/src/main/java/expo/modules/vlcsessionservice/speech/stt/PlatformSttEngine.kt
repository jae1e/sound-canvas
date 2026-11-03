package expo.modules.vlcsessionservice.speech.stt

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlin.math.min

/**
 * Android [SpeechRecognizer] (Google/Samsung on-device recognizer or the system one) behind [SttEngine].
 *
 * Recognizer path: `createOnDeviceSpeechRecognizer` when `isOnDeviceRecognitionAvailable` (API 33+), otherwise the normal
 * `createSpeechRecognizer` with `EXTRA_PREFER_OFFLINE` (the system service may still use the network). [path] records which.
 *
 * Continuous listening: with [Options.segmented] (API 33+) the request carries `EXTRA_SEGMENTED_SESSION` and finals arrive
 * through `onSegmentResults`; whether the installed recognizer honours it is observed ([segmentedSeen]). Without it, or when
 * the recognizer ignores it, a restart loop re-issues `startListening` after results / NO_MATCH / SPEECH_TIMEOUT with an
 * exponential backoff on real errors.
 *
 * Every SpeechRecognizer call runs on the main thread (hard requirement of the API).
 * The recognizer owns the microphone and its own input selection; the app can only influence it through the
 * communication device (see SttLab). It may play start/stop earcons; we never touch the volume.
 */
class PlatformSttEngine(
  private val context: Context,
  /** "ko-KR", "en-US" or "auto". */
  override val locale: String,
  private val options: Options,
) : SttEngine {
  data class Options(
    /** Request platform language detection (API 34+) among ko-KR / en-US. */
    val autoDetect: Boolean = false,
    /** Use EXTRA_SEGMENTED_SESSION on API 33+. */
    val segmented: Boolean = true,
    /** Locale used for the first request when [locale] is "auto". */
    val initialLocale: String = "ko-KR",
  )

  override val id = "platform"
  override val supportsStreaming = true

  private val main = Handler(Looper.getMainLooper())
  private var callbacks: SttCallbacks? = null
  private var recognizer: SpeechRecognizer? = null
  private var running = false
  private var stopping = false
  private var restartAttempts = 0
  private var activeLocale: String = if (locale == "auto") options.initialLocale else locale

  /** "on_device" or "system_prefer_offline"; set when the recognizer is created. */
  @Volatile var path: String = "none"
    private set
  @Volatile var segmentedSeen = false
    private set
  @Volatile var languageDetectionFired = false
    private set

  // Per-utterance state (main thread only).
  private var speechStartRt: Long? = null
  private var speechEndRt: Long? = null
  private var lastPartial = ""
  private var detected: Pair<String, Int>? = null // BCP-47 tag, confidence level
  private var switchResult: Int? = null
  private var lastLevelRt = 0L

  override fun hintLocale(tag: String) {
    if (locale == "auto") main.post { activeLocale = tag }
  }

  override fun start(callbacks: SttCallbacks) {
    onMain {
      this.callbacks = callbacks
      running = true
      stopping = false
      restartAttempts = 0
      callbacks.onState("starting", mapOf("engine" to id, "locale" to locale))
      if (!createRecognizer()) return@onMain
      listen()
    }
  }

  override fun stop() {
    onMain {
      if (!running) return@onMain
      running = false
      stopping = true
      main.removeCallbacksAndMessages(null)
      try { recognizer?.stopListening() } catch (_: Exception) { }
      // Give the recognizer a moment to deliver a pending final, then tear down.
      main.postDelayed({ destroyRecognizer(); callbacks?.onState("stopped") }, STOP_GRACE_MS)
    }
  }

  override fun release() {
    onMain {
      running = false
      stopping = false
      main.removeCallbacksAndMessages(null)
      destroyRecognizer()
    }
  }

  // ---- recognizer lifecycle (main thread) ----------------------------------------------------------

  private fun createRecognizer(): Boolean {
    destroyRecognizer()
    val onDevice = Build.VERSION.SDK_INT >= 33 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
    if (!onDevice && !SpeechRecognizer.isRecognitionAvailable(context)) {
      running = false
      callbacks?.onError("NO_RECOGNIZER", "No speech recognition service is available on this device", false)
      callbacks?.onState("error", mapOf("code" to "NO_RECOGNIZER"))
      return false
    }
    return try {
      val r = if (onDevice) SpeechRecognizer.createOnDeviceSpeechRecognizer(context) else SpeechRecognizer.createSpeechRecognizer(context)
      r.setRecognitionListener(listener)
      recognizer = r
      path = if (onDevice) "on_device" else "system_prefer_offline"
      true
    } catch (e: Exception) {
      running = false
      callbacks?.onError("CREATE_FAILED", e.toString(), false)
      callbacks?.onState("error", mapOf("code" to "CREATE_FAILED"))
      false
    }
  }

  private fun destroyRecognizer() {
    val r = recognizer ?: return
    recognizer = null
    try { r.cancel() } catch (_: Exception) { }
    try { r.destroy() } catch (_: Exception) { }
  }

  private fun buildIntent(tag: String): Intent {
    val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, tag)
    i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
    i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
    i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
    i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
    // Hints only; recognizers are free to ignore them.
    i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L)
    i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L)
    if (Build.VERSION.SDK_INT >= 33 && options.segmented) {
      i.putExtra(RecognizerIntent.EXTRA_SEGMENTED_SESSION, true)
    }
    if (Build.VERSION.SDK_INT >= 34 && options.autoDetect) {
      val allowed = arrayListOf("ko-KR", "en-US")
      i.putExtra(RecognizerIntent.EXTRA_ENABLE_LANGUAGE_DETECTION, true)
      i.putStringArrayListExtra(RecognizerIntent.EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES, allowed)
      i.putExtra(RecognizerIntent.EXTRA_ENABLE_LANGUAGE_SWITCH, RecognizerIntent.LANGUAGE_SWITCH_BALANCED)
      i.putStringArrayListExtra(RecognizerIntent.EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES, allowed)
    }
    return i
  }

  /** The locale actually requested for the current/next recognition. */
  val requestedLocale: String get() = activeLocale

  private fun listen() {
    val r = recognizer ?: return
    speechStartRt = null
    speechEndRt = null
    lastPartial = ""
    detected = null
    switchResult = null
    val tag = activeLocale
    val intent = buildIntent(tag)
    callbacks?.onState(
      "starting",
      mapOf(
        "path" to path, "requestedLocale" to tag, "segmentedRequested" to (Build.VERSION.SDK_INT >= 33 && options.segmented),
        "languageDetectionRequested" to (Build.VERSION.SDK_INT >= 34 && options.autoDetect),
        "extras" to (intent.extras?.keySet()?.toList() ?: emptyList<String>()),
      ),
    )
    try {
      r.startListening(intent)
    } catch (e: Exception) {
      callbacks?.onError("START_FAILED", e.toString(), true)
      scheduleRestart(backoffMs(), recreate = true)
    }
  }

  private fun backoffMs(): Long {
    restartAttempts++
    return min(MAX_BACKOFF_MS, BASE_BACKOFF_MS shl min(restartAttempts - 1, 5))
  }

  private fun scheduleRestart(delayMs: Long, recreate: Boolean = false) {
    if (!running) return
    main.postDelayed({
      if (!running) return@postDelayed
      if (recreate && !createRecognizer()) return@postDelayed
      listen()
    }, delayMs)
  }

  private fun onMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) block() else main.post(block)
  }

  // ---- results -------------------------------------------------------------------------------------

  private fun emitFinal(results: Bundle, segment: Boolean) {
    val list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: arrayListOf()
    val scores = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
    val text = list.firstOrNull()?.trim().orEmpty()
    // Google returns 0 or -1 when it has no confidence; treat that as "unknown".
    val conf = scores?.firstOrNull()?.takeIf { it > 0f }
    val det = detected
    val lang = det?.first?.let { SttLang.langOfLocale(it) }
    val details = mapOf(
      "segment" to segment,
      "alternatives" to list.drop(1),
      "scores" to scores?.toList(),
      "bundleKeys" to results.keySet().toList(),
      "requestedLocale" to activeLocale,
      "platformDetectedTag" to det?.first,
      "platformDetectionConfidenceLevel" to det?.second,
      "languageSwitchResult" to (switchResult ?: if (Build.VERSION.SDK_INT >= 34) results.getInt(SpeechRecognizer.LANGUAGE_SWITCH_RESULT, -1).takeIf { it >= 0 } else null),
    )
    callbacks?.onFinal(
      SttFinal(
        text = text, confidence = conf, detectedLang = lang, detectedBy = if (lang != null) SttLang.BY_PLATFORM else null,
        speechStartRt = speechStartRt, speechEndRt = speechEndRt, details = details,
      ),
    )
    speechStartRt = null
    speechEndRt = null
    lastPartial = ""
    detected = null
  }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) {
      restartAttempts = 0
      callbacks?.onState("listening", mapOf("path" to path, "requestedLocale" to activeLocale))
    }

    override fun onBeginningOfSpeech() {
      speechStartRt = SystemClock.elapsedRealtime()
    }

    override fun onRmsChanged(rmsdB: Float) {
      val now = SystemClock.elapsedRealtime()
      if (now - lastLevelRt < 80) return
      lastLevelRt = now
      callbacks?.onLevel(((rmsdB + 2f) / 12f).coerceIn(0f, 1f))
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
      speechEndRt = SystemClock.elapsedRealtime()
      callbacks?.onState("processing")
    }

    override fun onPartialResults(partialResults: Bundle?) {
      val b = partialResults ?: return
      val text = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()
        .ifEmpty { b.getString("android.speech.extra.UNSTABLE_TEXT")?.trim().orEmpty() }
      if (text.isNotEmpty() && text != lastPartial) {
        lastPartial = text
        callbacks?.onPartial(text)
      }
    }

    override fun onResults(results: Bundle?) {
      if (results != null) emitFinal(results, segment = false)
      if (running) scheduleRestart(RESTART_DELAY_MS)
    }

    override fun onSegmentResults(segmentResults: Bundle) {
      segmentedSeen = true
      emitFinal(segmentResults, segment = true)
    }

    override fun onEndOfSegmentedSession() {
      callbacks?.onState("segmented_session_end", mapOf("segmentedSeen" to segmentedSeen))
      if (running) scheduleRestart(RESTART_DELAY_MS)
    }

    override fun onLanguageDetection(results: Bundle) {
      languageDetectionFired = true
      val tag = results.getString(SpeechRecognizer.DETECTED_LANGUAGE)
      val level = results.getInt(SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL, 0)
      if (tag != null) detected = tag to level
      switchResult = results.getInt(SpeechRecognizer.LANGUAGE_SWITCH_RESULT, -1).takeIf { it >= 0 }
      callbacks?.onLanguageSignal(
        "onLanguageDetection",
        mapOf(
          "detectedTag" to tag, "confidenceLevel" to level, "confidenceName" to confidenceName(level),
          "alternatives" to results.getStringArrayList(SpeechRecognizer.TOP_LOCALE_ALTERNATIVES),
          "switchResult" to switchResult, "bundleKeys" to results.keySet().toList(),
        ),
      )
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onError(error: Int) {
      val name = errorName(error)
      val cb = callbacks
      if (stopping || !running) {
        cb?.onState("error_while_stopping", mapOf("code" to name))
        return
      }
      when (error) {
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
          cb?.onState("speech_timeout", mapOf("code" to name))
          scheduleRestart(RESTART_DELAY_MS)
        }
        SpeechRecognizer.ERROR_NO_MATCH -> {
          cb?.onError(name, "Speech was heard but not recognized", true)
          scheduleRestart(RESTART_DELAY_MS)
        }
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
          running = false
          cb?.onError(name, "RECORD_AUDIO permission missing", false)
          cb?.onState("error", mapOf("code" to name))
        }
        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> {
          // Not retryable for this locale: tell the lab, which may flip the locale in auto mode or ask for a download.
          cb?.onError(name, "Locale $activeLocale is not usable by this recognizer ($path)", false)
          running = false
          cb?.onState("error", mapOf("code" to name))
        }
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_CLIENT, SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> {
          val d = backoffMs()
          cb?.onError(name, "Recreating recognizer after $name, retry in $d ms", true)
          scheduleRestart(d, recreate = true)
        }
        else -> {
          val d = backoffMs()
          cb?.onError(name, "Recognizer error $name, retry in $d ms", true)
          scheduleRestart(d, recreate = error == SpeechRecognizer.ERROR_AUDIO)
        }
      }
    }
  }

  companion object {
    private const val RESTART_DELAY_MS = 120L
    private const val BASE_BACKOFF_MS = 400L
    private const val MAX_BACKOFF_MS = 8_000L
    private const val STOP_GRACE_MS = 1_200L

    fun confidenceName(level: Int) = when (level) {
      SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_NOT_CONFIDENT -> "not_confident"
      SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_CONFIDENT -> "confident"
      SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_HIGHLY_CONFIDENT -> "highly_confident"
      else -> "unknown"
    }

    fun errorName(code: Int) = when (code) {
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "NETWORK_TIMEOUT"
      SpeechRecognizer.ERROR_NETWORK -> "NETWORK"
      SpeechRecognizer.ERROR_AUDIO -> "AUDIO"
      SpeechRecognizer.ERROR_SERVER -> "SERVER"
      SpeechRecognizer.ERROR_CLIENT -> "CLIENT"
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "SPEECH_TIMEOUT"
      SpeechRecognizer.ERROR_NO_MATCH -> "NO_MATCH"
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RECOGNIZER_BUSY"
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "INSUFFICIENT_PERMISSIONS"
      SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "TOO_MANY_REQUESTS"
      SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "SERVER_DISCONNECTED"
      SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "LANGUAGE_NOT_SUPPORTED"
      SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "LANGUAGE_UNAVAILABLE"
      SpeechRecognizer.ERROR_CANNOT_CHECK_SUPPORT -> "CANNOT_CHECK_SUPPORT"
      SpeechRecognizer.ERROR_CANNOT_LISTEN_TO_DOWNLOAD_EVENTS -> "CANNOT_LISTEN_TO_DOWNLOAD_EVENTS"
      else -> "ERROR_$code"
    }
  }
}
