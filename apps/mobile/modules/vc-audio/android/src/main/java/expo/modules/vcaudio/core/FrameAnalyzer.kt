package expo.modules.vcaudio.core

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/** One analysis frame. f0 is null when unvoiced. Mirrors `Frame` in @vlc/voice-analysis. */
data class PitchFrame(
  val t: Double,
  val f0: Double?,
  val voicing: Double,
  val rmsDb: Double,
  val centroid: Double,
  val hnrDb: Double,
)

/**
 * Per-frame DSP: YIN pitch (with a short-term octave guard), RMS dBFS, spectral centroid and an HNR estimate.
 * The window is ~43 ms. Pitch runs on a copy decimated to ~16 kHz (box filter) to keep 48 kHz capture cheap; the
 * centroid uses the full-rate window. Not thread safe: use one instance per stream. The YIN core mirrors
 * `packages/voice-analysis/src/yin.ts`, which is what the unit tests exercise.
 */
class FrameAnalyzer(val sampleRate: Int) {
  val windowSize: Int = ((0.043 * sampleRate).roundToInt() / 2) * 2
  private val factor = max(1, sampleRate / 16000)
  private val pitchRate = sampleRate.toDouble() / factor
  private val pitchLen = windowSize / factor
  private val pitchBuf = FloatArray(pitchLen)
  private val tauMin = max(2, floor(pitchRate / MAX_HZ).toInt())
  private val tauMax = min(floor(pitchRate / MIN_HZ).toInt(), pitchLen / 2 - 2)
  private val dp = DoubleArray(tauMax + 2)
  private val fftSize = Integer.highestOneBit(windowSize - 1) shl 1
  private val re = DoubleArray(fftSize)
  private val im = DoubleArray(fftSize)
  private val hann = DoubleArray(windowSize) { 0.5 - 0.5 * cos(2 * PI * it / (windowSize - 1)) }
  private val cosT = DoubleArray(fftSize / 2) { cos(-2 * PI * it / fftSize) }
  private val sinT = DoubleArray(fftSize / 2) { sin(-2 * PI * it / fftSize) }

  // Octave guard state.
  private var lastF0 = 0.0
  private var lastVoicing = 0.0
  private var sinceVoiced = 1000

  /** [window] must hold [windowSize] samples normalised to -1..1. */
  fun analyze(t: Double, window: FloatArray): PitchFrame {
    var s = 0.0
    for (i in 0 until windowSize) s += window[i].toDouble() * window[i]
    val rmsDb = 20 * log10(max(sqrt(s / windowSize), 1e-6))
    if (rmsDb < SILENCE_GATE_DB) {
      sinceVoiced++
      return PitchFrame(t, null, 0.0, rmsDb, 0.0, -20.0)
    }
    for (i in 0 until pitchLen) {
      var a = 0f
      for (k in 0 until factor) a += window[i * factor + k]
      pitchBuf[i] = a / factor
    }
    val y = yin()
    var f0 = y.first
    val voicing = y.second
    if (f0 != null) {
      // Octave guard: right after a voiced frame, a jump of ~1 octave without clearly better voicing is an error.
      if (sinceVoiced <= 3 && lastF0 > 0 && voicing < lastVoicing + 0.05) {
        val ratio = f0 / lastF0
        if (abs(ln(ratio / 2.0)) < 0.07) f0 /= 2.0 else if (abs(ln(ratio * 2.0)) < 0.07) f0 *= 2.0
      }
      lastF0 = f0
      lastVoicing = voicing
      sinceVoiced = 0
    } else sinceVoiced++
    return PitchFrame(t, f0, voicing, rmsDb, centroid(window), hnrDb(voicing))
  }

  fun reset() { lastF0 = 0.0; lastVoicing = 0.0; sinceVoiced = 1000 }

  /** Returns (f0 or null, voicing 0..1). Mirrors yin.ts. */
  private fun yin(): Pair<Double?, Double> {
    if (tauMax <= tauMin + 2) return null to 0.0
    val w = pitchLen / 2
    dp[0] = 1.0
    var run = 0.0
    for (tau in 1..tauMax + 1) {
      var sum = 0.0
      for (i in 0 until w) {
        val d = (pitchBuf[i] - pitchBuf[i + tau]).toDouble()
        sum += d * d
      }
      run += sum
      dp[tau] = if (run > 0) sum * tau / run else 1.0
    }
    var best = -1
    var chosen = -1
    // First pass: global minimum among local minima.
    for (tau in tauMin..tauMax) {
      if (dp[tau] < dp[tau - 1] && dp[tau] <= dp[tau + 1] && (best < 0 || dp[tau] < dp[best])) best = tau
    }
    if (best < 0) return null to 0.0
    // Second pass: the shortest dip within 0.1 of the global minimum (protects against sub-octave errors).
    for (tau in tauMin..tauMax) {
      if (dp[tau] < dp[tau - 1] && dp[tau] <= dp[tau + 1] && dp[tau] <= dp[best] + 0.1) { chosen = tau; break }
    }
    val v = dp[chosen]
    val voicing = (1 - v).coerceIn(0.0, 1.0)
    if (v > YIN_THRESHOLD) return null to voicing
    var tauF = chosen.toDouble()
    val a = dp[chosen - 1]; val b = dp[chosen]; val c = dp[chosen + 1]
    val den = a - 2 * b + c
    if (abs(den) > 1e-12) tauF = chosen + (a - c) / (2 * den)
    return pitchRate / tauF to voicing
  }

  /** HNR from the normalised autocorrelation peak r = 1 - d'(tau): 10 log10(r / (1 - r)). */
  private fun hnrDb(voicing: Double): Double {
    val r = voicing.coerceIn(0.001, 0.999)
    return 10 * log10(r / (1 - r))
  }

  private fun centroid(window: FloatArray): Double {
    for (i in 0 until fftSize) { re[i] = if (i < windowSize) window[i] * hann[i] else 0.0; im[i] = 0.0 }
    fft()
    var num = 0.0; var den = 0.0
    val binHz = sampleRate.toDouble() / fftSize
    for (k in 1 until fftSize / 2) {
      val mag = hypot(re[k], im[k])
      num += mag * k * binHz; den += mag
    }
    return if (den > 1e-9) num / den else 0.0
  }

  private fun fft() {
    val n = fftSize
    var j = 0
    for (i in 1 until n) {
      var bit = n shr 1
      while (j and bit != 0) { j = j xor bit; bit = bit shr 1 }
      j = j xor bit
      if (i < j) { val tr = re[i]; re[i] = re[j]; re[j] = tr; val ti = im[i]; im[i] = im[j]; im[j] = ti }
    }
    var len = 2
    while (len <= n) {
      val half = len / 2
      val stride = n / len
      var i = 0
      while (i < n) {
        for (k in 0 until half) {
          val wr = cosT[k * stride]; val wi = sinT[k * stride]
          val a = i + k; val b = a + half
          val tr = re[b] * wr - im[b] * wi
          val ti = re[b] * wi + im[b] * wr
          re[b] = re[a] - tr; im[b] = im[a] - ti
          re[a] += tr; im[a] += ti
        }
        i += len
      }
      len = len shl 1
    }
  }

  companion object {
    const val MIN_HZ = 70.0
    const val MAX_HZ = 1200.0
    const val YIN_THRESHOLD = 0.15
    const val SILENCE_GATE_DB = -60.0
    /** Analysis hop in seconds (40 Hz frame events). */
    const val HOP_S = 0.025
  }
}
