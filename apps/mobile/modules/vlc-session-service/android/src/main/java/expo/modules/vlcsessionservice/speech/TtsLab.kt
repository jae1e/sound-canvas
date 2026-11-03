package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.media.AudioAttributes
import android.os.SystemClock
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
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
    "kitten" -> SherpaTtsEngine(ctx, id, "Kitten TTS nano 0.8 int8 (sherpa-onnx, English)", SherpaTtsEngine.Kind.KITTEN)
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

  /**
   * Blocking. Never throws: every Throwable (including UnsatisfiedLinkError and other JNI errors) becomes an
   * `ok=false` result. Always logs `tts_lab_prepare` and emits `ttsLabPrepared` so the UI sees the outcome.
   */
  fun prepare(id: String, localeTag: String): Map<String, Any?> {
    val t0 = SystemClock.elapsedRealtime()
    log.log("tts_lab_prepare_start", mapOf("engine" to id, "locale" to localeTag))
    val locale = Locale.forLanguageTag(localeTag)
    val r: Map<String, Any?> = try {
      engine(id).prepare(locale)
    } catch (t: Throwable) {
      mapOf("ok" to false, "error" to "prepare threw: ${t.chainText()}")
    }
    val result = r + ("prepareMs" to SystemClock.elapsedRealtime() - t0)
    log.log("tts_lab_prepare", mapOf("engine" to id, "locale" to localeTag) + result)
    if (result["ok"] == true) prepared.add("$id|${locale.language}") else prepared.remove("$id|${locale.language}")
    try {
      emit("ttsLabPrepared", mapOf("engine" to id, "locale" to localeTag, "result" to result))
    } catch (_: Throwable) {}
    return result
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
  fun speak(engineId: String, text: String, localeTag: String, voice: String?, options: Map<String, Any?> = emptyMap(), observer: LabObserver? = null): String {
    val id = "lab${seq.incrementAndGet()}"
    val requestedRt = SystemClock.elapsedRealtime()
    val locale = Locale.forLanguageTag(localeTag)
    val output = if (options["output"] == SpeechOutput.MODE_AUTO) SpeechOutput.MODE_AUTO else SpeechOutput.MODE_SPEAKER
    log.log("tts_lab_request", mapOf("requestId" to id, "engine" to engineId, "locale" to localeTag, "voice" to voice, "chars" to text.length, "output" to output, "steps" to options["steps"]))
    emit("ttsLabEvent", mapOf("requestId" to id, "engine" to engineId, "phase" to "requested"))
    io.execute {
     try {
      val e = engine(engineId)
      // Only one A/B utterance at a time.
      current?.let { if (it !== e) it.stop() }
      current = e
      SpeechOutput.beginLab(ctx, output, id)
      // Speak prepares on demand (e.g. after a model download, or after a failed earlier prepare).
      if (!prepared.contains("$engineId|${locale.language}")) {
        val p = prepare(engineId, localeTag)
        if (p["ok"] != true) {
          log.log("tts_lab_done", mapOf("requestId" to id, "engine" to engineId, "outcome" to "error:prepare_failed"))
          emit("ttsLabEvent", mapOf("requestId" to id, "engine" to engineId, "phase" to "error", "outcome" to "error:prepare_failed", "message" to (p["error"] ?: "prepare failed"), "prepare" to p))
          observer?.onFinished("error:prepare_failed: ${p["error"]}", emptyMap())
          SpeechOutput.endLab(ctx, id)
          return@execute
        }
      }
      e.speak(
        SpeakRequest(id, text, locale, voice, requestedRt, options),
        object : SpeakCallback {
          override fun onFirstAudio(rt: Long, routed: android.media.AudioDeviceInfo?, info: Map<String, Any?>) {
            val usage = (info["usage"] as? Int) ?: AudioAttributes.USAGE_ASSISTANT
            val route = SpeechOutput.report("tts_start", usage, routed, mapOf("requestId" to id, "engine" to engineId))
            val latency = rt - requestedRt
            observer?.onFirstAudio(latency, route)
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
            SpeechOutput.endLab(ctx, id)
            observer?.onFinished(outcome, info)
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
     } catch (t: Throwable) {
      val msg = "error:${t.chainText()}"
      log.log("tts_lab_done", mapOf("requestId" to id, "engine" to engineId, "outcome" to msg))
      SpeechOutput.endLab(ctx, id)
      emit("ttsLabEvent", mapOf("requestId" to id, "engine" to engineId, "phase" to "error", "outcome" to msg, "message" to msg))
      observer?.onFinished(msg, emptyMap())
     }
    }
    return id
  }

  private val prepared = ConcurrentHashMap.newKeySet<String>()

  /** Internal hook used by the self-test; mirrors what the UI receives. */
  interface LabObserver {
    fun onFirstAudio(latencyMs: Long, route: Map<String, Any?>)
    fun onFinished(outcome: String, info: Map<String, Any?>)
  }

  @Volatile private var selfTestRunning = false
  @Volatile private var selfTestCancel = false
  private val models = ModelManager(ctx)

  /**
   * "Run all engines": for every engine and language it supports, downloads missing model files, prepares, speaks the
   * test sentence through the phone speaker, waits up to [TIMEOUT_MS] for the utterance to finish and logs one
   * `tts_lab_selftest` event (also emitted as `ttsLabSelfTest`), then `tts_lab_selftest_done`. Returns false if a run
   * is already in progress. Runs on the lab's executor; progress arrives only as events.
   */
  fun runSelfTest(koText: String, enText: String): Boolean {
    if (selfTestRunning) return false
    selfTestRunning = true
    selfTestCancel = false
    io.execute {
      val rows = ArrayList<Map<String, Any?>>()
      try {
        log.log("tts_lab_selftest_start", mapOf("engines" to ENGINE_IDS))
        for (lang in listOf("ko" to koText, "en" to enText)) {
          val tag = if (lang.first == "ko") "ko-KR" else "en-US"
          for (eid in ENGINE_IDS) {
            if (selfTestCancel) break
            if (!engine(eid).supports(Locale.forLanguageTag(tag))) continue
            val row = try { selfTestOne(eid, lang.first, tag, lang.second) } catch (t: Throwable) {
              mapOf("engine" to eid, "lang" to lang.first, "ok" to false, "error" to t.chainText())
            }
            rows.add(row)
            log.log("tts_lab_selftest", row)
            try { emit("ttsLabSelfTest", row) } catch (_: Throwable) {}
          }
        }
      } catch (t: Throwable) {
        log.log("tts_lab_selftest_error", mapOf("error" to t.chainText()))
      } finally {
        selfTestRunning = false
        val summary = mapOf(
          "count" to rows.size,
          "okCount" to rows.count { it["ok"] == true },
          "failed" to rows.filter { it["ok"] != true }.map { "${it["engine"]}/${it["lang"]}: ${it["error"]}" },
          "cancelled" to selfTestCancel,
        )
        log.log("tts_lab_selftest_done", summary)
        try { emit("ttsLabSelfTestDone", summary) } catch (_: Throwable) {}
      }
    }
    return true
  }

  private fun selfTestOne(eid: String, lang: String, tag: String, text: String): Map<String, Any?> {
    val base = mutableMapOf<String, Any?>("engine" to eid, "lang" to lang)
    // 1. model files
    val sets = when (eid) {
      "supertonic" -> listOf("tts-supertonic")
      "kokoro" -> listOf("tts-kokoro-en", "tts-lexicon-en")
      "kitten" -> listOf("tts-kitten-en", "tts-lexicon-en")
      else -> emptyList()
    }
    val missing = sets.filter { id -> ModelCatalog.find(id)?.let { !models.isReady(it) } == true }
    if (missing.isNotEmpty()) {
      try {
        models.download(missing) { emit("modelDownloadProgress", it) }
      } catch (t: Throwable) {
        return base + mapOf("ok" to false, "error" to "download failed: ${t.chainText()}")
      }
    }
    base["modelMB"] = sets.sumOf { ModelCatalog.find(it)?.totalBytes ?: 0L } / 1_000_000
    // 2. prepare
    val t0 = SystemClock.elapsedRealtime()
    val p = prepare(eid, tag)
    base["prepareMs"] = SystemClock.elapsedRealtime() - t0
    if (p["ok"] != true) return base + mapOf("ok" to false, "error" to (p["error"] ?: "prepare failed"))
    // 3. voice: first installed local voice (same rule as the UI); sherpa engines use their default sid
    val voice = if (eid in listOf("supertonic", "kokoro", "kitten")) null else try {
      val v = engine(eid).voices(Locale.forLanguageTag(tag))
      (v.firstOrNull { it["installed"] != false && it["networkRequired"] != true && it["status"] != "DOWNLOADABLE" } ?: v.firstOrNull())?.get("name") as? String
    } catch (_: Throwable) { null }
    base["voice"] = voice
    // 4. speak and wait
    val latch = java.util.concurrent.CountDownLatch(1)
    var firstMs: Long? = null
    val started = SystemClock.elapsedRealtime()
    val rid = speak(eid, text, tag, voice, mapOf("output" to SpeechOutput.MODE_SPEAKER, "steps" to 8), object : LabObserver {
      override fun onFirstAudio(latencyMs: Long, route: Map<String, Any?>) { firstMs = latencyMs; routeHolder = route }
      override fun onFinished(outcome: String, info: Map<String, Any?>) { infoHolder = info; outcomeHolder = outcome; latch.countDown() }
    })
    val finished = latch.await(TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
    if (!finished) engine(eid).stop()
    val route = routeHolder
    val outcome = if (finished) outcomeHolder else "timeout"
    val info = infoHolder
    routeHolder = emptyMap(); infoHolder = emptyMap(); outcomeHolder = "timeout"
    val routed = (route["trackRouted"] as? Map<*, *>) ?: (route["planned"] as? List<*>)?.firstOrNull() as? Map<*, *>
    val ok = finished && outcome == "done" && firstMs != null
    return base + mapOf(
      "ok" to ok,
      "error" to if (ok) null else outcome,
      "requestId" to rid,
      "firstAudioMs" to firstMs,
      "genMs" to info["genMs"],
      "rtf" to info["rtf"],
      "audioDurationMs" to (info["audioSec"] as? Double)?.let { (it * 1000).toLong() },
      "totalMs" to SystemClock.elapsedRealtime() - started,
      "routeLabel" to route["label"],
      "routedDevice" to routed,
      "routeOk" to route["ok"],
    )
  }

  // Hand-off slots between the observer callbacks and selfTestOne (one utterance at a time, so plain fields suffice).
  @Volatile private var routeHolder: Map<String, Any?> = emptyMap()
  @Volatile private var infoHolder: Map<String, Any?> = emptyMap()
  @Volatile private var outcomeHolder: String = "timeout"

  fun invalidate(engineId: String) {
    prepared.removeAll { it.startsWith("$engineId|") }
  }

  fun previewRoute(output: String): Map<String, Any?> = SpeechOutput.previewRoute(ctx, output)

  fun stop() {
    selfTestCancel = true
    engines.values.forEach { try { it.stop() } catch (_: Throwable) {} }
    SpeechOutput.endLabAny(ctx)
  }

  fun release() {
    engines.values.forEach { try { it.release() } catch (_: Throwable) {} }
    engines.clear()
    prepared.clear()
    SpeechOutput.endLabAny(ctx)
  }

  companion object {
    const val TIMEOUT_MS = 30_000L
    val ENGINE_IDS = listOf("platform-google", "platform-samsung", "mlkit", "supertonic", "kitten", "kokoro")
  }
}
