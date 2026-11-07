package expo.modules.vcaudio.core

import kotlin.math.roundToLong

/** Events are placed by absolute frame index, avoiding per-beat rounding drift. */
object BeatMath {
  fun beatFrame(index: Long, bpm: Double, sampleRate: Int): Long {
    require(index >= 0 && bpm in 30.0..240.0 && sampleRate > 0)
    return (index * sampleRate * 60.0 / bpm).roundToLong()
  }
  fun heardTimeMs(startMs: Double, frame: Long, sampleRate: Int, latencyMs: Double): Double =
    startMs + frame * 1000.0 / sampleRate + latencyMs

  fun subdivisionFrame(index: Long, bpm: Double, sampleRate: Int, divisions: Int = 4): Long {
    require(index >= 0 && bpm in 30.0..240.0 && sampleRate > 0 && divisions > 0)
    return (index * sampleRate * 60.0 / bpm / divisions).roundToLong()
  }

  private val patterns by lazy { listOf("click", "eight", "sixteen", "ballad", "shuffle", "bossa", "hiphop").associateWith(::createPattern) }
  /** Voice names on each of sixteen subdivisions of a 4/4 bar. */
  fun pattern(name: String): Map<Int, List<String>> = patterns[name] ?: throw IllegalArgumentException("Unknown pattern: $name")
  private fun createPattern(name: String): Map<Int, List<String>> = when (name) {
    "click" -> mapOf(0 to listOf("accent"), 4 to listOf("click"), 8 to listOf("click"), 12 to listOf("click"))
    "eight" -> mapOf(0 to listOf("kick", "hat"), 2 to listOf("hat"), 4 to listOf("snare", "hat"), 6 to listOf("hat"), 8 to listOf("kick", "hat"), 10 to listOf("hat"), 12 to listOf("snare", "hat"), 14 to listOf("hat"))
    "sixteen" -> (0..15).associateWith { i -> listOf("hat") + when (i) { 0, 8 -> listOf("kick"); 4, 12 -> listOf("snare"); else -> emptyList() } }
    "ballad" -> mapOf(0 to listOf("kick", "hat"), 4 to listOf("hat"), 8 to listOf("snare", "hat"), 12 to listOf("hat"))
    "shuffle" -> mapOf(0 to listOf("kick", "hat"), 3 to listOf("hat"), 4 to listOf("snare", "hat"), 7 to listOf("hat"), 8 to listOf("kick", "hat"), 11 to listOf("hat"), 12 to listOf("snare", "hat"), 15 to listOf("hat"))
    "bossa" -> mapOf(0 to listOf("kick", "rim"), 3 to listOf("shaker"), 4 to listOf("rim"), 7 to listOf("shaker"), 8 to listOf("kick"), 10 to listOf("rim"), 12 to listOf("shaker"), 14 to listOf("rim"))
    "hiphop" -> mapOf(0 to listOf("kick", "hat"), 2 to listOf("hat"), 4 to listOf("snare", "hat"), 7 to listOf("hat"), 8 to listOf("kick", "hat"), 11 to listOf("kick"), 12 to listOf("snare", "hat"), 14 to listOf("hat"))
    else -> throw IllegalArgumentException("Unknown pattern: $name")
  }
}
