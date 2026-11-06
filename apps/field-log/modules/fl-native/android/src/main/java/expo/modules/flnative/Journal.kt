package expo.modules.flnative

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import java.io.File
import java.io.FileOutputStream
import org.json.JSONArray
import org.json.JSONObject

/** Wall clock, elapsed-realtime and boot count at one instant. */
data class ClockReading(val wallMs: Long, val elapsedUs: Long, val bootCount: Int) {
  fun toMap(): Map<String, Any?> = mapOf("wallMs" to wallMs, "elapsedUs" to elapsedUs, "bootCount" to bootCount)

  companion object {
    fun now(context: Context): ClockReading = ClockReading(
      System.currentTimeMillis(),
      SystemClock.elapsedRealtimeNanos() / 1000,
      bootCount(context),
    )

    fun bootCount(context: Context): Int =
      try { Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1) } catch (_: Exception) { -1 }
  }
}

/**
 * Append-only journal: one JSON object per line in `filesDir/fl-journal.jsonl`. A record is written and fsynced
 * before [append] returns, so callers emit events only for durable records. `journalSeq` is monotonic from 1 and is
 * recovered from the file on construction.
 */
class Journal(private val file: File, private val clock: () -> ClockReading) {
  private val lock = Any()
  private var seq = 0L
  private var stream: FileOutputStream? = null

  init {
    synchronized(lock) {
      if (file.exists()) {
        file.forEachLine { line ->
          val s = parse(line)?.optLong("journalSeq", 0L) ?: 0L
          if (s > seq) seq = s
        }
      }
    }
  }

  val lastSeq: Long get() = synchronized(lock) { seq }

  /** Appends a record of [kind] with the common fields plus [fields] (null values are omitted). */
  fun append(kind: String, memoId: String, recordingId: String, fields: Map<String, Any?>): JSONObject {
    synchronized(lock) {
      val c = clock()
      val record = JSONObject()
      record.put("journalSeq", seq + 1)
      record.put("kind", kind)
      record.put("memoId", memoId)
      record.put("recordingId", recordingId)
      record.put("wallMs", c.wallMs)
      record.put("elapsedUs", c.elapsedUs)
      record.put("bootCount", c.bootCount)
      for ((k, v) in fields) if (v != null) record.put(k, Json.toJson(v))
      val out = openStream()
      out.write((record.toString() + "\n").toByteArray(Charsets.UTF_8))
      out.flush()
      out.fd.sync()
      seq += 1
      return record
    }
  }

  fun readAfter(after: Long): List<JSONObject> = synchronized(lock) {
    if (!file.exists()) return emptyList()
    val out = ArrayList<JSONObject>()
    file.forEachLine { line ->
      val r = parse(line)
      if (r != null && r.optLong("journalSeq", 0L) > after) out.add(r)
    }
    out
  }

  private fun openStream(): FileOutputStream {
    stream?.let { return it }
    file.parentFile?.mkdirs()
    // A crash can leave a partial last line; terminate it so the next record starts on its own line.
    val needsNewline = file.exists() && file.length() > 0 && file.inputStream().use {
      it.skip(file.length() - 1); it.read() != '\n'.code
    }
    val s = FileOutputStream(file, true)
    if (needsNewline) s.write('\n'.code)
    stream = s
    return s
  }

  private fun parse(line: String): JSONObject? =
    if (line.isBlank()) null else try { JSONObject(line) } catch (_: Exception) { null }
}

object Json {
  /** Converts maps/lists to org.json; integer-valued doubles become longs so no float reaches the hashed events. */
  fun toJson(v: Any?): Any? = when (v) {
    null -> JSONObject.NULL
    is Map<*, *> -> JSONObject().also { o -> for ((k, x) in v) if (x != null) o.put(k.toString(), toJson(x)) }
    is Iterable<*> -> JSONArray().also { a -> for (x in v) a.put(toJson(x)) }
    is Array<*> -> JSONArray().also { a -> for (x in v) a.put(toJson(x)) }
    is Double -> if (v == Math.rint(v) && Math.abs(v) < 9.0e15) v.toLong() else v
    is Float -> toJson(v.toDouble())
    else -> v
  }

  /** org.json to plain Kotlin values for the JS bridge (longs beyond Int range become doubles). */
  fun toPlain(v: Any?): Any? = when (v) {
    is JSONObject -> HashMap<String, Any?>().also { m -> for (k in v.keys()) m[k] = toPlain(v.get(k)) }
    is JSONArray -> (0 until v.length()).map { toPlain(v.get(it)) }
    JSONObject.NULL -> null
    is Long -> if (v in Int.MIN_VALUE..Int.MAX_VALUE) v.toInt() else v.toDouble()
    else -> v
  }

  @Suppress("UNCHECKED_CAST")
  fun toPlainMap(o: JSONObject): Map<String, Any?> = toPlain(o) as Map<String, Any?>
}
