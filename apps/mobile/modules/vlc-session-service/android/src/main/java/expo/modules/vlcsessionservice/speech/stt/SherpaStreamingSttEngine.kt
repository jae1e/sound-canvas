package expo.modules.vlcsessionservice.speech.stt

import android.os.SystemClock
import com.k2fsa.sherpa.onnx.EndpointConfig
import com.k2fsa.sherpa.onnx.EndpointRule
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizerResult
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import com.k2fsa.sherpa.onnx.SileroVadModelConfig
import com.k2fsa.sherpa.onnx.Vad
import com.k2fsa.sherpa.onnx.VadModelConfig
import expo.modules.vlcsessionservice.log.DiagLog
import java.io.File
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.math.exp
import kotlin.math.sqrt

/**
 * Offline streaming zipformer(s) from sherpa-onnx behind [SttEngine] (dev reference; the Korean model's training-data
 * license is unclear, so it is not shippable).
 *
 * Design differences from the session's SpeechPipeline (which produced `final_empty`):
 *  - The recognizer stream receives EVERY frame continuously; the Silero VAD is not a gate, it only supplies speech
 *    start/end timestamps for the latency numbers. Utterance boundaries come from sherpa's endpoint rules (trailing
 *    silence measured on decoded blank frames), so a VAD false negative/positive can no longer starve or cut the stream.
 *  - After an endpoint the stream is `reset`, the standard sherpa streaming flow; on stop the tail is padded with 0.64 s
 *    (= chunk 16 * 0.04 s * 1, as the model card prescribes) and `inputFinished` flushes the last chunk.
 *  - Text is rebuilt from the token list: the result `text` of the Korean model has no spaces (the space tokens are only
 *    in `tokens`), which breaks word based parsing downstream.
 *  - Per-utterance diagnostics (frames fed, rms, peak, decode counts, raw tokens) are logged so an empty result can be
 *    told apart from silent input.
 *
 * With two languages ("auto") the same frames feed both recognizers and the winner is chosen by [SttLang.decideDual].
 * Decoding runs on this engine's own thread; [onFrame] only enqueues a copy.
 */
