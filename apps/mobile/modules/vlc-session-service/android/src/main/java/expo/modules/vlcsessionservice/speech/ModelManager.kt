package expo.modules.vlcsessionservice.speech

import android.content.Context
import expo.modules.vlcsessionservice.log.DiagLog
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean

/** Downloads and verifies model files into `<filesDir>/vlc-models/<setId>/`. */
class ModelManager(context: Context) {
  private val root = File(context.filesDir, "vlc-models").apply { mkdirs() }
  private val log = DiagLog.get(context)
  private val cancelled = AtomicBoolean(false)
  private val downloading = AtomicBoolean(false)

  fun dir(setId: String): File = File(root, setId)

  fun fileFor(setId: String, name: String): File = File(dir(setId), name)

  fun isReady(set: ModelSet): Boolean = set.files.all { f -> fileFor(set.id, f.name).let { it.isFile && it.length() == f.sizeBytes } }

  fun status(): List<Map<String, Any?>> = ModelCatalog.all.map { set ->
    mapOf(
      "id" to set.id,
      "title" to set.title,
      "ready" to isReady(set),
      "totalBytes" to set.totalBytes,
      "dir" to dir(set.id).absolutePath,
      "files" to set.files.map { f ->
        val local = fileFor(set.id, f.name)
        mapOf("name" to f.name, "url" to f.url, "sizeBytes" to f.sizeBytes, "present" to (local.isFile && local.length() == f.sizeBytes))
      },
    )
  }

  fun cancel() = cancelled.set(true)

  /**
   * Blocking download of the given sets. Emits progress through [onProgress]. Throws on failure
   * (size or SHA-256 mismatch deletes the partial file). Call from a background thread.
   */
  fun download(setIds: List<String>, onProgress: (Map<String, Any?>) -> Unit) {
    if (!downloading.compareAndSet(false, true)) throw IllegalStateException("A download is already running")
    cancelled.set(false)
    try {
      val sets = setIds.map { ModelCatalog.find(it) ?: throw IllegalArgumentException("Unknown model set '$it'") }
      val total = sets.sumOf { it.totalBytes }
      var doneBytes = 0L
      for (set in sets) {
        dir(set.id).mkdirs()
        for (f in set.files) {
          val target = fileFor(set.id, f.name)
          if (target.isFile && target.length() == f.sizeBytes) {
            doneBytes += f.sizeBytes
            onProgress(progress(set, f, f.sizeBytes, doneBytes, total, "skipped"))
            continue
          }
          log.log("model_download_start", mapOf("set" to set.id, "file" to f.name, "url" to f.url))
          val started = System.currentTimeMillis()
          downloadOne(set, f, target) { fileBytes ->
            onProgress(progress(set, f, fileBytes, doneBytes + fileBytes, total, "downloading"))
          }
          doneBytes += f.sizeBytes
          log.log("model_download_done", mapOf("set" to set.id, "file" to f.name, "ms" to System.currentTimeMillis() - started))
          onProgress(progress(set, f, f.sizeBytes, doneBytes, total, "verified"))
        }
      }
    } finally {
      downloading.set(false)
    }
  }

  private fun progress(set: ModelSet, f: ModelFile, fileBytes: Long, overall: Long, total: Long, phase: String) = mapOf(
    "setId" to set.id,
    "file" to f.name,
    "phase" to phase,
    "fileBytes" to fileBytes,
    "fileTotalBytes" to f.sizeBytes,
    "overallBytes" to overall,
    "overallTotalBytes" to total,
    "overallFraction" to if (total > 0) overall.toDouble() / total else 0.0,
  )

  private fun downloadOne(set: ModelSet, f: ModelFile, target: File, onBytes: (Long) -> Unit) {
    val part = File(target.parentFile, target.name + ".part")
    part.delete()
    val conn = URL(f.url).openConnection() as HttpURLConnection
    conn.connectTimeout = 15_000
    conn.readTimeout = 30_000
    conn.instanceFollowRedirects = true
    conn.setRequestProperty("User-Agent", "vlc-spike/0.1")
    try {
      if (conn.responseCode !in 200..299) throw IOException("HTTP ${conn.responseCode} for ${f.url}")
      val md = MessageDigest.getInstance("SHA-256")
      var written = 0L
      var lastReport = 0L
      conn.inputStream.use { input ->
        part.outputStream().use { out ->
          val buf = ByteArray(64 * 1024)
          while (true) {
            if (cancelled.get()) throw IOException("Download cancelled")
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
            md.update(buf, 0, n)
            written += n
            val now = System.currentTimeMillis()
            if (now - lastReport > 250) {
              lastReport = now
              onBytes(written)
            }
          }
        }
      }
      val sha = md.digest().joinToString("") { "%02x".format(it) }
      if (written != f.sizeBytes) throw IOException("Size mismatch for ${f.name}: expected ${f.sizeBytes}, got $written")
      if (!sha.equals(f.sha256, ignoreCase = true)) throw IOException("SHA-256 mismatch for ${f.name}: expected ${f.sha256}, got $sha")
      target.delete()
      if (!part.renameTo(target)) throw IOException("Could not move ${part.name} into place")
    } catch (e: Exception) {
      part.delete()
      log.log("error", mapOf("where" to "model_download", "set" to set.id, "file" to f.name, "message" to e.toString()))
      throw e
    } finally {
      conn.disconnect()
    }
  }
}
