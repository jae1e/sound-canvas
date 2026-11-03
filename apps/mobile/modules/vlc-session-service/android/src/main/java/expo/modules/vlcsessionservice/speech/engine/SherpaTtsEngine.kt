package expo.modules.vlcsessionservice.speech.engine

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import com.k2fsa.sherpa.onnx.GenerationConfig
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsSupertonicModelConfig
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger

/**
 * sherpa-onnx OfflineTts (Supertonic 3 or Kokoro) generating on a background thread and streaming float PCM
 * into our own AudioTrack as the generator's callback delivers chunks. Everything runs in our process, so the
 * output device can be chosen with AudioTrack.setPreferredDevice.
 */
class SherpaTtsEngine(
  private val context: Context,
  override val id: String,
  override val label: String,
  private val kind: Kind,
) : SpeechEngine {
  enum class Kind(val setId: String) { SUPERTONIC("tts-supertonic"), KOKORO("tts-kokoro-en") }

  override val runsInProcess = true

  private val models = ModelManager(context)
  private var tts: OfflineTts? = null
  private val generation = AtomicInteger()
  @Volatile private var activeTrack: AudioTrack? = null
  @Volatile private var stopFlag = false

  override fun supports(locale: Locale) = when (kind) {
    Kind.SUPERTONIC -> locale.language == "ko" || locale.language == "en"
    Kind.KOKORO -> locale.language == "en"
  }

  override fun prepare(locale: Locale, progress: (Map<String, Any?>) -> Unit): Map<String, Any?> = synchronized(this) {
    val set = ModelCatalog.find(kind.setId)!!
    if (!supports(locale)) return mapOf("ok" to false, "error" to "$label does not support ${locale.toLanguageTag()}")
    if (!models.isReady(set)) {
      return mapOf("ok" to false, "error" to "Model files missing: download '${set.id}' (${set.totalBytes / 1_000_000} MB) first", "needsDownload" to set.id)
    }
    var loadMs = 0L
    if (tts == null) {
      val t0 = SystemClock.elapsedRealtime()
      tts = try {
        OfflineTts(config = buildConfig())
      } catch (e: Throwable) {
        return mapOf("ok" to false, "error" to "Load failed: $e")
      }
      loadMs = SystemClock.elapsedRealtime() - t0
    }
    val t = tts!!
    mapOf("ok" to true, "loadMs" to loadMs, "sampleRate" to t.sampleRate(), "numSpeakers" to t.numSpeakers(), "modelLang" to t.lang())
  }

  private fun buildConfig(): OfflineTtsConfig {
    val dir = { n: String -> models.fileFor(kind.setId, n).absolutePath }
    val model = when (kind) {
      Kind.SUPERTONIC -> OfflineTtsModelConfig(
        supertonic = OfflineTtsSupertonicModelConfig(
          durationPredictor = dir("duration_predictor.int8.onnx"),
          textEncoder = dir("text_encoder.int8.onnx"),
          vectorEstimator = dir("vector_estimator.int8.onnx"),
          vocoder = dir("vocoder.int8.onnx"),
          ttsJson = dir("tts.json"),
          unicodeIndexer = dir("unicode_indexer.bin"),
          voiceStyle = dir("voice.bin"),
        ),
        numThreads = 4,
        debug = false,
      )
      Kind.KOKORO -> OfflineTtsModelConfig(
        kokoro = OfflineTtsKokoroModelConfig(
          model = dir("model.int8.onnx"),
          voices = dir("voices.bin"),
          tokens = dir("tokens.txt"),
          dataDir = dir("espeak-ng-data"),
          lexicon = dir("lexicon-us-en.txt"),
          lang = "en-us",
        ),
        numThreads = 4,
        debug = false,
      )
    }
    return OfflineTtsConfig(model = model)
  }

  override fun voices(locale: Locale): List<Map<String, Any?>> = when (kind) {
    Kind.KOKORO -> KOKORO_EN_VOICES.mapIndexed { i, n -> mapOf("name" to i.toString(), "label" to "sid $i $n") }
    // Voice names for Supertonic's voice.bin are not documented in sherpa-onnx; the upstream presets are M1-M5, F1-F5.
    Kind.SUPERTONIC -> (0 until (tts?.numSpeakers() ?: 10)).map { mapOf("name" to it.toString(), "label" to "sid $it") }
  }

  override fun speak(request: SpeakRequest, callback: SpeakCallback) {
    val t = tts
    if (t == null) {
      callback.onFinished("error:not_prepared")
      return
    }
    stop()
    val gen = generation.incrementAndGet()
    stopFlag = false
    Thread({ run(t, gen, request, callback) }, "vlc-tts-${kind.name.lowercase()}").start()
  }

  private fun run(t: OfflineTts, gen: Int, req: SpeakRequest, cb: SpeakCallback) {
    val method = SpeechOutput.beginSpeech(context, inProcess = true)
    val sr = t.sampleRate()
    val minBuf = AudioTrack.getMinBufferSize(sr, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
    // About 30 s of audio so the generator callback rarely blocks on playback (keeps generation time honest).
    val bufBytes = maxOf(minBuf, sr * 4 * 30)
    val track = AudioTrack.Builder()
      .setAudioAttributes(SpeechOutput.attributes(AudioAttributes.USAGE_ASSISTANT))
      .setAudioFormat(
        AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_FLOAT).setSampleRate(sr).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(),
      )
      .setBufferSizeInBytes(bufBytes)
      .setTransferMode(AudioTrack.MODE_STREAM)
      .build()
    activeTrack = track
    val preferredApplied = SpeechOutput.applyToTrack(context, track)
    var frames = 0L
    var firstAudioRt = 0L
    var firstChunkMs = -1L
    var writeNanos = 0L
    val genStart = SystemClock.elapsedRealtime()
    var outcome = "done"
    try {
      track.play()
      val sid = req.voice?.toIntOrNull() ?: if (kind == Kind.KOKORO) 3 else 0
      val gc = GenerationConfig(sid = sid, speed = 1.0f, numSteps = 8, extra = mapOf("lang" to req.locale.language))
      t.generateWithConfigAndCallback(req.text, gc) { samples: FloatArray ->
        if (stopFlag || gen != generation.get()) return@generateWithConfigAndCallback 0
        val w0 = System.nanoTime()
        val n = track.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
        writeNanos += System.nanoTime() - w0
        if (n > 0) frames += n
        if (firstAudioRt == 0L && n > 0) {
          firstAudioRt = SystemClock.elapsedRealtime()
          firstChunkMs = firstAudioRt - genStart
          cb.onFirstAudio(firstAudioRt, track.routedDevice, mapOf("preferredDeviceApplied" to preferredApplied, "method" to method))
        }
        1
      }
      val genMs = SystemClock.elapsedRealtime() - genStart - writeNanos / 1_000_000
      val audioSec = frames.toDouble() / sr
      // Let the buffered audio play out (stop() on a stream track drains), then wait for the head to pass the end.
      if (outcomeAllowsDrain(gen)) {
        track.stop()
        val deadline = SystemClock.elapsedRealtime() + (audioSec * 1000).toLong() + 3000
        while (track.playbackHeadPosition < frames && SystemClock.elapsedRealtime() < deadline && !stopFlag && gen == generation.get()) Thread.sleep(20)
      }
      if (stopFlag || gen != generation.get()) outcome = "stopped"
      cb.onFinished(
        outcome,
        mapOf(
          "genMs" to genMs,
          "audioSec" to audioSec,
          "rtf" to if (audioSec > 0) (genMs / 1000.0) / audioSec else null,
          "firstChunkMs" to firstChunkMs,
          "sampleRate" to sr,
          "method" to method,
        ),
      )
    } catch (e: Throwable) {
      cb.onFinished("error:$e")
    } finally {
      try { track.release() } catch (_: Throwable) {}
      if (activeTrack === track) activeTrack = null
    }
  }

  private fun outcomeAllowsDrain(gen: Int) = !stopFlag && gen == generation.get()

  override fun stop() {
    stopFlag = true
    generation.incrementAndGet()
    activeTrack?.let { try { it.pause(); it.flush() } catch (_: Throwable) {} }
  }

  override fun release() {
    stop()
    synchronized(this) {
      tts?.release()
      tts = null
    }
  }

  companion object {
    // sherpa-onnx docs, kokoro-multi-lang-v1_0: speaker ids 0-27 are en-US / en-GB voices.
    val KOKORO_EN_VOICES = listOf(
      "af_alloy", "af_aoede", "af_bella", "af_heart", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah",
      "af_sky", "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", "am_santa",
      "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", "bm_george", "bm_lewis",
    )
  }
}
