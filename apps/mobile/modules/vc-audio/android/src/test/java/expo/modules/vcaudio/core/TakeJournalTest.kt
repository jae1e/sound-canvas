package expo.modules.vcaudio.core

import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class TakeJournalTest {
  @Test fun stopRecordSurvivesReopenUntilAcknowledged() {
    val dir = Files.createTempDirectory("take-journal").toFile()
    try {
      val wav = java.io.File(dir, "take-1.wav")
      WavWriter(wav, 48000).close()
      TakeJournal(dir).write("take-1", "{\"id\":\"take-1\"}")
      val reopened = TakeJournal(dir)
      assertEquals("{\"id\":\"take-1\"}", reopened.list().single().json)
      assertFalse(reopened.list().single().acknowledged)
      reopened.acknowledge("take-1")
      assertTrue(TakeJournal(dir).list().single().acknowledged)
      reopened.remove("take-1")
      assertNull(reopened.list().single().json)
    } finally { dir.deleteRecursively() }
  }

  @Test fun repairsOrphanWithoutTouchingActiveFile() {
    val dir = Files.createTempDirectory("take-orphan").toFile()
    try {
      val wav = java.io.File(dir, "orphan.wav")
      val writer = WavWriter(wav, 48000)
      writer.write(ShortArray(960) { 123 }, 960)
      val journal = TakeJournal(dir)
      assertTrue(journal.list("orphan").isEmpty())
      assertNull(journal.list().single().json)
      assertEquals(960, WavReader.read(wav)!!.samples.size)
      writer.close()
    } finally { dir.deleteRecursively() }
  }

  @Test fun rejectsInvalidIdsAndAcknowledgingMissingRecords() {
    val dir = Files.createTempDirectory("take-invalid").toFile()
    try {
      val journal = TakeJournal(dir)
      assertThrows(IllegalArgumentException::class.java) { journal.write("../escape", "{}") }
      assertThrows(IllegalStateException::class.java) { journal.acknowledge("missing") }
    } finally { dir.deleteRecursively() }
  }
}
