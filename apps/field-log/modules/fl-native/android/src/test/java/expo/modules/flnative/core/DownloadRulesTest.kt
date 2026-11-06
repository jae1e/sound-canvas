package expo.modules.flnative.core

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DownloadRulesTest {
  @Test fun rangeHeader() {
    assertNull(DownloadRules.rangeHeader(0))
    assertEquals("bytes=1234-", DownloadRules.rangeHeader(1234))
  }

  @Test fun actions() {
    assertEquals(DownloadRules.Action.APPEND, DownloadRules.actionFor(206, true))
    assertEquals(DownloadRules.Action.FAIL, DownloadRules.actionFor(206, false))
    assertEquals(DownloadRules.Action.RESTART, DownloadRules.actionFor(200, true)) // server ignored the range
    assertEquals(DownloadRules.Action.RESTART, DownloadRules.actionFor(200, false))
    assertEquals(DownloadRules.Action.RETRY_WITHOUT_RANGE, DownloadRules.actionFor(416, true))
    assertEquals(DownloadRules.Action.FAIL, DownloadRules.actionFor(416, false))
    assertEquals(DownloadRules.Action.FAIL, DownloadRules.actionFor(404, true))
  }

  @Test fun totals() {
    assertEquals(1000L, DownloadRules.totalBytes(DownloadRules.Action.APPEND, 400, 600, "bytes 400-999/1000"))
    assertEquals(1000L, DownloadRules.totalBytes(DownloadRules.Action.APPEND, 400, 600, null))
    assertEquals(-1L, DownloadRules.totalBytes(DownloadRules.Action.APPEND, 400, -1, null))
    assertEquals(600L, DownloadRules.totalBytes(DownloadRules.Action.RESTART, 400, 600, null))
  }

  @Test fun fileNamesAndPathGuard() {
    assertTrue(DownloadRules.isSafeFileName("fvl-1234.apk"))
    for (bad in listOf("", "..", ".", "a/b.apk", "../x.apk", "a\\b")) assertFalse(bad, DownloadRules.isSafeFileName(bad))
    val dir = File.createTempFile("upd", "").let { it.delete(); it.mkdirs(); it }
    try {
      assertTrue(DownloadRules.isInside(dir, File(dir, "a.apk")))
      assertFalse(DownloadRules.isInside(dir, dir))
      assertFalse(DownloadRules.isInside(dir, File(dir, "../other.apk")))
      assertFalse(DownloadRules.isInside(dir, File(dir.path + "-sibling/a.apk")))
      assertFalse(DownloadRules.isInside(dir, File("/etc/passwd")))
    } finally { dir.deleteRecursively() }
  }

  @Test fun cleanupDecisions() {
    assertTrue(DownloadRules.shouldDeleteApk(false, 100, 100))
    assertTrue(DownloadRules.shouldDeleteApk(false, 99, 100))
    assertFalse(DownloadRules.shouldDeleteApk(false, 101, 100))
    assertTrue(DownloadRules.shouldDeleteApk(true, 101, 100))
    assertTrue(DownloadRules.shouldDeleteApk(false, null, 100)) // unreadable APK
    val day = 24L * 60 * 60 * 1000
    assertTrue(DownloadRules.isStalePart(0, day + 1))
    assertFalse(DownloadRules.isStalePart(0, day))
  }
}
