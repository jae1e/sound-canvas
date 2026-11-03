package expo.modules.vlcvoicecoach

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Process
import java.io.File
import kotlin.math.ln

/** What the capture ended up using; reported to JS so the UI can say whether voice processing is off. */
data class CaptureInfo(val sampleRate: Int, val source: String)

/**
 * One AudioRecord shared by the live monitor and take recording (mono PCM16). Prefers 48 kHz, then 16 kHz, and the
 * sources UNPROCESSED -> MIC -> VOICE_RECOGNITION: voice processing (AGC, noise suppression, VOICE_COMMUNICATION
 * AEC) distorts pitch and level. The capture runs while either the monitor or a take wants it.
 */
class VoiceCapture(
  private val context: Context,
  private val onFrame: (frame: PitchFrame, noteName: String?, cents: Double?) -> Unit,
  private val onError: (String) -> Unit,
) {
  private val lock = Any()
  private class Run(val rec: AudioRecord, val info: CaptureInfo) { @Volatile var active = true }
  private var current: Run? = null
  private var wantMonitor = false
  private var wantTake = false
  private var writer: WavWriter? = null
  val isActive get() = synchronized(lock) { current != null }

  /** Starts (or joins) the capture. Returns the info once the recorder is open. */
  fun requestMonitor(): CaptureInfo = synchronized(lock) {
    wantMonitor = true
    ensureRunning()
  }

  fun releaseMonitor() = synchronized(lock) {
    wantMonitor = false
    stopIfIdle()
  }

  fun beginTake(file: File): CaptureInfo = synchronized(lock) {
    check(writer == null) { "A take is already recording" }
    val i = ensureRunning()
    writer = WavWriter(file, i.sampleRate)
    wantTake = true
    i
  }

  /** Finishes the take file. Returns its duration in seconds. */
  fun endTake(): Double = synchronized(lock) {
    val w = writer ?: return 0.0
    writer = null
    wantTake = false
    w.close()
    stopIfIdle()
    w.durationS
  }

  fun shutdown() = synchronized(lock) {
    wantMonitor = false
    writer?.close(); writer = null; wantTake = false
    stopIfIdle()
  }

  /** Signals the capture thread to stop; it releases the recorder itself. A restart opens a fresh recorder. */
  private fun stopIfIdle() {
    if (wantMonitor || wantTake) return
    current?.active = false
    current = null
  }

  private fun ensureRunning(): CaptureInfo {
    current?.let { return it.info }
    val (rec, i) = openRecorder() ?: throw IllegalStateException("No usable AudioRecord (permission denied or microphone busy)")
    val run = Run(rec, i)
    current = run
    Thread({ loop(run) }, "vlc-voice-coach-capture").start()
    return i
  }

  @SuppressLint("MissingPermission")
  private fun openRecorder(): Pair<AudioRecord, CaptureInfo>? {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val unprocessedOk = am.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true"
    val sources = buildList {
      if (unprocessedOk) add(MediaRecorder.AudioSource.UNPROCESSED to "UNPROCESSED")
      add(MediaRecorder.AudioSource.MIC to "MIC")
      add(MediaRecorder.AudioSource.VOICE_RECOGNITION to "VOICE_RECOGNITION")
    }
    for ((src, name) in sources) for (rate in intArrayOf(48000, 16000)) {
      val minBuf = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
      if (minBuf <= 0) continue
      val rec = try {
        AudioRecord.Builder()
          .setAudioSource(src)
          .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_IN_MONO).build())
          .setBufferSizeInBytes(maxOf(minBuf * 2, rate)) // >= 0.5 s
          .build()
      } catch (_: Exception) { null } ?: continue
      if (rec.state == AudioRecord.STATE_INITIALIZED && rec.sampleRate == rate) return rec to CaptureInfo(rate, name)
      rec.release()
    }
    return null
  }

  private fun loop(run: Run) {
    val rec = run.rec
    val i = run.info
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val an = FrameAnalyzer(i.sampleRate)
    val hop = (FrameAnalyzer.HOP_S * i.sampleRate).toInt()
    val win = an.windowSize
    val chunk = ShortArray(hop)
    val window = FloatArray(win)
    var total = 0L
    try {
      rec.startRecording()
      while (run.active) {
        var got = 0
        while (got < hop && run.active) {
          val n = rec.read(chunk, got, hop - got)
          if (n < 0) { onError("AudioRecord.read returned $n"); run.active = false; break }
          got += n
        }
        if (got < hop) break
        synchronized(lock) { if (current === run) writer?.write(chunk, hop) }
        System.arraycopy(window, hop, window, 0, win - hop)
        for (k in 0 until hop) window[win - hop + k] = chunk[k] / 32768f
        total += hop
        if (total < win) continue
        val f = an.analyze((total - win / 2.0) / i.sampleRate, window)
        var name: String? = null
        var cents: Double? = null
        if (f.f0 != null && f.voicing >= 0.5) {
          val midiExact = 69 + 12 * ln(f.f0 / 440.0) / ln(2.0)
          val midi = Math.round(midiExact).toInt()
          name = NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floorDiv(midi, 12) - 1)
          cents = (midiExact - midi) * 100
        }
        onFrame(f, name, cents)
      }
    } catch (e: Exception) {
      onError(e.message ?: e.javaClass.simpleName)
    } finally {
      try { rec.stop() } catch (_: Exception) { }
      rec.release()
      run.active = false
      synchronized(lock) {
        // A failure while a take was open: close the file so it stays playable.
        if (current === run) {
          writer?.close(); writer = null; wantTake = false; wantMonitor = false; current = null
        }
      }
    }
  }

  companion object {
    val NOTE_NAMES = arrayOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
  }
}
