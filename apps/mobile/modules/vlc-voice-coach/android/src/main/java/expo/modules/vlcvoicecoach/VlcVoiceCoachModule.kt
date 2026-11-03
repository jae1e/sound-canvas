package expo.modules.vlcvoicecoach

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Voice Coach native surface: a real-time pitch/level tracker (`frame` events), WAV take recording, take playback on
 * the system route, and offline take analysis. See `src/VlcVoiceCoachModule.ts` for the typed JS API.
 */
class VlcVoiceCoachModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "React context unavailable", null)
  private val takesDir: File get() = File(context.filesDir, "vlc-takes").also { it.mkdirs() }
  private var currentTakeId: String? = null

  private val capture by lazy {
    VoiceCapture(
      context,
      onFrame = { f, name, cents ->
        sendEvent("frame", mapOf(
          "t" to f.t, "f0" to f.f0, "voicing" to f.voicing, "rmsDb" to f.rmsDb, "centroid" to f.centroid,
          "hnrDb" to f.hnrDb, "note" to name, "cents" to cents,
        ))
      },
      onError = { sendEvent("captureError", mapOf("message" to it)) },
    )
  }
  private val player by lazy { TakePlayer(context) { id, state -> sendEvent("playbackState", mapOf("id" to id, "state" to state)) } }

  override fun definition() = ModuleDefinition {
    Name("VlcVoiceCoach")
    Events("frame", "captureError", "playbackState")

    OnDestroy {
      player.stop()
      capture.shutdown()
    }

    AsyncFunction("startMonitor") {
      requireMic()
      if (player.isPlaying) player.stop()
      val i = capture.requestMonitor()
      mapOf("sampleRate" to i.sampleRate, "source" to i.source)
    }
    AsyncFunction("stopMonitor") { capture.releaseMonitor(); Unit }

    AsyncFunction("startTake") {
      requireMic()
      if (currentTakeId != null) throw CodedException("TAKE_ACTIVE", "A take is already recording", null)
      player.stop()
      val id = "take-" + SimpleDateFormat("yyyyMMdd-HHmmss-SSS", Locale.US).format(Date())
      val i = capture.beginTake(File(takesDir, "$id.wav"))
      currentTakeId = id
      mapOf("id" to id, "sampleRate" to i.sampleRate, "source" to i.source)
    }
    AsyncFunction("stopTake") {
      val id = currentTakeId ?: throw CodedException("NO_TAKE", "No take is recording", null)
      currentTakeId = null
      capture.endTake()
      takeInfo(File(takesDir, "$id.wav")) ?: throw CodedException("TAKE_UNREADABLE", "The take file could not be read", null)
    }
    AsyncFunction("listTakes") {
      (takesDir.listFiles { f -> f.extension == "wav" } ?: emptyArray()).sortedByDescending { it.name }.mapNotNull { takeInfo(it) }
    }
    AsyncFunction("deleteTake") { id: String ->
      if (id == currentTakeId) throw CodedException("TAKE_ACTIVE", "Cannot delete the take being recorded", null)
      takeFile(id).delete()
    }

    // Playback only on an explicit call (the user pressed play). Uses media attributes on the system route.
    AsyncFunction("playTake") { id: String ->
      if (currentTakeId != null) throw CodedException("RECORDING", "Stop the take before playing back", null)
      val f = takeFile(id)
      if (!f.exists()) throw CodedException("NOT_FOUND", "Unknown take", null)
      player.play(id, f)
      Unit
    }
    AsyncFunction("stopPlayback") { player.stop(); Unit }

    AsyncFunction("analyzeTake") { id: String, options: Map<String, Any?> ->
      val f = takeFile(id)
      val wav = WavReader.read(f) ?: throw CodedException("NOT_FOUND", "Take missing or not PCM16 mono WAV", null)
      val frames = TakeAnalyzer.frames(wav)
      val maxPoints = (options["maxContourPoints"] as? Number)?.toInt() ?: 1500
      val target = (options["target"] as? List<*>)?.mapNotNull { n ->
        val m = n as? Map<*, *> ?: return@mapNotNull null
        val midi = (m["midi"] as? Number)?.toInt() ?: return@mapNotNull null
        TargetNote(midi, (m["durationS"] as? Number)?.toDouble())
      }?.takeIf { it.isNotEmpty() }
      mapOf(
        "id" to id,
        "sampleRate" to wav.sampleRate,
        "contour" to TakeAnalyzer.contour(frames, maxPoints),
        "metrics" to TakeAnalyzer.metrics(frames, target),
      )
    }
  }

  private fun requireMic() {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      throw CodedException("PERMISSION_RECORD_AUDIO", "RECORD_AUDIO is not granted", null)
    }
  }

  private fun takeFile(id: String): File {
    if (!Regex("[A-Za-z0-9_-]+").matches(id)) throw CodedException("BAD_ID", "Invalid take id", null)
    return File(takesDir, "$id.wav")
  }

  private fun takeInfo(f: File): Map<String, Any?>? {
    if (!f.exists() || f.length() < 44) return null
    val rate = java.io.RandomAccessFile(f, "r").use { r ->
      val b = ByteArray(4); r.seek(24); r.readFully(b)
      (b[0].toInt() and 0xff) or ((b[1].toInt() and 0xff) shl 8) or ((b[2].toInt() and 0xff) shl 16) or ((b[3].toInt() and 0xff) shl 24)
    }
    if (rate <= 0) return null
    return mapOf(
      "id" to f.nameWithoutExtension,
      "path" to f.absolutePath,
      "sampleRate" to rate,
      "durationS" to (f.length() - 44) / 2.0 / rate,
      "sizeBytes" to f.length().toDouble(),
      "createdAtMs" to f.lastModified().toDouble(),
    )
  }
}
