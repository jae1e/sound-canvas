package expo.modules.flnative

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.AudioRouting
import android.media.AudioTimestamp
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.Process
import android.os.SystemClock
import android.util.Log
import expo.modules.flnative.core.BoundaryDetector
import expo.modules.flnative.core.PeakBlocks
import expo.modules.flnative.core.ZeroRunDetector
import expo.modules.flnative.core.Hex
import expo.modules.flnative.core.SegmentMetrics
import expo.modules.flnative.core.Uuid7
import expo.modules.flnative.core.Wav
import expo.modules.flnative.core.dbfsX100
import expo.modules.kotlin.exception.CodedException
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import expo.modules.flnative.core.InputInfo
import expo.modules.flnative.core.InputPref
import expo.modules.flnative.core.InputResolver
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.sqrt

class StartOptions(
  val memoId: String,
  val recordingId: String,
  val input: InputPref?,
  val source: String?,
  val location: Map<String, Any?>?,
  val live: Map<String, Any?>?,
)

/**
 * One recording: AudioRecord capture thread, crash-safe WAV segments, journal records, level events, live draft.
 * Created by [Engine]; the capture thread owns all segment state.
 */
class RecordingSession(private val context: Context, private val opts: StartOptions, private val onFinished: () -> Unit) {
  private val journal get() = Engine.journal
  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val ioExecutor = Executors.newSingleThreadScheduledExecutor()
  @Volatile private var record: AudioRecord? = null
  private var thread: Thread? = null
  private var streamer: LiveStreamer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var communicationDeviceSet = false
  private var routeListener: AudioRouting.OnRoutingChangedListener? = null
  @Volatile private var lastRouteKey = ""

  @Volatile private var stopRequested = false
  @Volatile private var stopReason = "user"
  @Volatile private var stopLocation: Map<String, Any?>? = null
  @Volatile private var finished = false
  @Volatile private var pauseRequested = false
  @Volatile var paused = false; private set
  private val control = Any()
  private var sourceName = "MIC"
  @Volatile private var targetDevice: AudioDeviceInfo? = null
  /** The input chosen at start and locked for the whole session (api-v0 section 6, "Input selection"). */
  @Volatile private var lockedInfo: InputInfo? = null
  /** Set once the locked device is gone (or never came up): the rest of the session stays on the built-in mic. */
  @Volatile private var forcedBuiltin = false
  private val routeLock = Any()
  @Volatile private var pendingReason: String? = null
  @Volatile var inputName = "Phone mic"; private set

  /** A route change for the capture thread to apply at the next chunk boundary: close the segment, then journal. */
  private class Boundary(val reason: String, val route: Map<String, Any?>?, val recreate: Boolean)
  private val pendingBoundary = AtomicReference<Boundary?>(null)

  // Silenced-capture detection: the platform callback plus a zero-run heuristic.
  private val silenceLock = Any()
  @Volatile private var callbackSilenced = false
  @Volatile private var zeroSilenced = false
  @Volatile var silenced = false; private set
  @Volatile private var sessionId = -1
  private val zeroRun = ZeroRunDetector()
  private var recordingCallback: AudioManager.AudioRecordingCallback? = null
  private val peakBlocks = PeakBlocks()

  // Timeline: sample index -> elapsed time, anchored at the first chunk.
  private var anchorUs = 0L
  private var anchorWallMs = 0L
  private var anchored = false
  @Volatile private var totalSamples = 0L

  private var segment: OpenSegment? = null
  @Volatile private var segmentIndex = 0
  private var nextIndex = 0

  val recordingId get() = opts.recordingId
  val memoId get() = opts.memoId
  val elapsedMs: Long get() = totalSamples * 1000L / Wav.SAMPLE_RATE
  val currentSegmentIndex: Int get() = segmentIndex
  val liveState: String get() = streamer?.state ?: "off"
  private val recordingDir: File = File(context.filesDir, "recordings/${opts.recordingId}")

