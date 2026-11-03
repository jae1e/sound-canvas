package expo.modules.vlcsessionservice.speech.engine

import android.content.Context
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.texttospeech.SpeechSynthesis
import com.google.mlkit.genai.texttospeech.SpeechSynthesizer
import com.google.mlkit.genai.texttospeech.SpeechSynthesizerOptions
import com.google.mlkit.genai.texttospeech.SpeechSynthesizerRequest
import com.google.mlkit.genai.texttospeech.SpeechSynthesizerResponse
import com.google.mlkit.genai.texttospeech.VoiceInfo
import expo.modules.vlcsessionservice.audio.SpeechOutput
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.Locale

/**
 * ML Kit GenAI Text-to-Speech (1.0.0-alpha1). Decompiling the SDK shows it wraps `android.speech.tts.TextToSpeech`
 * (Google Speech Services): `synthesize()` calls `setAudioAttributes(request.audioAttributes)` + `speak()` and surfaces
 * `onAudioAvailable` byte chunks as `AudioAvailable`. So the SDK normally PLAYS the audio itself in the Speech
 * Services process and the chunks are a copy. With [ownPlayback] on we also write the chunks to our own AudioTrack
 * (the PCM format is not documented; [assumedSampleRate] is a guess, adjustable from the UI) - expect double audio
 * if the SDK also plays.
 */
class MlKitTtsEngine(private val context: Context) : SpeechEngine {
  override val id = "mlkit"
  override val label = "ML Kit GenAI TTS (alpha)"
  override val runsInProcess = false // the SDK plays inside Google Speech Services; our AudioTrack is optional

  @Volatile var ownPlayback = false
  @Volatile var assumedSampleRate = 24_000

  private var client: SpeechSynthesizer? = null
  private var voiceCache: Map<String, VoiceInfo> = emptyMap()
  private val scope = CoroutineScope(Dispatchers.IO)
  @Volatile private var job: Job? = null
  @Volatile private var track: AudioTrack? = null
  @Volatile var lastDownload: Map<String, Any?> = emptyMap()
    private set

  override fun supports(locale: Locale) = true

  private fun client(locale: Locale): SpeechSynthesizer =
    client ?: SpeechSynthesis.getClient(SpeechSynthesizerOptions.builder(locale).build()).also { client = it }

  private fun statusName(s: Int) = when (s) {
    FeatureStatus.UNAVAILABLE -> "UNAVAILABLE"
    FeatureStatus.DOWNLOADABLE -> "DOWNLOADABLE"
    FeatureStatus.DOWNLOADING -> "DOWNLOADING"
    FeatureStatus.AVAILABLE -> "AVAILABLE"
    else -> "status_$s"
  }

  override fun prepare(locale: Locale, progress: (Map<String, Any?>) -> Unit): Map<String, Any?> {
    return try {
      val c = client(locale)
      val voices = runBlocking { c.getSupportedVoices(locale) }
      voiceCache = voices.associateBy { it.name }
      val statuses = voices.map { v -> v.name to runBlocking { c.checkStatus(v) } }
      val avail = statuses.count { it.second == FeatureStatus.AVAILABLE }
      mapOf(
        "ok" to (avail > 0),
        "error" to when {
          voices.isEmpty() -> "No voices for ${locale.toLanguageTag()}: unsupported device, or Speech Services missing/outdated"
          avail == 0 -> "No voice is downloaded yet for ${locale.toLanguageTag()}: download one below"
          else -> null
        },
        "voiceCount" to voices.size,
        "statuses" to statuses.associate { it.first to statusName(it.second) },
      )
    } catch (e: Throwable) {
      mapOf("ok" to false, "error" to "ML Kit failed: $e")
    }
  }

  override fun voices(locale: Locale): List<Map<String, Any?>> {
    val c = client ?: return emptyList()
    return try {
      val vs = runBlocking { c.getSupportedVoices(locale) }
      voiceCache = voiceCache + vs.associateBy { it.name }
      vs.map { v ->
        val st = statusName(runBlocking { c.checkStatus(v) })
        mapOf("name" to v.name, "label" to "${v.name} (${v.gender}) [$st]", "status" to st)
      }
    } catch (e: Throwable) {
      emptyList()
    }
  }

