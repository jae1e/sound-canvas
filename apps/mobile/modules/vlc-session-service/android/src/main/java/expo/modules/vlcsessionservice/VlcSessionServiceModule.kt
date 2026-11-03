package expo.modules.vlcsessionservice

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.LogSummary
import expo.modules.vlcsessionservice.service.CapabilityReport
import expo.modules.vlcsessionservice.service.SessionConfig
import expo.modules.vlcsessionservice.service.SessionRuntime
import expo.modules.vlcsessionservice.service.SessionService
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
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
    )

    OnCreate {
      SessionRuntime.sink = { event, payload -> sendEvent(event, payload) }
    }
    OnDestroy {
      SessionRuntime.sink = null
    }
    OnActivityEntersForeground { activityVisible = true }
    OnActivityEntersBackground { activityVisible = false }

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

  /** Routing helper that also works when no session is running (for the route picker). */
  private fun routingOrTemp(): AudioRouting =
    SessionRuntime.service?.routing ?: AudioRouting(context, log) { _, _ -> }
}
