package expo.modules.vlcsessionservice.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
import expo.modules.vlcsessionservice.speech.PacingCache
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Native pacing scheduler plus low-latency clip player. A segment is a list of beats (offset, phrase) relative to a start
 * time; each beat plays a pre-synthesised clip from [PacingCache] at its absolute time, so counting rhythms keep time with
 * the screen locked.
 *
 * Timing: the epoch start is converted to the uptime clock ONCE in [schedule]; every beat is then posted with
 * `Handler.postAtTime(r, token, baseUptime + offsetMs)` (absolute, never chained delays, same clock path as CueScheduler).
 * A beat's [AudioTrack] (MODE_STATIC, LOW_LATENCY) is built 1-2 beats ahead on the same thread, so the fire path is just
 * `play()`. Drift = uptime right after `play()` returned minus the scheduled uptime.
 *
 * Routing: USAGE_MEDIA + CONTENT_TYPE_SPEECH, follows the system route (Bluetooth earbuds work). No preferred device,
 * no forced speaker, no communication device. Other audio is ducked with a transient-may-duck focus request.
 *
 * Half-duplex STT: [onSpeaking] is true while any clip plays. STT stays paused across a gap shorter than
 * [MIN_LISTEN_GAP_MS] to the next clip. All state is mutated on the "vlc-pace" thread.
 */
