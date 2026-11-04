package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.os.SystemClock
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.log.chainText
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

/**
 * Pre-synthesised phrase clips for the pacing player. Supertonic takes about 1.8 s to first audio and does not stream,
 * so every phrase of a routine is rendered once to `filesDir/vlc-pacing/<engine>-<lang>-<sha1>.wav` (16-bit PCM mono)
 * and played later from memory. The key hashes `engine|voice|steps|lang|text`, so changing voice or steps misses the
 * cache instead of playing a stale voice. Only the session voice (chosen once per session, see TtsController) is ever read
 * or written; there is no cross-engine fallback. Nothing here plays audio.
 */
class PacingCache(
  private val context: Context,
  private val log: DiagLog,
  private val tts: TtsController,
) {
  /** Decoded clip. [pcm] is 16-bit mono at [sampleRate]. */
  class Clip(val pcm: ShortArray, val sampleRate: Int, val durationMs: Long) {
    val bytes: Long get() = pcm.size * 2L
  }

  data class ClipResult(val text: String, val lang: String, val durationMs: Long, val cached: Boolean, val engine: String, val ok: Boolean) {
    fun toMap(): Map<String, Any?> = mapOf("text" to text, "lang" to lang, "durationMs" to durationMs, "cached" to cached, "engine" to engine, "ok" to ok)
  }

  data class PrepareResult(
    val engine: String,
    val voice: Int,
    val steps: Int,
    val total: Int,
    val synthesized: Int,
    val cached: Int,
    val failed: List<String>,
    val clips: List<ClipResult>,
    val elapsedMs: Long,
  ) {
    fun toMap(): Map<String, Any?> = mapOf(
      "engine" to engine, "voice" to voice, "steps" to steps, "total" to total, "synthesized" to synthesized,
      "cached" to cached, "failed" to failed, "clips" to clips.map { it.toMap() }, "elapsedMs" to elapsedMs,
    )
  }

  private val dir = File(context.filesDir, "vlc-pacing")

  // LRU of decoded clips, access ordered; guarded by itself.
  private val mem = LinkedHashMap<String, Clip>(16, 0.75f, true)
  private var memBytes = 0L

  fun cachedFileCount(): Int = dir.listFiles { f -> f.name.endsWith(".wav") }?.size ?: 0

  fun clear(): Int {
    synchronized(mem) { mem.clear(); memBytes = 0 }
    synchronized(composed) { composed.clear() }
    val files = dir.listFiles() ?: return 0
    var n = 0
    for (f in files) if (f.delete()) n++
    log.log("pace_cache_clear", mapOf("deleted" to n))
    return n
  }

  // ---- lookup (used by the player) -----------------------------------------------------------------

  /**
   * Cached clip in the SESSION voice only (never another engine's clip), or null. A text containing [COMPOSE_SEP] is a
   * composed phrase: its fragments' clips joined with [COMPOSE_GAP_MS] of silence (null if any fragment is missing).
   */
  fun clipFor(text: String, lang: String): Clip? {
    if (text.indexOf(COMPOSE_SEP) >= 0) return compose(text.split(COMPOSE_SEP), lang)
    val l = normLang(lang)
    val e = tts.sessionVoice
    val key = keyFor(e, l, text)
    synchronized(mem) { mem[key] }?.let { return it }
    val f = fileFor(e, l, key)
    return if (f.isFile) load(key, f) else null
  }

  fun hasClip(text: String, lang: String): Boolean = clipFor(text, lang) != null

  private val composed = LinkedHashMap<String, Clip>(8, 0.75f, true)

  /** Concatenates fragment clips with short gaps. Null when a fragment is missing or the sample rates differ. */
  fun compose(parts: List<String>, lang: String): Clip? {
    val clean = parts.map { it.trim() }.filter { it.isNotEmpty() }
    if (clean.isEmpty()) return null
    val cacheKey = "${tts.sessionVoice}|${normLang(lang)}|${clean.joinToString(COMPOSE_SEP.toString())}"
    synchronized(composed) { composed[cacheKey] }?.let { return it }
    val clips = ArrayList<Clip>()
    for (part in clean) clips.add(clipFor(part, lang) ?: return null)
    val sr = clips[0].sampleRate
    if (clips.any { it.sampleRate != sr }) return null
    val gap = sr * COMPOSE_GAP_MS / 1000
    val out = ShortArray(clips.sumOf { it.pcm.size } + gap * (clips.size - 1))
    var o = 0
    for ((i, c) in clips.withIndex()) {
      System.arraycopy(c.pcm, 0, out, o, c.pcm.size)
      o += c.pcm.size
      if (i < clips.size - 1) o += gap
    }
    val clip = Clip(out, sr, out.size * 1000L / sr)
    synchronized(composed) {
      composed[cacheKey] = clip
      while (composed.size > MAX_COMPOSED) {
        val it = composed.entries.iterator()
        it.next()
        it.remove()
      }
    }
    return clip
  }

  private fun load(key: String, f: File): Clip? {
    val decoded = try { WavIo.read(f.readBytes()) } catch (_: Throwable) { null }
    if (decoded == null || decoded.first.isEmpty()) {
      f.delete()
      return null
    }
    val clip = Clip(decoded.first, decoded.second, decoded.first.size * 1000L / decoded.second)
    synchronized(mem) {
      mem.put(key, clip)?.let { memBytes -= it.bytes }
      memBytes += clip.bytes
      val it = mem.entries.iterator()
      while (memBytes > MAX_MEM_BYTES && mem.size > 1 && it.hasNext()) {
        val e = it.next()
        if (e.value === clip) continue
        memBytes -= e.value.bytes
        it.remove()
      }
    }
    return clip
  }

  // ---- prepare ---------------------------------------------------------------------------------------

  /** Blocking: call off the main thread. [clips] are (text, lang) pairs; duplicates are merged. */
  fun prepare(clips: List<Pair<String, String>>, progress: (done: Int, total: Int) -> Unit): PrepareResult {
    val t0 = SystemClock.elapsedRealtime()
    val unique = clips.map { Pair(it.first.trim(), normLang(it.second)) }.filter { it.first.isNotEmpty() }.distinct()
    val voice = tts.sessionSid
    val steps = tts.sessionSteps
    // The session voice was chosen once at session start; the cache never mixes in another engine.
    val useSt = tts.sessionVoice == ST
    if (useSt) {
      tts.ensureSupertonic()
      awaitEngine(SUPERTONIC_WAIT_MS)
    }
    dir.mkdirs()
    val results = ArrayList<ClipResult>()
    var synthesized = 0
    var cachedN = 0
    val failed = ArrayList<String>()
    progress(0, unique.size)
    for ((i, c) in unique.withIndex()) {
      val r = prepareOne(c.first, c.second, useSt, voice, steps)
      results.add(r.first)
      if (!r.first.ok) failed.add(c.first) else if (r.first.cached) cachedN++ else synthesized++
      progress(i + 1, unique.size)
    }
    val engine = if (useSt) ST else PL
    val out = PrepareResult(engine, if (useSt) voice else 0, if (useSt) steps else 0, unique.size, synthesized, cachedN, failed, results, SystemClock.elapsedRealtime() - t0)
    log.log("pace_prepare", mapOf(
      "engine" to engine, "total" to out.total, "synthesized" to synthesized, "cached" to cachedN, "failed" to failed.size,
      "elapsedMs" to out.elapsedMs,
    ))
    return out
  }

  /** Returns (result, false). A failed clip stays failed: it is retried with the same engine, never filled by another. */
  private fun prepareOne(text: String, lang: String, useSt: Boolean, voice: Int, steps: Int): Pair<ClipResult, Boolean> {
    val engine = if (useSt) ST else PL
    val key = keyFor(engine, lang, text, voice, steps)
    val f = fileFor(engine, lang, key)
    if (f.isFile) load(key, f)?.let { return Pair(ClipResult(text, lang, it.durationMs, true, engine, true), false) }
    val pcm = if (useSt) synthSupertonic(text, lang, voice, steps) else synthPlatform(text, lang)
    val clip = pcm?.let { store(key, f, it.first, it.second) }
    if (clip == null) {
      log.log("pace_clip_failed", mapOf("text" to text, "lang" to lang, "engine" to engine))
      return Pair(ClipResult(text, lang, 0, false, engine, false), false)
    }
    return Pair(ClipResult(text, lang, clip.durationMs, false, engine, true), false)
  }

  /** Waits (up to [ms]) for the Supertonic engine to be loaded, for example while it reloads after a failure. */
  private fun awaitEngine(ms: Long) {
    val deadline = SystemClock.elapsedRealtime() + ms
    while (tts.supertonicEngine() == null && tts.sessionVoice == ST && SystemClock.elapsedRealtime() < deadline) Thread.sleep(100)
  }

  private fun synthSupertonic(text: String, lang: String, voice: Int, steps: Int): Pair<ShortArray, Int>? {
    repeat(3) { attempt ->
      if (tts.supertonicEngine() == null) awaitEngine(SUPERTONIC_WAIT_MS)
      val engine = tts.supertonicEngine() ?: return null
      val r = try { engine.synthesizeToPcm(text, TtsController.localeFor(lang), voice, steps) } catch (e: Throwable) {
        log.log("pace_synth_error", mapOf("engine" to ST, "error" to e.chainText())); null
      }
      if (r != null) return Pair(toShorts(r.first), r.second)
      Thread.sleep(150L * (attempt + 1)) // aborted by live speech, or a transient failure: retry
    }
    return null
  }

  private fun synthPlatform(text: String, lang: String): Pair<ShortArray, Int>? {
    val tmp = File(dir, "tmp-${System.nanoTime()}.wav")
    try {
      repeat(2) {
        if (tts.synthesizePlatformToFile(text, TtsController.localeFor(lang), tmp)) {
          val d = try { WavIo.read(tmp.readBytes()) } catch (_: Throwable) { null }
          if (d != null && d.first.isNotEmpty()) return d
        }
        tmp.delete()
      }
      return null
    } finally {
      tmp.delete()
    }
  }

  /** Trims silence, writes the WAV atomically and registers the decoded clip. */
  private fun store(key: String, f: File, pcm: ShortArray, sampleRate: Int): Clip? {
    val trimmed = trim(pcm, sampleRate)
    if (trimmed.isEmpty()) return null
    val tmp = File(dir, "${f.name}.tmp")
    try {
      tmp.writeBytes(WavIo.encode(trimmed, sampleRate))
      if (!tmp.renameTo(f)) return null
    } catch (e: Throwable) {
      log.log("pace_store_failed", mapOf("error" to e.chainText()))
      tmp.delete()
      return null
    }
    return load(key, f)
  }

  /** Cuts leading/trailing samples below [SILENCE_THRESHOLD], keeping [LEAD_KEEP_MS] before and [TAIL_KEEP_MS] after the audible part. */
  private fun trim(pcm: ShortArray, sr: Int): ShortArray {
    var first = -1
    var last = -1
    for (i in pcm.indices) if (Math.abs(pcm[i].toInt()) > SILENCE_THRESHOLD) { if (first < 0) first = i; last = i }
    if (first < 0) return ShortArray(0)
    val start = maxOf(0, first - sr * LEAD_KEEP_MS / 1000)
    val end = minOf(pcm.size, last + 1 + sr * TAIL_KEEP_MS / 1000)
    return pcm.copyOfRange(start, end)
  }

  private fun toShorts(f: FloatArray): ShortArray = ShortArray(f.size) { i ->
    (f[i] * 32767f).coerceIn(-32768f, 32767f).toInt().toShort()
  }

  // ---- keys ------------------------------------------------------------------------------------------

  private fun keyFor(engine: String, lang: String, text: String, voice: Int = tts.sessionSid, steps: Int = tts.sessionSteps): String {
    val v = if (engine == ST) voice else 0
    val s = if (engine == ST) steps else 0
    val md = MessageDigest.getInstance("SHA-1").digest("$engine|$v|$s|$lang|$text".toByteArray(Charsets.UTF_8))
    return md.joinToString("") { "%02x".format(it) }
  }

  private fun fileFor(engine: String, lang: String, key: String) = File(dir, "$engine-$lang-$key.wav")

  private fun normLang(l: String) = if (l.startsWith("en")) "en" else "ko"

  /** Minimal 16-bit PCM WAV reader/writer. */
  object WavIo {
    fun encode(pcm: ShortArray, sr: Int): ByteArray {
      val dataLen = pcm.size * 2
      val b = ByteBuffer.allocate(44 + dataLen).order(ByteOrder.LITTLE_ENDIAN)
      b.put("RIFF".toByteArray()).putInt(36 + dataLen).put("WAVE".toByteArray())
      b.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(sr).putInt(sr * 2).putShort(2).putShort(16)
      b.put("data".toByteArray()).putInt(dataLen)
      for (s in pcm) b.putShort(s)
      return b.array()
    }

    /** Returns (mono samples, sampleRate), or null when the data is not 16-bit PCM. Multi-channel input is averaged. */
    fun read(bytes: ByteArray): Pair<ShortArray, Int>? {
      if (bytes.size < 44) return null
      val b = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      if (String(bytes, 0, 4) != "RIFF" || String(bytes, 8, 4) != "WAVE") return null
      var pos = 12
      var channels = 0
      var sr = 0
      var bits = 0
      var format = 0
      while (pos + 8 <= bytes.size) {
        val id = String(bytes, pos, 4)
        val size = b.getInt(pos + 4).toLong() and 0xFFFFFFFFL
        val body = pos + 8
        if (id == "fmt " && body + 16 <= bytes.size) {
          format = b.getShort(body).toInt() and 0xFFFF
          channels = b.getShort(body + 2).toInt()
          sr = b.getInt(body + 4)
          bits = b.getShort(body + 14).toInt()
        } else if (id == "data") {
          if ((format != 1 && format != 0xFFFE) || bits != 16 || channels < 1 || sr <= 0) return null
          val avail = (bytes.size - body).toLong()
          val len = (if (size == 0L || size > avail) avail else size).toInt()
          val frames = len / (2 * channels)
          val out = ShortArray(frames)
          for (i in 0 until frames) {
            var sum = 0
            for (c in 0 until channels) sum += b.getShort(body + (i * channels + c) * 2).toInt()
            out[i] = (sum / channels).toShort()
          }
          return Pair(out, sr)
        }
        pos = body + size.toInt() + (size.toInt() and 1)
        if (size > bytes.size) break
      }
      return null
    }
  }

  companion object {
    const val ST = "supertonic"
    const val PL = "platform"
    /** Joins the fragments of a composed phrase in a clip lookup text. */
    const val COMPOSE_SEP = '\u0001'
    const val COMPOSE_GAP_MS = 80
    private const val MAX_COMPOSED = 32
    private const val MAX_MEM_BYTES = 64L * 1024 * 1024
    private const val SUPERTONIC_WAIT_MS = 20_000L
    private const val SILENCE_THRESHOLD = 130 // about -48 dBFS
    private const val LEAD_KEEP_MS = 5 // keep the lead tiny: the first sample should be the first audible one
    private const val TAIL_KEEP_MS = 20
  }
}