  private class OpenSegment(
    val index: Int,
    val file: File,
    val out: FileOutputStream,
    val startSample: Long,
  ) {
    val pcmDigest: MessageDigest = MessageDigest.getInstance("SHA-256")
    val metrics = SegmentMetrics()
    val boundary = BoundaryDetector()
    var samples = 0L
    var sinceSync = 0
  }

  /** Starts capture. Throws [CaptureStartException] on failure (everything is released). */
  fun begin(): Map<String, Any?> {
    try {
      val chosen = Inputs.resolve(opts.input ?: Inputs.preference())
      lockedInfo = chosen?.info
      targetDevice = chosen?.device
      val default = if (Devices.unprocessedSupported(context)) "UNPROCESSED" else "VOICE_RECOGNITION"
      val first = opts.source ?: default
      val order = listOf("UNPROCESSED", "VOICE_RECOGNITION", "MIC")
      val rec = startCapture(listOf(first) + order.drop(order.indexOf(first) + 1))
      val route = Devices.route(rec.routedDevice ?: targetDevice)
      lastRouteKey = routeKey(route)
      inputName = Devices.displayName(rec.routedDevice ?: targetDevice)
      val effects = Devices.effects(rec.audioSessionId)

      recordingDir.mkdirs()
      acquireWakeLock()
      val started = journal.append(
        "recording_started", opts.memoId, opts.recordingId,
        mapOf("source" to sourceName, "sampleRate" to 16000, "route" to route, "effects" to effects, "location" to opts.location),
      )
      Engine.notifyJournal(started)

      streamer = opts.live?.let {
        LiveStreamer(
          Engine.http, it["url"] as String, it["token"] as String, (it["language"] as? String) ?: "auto",
          opts.memoId, opts.recordingId,
        ) { e -> Engine.emit("onLive", e) }.also { s -> s.start() }
      }

      thread = Thread({ captureLoop(rec) }, "fl-capture").also { it.start() }
      return mapOf(
        "recordingId" to opts.recordingId, "source" to sourceName, "sampleRate" to 16000, "route" to route,
        "effects" to effects, "startWallMs" to started.getLong("wallMs"), "startElapsedUs" to started.getLong("elapsedUs"),
      )
    } catch (e: Throwable) {
      releaseRecord()
      teardown()
      streamer?.finish()
      throw if (e is CaptureStartException) e else CaptureStartException(e.message ?: e.toString(), e)
    }
  }

  /**
   * Creates and starts an AudioRecord for the first usable source in [candidates], applies the preferred device and
   * Bluetooth communication device, and registers the routing and silence callbacks.
   */
  private fun startCapture(candidates: List<String>): AudioRecord {
    val (rec, name) = createRecord(candidates)
    record = rec
    sourceName = name
    sessionId = rec.audioSessionId
    // Pick the route before capture starts so the first segment begins on it: for Bluetooth voice, the
    // communication device is selected and awaited first; if it never comes up, use the built-in microphone.
    targetDevice?.let { device ->
      var d = device
      if (Devices.isBluetoothVoice(d.type) && !selectCommunicationDevice(d)) {
        Log.w(TAG, "Bluetooth input ${d.productName} did not come up; using the built-in microphone")
        clearCommunicationDevice()
        builtinDevice()?.let { d = it }
        targetDevice = d
        forcedBuiltin = true
      }
      rec.setPreferredDevice(d)
    }
    rec.startRecording()
    if (rec.recordingState != AudioRecord.RECORDSTATE_RECORDING) throw CaptureStartException("AudioRecord did not start")
    var routed = rec.routedDevice
    var waited = 0
    while (routed == null && waited < 500) { Thread.sleep(50); waited += 50; routed = rec.routedDevice }

    val listener = AudioRouting.OnRoutingChangedListener { onRoutingChanged() }
    routeListener = listener
    rec.addOnRoutingChangedListener(listener, Handler(Looper.getMainLooper()))

    callbackSilenced = false
    zeroSilenced = false
    zeroRun.reset()
    val cb = object : AudioManager.AudioRecordingCallback() {
      override fun onRecordingConfigChanged(configs: List<AudioRecordingConfiguration>) {
        updateCallbackSilenced(configs)
      }
    }
    recordingCallback = cb
    audioManager.registerAudioRecordingCallback(cb, Handler(Looper.getMainLooper()))
    updateCallbackSilenced(audioManager.activeRecordingConfigurations) // once right after start
    return rec
  }

