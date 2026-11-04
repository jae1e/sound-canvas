package expo.modules.vlcsessionservice.speech.engine

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import com.k2fsa.sherpa.onnx.GenerationConfig
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKittenModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsSupertonicModelConfig
import expo.modules.vlcsessionservice.audio.SpeechOutput
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.locks.ReentrantLock

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
  /** [setId] holds the model; [extraSets] are shared files (the English lexicon) that must also be present. */
  enum class Kind(val setId: String, val extraSets: List<String> = emptyList()) {
    SUPERTONIC("tts-supertonic"),
    KOKORO("tts-kokoro-en", listOf("tts-lexicon-en")),
    KITTEN("tts-kitten-en", listOf("tts-lexicon-en")),
  }

  override val runsInProcess = true

  private val models = ModelManager(context)
  private var tts: OfflineTts? = null
  private val log = DiagLog.get(context)
  private val generation = AtomicInteger()
  /** The native generator is not documented as re-entrant: a new utterance waits until the stopped one has left it. */
  private val genLock = ReentrantLock()
  @Volatile private var activeTrack: AudioTrack? = null
  @Volatile private var stopFlag = false

  override fun supports(locale: Locale) = when (kind) {
    Kind.SUPERTONIC -> locale.language == "ko" || locale.language == "en"
    Kind.KOKORO, Kind.KITTEN -> locale.language == "en"
  }

  override fun prepare(locale: Locale, progress: (Map<String, Any?>) -> Unit): Map<String, Any?> = synchronized(this) {
    val set = ModelCatalog.find(kind.setId)!!
    if (!supports(locale)) return mapOf("ok" to false, "error" to "$label does not support ${locale.toLanguageTag()}")
    val missing = (listOf(kind.setId) + kind.extraSets).mapNotNull(ModelCatalog::find).filter { !models.isReady(it) }
    if (missing.isNotEmpty()) {
      val ids = missing.joinToString { it.id }
      return mapOf("ok" to false, "error" to "Model files missing: download $ids (${missing.sumOf { it.totalBytes } / 1_000_000} MB) first", "needsDownload" to ids)
    }
    var loadMs = 0L
    if (tts == null) {
      val t0 = SystemClock.elapsedRealtime()
      // Written before the native load: if the process dies inside sherpa-onnx (its config validation calls exit()),
      // the log shows this line without a following tts_lab_prepare.
      log.log("tts_lab_load_start", mapOf("engine" to id, "set" to set.id))
      tts = try {
        OfflineTts(config = buildConfig())
      } catch (e: Throwable) { // includes UnsatisfiedLinkError / NoClassDefFoundError / native init errors
        log.log("tts_lab_load_failed", mapOf("engine" to id, "error" to e.chainText()))
        return mapOf("ok" to false, "error" to "Load failed: ${e.chainText()}")
      }
      loadMs = SystemClock.elapsedRealtime() - t0
    }
    val t = tts!!
    mapOf("ok" to true, "loadMs" to loadMs, "sampleRate" to t.sampleRate(), "numSpeakers" to t.numSpeakers(), "modelLang" to t.lang())
  }

  private fun lexicon() = models.fileFor("tts-lexicon-en", "lexicon-en-us.txt").absolutePath

  private var lexiconWords: Set<String>? = null

  /** The native API exposes no OOV list, so we check words against the same lexicon file ourselves and log the misses. */
  private fun logOov(text: String, requestId: String) {
    if (kind == Kind.SUPERTONIC) return
    try {
      val words = lexiconWords ?: java.io.File(lexicon()).useLines { lines ->
        lines.filter { it.isNotEmpty() && !it.startsWith("#") }.map { it.substringBefore(" ||").trim().lowercase() }.toHashSet()
      }.also { lexiconWords = it }
      val oov = Regex("[A-Za-z']+").findAll(text).map { it.value.lowercase() }.filter { it !in words }.distinct().toList()
      log.log("tts_lab_oov", mapOf("engine" to id, "requestId" to requestId, "oov" to oov))
    } catch (e: Throwable) {
      log.log("tts_lab_oov", mapOf("engine" to id, "error" to e.chainText()))
    }
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
          // espeak-ng is gone in sherpa-onnx >= 2.0 (dataDir/lang are ignored): phonemes come from the shared lexicon.
          lexicon = lexicon(),
        ),
        numThreads = 4,
        debug = false,
      )
      Kind.KITTEN -> OfflineTtsModelConfig(
        kitten = OfflineTtsKittenModelConfig(
          model = dir("model.int8.onnx"),
          voices = dir("voices.bin"),
          tokens = dir("tokens.txt"),
          lexicon = lexicon(),
        ),
        numThreads = 4,
        debug = false,
      )
    }
    return OfflineTtsConfig(model = model)
  }

  override fun voices(locale: Locale): List<Map<String, Any?>> = when (kind) {
    Kind.KOKORO -> KOKORO_EN_VOICES.mapIndexed { i, n -> mapOf("name" to i.toString(), "label" to "sid $i $n") }
    // Upstream Supertonic presets are F1-F5 then M1-M5; sherpa-onnx voice.bin order assumed to match (sid 0-4 F, 5-9 M).
    Kind.KITTEN -> (0 until (tts?.numSpeakers() ?: 8)).map { mapOf("name" to it.toString(), "label" to "sid $it") }
    Kind.SUPERTONIC -> SUPERTONIC_VOICES.mapIndexed { i, n -> mapOf("name" to i.toString(), "label" to "$n (sid $i)") }
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
    var track: AudioTrack? = null
    var outcome = "done"
    var info: Map<String, Any?> = emptyMap()
    genLock.lock()
    try {
      if (stopFlag || gen != generation.get()) {
        cb.onFinished("stopped")
        return
      }
      val method = SpeechOutput.beginSpeech(context, inProcess = true)
      val sr = t.sampleRate()
      val minBuf = AudioTrack.getMinBufferSize(sr, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
      // About 30 s of audio so the generator callback rarely blocks on playback (keeps generation time honest).
      val bufBytes = maxOf(minBuf, sr * 4 * 30)
      val tr = AudioTrack.Builder()
        .setAudioAttributes(SpeechOutput.attributes(SpeechOutput.trackUsage()))
        .setAudioFormat(
          AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_FLOAT).setSampleRate(sr).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(),
        )
        .setBufferSizeInBytes(bufBytes)
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
      track = tr
      activeTrack = tr
      val preferredApplied = SpeechOutput.applyToTrack(context, tr)
      var frames = 0L
      var firstAudioRt = 0L
      var firstChunkMs = -1L
      var writeNanos = 0L
      val genStart = SystemClock.elapsedRealtime()
      tr.play()
      logOov(req.text, req.id)
      val sid = req.voice?.toIntOrNull() ?: if (kind == Kind.KOKORO) 3 else 0
      val steps = (req.options["steps"] as? Number)?.toInt()?.coerceIn(1, 64) ?: 8
      val gc = GenerationConfig(sid = sid, speed = 1.0f, numSteps = steps, extra = mapOf("lang" to req.locale.language))
      var callbackError: Throwable? = null
      // A cue that became stale while its audio was being generated is dropped instead of played late.
      val staleAt = (req.options["staleAtEpochMs"] as? Number)?.toLong() ?: 0L
      var stale = false
      // Shared by the streaming callback and the returned-audio fallback.
      val writeSamples = { samples: FloatArray ->
        val w0 = System.nanoTime()
        val n = tr.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
        writeNanos += System.nanoTime() - w0
        if (n > 0) frames += n
        if (firstAudioRt == 0L && n > 0) {
          firstAudioRt = SystemClock.elapsedRealtime()
          firstChunkMs = firstAudioRt - genStart
          cb.onFirstAudio(firstAudioRt, tr.routedDevice, mapOf("preferredDeviceApplied" to preferredApplied, "method" to method))
        }
      }
      val audioCallback = SherpaAudioCallback { samples ->
        try {
          if (stopFlag || gen != generation.get()) return@SherpaAudioCallback 0
          if (firstAudioRt == 0L && staleAt > 0 && System.currentTimeMillis() > staleAt) {
            stale = true
            return@SherpaAudioCallback 0
          }
          writeSamples(samples)
          1
        } catch (e: Throwable) {
          callbackError = e // never let a Kotlin exception unwind into the JNI frame
          0
        }
      }
      val generated = t.generateWithConfigAndCallback(req.text, gc, audioCallback)
      val callbackFrames = frames
      callbackError?.let { throw it }
      // Some models (Kitten) return the whole utterance without ever invoking the callback: play the returned samples.
      if (!stale && staleAt > 0 && callbackFrames == 0L && System.currentTimeMillis() > staleAt) stale = true
      if (!stale && callbackFrames == 0L && generated.samples.isNotEmpty() && !stopFlag && gen == generation.get()) {
        writeSamples(generated.samples)
      }
      val genMs = SystemClock.elapsedRealtime() - genStart - writeNanos / 1_000_000
      val audioSec = frames.toDouble() / sr
      // Let the buffered audio play out (stop() on a stream track drains), then wait for the head to pass the end.
      if (outcomeAllowsDrain(gen)) {
        tr.stop()
        val deadline = SystemClock.elapsedRealtime() + (audioSec * 1000).toLong() + 3000
        while (tr.playbackHeadPosition < frames && SystemClock.elapsedRealtime() < deadline && !stopFlag && gen == generation.get()) Thread.sleep(20)
      }
      if (stopFlag || gen != generation.get()) outcome = "stopped"
      if (stale && outcome == "done") outcome = "dropped_stale"
      info = mapOf(
        "genMs" to genMs,
        "audioSec" to audioSec,
        "rtf" to if (audioSec > 0) (genMs / 1000.0) / audioSec else null,
        "firstChunkMs" to firstChunkMs,
        "sampleRate" to sr,
        "callbackFrames" to callbackFrames,
        "returnedFrames" to generated.samples.size,
        "method" to method,
        "sid" to sid,
        "steps" to if (kind == Kind.SUPERTONIC) steps else null,
      )
    } catch (e: Throwable) {
      log.log("tts_lab_generate_failed", mapOf("engine" to id, "error" to e.chainText()))
      outcome = "error:${e.chainText()}"
    } finally {
      try { track?.release() } catch (_: Throwable) {}
      if (activeTrack === track) activeTrack = null
      genLock.unlock()
    }
    cb.onFinished(outcome, info)
  }

  /**
   * Synthesises [text] to float PCM without playing anything (pacing clip cache). Takes [genLock], so it waits for a
   * running live utterance; a later [speak] or [stop] bumps the generation and aborts this call (returns null), so live
   * speech always wins. Returns (samples, sampleRate), or null on abort/failure. Blocking: call off the main thread.
   */
  fun synthesizeToPcm(text: String, locale: Locale, sid: Int, steps: Int): Pair<FloatArray, Int>? {
    val t = tts ?: return null
    genLock.lock()
    try {
      if (tts == null) return null
      val gen = generation.get() // a live speak()/stop() after this point changes it and aborts us
      val chunks = ArrayList<FloatArray>()
      var callbackError: Throwable? = null
      val gc = GenerationConfig(sid = sid, speed = 1.0f, numSteps = steps.coerceIn(1, 64), extra = mapOf("lang" to locale.language))
      val cb = SherpaAudioCallback { samples ->
        try {
          if (gen != generation.get()) return@SherpaAudioCallback 0
          chunks.add(samples.copyOf())
          1
        } catch (e: Throwable) {
          callbackError = e
          0
        }
      }
      val generated = t.generateWithConfigAndCallback(text, gc, cb)
      callbackError?.let { throw it }
      if (gen != generation.get()) return null
      val total = chunks.sumOf { it.size }
      val out = if (total > 0) {
        FloatArray(total).also { var o = 0; for (c in chunks) { System.arraycopy(c, 0, it, o, c.size); o += c.size } }
      } else generated.samples
      return if (out.isEmpty()) null else Pair(out, t.sampleRate())
    } catch (e: Throwable) {
      log.log("tts_synth_pcm_failed", mapOf("engine" to id, "error" to e.chainText()))
      return null
    } finally {
      genLock.unlock()
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
    genLock.lock() // wait for a stopped generation to leave native code before freeing the model
    try {
      synchronized(this) {
        tts?.release()
        tts = null
      }
    } finally {
      genLock.unlock()
    }
  }

  companion object {
    // sherpa-onnx docs, kokoro-multi-lang-v1_0: speaker ids 0-27 are en-US / en-GB voices.
    val SUPERTONIC_VOICES = listOf("F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5")
    val KOKORO_EN_VOICES = listOf(
      "af_alloy", "af_aoede", "af_bella", "af_heart", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah",
      "af_sky", "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", "am_santa",
      "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", "bm_george", "bm_lewis",
    )
  }
}

/**
 * The generator callback handed to sherpa-onnx. The JNI layer looks up `invoke([F)Ljava/lang/Integer;` on the object by
 * name and signature, so this must stay a real class whose method survives R8: a Kotlin lambda gets rewritten (invokedynamic /
 * merged / signature-changed) and the process aborts with NoSuchMethodError. consumer-rules.pro keeps this class and the
 * `Function1.invoke(float[])` signature.
 */
class SherpaAudioCallback(private val onSamples: (FloatArray) -> Int) : (FloatArray) -> Int {
  /** Returns 1 to continue generating, 0 to stop. */
  override fun invoke(samples: FloatArray): Int = onSamples(samples)
}
