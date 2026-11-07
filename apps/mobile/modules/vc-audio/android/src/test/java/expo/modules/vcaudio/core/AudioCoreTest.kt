package expo.modules.vcaudio.core

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin

class AudioCoreTest {
  @Test fun beatFramesDoNotAccumulateRoundingError() {
    assertTrue(kotlin.math.abs(48000L * 60 * 1000 / 137 - BeatMath.beatFrame(1000, 137.0, 48000)) <= 1L)
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