  private fun updateCallbackSilenced(configs: List<AudioRecordingConfiguration>) {
    val sid = sessionId
    val c = configs.firstOrNull { it.clientAudioSessionId == sid } ?: return
    callbackSilenced = c.isClientSilenced
    ioExecutor.execute { evaluateSilence() }
  }

  /** Journals and emits `capture_state` when the combined silenced state (callback or zero run) changes. */
  private fun evaluateSilence() {
    synchronized(silenceLock) {
      if (finished) return
      val now = callbackSilenced || zeroSilenced
      if (now == silenced) return
      silenced = now
      try {
        Engine.notifyJournal(journal.append("capture_state", opts.memoId, opts.recordingId, mapOf("silenced" to now)))
      } catch (e: Exception) {
        Log.w(TAG, "capture_state journal failed", e)
      }
      Engine.emit("onCapture", mapOf("silenced" to now))
    }
  }

  /** Closes the open segment, journals recording_paused and releases the microphone. The service stays up. */
  fun pause() {
    synchronized(control) {
      if (finished || paused) return
      pauseRequested = true
      thread?.join(8000)
      if (finished) return
      paused = true
      Engine.notifyJournal(journal.append("recording_paused", opts.memoId, opts.recordingId, emptyMap()))
      Engine.refreshNotification()
    }
  }

  /** Re-creates the AudioRecord with the same source and device; segment indexes continue. */
  fun resume() {
    synchronized(control) {
      if (finished || !paused) return
      try {
        // Re-acquire the locked device if it is still there, otherwise the built-in microphone (never re-resolve).
        val lockedGone = lockedGone()
        if (lockedGone) forcedBuiltin = true
        targetDevice = if (forcedBuiltin) builtinDevice() else lockedEntry()?.device ?: builtinDevice()
        val rec = startCapture(listOf(sourceName))
        val routed = rec.routedDevice ?: targetDevice
        val route = Devices.route(routed)
        inputName = Devices.displayName(routed)
        Engine.notifyJournal(journal.append("recording_resumed", opts.memoId, opts.recordingId, emptyMap()))
        val key = routeKey(route)
        if (key != lastRouteKey) {
          lastRouteKey = key
          val reason = if (forcedBuiltin && lockedInfo?.type != InputResolver.BUILTIN) "device_disconnected" else "system"
          Engine.notifyJournal(journal.append("route_changed", opts.memoId, opts.recordingId, mapOf("route" to route, "reason" to reason)))
        }
        pendingBoundary.set(null)
        anchored = false
        pauseRequested = false
        paused = false
        thread = Thread({ captureLoop(rec) }, "fl-capture").also { it.start() }
        Engine.refreshNotification()
      } catch (e: Throwable) {
        releaseRecord()
        throw CodedException("ERR_AUDIO_START", e.message ?: e.toString(), e)
      }
    }
  }

  private fun createRecord(candidates: List<String>): Pair<AudioRecord, String> {
    val minBuf = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val bufBytes = maxOf(minBuf * 2, 16000 * 2) // at least 1 s of slack
    var lastError: Throwable? = null
    for (name in candidates) {
      val src = when (name) {
        "UNPROCESSED" -> MediaRecorder.AudioSource.UNPROCESSED
        "VOICE_RECOGNITION" -> MediaRecorder.AudioSource.VOICE_RECOGNITION
        else -> MediaRecorder.AudioSource.MIC
      }
      try {
        val rec = AudioRecord.Builder()
          .setAudioSource(src)
          .setAudioFormat(
            AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(16000)
              .setChannelMask(AudioFormat.CHANNEL_IN_MONO).build(),
          )
          .setBufferSizeInBytes(bufBytes)
          .build()
        if (rec.state == AudioRecord.STATE_INITIALIZED) return rec to name
        rec.release()
      } catch (e: Exception) {
        lastError = e
      }
    }
    throw CaptureStartException("No audio source could be initialised", lastError)
  }

