package expo.modules.vcaudio.core

import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Durable stop records and recovery of WAVs interrupted before their final header flush. */
class TakeJournal(private val directory: File) {
  private fun file(id: String, extension: String): File {
    require(id.matches(Regex("[A-Za-z0-9_-]+"))) { "Invalid take ID" }
    return File(directory, "$id.$extension")
  }

  @Synchronized fun write(id: String, json: String) {
    check(directory.exists() || directory.mkdirs())
    val tmp = file(id, "json.tmp")
    FileOutputStream(tmp).use { it.write(json.toByteArray(Charsets.UTF_8)); it.fd.sync() }
    check(tmp.renameTo(file(id, "json"))) { "Could not commit take metadata" }
  }

  @Synchronized fun acknowledge(id: String) {
    check(file(id, "json").isFile) { "Take metadata does not exist" }
    FileOutputStream(file(id, "ack")).use { it.fd.sync() }
  }

  @Synchronized fun remove(id: String) {
    for (ext in listOf("json", "json.tmp", "ack")) {
      val f = file(id, ext)
      check(!f.exists() || f.delete()) { "Could not delete take metadata" }
    }
  }

  data class Entry(val id: String, val wav: File, val json: String?, val acknowledged: Boolean)

  @Synchronized fun list(activeId: String? = null): List<Entry> =
    (directory.listFiles() ?: emptyArray()).filter {
      it.isFile && it.name.endsWith(".wav") && !it.name.endsWith(".asr.wav") && it.nameWithoutExtension != activeId
    }.map { wav ->
      val id = wav.nameWithoutExtension
      val metadata = file(id, "json").takeIf { it.isFile }?.readText(Charsets.UTF_8)
      if (metadata == null) repair(wav)
      Entry(id, wav, metadata, file(id, "ack").isFile)
    }.sortedBy { it.wav.lastModified() }

  private fun repair(wav: File) {
    RandomAccessFile(wav, "rw").use { f ->
      if (f.length() < 44 || f.length() - 44 > 0xffffffffL - 36) return
      val h = ByteArray(44); f.readFully(h)
      if (String(h, 0, 4, Charsets.US_ASCII) != "RIFF" || String(h, 8, 4, Charsets.US_ASCII) != "WAVE" || String(h, 36, 4, Charsets.US_ASCII) != "data") return
      val dataSize = f.length() - 44
      fun writeSize(offset: Long, size: Long) {
        f.seek(offset); f.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(size.toInt()).array())
      }
      writeSize(4, 36 + dataSize); writeSize(40, dataSize); f.fd.sync()
    }
  }
}
