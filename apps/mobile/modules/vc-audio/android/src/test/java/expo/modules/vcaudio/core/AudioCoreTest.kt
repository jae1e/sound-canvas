package expo.modules.vcaudio.core

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin

class AudioCoreTest {
  @Test fun beatFramesDoNotAccumulateRoundingError() {
    assertTrue(kotlin.math.abs(48000L * 60 * 1000 / 137 - BeatMath.beatFrame(1000, 137.0, 48000)) <= 1L)
    assertEquals(BeatMath.beatFrame(1000, 137.0, 48000), BeatMath.subdivisionFrame(4000, 137.0, 48000))
    assertEquals(1250.0, BeatMath.heardTimeMs(1000.0, 4800, 48000, 150.0), 0.0001)
    listOf("click", "eight", "sixteen", "ballad", "shuffle", "bossa", "hiphop").forEach {
      assertTrue(BeatMath.pattern(it).containsKey(0))
      assertTrue(BeatMath.pattern(it).keys.all { step -> step in 0..15 })
    }
  }

  @Test fun deviceKeyRequiresExactIdentityAndIgnoresPlatformId() {
    val phone = InputInfo(1, "builtin", "Phone", "")
    val headset = InputInfo(2, "bluetooth", "Buds", "abc")
    val key = DeviceKeyResolver.key(headset.type, headset.productName, "abc")
    assertEquals(headset.copy(id = 30), DeviceKeyResolver.resolve(key, listOf(phone, headset.copy(id = 30))))
    assertEquals(phone, DeviceKeyResolver.resolve(key, listOf(phone, headset.copy(addressHash = null))))
  }

  @Test fun decimatorMaintainsPhaseAcrossChunks() {
    val input = ShortArray(4800) { (10000 * sin(2 * PI * 440 * it / 48000)).toInt().toShort() }
    val expected = Resampler().process(input)
    val streaming = Resampler()
    val actual = input.toList().chunked(137).flatMap { streaming.process(it.toShortArray()).toList() }.toShortArray()
    assertArrayEquals(expected, actual)
    assertEquals(1600, actual.size)
  }

  @Test fun decimatorRejectsAboveNyquist() {
    val input = ShortArray(12000) { (16000 * sin(2 * PI * 12000 * it / 48000)).toInt().toShort() }
    val output = Resampler().process(input).drop(100)
    val rms = kotlin.math.sqrt(output.map { it.toDouble() * it }.average())
    assertTrue("aliased RMS $rms", rms < 500)
  }

  @Test fun reviewReturnsAlignedColumnsAndEmptyMetricsForSilence() {
    val result = ReviewAnalysis.analyze(WavData(48000, ShortArray(48000)), 20, 8, listOf(0.0))
    assertEquals(20, (result["tMs"] as List<*>).size)
    assertEquals((result["tMs"] as List<*>).size, (result["midi"] as List<*>).size)
    assertEquals(8, (result["peaks"] as List<*>).size)
    assertNull(result["stabilityCents"])
    assertNull(result["beatOffsetMs"])
    assertNull(result["pitchSpreadSemitones"])
  }

  @Test fun reviewMeasuresVoiceOnsetAgainstBeat() {
    val samples = ShortArray(48000) { i ->
      if (i in 19200 until 38400) (15000 * sin(2 * PI * 440 * i / 48000)).toInt().toShort() else 0
    }
    val result = ReviewAnalysis.analyze(WavData(48000, samples), 3000, 10, listOf(300.0))
    val offset = result["beatOffsetMs"] as Double
    assertTrue("onset offset $offset", offset in 60.0..140.0)
    assertTrue((result["rangeLowMidi"] as Double) in 68.0..70.0)
  }

  @Test fun wavHeaderIsFlushedBeforeClose() {
    val file = java.io.File("build/test-crash-safe.wav")
    file.parentFile.mkdirs()
    try {
      val writer = WavWriter(file, 48000)
      writer.write(ShortArray(48000), 48000)
      val size = java.io.RandomAccessFile(file, "r").use { it.seek(40); Integer.reverseBytes(it.readInt()) }
      assertEquals(96000, size)
      writer.close()
    } finally { file.delete() }
  }

  @Test fun steadyDigitalSilenceIsDetectedAsAPause() {
    val points = List(50) { SpeechAnalysis.Point(it * 20.0, -100.0, false) }
    val result = SpeechAnalysis.analyze(points, 1000.0)
    assertEquals(listOf(SpeechAnalysis.Pause(0.0, 1000.0)), result.pauses)
    assertTrue(result.syllables.isEmpty())
  }

  @Test fun pausesAndVoicedPeaks() {
    val levels = List(20) { -70.0 } + List(10) { -20.0 } + List(20) { -70.0 } + List(10) { -20.0 } + List(20) { -70.0 }
    val points = levels.mapIndexed { i, db -> SpeechAnalysis.Point(i * 20.0, db, db > -30) }
    val result = SpeechAnalysis.analyze(points, 1600.0)
    assertEquals(2, result.syllables.size)
    assertEquals(3, result.pauses.size)
    assertEquals(600.0, result.pauses[1].startMs, 0.01)
    assertEquals(1000.0, result.pauses[1].endMs, 0.01)
  }
}
