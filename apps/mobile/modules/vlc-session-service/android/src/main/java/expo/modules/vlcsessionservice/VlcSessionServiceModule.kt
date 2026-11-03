package expo.modules.vlcsessionservice

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.LogSummary
import expo.modules.vlcsessionservice.log.chainText
import expo.modules.vlcsessionservice.service.CapabilityReport
import expo.modules.vlcsessionservice.service.SessionConfig
import expo.modules.vlcsessionservice.service.SessionRuntime
import expo.modules.vlcsessionservice.service.SessionService
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
import expo.modules.vlcsessionservice.speech.TtsLab
import java.util.concurrent.Executors

/** JS-facing surface. All real work lives in [SessionService] and the audio/speech/location/log packages. */
class VlcSessionServiceModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "React context unavailable", null)
  private val log get() = DiagLog.get(context)
  private val models get() = ModelManager(context)
  private val io = Executors.newCachedThreadPool()
  @Volatile private var activityVisible = false

  override fun definition() = ModuleDefinition {
    Name("VlcSessionService")

    Events(
      "sessionState", "sessionError", "pipelineState", "audioLevel",
      "speechStart", "partialTranscript", "finalTranscript", "echoSuppressed",
      "ttsStart", "ttsDone",
      "cueDue", "cueAudible",
      "location", "locationGap",
      "routeChanged", "modelDownloadProgress",
      "speechOutputRoute", "ttsLabEvent", "ttsLabProgress", "ttsLabPrepared", "ttsLabSelfTest", "ttsLabSelfTestDone",
    )

    OnCreate {
      SessionRuntime.sink = { event, payload -> sendEvent(event, payload) }
      appContext.reactContext?.let { SpeechOutput.startMonitoring(it) }
    }
    OnDestroy {
      SessionRuntime.sink = null
      SpeechOutput.stopMonitoring()
      labOrNull?.release()
    }
    OnActivityEntersForeground {
      activityVisible = true
      applyVolumeControlStream(true)
    }
    OnActivityEntersBackground {
      activityVisible = false
      applyVolumeControlStream(false)
    }

    // ---- session lifecycle -------------------------------------------------------------------
    AsyncFunction("startSession") { options: Map<String, Any?> ->
      val ctx = context
      if (SessionRuntime.service != null) throw CodedException("ALREADY_RUNNING", "A session is already running", null)
      val activity = appContext.currentActivity
      if (activity == null || !(activityVisible || activity.hasWindowFocus())) {
        throw CodedException("NOT_VISIBLE", "The session must be started while the app is visible (Android 14+ restriction)", null)
      }
      if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        throw CodedException("PERMISSION_RECORD_AUDIO", "RECORD_AUDIO is not granted", null)
      }
      val cfg = SessionConfig(
        bargeIn = options["bargeIn"] as? Boolean ?: false,
        language = options["language"] as? String ?: "ko",
        allowMissingModels = options["allowMissingModels"] as? Boolean ?: true,
        locationEnabled = options["locationEnabled"] as? Boolean ?: true,
      )
      SessionRuntime.prepareStart(cfg)
      try {
        ContextCompat.startForegroundService(ctx, Intent(ctx, SessionService::class.java))
      } catch (e: Exception) {
        throw CodedException("START_REJECTED", e.toString(), e)
      }
      if (!SessionRuntime.awaitStarted(10_000)) throw CodedException("START_TIMEOUT", "Service did not report a state within 10 s", null)
      if (SessionRuntime.state == "error") throw CodedException("START_FAILED", SessionRuntime.lastError ?: "unknown", null)
      mapOf("state" to SessionRuntime.state)
    }

    AsyncFunction("stopSession") {
      SessionRuntime.service?.stopSession("js_stop")
      mapOf("state" to "stopped")
    }

    Function("getSessionState") { SessionRuntime.state }

    AsyncFunction("setBargeIn") { enabled: Boolean ->
      SessionRuntime.service?.setBargeIn(enabled)
      SessionRuntime.config = SessionRuntime.config.copy(bargeIn = enabled)
      Unit
    }

    // ---- TTS & cues (sync functions: no queue hop, so JS-path latency is measured honestly) --------
    Function("speak") { text: String, priority: String, cueId: String? ->
      val svc = SessionRuntime.service ?: throw CodedException("NO_SESSION", "Start a session first", null)
      svc.speak(text, priority, cueId, "js")
    }
    Function("stopSpeaking") { SessionRuntime.service?.tts?.stop("js") ; Unit }

    Function("scheduleCue") { id: String, atEpochMs: Double, fallbackText: String ->
      val svc = SessionRuntime.service ?: throw CodedException("NO_SESSION", "Start a session first", null)
      svc.cues?.schedule(id, atEpochMs.toLong(), fallbackText)
      Unit
    }
    Function("cancelCue") { id: String -> SessionRuntime.service?.cues?.cancel(id); Unit }
    Function("ackCue") { id: String -> SessionRuntime.service?.cues?.ack(id) ?: false }

    // ---- audio routing -----------------------------------------------------------------------
    AsyncFunction("listCommunicationDevices") {
      routingOrTemp().listDevices()
    }
    AsyncFunction("setCommunicationDevice") { id: Int -> routingOrTemp().select(id) }
    AsyncFunction("clearCommunicationDevice") { routingOrTemp().clear() }
    AsyncFunction("getRouteState") { routingOrTemp().state() }

    // ---- speech output route + forced speaker ------------------------------------------------------
    AsyncFunction("setSpeechOutput") { mode: String -> SpeechOutput.setMode(context, mode) }
    AsyncFunction("getSpeechOutputRoute") {
      SpeechOutput.startMonitoring(context)
      SpeechOutput.report("query", SpeechOutput.currentUsage())
    }

    // ---- TTS A/B lab -------------------------------------------------------------------------------
    Function("ttsLabEngines") { lab.engineList() }
    AsyncFunction("ttsLabPrepare") { engineId: String, locale: String, promise: Promise ->
      io.execute { runCatching { lab.prepare(engineId, locale) }.fold({ promise.resolve(it) }, { promise.reject(CodedException("TTS_LAB", it.chainText(), it)) }) }
    }
    AsyncFunction("ttsLabVoices") { engineId: String, locale: String, promise: Promise ->
      io.execute { runCatching { lab.voices(engineId, locale) }.fold({ promise.resolve(it) }, { promise.reject(CodedException("TTS_LAB", it.chainText(), it)) }) }
    }
    AsyncFunction("ttsLabDownloadVoice") { voice: String, promise: Promise ->
      io.execute { runCatching { lab.downloadMlKitVoice(voice) }.fold({ promise.resolve(it) }, { promise.reject(CodedException("TTS_LAB", it.chainText(), it)) }) }
    }
    Function("ttsLabSpeak") { engineId: String, text: String, locale: String, voice: String?, options: Map<String, Any?> ->
      applyVolumeControlStream(true)
      lab.speak(engineId, text, locale, voice, options)
    }
    Function("ttsLabRunAll") { koText: String, enText: String, outputDeviceId: Int?, onlyEngine: String? ->
      applyVolumeControlStream(true)
      lab.runSelfTest(koText, enText, outputDeviceId, onlyEngine)
    }
    AsyncFunction("ttsLabPreviewRoute") { outputDeviceId: Int? -> lab.previewRoute(outputDeviceId) }
    Function("ttsLabGetVolume") { SpeechOutput.musicVolume(context) }
    Function("ttsLabSetVolume") { percent: Int -> SpeechOutput.setMusicVolume(context, percent) }
    Function("ttsLabStop") { labOrNull?.stop(); Unit }
    Function("ttsLabSetMlKitPlayback") { enabled: Boolean, sampleRate: Int -> lab.setMlKitOwnPlayback(enabled, sampleRate); Unit }

    // ---- models ------------------------------------------------------------------------------
    AsyncFunction("getModelStatus") { models.status() }
    AsyncFunction("downloadModels") { setIds: List<String>, promise: Promise ->
      io.execute {
        try {
          models.download(setIds) { sendEvent("modelDownloadProgress", it) }
          promise.resolve(models.status())
        } catch (e: Exception) {
          promise.reject(CodedException("MODEL_DOWNLOAD_FAILED", e.message ?: e.toString(), e))
        }
      }
    }
    AsyncFunction("listInstalledModels") { models.installedSets() }
    AsyncFunction("deleteModelSet") { setId: String, promise: Promise ->
      io.execute {
        runCatching { models.deleteSet(setId) { labOrNull?.releaseForSet(it) }.also { models.logStorage("delete_set") } }
          .fold({ promise.resolve(it) }, { promise.reject(CodedException("MODEL_DELETE_FAILED", it.chainText(), it)) })
      }
    }
    AsyncFunction("deleteUnusedModels") { keep: List<String>, promise: Promise ->
      io.execute {
        runCatching { models.deleteUnused(keep) { labOrNull?.releaseForSet(it) } }
          .fold({ promise.resolve(it) }, { promise.reject(CodedException("MODEL_DELETE_FAILED", it.chainText(), it)) })
      }
    }
    Function("cancelModelDownload") { models.cancel() ; Unit }
    Function("getModelCatalog") {
      ModelCatalog.all.map { s ->
        mapOf("id" to s.id, "title" to s.title, "totalBytes" to s.totalBytes, "files" to s.files.map { mapOf("name" to it.name, "url" to it.url, "sizeBytes" to it.sizeBytes, "sha256" to it.sha256) })
      }
    }

    // ---- diagnostics -------------------------------------------------------------------------
    Function("getLogPath") { log.path }
    AsyncFunction("getLogSummary") { LogSummary.build(log.readLines()) }
    AsyncFunction("clearLog") { log.clear() }
    AsyncFunction("writeLogMarker") { label: String -> log.log("marker", mapOf("label" to label)); Unit }
    AsyncFunction("getCapabilityReport") {
      val r = CapabilityReport.build(context, routingOrTemp())
      log.log("capability_report", r)
      r
    }
  }

  /** Hardware volume keys control STREAM_MUSIC while the app is in the foreground (speech uses media-style attributes). */
  private fun applyVolumeControlStream(media: Boolean) {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      activity.volumeControlStream = if (media) AudioManager.STREAM_MUSIC else AudioManager.USE_DEFAULT_STREAM_TYPE
    }
  }

  private var labInstance: TtsLab? = null
  private val labOrNull: TtsLab? get() = labInstance
  private val lab: TtsLab
    get() = labInstance ?: synchronized(this) {
      labInstance ?: TtsLab(context, io) { e, p -> sendEvent(e, p) }.also {
        SpeechOutput.startMonitoring(context)
        labInstance = it
      }
    }

  /** Routing helper that also works when no session is running (for the route picker). */
  private fun routingOrTemp(): AudioRouting =
    SessionRuntime.service?.routing ?: AudioRouting(context, log) { _, _ -> }
}
