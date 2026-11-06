package expo.modules.flnative.core

import kotlin.math.max

/** Peak level (max |sample|) in dBFS x 100, integer; -9600 for digital zero. */
fun peakDbfsX100(maxAbs: Int): Int = if (maxAbs <= 0) SILENCE_DBFS_X100 else dbfsX100(maxAbs.toDouble())

private fun absOf(s: Short): Int { val v = s.toInt(); return if (v < 0) -v else v }

/** Splits a sample stream into fixed blocks (40 ms = 640 samples) and yields the peak level of each complete block. */
class PeakBlocks(private val blockSamples: Int = 640) {
  private var fill = 0
  private var blockMax = 0
  var completedBlocks = 0L; private set

  /** Appends the peak of every block completed by these samples to [out]. */
  fun add(samples: ShortArray, offset: Int, length: Int, out: MutableList<Int>) {
    for (i in offset until offset + length) {
      blockMax = max(blockMax, absOf(samples[i]))
      if (++fill == blockSamples) {
        out.add(peakDbfsX100(blockMax))
        completedBlocks++
        fill = 0
        blockMax = 0
      }
    }
  }
}

/** Max-|sample| level per bucket over [totalSamples] samples split into [buckets] equal slices. */
class WaveformBucketer(private val totalSamples: Long, private val buckets: Int) {
  private val maxAbs = IntArray(maxOf(buckets, 0))
  private var index = 0L

  fun add(samples: ShortArray, offset: Int, length: Int) {
    if (buckets <= 0 || totalSamples <= 0) return
    for (i in offset until offset + length) {
      if (index >= totalSamples) return
      val b = (index * buckets / totalSamples).toInt()
      val a = absOf(samples[i])
      if (a > maxAbs[b]) maxAbs[b] = a
      index++
    }
  }

  fun result(): IntArray = IntArray(maxAbs.size) { peakDbfsX100(maxAbs[it]) }
}

/** Detects a run of exact zeros (a silenced capture delivers all-zero PCM). */
class ZeroRunDetector(private val thresholdSamples: Long = 24_000) { // 1.5 s at 16 kHz
  var run = 0L; private set

  /** Feeds samples; returns true while the current zero run is at least the threshold. */
  fun add(samples: ShortArray, offset: Int, length: Int): Boolean {
    for (i in offset until offset + length) run = if (samples[i].toInt() == 0) run + 1 else 0
    return run >= thresholdSamples
  }

  fun reset() { run = 0 }
}
