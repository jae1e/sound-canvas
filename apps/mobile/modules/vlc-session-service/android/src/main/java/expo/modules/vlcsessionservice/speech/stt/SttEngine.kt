package expo.modules.vlcsessionservice.speech.stt

/**
 * One result of an utterance. Timestamps are `SystemClock.elapsedRealtime()` values; null when the engine cannot tell.
 *
 * @param detectedLang "ko" / "en" when the engine itself knows (platform language detection, dual decoding); null otherwise
 * @param detectedBy short code of the mechanism that decided [detectedLang] (see [SttLang])
 * @param details engine specific extras that go to the JSONL log and the UI (hypotheses, bundle keys, ...)
 */
data class SttFinal(
  val text: String,
  val confidence: Float? = null,
  val detectedLang: String? = null,
  val detectedBy: String? = null,
  val speechStartRt: Long? = null,
  val speechEndRt: Long? = null,
  val details: Map<String, Any?> = emptyMap(),
)

/** Callbacks may arrive on any thread (platform engine: main thread; sherpa engine: its decode thread). */
interface SttCallbacks {
  /** idle -> starting -> listening -> (processing) -> stopped | error. [detail] is free-form diagnostics. */
  fun onState(state: String, detail: Map<String, Any?> = emptyMap())
  fun onPartial(text: String)
  fun onFinal(result: SttFinal)
  fun onError(code: String, message: String, recoverable: Boolean)

  /** Level for the meter, 0..1 (platform engine: from onRmsChanged; sherpa engine: from the captured frames). */
  fun onLevel(level: Float) {}

  /** Platform `onLanguageDetection` or similar; the lab logs it as `stt_lang_detect`. */
  fun onLanguageSignal(source: String, fields: Map<String, Any?>) {}
}

/**
 * Common surface of every speech-to-text engine. One engine instance is bound to one locale (or to "auto" for the
 * dual-decoding sherpa engine). Korean and English are separate engines/models behind this interface.
 */
interface SttEngine {
  val id: String
  /** BCP-47 tag ("ko-KR", "en-US") or "auto". */
  val locale: String
  val supportsStreaming: Boolean

  fun start(callbacks: SttCallbacks)
  /** Ends the current utterance (emits a pending final if any) and stops listening. */
  fun stop()
  fun release()

  /**
   * Tells the engine which locale to use for the NEXT utterance. Only meaningful for engines whose language is fixed per
   * recognition request (platform). Default: ignore.
   */
  fun hintLocale(tag: String) {}

  /** Engines that capture the microphone themselves return false; frame-driven engines return true and implement [FrameSink]. */
  val needsFrames: Boolean get() = false
}

/** Frame-driven engines receive 16 kHz mono float frames in -1..1 from the lab's microphone capture. */
interface FrameSink {
  fun onFrame(frame: FloatArray, nowRt: Long)
}
