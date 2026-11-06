package expo.modules.flnative

import expo.modules.flnative.core.Hex
import expo.modules.flnative.core.SegmentMetrics
import expo.modules.flnative.core.Uuid7
import expo.modules.flnative.core.Wav
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import org.json.JSONObject

object Segments {
  /** Max |sample| level (dBFS x 100) per bucket across the PCM of a WAV file. */
  fun waveform(file: File, buckets: Int): IntArray {
    if (buckets <= 0) return IntArray(0)
    val total = Wav.dataBytesForFileLength(file.length()) / Wav.BYTES_PER_SAMPLE
    val b = expo.modules.flnative.core.WaveformBucketer(total, buckets)
    file.inputStream().buffered(64 * 1024).use { input ->
      input.skip(Wav.HEADER_BYTES.toLong())
      val bytes = ByteArray(32 * 1024)
      val shorts = ShortArray(bytes.size / 2)
      var remaining = total * Wav.BYTES_PER_SAMPLE
      while (remaining > 0) {
        val want = minOf(bytes.size.toLong(), remaining).toInt()
        var filled = 0
        while (filled < want) {
          val n = input.read(bytes, filled, want - filled)
          if (n < 0) break
          filled += n
        }
        val count = filled / 2
        if (count == 0) break
        ByteBuffer.wrap(bytes, 0, count * 2).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts, 0, count)
        b.add(shorts, 0, count)
        remaining -= count * 2L
        if (filled < want) break
      }
    }
    return b.result()
  }

  class ReadBack(val sha256: String, val pcmSha256: String, val length: Long)

  /** Re-reads a finished segment file: SHA-256 of the whole file and of its PCM part (after the 44-byte header). */
  fun readBack(file: File): ReadBack {
    val full = MessageDigest.getInstance("SHA-256")
    val pcm = MessageDigest.getInstance("SHA-256")
    var length = 0L
    file.inputStream().use { input ->
      val buf = ByteArray(64 * 1024)
      while (true) {
        val n = input.read(buf)
        if (n < 0) break
        full.update(buf, 0, n)
        val skip = (Wav.HEADER_BYTES - length).coerceIn(0, n.toLong()).toInt()
        if (n > skip) pcm.update(buf, skip, n - skip)
        length += n
      }
    }
    return ReadBack(Hex.encode(full.digest()), Hex.encode(pcm.digest()), length)
  }

  fun closedFields(
    segmentId: String, index: Int, file: File, sha256: String, bytes: Long,
    startElapsedUs: Long, endElapsedUs: Long, startWallMs: Long, samples: Long, metrics: SegmentMetrics,
    recovered: Boolean,
  ): Map<String, Any?> = mapOf(
    "segmentId" to segmentId, "index" to index, "path" to file.absolutePath, "sha256" to sha256, "bytes" to bytes,
    "startElapsedUs" to startElapsedUs, "endElapsedUs" to endElapsedUs, "startWallMs" to startWallMs,
    "durationMs" to Math.round(samples * 1000.0 / Wav.SAMPLE_RATE),
    "peakDbfsX100" to metrics.peakDbfsX100, "clippedSamples" to metrics.clippedSamples,
    "hfRatio4kPpm" to metrics.hfRatio4kPpm, "flags" to metrics.flags, "recovered" to recovered,
  )

  /** Computes metrics by reading the PCM part of a (repaired) segment file. */
  fun metricsOf(file: File): SegmentMetrics {
    val m = SegmentMetrics()
    file.inputStream().use { input ->
      input.skip(Wav.HEADER_BYTES.toLong())
      val bytes = ByteArray(3200)
      val shorts = ShortArray(1600)
      while (true) {
        var filled = 0
        while (filled < bytes.size) {
          val n = input.read(bytes, filled, bytes.size - filled)
          if (n < 0) break
          filled += n
        }
        val count = filled / 2
        if (count == 0) break
        ByteBuffer.wrap(bytes, 0, count * 2).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts, 0, count)
        m.add(shorts, 0, count)
        if (filled < bytes.size) break
      }
    }
    return m
  }

  /**
   * Finalises recordings that have `recording_started` but no `recording_stopped` and are not [activeRecordingId].
   * Returns the number of segments recovered. Timing of recovered segments is estimated from the previous segment's
   * end (or the recording start): the crash lost the exact anchor.
   */
  fun recoverInterrupted(context: android.content.Context, journal: Journal, activeRecordingId: String?, onAppended: (JSONObject) -> Unit): Int {
    val records = journal.readAfter(0)
    val started = LinkedHashMap<String, JSONObject>()
    val stopped = HashSet<String>()
    val closed = HashMap<String, MutableMap<Int, JSONObject>>()
    for (r in records) {
      val rid = r.optString("recordingId")
      when (r.optString("kind")) {
        "recording_started" -> started[rid] = r
        "recording_stopped" -> stopped.add(rid)
        "segment_closed" -> closed.getOrPut(rid) { HashMap() }[r.optInt("index")] = r
      }
    }
    var count = 0
    for ((rid, start) in started) {
      if (rid in stopped || rid == activeRecordingId) continue
      val memoId = start.optString("memoId")
      val dir = File(context.filesDir, "recordings/$rid")
      val files = (dir.listFiles { f -> f.isFile && f.name.endsWith(".wav") && f.name.removeSuffix(".wav").toIntOrNull() != null }
        ?: emptyArray()).sortedBy { it.name.removeSuffix(".wav").toInt() }
      var lastEndUs = start.optLong("elapsedUs")
      var lastEndWall = start.optLong("wallMs")
      for (file in files) {
        val index = file.name.removeSuffix(".wav").toInt()
        val existing = closed[rid]?.get(index)
        if (existing != null) {
          lastEndUs = existing.optLong("endElapsedUs")
          lastEndWall = existing.optLong("startWallMs") + existing.optLong("durationMs")
          continue
        }
        val dataBytes = Wav.dataBytesForFileLength(file.length())
        if (dataBytes == 0L) { file.delete(); continue }
        RandomAccessFile(file, "rw").use { raf ->
          raf.setLength(Wav.HEADER_BYTES + dataBytes) // drop a trailing partial sample
          raf.seek(0)
          raf.write(Wav.header(dataBytes))
          raf.fd.sync()
        }
        val samples = dataBytes / Wav.BYTES_PER_SAMPLE
        val durationUs = samples * 1_000_000L / Wav.SAMPLE_RATE
        val metrics = metricsOf(file)
        val rec = journal.append(
          "segment_closed", memoId, rid,
          closedFields(
            Uuid7.generate(), index, file, Hex.sha256(file), file.length(), lastEndUs, lastEndUs + durationUs, lastEndWall,
            samples, metrics, recovered = true,
          ),
        )
        onAppended(rec)
        lastEndUs += durationUs
        lastEndWall += durationUs / 1000
        count++
      }
      onAppended(journal.append("recording_stopped", memoId, rid, mapOf("reason" to "recovered")))
    }
    return count
  }
}
