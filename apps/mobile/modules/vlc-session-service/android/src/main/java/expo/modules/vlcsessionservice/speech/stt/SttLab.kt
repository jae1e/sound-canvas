package expo.modules.vlcsessionservice.speech.stt

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioRecordingConfiguration
import android.os.Build
import android.os.SystemClock
import androidx.core.content.ContextCompat
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.service.SessionRuntime
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
import java.util.concurrent.ExecutorService

/**
 * STT test bench: owns one [SttEngine] at a time, the microphone route, the language policy and all measurements.
 * It plays no audio at all (no TTS, no tones); the platform recognizer may still play its own start/stop earcons.
 *
 * Events sent to JS (and logged as JSONL): sttState, sttPartial, sttFinal, sttError, sttLevel, sttLangDetect,
 * sttMicRoute, sttDownload. Log names: stt_start, stt_state, stt_partial (throttled), stt_final, stt_error,
 * stt_lang_detect, stt_support, stt_mic_route.
 */
class SttLab(
  private val context: Context,
  private val io: ExecutorService,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  data class Config(val engine: String, val lang: String, val mic: String, val segmented: Boolean)

  private val log = DiagLog.get(context)
  private val models = ModelManager(context)
  private val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val lock = Any()

  private var cfg: Config? = null
  private var engine: SttEngine? = null
  private var capture: SttMicCapture? = null
  private var policy = LangPolicy("ko")
  private var seq = 0
  private var routedBt = false
  private var recordingCb: AudioManager.AudioRecordingCallback? = null

  // Per-utterance measurements (guarded by lock).
  private var utteranceBaseRt = 0L
  private var lastPartialLogRt = 0L
  private var lastPartialText = ""
  private var detectionEvents = 0

  val isRunning: Boolean get() = synchronized(lock) { engine != null }

  // ---- support report -------------------------------------------------------------------------------

  fun support(done: (Map<String, Any?>) -> Unit) {
    PlatformSttSupport.report(context) { platform ->
      val st = models.status().associateBy { it["id"] }
      val bt = bluetoothDevices()
      val out = platform + mapOf(
        "sherpaKoReady" to (st["ko"]?.get("ready") == true),
        "sherpaEnReady" to (st["en"]?.get("ready") == true),
        "sherpaVadReady" to (st["vad"]?.get("ready") == true),
        "bluetoothInput" to bt.first?.let(AudioRouting::describe),
        "bluetoothCommunicationDevice" to bt.second?.let(AudioRouting::describe),
        "sessionRunning" to (SessionRuntime.service != null),
      )
      log.log("stt_support", out)
      emit("sttSupport", out)
      done(out)
    }
  }

  fun triggerDownload(tag: String, done: (Map<String, Any?>) -> Unit) {
    PlatformSttSupport.triggerDownload(
      context, tag,
      progress = { p -> log.log("stt_support", mapOf("download" to p)); emit("sttDownload", p) },
      done = { r -> log.log("stt_support", mapOf("download_result" to r)); done(r) },
    )
  }

  // ---- start / stop ---------------------------------------------------------------------------------

  /** Runs on a background thread. Failures are reported as sttError + sttState(error), never thrown to JS. */
  fun start(opts: Map<String, Any?>) {
    synchronized(lock) {
      if (engine != null) { fail("ALREADY_RUNNING", "STT is already running"); return }
    }
    if (SessionRuntime.service != null) { fail("SESSION_RUNNING", "Stop the session first: it owns the microphone"); return }
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      fail("PERMISSION_RECORD_AUDIO", "RECORD_AUDIO is not granted"); return
    }
    val c = Config(
      engine = (opts["engine"] as? String) ?: "platform",
      lang = (opts["lang"] as? String) ?: "auto",
      mic = (opts["mic"] as? String) ?: "phone",
      segmented = (opts["segmented"] as? Boolean) ?: true,
    )
    val callbacks = Callbacks()
    synchronized(lock) {
      cfg = c
      seq = 0
      policy = LangPolicy(if (c.lang == "en") "en" else "ko")
      resetUtterance(SystemClock.elapsedRealtime())
      detectionEvents = 0
    }
    log.log("stt_start", mapOf("config" to mapOf("engine" to c.engine, "lang" to c.lang, "mic" to c.mic, "segmented" to c.segmented), "sdk" to Build.VERSION.SDK_INT))
    emit("sttState", mapOf("state" to "starting", "detail" to emptyMap<String, Any?>(), "engine" to c.engine, "path" to null))

    // 1. Microphone route.
    var preferredInput: AudioDeviceInfo? = null
    if (c.mic == "bluetooth") {
      val r = routeBluetooth()
      if (r["ok"] != true) {
        fail("BLUETOOTH_ROUTE_FAILED", "Bluetooth headset mic not available: ${r["reason"]}")
        return
      }
      preferredInput = bluetoothDevices().first
    } else {
      log.log("stt_mic_route", mapOf("kind" to "phone", "note" to "default input, no communication device set", "audioMode" to am.mode))
    }

    // 2. Engine.
    val e: SttEngine = try {
      if (c.engine == "sherpa") buildSherpa(c) else buildPlatform(c)
    } catch (ex: Exception) {
      releaseRoute()
      fail("ENGINE_UNAVAILABLE", ex.message ?: ex.toString())
      return
    }
    synchronized(lock) { engine = e }
    observeRecordingConfigs()

    // 3. Frame-driven engines need our own capture.
    if (e.needsFrames) {
      val sink = e as FrameSink
      val source = if (c.mic == "bluetooth") SttMicCapture.SOURCE_BLUETOOTH else SttMicCapture.SOURCE_PHONE
      val cap = SttMicCapture(
        log, source, preferredInput,
        onFrame = { f, t -> sink.onFrame(f, t) },
        onLevel = { callbacks.onLevel(it) },
        onRoute = { m -> routeEvent(m) },
        onFailure = { msg -> callbacks.onError("CAPTURE_FAILED", msg, false); callbacks.onState("error", mapOf("code" to "CAPTURE_FAILED")); stop() },
      )
      synchronized(lock) { capture = cap }
      cap.start()
    } else {
      routeEvent(
        mapOf(
          "kind" to "platform_recognizer_input",
          "note" to "The system recognizer chooses its own input; communication-device routing is only a hint",
          "micRequested" to c.mic,
        ),
      )
    }
    e.start(callbacks)
  }

  fun stop() {
    val e: SttEngine?
    val cap: SttMicCapture?
    synchronized(lock) { e = engine; cap = capture; capture = null }
    if (e == null) return
    log.log("stt_state", mapOf("state" to "stop_requested"))
    cap?.stop()
    e.stop()
    // Frame-driven engines finish on their worker thread; give them time, then release. Platform: engine posts "stopped".
    io.execute {
      try { if (e.needsFrames) e.release() } catch (_: Exception) { }
      Thread.sleep(if (e.needsFrames) 0 else 1_500)
      synchronized(lock) { if (engine === e) engine = null }
      stopObservingRecordingConfigs()
      releaseRoute()
      emit("sttState", mapOf("state" to "stopped", "detail" to emptyMap<String, Any?>(), "engine" to e.id, "path" to null))
    }
  }

  fun release() {
    val e: SttEngine?
    val cap: SttMicCapture?
    synchronized(lock) { e = engine; cap = capture; capture = null; engine = null }
    cap?.stop()
    try { e?.release() } catch (_: Exception) { }
    stopObservingRecordingConfigs()
    releaseRoute()
  }

  private fun fail(code: String, message: String) {
    log.log("stt_error", mapOf("code" to code, "message" to message, "fatal" to true))
    emit("sttError", mapOf("code" to code, "message" to message, "recoverable" to false, "atEpochMs" to System.currentTimeMillis()))
    emit("sttState", mapOf("state" to "error", "detail" to mapOf("code" to code), "engine" to cfg?.engine, "path" to null))
  }

  // ---- engines --------------------------------------------------------------------------------------

  private fun buildPlatform(c: Config): SttEngine {
    val auto = c.lang == "auto"
    val first = SttLang.localeOf(synchronized(lock) { policy.next() })
    return PlatformSttEngine(
      context,
      if (auto) "auto" else SttLang.localeOf(c.lang),
      PlatformSttEngine.Options(autoDetect = auto, segmented = c.segmented, initialLocale = first),
    )
  }

  private fun buildSherpa(c: Config): SttEngine {
    val langs = if (c.lang == "auto") listOf("ko", "en") else listOf(c.lang)
    val files = HashMap<String, SherpaStreamingSttEngine.Files>()
    for (l in langs) {
      val set = ModelCatalog.find(l)!!
      if (!models.isReady(set)) throw IllegalStateException("Model set '$l' is not downloaded")
      files[l] = SherpaStreamingSttEngine.Files(
        models.fileFor(l, "encoder.int8.onnx"), models.fileFor(l, "decoder.int8.onnx"),
        models.fileFor(l, "joiner.int8.onnx"), models.fileFor(l, "tokens.txt"),
      )
    }
    val vad = if (models.isReady(ModelCatalog.vad)) models.fileFor("vad", "silero_vad.onnx") else null
    return SherpaStreamingSttEngine(langs, files, vad, log)
  }

  // ---- microphone route -----------------------------------------------------------------------------

  /** (input device, communication device) of the first Bluetooth SCO / BLE headset, or nulls. */
  private fun bluetoothDevices(): Pair<AudioDeviceInfo?, AudioDeviceInfo?> {
    fun isBt(t: Int) = t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || t == AudioDeviceInfo.TYPE_BLE_HEADSET
    val comm = am.availableCommunicationDevices.firstOrNull { isBt(it.type) }
    val input = am.getDevices(AudioManager.GET_DEVICES_INPUTS).firstOrNull { isBt(it.type) && (comm == null || it.address == comm.address) }
      ?: am.getDevices(AudioManager.GET_DEVICES_INPUTS).firstOrNull { isBt(it.type) }
    return input to comm
  }

  private fun routeBluetooth(): Map<String, Any?> {
    val (_, comm) = bluetoothDevices()
    if (comm == null) {
      val r = mapOf("ok" to false, "reason" to "no Bluetooth SCO / BLE headset in availableCommunicationDevices", "available" to am.availableCommunicationDevices.map(AudioRouting::describe))
      log.log("stt_mic_route", r + ("kind" to "communication_device"))
      return r
    }
    am.mode = AudioManager.MODE_IN_COMMUNICATION
    val ok = am.setCommunicationDevice(comm)
    routedBt = true
    var waited = 0L
    while (waited < 3_000 && am.communicationDevice?.id != comm.id) { Thread.sleep(100); waited += 100 }
    val active = am.communicationDevice
    val r = mapOf(
      "ok" to (ok && active?.id == comm.id), "reason" to if (!ok) "setCommunicationDevice returned false" else if (active?.id != comm.id) "device not active after 3 s" else null,
      "kind" to "communication_device", "requested" to AudioRouting.describe(comm), "active" to active?.let(AudioRouting::describe),
      "waitedMs" to waited, "audioMode" to am.mode,
    )
    log.log("stt_mic_route", r)
    emit("sttMicRoute", r + ("atEpochMs" to System.currentTimeMillis()))
    return r
  }

  private fun releaseRoute() {
    if (!routedBt) return
    routedBt = false
    try { am.clearCommunicationDevice() } catch (_: Exception) { }
    am.mode = AudioManager.MODE_NORMAL
    val r = mapOf("kind" to "released", "audioMode" to am.mode)
    log.log("stt_mic_route", r)
    emit("sttMicRoute", r + ("atEpochMs" to System.currentTimeMillis()))
  }

  private fun routeEvent(m: Map<String, Any?>) {
    val withTime = m + ("atEpochMs" to System.currentTimeMillis())
    log.log("stt_mic_route", m)
    emit("sttMicRoute", withTime)
  }

  /**
   * Best effort `record_route` for the platform recognizer: the recognition service records in its own process, but the
   * system's active recording configurations show the source and the device it is bound to.
   */
  private fun observeRecordingConfigs() {
    if (Build.VERSION.SDK_INT < 29 || recordingCb != null) return
    val cb = object : AudioManager.AudioRecordingCallback() {
      override fun onRecordingConfigChanged(configs: MutableList<AudioRecordingConfiguration>) {
        val list = configs.map { c ->
          mapOf(
            "clientAudioSource" to c.clientAudioSource,
            "device" to c.audioDevice?.let(AudioRouting::describe),
            "silenced" to (if (Build.VERSION.SDK_INT >= 29) c.isClientSilenced else null),
          )
        }
        routeEvent(mapOf("kind" to "recording_configs", "configs" to list, "communicationDevice" to am.communicationDevice?.let(AudioRouting::describe), "audioMode" to am.mode))
      }
    }
    recordingCb = cb
    am.registerAudioRecordingCallback(cb, null)
  }

  private fun stopObservingRecordingConfigs() {
    val cb = recordingCb ?: return
    recordingCb = null
    try { am.unregisterAudioRecordingCallback(cb) } catch (_: Exception) { }
  }

  // ---- callbacks ------------------------------------------------------------------------------------

  private fun resetUtterance(nowRt: Long) {
    utteranceBaseRt = nowRt
    lastPartialText = ""
  }

  private inner class Callbacks : SttCallbacks {
    private var lastLevelRt = 0L

    private fun path(): String? = (engine as? PlatformSttEngine)?.path

    override fun onState(state: String, detail: Map<String, Any?>) {
      val e = engine
      log.log("stt_state", mapOf("state" to state, "engine" to e?.id, "path" to path(), "detail" to detail))
      emit("sttState", mapOf("state" to state, "detail" to detail, "engine" to e?.id, "path" to path()))
      if (state == "starting" && e is PlatformSttEngine && detail.containsKey("requestedLocale")) {
        log.log(
          "stt_lang_detect",
          mapOf(
            "phase" to "request", "requestedLocale" to detail["requestedLocale"], "languageDetectionRequested" to detail["languageDetectionRequested"],
            "prior" to synchronized(lock) { policy.prior },
          ),
        )
      }
    }

    override fun onPartial(text: String) {
      val now = SystemClock.elapsedRealtime()
      val s: Int
      synchronized(lock) {
        lastPartialText = text
        s = seq + 1
        if (now - lastPartialLogRt >= PARTIAL_LOG_INTERVAL_MS) {
          lastPartialLogRt = now
          log.log("stt_partial", mapOf("seq" to s, "text" to text, "sinceBaseMs" to now - utteranceBaseRt, "engine" to engine?.id))
        }
      }
      emit("sttPartial", mapOf("seq" to s, "text" to text, "atEpochMs" to System.currentTimeMillis()))
    }

    override fun onLevel(level: Float) {
      val now = SystemClock.elapsedRealtime()
      if (now - lastLevelRt < 80) return
      lastLevelRt = now
      emit("sttLevel", mapOf("level" to level))
    }

    override fun onLanguageSignal(source: String, fields: Map<String, Any?>) {
      synchronized(lock) { detectionEvents++ }
      log.log("stt_lang_detect", mapOf("phase" to "platform_callback", "source" to source) + fields)
      emit("sttLangDetect", mapOf("source" to source, "atEpochMs" to System.currentTimeMillis()) + fields)
    }

    override fun onError(code: String, message: String, recoverable: Boolean) {
      val auto = cfg?.lang == "auto"
      if (code == "NO_MATCH") {
        // Speech was heard but nothing recognized: layer 3 flips the locale for the next attempt.
        synchronized(lock) {
          val tried = (engine as? PlatformSttEngine)?.requestedLocale?.let { SttLang.langOfLocale(it) } ?: policy.prior
          if (auto) policy.update(tried, empty = true, confidence = null, scriptLang = null)
          (engine as? PlatformSttEngine)?.let { if (auto) it.hintLocale(SttLang.localeOf(policy.next())) }
        }
      }
      log.log("stt_error", mapOf("code" to code, "message" to message, "recoverable" to recoverable, "engine" to engine?.id, "path" to path()))
      emit("sttError", mapOf("code" to code, "message" to message, "recoverable" to recoverable, "atEpochMs" to System.currentTimeMillis()))
      if (!recoverable) io.execute { stop() }
    }

    override fun onFinal(result: SttFinal) {
      val finalRt = SystemClock.elapsedRealtime()
      val c = cfg ?: return
      val e = engine
      val text = result.text.trim()
      val out: Map<String, Any?>
      synchronized(lock) {
        val tried: String? = when {
          e is PlatformSttEngine -> SttLang.langOfLocale(e.requestedLocale)
          c.lang != "auto" -> c.lang
          else -> null
        }
        val script = SttLang.scriptLang(text)
        if (text.isEmpty()) {
          log.log("stt_final", mapOf("empty" to true, "engine" to e?.id, "path" to path(), "details" to result.details))
          if (c.lang == "auto") policy.update(tried ?: policy.prior, empty = true, confidence = null, scriptLang = null)
          if (c.lang == "auto") (e as? PlatformSttEngine)?.hintLocale(SttLang.localeOf(policy.next()))
          resetUtterance(finalRt)
          return
        }
        val lang: String
        val by: String
        if (result.detectedLang != null) {
          lang = result.detectedLang; by = result.detectedBy ?: SttLang.BY_PLATFORM
        } else if (c.lang == "auto") {
          if (script != null) { lang = script; by = SttLang.BY_SCRIPT } else { lang = tried ?: policy.prior; by = SttLang.BY_REQUESTED }
        } else {
          lang = c.lang; by = SttLang.BY_REQUESTED
        }
        val priorBefore = policy.prior
        var nextReason: String? = null
        if (c.lang == "auto") {
          policy.update(tried ?: lang, empty = false, confidence = result.confidence, scriptLang = lang)
          nextReason = policy.nextReason()
          (e as? PlatformSttEngine)?.hintLocale(SttLang.localeOf(policy.next()))
        }
        seq++
        // All latency numbers come from the engine's per-utterance timing (reset per utterance, negatives -> null).
        val timing = result.timing
        val endToFinal = timing["endToFinalMs"]
        val firstPartialMs = timing["beginToFirstPartialMs"]
        val pe = e as? PlatformSttEngine
        out = mapOf(
          "seq" to seq, "text" to text, "lang" to lang, "detectedBy" to by, "confidence" to result.confidence,
          "engine" to (e?.id ?: c.engine), "path" to (pe?.path ?: "sherpa_onnx"), "requestedLang" to c.lang, "mic" to c.mic,
          "endToFinalMs" to endToFinal, "firstPartialMs" to firstPartialMs, "partials" to (timing["partials"] ?: 0),
          "timing" to timing,
          "platformDetectionFired" to (pe?.languageDetectionFired), "segmentedSeen" to (pe?.segmentedSeen),
          "priorBefore" to priorBefore, "nextLang" to (if (c.lang == "auto") policy.next() else null), "nextReason" to nextReason,
          "finalAtEpochMs" to System.currentTimeMillis(), "details" to result.details,
        )
        resetUtterance(finalRt)
      }
      log.log("stt_final", out)
      if (c.lang == "auto") {
        log.log(
          "stt_lang_detect",
          mapOf(
            "phase" to "decision", "seq" to out["seq"], "lang" to out["lang"], "decidedBy" to out["detectedBy"], "platformDetectionFired" to out["platformDetectionFired"],
            "priorBefore" to out["priorBefore"], "nextLang" to out["nextLang"], "nextReason" to out["nextReason"],
          ),
        )
      }
      emit("sttFinal", out)
    }
  }

  companion object {
    private const val PARTIAL_LOG_INTERVAL_MS = 500L
  }
}
