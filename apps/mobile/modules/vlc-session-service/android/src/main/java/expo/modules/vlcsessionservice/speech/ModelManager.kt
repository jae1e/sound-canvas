package expo.modules.vlcsessionservice.speech

import android.content.Context
import expo.modules.vlcsessionservice.log.DiagLog
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream
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

  /** Marker written after an archive has been verified and extracted (the archive itself is then deleted). */
  private fun markerFor(setId: String, f: ModelFile) = File(dir(setId), f.name + ".extracted")

  fun isPresent(setId: String, f: ModelFile): Boolean =
    if (f.archive) markerFor(setId, f).isFile else fileFor(setId, f.name).let { it.isFile && it.length() == f.sizeBytes }

  fun isReady(set: ModelSet): Boolean = set.files.all { isPresent(set.id, it) }

  fun status(): List<Map<String, Any?>> = ModelCatalog.all.map { set ->
    mapOf(
      "id" to set.id,
      "title" to set.title,
      "ready" to isReady(set),
      "totalBytes" to set.totalBytes,
      "dir" to dir(set.id).absolutePath,
      "files" to set.files.map { f ->
        mapOf("name" to f.name, "url" to f.url, "sizeBytes" to f.sizeBytes, "present" to isPresent(set.id, f))
      },
    )
  }

  fun cancel() = cancelled.set(true)

  private fun sizeOf(f: File): Long = if (f.isFile) f.length() else f.walkTopDown().filter { it.isFile }.sumOf { it.length() }

  /**
   * Everything under `<filesDir>/vlc-models/`: one entry per directory, catalog or not (stray directories, partial
   * `.part` files and half-extracted archives are counted in `bytes`). Loose files at the root are listed as sets too.
   */
  fun installedSets(): List<Map<String, Any?>> =
    (root.listFiles() ?: emptyArray()).sortedBy { it.name }.map { d ->
      val files = if (d.isDirectory) d.walkTopDown().filter { it.isFile }.toList() else listOf(d)
      val set = ModelCatalog.find(d.name)
      mapOf(
        "setId" to d.name,
        "title" to (set?.title ?: "(not in catalog)"),
        "bytes" to files.sumOf { it.length() },
        "files" to files.size,
        "inCatalog" to (set != null),
        "ready" to (set?.let { isReady(it) } ?: false),
        "partial" to files.any { it.name.endsWith(".part") || it.name.endsWith(".tmp") },
      )
    }

  /** Deletes one set directory (also strays and partial downloads). [release] runs first so loaded engines let go of the files. */
  fun deleteSet(setId: String, release: (String) -> Unit = {}): Map<String, Any?> {
    if (setId.isEmpty() || setId.contains('/') || setId.contains("..")) throw IllegalArgumentException("Bad set id '$setId'")
    if (downloading.get()) throw IllegalStateException("A download is running: cancel it first")
    val target = File(root, setId)
    if (!target.exists()) return mapOf("setId" to setId, "bytesFreed" to 0L, "deleted" to false)
    release(setId)
    val bytes = sizeOf(target)
    val ok = target.deleteRecursively()
    log.log("model_deleted", mapOf("setId" to setId, "bytes" to bytes, "ok" to ok))
    return mapOf("setId" to setId, "bytesFreed" to if (ok) bytes else 0L, "deleted" to ok)
  }

  /** Deletes every installed set except [keep]; logs a `model_storage` summary. */
  fun deleteUnused(keep: List<String>, release: (String) -> Unit = {}): Map<String, Any?> {
    val results = installedSets().map { it["setId"] as String }.filter { it !in keep }.map { deleteSet(it, release) }
    val freed = results.sumOf { it["bytesFreed"] as Long }
    val summary = logStorage("delete_unused", mapOf("kept" to keep, "deleted" to results.filter { it["deleted"] == true }.map { it["setId"] }, "bytesFreed" to freed))
    return summary + ("results" to results)
  }

  /** Logs a `model_storage` event with totals and returns it. */
  fun logStorage(reason: String, extra: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val sets = installedSets()
    val payload = mapOf(
      "reason" to reason,
      "totalBytes" to sets.sumOf { it["bytes"] as Long },
      "sets" to sets.map { mapOf("setId" to it["setId"], "bytes" to it["bytes"]) },
    ) + extra
    log.log("model_storage", payload)
    return payload
  }

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
          if (isPresent(set.id, f)) {
            doneBytes += f.sizeBytes
            onProgress(progress(set, f, f.sizeBytes, doneBytes, total, "skipped"))
            continue
          }
          log.log("model_download_start", mapOf("set" to set.id, "file" to f.name, "url" to f.url))
          val started = System.currentTimeMillis()
          downloadOne(set, f, target) { fileBytes ->
            onProgress(progress(set, f, fileBytes, doneBytes + fileBytes, total, "downloading"))
          }
          if (f.archive) {
            onProgress(progress(set, f, f.sizeBytes, doneBytes + f.sizeBytes, total, "extracting"))
            extractArchive(set, f, target)
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

  /** Extracts a verified tar.bz2 into the set directory (top-level folder stripped), then replaces it with a marker. */
  private fun extractArchive(set: ModelSet, f: ModelFile, archive: File) {
    val outDir = dir(set.id).canonicalFile
    try {
      TarArchiveInputStream(BZip2CompressorInputStream(archive.inputStream().buffered(1 shl 16))).use { tar ->
        while (true) {
          if (cancelled.get()) throw IOException("Extraction cancelled")
          val entry = tar.nextEntry ?: break
          val rel = entry.name.removePrefix("./").substringAfter('/', "")
          if (rel.isEmpty() || f.extractSkip.any { rel.startsWith(it) }) continue
          val dest = File(outDir, rel).canonicalFile
          if (!dest.path.startsWith(outDir.path + File.separator)) throw IOException("Unsafe archive entry ${entry.name}")
          if (entry.isDirectory) {
            dest.mkdirs()
          } else if (entry.isFile) {
            dest.parentFile?.mkdirs()
            dest.outputStream().use { tar.copyTo(it) }
          }
        }
      }
      markerFor(set.id, f).writeText("ok ${System.currentTimeMillis()}\n")
      archive.delete()
    } catch (e: Exception) {
      log.log("error", mapOf("where" to "model_extract", "set" to set.id, "file" to f.name, "message" to e.toString()))
      throw e
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
