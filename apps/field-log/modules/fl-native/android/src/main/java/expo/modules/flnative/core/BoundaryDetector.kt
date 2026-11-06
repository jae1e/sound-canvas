package expo.modules.flnative.core

import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Segment boundary rule (api-v0 section 6): after [softCloseSeconds], close at the first [windowMs] window whose RMS is
 * at least [relativeDb] below the running median window RMS of the segment, or below [absoluteDbfs]. Hard close at
 * [hardCloseSeconds].
 *
 * Feed audio with [feed]; it returns true when the segment should be closed after the samples fed so far. The
 * decision is evaluated at window ends, so callers that feed blocks whose size divides the window (1,600 samples
 * divides 4,800) close exactly at the window end. Create a new detector for every segment.
 */
class BoundaryDetector(
  private val sampleRate: Int = Wav.SAMPLE_RATE,
  private val softCloseSeconds: Int = 20,
  private val hardCloseSeconds: Int = 30,
  windowMs: Int = 300,
  private val relativeDb: Double = 10.0,
  private val absoluteDbfs: Double = -45.0,
) {
  private val windowSamples = sampleRate * windowMs / 1000
  private var windowFill = 0
  private var windowSumSq = 0.0
  private val windowDb = ArrayList<Double>()
  var totalSamples = 0L; private set
  private var closeRequested = false

  fun feed(samples: ShortArray, offset: Int, length: Int): Boolean {
    for (i in offset until offset + length) {
      val s = samples[i].toDouble()
      windowSumSq += s * s
      totalSamples++
      if (++windowFill == windowSamples) {
        endWindow()
        windowFill = 0
        windowSumSq = 0.0
      }
    }
    if (totalSamples >= hardCloseSeconds.toLong() * sampleRate) closeRequested = true
    return closeRequested
  }

  private fun endWindow() {
    val rms = sqrt(windowSumSq / windowSamples)
    val db = if (rms <= 0.0) -120.0 else 20.0 * log10(rms / 32768.0)
    if (totalSamples >= softCloseSeconds.toLong() * sampleRate) {
      val belowMedian = windowDb.isNotEmpty() && db <= median(windowDb) - relativeDb
      if (belowMedian || db < absoluteDbfs) closeRequested = true
    }
    windowDb.add(db)
  }

  private fun median(values: List<Double>): Double {
    val sorted = values.sorted()
    val n = sorted.size
    return if (n % 2 == 1) sorted[n / 2] else (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0
  }
}
