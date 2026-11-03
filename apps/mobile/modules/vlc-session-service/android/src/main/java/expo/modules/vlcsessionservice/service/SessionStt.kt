package expo.modules.vlcsessionservice.service

import android.content.Context
import android.media.AudioManager
import android.media.AudioRecordingConfiguration
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.speech.stt.LangPolicy
import expo.modules.vlcsessionservice.speech.stt.PlatformSttEngine
import expo.modules.vlcsessionservice.speech.stt.SttCallbacks
import expo.modules.vlcsessionservice.speech.stt.SttFinal
import expo.modules.vlcsessionservice.speech.stt.SttLang

/**
 * Hands-free session STT on the platform on-device recognizer (Google SODA / Samsung), language Auto with platform language
 * detection and the session language as prior. Final transcripts are emitted as `finalTranscript` events (the same event the
 * sherpa SpeechPipeline emits) with n-best `alternatives`, `lang` and `timing` added.
 *
 * Only ONE recorder may hold the microphone: while this class is active the app's own AudioCapture is NOT running (the
 * recognition service records on our behalf). The level meter is fed from onRmsChanged.
 *
 * Half-duplex: [onTtsActive] pauses recognition while our own TTS speaks and resumes after a short echo tail
 * (log: `stt_paused_for_tts`, `stt_resumed`).
 *
 * Background / screen-off: whether the system recognizer keeps recording for a microphone foreground service is device
 * specific and untested, so this class watches for it and asks the service to fall back to the sherpa pipeline
 * (`stt_fallback` with a reason): fatal error, repeated hard errors, no recognizer callback at all for [STALL_MS], no
 * ready callback for [READY_TIMEOUT_MS], or a recording of the system flagged `isClientSilenced` for [SILENCED_MS].
 * Everything runs on the main thread (SpeechRecognizer requirement); public methods may be called from any thread.
 */