class PacingPlayer(
  context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
  private val cache: PacingCache,
  /** Live TTS fallback for a clip that is not cached (no flush). */
  private val speakLive: (text: String) -> Unit,
  /** Half-duplex STT hook: true when a clip starts (or stays paused across a short gap), false when listening may resume. */
  private val onSpeaking: (Boolean) -> Unit,
) {
  class BeatSpec(val offsetMs: Long, val text: String, val lang: String, val tag: String?)

  private class Beat(val index: Int, val spec: BeatSpec) {
    var order = 0
    var scheduledUptime = 0L
    var scheduledEpochMs = 0L
    var track: AudioTrack? = null
    var clip: PacingCache.Clip? = null
    var clipLooked = false
    var fired = false
  }

  private class Playing(val seg: Segment, val track: AudioTrack, val clipEndUptime: Long)

  private class Segment(val id: String, val beats: List<Beat>) {
    val unfired = AtomicInteger(beats.size)
    var finalized = 0
    var played = 0
    var missing = 0
    var done = false
    val drifts = ArrayList<Long>()
    val playing = ArrayList<Playing>()
  }

  private val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val thread = HandlerThread("vlc-pace").also { it.start() }
  private val handler = Handler(thread.looper)
  private val segments = ConcurrentHashMap<String, Segment>()
  private val attrs = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
    .build()

  private var playingClips = 0
  private var sttHeld = false
  private var focusReq: AudioFocusRequest? = null
  @Volatile private var shutDown = false

  val segmentCount: Int get() = segments.size
  val pendingBeats: Int get() = segments.values.sumOf { it.unfired.get() }

  // ---- public API (any thread) -------------------------------------------------------------------------

  fun schedule(segmentId: String, startEpochMs: Long, beats: List<BeatSpec>) {
    if (shutDown) return
    val baseUptime = SystemClock.uptimeMillis() + (startEpochMs - System.currentTimeMillis()) // converted once
    val list = beats.mapIndexed { i, s -> Beat(i, s) }.sortedBy { it.spec.offsetMs }
    list.forEachIndexed { order, b ->
      b.order = order
      b.scheduledUptime = baseUptime + b.spec.offsetMs
      b.scheduledEpochMs = startEpochMs + b.spec.offsetMs
    }
    val seg = Segment(segmentId, list)
    val old = segments.put(segmentId, seg)
    handler.post {
      if (old != null) finish(old, cancelled = true)
      start(seg)
    }
  }

  /** null cancels every segment. Stops playing clips immediately. */
  fun cancel(segmentId: String?) {
    val targets = if (segmentId == null) segments.values.toList() else listOfNotNull(segments[segmentId])
    if (targets.isEmpty()) return
    handler.postAtFrontOfQueue { targets.forEach { finish(it, cancelled = true) } }
  }

  fun shutdown() {
    shutDown = true
    handler.postAtFrontOfQueue {
      segments.values.toList().forEach { finish(it, cancelled = true) }
      handler.removeCallbacksAndMessages(null)
      releaseFocusNow()
      if (sttHeld) { sttHeld = false; onSpeaking(false) }
    }
    thread.quitSafely()
  }

  // ---- scheduling (pace thread) ------------------------------------------------------------------------

  private fun start(seg: Segment) {
    if (seg.done || shutDown) return
    if (seg.beats.isEmpty()) {
      finish(seg, cancelled = false)
      return
    }
    for (b in seg.beats) handler.postAtTime({ fire(seg, b) }, seg, b.scheduledUptime)
    prepareAhead(seg, 0, 2)
  }

  private fun prepareAhead(seg: Segment, from: Int, count: Int) {
    if (seg.done) return
    for (o in from until minOf(seg.beats.size, from + count)) {
      val b = seg.beats[o]
      if (b.fired || b.track != null) continue
      // Duck other audio shortly before the beat; idempotent, so one runnable per prepared beat is fine.
      handler.postAtTime({ ensureFocus() }, seg, maxOf(SystemClock.uptimeMillis(), b.scheduledUptime - FOCUS_LEAD_MS))
      buildTrack(b)
    }
  }

  private fun resolveClip(b: Beat): PacingCache.Clip? {
    if (!b.clipLooked) {
      b.clipLooked = true
      b.clip = try { cache.clipFor(b.spec.text, b.spec.lang) } catch (e: Throwable) {
        log.log("error", mapOf("where" to "pace_clip_lookup", "message" to e.chainText())); null
      }
    }
    return b.clip
  }

  private fun buildTrack(b: Beat) {
    if (b.track != null) return
    val clip = resolveClip(b) ?: return
    b.track = try {
      val bytes = clip.pcm.size * 2
      val t = AudioTrack.Builder()
        .setAudioAttributes(attrs)
        .setAudioFormat(
          AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(clip.sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(),
        )
        .setBufferSizeInBytes(bytes)
        .setTransferMode(AudioTrack.MODE_STATIC)
        .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
        .build()
      val n = t.write(clip.pcm, 0, clip.pcm.size)
      if (n != clip.pcm.size || t.state != AudioTrack.STATE_INITIALIZED) {
        t.release()
        null
      } else t
    } catch (e: Throwable) {
      log.log("error", mapOf("where" to "pace_track_build", "message" to e.chainText()))
      null
    }
  }

  private fun fire(seg: Segment, b: Beat) {
    if (seg.done || b.fired) return
    b.fired = true
    seg.unfired.decrementAndGet()
    ensureFocus()
    val pre = SystemClock.uptimeMillis()
    if (b.track == null) buildTrack(b)
    val track = b.track
    val clip = b.clip
    if (track == null || clip == null) {
      seg.missing++
      log.log("pace_clip_missing", mapOf("segmentId" to seg.id, "index" to b.index, "text" to b.spec.text, "lang" to b.spec.lang))
      try { speakLive(b.spec.text) } catch (e: Throwable) { log.log("error", mapOf("where" to "pace_live_fallback", "message" to e.chainText())) }
      emitBeat(seg, b, "live_tts", pre, pre, System.currentTimeMillis(), 0, null)
      prepareAhead(seg, b.order + 1, 2)
      beatFinished(seg, SystemClock.uptimeMillis())
      return
    }
    b.track = null
    if (!playingStarted(seg, b, track, clip, pre)) {
      // play() failed: treat as missing
      try { track.release() } catch (_: Throwable) {}
      seg.missing++
      log.log("pace_clip_missing", mapOf("segmentId" to seg.id, "index" to b.index, "text" to b.spec.text, "reason" to "play_failed"))
      try { speakLive(b.spec.text) } catch (_: Throwable) {}
      beatFinished(seg, SystemClock.uptimeMillis())
    }
    prepareAhead(seg, b.order + 1, 2)
  }

  private fun playingStarted(seg: Segment, b: Beat, track: AudioTrack, clip: PacingCache.Clip, pre: Long): Boolean {
    if (!sttHeld) { sttHeld = true; onSpeaking(true) }
    try {
      track.play()
    } catch (e: Throwable) {
      log.log("error", mapOf("where" to "pace_play", "message" to e.chainText()))
      evaluateStt(SystemClock.uptimeMillis())
      return false
    }
    val post = SystemClock.uptimeMillis()
    val postEpoch = System.currentTimeMillis()
    playingClips++
    seg.played++
    seg.drifts.add(post - b.scheduledUptime)
    val routed = try { track.routedDevice?.let { "type=${it.type} id=${it.id} ${it.productName}" } } catch (_: Throwable) { null }
    emitBeat(seg, b, "cache", pre, post, postEpoch, clip.durationMs, routed)
    val p = Playing(seg, track, post + clip.durationMs)
    seg.playing.add(p)
    handler.postAtTime({ endClip(p) }, seg, post + clip.durationMs + END_SLACK_MS)
    return true
  }

  private fun emitBeat(seg: Segment, b: Beat, source: String, pre: Long, post: Long, postEpoch: Long, clipMs: Long, routed: String?) {
    val drift = post - b.scheduledUptime
    val f = mapOf(
      "segmentId" to seg.id, "index" to b.index, "tag" to b.spec.tag, "text" to b.spec.text, "source" to source,
      "scheduledOffsetMs" to b.spec.offsetMs, "driftMs" to drift, "prePlayDriftMs" to (pre - b.scheduledUptime),
      "clipMs" to clipMs, "routedDevice" to routed,
    )
    log.log("pace_beat", f)
    emit("paceBeat", f + mapOf("scheduledEpochMs" to b.scheduledEpochMs, "playStartEpochMs" to postEpoch))
  }

  private fun endClip(p: Playing) {
    if (!p.seg.playing.remove(p)) return
    releaseTrack(p.track, immediate = false)
    playingClips--
    beatFinished(p.seg, p.clipEndUptime)
  }

  private fun beatFinished(seg: Segment, refEnd: Long) {
    seg.finalized++
    if (seg.finalized >= seg.beats.size) finish(seg, cancelled = false)
    evaluateStt(refEnd)
    maybeReleaseFocus()
  }

  private fun finish(seg: Segment, cancelled: Boolean) {
    if (seg.done) return
    seg.done = true
    handler.removeCallbacksAndMessages(seg)
    segments.remove(seg.id, seg)
    for (p in seg.playing) { releaseTrack(p.track, immediate = true); playingClips-- }
    seg.playing.clear()
    for (b in seg.beats) { b.track?.let { releaseTrack(it, immediate = true) }; b.track = null }
    val d = seg.drifts.sorted()
    val n = d.size
    val f = mapOf(
      "segmentId" to seg.id, "beats" to seg.beats.size, "played" to seg.played, "missing" to seg.missing, "cancelled" to cancelled,
      "meanDriftMs" to if (n > 0) d.sum().toDouble() / n else 0.0,
      "p95DriftMs" to if (n > 0) d[maxOf(0, Math.ceil(0.95 * n).toInt() - 1)] else 0L,
      "maxDriftMs" to (d.lastOrNull() ?: 0L), "minDriftMs" to (d.firstOrNull() ?: 0L),
      "lateOver50Ms" to d.count { it > 50 }, "lateOver100Ms" to d.count { it > 100 },
    )
    log.log("pace_segment", f)
    emit("paceSegmentDone", f)
    evaluateStt(SystemClock.uptimeMillis())
    maybeReleaseFocus()
  }

  private fun releaseTrack(t: AudioTrack, immediate: Boolean) {
    try {
      if (immediate) { t.pause(); t.flush() }
      t.release()
    } catch (_: Throwable) {}
  }

  // ---- half-duplex STT ---------------------------------------------------------------------------------

  /** Releases the STT pause when nothing plays and the next unfired beat is at least [MIN_LISTEN_GAP_MS] after [refEnd]. */
  private fun evaluateStt(refEnd: Long) {
    if (!sttHeld || playingClips > 0) return
    var next = Long.MAX_VALUE
    for (s in segments.values) for (b in s.beats) if (!b.fired && b.scheduledUptime < next) next = b.scheduledUptime
    if (next != Long.MAX_VALUE && next - refEnd < MIN_LISTEN_GAP_MS) return
    sttHeld = false
    onSpeaking(false)
  }

  // ---- audio focus -------------------------------------------------------------------------------------

  private val focusRelease = Runnable {
    if (playingClips == 0 && !hasBeatWithin(FOCUS_GRACE_MS)) releaseFocusNow()
  }

  private fun hasBeatWithin(ms: Long): Boolean {
    val limit = SystemClock.uptimeMillis() + ms
    return segments.values.any { s -> s.beats.any { !it.fired && it.scheduledUptime <= limit } }
  }

  private fun ensureFocus() {
    handler.removeCallbacks(focusRelease)
    if (focusReq != null) return
    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
      .setAudioAttributes(attrs)
      .setWillPauseWhenDucked(false)
      .setOnAudioFocusChangeListener({ }, handler)
      .build()
    val r = am.requestAudioFocus(req)
    focusReq = req
    if (r != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) log.log("audio_focus", mapOf("granted" to false, "result" to r, "who" to "pace"))
  }

  private fun maybeReleaseFocus() {
    if (focusReq == null) return
    handler.removeCallbacks(focusRelease)
    if (playingClips == 0) handler.postDelayed(focusRelease, FOCUS_GRACE_MS)
  }

  private fun releaseFocusNow() {
    handler.removeCallbacks(focusRelease)
    focusReq?.let { try { am.abandonAudioFocusRequest(it) } catch (_: Throwable) {} }
    focusReq = null
  }

  companion object {
    /**
     * A spoken "stop" is only recognised in silence gaps of at least this length: while a clip plays, and across any gap
     * shorter than this before the next clip, speech recognition stays paused (half-duplex, avoids flapping and echo).
     * The JS UI also has an on-screen stop.
     */
    const val MIN_LISTEN_GAP_MS = 700L
    private const val FOCUS_GRACE_MS = 1500L
    private const val FOCUS_LEAD_MS = 500L
    private const val END_SLACK_MS = 50L
  }
}