class SherpaStreamingSttEngine(
  private val langs: List<String>,
  private val files: Map<String, Files>,
  private val vadModel: File?,
  private val log: DiagLog,
) : SttEngine, FrameSink {
  data class Files(val encoder: File, val decoder: File, val joiner: File, val tokens: File)

  override val id = "sherpa"
  override val locale: String = if (langs.size > 1) "auto" else SttLang.localeOf(langs.first())
  override val supportsStreaming = true
  override val needsFrames = true

  private class Hyp(val lang: String, val recognizer: OnlineRecognizer, var stream: OnlineStream)

  private val queue = LinkedBlockingQueue<FloatArray>(MAX_QUEUE_FRAMES)
  @Volatile private var running = false
  private var thread: Thread? = null
  private var dropped = 0L

  override fun start(callbacks: SttCallbacks) {
    if (running) return
    running = true
    thread = Thread({ run(callbacks) }, "vlc-stt-sherpa").also { it.start() }
  }

  override fun onFrame(frame: FloatArray, nowRt: Long) {
    if (!running) return
    if (!queue.offer(frame.copyOf())) dropped++
  }

  override fun stop() {
    running = false
    // The worker drains the queue, flushes a pending final and releases everything.
  }

  override fun release() {
    running = false
    thread?.let { t -> try { t.join(4_000) } catch (_: InterruptedException) { } }
    thread = null
  }

  // ---- worker -----------------------------------------------------------------------------------------

  private fun run(cb: SttCallbacks) {
    android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO)
    cb.onState("loading", mapOf("langs" to langs))
    val loadStart = SystemClock.elapsedRealtime()
    var vad: Vad? = null
    val hyps = ArrayList<Hyp>()
    try {
      for (l in langs) {
        val f = files[l] ?: throw IllegalStateException("Model files for '$l' are not available")
        val rec = OnlineRecognizer(null, recognizerConfig(f, if (langs.size > 1) 1 else 2))
        hyps.add(Hyp(l, rec, rec.createStream("")))
      }
      if (vadModel != null && vadModel.isFile) vad = newVad(vadModel)
    } catch (e: Throwable) {
      hyps.forEach { runCatching { it.stream.release(); it.recognizer.release() } }
      running = false
      cb.onError("MODEL_LOAD_FAILED", e.toString(), false)
      cb.onState("error", mapOf("code" to "MODEL_LOAD_FAILED"))
      return
    }
    val loadMs = SystemClock.elapsedRealtime() - loadStart
    cb.onState("listening", mapOf("loadMs" to loadMs, "langs" to langs, "vad" to (vad != null), "dual" to (hyps.size > 1)))

    val u = Utterance()
    var vadSpeaking = false
    var lastPartialRt = 0L
    var lastPartialShown = ""

    fun finishUtterance(forced: Boolean) {
      emitFinal(cb, hyps, u, forced)
      for (h in hyps) {
        h.recognizer.reset(h.stream)
      }
      u.reset()
      lastPartialShown = ""
    }

    try {
      while (running || queue.isNotEmpty()) {
        val frame = queue.poll(100, TimeUnit.MILLISECONDS) ?: continue
        val nowRt = SystemClock.elapsedRealtime()

        // Statistics on the exact samples handed to the recognizers.
        var ss = 0.0
        var pk = 0f
        for (x in frame) { ss += x * x; val a = kotlin.math.abs(x); if (a > pk) pk = a }
        u.fedFrames++
        u.sumSq += ss
        u.fedSamples += frame.size
        if (pk > u.peak) u.peak = pk

        if (vad != null) {
          vad.acceptWaveform(frame)
          while (!vad.empty()) vad.pop() // only the speech/non-speech state is used
          val sp = vad.isSpeechDetected()
          if (sp && !vadSpeaking) { u.vadStartRt = nowRt - VAD_MIN_SPEECH_MS; u.vadFlips++ }
          if (!sp && vadSpeaking) u.vadEndRt = nowRt - VAD_MIN_SILENCE_MS
          vadSpeaking = sp
        }

        var endpoint = false
        for (h in hyps) {
          h.stream.acceptWaveform(frame, SAMPLE_RATE)
          while (h.recognizer.isReady(h.stream)) { h.recognizer.decode(h.stream); u.decodes++ }
          if (h.recognizer.isEndpoint(h.stream)) endpoint = true
        }

        if (nowRt - lastPartialRt >= PARTIAL_INTERVAL_MS) {
          lastPartialRt = nowRt
          val best = bestPartial(hyps)
          if (best.isNotEmpty() && best != lastPartialShown) {
            lastPartialShown = best
            if (u.firstTextRt == null) u.firstTextRt = nowRt
            u.lastTextChangeRt = nowRt
            cb.onPartial(best)
          }
        }
        if (endpoint) finishUtterance(forced = false)
      }

      // Stop requested: flush what is pending (pad the tail so the last chunk is complete).
      for (h in hyps) {
        h.stream.acceptWaveform(FloatArray(TAIL_PAD_SAMPLES), SAMPLE_RATE)
        h.stream.inputFinished()
        while (h.recognizer.isReady(h.stream)) { h.recognizer.decode(h.stream); u.decodes++ }
      }
      emitFinal(cb, hyps, u, forced = true)
    } catch (e: Throwable) {
      cb.onError("DECODE_FAILED", e.toString(), false)
    } finally {
      hyps.forEach { runCatching { it.stream.release() }; runCatching { it.recognizer.release() } }
      runCatching { vad?.release() }
      queue.clear()
      running = false
      log.log("stt_sherpa_closed", mapOf("droppedFrames" to dropped))
      cb.onState("stopped", mapOf("droppedFrames" to dropped))
    }
  }

  private fun bestPartial(hyps: List<Hyp>): String {
    if (hyps.size == 1) return textOf(hyps[0].recognizer.getResult(hyps[0].stream), hyps[0].lang)
    val scored = hyps.map {
      val r = it.recognizer.getResult(it.stream)
      Triple(textOf(r, it.lang), meanLogProb(r), it.lang)
    }.filter { it.first.isNotEmpty() }
    if (scored.isEmpty()) return ""
    // Early in an utterance the log-probabilities are noisy: prefer the better scored hypothesis once it has >= 3 tokens.
    return scored.maxByOrNull { it.second ?: -10.0 }!!.first
  }

  private fun emitFinal(cb: SttCallbacks, hyps: List<Hyp>, u: Utterance, forced: Boolean) {
    val results = hyps.map { it to it.recognizer.getResult(it.stream) }
    val hypotheses = results.map { (h, r) -> SttLang.Hypothesis(h.lang, textOf(r, h.lang), meanLogProb(r), r.tokens.size) }
    val finalRt = SystemClock.elapsedRealtime()
    val rms = if (u.fedSamples > 0) sqrt(u.sumSq / u.fedSamples) else 0.0
    val diag = mapOf(
      "fedFrames" to u.fedFrames, "fedRms" to rms, "fedPeak" to u.peak, "decodes" to u.decodes, "vadFlips" to u.vadFlips,
      "forced" to forced, "droppedFrames" to dropped,
    )
    val anyText = hypotheses.any { it.text.isNotEmpty() }
    if (!anyText) {
      // Not a user-visible result, but never silent: this is exactly what `final_empty` used to hide.
      if (u.fedFrames > IDLE_LOG_MIN_FRAMES) log.log("stt_sherpa_empty_segment", diag)
      return
    }
    val (winner, decisionDetail) = if (hypotheses.size > 1) {
      val ko = hypotheses.first { it.lang == "ko" }
      val en = hypotheses.first { it.lang == "en" }
      val d = SttLang.decideDual(ko, en)
      val w = hypotheses.firstOrNull { it.lang == d.lang } ?: hypotheses.maxByOrNull { it.text.length }!!
      w to mapOf("rule" to d.rule, "ko" to ko.toMap(), "en" to en.toMap())
    } else {
      hypotheses[0] to emptyMap<String, Any?>()
    }
    val start = u.vadStartRt ?: u.firstTextRt
    val end = u.vadEndRt?.takeIf { start == null || it >= start } ?: u.lastTextChangeRt
    cb.onFinal(
      SttFinal(
        text = winner.text,
        confidence = winner.meanLogProb?.let { exp(it).toFloat() },
        detectedLang = if (hypotheses.size > 1) winner.lang else null,
        detectedBy = if (hypotheses.size > 1) SttLang.BY_DUAL else null,
        speechStartRt = start,
        speechEndRt = end,
        details = diag + mapOf("decision" to decisionDetail, "hypotheses" to hypotheses.map { it.toMap() }, "finalRt" to finalRt),
      ),
    )
  }

  private class Utterance {
    var fedFrames = 0L
    var fedSamples = 0L
    var sumSq = 0.0
    var peak = 0f
    var decodes = 0L
    var vadFlips = 0
    var vadStartRt: Long? = null
    var vadEndRt: Long? = null
    var firstTextRt: Long? = null
    var lastTextChangeRt: Long? = null

    fun reset() {
      fedFrames = 0; fedSamples = 0; sumSq = 0.0; peak = 0f; decodes = 0; vadFlips = 0
      vadStartRt = null; vadEndRt = null; firstTextRt = null; lastTextChangeRt = null
    }
  }

  companion object {
    const val SAMPLE_RATE = 16_000
    private const val MAX_QUEUE_FRAMES = 400 // about 12.8 s of backlog before frames are dropped
    private const val PARTIAL_INTERVAL_MS = 120L
    private const val TAIL_PAD_SAMPLES = 10_240 // 0.64 s
    private const val VAD_MIN_SPEECH_MS = 250L
    private const val VAD_MIN_SILENCE_MS = 500L
    private const val IDLE_LOG_MIN_FRAMES = 160L // ignore idle resets shorter than about 5 s of audio

    private val WS = Regex("\\s+")

    /** Joins sherpa tokens (Korean space tokens only exist here) into display text. English output is lower-cased. */
    fun textOf(r: OnlineRecognizerResult, lang: String): String {
      val raw = if (r.tokens.isNotEmpty()) r.tokens.joinToString("") else r.text
      val t = raw.replace('▁', ' ').replace(WS, " ").trim()
      return if (lang == "en") t.lowercase() else t
    }

    fun meanLogProb(r: OnlineRecognizerResult): Double? {
      val p = r.ysProbs
      return if (p.isEmpty()) null else p.average()
    }

    private fun recognizerConfig(f: Files, threads: Int) = OnlineRecognizerConfig(
      featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
      modelConfig = OnlineModelConfig(
        transducer = OnlineTransducerModelConfig(
          encoder = f.encoder.absolutePath, decoder = f.decoder.absolutePath, joiner = f.joiner.absolutePath,
        ),
        tokens = f.tokens.absolutePath,
        numThreads = threads,
        provider = "cpu",
        debug = false,
      ),
      enableEndpoint = true,
      endpointConfig = EndpointConfig(
        rule1 = EndpointRule(false, 2.4f, 0f),  // no text yet: reset after 2.4 s of silence
        rule2 = EndpointRule(true, 0.8f, 0f),   // text decoded and 0.8 s of trailing silence: final
        rule3 = EndpointRule(false, 0f, 20f),   // hard cap at 20 s per utterance
      ),
      decodingMethod = "greedy_search",
    )

    private fun newVad(model: File) = Vad(
      null,
      VadModelConfig(
        sileroVadModelConfig = SileroVadModelConfig(
          model = model.absolutePath, threshold = 0.5f, minSilenceDuration = VAD_MIN_SILENCE_MS / 1000f,
          minSpeechDuration = VAD_MIN_SPEECH_MS / 1000f, windowSize = 512, maxSpeechDuration = 60f,
        ),
        sampleRate = SAMPLE_RATE, numThreads = 1, provider = "cpu", debug = false,
      ),
    )
  }
}
