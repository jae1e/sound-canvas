package expo.modules.flnative.core

import java.io.RandomAccessFile

/** Canonical 44-byte PCM16 mono 16 kHz WAV header helpers. */
object Wav {
  const val SAMPLE_RATE = 16000
  const val HEADER_BYTES = 44
  const val BYTES_PER_SAMPLE = 2

  private const val PLACEHOLDER = 0xFFFFFFFFL

  /** Header with placeholder (0xFFFFFFFF, "unknown/streaming") sizes, written when a segment is opened. */
  fun placeholderHeader(): ByteArray = build(PLACEHOLDER, PLACEHOLDER)

  /** Header with real sizes for [dataBytes] bytes of PCM. */
  fun header(dataBytes: Long): ByteArray = build(36 + dataBytes, dataBytes)

  /** Bytes of whole samples in a file of [fileLength] bytes (a trailing odd byte is ignored). */
  fun dataBytesForFileLength(fileLength: Long): Long =
    if (fileLength <= HEADER_BYTES) 0L else (fileLength - HEADER_BYTES) / BYTES_PER_SAMPLE * BYTES_PER_SAMPLE

  /** Overwrites the RIFF and data size fields of the file's header. */
  fun patchSizes(raf: RandomAccessFile, dataBytes: Long) {
    raf.seek(4)
    raf.write(le32(36 + dataBytes))
    raf.seek(40)
    raf.write(le32(dataBytes))
  }

  fun readLe32(bytes: ByteArray, offset: Int): Long =
    (bytes[offset].toLong() and 0xff) or
      ((bytes[offset + 1].toLong() and 0xff) shl 8) or
      ((bytes[offset + 2].toLong() and 0xff) shl 16) or
      ((bytes[offset + 3].toLong() and 0xff) shl 24)

  private fun build(riffSize: Long, dataSize: Long): ByteArray {
    val h = ByteArray(HEADER_BYTES)
    fun put(off: Int, s: String) { for (i in s.indices) h[off + i] = s[i].code.toByte() }
    fun put32(off: Int, v: Long) { le32(v).copyInto(h, off) }
    fun put16(off: Int, v: Int) { h[off] = v.toByte(); h[off + 1] = (v shr 8).toByte() }
    put(0, "RIFF"); put32(4, riffSize); put(8, "WAVE")
    put(12, "fmt "); put32(16, 16); put16(20, 1); put16(22, 1)
    put32(24, SAMPLE_RATE.toLong()); put32(28, (SAMPLE_RATE * BYTES_PER_SAMPLE).toLong())
    put16(32, BYTES_PER_SAMPLE); put16(34, 16)
    put(36, "data"); put32(40, dataSize)
    return h
  }

  private fun le32(v: Long): ByteArray =
    byteArrayOf(v.toByte(), (v shr 8).toByte(), (v shr 16).toByte(), (v shr 24).toByte())
}
