package expo.modules.flnative

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import org.json.JSONObject

/** Process-wide recorder state shared by the Expo module and the foreground service. */
object Engine {
  @Volatile var sink: ((String, Map<String, Any?>) -> Unit)? = null
  @Volatile var session: RecordingSession? = null
  @Volatile private var starting = false
  @Volatile private var appContext: Context? = null
  @Volatile var serviceLatch: CountDownLatch? = null
  @Volatile var serviceError: String? = null
  private val startLock = Any()
  private val recoverLock = Any()

  val http: OkHttpClient by lazy { OkHttpClient() }

  val journal: Journal by lazy {
    val ctx = requireNotNull(appContext) { "Engine not initialised" }
    Journal(File(ctx.filesDir, "fl-journal.jsonl")) { ClockReading.now(ctx) }
  }

  fun init(context: Context) { appContext = context.applicationContext }

  /** Safe when JS is not listening or the module was destroyed. */
  fun emit(event: String, payload: Map<String, Any?>) {
    try { sink?.invoke(event, payload) } catch (_: Throwable) {}
  }

  fun notifyJournal(record: JSONObject) {
    emit("onJournal", mapOf("journalSeq" to record.getLong("journalSeq").toInt()))
  }

  fun start(context: Context, options: StartOptions): Map<String, Any?> {
    synchronized(startLock) {
      if (session != null || starting) throw CodedException("ERR_ALREADY_RECORDING", "A recording is already running", null)
      starting = true
    }
    try {
      if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        throw CodedException("ERR_PERMISSION", "RECORD_AUDIO is not granted", null)
      }
      // Capture must begin only after the microphone foreground service is up (Android 14+ silences background capture).
      val latch = CountDownLatch(1)
      serviceLatch = latch
      serviceError = null
      try {
        ContextCompat.startForegroundService(context, Intent(context, RecordingService::class.java).setAction(RecordingService.ACTION_START))
      } catch (e: Exception) {
        throw CodedException("ERR_AUDIO_START", "Cannot start the recording service: $e", e)
      }
      if (!latch.await(5, TimeUnit.SECONDS)) {
        context.stopService(Intent(context, RecordingService::class.java))
        throw CodedException("ERR_AUDIO_START", "Recording service did not start", null)
      }
      serviceError?.let {
        context.stopService(Intent(context, RecordingService::class.java))
        throw CodedException("ERR_AUDIO_START", it, null)
      }
      val s = RecordingSession(context, options) {
        session = null
        context.stopService(Intent(context, RecordingService::class.java))
      }
      try {
        val result = s.begin()
        session = s
        return result
      } catch (e: CaptureStartException) {
        context.stopService(Intent(context, RecordingService::class.java))
        throw CodedException("ERR_AUDIO_START", e.message ?: "Audio start failed", e)
      }
    } finally {
      starting = false
      serviceLatch = null
    }
  }

  @Volatile var refreshNotification: () -> Unit = {}

  val player: Player by lazy { Player(requireNotNull(appContext)) { emit("onPlayback", it) } }

  fun pause() { session?.pause() }
  fun resume() {
    player.stop() // the microphone and playback never overlap
    session?.resume()
  }

  fun stop(reason: String, location: Map<String, Any?>?) {
    session?.stop(reason, location)
  }

  fun status(): Map<String, Any?> {
    val s = session
    return if (s == null) {
      mapOf("recording" to false, "elapsedMs" to 0, "segmentIndex" to -1, "liveState" to "off", "paused" to false, "silenced" to false)
    } else {
      mapOf(
        "recording" to true, "recordingId" to s.recordingId, "memoId" to s.memoId, "elapsedMs" to s.elapsedMs,
        "segmentIndex" to s.currentSegmentIndex, "liveState" to s.liveState,
        "paused" to s.paused, "silenced" to (s.silenced && !s.paused),
      )
    }
  }

  fun recoverInterrupted(context: Context): Int = synchronized(recoverLock) {
    Segments.recoverInterrupted(context, journal, session?.recordingId) { notifyJournal(it) }
  }
}
