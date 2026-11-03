package expo.modules.vlcsessionservice.speech

import android.content.Context

/**
 * Static session-TTS engine selection. Set from JS (`setSessionTts`) before or during a session; read by
 * [TtsController] on every utterance. Also carries the load state shown by `getSessionTtsStatus`.
 */
object SessionTts {
  const val SUPERTONIC_SET = "tts-supertonic"

  @Volatile var engine: String = "auto" // auto | platform | supertonic
    private set
  @Volatile var voice: Int = 0
    private set
  @Volatile var steps: Int = 8
    private set

  @Volatile var loaded = false
  @Volatile var loading = false
  @Volatile var lastError: String? = null

  /** Validates and clamps; unknown engine names fall back to "auto". */
  fun configure(engine: String, voice: Int, steps: Int) {
    this.engine = if (engine == "platform" || engine == "supertonic") engine else "auto"
    this.voice = voice.coerceIn(0, 9)
    this.steps = steps.coerceIn(1, 32)
  }

  fun wantsSupertonic(): Boolean = engine != "platform"

  fun modelReady(context: Context): Boolean {
    val set = ModelCatalog.find(SUPERTONIC_SET) ?: return false
    return ModelManager(context).isReady(set)
  }

  fun status(context: Context, sessionRunning: Boolean): Map<String, Any?> {
    val ready = modelReady(context)
    val active = if (!wantsSupertonic() || !ready) "platform" else if (sessionRunning && !loaded) "platform" else "supertonic"
    return mapOf(
      "requested" to engine,
      "supertonicModelReady" to ready,
      "supertonicLoaded" to loaded,
      "supertonicLoading" to loading,
      "active" to active,
      "lastError" to lastError,
    )
  }
}
