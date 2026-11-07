package expo.modules.vcaudio.core

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/** Review data derived from the same pitch frames used by the existing coach. */
object ReviewAnalysis {
  private fun midi(hz: Double) = 69.0 + 12.0 * ln(hz / 440.0) / ln(2.0)
  private fun quantile(sorted: List<Double>, q: Double): Double {
    val x = (sorted.size - 1) * q
    val i = x.toInt()
    return sorted[i] + (sorted[min(i + 1, sorted.lastIndex)] - sorted[i]) * (x - i)
  }
  fun analyze(wav: WavData, maxPoints: Int = 3000, waveformBuckets: Int = 400, beats: List<Double> = emptyList()): Map<String, Any?> {
    require(maxPoints > 0 && waveformBuckets > 0)
    val duration = wav.samples.size * 1000.0 / wav.sampleRate
    val frames = TakeAnalyzer.frames(wav)
    val notes = frames.map { f -> if (f.f0 != null && f.voicing >= 0.5) midi(f.f0) else null }
    val sorted = notes.filterNotNull().sorted()
    val residuals = ArrayList<Double>()
    for (i in frames.indices) {
      val note = notes[i] ?: continue
      val neighbours = (max(0, i - 7)..min(frames.lastIndex, i + 7)).mapNotNull { notes[it] }.sorted()
      residuals.add((note - quantile(neighbours, 0.5)) * 100.0)
    }
    val stability = if (residuals.size < 2) null else {
      val mean = residuals.average()
      sqrt(residuals.sumOf { (it - mean) * (it - mean) } / residuals.size)
    }
    val speech = SpeechAnalysis.analyze(frames.map { SpeechAnalysis.Point(it.t * 1000, it.rmsDb, it.f0 != null && it.voicing >= 0.5) }, duration)
    val onsets = frames.indices.filter { i ->
      notes[i] != null && (i == 0 || notes[i - 1] == null)
    }.map { frames[it].t * 1000.0 }
    val offsets = if (beats.isEmpty()) emptyList() else onsets.map { onset -> onset - beats.minBy { abs(onset - it) } }
    val count = min(maxPoints, frames.size)
    val indices = if (count == 0) emptyList() else (0 until count).map { (it.toLong() * frames.size / count).toInt() }
    val peaks = (0 until waveformBuckets).map { bucket ->
      val start = (bucket.toLong() * wav.samples.size / waveformBuckets).toInt()
      val end = ((bucket + 1L) * wav.samples.size / waveformBuckets).toInt()
      var peak = 0
      for (i in start until end) peak = max(peak, abs(wav.samples[i].toInt()))
      peak / 32768.0
    }
    return mapOf(
      "durationMs" to duration, "tMs" to indices.map { frames[it].t * 1000 },
      "midi" to indices.map { notes[it] }, "rmsDb" to indices.map { frames[it].rmsDb.coerceIn(-100.0, 0.0) }, "peaks" to peaks,
      "rangeLowMidi" to sorted.firstOrNull(), "rangeHighMidi" to sorted.lastOrNull(),
      "stabilityCents" to stability, "beatOffsetMs" to offsets.takeIf { it.isNotEmpty() }?.average(),
      "syllableTimesMs" to speech.syllables, "pauses" to speech.pauses.map { mapOf("startMs" to it.startMs, "endMs" to it.endMs) },
      "pitchSpreadSemitones" to if (sorted.isEmpty()) null else quantile(sorted, 0.95) - quantile(sorted, 0.05),
    )
  }
}
