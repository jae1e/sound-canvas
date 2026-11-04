package expo.modules.vlcsessionservice.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin

/** User-controlled earcon settings (JS `setEarconSettings`). */
object EarconSettings {
  /** Loudness relative to speech, 0..1 (AudioTrack gain on top of a fixed -6 dBFS peak). */
  @Volatile var volume: Float = 0.7f
  /** Vibrate together with the tone. JS sets it from the "navigation / all / off" preference and the running mode. */
  @Volatile var vibrate: Boolean = false
}

/**
 * Earcons: short non-speech cues rendered as PCM here, so no audio assets (or licences) are needed. Each is one to three
 * tones, 125-400 ms, with a soft attack and release so they never click. Tone shapes are what make them distinguishable
 * with eyes off the screen: direction (turn left falls, turn right rises), urgency (warning is low and pulsed),
 * completion (timer done and arrived end on a chord).
 */
object Earcons {
  const val SAMPLE_RATE = 24_000
  private const val PEAK = 0.5f

  /** One tone: starts at [startMs], sounds [chord] simultaneously. [decay] shapes a percussive "tick" instead of a swell. */
  private class Tone(
    val startMs: Int,
    val durMs: Int,
    val chord: DoubleArray,
    val harmonics: DoubleArray = doubleArrayOf(1.0, 0.2),
    val attackMs: Int = 10,
    val releaseMs: Int = 50,
    val decay: Boolean = false,
  )

  private class Spec(val tones: List<Tone>, val vibration: LongArray)

  private val specs: Map<String, Spec> = mapOf(
    // "A message is coming": one soft swelling perfect fifth (E5 + B5), 260 ms.
    "attention" to Spec(listOf(Tone(0, 260, doubleArrayOf(659.3, 987.8), attackMs = 50, releaseMs = 100)), longArrayOf(0, 60)),
    // Timer done: rising C-major arpeggio G5 B5 D6, the last note held (about 400 ms).
    "timer_done" to Spec(
      listOf(
        Tone(0, 110, doubleArrayOf(784.0)),
        Tone(110, 110, doubleArrayOf(987.8)),
        Tone(220, 180, doubleArrayOf(1174.7), releaseMs = 90),
      ),
      longArrayOf(0, 80, 60, 80, 60, 160),
    ),
    // Turn left: falling two-note figure A5 -> D5 (290 ms). Turn right: the same notes rising.
    "turn_left" to Spec(listOf(Tone(0, 130, doubleArrayOf(880.0)), Tone(140, 150, doubleArrayOf(587.3), releaseMs = 70)), longArrayOf(0, 150, 70, 50)),
    "turn_right" to Spec(listOf(Tone(0, 130, doubleArrayOf(587.3)), Tone(140, 150, doubleArrayOf(880.0), releaseMs = 70)), longArrayOf(0, 50, 70, 150)),
    // Arrived: E5, G5, then a held C-major triad (C5 E5 G5), 400 ms.
    "arrived" to Spec(
      listOf(
        Tone(0, 110, doubleArrayOf(659.3)),
        Tone(120, 110, doubleArrayOf(784.0)),
        Tone(240, 160, doubleArrayOf(523.3, 659.3, 784.0), releaseMs = 90),
      ),
      longArrayOf(0, 60, 60, 60, 60, 200),
    ),
    // Warning (off route, GPS lost): two low, slightly dissonant pulses (A4 + B-flat4, rich in harmonics), 300 ms.
    "warning" to Spec(
      listOf(
        Tone(0, 120, doubleArrayOf(440.0, 466.2), harmonics = doubleArrayOf(1.0, 0.4, 0.3)),
        Tone(180, 120, doubleArrayOf(440.0, 466.2), harmonics = doubleArrayOf(1.0, 0.4, 0.3)),
      ),
      longArrayOf(0, 200, 100, 200),
    ),
    // Listening / LLM thinking: a soft double tick (1000 Hz then 760 Hz pings, fast decay), 150 ms. No vibration.
    "tick" to Spec(
      listOf(
        Tone(0, 60, doubleArrayOf(1000.0), harmonics = doubleArrayOf(1.0), attackMs = 4, releaseMs = 20, decay = true),
        Tone(90, 60, doubleArrayOf(760.0), harmonics = doubleArrayOf(1.0), attackMs = 4, releaseMs = 20, decay = true),
      ),
      longArrayOf(),
    ),
  )

  val names: List<String> get() = specs.keys.toList()
  fun isKnown(name: String) = specs.containsKey(name)
  fun vibration(name: String): LongArray = specs[name]?.vibration ?: longArrayOf()

  private val rendered = HashMap<String, ShortArray>()

  /** 16-bit mono PCM at [SAMPLE_RATE]. Rendered once per name. */
  fun pcm(name: String): ShortArray? {
    val spec = specs[name] ?: return null
    synchronized(rendered) { rendered[name]?.let { return it } }
    val out = render(spec)
    synchronized(rendered) { rendered[name] = out }
    return out
  }

  fun durationMs(name: String): Long = (pcm(name)?.size ?: 0) * 1000L / SAMPLE_RATE

