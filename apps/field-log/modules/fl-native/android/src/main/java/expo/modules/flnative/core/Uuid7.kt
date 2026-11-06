package expo.modules.flnative.core

import java.security.SecureRandom

/** RFC 9562 UUID version 7 generator (48-bit Unix ms timestamp, 74 random bits). */
object Uuid7 {
  private val random = SecureRandom()

  fun generate(timeMs: Long = System.currentTimeMillis()): String = generate(timeMs, random)

  fun generate(timeMs: Long, rnd: java.util.Random): String {
    val bytes = ByteArray(16)
    rnd.nextBytes(bytes)
    for (i in 0..5) bytes[i] = (timeMs shr (8 * (5 - i))).toByte()
    bytes[6] = ((bytes[6].toInt() and 0x0f) or 0x70).toByte()
    bytes[8] = ((bytes[8].toInt() and 0x3f) or 0x80).toByte()
    val h = Hex.encode(bytes)
    return "${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}"
  }
}
