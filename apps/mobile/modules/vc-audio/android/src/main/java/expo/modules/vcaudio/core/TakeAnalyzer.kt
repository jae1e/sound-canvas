package expo.modules.vcaudio.core

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Target: a list of (midi, durationS?) notes; a null duration is a held note spanning the whole take. */
data class TargetNote(val midi: Int, val durationS: Double?)

/**
 * Offline take analysis. Mirrors `analysis.ts` in @vlc/voice-analysis (same thresholds), so the JS side can
 * recompute metrics from the returned contour (for example against a different target) and get matching numbers.
 */
object TakeAnalyzer {
  private const val VOICED_MIN = 0.5
  private fun hzToMidi(hz: Double) = 69 + 12 * ln(hz / 440.0) / ln(2.0)

  fun frames(wav: WavData): List<PitchFrame> {
    val an = FrameAnalyzer(wav.sampleRate)
    val hop = max(1, (0.02 * wav.sampleRate).roundToInt())
    val win = an.windowSize
    val buf = FloatArray(win)
    val out = ArrayList<PitchFrame>()
    var s = 0
    while (s + win <= wav.samples.size) {
      for (i in 0 until win) buf[i] = wav.samples[s + i] / 32768f
      out.add(an.analyze((s + win / 2.0) / wav.sampleRate, buf))
      s += hop
    }
    return out
  }

  private fun voiced(f: PitchFrame) = f.f0 != null && f.voicing >= VOICED_MIN
  private fun mean(x: List<Double>) = if (x.isEmpty()) 0.0 else x.sum() / x.size
  private fun sd(x: List<Double>): Double {
    if (x.size < 2) return 0.0
    val m = mean(x)
    return sqrt(x.sumOf { (it - m) * (it - m) } / x.size)
  }
  private fun median(x: List<Double>): Double {
    if (x.isEmpty()) return 0.0
    val s = x.sorted(); val h = s.size / 2
    return if (s.size % 2 == 1) s[h] else (s[h - 1] + s[h]) / 2
  }
  private fun percentile(x: List<Double>, p: Double): Double {
    if (x.isEmpty()) return 0.0
    val s = x.sorted()
    return s[min(s.size - 1, max(0, (p * (s.size - 1)).roundToInt()))]
  }
  private fun step(frames: List<PitchFrame>): Double {
    if (frames.size < 2) return 0.02
    return median(frames.zipWithNext { a, b -> b.t - a.t }).takeIf { it > 0 } ?: 0.02
  }
  private fun noteName(midi: Int): String {
    val names = arrayOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
    return names[((midi % 12) + 12) % 12] + (Math.floorDiv(midi, 12) - 1)
  }

  private class Segment(val startS: Double, val endS: Double, val durationS: Double, val medianMidi: Double, val sdCents: Double)

  private fun segments(frames: List<PitchFrame>): List<Segment> {
    val dt = step(frames)
    val out = ArrayList<Segment>()
    var idx = ArrayList<Int>(); var midi = ArrayList<Double>(); var lastT = Double.NEGATIVE_INFINITY
    fun flush() {
      if (idx.size >= 2) {
        val startS = frames[idx.first()].t; val endS = frames[idx.last()].t
        val dur = endS - startS + dt
        if (dur >= 0.4) {
          var core = idx.indices.filter { frames[idx[it]].t >= startS + 0.1 && frames[idx[it]].t <= endS - 0.1 }.map { midi[it] }
          if (core.size < 3) core = midi
          out.add(Segment(startS, endS, dur, median(midi), sd(core) * 100))
        }
      }
      idx = ArrayList(); midi = ArrayList()
    }
    for ((i, f) in frames.withIndex()) {
      if (!voiced(f)) continue
      val m = hzToMidi(f.f0!!)
      if (idx.isNotEmpty() && f.t - lastT > 0.06 + dt * 1.01) flush()
      if (idx.isNotEmpty() && abs(m - median(midi.takeLast(8))) * 100 > 100) flush()
      idx.add(i); midi.add(m); lastT = f.t
    }
    flush()
    return out
  }

  private fun silenceDb(frames: List<PitchFrame>): Double {
    val db = frames.map { it.rmsDb }
    if (db.isEmpty()) return -60.0
    val lo = percentile(db, 0.1); val hi = percentile(db, 0.9)
    return if (hi - lo < 12) min(lo - 1, -55.0) else lo + 0.3 * (hi - lo)
  }

