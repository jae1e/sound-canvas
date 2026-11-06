package expo.modules.flnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import expo.modules.flnative.core.Wav
import java.io.File
import java.io.RandomAccessFile
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Plays WAV segment files back to back through an AudioTrack. It follows the system output route and media volume:
 * this class never calls setSpeakerphoneOn, setCommunicationDevice or setPreferredDevice and never changes the audio mode.
 */
class Player(private val context: Context, private val emit: (Map<String, Any?>) -> Unit) {
  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val lock = Object()

  private var files: List<File> = emptyList()
  private var fileSamples = LongArray(0)
  private var totalSamples = 0L

  @Volatile var state = "idle"; private set
  @Volatile private var track: AudioTrack? = null
  @Volatile private var paused = false
  @Volatile private var stopFlag = false
  @Volatile private var seekTargetMs = -1L
  @Volatile private var baseSample = 0L
  @Volatile private var headAtBase = 0
  @Volatile private var fileIndex = 0
  @Volatile private var lastSample = 0L
  private var worker: Thread? = null
  private var ticker: ScheduledExecutorService? = null
  private var focusRequest: AudioFocusRequest? = null
  private var noisyReceiver: BroadcastReceiver? = null

  private val attributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
    .build()

  @Synchronized
  fun play(list: List<File>, startMs: Long) {
    stopInternal(emitIdle = false)
    for (f in list) if (!f.isFile) throw IllegalArgumentException("Missing file: $f")
    files = list
    fileSamples = LongArray(list.size) { Wav.dataBytesForFileLength(list[it].length()) / Wav.BYTES_PER_SAMPLE }
    totalSamples = fileSamples.sum()
    val start = (startMs * Wav.SAMPLE_RATE / 1000).coerceIn(0, totalSamples)

    val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      .setAudioAttributes(attributes)
      .setOnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) pause()
      }
      .build()
    if (audioManager.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      throw IllegalStateException("Audio focus was not granted")
    }
    focusRequest = focus

    val minBuf = AudioTrack.getMinBufferSize(16000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val t = AudioTrack.Builder()
      .setAudioAttributes(attributes)
      .setAudioFormat(
        AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(16000)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(),
      )
      .setTransferMode(AudioTrack.MODE_STREAM)
      .setBufferSizeInBytes(maxOf(minBuf, 16000)) // at least 0.5 s
      .build()
    track = t
    paused = false
    stopFlag = false
    seekTargetMs = -1
    baseSample = start
    lastSample = start
    fileIndex = 0
    state = "playing"

    val receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, i: Intent?) { pause() } // headphones unplugged
    }
    noisyReceiver = receiver
    context.registerReceiver(receiver, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))

    worker = Thread({ run(t, start) }, "fl-play").also { it.start() }
    ticker = Executors.newSingleThreadScheduledExecutor().also {
      it.scheduleAtFixedRate({ if (state == "playing") emitState() }, 50, 50, TimeUnit.MILLISECONDS)
    }
    emitState()
  }

  fun pause() {
    synchronized(lock) {
      if (state != "playing") return
      paused = true
      state = "paused"
      try { track?.pause() } catch (_: Exception) {}
    }
    emitState()
  }

  fun resume() {
    synchronized(lock) {
      if (state != "paused") return
      paused = false
      state = "playing"
      try { track?.play() } catch (_: Exception) {}
      lock.notifyAll()
    }
    emitState()
  }

  fun seek(positionMs: Long) {
    synchronized(lock) {
      if (state != "playing" && state != "paused") return
      seekTargetMs = positionMs.coerceIn(0, totalSamples * 1000L / Wav.SAMPLE_RATE)
      lastSample = seekTargetMs * Wav.SAMPLE_RATE / 1000
      // A paused track can leave the worker blocked in write(); flushing releases it.
      if (paused) try { track?.flush() } catch (_: Exception) {}
      lock.notifyAll()
    }
    emitState()
  }

  @Synchronized
  fun stop() = stopInternal(emitIdle = true)

  private fun stopInternal(emitIdle: Boolean) {
    val w = worker
    val hadPlayback = track != null
    stopFlag = true
    synchronized(lock) {
      try { track?.pause(); track?.flush() } catch (_: Exception) {}
      lock.notifyAll()
    }
    if (w != null && w !== Thread.currentThread()) w.join(2000)
    worker = null
    release()
    if (emitIdle && hadPlayback) {
      state = "idle"
      emitState()
    } else {
      state = "idle"
    }
  }

  private fun release() {
    ticker?.shutdownNow(); ticker = null
    noisyReceiver?.let { try { context.unregisterReceiver(it) } catch (_: Exception) {} }
    noisyReceiver = null
    focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    focusRequest = null
    val t = track
    track = null
    try { t?.stop() } catch (_: Exception) {}
    try { t?.release() } catch (_: Exception) {}
  }

  private fun positionSamples(): Long {
    if (state == "ended") return totalSamples
    val t = track ?: return lastSample
    return try {
      (baseSample + (t.playbackHeadPosition - headAtBase)).coerceIn(0, totalSamples).also { if (!paused || seekTargetMs < 0) lastSample = it }
    } catch (_: Exception) { lastSample }
  }

  private fun emitState(error: String? = null) {
    val m = HashMap<String, Any?>()
    m["state"] = state
    m["positionMs"] = positionSamples() * 1000L / Wav.SAMPLE_RATE
    m["durationMs"] = totalSamples * 1000L / Wav.SAMPLE_RATE
    m["index"] = fileIndex
    if (error != null) m["error"] = error
    emit(m)
  }

  // ---- worker -----------------------------------------------------------------------------------------------

  private fun run(t: AudioTrack, startSample: Long) {
    var cursor = startSample
    var raf: RandomAccessFile? = null
    var openIndex = -1
    val buf = ByteArray(3200)
    try {
      headAtBase = t.playbackHeadPosition
      t.play()
      var written = 0L
      while (!stopFlag) {
        synchronized(lock) {
          while (paused && seekTargetMs < 0 && !stopFlag) lock.wait(100)
        }
        if (stopFlag) break
        val seek = seekTargetMs
        if (seek >= 0) {
          seekTargetMs = -1
          cursor = (seek * Wav.SAMPLE_RATE / 1000).coerceIn(0, totalSamples)
          t.pause(); t.flush()
          baseSample = cursor
          headAtBase = t.playbackHeadPosition
          written = 0
          lastSample = cursor
          raf?.close(); raf = null; openIndex = -1
          if (!paused) t.play()
          emitState()
          continue
        }
        if (cursor >= totalSamples) {
          // Everything is queued: wait until the head reaches the end, then report 'ended'.
          if (t.playbackHeadPosition - headAtBase >= written || written == 0L) {
            state = "ended"
            emitState()
            break
          }
          Thread.sleep(20)
          continue
        }
        var idx = 0
        var fileStart = 0L
        while (idx < files.size - 1 && cursor >= fileStart + fileSamples[idx]) { fileStart += fileSamples[idx]; idx++ }
        if (idx != openIndex) {
          raf?.close()
          raf = RandomAccessFile(files[idx], "r")
          openIndex = idx
          fileIndex = idx
        }
        val inFile = cursor - fileStart
        val toRead = minOf((buf.size / 2).toLong(), fileSamples[idx] - inFile).toInt()
        if (toRead <= 0) { cursor = fileStart + fileSamples[idx]; continue }
        raf!!.seek(Wav.HEADER_BYTES + inFile * 2)
        raf.readFully(buf, 0, toRead * 2)
        val n = t.write(buf, 0, toRead * 2, AudioTrack.WRITE_BLOCKING)
        if (n < 0) throw IllegalStateException("AudioTrack.write returned $n")
        val samples = n / 2
        cursor += samples
        written += samples
      }
    } catch (e: Throwable) {
      Log.w(TAG, "playback failed", e)
      state = "error"
      emitState(e.message ?: e.toString())
    } finally {
      try { raf?.close() } catch (_: Exception) {}
      if (!stopFlag) { // finished by itself (ended or error): free the focus and track now
        Thread { synchronized(this@Player) { releaseIfFinished() } }.start()
      }
    }
  }

  private fun releaseIfFinished() {
    if (state == "ended" || state == "error") release()
  }

  companion object { private const val TAG = "FlPlayer" }
}
