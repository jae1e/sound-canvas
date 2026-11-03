package expo.modules.vlcsessionservice.speech

import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import com.k2fsa.sherpa.onnx.SileroVadModelConfig
import com.k2fsa.sherpa.onnx.Vad
import com.k2fsa.sherpa.onnx.VadModelConfig
import expo.modules.vlcsessionservice.log.DiagLog
import java.io.File

/**
 * Silero VAD gates a sherpa-onnx streaming transducer:
 *  - every 32 ms frame goes to the VAD;
 *  - a rolling pre-roll buffer is kept while idle;
 *  - when the VAD reports speech, a recognizer stream is created, primed with the pre-roll and fed live;
 *  - when the VAD reports the end of speech (after [MIN_SILENCE_S] of silence) the stream is finished with
 *    tail padding and the final text is emitted. No decoding happens during silence (saves battery).
 * Runs entirely on the capture thread (never the main thread).
 *
 * Latency definition: `endpointLatencyMs` = time from the VAD's end-of-speech decision to final text.
 * The VAD decision itself trails the real end of speech by `trailingSilenceMs` (MIN_SILENCE_S).
 */
class SpeechPipeline(
  files: Files,
  private val bargeIn: () -> Boolean,
  private val ttsActive: (graceMs: Long) -> Boolean,
  private val stopTts: () -> Unit,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  data class Files(val vad: File, val encoder: File, val decoder: File, val joiner: File, val tokens: File)

  private val vad: Vad
  private val recognizer: OnlineRecognizer

  private var stream: OnlineStream? = null
  private var inUtterance = false
  private var suppressed = false
  private var ttsSeen = false
  private var duringTts = false
  private var utteranceStartRt = 0L
  private var utteranceStartEpoch = 0L
  private var lastPartial = ""
  private var lastPartialRt = 0L
  private var seq = 0

  private val preroll = ArrayDeque<FloatArray>()

  init {
    vad = Vad(
      null,
      VadModelConfig(
        sileroVadModelConfig = SileroVadModelConfig(
          model = files.vad.absolutePath,
          threshold = 0.5f,
          minSilenceDuration = MIN_SILENCE_S,
          minSpeechDuration = 0.25f,
          windowSize = 512,
          maxSpeechDuration = 60f,
        ),
        sampleRate = 16_000,
        numThreads = 1,
        provider = "cpu",
        debug = false,
      ),
    )
    recognizer = OnlineRecognizer(
      null,
      OnlineRecognizerConfig(
        featConfig = FeatureConfig(sampleRate = 16_000, featureDim = 80),
        modelConfig = OnlineModelConfig(
          transducer = OnlineTransducerModelConfig(
            encoder = files.encoder.absolutePath,
            decoder = files.decoder.absolutePath,
            joiner = files.joiner.absolutePath,
          ),
          tokens = files.tokens.absolutePath,
          numThreads = 2,
          provider = "cpu",
          debug = false,
        ),
        enableEndpoint = false, // utterance boundaries come from the VAD
        decodingMethod = "greedy_search",
      ),
    )
    log.log(
      "echo_policy",
      mapOf(
        "default" to "half-duplex: finals suppressed while TTS speaks (+${ECHO_GRACE_MS} ms tail) unless bargeIn",
        "bargeIn" to bargeIn(),
        "captureSource" to "VOICE_COMMUNICATION (platform AEC/NS attached when available)",
      ),
    )
  }

  fun onFrame(frame: FloatArray, nowRt: Long) {
    vad.acceptWaveform(frame)
    while (!vad.empty()) vad.pop() // we only use the speech/non-speech state, not the segments
    val speaking = vad.isSpeechDetected()

    if (!inUtterance) {
      preroll.addLast(frame.copyOf())
      while (preroll.size > PREROLL_FRAMES) preroll.removeFirst()
      if (speaking) startUtterance(nowRt)
      return
    }

    if (ttsActive(0)) ttsSeen = true
    if (!suppressed) {
      stream?.acceptWaveform(frame, 16_000)
      decodeReady()
      maybePartial(nowRt)
    }
    val tooLong = nowRt - utteranceStartRt > MAX_UTTERANCE_MS
    if (!speaking || tooLong) endUtterance(nowRt, forced = tooLong)
  }

  private fun startUtterance(nowRt: Long) {
    inUtterance = true
    seq++
    val prerollMs = preroll.size * 32L
    utteranceStartRt = nowRt - prerollMs
    utteranceStartEpoch = System.currentTimeMillis() - prerollMs
    ttsSeen = false
    lastPartial = ""
    lastPartialRt = 0
    val active = ttsActive(ECHO_GRACE_MS)
    duringTts = active
    suppressed = active && !bargeIn()
    log.log("speech_start", mapOf("seq" to seq, "duringTts" to active, "suppressed" to suppressed, "prerollMs" to prerollMs))
    emit("speechStart", mapOf("seq" to seq, "atEpochMs" to utteranceStartEpoch, "duringTts" to active, "suppressed" to suppressed))
    if (active && bargeIn()) {
      log.log("barge_in", mapOf("seq" to seq))
      stopTts()
    }
    if (!suppressed) {
      val s = recognizer.createStream("")
      stream = s
      for (f in preroll) s.acceptWaveform(f, 16_000)
      decodeReady()
    }
    preroll.clear()
  }

  private fun decodeReady() {
    val s = stream ?: return
    while (recognizer.isReady(s)) recognizer.decode(s)
  }

  private fun maybePartial(nowRt: Long) {
    val s = stream ?: return
    if (nowRt - lastPartialRt < PARTIAL_MIN_INTERVAL_MS) return
    val text = clean(recognizer.getResult(s).text)
    lastPartialRt = nowRt
    if (text.isNotEmpty() && text != lastPartial) {
      lastPartial = text
      emit("partialTranscript", mapOf("seq" to seq, "text" to text, "atEpochMs" to System.currentTimeMillis()))
    }
  }

  private fun endUtterance(vadEndRt: Long, forced: Boolean) {
    val vadEndEpoch = System.currentTimeMillis()
    inUtterance = false
    val s = stream
    stream = null
    val suppressNow = suppressed || (ttsSeen && !bargeIn())
    var text = ""
    if (s != null) {
      try {
        s.acceptWaveform(FloatArray(TAIL_PAD_SAMPLES), 16_000) // flush the encoder's right context
        s.inputFinished()
        decodeReady2(s)
        text = clean(recognizer.getResult(s).text)
      } finally {
        s.release()
      }
    }
    val finalRt = android.os.SystemClock.elapsedRealtime()
    val latency = finalRt - vadEndRt
    val trailingMs = if (forced) 0L else (MIN_SILENCE_S * 1000).toLong()
    val endEpoch = vadEndEpoch - trailingMs
    if (suppressNow) {
      log.log("echo_suppressed", mapOf("seq" to seq, "text" to text, "bargeIn" to bargeIn(), "durationMs" to (endEpoch - utteranceStartEpoch)))
      emit("echoSuppressed", mapOf("seq" to seq, "text" to text))
      return
    }
    if (text.isEmpty()) {
      log.log("final_empty", mapOf("seq" to seq, "durationMs" to (endEpoch - utteranceStartEpoch), "endpointLatencyMs" to latency))
      return
    }
    val payload = mapOf(
      "seq" to seq,
      "text" to text,
      "startEpochMs" to utteranceStartEpoch,
      "endEpochMs" to endEpoch,
      "vadEndDetectedEpochMs" to vadEndEpoch,
      "finalEpochMs" to System.currentTimeMillis(),
      "endpointLatencyMs" to latency,
      "trailingSilenceMs" to trailingMs,
      "duringTts" to duringTts,
      "forcedEnd" to forced,
    )
    log.log("final_transcript", payload)
    emit("finalTranscript", payload)
  }

  private fun decodeReady2(s: OnlineStream) {
    while (recognizer.isReady(s)) recognizer.decode(s)
  }

  private fun clean(raw: String) = raw.replace('▁', ' ').trim()

  fun release() {
    stream?.release()
    stream = null
    vad.release()
    recognizer.release()
  }

  companion object {
    const val MIN_SILENCE_S = 0.5f
    private const val PREROLL_FRAMES = 20 // 640 ms
    private const val TAIL_PAD_SAMPLES = 4800 // 0.3 s
    private const val PARTIAL_MIN_INTERVAL_MS = 150L
    private const val MAX_UTTERANCE_MS = 30_000L
    private const val ECHO_GRACE_MS = 600L
  }
}
