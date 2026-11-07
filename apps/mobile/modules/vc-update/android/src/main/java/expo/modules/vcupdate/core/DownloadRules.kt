package expo.modules.vcupdate.core

import java.io.File

/** Pure decisions for resumable downloads and APK clean-up. */
object DownloadRules {
  enum class Action { APPEND, RESTART, RETRY_WITHOUT_RANGE, FAIL }

  /** `Range` header value for resuming from a partial file, or null when there is nothing to resume. */
  fun rangeHeader(partSize: Long): String? = if (partSize > 0) "bytes=$partSize-" else null

  /**
   * What to do with the response: 206 appends to the partial file (only if we asked for a range), 200 restarts from
   * zero, 416 means the partial file is unusable so ask again without a range, anything else fails.
   */
  fun actionFor(status: Int, askedRange: Boolean): Action = when {
    status == 206 && askedRange -> Action.APPEND
    status == 200 -> Action.RESTART
    status == 416 && askedRange -> Action.RETRY_WITHOUT_RANGE
    else -> Action.FAIL
  }

  /** Total size of the final file: from `Content-Range: bytes a-b/total` on 206, else partial + length, else length. */
  fun totalBytes(action: Action, partSize: Long, contentLength: Long, contentRange: String?): Long {
    if (action == Action.APPEND) {
      val total = contentRange?.substringAfterLast('/')?.trim()?.toLongOrNull()
      if (total != null) return total
      return if (contentLength >= 0) partSize + contentLength else -1
    }
    return contentLength
  }

  /** A plain file name: no separators, no parent references. */
  fun isSafeFileName(name: String): Boolean =
    name.isNotEmpty() && name != "." && name != ".." && !name.contains('/') && !name.contains('\\') && !name.contains('\u0000')

  /** True when [file] resolves to a path strictly inside [dir] (symlinks and `..` resolved). */
  fun isInside(dir: File, file: File): Boolean {
    val base = dir.canonicalFile.path + File.separator
    return file.canonicalFile.path.startsWith(base)
  }

  /** Delete an APK when forced, unreadable, or not newer than the installed build. */
  fun shouldDeleteApk(all: Boolean, apkVersionCode: Long?, ourVersionCode: Long): Boolean =
    all || apkVersionCode == null || apkVersionCode <= ourVersionCode

  fun isStalePart(lastModifiedMs: Long, nowMs: Long, maxAgeMs: Long = 24L * 60 * 60 * 1000): Boolean = nowMs - lastModifiedMs > maxAgeMs
}
