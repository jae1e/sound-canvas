package expo.modules.flnative

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.flnative.core.DownloadRules
import expo.modules.flnative.core.Hex
import expo.modules.kotlin.exception.CodedException
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.Call
import okhttp3.Request

/** FileProvider over cacheDir/updates; a subclass so its manifest entry never clashes with other libraries' providers. */
class UpdatesFileProvider : FileProvider()

/** In-app update: resumable download, install hand-off and clean-up. All APKs live in `cacheDir/updates`. */
object Updates {
  private class Active(val id: String, val part: File) {
    @Volatile var call: Call? = null
    @Volatile var cancelled = false
  }

  @Volatile private var active: Active? = null

  fun dir(c: Context) = File(c.cacheDir, "updates").also { it.mkdirs() }

  fun appInfo(c: Context): Map<String, Any?> {
    val p = c.packageManager.getPackageInfo(c.packageName, 0)
    return mapOf("packageName" to c.packageName, "versionName" to (p.versionName ?: ""), "versionCode" to p.longVersionCode)
  }

  private fun emit(id: String, state: String, bytes: Long, total: Long, error: String? = null) {
    val m = HashMap<String, Any?>()
    m["id"] = id; m["state"] = state; m["bytes"] = bytes; m["totalBytes"] = total
    if (error != null) m["error"] = error
    Engine.emit("onDownload", m)
  }

  /** Blocking; call off the main thread. Returns the absolute path of the verified file. */
  fun download(c: Context, id: String, url: String, headers: Map<String, String>, fileName: String, sha256: String): String {
    if (!DownloadRules.isSafeFileName(fileName)) throw CodedException("ERR_FILE_NAME", "Unsafe file name", null)
    val dir = dir(c)
    val target = File(dir, fileName)
    val part = File(dir, "$fileName.part")
    val me = Active(id, part)
    synchronized(this) {
      if (active != null) throw CodedException("ERR_BUSY", "A download is already running", null)
      active = me
    }
    val expected = sha256.lowercase()
    try {
      if (target.exists() && Hex.sha256(target) == expected) {
        emit(id, "done", target.length(), target.length())
        return target.absolutePath
      }
      target.delete()

      // One resumed attempt; a 416 (stale partial file) falls back to a clean download.
      if (!fetch(me, url, headers, part, part.length() > 0)) {
        part.delete()
        if (!fetch(me, url, headers, part, false)) throw CodedException("ERR_HTTP", "Download failed: HTTP 416", null)
      }

      if (Hex.sha256(part) != expected) {
        part.delete()
        throw CodedException("ERR_HASH", "SHA-256 of the downloaded file does not match", null)
      }
      if (!part.renameTo(target)) throw IOException("Cannot rename ${part.name}")
      emit(id, "done", target.length(), target.length())
      return target.absolutePath
    } catch (e: Throwable) {
      val cancelled = me.cancelled || e is CancelledException
      if (cancelled) {
        part.delete()
        emit(id, "cancelled", 0, 0)
        throw CodedException("ERR_CANCELLED", "Download cancelled", e)
      }
      // Network errors keep the .part so the next call resumes; a hash mismatch already deleted it.
      emit(id, "error", part.length(), -1, e.message ?: e.toString())
      throw if (e is CodedException) e else CodedException("ERR_DOWNLOAD", e.message ?: e.toString(), e)
    } finally {
      synchronized(this) { active = null }
    }
  }

  /** Returns false only when the server answered 416 to our Range request. Throws on any other failure. */
  private fun fetch(me: Active, url: String, headers: Map<String, String>, part: File, askRange: Boolean): Boolean {
    val partSize = if (askRange) part.length() else 0L
    val req = Request.Builder().url(url).apply {
      for ((k, v) in headers) header(k, v)
      DownloadRules.rangeHeader(partSize)?.let { header("Range", it) }
    }.build()
    val client = Engine.http.newBuilder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS)
      .callTimeout(0, TimeUnit.SECONDS).build()
    val call = client.newCall(req)
    me.call = call
    if (me.cancelled) throw CancelledException()
    call.execute().use { resp ->
      val action = DownloadRules.actionFor(resp.code, partSize > 0)
      if (action == DownloadRules.Action.RETRY_WITHOUT_RANGE) return false
      if (action == DownloadRules.Action.FAIL) throw CodedException("ERR_HTTP", "Download failed: HTTP ${resp.code}", null)
      val body = resp.body ?: throw IOException("Empty response")
      val append = action == DownloadRules.Action.APPEND
      val total = DownloadRules.totalBytes(action, partSize, body.contentLength(), resp.header("Content-Range"))
      var bytes = if (append) partSize else 0L
      var lastEmit = 0L
      emit(me.id, "running", bytes, total)
      FileOutputStream(part, append).use { out ->
        val buf = ByteArray(64 * 1024)
        val src = body.byteStream()
        while (true) {
          val n = src.read(buf)
          if (n < 0) break
          out.write(buf, 0, n)
          bytes += n
          val now = System.currentTimeMillis()
          if (now - lastEmit >= 200) { lastEmit = now; emit(me.id, "running", bytes, total) }
        }
        out.fd.sync()
      }
      if (total >= 0 && bytes != total) throw IOException("Incomplete download: $bytes of $total bytes")
      emit(me.id, "running", bytes, total)
    }
    return true
  }

  private class CancelledException : Exception()

  fun cancel(id: String) {
    val a = active ?: return
    if (a.id != id) return
    a.cancelled = true
    a.call?.cancel()
  }

  fun canInstall(c: Context) = Build.VERSION.SDK_INT < 26 || c.packageManager.canRequestPackageInstalls()

  fun openInstallSettings(c: Context) {
    c.startActivity(
      Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${c.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
  }

  fun install(c: Context, path: String) {
    val file = File(path.removePrefix("file://"))
    if (!DownloadRules.isInside(dir(c), file) || !file.isFile) {
      throw CodedException("ERR_PATH", "Only APKs under the app's updates folder can be installed", null)
    }
    val uri = FileProvider.getUriForFile(c, "${c.packageName}.flnative.updates", file)
    c.startActivity(
      Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, "application/vnd.android.package-archive")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
    )
  }

  fun cleanup(c: Context, all: Boolean): Int {
    val pm = c.packageManager
    val ours = pm.getPackageInfo(c.packageName, 0).longVersionCode
    val now = System.currentTimeMillis()
    var n = 0
    for (f in dir(c).listFiles() ?: emptyArray()) {
      if (!f.isFile) continue
      val delete = when {
        f.name.endsWith(".apk") -> {
          val v = try { pm.getPackageArchiveInfo(f.absolutePath, 0)?.longVersionCode } catch (_: Exception) { null }
          DownloadRules.shouldDeleteApk(all, v, ours)
        }
        f.name.endsWith(".part") -> active?.part?.absolutePath != f.absolutePath && DownloadRules.isStalePart(f.lastModified(), now)
        else -> false
      }
      if (delete && f.delete()) n++
    }
    return n
  }
}
