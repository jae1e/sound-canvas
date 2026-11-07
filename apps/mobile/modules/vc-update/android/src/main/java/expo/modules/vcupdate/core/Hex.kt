package expo.modules.vcupdate.core

import java.io.File
import java.io.InputStream
import java.security.MessageDigest

object Hex {
  private val DIGITS = "0123456789abcdef".toCharArray()

  fun encode(bytes: ByteArray): String {
    val out = CharArray(bytes.size * 2)
    for (i in bytes.indices) {
      val v = bytes[i].toInt() and 0xff
      out[i * 2] = DIGITS[v ushr 4]
      out[i * 2 + 1] = DIGITS[v and 0x0f]
    }
    return String(out)
  }

  fun sha256(text: String): String = encode(MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)))

  fun sha256(file: File): String = file.inputStream().use { sha256(it) }

  fun sha256(input: InputStream): String {
    val md = MessageDigest.getInstance("SHA-256")
    val buf = ByteArray(64 * 1024)
    while (true) {
      val n = input.read(buf)
      if (n < 0) break
      md.update(buf, 0, n)
    }
    return encode(md.digest())
  }
}