  /**
   * Selects the communication device matching [input] and waits up to 1 s for it to take effect (this does not play
   * audio). Returns false when it is not available, not permitted or never comes up.
   */
  private fun selectCommunicationDevice(input: AudioDeviceInfo): Boolean {
    try {
      val candidates = audioManager.availableCommunicationDevices
      val match = candidates.firstOrNull { it.type == input.type && it.address == input.address }
        ?: candidates.firstOrNull { it.type == input.type } ?: return false
      if (audioManager.communicationDevice?.id == match.id) { communicationDeviceSet = true; return true }
      val latch = CountDownLatch(1)
      val listener = AudioManager.OnCommunicationDeviceChangedListener { d -> if (d?.id == match.id) latch.countDown() }
      audioManager.addOnCommunicationDeviceChangedListener({ it.run() }, listener)
      try {
        if (!audioManager.setCommunicationDevice(match)) return false
        communicationDeviceSet = true
        latch.await(1000, TimeUnit.MILLISECONDS)
        return audioManager.communicationDevice?.id == match.id
      } finally {
        audioManager.removeOnCommunicationDeviceChangedListener(listener)
      }
    } catch (e: SecurityException) { // BLUETOOTH_CONNECT missing
      return false
    }
  }

  private fun clearCommunicationDevice() {
    if (communicationDeviceSet) {
      try { audioManager.clearCommunicationDevice() } catch (_: Exception) {}
      communicationDeviceSet = false
    }
  }

  private fun builtinDevice(): AudioDeviceInfo? = Inputs.entries().firstOrNull { it.info.type == "builtin_mic" }?.device

  /** The currently connected entry for the locked device (matched by type, name and address hash, never by id). */
  private fun lockedEntry(): Inputs.Entry? {
    val l = lockedInfo ?: return null
    val pref = InputPref.Device(l.type, l.productName, l.addressHash)
    return Inputs.entries().firstOrNull { InputResolver.matches(pref, it.info) }
  }

  /** True when the locked device is a headset that is no longer connected. */
  private fun lockedGone(): Boolean {
    val l = lockedInfo ?: return false
    return l.type != InputResolver.BUILTIN && lockedEntry() == null
  }

