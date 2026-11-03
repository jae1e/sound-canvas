package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.media.AudioAttributes
import android.os.SystemClock
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.speech.engine.MlKitTtsEngine
import expo.modules.vlcsessionservice.speech.engine.PlatformTtsEngine
import expo.modules.vlcsessionservice.speech.engine.SherpaTtsEngine
import expo.modules.vlcsessionservice.speech.engine.SpeakCallback
import expo.modules.vlcsessionservice.speech.engine.SpeakRequest
import expo.modules.vlcsessionservice.speech.engine.SpeechEngine
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.atomic.AtomicInteger

/**
 * TTS A/B test bench: owns one [SpeechEngine] per engine id, runs prepare/speak off the caller's thread, measures
 * request -> first-audio latency and reports the speech output route for every utterance.
 * Independent of the foreground session (works without one); the session's cue TTS still uses [TtsController].
 */
class TtsLab(
  context: Context,
  private val io: ExecutorService,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  private val ctx = context.applicationContext
  private val log = DiagLog.get(ctx)
  private val seq = AtomicInteger()
  private val engines = ConcurrentHashMap<String, SpeechEngine>()
  @Volatile private var current: SpeechEngine? = null

  private fun create(id: String): SpeechEngine = when (id) {
    "platform-google" -> PlatformTtsEngine(ctx, id, "Platform TTS - Google (com.google.android.tts)", "com.google.android.tts")
    "platform-samsung" -> PlatformTtsEngine(ctx, id, "Platform TTS - Samsung (com.samsung.SMT)", "com.samsung.SMT")
    "mlkit" -> MlKitTtsEngine(ctx)
    "supertonic" -> SherpaTtsEngine(ctx, id, "Supertonic 3 int8 (sherpa-onnx)", SherpaTtsEngine.Kind.SUPERTONIC)
    "kokoro" -> SherpaTtsEngine(ctx, id, "Kokoro 82M v1.0 int8 (sherpa-onnx, English)", SherpaTtsEngine.Kind.KOKORO)
    else -> throw IllegalArgumentException("Unknown TTS engine '$id'")
  }

  private fun engine(id: String): SpeechEngine = engines.getOrPut(id) { create(id) }

  fun engineList(): List<Map<String, Any?>> = ENGINE_IDS.map { id ->
    val e = engine(id)
    mapOf(
      "id" to id,
      "label" to e.label,
      "inProcess" to e.runsInProcess,
      "supportsKo" to e.supports(Locale.KOREA),
      "supportsEn" to e.supports(Locale.US),
    )
  }

  fun prepare(id: String, localeTag: String): Map<String, Any?> {
    val e = engine(id)
    val locale = Locale.forLanguageTag(localeTag)
    val r = try { e.prepare(locale) } catch (t: Throwable) { mapOf("ok" to false, "error" to t.toString()) }
    log.log("tts_lab_prepare", mapOf("engine" to id, "locale" to localeTag) + r)
    if (r["ok"] == true) prepared.add("$id|${locale.language}") else prepared.remove("$id|${locale.language}")
    return r
  }

  fun voices(id: String, localeTag: String): List<Map<String, Any?>> = engine(id).voices(Locale.forLanguageTag(localeTag))

  fun setMlKitOwnPlayback(enabled: Boolean, sampleRate: Int) {
    (engine("mlkit") as MlKitTtsEngine).also { it.ownPlayback = enabled; it.assumedSampleRate = sampleRate }
  }

  fun downloadMlKitVoice(voice: String): Map<String, Any?> {
    val e = engine("mlkit") as MlKitTtsEngine
    val r = e.downloadVoice(voice) { emit("ttsLabProgress", mapOf("engine" to "mlkit", "voice" to voice) + it) }
    log.log("tts_lab_mlkit_download", mapOf("voice" to voice) + r)
    return r
  }

  /** Returns the request id immediately; progress arrives as `ttsLabEvent`. */
  fun speak(engineId: String, text: String, localeTag: String, voice: String?): String {
    val id = "lab${seq.incrementAndGet()}"
    val requestedRt = SystemClock.elapsedRealtime()
    val locale = Locale.forLanguageTag(localeTag)
    log.log("tts_lab_request", mapOf("requestId" to id, "engine" to engineId, "locale" to localeTag, "voice" to voice, "chars" to text.length))
    emit("ttsLabEvent", mapOf("requestId" to id, "engine" to engineId, "phase" to "requested"))
    io.execute {
      val e = engine(engineId)
      // Only one A/B utterance at a time.
      current?.let { if (it !== e) it.stop() }
      current = e
      if (!prepared.contains("$engineId|${locale.language}")) {
        val p = prepare(engineId, localeTag)
        if (p["ok"] != true) {
          emit("ttsLabEvent", mapOf("requestId" to id, "engine" to engineId, "phase" to "error", "message" to (p["error"] ?: "prepare failed"), "prepare" to p))
          return@execute
        }
        prepared.add("$engineId|${locale.language}")
      }
      e.speak(
        SpeakRequest(id, text, locale, voice, requestedRt),
        object : SpeakCallback {
          override fun onFirstAudio(rt: Long, routed: android.media.AudioDeviceInfo?, info: Map<String, Any?>) {
            val usage = (info["usage"] as? Int) ?: AudioAttributes.USAGE_ASSISTANT
            val route = SpeechOutput.report("tts_start", usage, routed, mapOf("requestId" to id, "engine" to engineId))
            val latency = rt - requestedRt
            log.log("tts_lab_first_audio", mapOf("requestId" to id, "engine" to engineId, "latencyMs" to latency) + info.filterKeys { it != "usage" })
            emit(
              "ttsLabEvent",
              mapOf(
                "requestId" to id, "engine" to engineId, "phase" to "first_audio", "latencyMs" to latency,
                "routeLabel" to route["label"], "routeOk" to route["ok"], "routeWarning" to route["warning"],
                "info" to info.filterKeys { it != "usage" },
              ),
            )
          }

          override fun onFinished(outcome: String, info: Map<String, Any?>) {
            log.log("tts_lab_done", mapOf("requestId" to id, "engine" to engineId, "outcome" to outcome, "totalMs" to SystemClock.elapsedRealtime() - requestedRt) + info)
            emit(
              "ttsLabEvent",
              mapOf(
                "requestId" to id, "engine" to engineId, "phase" to if (outcome.startsWith("error")) "error" else "done",
                "outcome" to outcome, "message" to outcome.takeIf { it.startsWith("error") },
                "totalMs" to SystemClock.elapsedRealtime() - requestedRt, "info" to info,
              ),
            )
          }
        },
      )
    }
    return id
  }

  private val prepared = ConcurrentHashMap.newKeySet<String>()

  fun invalidate(engineId: String) {
    prepared.removeAll { it.startsWith("$engineId|") }
  }

  fun stop() {
    engines.values.forEach { it.stop() }
  }

  fun release() {
    engines.values.forEach { try { it.release() } catch (_: Throwable) {} }
    engines.clear()
    prepared.clear()
  }

  companion object {
    val ENGINE_IDS = listOf("platform-google", "platform-samsung", "mlkit", "supertonic", "kokoro")
  }
}