  fun contour(frames: List<PitchFrame>, maxPoints: Int): Map<String, Any?> {
    val stride = if (frames.size > maxPoints) frames.size.toDouble() / maxPoints else 1.0
    val picked = if (stride > 1.0) (0 until maxPoints).map { frames[(it * stride).toInt()] } else frames
    return mapOf(
      "t" to picked.map { round(it.t, 1000.0) },
      "f0" to picked.map { it.f0?.let { v -> round(v, 100.0) } },
      "voicing" to picked.map { round(it.voicing, 100.0) },
      "rmsDb" to picked.map { round(it.rmsDb, 10.0) },
      "centroid" to picked.map { round(it.centroid, 1.0) },
      "hnrDb" to picked.map { round(it.hnrDb, 10.0) },
    )
  }
  private fun round(v: Double, k: Double) = Math.round(v * k) / k

  fun metrics(frames: List<PitchFrame>, target: List<TargetNote>?): Map<String, Any?> {
    val dt = step(frames)
    val durationS = if (frames.isEmpty()) 0.0 else frames.last().t - frames.first().t + dt
    val thr = silenceDb(frames)
    val voicedFrames = frames.filter { voiced(it) }
    val segs = segments(frames)
    val sustained = segs.sumOf { it.durationS }
    val stability = if (segs.isEmpty()) null else segs.sumOf { it.sdCents * it.durationS } / sustained
    val rangeNotes = segs.filter { it.durationS >= 0.5 }.map { Math.round(it.medianMidi).toInt() }
    val loud = frames.filter { it.rmsDb >= thr }.map { it.rmsDb }
    val cent = frames.filter { it.rmsDb >= thr && it.centroid > 0 }.map { it.centroid }

    // Pauses: interior silent runs >= 0.3 s.
    val isLoud = frames.map { it.rmsDb >= thr }
    val first = isLoud.indexOf(true); val last = isLoud.lastIndexOf(true)
    val pauses = ArrayList<Double>()
    if (first >= 0) {
      var run = -1
      for (i in first..last) {
        if (!isLoud[i]) { if (run < 0) run = i } else if (run >= 0) {
          val d = (i - run) * dt
          if (d >= 0.3) pauses.add(d)
          run = -1
        }
      }
    }
    return mapOf(
      "durationS" to durationS,
      "voicedRatio" to if (frames.isEmpty()) 0.0 else voicedFrames.size.toDouble() / frames.size,
      "stabilitySdCents" to stability,
      "sustainedS" to sustained,
      "rangeLowMidi" to rangeNotes.minOrNull(),
      "rangeHighMidi" to rangeNotes.maxOrNull(),
      "rangeLow" to rangeNotes.minOrNull()?.let { noteName(it) },
      "rangeHigh" to rangeNotes.maxOrNull()?.let { noteName(it) },
      "target" to target?.let { score(frames, it) },
      "loudnessMeanDb" to if (loud.isEmpty()) null else mean(loud),
      "loudnessSdDb" to if (loud.isEmpty()) null else sd(loud),
      "pauseCount" to pauses.size,
      "pauseDurationsS" to pauses,
      "pauseTotalS" to pauses.sum(),
      "hnrDb" to voicedFrames.map { it.hnrDb }.let { if (it.isEmpty()) null else mean(it) },
      "brightnessHz" to if (cent.isEmpty()) null else mean(cent),
    )
  }

  private fun targetAt(spec: List<TargetNote>, t: Double): Int? {
    if (t < 0) return null
    var acc = 0.0
    for (n in spec) {
      val d = n.durationS ?: return n.midi
      acc += d
      if (t < acc) return n.midi
    }
    return null
  }

  private fun score(frames: List<PitchFrame>, spec: List<TargetNote>): Map<String, Any?> {
    val single = spec.size == 1 && spec[0].durationS == null
    val t0 = if (single) 0.0 else frames.firstOrNull { voiced(it) }?.t ?: 0.0
    var inWin = 0; var vc = 0; var w25 = 0; var w50 = 0
    val absList = ArrayList<Double>(); val signed = ArrayList<Double>()
    for (f in frames) {
      val tm = targetAt(spec, f.t - t0) ?: continue
      inWin++
      if (!voiced(f)) continue
      vc++
      val c = (hzToMidi(f.f0!!) - tm) * 100
      absList.add(abs(c)); signed.add(c)
      if (abs(c) <= 25) w25++
      if (abs(c) <= 50) w50++
    }
    fun pct(n: Int, d: Int) = if (d > 0) 100.0 * n / d else 0.0
    return mapOf(
      "within25Pct" to pct(w25, inWin), "within50Pct" to pct(w50, inWin),
      "within25OfVoicedPct" to pct(w25, vc), "within50OfVoicedPct" to pct(w50, vc),
      "meanAbsCents" to if (absList.isEmpty()) null else mean(absList),
      "meanSignedCents" to if (signed.isEmpty()) null else mean(signed),
    )
  }
}