  private fun acquireWakeLock() {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "fieldvoicelog:recording").apply {
      setReferenceCounted(false)
      acquire(12L * 60 * 60 * 1000)
    }
  }

  private fun routeKey(route: Map<String, Any?>) = "${route["type"]}/${route["deviceId"]}"

  /** The system moved our capture. Wait briefly so a device event can explain it, then reconcile. */
  private fun onRoutingChanged() {
    try {
      ioExecutor.schedule({
        synchronized(routeLock) { if (!finished && !paused) reconcile(record) }
      }, 400, TimeUnit.MILLISECONDS)
    } catch (_: RejectedExecutionException) {}
  }

  /**
   * Compares the actual routed device with the last journaled route; queues one boundary per actual change.
   * A move off a locked headset onto the built-in microphone is a disconnect (device removed or SCO dropped).
   */
  private fun reconcile(rec: AudioRecord?) {
    val d = rec?.routedDevice ?: return
    val route = Devices.route(d)
    val key = routeKey(route)
    if (key == lastRouteKey) { pendingReason = null; return }
    lastRouteKey = key
    val leftLocked = lockedInfo?.let { it.type != InputResolver.BUILTIN && Devices.routeType(d.type) == InputResolver.BUILTIN } == true
    val reason = pendingReason ?: if (leftLocked || lockedGone()) "device_disconnected" else "system"
    pendingReason = null
    inputName = Devices.displayName(d)
    Engine.refreshNotification()
    pendingBoundary.set(Boundary(reason, route, false))
    if (reason == "device_disconnected" && !forcedBuiltin) {
      forcedBuiltin = true
      try { ioExecutor.execute { forceBuiltin() } } catch (_: RejectedExecutionException) {}
    }
  }

  /** Connected inputs changed. A new device does nothing; losing the locked device falls back to the built-in mic. */
  fun onInputsChanged() {
    try { ioExecutor.execute { forceBuiltinIfLockedGone() } } catch (_: RejectedExecutionException) {}
  }

  private fun forceBuiltinIfLockedGone() {
    synchronized(routeLock) {
      if (finished || paused || forcedBuiltin || !lockedGone()) return
      forcedBuiltin = true
      pendingReason = "device_disconnected"
      forceBuiltinLocked()
    }
  }

  private fun forceBuiltin() = synchronized(routeLock) { if (!finished && !paused) forceBuiltinLocked() }

  private fun forceBuiltinLocked() {
    val rec = record ?: return
    val target = builtinDevice() ?: return
    targetDevice = target
    val ok = applyRouting(rec, target)
    if (ok && waitRouted(rec, target, 1000)) {
      reconcile(rec)
    } else {
      // setPreferredDevice did not take: have the capture thread recreate the AudioRecord on the built-in mic.
      pendingBoundary.set(Boundary(pendingReason ?: "device_disconnected", null, true))
      pendingReason = null
    }
  }

  private fun applyRouting(rec: AudioRecord, target: AudioDeviceInfo): Boolean = try {
    if (Devices.isBluetoothVoice(target.type)) {
      if (!selectCommunicationDevice(target)) false else rec.setPreferredDevice(target)
    } else {
      clearCommunicationDevice()
      rec.setPreferredDevice(target)
    }
  } catch (e: Exception) {
    Log.w(TAG, "applyRouting failed", e)
    false
  }

  private fun waitRouted(rec: AudioRecord, target: AudioDeviceInfo, timeoutMs: Long): Boolean {
    val deadline = SystemClock.elapsedRealtime() + timeoutMs
    while (true) {
      val d = rec.routedDevice
      if (d != null && landed(d, target)) return true
      if (SystemClock.elapsedRealtime() >= deadline) return false
      Thread.sleep(50)
    }
  }

  private fun landed(routed: AudioDeviceInfo, target: AudioDeviceInfo): Boolean {
    if (routed.id == target.id) return true
    if (Devices.routeType(routed.type) == Devices.routeType(target.type)) return true
    return Devices.isBluetoothVoice(routed.type) && Devices.isBluetoothVoice(target.type) && routed.address.isNotEmpty() && routed.address == target.address
  }

  // Applied on the capture thread at a chunk boundary. Returns a replacement AudioRecord when it was recreated.
  private fun processBoundary(): AudioRecord? {
    val b = pendingBoundary.getAndSet(null) ?: return null
    segment?.let { closeSegment(it) } // segment_closed first: each segment has exactly one route
    var newRec: AudioRecord? = null
    var route = b.route
    if (b.recreate) {
      releaseRecord(clearCommunication = false)
      newRec = startCapture(listOf(sourceName))
      anchored = false
      synchronized(routeLock) {
        val d = newRec.routedDevice ?: targetDevice
        val r = Devices.route(d)
        val key = routeKey(r)
        inputName = Devices.displayName(d)
        route = if (key == lastRouteKey) null else r.also { lastRouteKey = key }
      }
      Engine.refreshNotification()
    }
    route?.let {
      Engine.notifyJournal(journal.append("route_changed", opts.memoId, opts.recordingId, mapOf("route" to it, "reason" to b.reason)))
    }
    return newRec
  }

  /** Requests a stop and waits for the capture thread to close the segment and write recording_stopped. */
  fun stop(reason: String, location: Map<String, Any?>?) {
    synchronized(control) {
      if (finished) return
      stopReason = reason
      stopLocation = location
      if (paused) { // no capture thread: the segment was closed at pause time
        finish(reason)
        return
      }
      stopRequested = true
      thread?.join(8000)
    }
  }

  // ---- capture thread ---------------------------------------------------------------------------------------

  private fun captureLoop(first: AudioRecord) {
    var rec = first
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val chunk = ShortArray(CHUNK_SAMPLES)
    var reason: String? = null
    try {
      while (!stopRequested && !pauseRequested) {
        val n = readChunk(rec, chunk)
        if (n < 0) { reason = "error"; Log.e(TAG, "AudioRecord.read returned $n"); break }
        if (n > 0) handleChunk(chunk, n)
        if (pendingBoundary.get() != null) processBoundary()?.let { rec = it }
      }
      if (reason == null) {
        // Drain what the hardware already captured so the tail of the last word is kept.
        rec.stop()
        while (true) {
          val n = rec.read(chunk, 0, chunk.size, AudioRecord.READ_NON_BLOCKING)
          if (n <= 0) break
          emitWave(chunk, n)
          handleChunk(chunk, n)
        }
      }
    } catch (e: Throwable) {
      Log.e(TAG, "capture failed", e)
      reason = "error"
    }
    if (reason == null && pauseRequested && !stopRequested) {
      try {
        segment?.let { closeSegment(it) }
        releaseRecord()
        return // pause(): recording_paused is journaled by the caller after this thread ends
      } catch (e: Throwable) {
        Log.e(TAG, "closing segment at pause failed", e)
        reason = "error"
      }
    }
    finish(reason ?: stopReason)
  }

  /** Reads up to 100 ms in 20 ms steps so the live waveform advances at 25 Hz. Returns samples read or a negative error. */
  private fun readChunk(rec: AudioRecord, buf: ShortArray): Int {
    var filled = 0
    while (filled < buf.size && !stopRequested && !pauseRequested && pendingBoundary.get() == null) {
      val n = rec.read(buf, filled, minOf(WAVE_READ_SAMPLES, buf.size - filled), AudioRecord.READ_BLOCKING)
      if (n < 0) return n
      if (n > 0) {
        emitWave(buf, filled, n)
        filled += n
      }
    }
    return filled
  }

  private val waveOut = ArrayList<Int>()

  /** Emits peaks of the 40 ms blocks completed by these samples (onWave is not sent while paused). */
  private fun emitWave(buf: ShortArray, n: Int) = emitWave(buf, 0, n)

  private fun emitWave(buf: ShortArray, offset: Int, n: Int) {
    waveOut.clear()
    peakBlocks.add(buf, offset, n, waveOut)
    if (waveOut.isEmpty()) return
    Engine.emit("onWave", mapOf("peaksDbfsX100" to ArrayList(waveOut), "recordedMs" to peakBlocks.completedBlocks * 40L))
  }

  private fun handleChunk(buf: ShortArray, n: Int) {
    if (!anchored) anchor(n)
    val bytes = ByteArray(n * 2)
    ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().put(buf, 0, n)
    var seg = segment
    if (seg == null) seg = openSegment(totalSamples).also { segment = it }
    seg.out.write(bytes)
    seg.pcmDigest.update(bytes)
    seg.metrics.add(buf, 0, n)
    val closeNow = seg.boundary.feed(buf, 0, n)
    seg.samples += n
    seg.sinceSync += n
    val zs = zeroRun.add(buf, 0, n)
    if (zs != zeroSilenced) { zeroSilenced = zs; ioExecutor.execute { evaluateSilence() } }
    streamer?.feed(bytes, totalSamples)
    totalSamples += n

    var sumSq = 0.0
    for (i in 0 until n) sumSq += buf[i].toDouble() * buf[i]
    Engine.emit("onLevel", mapOf("rmsDbfsX100" to dbfsX100(sqrt(sumSq / n)), "elapsedMs" to elapsedMs))

    if (closeNow) {
      closeSegment(seg)
    } else if (seg.sinceSync >= Wav.SAMPLE_RATE) { // about every second
      seg.out.flush()
      seg.out.fd.sync()
      seg.sinceSync = 0
    }
  }

  private fun anchor(firstChunkSamples: Int) {
    val ts = AudioTimestamp()
    val rec = record!!
    val nowUs = SystemClock.elapsedRealtimeNanos() / 1000
    anchorUs = if (rec.getTimestamp(ts, AudioTimestamp.TIMEBASE_BOOTTIME) == AudioRecord.SUCCESS) {
      ts.nanoTime / 1000 - (ts.framePosition + totalSamples) * 1_000_000L / Wav.SAMPLE_RATE
    } else {
      nowUs - (totalSamples + firstChunkSamples) * 1_000_000L / Wav.SAMPLE_RATE // chunk just ended: back off by its length
    }
    anchorWallMs = System.currentTimeMillis() - (nowUs - anchorUs) / 1000
    anchored = true
  }

  private fun sampleToElapsedUs(sample: Long) = anchorUs + sample * 1_000_000L / Wav.SAMPLE_RATE

  private fun openSegment(startSample: Long): OpenSegment {
    val index = nextIndex++
    segmentIndex = index
    val file = File(recordingDir, "$index.wav")
    val out = FileOutputStream(file)
    out.write(Wav.placeholderHeader())
    out.flush()
    out.fd.sync()
    return OpenSegment(index, file, out, startSample)
  }

  private fun closeSegment(seg: OpenSegment) {
    segment = null
    seg.out.flush()
    seg.out.fd.sync()
    seg.out.close()
    val dataBytes = seg.samples * Wav.BYTES_PER_SAMPLE
    RandomAccessFile(seg.file, "rw").use { raf ->
      Wav.patchSizes(raf, dataBytes)
      raf.fd.sync()
    }
    // Read-back check: the hash that goes into the journal is the one of the bytes on disk, and the PCM part must
    // match the digest computed while writing.
    val back = Segments.readBack(seg.file)
    val writtenPcm = Hex.encode(seg.pcmDigest.digest())
    if (back.pcmSha256 != writtenPcm || back.length != Wav.HEADER_BYTES + dataBytes) {
      Log.e(TAG, "segment read-back mismatch for ${seg.file}: ${back.pcmSha256} vs $writtenPcm, len ${back.length}")
    }
    val startUs = sampleToElapsedUs(seg.startSample)
    val record = journal.append(
      "segment_closed", opts.memoId, opts.recordingId,
      Segments.closedFields(
        segmentId = Uuid7.generate(), index = seg.index, file = seg.file, sha256 = back.sha256, bytes = back.length,
        startElapsedUs = startUs, endElapsedUs = sampleToElapsedUs(seg.startSample + seg.samples),
        startWallMs = anchorWallMs + (startUs - anchorUs) / 1000, samples = seg.samples, metrics = seg.metrics,
        recovered = false,
      ),
    )
    Engine.notifyJournal(record)
  }

  private fun finish(reason: String) {
    var finalReason = reason
    try {
      segment?.let { closeSegment(it) }
    } catch (e: Throwable) {
      Log.e(TAG, "closing segment failed", e)
      finalReason = "error"
    }
    teardown()
    try {
      Engine.notifyJournal(
        journal.append("recording_stopped", opts.memoId, opts.recordingId, mapOf("reason" to finalReason, "location" to stopLocation)),
      )
    } catch (e: Throwable) {
      Log.e(TAG, "recording_stopped journal failed", e)
    }
    streamer?.finish()
    finished = true
    ioExecutor.shutdown()
    onFinished()
  }

  /** Stops and releases the AudioRecord (the mic indicator goes off) and its callbacks. Safe to call twice. */
  private fun releaseRecord(clearCommunication: Boolean = true) {
    val rec = record
    try { routeListener?.let { rec?.removeOnRoutingChangedListener(it) } } catch (_: Exception) {}
    routeListener = null
    try { recordingCallback?.let { audioManager.unregisterAudioRecordingCallback(it) } } catch (_: Exception) {}
    recordingCallback = null
    try { rec?.stop() } catch (_: Exception) {}
    try { rec?.release() } catch (_: Exception) {}
    record = null
    if (clearCommunication) clearCommunicationDevice()
  }

  private fun teardown() {
    releaseRecord()
    try { wakeLock?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
    wakeLock = null
  }

  companion object {
    private const val TAG = "FlRecording"
    const val WAVE_READ_SAMPLES = 320 // 20 ms
    const val CHUNK_SAMPLES = 1600 // 100 ms; divides the 300 ms boundary window and the 30 s hard close
  }
}

class CaptureStartException(message: String, cause: Throwable? = null) : Exception(message, cause)