  private fun render(spec: Spec): ShortArray {
    val totalMs = spec.tones.maxOf { it.startMs + it.durMs }
    val n = SAMPLE_RATE * totalMs / 1000
    val mix = FloatArray(n)
    for (tone in spec.tones) {
      val start = SAMPLE_RATE * tone.startMs / 1000
      val len = minOf(SAMPLE_RATE * tone.durMs / 1000, n - start)
      val attack = maxOf(1, SAMPLE_RATE * tone.attackMs / 1000)
      val release = maxOf(1, minOf(SAMPLE_RATE * tone.releaseMs / 1000, len / 2))
      val norm = 1.0 / (tone.chord.size * tone.harmonics.sum())
      for (i in 0 until len) {
        var env = 1.0
        if (i < attack) env = 0.5 - 0.5 * cos(PI * i / attack) // raised-cosine attack
        if (i >= len - release) env *= 0.5 - 0.5 * cos(PI * (len - 1 - i) / release) // raised-cosine release
        if (tone.decay) env *= exp(-5.0 * i / len)
        var s = 0.0
        for (f in tone.chord) for ((h, a) in tone.harmonics.withIndex()) s += a * sin(2 * PI * f * (h + 1) * i / SAMPLE_RATE)
        mix[start + i] += (s * norm * env).toFloat()
      }
    }
    return ShortArray(n) { (mix[it] * PEAK * 32767f).coerceIn(-32768f, 32767f).toInt().toShort() }
  }
}

/**
 * Plays earcons through the same media path as the pacing clips: AudioTrack with USAGE_MEDIA, follows the system route
 * (earbuds when connected), no preferred device, never the forced phone speaker. Plays only when asked.
 */
class EarconPlayer(
  private val context: Context,
  private val log: DiagLog,
  /** True while an earcon sounds, so half-duplex STT does not listen to it. May be null. */
  private val onPlaying: ((Boolean) -> Unit)? = null,
) {
  private val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val exec: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor { Thread(it, "vlc-earcon").apply { isDaemon = true } }
  private val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
  private var active = 0
  private var focus: AudioFocusRequest? = null

  /** Returns false when the name is unknown or the track could not be built. [reason] is only for the log. */
  fun play(name: String, reason: String, vibrate: Boolean = EarconSettings.vibrate): Boolean {
    val pcm = Earcons.pcm(name) ?: return false
    exec.execute {
      val t0 = SystemClock.elapsedRealtime()
      val track = try {
        AudioTrack.Builder()
          .setAudioAttributes(attrs)
          .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(Earcons.SAMPLE_RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
          .setBufferSizeInBytes(pcm.size * 2)
          .setTransferMode(AudioTrack.MODE_STATIC)
          .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
          .build()
      } catch (e: Throwable) {
        log.log("error", mapOf("where" to "earcon_build", "name" to name, "message" to e.chainText()))
        null
      }
      if (track == null) return@execute
      try {
        track.write(pcm, 0, pcm.size)
        track.setVolume(EarconSettings.volume.coerceIn(0f, 1f))
        focusOn()
        markActive(true)
        track.play()
        if (vibrate) vibrateFor(name)
        val routed = try { track.routedDevice?.let { "type=${it.type} id=${it.id}" } } catch (_: Throwable) { null }
        log.log("earcon_played", mapOf("name" to name, "reason" to reason, "vibrate" to vibrate, "volume" to EarconSettings.volume, "routedDevice" to routed, "latencyMs" to SystemClock.elapsedRealtime() - t0))
      } catch (e: Throwable) {
        log.log("error", mapOf("where" to "earcon_play", "name" to name, "message" to e.chainText()))
        try { track.release() } catch (_: Throwable) {}
        markActive(false)
        return@execute
      }
      exec.schedule({
        try { track.release() } catch (_: Throwable) {}
        markActive(false)
      }, Earcons.durationMs(name) + RELEASE_SLACK_MS, TimeUnit.MILLISECONDS)
    }
    return true
  }

  private fun markActive(on: Boolean) {
    val was = active > 0
    active = maxOf(0, active + if (on) 1 else -1)
    val now = active > 0
    if (was != now) {
      try { onPlaying?.invoke(now) } catch (_: Throwable) {}
      if (!now) focusOff()
    }
  }

  private fun focusOn() {
    if (focus != null) return
    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attrs).setWillPauseWhenDucked(false).setOnAudioFocusChangeListener { }.build()
    am.requestAudioFocus(req)
    focus = req
  }

  private fun focusOff() {
    focus?.let { try { am.abandonAudioFocusRequest(it) } catch (_: Throwable) {} }
    focus = null
  }

  @Suppress("DEPRECATION")
  private fun vibrateFor(name: String) {
    val pattern = Earcons.vibration(name)
    if (pattern.isEmpty()) return
    try {
      val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
      if (!v.hasVibrator()) return
      if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, -1)) else v.vibrate(pattern, -1)
    } catch (e: Throwable) {
      log.log("error", mapOf("where" to "earcon_vibrate", "message" to e.chainText()))
    }
  }

  fun shutdown() {
    exec.shutdownNow()
    focusOff()
  }

  companion object {
    private const val RELEASE_SLACK_MS = 120L
  }
}
