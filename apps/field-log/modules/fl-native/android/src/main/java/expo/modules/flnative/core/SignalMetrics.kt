package expo.modules.flnative.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.log10
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Provisional: a segment is flagged "narrowband" when its share of >= 4 kHz energy (over loud frames) is below this
 * many parts per million. To be tuned from the week-1 measurements (mvp-requirements A3).
 */
const val NARROWBAND_PPM_THRESHOLD = 1000

/** Peak level reported for digital silence, in dBFS x 100. */
const val SILENCE_DBFS_X100 = -9600

/** dBFS x 100 (integer) of a linear RMS/peak amplitude in sample units (full scale = 32768). */
fun dbfsX100(amplitude: Double): Int {
  if (amplitude <= 0.0) return SILENCE_DBFS_X100
  val v = (20.0 * log10(amplitude / 32768.0) * 100.0).roundToInt()
  return v.coerceIn(SILENCE_DBFS_X100, 0)
}

/** Small in-place radix-2 FFT. */
class Fft(val size: Int) {
  private val cosT = DoubleArray(size / 2) { cos(-2.0 * PI * it / size) }
  private val sinT = DoubleArray(size / 2) { sin(-2.0 * PI * it / size) }
  private val rev = IntArray(size)

  init {
    require(size >= 2 && size and (size - 1) == 0) { "size must be a power of two" }
    val bits = Integer.numberOfTrailingZeros(size)
    for (i in 0 until size) rev[i] = Integer.reverse(i) ushr (32 - bits)
  }

  fun transform(re: DoubleArray, im: DoubleArray) {
    for (i in 0 until size) {
      val j = rev[i]
      if (j > i) {
        val tr = re[i]; re[i] = re[j]; re[j] = tr
        val ti = im[i]; im[i] = im[j]; im[j] = ti
      }
    }
    var len = 2
    while (len <= size) {
      val half = len / 2
      val step = size / len
      var start = 0
      while (start < size) {
        var k = 0
        for (j in start until start + half) {
          val wr = cosT[k]; val wi = sinT[k]
          val xr = re[j + half] * wr - im[j + half] * wi
          val xi = re[j + half] * wi + im[j + half] * wr
          re[j + half] = re[j] - xr; im[j + half] = im[j] - xi
          re[j] += xr; im[j] += xi
          k += step
        }
        start += len
      }
      len = len shl 1
    }
  }
}

/**
 * Incremental per-segment signal-quality metrics (api-v0 section 3, `segment_closed`):
 * peak level, clipped sample count and the share of energy at >= 4 kHz over loud frames.
 */
class SegmentMetrics {
  companion object {
    const val FRAME = 512
    const val LOUD_FRAME_DBFS = -50.0
    /** First bin at or above 4 kHz for a 512-point FFT at 16 kHz (31.25 Hz per bin). */
    const val HF_FIRST_BIN = 128
    private val fft = ThreadLocal.withInitial { Fft(FRAME) }
    private val window = DoubleArray(FRAME) { 0.5 - 0.5 * cos(2.0 * PI * it / FRAME) }
  }

  private var peak = 0
  var clippedSamples = 0L; private set
  var loudFrames = 0L; private set
  private var hfEnergy = 0.0
  private var totalEnergy = 0.0
  private val frame = ShortArray(FRAME)
  private var frameFill = 0
  private val re = DoubleArray(FRAME)
  private val im = DoubleArray(FRAME)

  fun add(samples: ShortArray, offset: Int, length: Int) {
    for (i in offset until offset + length) {
      val s = samples[i].toInt()
      val a = if (s < 0) -s else s
      if (a > peak) peak = a
      if (s == 32767 || s == -32768) clippedSamples++
      frame[frameFill++] = samples[i]
      if (frameFill == FRAME) {
        processFrame()
        frameFill = 0
      }
    }
  }

  private fun processFrame() {
    var sumSq = 0.0
    for (s in frame) sumSq += s.toDouble() * s
    val rms = sqrt(sumSq / FRAME)
    if (rms <= 0.0 || 20.0 * log10(rms / 32768.0) <= LOUD_FRAME_DBFS) return
    loudFrames++
    for (i in 0 until FRAME) { re[i] = frame[i] * window[i]; im[i] = 0.0 }
    fft.get()!!.transform(re, im)
    for (k in 1..FRAME / 2) { // bin 0 (DC) excluded
      val e = re[k] * re[k] + im[k] * im[k]
      totalEnergy += e
      if (k >= HF_FIRST_BIN) hfEnergy += e
    }
  }

  val peakDbfsX100: Int get() = if (peak == 0) SILENCE_DBFS_X100 else dbfsX100(peak.toDouble())

  val hfRatio4kPpm: Int
    get() = if (loudFrames == 0L || totalEnergy <= 0.0) 0 else (hfEnergy / totalEnergy * 1_000_000.0).roundToInt()

  val flags: List<String>
    get() = buildList {
      if (clippedSamples > 0) add("clipped")
      if (loudFrames > 0 && hfRatio4kPpm < NARROWBAND_PPM_THRESHOLD) add("narrowband")
    }
}
