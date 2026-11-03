package expo.modules.vlcsessionservice.speech.stt

import android.annotation.SuppressLint
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.SystemClock
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.log.DiagLog
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Microphone capture for frame-driven STT engines (sherpa). 16 kHz mono, 512-sample frames of floats in -1..1.
 * Separate from the session's AudioCapture so the STT lab never touches the session pipeline.
 *
 * [source] VOICE_RECOGNITION for the phone mic (no echo canceller needed, nothing is played); VOICE_COMMUNICATION when a
 * Bluetooth headset is the target (the platform routes it to the communication device).
 */
class SttMicCapture(
  private val log: DiagLog,
  private val source: Int,
  private val preferred: AudioDeviceInfo?,
  private val onFrame: (FloatArray, Long) -> Unit,
  private val onLevel: (Float) -> Unit,
  private val onRoute: (Map<String, Any?>) -> Unit,
  private val onFailure: (String) -> Unit,
) {
  @Volatile private var running = false
  private var thread: Thread? = null

  fun start() {
    if (running) return
    running = true
    thread = Thread({ loop() }, "vlc-stt-capture").also { it.priority = Thread.MAX_PRIORITY; it.start() }
  }

  fun stop() {
    running = false
    thread?.let { t -> try { t.join(2_000) } catch (_: InterruptedException) { } }
    thread = null
  }

  @SuppressLint("MissingPermission")
  private fun loop() {
    android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO)
    val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val rec = try {
      AudioRecord.Builder()
        .setAudioSource(source)
        .setAudioFormat(
          AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO).build(),
        )
        .setBufferSizeInBytes(maxOf(minBuf * 2, SAMPLE_RATE * 2))
        .build()
    } catch (e: Exception) {
      onFailure("AudioRecord create failed: $e"); return
    }
    if (rec.state != AudioRecord.STATE_INITIALIZED) {
      rec.release(); onFailure("AudioRecord not initialized (permission or mic busy?)"); return
    }
    var preferredOk: Boolean? = null
    if (preferred != null) preferredOk = rec.setPreferredDevice(preferred)
    rec.addOnRoutingChangedListener({ r ->
      onRoute(mapOf("kind" to "record_route", "routedDevice" to r.routedDevice?.let(AudioRouting::describe), "preferredOk" to preferredOk))
    }, null)
    try {
      rec.startRecording()
    } catch (e: Exception) {
      rec.release(); onFailure("startRecording failed: $e"); return
    }
    if (rec.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
      rec.release(); onFailure("AudioRecord is not recording (mic busy?)"); return
    }
    log.log("stt_capture_open", mapOf("source" to source, "preferred" to preferred?.let(AudioRouting::describe), "preferredOk" to preferredOk, "routed" to rec.routedDevice?.let(AudioRouting::describe)))
    onRoute(mapOf("kind" to "record_route", "routedDevice" to rec.routedDevice?.let(AudioRouting::describe), "preferredOk" to preferredOk))

    val buf = ShortArray(FRAME)
    val floats = FloatArray(FRAME)
    var lastLevelRt = 0L
    var failed = 0
    var silentFrames = 0
    while (running) {
      val n = rec.read(buf, 0, FRAME, AudioRecord.READ_BLOCKING)
      val now = SystemClock.elapsedRealtime()
      if (n <= 0) {
        if (++failed >= 5) { onFailure("AudioRecord.read returned $n"); break }
        continue
      }
      failed = 0
      var ss = 0.0
      var pk = 0
      for (i in 0 until n) {
        val s = buf[i].toInt()
        floats[i] = s / 32768f
        ss += s.toDouble() * s
        val a = abs(s)
        if (a > pk) pk = a
      }
      if (pk == 0) silentFrames++ else silentFrames = 0
      if (silentFrames == SILENT_WARN_FRAMES) {
        log.log("stt_capture_silent", mapOf("frames" to silentFrames, "hint" to "AudioRecord delivers digital silence"))
        onRoute(mapOf("kind" to "silent_input", "frames" to silentFrames))
      }
      if (n == FRAME) onFrame(floats, now)
      if (now - lastLevelRt >= 80) {
        lastLevelRt = now
        val rms = sqrt(ss / n) / 32768.0
        val db = 20 * log10(rms + 1e-9)
        onLevel(((db + 60) / 45).coerceIn(0.0, 1.0).toFloat())
      }
    }
    try { if (rec.recordingState == AudioRecord.RECORDSTATE_RECORDING) rec.stop() } catch (_: Exception) { }
    rec.release()
    log.log("stt_capture_closed")
  }

  companion object {
    const val SAMPLE_RATE = 16_000
    const val FRAME = 512
    private const val SILENT_WARN_FRAMES = 94 // about 3 s
    const val SOURCE_PHONE = MediaRecorder.AudioSource.VOICE_RECOGNITION
    const val SOURCE_BLUETOOTH = MediaRecorder.AudioSource.VOICE_COMMUNICATION
  }
}
