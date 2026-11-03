package expo.modules.vlcsessionservice.service

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Options passed from JS to the service at session start. */
data class SessionConfig(
  val bargeIn: Boolean = false,
  /** "ko" or "en": selects the STT model set and the default TTS locale. */
  val language: String = "ko",
  /** Start without STT when models are missing (lets you test service/GPS/TTS/cues first). */
  val allowMissingModels: Boolean = true,
  val locationEnabled: Boolean = true,
  /** "platform" (on-device SpeechRecognizer, default) or "sherpa" (own AudioRecord + SpeechPipeline). */
  val sttEngine: String = "platform",
  /** With platform STT: switch to sherpa automatically when recognition stops working (for example in the background). */
  val sttAutoFallback: Boolean = true,
  /** Product mode that owns the session: "work", "travel" or "coach". Informational (notification text, log). */
  val mode: String = "work",
)

/**
 * In-process rendezvous between the Expo module (JS side) and the foreground service.
 * Both live in the same process, so a static holder is sufficient for the spike.
 */
object SessionRuntime {
  /** Event sink installed by the Expo module. May be called from any thread. */
  @Volatile
  var sink: ((String, Map<String, Any?>) -> Unit)? = null

  @Volatile
  var service: SessionService? = null

  @Volatile
  var config: SessionConfig = SessionConfig()

  @Volatile
  var state: String = "stopped"

  @Volatile
  private var startLatch: CountDownLatch? = null

  @Volatile
  var lastError: String? = null

  fun emit(event: String, payload: Map<String, Any?>) {
    sink?.invoke(event, payload)
  }

  fun prepareStart(cfg: SessionConfig) {
    config = cfg
    lastError = null
    startLatch = CountDownLatch(1)
  }

  /** Blocks until the service reports running/error/stopped, or the timeout expires. */
  fun awaitStarted(timeoutMs: Long): Boolean = startLatch?.await(timeoutMs, TimeUnit.MILLISECONDS) ?: true

  fun setState(newState: String, detail: String? = null) {
    state = newState
    if (newState == "error") lastError = detail
    if (newState != "starting") startLatch?.countDown()
    emit("sessionState", mapOf("state" to newState, "detail" to detail))
  }
}
