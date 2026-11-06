package expo.modules.flnative.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PeaksTest {
  @Test fun peakBlocksSplitAcrossCalls() {
    val pb = PeakBlocks(640)
    val out = ArrayList<Int>()
    pb.add(ShortArray(500), 0, 500, out)
    assertTrue(out.isEmpty())
    val b = ShortArray(800); b[100] = -16384 // lands in the first block (sample 600 overall)
    pb.add(b, 0, 800, out)
    assertEquals(listOf(-602, -9600), out) // block 0 holds samples 0..639 including sample 600; block 1 is zeros
  }

  @Test fun peakBlocksValues() {
    val pb = PeakBlocks(4)
    val out = ArrayList<Int>()
    pb.add(shortArrayOf(0, 0, 0, 0, 16384, 0, 0, -32768, 1, 2, 3), 0, 11, out)
    assertEquals(2, pb.completedBlocks.toInt())
    assertEquals(listOf(-9600, 0), out)
  }

  @Test fun halfScaleIsMinus602() {
    val out = ArrayList<Int>()
    PeakBlocks(2).add(shortArrayOf(16384, 0), 0, 2, out)
    assertEquals(listOf(-602), out)
  }

  @Test fun waveformBucketing() {
    val s = ShortArray(100) { 0 }
    s[5] = 8192; s[55] = -32768; s[99] = 100
    val w = WaveformBucketer(100, 4)
    w.add(s, 0, 60); w.add(s, 60, 40) // split across calls
    val r = w.result()
    assertEquals(4, r.size)
    assertEquals(-1204, r[0]); assertEquals(0, r[2]); assertEquals(-9600, r[1])
    assertEquals(peakDbfsX100(100), r[3])
  }

  @Test fun waveformMoreBucketsThanSamples() {
    val w = WaveformBucketer(2, 4)
    w.add(shortArrayOf(1000, 0), 0, 2)
    val r = w.result()
    assertEquals(4, r.size)
    assertTrue(r[0] > -9600); assertEquals(-9600, r[1]); assertEquals(-9600, r[3])
    assertEquals(0, WaveformBucketer(10, 0).result().size)
  }

  @Test fun zeroRunSilence() {
    val d = ZeroRunDetector(24_000)
    assertFalse(d.add(ShortArray(23_999), 0, 23_999))
    assertTrue(d.add(ShortArray(1), 0, 1))
    assertTrue(d.add(ShortArray(500), 0, 500))
    assertFalse(d.add(shortArrayOf(1), 0, 1)) // any non-zero sample ends the run
    assertEquals(0L, d.run)
    d.add(ShortArray(24_000), 0, 24_000)
    d.reset()
    assertFalse(d.add(ShortArray(10), 0, 10))
  }

  @Test fun zeroRunBrokenResets() {
    val d = ZeroRunDetector(10)
    d.add(ShortArray(9), 0, 9)
    d.add(shortArrayOf(5), 0, 1)
    assertFalse(d.add(ShortArray(9), 0, 9))
  }
}
