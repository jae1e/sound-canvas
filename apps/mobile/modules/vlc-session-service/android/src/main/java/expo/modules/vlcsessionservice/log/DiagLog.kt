package expo.modules.vlcsessionservice.log

import android.content.Context
import android.os.SystemClock
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

/**
 * Append-only JSONL diagnostics log in app-private storage. Every line carries
 * `t` (wall-clock epoch ms), `rt` (SystemClock.elapsedRealtime ms) and `ev` (event name).
 * Writes happen on a single background thread so callers never block on disk I/O.
 */
class DiagLog private constructor(context: Context) {
  private val file: File = File(File(context.filesDir, "vlc-diag").apply { mkdirs() }, "diag.jsonl")
  private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "vlc-diag-log").apply { isDaemon = true } }

  val path: String get() = file.absolutePath

  fun log(event: String, fields: Map<String, Any?> = emptyMap()) {
    val obj = JSONObject()
    obj.put("t", System.currentTimeMillis())
    obj.put("rt", SystemClock.elapsedRealtime())
    obj.put("ev", event)
    for ((k, v) in fields) obj.put(k, toJson(v))
    val line = obj.toString()
    Log.d(TAG, line)
    io.execute {
      try {
        file.appendText(line + "\n")
      } catch (e: Exception) {
        Log.e(TAG, "log write failed", e)
      }
    }
  }

  /** Blocks until all queued lines are written (used before summarising / sharing). */
  fun flush() {
    try {
      io.submit { }.get()
    } catch (_: Exception) {
    }
  }

  fun clear() {
    flush()
    io.submit { file.writeText("") }.get()
  }

  fun readLines(): List<String> {
    flush()
    return if (file.exists()) file.readLines() else emptyList()
  }

  private fun toJson(v: Any?): Any? = when (v) {
    null -> JSONObject.NULL
    is Map<*, *> -> JSONObject().also { o -> v.forEach { (k, x) -> o.put(k.toString(), toJson(x)) } }
    is Iterable<*> -> org.json.JSONArray().also { a -> v.forEach { a.put(toJson(it)) } }
    is Number, is Boolean, is String -> v
    else -> v.toString()
  }

  companion object {
    private const val TAG = "VlcDiag"

    @Volatile
    private var instance: DiagLog? = null

    fun get(context: Context): DiagLog =
      instance ?: synchronized(this) {
        instance ?: DiagLog(context.applicationContext).also { instance = it }
      }
  }
}