class SessionStt(
  private val context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
  sessionLang: String,
  /** True when a fallback engine can actually start (models present). */
  private val canFallback: () -> Boolean,
  /** Called on the main thread after this class released the platform recognizer. */
  private val startFallback: (reason: String) -> Unit,
) : SttCallbacks {
  private val main = Handler(Looper.getMainLooper())
  private val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val policy = LangPolicy(if (sessionLang.startsWith("en")) "en" else "ko")

  private var engine: PlatformSttEngine? = null
  private var active = false
  private var seq = 0
  private var startedRt = 0L

  // Half-duplex.
  private var ttsActive = false
  private var paused = false
  /** True while another recorder (Voice Coach take or live pitch) owns the microphone. */
  private var externalHold = false
  private val resumeTask = Runnable {
    if (!ttsActive && !externalHold && paused) {
      paused = false
      lastActivityRt = SystemClock.elapsedRealtime()
      log.log("stt_resumed", emptyMap())
      engine?.resume()
    }
  }

  // Health / background detection.
  @Volatile private var screenOn = true
  private var screenOffRt: Long? = null
  private var callbacksSinceScreenOff = 0
  private var finalsSinceScreenOff = 0
  private var state = "idle"
  private var stateSinceRt = 0L
  private var lastActivityRt = 0L
  private var hardErrorsInRow = 0
  private var lastError: String? = null
  private val errorCounts = HashMap<String, Int>()
  private val stateCounts = HashMap<String, Int>()
  private var finals = 0
  private var silencedSinceRt: Long? = null
  private var lastSilenced = -1
  private var recordingCb: AudioManager.AudioRecordingCallback? = null
  private var lastHealthLogRt = 0L
  private var lastLevelEmitRt = 0L
  private var zeroLevelSinceRt: Long? = null
  private var zeroLevelLogged = false
  private var fellBack = false

  // ---- lifecycle ----------------------------------------------------------------------------------

  fun start() = main.post {
    if (active) return@post
    active = true
    fellBack = false
    startedRt = SystemClock.elapsedRealtime()
    lastActivityRt = startedRt
    stateSinceRt = startedRt
    val e = PlatformSttEngine(
      context, "auto",
      PlatformSttEngine.Options(autoDetect = true, segmented = true, initialLocale = SttLang.localeOf(policy.next())),
    )
    engine = e
    log.log("stt_session_start", mapOf("engine" to "platform", "priorLang" to policy.prior, "sdk" to Build.VERSION.SDK_INT))
    observeRecordings()
    main.postDelayed(watchdog, WATCHDOG_MS)
    e.start(this)
  }

  fun stop() = main.post { shutdown("stop") }

  /** Synchronous variant for service teardown (may be called from main or another thread). */
  fun release() {
    if (Looper.myLooper() == Looper.getMainLooper()) shutdown("release") else main.post { shutdown("release") }
  }

  private fun shutdown(reason: String) {
    if (!active) return
    active = false
    main.removeCallbacks(watchdog)
    main.removeCallbacks(resumeTask)
    stopObservingRecordings()
    try { engine?.release() } catch (_: Exception) { }
    engine = null
    log.log("stt_session_stop", mapOf("reason" to reason, "finals" to finals, "errorCounts" to errorCounts, "uptimeMs" to SystemClock.elapsedRealtime() - startedRt))
  }

  // ---- half-duplex with our own TTS ---------------------------------------------------------------

  fun onTtsActive(speaking: Boolean) {
    main.post {
      if (!active) return@post
      ttsActive = speaking
      main.removeCallbacks(resumeTask)
      if (speaking) {
        if (!paused) {
          paused = true
          log.log("stt_paused_for_tts", mapOf("state" to state))
          engine?.pause()
        }
      } else if (paused && !externalHold) {
        main.postDelayed(resumeTask, ECHO_TAIL_MS)
      }
    }
  }

  /** Pause for / resume after an external recorder. Logs stt_paused_for_take and stt_resumed. */
  fun holdForExternalRecorder(hold: Boolean) {
    main.post {
      if (!active) return@post
      externalHold = hold
      main.removeCallbacks(resumeTask)
      if (hold) {
        if (!paused) {
          paused = true
          log.log("stt_paused_for_take", mapOf("state" to state))
          engine?.pause()
        }
      } else if (paused && !ttsActive) {
        paused = false
        lastActivityRt = SystemClock.elapsedRealtime()
        log.log("stt_resumed", mapOf("after" to "take"))
        engine?.resume()
      }
    }
  }

  // ---- screen state -------------------------------------------------------------------------------

  fun onScreen(on: Boolean) {
    main.post {
      screenOn = on
      val now = SystemClock.elapsedRealtime()
      if (!on) {
        screenOffRt = now
        callbacksSinceScreenOff = 0
        finalsSinceScreenOff = 0
      }
      log.log(if (on) "stt_screen_on" else "stt_screen_off", snapshot() + mapOf("offForMs" to screenOffRt?.let { now - it }.takeIf { on }))
      if (!on) for (delay in PROBE_DELAYS_MS) main.postDelayed({ if (!screenOn && active) log.log("stt_screen_off_probe", snapshot() + ("afterMs" to delay)) }, delay)
    }
  }

  private fun snapshot(): Map<String, Any?> {
    val now = SystemClock.elapsedRealtime()
    return mapOf(
      "state" to state, "stateForMs" to now - stateSinceRt, "sinceActivityMs" to now - lastActivityRt, "paused" to paused,
      "lastError" to lastError, "errorCounts" to errorCounts.toMap(), "stateCounts" to stateCounts.toMap(), "finals" to finals,
      "callbacksSinceScreenOff" to callbacksSinceScreenOff, "finalsSinceScreenOff" to finalsSinceScreenOff,
      "recordings" to recordingList(), "path" to engine?.path,
    )
  }

  private fun recordingList(): List<Map<String, Any?>> {
    if (Build.VERSION.SDK_INT < 29) return emptyList()
    return try {
      am.activeRecordingConfigurations.map { c -> mapOf("source" to c.clientAudioSource, "silenced" to c.isClientSilenced) }
    } catch (_: Exception) { emptyList() }
  }

  // ---- watchdog -----------------------------------------------------------------------------------

  private val watchdog = object : Runnable {
    override fun run() {
      if (!active) return
      val now = SystemClock.elapsedRealtime()
      if (!paused && !ttsActive) {
        val reason = when {
          state == "starting" && now - stateSinceRt > READY_TIMEOUT_MS -> "no_ready_callback_${now - stateSinceRt}ms"
          now - lastActivityRt > STALL_MS -> "no_recognizer_callback_${now - lastActivityRt}ms"
          silencedSinceRt?.let { now - it > SILENCED_MS } == true -> "recording_silenced"
          else -> null
        }
        if (reason != null) { fallback(reason); return }
      }
      if (now - lastHealthLogRt >= HEALTH_LOG_MS) {
        lastHealthLogRt = now
        log.log("stt_health", snapshot() + ("screenOn" to screenOn))
      }
      main.postDelayed(this, WATCHDOG_MS)
    }
  }

  private fun fallback(reason: String) {
    if (fellBack) return
    val can = canFallback()
    log.log("stt_fallback", snapshot() + mapOf("reason" to reason, "screenOn" to screenOn, "fallbackAvailable" to can, "uptimeMs" to SystemClock.elapsedRealtime() - startedRt))
    if (!can) {
      // Keep the platform recognizer; restart its loop in case it only stalled.
      emit("sessionError", mapOf("code" to "STT_FALLBACK_UNAVAILABLE", "message" to "Platform STT problem ($reason) but sherpa models are not downloaded"))
      lastActivityRt = SystemClock.elapsedRealtime()
      hardErrorsInRow = 0
      silencedSinceRt = null
      main.postDelayed(watchdog, WATCHDOG_MS)
      return
    }
    fellBack = true
    shutdown("fallback:$reason")
    emit("sessionSttEngine", mapOf("engine" to "sherpa", "reason" to reason))
    startFallback(reason)
  }

  // ---- recording configuration (isClientSilenced) -------------------------------------------------

  private fun observeRecordings() {
    if (Build.VERSION.SDK_INT < 29 || recordingCb != null) return
    val cb = object : AudioManager.AudioRecordingCallback() {
      override fun onRecordingConfigChanged(configs: MutableList<AudioRecordingConfiguration>) {
        val silenced = configs.count { it.isClientSilenced }
        val now = SystemClock.elapsedRealtime()
        if (silenced != lastSilenced) {
          lastSilenced = silenced
          log.log("stt_recording_configs", mapOf("count" to configs.size, "silenced" to silenced, "screenOn" to screenOn, "state" to state, "sources" to configs.map { it.clientAudioSource }))
        }
        silencedSinceRt = if (silenced > 0 && !paused) (silencedSinceRt ?: now) else null
      }
    }
    recordingCb = cb
    am.registerAudioRecordingCallback(cb, main)
  }

  private fun stopObservingRecordings() {
    val cb = recordingCb ?: return
    recordingCb = null
    try { am.unregisterAudioRecordingCallback(cb) } catch (_: Exception) { }
  }

  // ---- SttCallbacks (main thread) -----------------------------------------------------------------

  private fun touch() {
    lastActivityRt = SystemClock.elapsedRealtime()
    if (!screenOn) callbacksSinceScreenOff++
  }

  override fun onState(state: String, detail: Map<String, Any?>) {
    touch()
    if (state != this.state) { this.state = state; stateSinceRt = SystemClock.elapsedRealtime() }
    stateCounts[state] = (stateCounts[state] ?: 0) + 1
    if (state == "error") {
      log.log("stt_state", mapOf("state" to state, "detail" to detail))
      fallback("engine_error_state:${detail["code"]}")
    }
  }

  override fun onPartial(text: String) {
    touch()
    hardErrorsInRow = 0
    emit("partialTranscript", mapOf("seq" to seq + 1, "text" to text, "atEpochMs" to System.currentTimeMillis()))
  }

  override fun onLevel(level: Float) {
    touch()
    val now = SystemClock.elapsedRealtime()
    // Evidence for the background test: a recognizer fed digital silence reports the floor level forever.
    if (level <= 0f) {
      val since = zeroLevelSinceRt ?: now.also { zeroLevelSinceRt = it }
      if (!zeroLevelLogged && now - since > ZERO_LEVEL_LOG_MS) {
        zeroLevelLogged = true
        log.log("stt_level_floor", mapOf("forMs" to now - since, "screenOn" to screenOn, "state" to state))
      }
    } else { zeroLevelSinceRt = null; zeroLevelLogged = false }
    if (now - lastLevelEmitRt < LEVEL_EMIT_MS) return
    lastLevelEmitRt = now
    emit("audioLevel", mapOf("rms" to level.toDouble(), "peak" to level.toDouble()))
  }

  override fun onLanguageSignal(source: String, fields: Map<String, Any?>) {
    touch()
    log.log("stt_lang_detect", mapOf("phase" to "platform_callback", "source" to source) + fields)
  }

  override fun onError(code: String, message: String, recoverable: Boolean) {
    touch()
    errorCounts[code] = (errorCounts[code] ?: 0) + 1
    lastError = code
    if (code == "NO_MATCH") {
      val e = engine
      val tried = e?.requestedLocale?.let { SttLang.langOfLocale(it) } ?: policy.prior
      policy.update(tried, empty = true, confidence = null, scriptLang = null)
      e?.hintLocale(SttLang.localeOf(policy.next()))
    }
    val routine = code == "NO_MATCH" || code == "SPEECH_TIMEOUT"
    log.log("stt_error", mapOf("code" to code, "message" to message, "recoverable" to recoverable, "screenOn" to screenOn, "state" to state, "paused" to paused))
    if (routine) return
    emit("sessionError", mapOf("code" to "STT_$code", "message" to message))
    hardErrorsInRow++
    if (!recoverable) fallback("fatal_error:$code")
    else if (hardErrorsInRow >= HARD_ERRORS_FOR_FALLBACK) fallback("repeated_errors:$code x$hardErrorsInRow")
  }

  override fun onFinal(result: SttFinal) {
    touch()
    hardErrorsInRow = 0
    val e = engine
    val text = result.text.trim()
    val tried = e?.requestedLocale?.let { SttLang.langOfLocale(it) } ?: policy.prior
    if (text.isEmpty()) {
      log.log("stt_final", mapOf("empty" to true, "details" to result.details, "timing" to result.timing))
      policy.update(tried, empty = true, confidence = null, scriptLang = null)
      e?.hintLocale(SttLang.localeOf(policy.next()))
      return
    }
    val script = SttLang.scriptLang(text)
    val (lang, by) = when {
      result.detectedLang != null -> result.detectedLang to (result.detectedBy ?: SttLang.BY_PLATFORM)
      script != null -> script to SttLang.BY_SCRIPT
      else -> tried to SttLang.BY_REQUESTED
    }
    val priorBefore = policy.prior
    policy.update(tried, empty = false, confidence = result.confidence, scriptLang = lang)
    e?.hintLocale(SttLang.localeOf(policy.next()))
    seq++
    finals++
    if (!screenOn) finalsSinceScreenOff++
    @Suppress("UNCHECKED_CAST")
    val alternatives = listOf(text) + ((result.details["alternatives"] as? List<String>) ?: emptyList()).map { it.trim() }.filter { it.isNotEmpty() && it != text }
    val finalRt = SystemClock.elapsedRealtime()
    val endToFinal = (result.timing["endToFinalMs"] as? Long) ?: (result.timing["lastPartialToFinalMs"] as? Long) ?: 0L
    val payload = mapOf(
      "seq" to seq, "text" to text, "engine" to "platform", "lang" to lang, "detectedBy" to by, "alternatives" to alternatives,
      "confidence" to result.confidence, "priorBefore" to priorBefore,
      "startEpochMs" to (System.currentTimeMillis() - ((result.timing["beginToFinalMs"] as? Long) ?: 0L)),
      "endEpochMs" to System.currentTimeMillis() - endToFinal, "vadEndDetectedEpochMs" to System.currentTimeMillis(),
      "finalEpochMs" to System.currentTimeMillis(), "endpointLatencyMs" to endToFinal, "trailingSilenceMs" to 0L,
      "duringTts" to false, "forcedEnd" to false, "timing" to result.timing,
    )
    log.log("final_transcript", payload + mapOf("screenOn" to screenOn, "finalRt" to finalRt))
    emit("finalTranscript", payload)
  }

  companion object {
    private const val ECHO_TAIL_MS = 450L
    private const val WATCHDOG_MS = 1_000L
    private const val READY_TIMEOUT_MS = 10_000L
    private const val STALL_MS = 25_000L
    private const val SILENCED_MS = 5_000L
    private const val HARD_ERRORS_FOR_FALLBACK = 4
    private const val HEALTH_LOG_MS = 30_000L
    private const val LEVEL_EMIT_MS = 250L
    private const val ZERO_LEVEL_LOG_MS = 15_000L
    private val PROBE_DELAYS_MS = longArrayOf(10_000, 30_000, 120_000)
  }
}
