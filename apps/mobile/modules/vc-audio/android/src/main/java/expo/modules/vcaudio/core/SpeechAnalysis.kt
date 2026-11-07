package expo.modules.vcaudio.core

import kotlin.math.max
import kotlin.math.min

/** Offline intensity analysis. Times are milliseconds relative to the start of the take. */
object SpeechAnalysis {
  data class Point(val timeMs: Double, val rmsDb: Double, val voiced: Boolean)
  data class Pause(val startMs: Double, val endMs: Double)
  data class Result(val syllables: List<Double>, val pauses: List<Pause>)

  fun analyze(points: List<Point>, durationMs: Double): Result {
    if (points.isEmpty()) return Result(emptyList(), emptyList())
    val sorted = points.map { it.rmsDb }.sorted()
    val low = sorted[((sorted.size - 1) * 0.1).toInt()]
    val high = sorted[((sorted.size - 1) * 0.9).toInt()]
    val silence = if (high - low < 12) -55.0 else low + 0.3 * (high - low)
    val smooth = points.indices.map { i ->
      val a = max(0, i - 2); val b = min(points.lastIndex, i + 2)
      (a..b).sumOf { points[it].rmsDb } / (b - a + 1)
    }
    val syllables = mutableListOf<Double>()
    var valley = smooth.first()
    var candidate = -1
    for (i in 1 until points.size) {
      val v = smooth[i]
      if (v < valley) valley = v
      if (i < points.lastIndex && v >= smooth[i - 1] && v > smooth[i + 1] && v - valley >= 6 && v > silence) {
        if ((max(0, i - 2)..min(points.lastIndex, i + 2)).any { points[it].voiced }) candidate = i
      }
      if (candidate >= 0 && smooth[candidate] - v >= 6) {
        syllables.add(points[candidate].timeMs)
        candidate = -1
        valley = v
      }
    }
    if (candidate >= 0) syllables.add(points[candidate].timeMs)
    val pauses = mutableListOf<Pause>()
    var start: Double? = null
    for (p in points) {
      if (p.rmsDb < silence) {
        if (start == null) start = p.timeMs
      } else if (start != null) {
        if (p.timeMs - start > 250) pauses.add(Pause(start, p.timeMs))
        start = null
      }
    }
    if (start != null && durationMs - start > 250) pauses.add(Pause(start, durationMs))
    return Result(syllables, pauses)
  }
}
