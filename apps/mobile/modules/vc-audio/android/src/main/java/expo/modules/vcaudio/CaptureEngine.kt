package expo.modules.vcaudio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.vcaudio.core.FrameAnalyzer
import expo.modules.vcaudio.core.Resampler
import expo.modules.vcaudio.core.WavWriter
import java.io.File
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max

class CaptureEngine(private val context: Context, private val routes: DeviceRoutes, private val emit: (String, Map<String, Any?>) -> Unit) {
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val main = Handler(Looper.getMainLooper())
  private val lock = Any()
  private var record: AudioRecord? = null
  private var source = ""
  @Volatile private var running = false
  @Volatile private var silenced = false
  @Volatile var activeInput: AudioDeviceInfo? = null; private set
  private var communication = false
  private var callback: AudioManager.AudioRecordingCallback? = null
  private var take: Take? = null
  private var generation = 0
  private val frameLock = Any()
  private var framePending = false
  private var frameTime = 0.0
  private var frameF0: Double? = null
  private var frameMidi: Double? = null
  private var frameVoice = 0.0
  private var frameRms = 0.0
  private var framePeak = 0.0
  private var frameSyllable = false
  private val deliverFrame = Runnable {
    val event = synchronized(frameLock) {
      framePending = false
      mapOf<String, Any?>("tMs" to frameTime, "f0" to frameF0, "midi" to frameMidi, "voicing" to frameVoice,
        "rmsDb" to frameRms, "peak" to framePeak, "syllable" to frameSyllable, "beatMasked" to false)
    }
    if (running) emit("onFrame", event)
  }
  private fun queueFrame(time: Double, f0: Double?, midi: Double?, voice: Double, rms: Double, peak: Double, syllable: Boolean) {
    synchronized(frameLock) {
      frameTime = time; frameF0 = f0; frameMidi = midi; frameVoice = voice; frameRms = rms; framePeak = peak
      frameSyllable = if (framePending) frameSyllable || syllable else syllable
      if (!framePending) { framePending = true; main.post(deliverFrame) }
    }
  }
  val taking: Boolean get() = synchronized(lock) { take != null }
  private class Take(val id: String, val path: File, val asrPath: File?, val writer: WavWriter, val asr: WavWriter?, val resampler: Resampler?, val start: Double, val input: AudioDeviceInfo) {
    val changes = mutableListOf<Map<String, Any?>>()
    val beats = mutableListOf<Double>()
    var latency = 0.0
  }
  private fun now() = SystemClock.elapsedRealtimeNanos() / 1_000_000.0
  private fun state(reason: String? = null, error: String? = null) {
    val map = mutableMapOf<String, Any?>("running" to running, "silenced" to silenced)
    if (reason != null) map["reason"] = reason
    if (error != null) map["error"] = error
    emit("onMonitorState", map)
  }
  private fun hasPermission() = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
  @SuppressLint("MissingPermission")
  fun start() = synchronized(lock) {
    if (running) return@synchronized
    if (!hasPermission()) throw CodedException("ERR_PERMISSION", "RECORD_AUDIO is not granted", null)
    val selected = routes.selectedInput() ?: throw CodedException("ERR_INPUT", "No input device is available", null)
    var input = selected
    if (routes.isBluetoothMic(input) && !selectBluetooth(input)) input = routes.builtin() ?: throw CodedException("ERR_INPUT", "Bluetooth and phone microphones unavailable", null)
    if (!routes.isBluetoothMic(input)) clearBluetooth()
    val minBuffer = AudioRecord.getMinBufferSize(48000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (minBuffer <= 0) throw CodedException("ERR_AUDIO", "48 kHz capture is unavailable", null)
    val sources = mutableListOf<Pair<Int, String>>()
    if (audio.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true") sources.add(MediaRecorder.AudioSource.UNPROCESSED to "UNPROCESSED")
    sources.add(MediaRecorder.AudioSource.VOICE_RECOGNITION to "VOICE_RECOGNITION")
    sources.add(MediaRecorder.AudioSource.MIC to "MIC")
    var rec: AudioRecord? = null
    for ((src, name) in sources) {
      val candidate = try {
        AudioRecord.Builder().setAudioSource(src).setAudioFormat(AudioFormat.Builder().setSampleRate(48000).setChannelMask(AudioFormat.CHANNEL_IN_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
          .setBufferSizeInBytes(max(minBuffer * 2, 48000)).setPrivacySensitive(false).build()
      } catch (_: Exception) { null }
      if (candidate != null && candidate.state == AudioRecord.STATE_INITIALIZED) { rec = candidate; source = name; break }
      candidate?.release()
    }
    val current = rec ?: run { clearBluetooth(); throw CodedException("ERR_AUDIO", "Could not open microphone", null) }
    if (!current.setPreferredDevice(input)) { current.release(); clearBluetooth(); throw CodedException("ERR_INPUT", "Could not select microphone", null) }
    try { current.startRecording() } catch (e: Exception) { current.release(); clearBluetooth(); throw e }
    if (current.recordingState != AudioRecord.RECORDSTATE_RECORDING) { current.release(); clearBluetooth(); throw CodedException("ERR_AUDIO", "Could not start microphone", null) }
    record = current; activeInput = input; running = true; silenced = false; generation++
    val session = current.audioSessionId
    val cb = object : AudioManager.AudioRecordingCallback() {
      override fun onRecordingConfigChanged(configs: List<AudioRecordingConfiguration>) {
        val config = configs.firstOrNull { it.clientAudioSessionId == session } ?: return
        if (silenced != config.isClientSilenced) { silenced = config.isClientSilenced; state() }
      }
    }
    callback = cb; audio.registerAudioRecordingCallback(cb, main)
    val runId = generation
    Thread({ loop(current, runId) }, "vc-audio-capture").start()
    state()
  }
  private fun selectBluetooth(input: AudioDeviceInfo): Boolean {
    try {
      val target = audio.availableCommunicationDevices.firstOrNull { it.type == input.type && it.address == input.address } ?: return false
      if (!audio.setCommunicationDevice(target)) return false
      communication = true
      val until = SystemClock.elapsedRealtime() + 1000
      while (SystemClock.elapsedRealtime() < until && audio.communicationDevice?.id != target.id) Thread.sleep(20)
      if (audio.communicationDevice?.id == target.id) return true
    } catch (_: Exception) { }
    clearBluetooth(); return false
  }
  private fun clearBluetooth() { if (communication) { try { audio.clearCommunicationDevice() } catch (_: Exception) { }; communication = false } }
  fun devicesChanged() = synchronized(lock) {
    val current = activeInput ?: return@synchronized
    val stillPresent = routes.inputs().firstOrNull { routes.key(it) == routes.key(current) }
    val target = if (take != null) stillPresent ?: routes.builtin() else routes.selectedInput()
    if (target == null || routes.key(current) == routes.key(target)) return@synchronized
    if (routes.isBluetoothMic(target)) { if (!selectBluetooth(target)) return@synchronized } else clearBluetooth()
    if (record?.setPreferredDevice(target) == true) {
      activeInput = target
      take?.changes?.add(mapOf("atMs" to (now() - take!!.start).coerceAtLeast(0.0), "input" to routes.info(target), "reason" to "device_disconnected"))
    }
  }
  fun begin(kind: String): Map<String, Any?> {
    if (kind != "speech" && kind != "song") throw CodedException("ERR_ARGUMENT", "Unknown take kind", null)
    start()
    synchronized(lock) {
      if (take != null) throw CodedException("ERR_LOCKED", "A take is already recording", null)
      val input = activeInput ?: throw CodedException("ERR_INPUT", "No active input", null)
      val latch = CountDownLatch(1); RecordingService.latch = latch; RecordingService.failure = null
      try { ContextCompat.startForegroundService(context, Intent(context, RecordingService::class.java)) } catch (e: Exception) { RecordingService.latch = null; throw e }
      if (!latch.await(5, TimeUnit.SECONDS) || RecordingService.failure != null) { RecordingService.latch = null; context.stopService(Intent(context, RecordingService::class.java)); throw CodedException("ERR_SERVICE", RecordingService.failure ?: "Foreground service timed out", null) }
      RecordingService.latch = null
      val dir = File(context.filesDir, "takes").also { it.mkdirs() }
      val id = UUID.randomUUID().toString(); val path = File(dir, "$id.wav"); val asr = if (kind == "speech") File(dir, "$id.asr.wav") else null
      val t = Take(id, path, asr, WavWriter(path, 48000), asr?.let { WavWriter(it, 16000) }, asr?.let { Resampler() }, now(), input)
      take = t
      emit("onDevices", routes.snapshot(activeInput))
      return mapOf("id" to id, "path" to path.absolutePath, "sampleRate" to 48000, "source" to source, "input" to routes.info(input), "output" to routes.activeOutput()?.let(routes::info), "startMs" to t.start)
    }
  }
  fun end(reason: String): Map<String, Any?> = synchronized(lock) {
    val t = take ?: throw CodedException("ERR_NO_TAKE", "No take is recording", null)
    take = null; t.writer.close(); t.asr?.close(); context.stopService(Intent(context, RecordingService::class.java))
    val result = mapOf<String, Any?>("id" to t.id, "path" to t.path.absolutePath, "asrPath" to t.asrPath?.absolutePath, "durationMs" to t.writer.durationS * 1000, "sizeBytes" to t.path.length().toDouble(), "reason" to reason, "beatTimesMs" to t.beats.toList(), "inputChanges" to t.changes.toList(), "outputLatencyMs" to t.latency)
    emit("onTakeStopped", result); emit("onDevices", routes.snapshot(activeInput)); result
  }
  fun stop(reason: String = "stopped") {
    synchronized(lock) {
      if (take != null) end(if (reason == "left_app") "left_app" else if (reason == "error") "error" else "user")
      if (!running) return
      running = false; generation++; val old = record; record = null
      callback?.let { audio.unregisterAudioRecordingCallback(it) }; callback = null
      try { old?.stop() } catch (_: Exception) { }
      activeInput = null; clearBluetooth(); state(reason)
    }
  }
  private fun loop(rec: AudioRecord, id: Int) {
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val analyzer = FrameAnalyzer(48000); val hop = 960; val chunk = ShortArray(hop); val window = FloatArray(analyzer.windowSize)
    var accumulated = 0
    val asrBuffer = ShortArray(hop / 3)
    var smooth = -100.0
    var valley = -100.0
    var peakDb = -100.0
    var wasVoiced = false
    try {
      while (running && generation == id) {
        var n = 0
        while (n < hop && running) { val read = rec.read(chunk, n, hop - n); if (read < 0) throw IllegalStateException("AudioRecord error $read"); n += read }
        if (n < hop) break
        synchronized(lock) { take?.let { it.writer.write(chunk, hop); it.asr?.let { w -> val count = it.resampler!!.processInto(chunk, hop, asrBuffer); w.write(asrBuffer, count) } } }
        System.arraycopy(window, hop, window, 0, window.size - hop)
        var peak = 0
        for (i in 0 until hop) { window[window.size - hop + i] = chunk[i] / 32768f; peak = max(peak, abs(chunk[i].toInt())) }
        accumulated += hop; if (accumulated < window.size) continue
        val f = analyzer.analyze(0.0, window); val time = now() - window.size * 500.0 / 48000
        val midi = f.f0?.let { 69 + 12 * ln(it / 440) / ln(2.0) }
        smooth = 0.65 * smooth + 0.35 * f.rmsDb
        valley = minOf(valley, smooth)
        if (smooth > peakDb) { peakDb = smooth; wasVoiced = f.f0 != null }
        val syllable = wasVoiced && peakDb - valley >= 6.0 && peakDb - smooth >= 6.0
        if (syllable || (peakDb - smooth >= 6.0 && !wasVoiced)) { peakDb = smooth; valley = smooth; wasVoiced = false }
        queueFrame(time, f.f0, midi, f.voicing, f.rmsDb.coerceIn(-100.0, 0.0), peak / 32768.0, syllable)
      }
    } catch (e: Exception) { if (running && generation == id) { main.post { stop("error") } } }
    finally { rec.release() }
  }
}