  /** Blocking download of one voice, emitting progress through [progress]. Returns the final status map. */
  fun downloadVoice(voiceName: String, progress: (Map<String, Any?>) -> Unit): Map<String, Any?> {
    val c = client ?: return mapOf("ok" to false, "error" to "Not prepared")
    val voice = voiceCache[voiceName] ?: return mapOf("ok" to false, "error" to "Unknown voice $voiceName")
    return try {
      var total = 0L
      var result: Map<String, Any?> = mapOf("ok" to false, "error" to "download flow ended without completion")
      runBlocking {
        c.download(voice).collect { st ->
          when (st) {
            is DownloadStatus.DownloadStarted -> { total = st.bytesToDownload; progress(mapOf("phase" to "started", "totalBytes" to total, "bytes" to 0L)) }
            is DownloadStatus.DownloadProgress -> progress(mapOf("phase" to "progress", "totalBytes" to total, "bytes" to st.totalBytesDownloaded))
            is DownloadStatus.DownloadCompleted -> result = mapOf("ok" to true)
            is DownloadStatus.DownloadFailed -> result = mapOf("ok" to false, "error" to "download failed: ${st.e}")
            else -> {}
          }
        }
      }
      result
    } catch (e: Throwable) {
      mapOf("ok" to false, "error" to "download error: $e")
    }
  }

  override fun speak(request: SpeakRequest, callback: SpeakCallback) {
    val c = client
    val voice = request.voice?.let { voiceCache[it] } ?: voiceCache.values.firstOrNull { it.locale.language == request.locale.language }
    if (c == null || voice == null) {
      callback.onFinished("error:not_prepared_or_no_voice")
      return
    }
    stop()
    val usage = SpeechOutput.usageFor(inProcess = false, communicationMode = false)
    val method = SpeechOutput.beginSpeech(context, inProcess = false)
    val req = SpeechSynthesizerRequest(
      SpeechSynthesizerRequest.Input.Text(request.text, voice),
      SpeechOutput.attributes(usage),
      SpeechSynthesizerRequest.QueueMode.QUEUE_FLUSH,
    )
    var first = false
    var chunks = 0
    var bytes = 0L
    var outcome = "done"
    job = scope.launch {
      try {
        c.synthesize(req).collect { r ->
          when (r) {
            is SpeechSynthesizerResponse.AudioAvailable -> {
              chunks++
              bytes += r.audio.size
              if (ownPlayback) writeOwn(r.audio)
              if (!first) {
                first = true
                callback.onFirstAudio(SystemClock.elapsedRealtime(), track?.routedDevice, mapOf("usage" to usage, "method" to method, "firstSource" to "audio_chunk"))
              }
            }
            is SpeechSynthesizerResponse.StatusUpdate -> {
              // START arrives when the engine begins; if no PCM chunk ever shows up this is the first-audio proxy.
              if (r.status == SpeechSynthesizerResponse.Status.START && !first && !ownPlayback) {
                first = true
                callback.onFirstAudio(SystemClock.elapsedRealtime(), null, mapOf("usage" to usage, "method" to method, "firstSource" to "status_start"))
              }
            }
            is SpeechSynthesizerResponse.Error -> outcome = "error:mlkit_${r.errorCode}"
          }
        }
      } catch (e: kotlinx.coroutines.CancellationException) {
        outcome = "stopped"
      } catch (e: Throwable) {
        outcome = "error:$e"
      } finally {
        finishTrack()
        callback.onFinished(outcome, mapOf("chunks" to chunks, "pcmBytes" to bytes, "assumedSampleRate" to assumedSampleRate, "ownPlayback" to ownPlayback))
      }
    }
  }

  private fun writeOwn(pcm: ByteArray) {
    var t = track
    if (t == null) {
      val sr = assumedSampleRate
      t = AudioTrack.Builder()
        .setAudioAttributes(SpeechOutput.attributes(android.media.AudioAttributes.USAGE_ASSISTANT))
        .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(sr).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
        .setBufferSizeInBytes(maxOf(AudioTrack.getMinBufferSize(sr, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT), sr * 2 * 20))
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
      SpeechOutput.applyToTrack(context, t)
      t.play()
      track = t
    }
    t.write(pcm, 0, pcm.size, AudioTrack.WRITE_BLOCKING)
  }

  private fun finishTrack() {
    val t = track ?: return
    track = null
    try {
      t.stop()
      t.release()
    } catch (_: Throwable) {}
  }

  override fun stop() {
    job?.cancel()
    job = null
    try { client?.stop() } catch (_: Throwable) {}
    track?.let { try { it.pause(); it.flush() } catch (_: Throwable) {} }
  }

  override fun release() {
    stop()
    try { client?.close() } catch (_: Throwable) {}
    client = null
    scope.cancel()
  }
}
