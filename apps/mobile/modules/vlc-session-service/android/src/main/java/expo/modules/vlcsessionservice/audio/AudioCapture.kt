package expo.modules.vlcsessionservice.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.SystemClock
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.speech.SpeechPipeline
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Dedicated capture thread: AudioRecord(VOICE_COMMUNICATION, 16 kHz mono PCM16) -> SpeechPipeline.
 * Recovers from read errors / dead recorders by recreating the AudioRecord (logged as recorder_restart).
 */
class AudioCapture(
  private val log: DiagLog,
  private val routing: AudioRouting,
  private val emit: (String, Map<String, Any?>) -> Unit,
  private val pipelineFactory: () -> SpeechPipeline?,
) {
  @Volatile private var running = false
  private var thread: Thread? = null
  private var pipeline: SpeechPipeline? = null

  fun start() {
    if (running) return
    running = true
    thread = Thread({ runLoop() }, "vlc-audio-capture").also {
      it.priority = Thread.MAX_PRIORITY
      it.start()
    }
  }

  fun stop() {
    running = false
    thread?.let {
      try { it.join(3000) } catch (_: InterruptedException) { }
      if (it.isAlive) log.log("error", mapOf("where" to "capture_join_timeout"))
    }
    thread = null
  }

  @SuppressLint("MissingPermission")
  private fun newRecorder(): AudioRecord? {
    val minBuf = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (minBuf <= 0) return null
    val rec = AudioRecord.Builder()
      .setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setSampleRate(SAMPLE_RATE)
          .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
          .build(),
      )
      .setBufferSizeInBytes(maxOf(minBuf * 2, SAMPLE_RATE * 2)) // >= 1 s of audio
      .build()
    return if (rec.state == AudioRecord.STATE_INITIALIZED) rec else { rec.release(); null }
  }

  private fun runLoop() {
    android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO)
    val loadStart = SystemClock.elapsedRealtime()
    pipeline = try { pipelineFactory() } catch (e: Throwable) {
      log.log("error", mapOf("where" to "pipeline_init", "message" to e.toString()))
      emit("sessionError", mapOf("code" to "PIPELINE_INIT_FAILED", "message" to e.toString()))
      null
    }
    log.log("pipeline_ready", mapOf("enabled" to (pipeline != null), "loadMs" to SystemClock.elapsedRealtime() - loadStart))
    emit("pipelineState", mapOf("sttEnabled" to (pipeline != null), "loadMs" to SystemClock.elapsedRealtime() - loadStart))

    var restarts = 0
    var recorder: AudioRecord? = null
    var effects: List<android.media.audiofx.AudioEffect> = emptyList()
    var cb: AudioManager.AudioRecordingCallback? = null
    val buf = ShortArray(FRAME)
    val floats = FloatArray(FRAME)
    var lastStatAt = SystemClock.elapsedRealtime()
    var frames = 0L
    var sumSq = 0.0
    var peak = 0
    var zeroWindows = 0
    var failedReads = 0

    fun open(reason: String): Boolean {
      recorder?.let { releaseRecorder(it, effects, cb) }
      effects = emptyList()
      val rec = try { newRecorder() } catch (e: Exception) {
        log.log("error", mapOf("where" to "audiorecord_create", "message" to e.toString())); null
      }
      if (rec == null) {
        recorder = null
        return false
      }
      try {
        rec.startRecording()
      } catch (e: Exception) {
        log.log("error", mapOf("where" to "audiorecord_start", "message" to e.toString()))
        rec.release(); recorder = null
        return false
      }
      if (rec.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
        log.log("error", mapOf("where" to "audiorecord_not_recording", "state" to rec.recordingState))
        rec.release(); recorder = null
        return false
      }
      recorder = rec
      routing.recorder = rec
      val fx = ArrayList<android.media.audiofx.AudioEffect>()
      if (AcousticEchoCanceler.isAvailable()) AcousticEchoCanceler.create(rec.audioSessionId)?.also { it.enabled = true; fx.add(it) }
      if (NoiseSuppressor.isAvailable()) NoiseSuppressor.create(rec.audioSessionId)?.also { it.enabled = true; fx.add(it) }
      effects = fx
      rec.addOnRoutingChangedListener({ r ->
        val dev = r.routedDevice
        val d = dev?.let { AudioRouting.describe(it) }
        log.log("record_route", mapOf("routedDevice" to d))
        emit("routeChanged", mapOf("change" to "recordRoute", "devices" to listOfNotNull(d), "route" to routing.state()))
      }, null)
      if (Build.VERSION.SDK_INT >= 29) {
        val sessionId = rec.audioSessionId
        val c = object : AudioManager.AudioRecordingCallback() {
          override fun onRecordingConfigChanged(configs: MutableList<AudioRecordingConfiguration>) {
            val mine = configs.firstOrNull { it.clientAudioSessionId == sessionId }
            log.log(
              "record_config",
              mapOf("clientSilenced" to mine?.isClientSilenced, "activeConfigs" to configs.size, "found" to (mine != null)),
            )
          }
        }
        cb = c
        routing.am.registerAudioRecordingCallback(c, null)
      }
      log.log(
        "audio_open",
        mapOf(
          "reason" to reason,
          "source" to "VOICE_COMMUNICATION",
          "sampleRate" to rec.sampleRate,
          "bufferFrames" to rec.bufferSizeInFrames,
          "aecEnabled" to fx.any { it is AcousticEchoCanceler },
          "nsEnabled" to fx.any { it is NoiseSuppressor },
          "route" to routing.state(),
        ),
      )
      return true
    }

    if (!open("initial")) {
      emit("sessionError", mapOf("code" to "AUDIO_RECORD_FAILED", "message" to "Could not open AudioRecord (permission or mic busy?)"))
    }

    while (running) {
      val rec = recorder
      if (rec == null) {
        // Back off and retry; a call or another app may hold the mic.
        SystemClock.sleep(1000)
        if (!running) break
        restarts++
        val ok = open("retry")
        log.log("recorder_restart", mapOf("count" to restarts, "ok" to ok, "cause" to "no_recorder"))
        continue
      }
      val n = rec.read(buf, 0, FRAME, AudioRecord.READ_BLOCKING)
      val nowRt = SystemClock.elapsedRealtime()
      if (n <= 0) {
        failedReads++
        if (failedReads >= 3) {
          failedReads = 0
          restarts++
          val ok = open("read_error_$n")
          log.log("recorder_restart", mapOf("count" to restarts, "ok" to ok, "cause" to "read_$n"))
          emit("sessionError", mapOf("code" to "AUDIO_RESTARTED", "message" to "AudioRecord read returned $n; restarted ok=$ok"))
        }
        continue
      }
      failedReads = 0
      for (i in 0 until n) {
        val s = buf[i].toInt()
        floats[i] = s / 32768f
        sumSq += s.toDouble() * s
        val a = abs(s)
        if (a > peak) peak = a
      }
      frames += n
      if (n == FRAME) {
        try {
          pipeline?.onFrame(floats, nowRt)
        } catch (e: Throwable) {
          log.log("error", mapOf("where" to "pipeline_frame", "message" to e.toString()))
          emit("sessionError", mapOf("code" to "PIPELINE_ERROR", "message" to e.toString()))
        }
      }
      if (nowRt - lastStatAt >= STAT_MS) {
        val rms = if (frames > 0) sqrt(sumSq / frames) / 32768.0 else 0.0
        if (peak == 0) zeroWindows++ else zeroWindows = 0
        log.log(
          "audio_stats",
          mapOf("windowMs" to nowRt - lastStatAt, "frames" to frames, "rms" to rms, "peak" to peak / 32768.0, "allZeroWindows" to zeroWindows, "restarts" to restarts),
        )
        if (zeroWindows >= 3) {
          log.log("audio_silent_warning", mapOf("windows" to zeroWindows, "hint" to "AudioRecord delivers digital silence (OS may be silencing the client)"))
          emit("sessionError", mapOf("code" to "AUDIO_SILENT", "message" to "Mic delivered only zeros for ${zeroWindows * STAT_MS / 1000} s"))
        }
        emit("audioLevel", mapOf("rms" to rms, "peak" to peak / 32768.0))
        lastStatAt = nowRt
        frames = 0; sumSq = 0.0; peak = 0
      }
    }

    recorder?.let { releaseRecorder(it, effects, cb) }
    routing.recorder = null
    try { pipeline?.release() } catch (e: Throwable) { log.log("error", mapOf("where" to "pipeline_release", "message" to e.toString())) }
    pipeline = null
    log.log("audio_closed")
  }

  private fun releaseRecorder(rec: AudioRecord, effects: List<android.media.audiofx.AudioEffect>, cb: AudioManager.AudioRecordingCallback?) {
    try { if (Build.VERSION.SDK_INT >= 29 && cb != null) routing.am.unregisterAudioRecordingCallback(cb) } catch (_: Exception) { }
    effects.forEach { try { it.release() } catch (_: Exception) { } }
    try { if (rec.recordingState == AudioRecord.RECORDSTATE_RECORDING) rec.stop() } catch (_: Exception) { }
    rec.release()
  }

  companion object {
    const val SAMPLE_RATE = 16_000
    const val FRAME = 512 // 32 ms; matches Silero window size at 16 kHz
    private const val STAT_MS = 10_000L
  }
}
