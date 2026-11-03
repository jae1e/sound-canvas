package expo.modules.vlcvoicecoach

import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Streaming mono PCM16 WAV writer. The header is patched with the real sizes on [close]. */
class WavWriter(val file: File, private val sampleRate: Int) {
  private val raf = RandomAccessFile(file, "rw")
  private var dataBytes = 0L
  private var closed = false

  init {
    raf.setLength(0)
    raf.write(header(0))
  }

  fun write(samples: ShortArray, count: Int) {
    if (closed) return
    val bb = ByteBuffer.allocate(count * 2).order(ByteOrder.LITTLE_ENDIAN)
    for (i in 0 until count) bb.putShort(samples[i])
    raf.write(bb.array())
    dataBytes += count * 2L
  }

  val durationS: Double get() = dataBytes / 2.0 / sampleRate

  fun close() {
    if (closed) return
    closed = true
    raf.seek(0)
    raf.write(header(dataBytes))
    raf.close()
  }

  private fun header(dataLen: Long): ByteArray {
    val bb = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    bb.put("RIFF".toByteArray()).putInt((36 + dataLen).toInt()).put("WAVE".toByteArray())
    bb.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(sampleRate)
    bb.putInt(sampleRate * 2).putShort(2).putShort(16)
    bb.put("data".toByteArray()).putInt(dataLen.toInt())
    return bb.array()
  }
}

class WavData(val sampleRate: Int, val samples: ShortArray)

object WavReader {
  /** Reads a mono PCM16 WAV written by [WavWriter] (tolerates extra chunks). Returns null if the file is not that format. */
  fun read(file: File): WavData? {
    val bytes = file.readBytes()
    if (bytes.size < 44) return null
    val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    if (String(bytes, 0, 4) != "RIFF" || String(bytes, 8, 4) != "WAVE") return null
    var pos = 12
    var rate = 0
    while (pos + 8 <= bytes.size) {
      val id = String(bytes, pos, 4)
      val size = bb.getInt(pos + 4)
      val body = pos + 8
      if (id == "fmt ") {
        if (bb.getShort(body).toInt() != 1 || bb.getShort(body + 2).toInt() != 1 || bb.getShort(body + 14).toInt() != 16) return null
        rate = bb.getInt(body + 4)
      } else if (id == "data") {
        val len = minOf(if (size <= 0) Int.MAX_VALUE else size, bytes.size - body) / 2 // size 0 = header never patched (crash mid-take)
        val out = ShortArray(len)
        for (i in 0 until len) out[i] = bb.getShort(body + i * 2)
        return if (rate > 0) WavData(rate, out) else null
      }
      pos = body + size + (size and 1)
    }
    return null
  }
}
