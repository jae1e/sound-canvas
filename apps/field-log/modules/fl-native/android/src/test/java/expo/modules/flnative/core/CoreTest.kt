package expo.modules.flnative.core

import java.io.File
import java.io.RandomAccessFile
import kotlin.math.PI
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreTest {
  private fun tone(freq: Double, amp: Double, n: Int, start: Int = 0) =
    ShortArray(n) { (amp * sin(2 * PI * freq * (start + it) / 16000.0)).toInt().toShort() }

  @Test fun wavHeaderAndPatch() {
    val h = Wav.header(32000)
    assertEquals(44, h.size)
    assertEquals(36L + 32000, Wav.readLe32(h, 4))
    assertEquals(32000L, Wav.readLe32(h, 40))
    assertEquals(16000L, Wav.readLe32(h, 24))
    assertEquals(0xFFFFFFFFL, Wav.readLe32(Wav.placeholderHeader(), 40))
    assertEquals(0L, Wav.dataBytesForFileLength(30))
    assertEquals(4L, Wav.dataBytesForFileLength(44 + 5))
    val f = File.createTempFile("wav", ".wav")
    f.writeBytes(Wav.placeholderHeader() + ByteArray(100))
    RandomAccessFile(f, "rw").use { Wav.patchSizes(it, 100) }
    val b = f.readBytes()
    assertEquals(100L, Wav.readLe32(b, 40)); assertEquals(136L, Wav.readLe32(b, 4))
    f.delete()
  }

  @Test fun peakClippingAndSilence() {
    val m = SegmentMetrics()
    m.add(ShortArray(1024), 0, 1024)
    assertEquals(-9600, m.peakDbfsX100)
    assertEquals(0, m.hfRatio4kPpm)
    assertFalse(m.flags.contains("narrowband")) // no loud frames
    val c = ShortArray(512) { if (it % 2 == 0) 32767 else -32768 }
    m.add(c, 0, 512)
    assertEquals(512L, m.clippedSamples)
    assertEquals(0, m.peakDbfsX100)
    assertTrue(m.flags.contains("clipped"))
    val h = SegmentMetrics(); h.add(ShortArray(512) { 16384 }, 0, 512)
    assertEquals(-602, h.peakDbfsX100)
  }

  @Test fun highBandShare() {
    val low = SegmentMetrics(); low.add(tone(500.0, 8000.0, 4096), 0, 4096)
    assertTrue(low.hfRatio4kPpm < NARROWBAND_PPM_THRESHOLD)
    assertTrue(low.flags.contains("narrowband"))
    val high = SegmentMetrics(); high.add(tone(6000.0, 8000.0, 4096), 0, 4096)
    assertTrue(high.hfRatio4kPpm > 900_000)
    assertFalse(high.flags.contains("narrowband"))
    val quiet = SegmentMetrics(); quiet.add(tone(500.0, 20.0, 4096), 0, 4096) // about -64 dBFS
    assertEquals(0L, quiet.loudFrames)
  }

  @Test fun fftFindsTone() {
    val fft = Fft(512); val re = DoubleArray(512) { sin(2 * PI * 10 * it / 512) }; val im = DoubleArray(512)
    fft.transform(re, im)
    val mags = DoubleArray(257) { re[it] * re[it] + im[it] * im[it] }
    assertEquals(10, mags.indices.maxByOrNull { mags[it] })
  }

  private fun feedSeconds(d: BoundaryDetector, seconds: Double, amp: Double): Boolean {
    var closed = false
    var fed = 0
    val total = (seconds * 16000).toInt()
    while (fed < total) {
      val buf = tone(300.0, amp, 1600, fed)
      closed = d.feed(buf, 0, 1600)
      fed += 1600
      if (closed) break
    }
    return closed
  }

  @Test fun noCloseBeforeTwentySecondsOrWhileLoud() {
    val d = BoundaryDetector()
    assertFalse(feedSeconds(d, 19.9, 100.0)) // quiet-ish but before 20 s
    val d2 = BoundaryDetector()
    assertFalse(feedSeconds(d2, 29.5, 8000.0)) // steady loud: no boundary until the hard close
  }

  @Test fun closesAtQuietWindowAfterTwenty() {
    val d = BoundaryDetector()
    assertFalse(feedSeconds(d, 21.0, 8000.0))
    var closed = false
    var n = 0
    while (!closed && n < 20) { closed = d.feed(ShortArray(1600), 0, 1600); n++ }
    assertTrue(closed)
    assertTrue(d.totalSamples < 22 * 16000)
  }

  @Test fun relativeQuietWindowCloses() {
    val d = BoundaryDetector()
    assertFalse(feedSeconds(d, 20.1, 12000.0)) // about -11 dBFS
    var closed = false; var n = 0
    while (!closed && n < 20) { closed = d.feed(tone(300.0, 2000.0, 1600, n * 1600), 0, 1600); n++ } // -24 dBFS, 15 dB lower
    assertTrue(closed)
  }

  @Test fun hardCloseAtThirty() {
    val d = BoundaryDetector()
    assertTrue(feedSeconds(d, 40.0, 8000.0))
    assertEquals(30L * 16000, d.totalSamples)
  }

  @Test fun uuid7Format() {
    val u = Uuid7.generate(0x0123456789abL, java.util.Random(1))
    assertTrue(Regex("^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$").matches(u))
    assertTrue(u.startsWith("01234567-89ab-"))
    assertTrue(Uuid7.generate(1000) < Uuid7.generate(2000))
  }

  @Test fun sha256Hex() {
    assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", Hex.sha256("abc"))
  }
}
