package expo.modules.vcaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTimestamp
import android.media.AudioTrack
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.exception.CodedException
import expo.modules.vcaudio.core.BeatMath
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.roundToInt
import kotlin.math.sin

/** One streaming media AudioTrack synthesizes all beat and reference voices. */
class AudioOutput(private val context: Context, private val routes: DeviceRoutes, private val emit: (String, Map<String, Any?>) -> Unit) {
  private val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val prefs = context.getSharedPreferences("vc_audio_latency", Context.MODE_PRIVATE)
  private val lock = Any()
  private val main = Handler(Looper.getMainLooper())
  private val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
  private var config = Config(90.0, 4, "click", 0.6, false)
  private data class Config(val bpm: Double, val beats: Int, val pattern: String, val volume: Double, val pacer: Boolean)
  private data class Voice(val name: String, var age: Int = 0)
  private data class Clicks(val count: Int, val done: CountDownLatch = CountDownLatch(1), val times: MutableList<Double> = mutableListOf(), var nextFrame: Long = -1, var sent: Int = 0)
  private var track: AudioTrack? = null
  private var worker: Thread? = null
  private var beat = false
  private var beatFrame = 0L
  private var beatOrigin = 0L
  private var subdivision = 0L
  private var framesWritten = 0L
  private var clicks: Clicks? = null
  private var toneFrame = -1L
  private var countFrom = Long.MAX_VALUE
  private var countUntil = Long.MAX_VALUE
  private val beatHistory = ArrayDeque<Pair<Double, Double>>()
  private var player: MediaPlayer? = null
  private var playbackState = "stopped"
  private val playbackTick = object : Runnable {
    override fun run() {
      synchronized(lock) {
        if (player == null) return
        playbackEvent(playbackState)
        main.postDelayed(this, 100)
      }
    }
  }
  private fun now() = SystemClock.elapsedRealtimeNanos() / 1_000_000.0
  private fun outputLatency(): Double = routes.activeOutput()?.let { prefs.getFloat(routes.key(it), 0f).toDouble() } ?: 0.0
  fun setLatency(key: String, ms: Double) {
    if (!ms.isFinite() || ms < 0 || ms > 2000) throw CodedException("ERR_ARGUMENT", "Invalid output latency", null)
    prefs.edit().putFloat(key, ms.toFloat()).apply()
  }
  fun getVolume() = manager.getStreamVolume(AudioManager.STREAM_MUSIC).toDouble() / manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
  fun setVolume(v: Double) {
    if (!v.isFinite()) throw CodedException("ERR_ARGUMENT", "Invalid media volume", null)
    manager.setStreamVolume(AudioManager.STREAM_MUSIC, (v.coerceIn(0.0, 1.0) * manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)).roundToInt(), 0)
  }
  fun setBeat(map: Map<String, Any?>) {
    val bpm = (map["bpm"] as? Number)?.toDouble() ?: throw CodedException("ERR_ARGUMENT", "Missing BPM", null)
    val beats = (map["beatsPerBar"] as? Number)?.toInt() ?: 0
    val pattern = map["pattern"] as? String ?: ""
    val volume = (map["volume"] as? Number)?.toDouble() ?: -1.0
    if (bpm !in 30.0..240.0 || beats !in listOf(2, 3, 4, 6) || volume !in 0.0..1.0 || pattern !in listOf("click", "eight", "sixteen", "ballad", "shuffle", "bossa", "hiphop")) throw CodedException("ERR_ARGUMENT", "Invalid beat configuration", null)
    synchronized(lock) {
      config = Config(bpm, beats, pattern, volume, map["pacer"] == true)
      if (beat) { beatOrigin = framesWritten; beatFrame = framesWritten; subdivision = 0 }
    }
  }
  fun startBeat() = synchronized(lock) {
    if (!beat) { beat = true; subdivision = 0; beatFrame = framesWritten; beatOrigin = framesWritten; countFrom = Long.MAX_VALUE; countUntil = Long.MAX_VALUE }
    ensureTrack()
  }
  fun stopBeat() = synchronized(lock) { beat = false; countFrom = Long.MAX_VALUE; countUntil = Long.MAX_VALUE }
  fun isBeatOn() = synchronized(lock) { beat }
  /** Schedules one complete bar starting at the next downbeat. */
  fun countInEndMs(): Double? = synchronized(lock) {
    if (!beat) return null
    val barSteps = config.beats * 4L
    val nextBar = ((subdivision + barSteps - 1) / barSteps) * barSteps
    countFrom = nextBar
    countUntil = nextBar + barSteps
    val endFrame = beatOrigin + kotlin.math.round(countUntil * 48000.0 * 60.0 / config.bpm / 4.0).toLong()
    heardTime(endFrame, outputLatency())
  }
  fun beatsBetween(start: Double, end: Double): Pair<List<Double>, Double> = synchronized(lock) {
    val entries = beatHistory.filter { it.first >= start && it.first <= end }
    entries.map { it.first - start } to (entries.firstOrNull()?.second ?: outputLatency())
  }
  fun isMasked(time: Double): Boolean = synchronized(lock) {
    val output = routes.activeOutput()
    output != null && routes.info(output)["type"] == "speaker" && beatHistory.any { kotlin.math.abs(it.first - time) <= 30.0 }
  }
  fun routeChanged() = synchronized(lock) { track?.setPreferredDevice(routes.preferredOutput()); player?.setPreferredDevice(routes.preferredOutput()) }
  fun calibration(count: Int): List<Double> {
    if (count !in 1..64) throw CodedException("ERR_ARGUMENT", "Invalid click count", null)
    val request = synchronized(lock) {
      if (clicks != null) throw CodedException("ERR_BUSY", "Calibration is already playing", null)
      Clicks(count).also { clicks = it; ensureTrack() }
    }
    if (!request.done.await(3, TimeUnit.SECONDS)) throw CodedException("ERR_AUDIO", "Could not schedule calibration", null)
    if (request.times.size != count) throw CodedException("ERR_AUDIO", "Calibration was cancelled", null)
    return request.times.toList()
  }
  fun testTone() = synchronized(lock) { toneFrame = framesWritten; ensureTrack() }
  private fun ensureTrack() {
    if (worker?.isAlive == true) return
    framesWritten = 0; if (beat) { beatFrame = 0; beatOrigin = 0 }; if (toneFrame >= 0) toneFrame = 0
    val t = AudioTrack.Builder().setAudioAttributes(attrs)
      .setAudioFormat(AudioFormat.Builder().setSampleRate(48000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
      .setTransferMode(AudioTrack.MODE_STREAM).setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
      .setBufferSizeInBytes(maxOf(AudioTrack.getMinBufferSize(48000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT), 4096)).build()
    if (t.state != AudioTrack.STATE_INITIALIZED) { t.release(); throw CodedException("ERR_AUDIO", "Could not open media output", null) }
    t.setPreferredDevice(routes.preferredOutput()); track = t
    worker = Thread({ render(t) }, "vc-audio-mixer").also { it.start() }
  }
  private fun heardTime(frame: Long, latency: Double): Double {
    val t = track ?: return now() + latency
    val ts = AudioTimestamp()
    return if (t.getTimestamp(ts)) {
      ts.nanoTime / 1_000_000.0 + (SystemClock.elapsedRealtimeNanos() - System.nanoTime()) / 1_000_000.0 + (frame - ts.framePosition) * 1000.0 / 48000 + latency
    } else now() + (frame - (t.playbackHeadPosition.toLong() and 0xffffffffL)) * 1000.0 / 48000 + latency
  }
  private fun render(t: AudioTrack) {
    val buffer = ShortArray(240)
    val voices = ArrayList<Voice>()
    try {
      t.play()
      while (true) {
        synchronized(lock) {
          if (!beat && clicks == null && toneFrame < 0 && voices.isEmpty()) {
            if (track === t) { track = null; worker = null }
            break
          }
          val c = config
          val stepFrames = 48000.0 * 60 / c.bpm / 4
          for (i in buffer.indices) {
            val frame = framesWritten + i
            if (beat && frame >= beatFrame) {
              val step = subdivision
              val beatIndex = step / 4
              val barStep = (step % (c.beats * 4L)).toInt()
              val accent = barStep == 0 || (c.beats == 6 && barStep == 12)
              if (step % 4 == 0L) {
                val latency = outputLatency(); val at = heardTime(frame, latency)
                beatHistory.addLast(at to latency)
                while (beatHistory.size > 65536) beatHistory.removeFirst()
                val event = mapOf<String, Any?>("bar" to (beatIndex / c.beats + 1).toInt(), "beat" to (beatIndex % c.beats + 1).toInt(), "atMs" to at, "countIn" to (step >= countFrom && step < countUntil))
                main.post { emit("onBeat", event) }
              }
              val names = if (c.pacer) { if (barStep % 4 == 0) listOf("click") else emptyList() }
                else if (c.pattern == "click") { if (barStep % 4 == 0) listOf(if (accent) "accent" else "click") else emptyList() }
                else BeatMath.pattern(c.pattern)[barStep % 16] ?: emptyList()
              names.forEach { voices.add(Voice(it)) }
              subdivision++
              beatFrame = beatOrigin + kotlin.math.round(subdivision * stepFrames).toLong()
            }
            clicks?.let { request ->
              if (request.nextFrame < 0) {
                request.nextFrame = frame + 4800
                for (n in 0 until request.count) request.times.add(heardTime(request.nextFrame + n * 32000L, 0.0))
                request.done.countDown()
              }
              if (frame >= request.nextFrame && request.sent < request.count) {
                voices.add(Voice("accent")); request.sent++; request.nextFrame += 32000
                if (request.sent == request.count) clicks = null
              }
            }
            if (toneFrame >= 0 && frame >= toneFrame) { voices.add(Voice("tone")); toneFrame = -1 }
            var sample = 0.0
            var voiceIndex = 0
            while (voiceIndex < voices.size) {
              val voice = voices[voiceIndex]; val a = voice.age++; val sec = a / 48000.0
              val duration = when (voice.name) { "kick" -> 0.18; "snare" -> 0.13; "tone" -> 0.35; else -> 0.045 }
              if (sec >= duration) { voices.removeAt(voiceIndex); continue }
              voiceIndex++
              val noise = sin((a + 1) * 12.9898 + voice.name.length * 78.233) * sin((a + 1) * 0.731)
              val v = when (voice.name) {
                "accent" -> sin(2 * PI * 1800 * sec) * exp(-65 * sec)
                "click" -> sin(2 * PI * 1150 * sec) * exp(-70 * sec)
                "kick" -> sin(2 * PI * (45 * sec + 16 * (1 - exp(-25 * sec)) / 25)) * exp(-18 * sec)
                "snare" -> noise * exp(-30 * sec)
                "rim" -> sin(2 * PI * 1700 * sec) * exp(-100 * sec)
                "shaker" -> noise * exp(-85 * sec)
                "hat" -> noise * exp(-110 * sec)
                "tone" -> sin(2 * PI * 440 * sec) * minOf(1.0, sec * 80, (duration - sec) * 40)
                else -> 0.0
              }
              sample += v * c.volume * if (c.pacer) 0.3 else 0.45
            }
            buffer[i] = (sample.coerceIn(-1.0, 1.0) * 32767).toInt().toShort()
          }
          framesWritten += buffer.size
        }
        val n = t.write(buffer, 0, buffer.size, AudioTrack.WRITE_BLOCKING)
        if (n < 0) throw IllegalStateException("AudioTrack write failed: $n")
      }
    } finally {
      synchronized(lock) { if (track === t) { track = null; worker = null }; clicks?.done?.countDown(); clicks = null }
      try { t.stop() } catch (_: Exception) { }; t.release()
    }
  }
  fun play(path: String, startMs: Double?) = synchronized(lock) {
    stopPlayer("stopped")
    val mp = MediaPlayer()
    try {
      mp.setAudioAttributes(attrs); mp.setDataSource(File(path).absolutePath); mp.setPreferredDevice(routes.preferredOutput())
      mp.setOnCompletionListener { synchronized(lock) { if (player === mp) stopPlayer("ended") } }
      mp.setOnErrorListener { _, what, extra -> synchronized(lock) { if (player === mp) { playbackEvent("error", "$what/$extra"); stopPlayer(null) } }; true }
      mp.prepare(); player = mp; if (startMs != null) mp.seekTo(startMs.toInt().coerceAtLeast(0)); mp.start()
      playbackState = "playing"; playbackEvent("playing"); main.postDelayed(playbackTick, 100)
    } catch (e: Exception) { mp.release(); throw e }
  }
  fun pause() = synchronized(lock) { player?.let { it.pause(); playbackState = "paused"; playbackEvent("paused") } }
  fun resume() = synchronized(lock) { player?.let { it.start(); playbackState = "playing"; playbackEvent("playing") } }
  fun seek(ms: Double) = synchronized(lock) { player?.seekTo(ms.toInt().coerceAtLeast(0)); player?.let { playbackEvent(playbackState) } }
  fun stopPlayback() = synchronized(lock) { stopPlayer("stopped") }
  private fun playbackEvent(state: String, error: String? = null) {
    val mp = player
    val e = mutableMapOf<String, Any?>("state" to state, "positionMs" to (try { mp?.currentPosition ?: 0 } catch (_: Exception) { 0 }), "durationMs" to (try { mp?.duration ?: 0 } catch (_: Exception) { 0 }))
    if (error != null) e["error"] = error
    emit("onPlayback", e)
  }
  private fun stopPlayer(state: String?) {
    val mp = player ?: return
    main.removeCallbacks(playbackTick)
    if (state != null) playbackEvent(state)
    player = null; try { mp.stop() } catch (_: Exception) { }; mp.release(); playbackState = "stopped"
  }
  fun stopAll() {
    synchronized(lock) { beat = false; clicks?.done?.countDown(); clicks = null; toneFrame = -1 }
    stopPlayback()
  }
}
