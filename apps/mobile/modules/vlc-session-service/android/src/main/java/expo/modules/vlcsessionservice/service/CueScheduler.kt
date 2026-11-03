package expo.modules.vlcsessionservice.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import androidx.core.content.ContextCompat
import expo.modules.vlcsessionservice.log.DiagLog
import java.util.concurrent.ConcurrentHashMap

/**
 * Native due-event timer. A Handler on a dedicated thread fires at the due time; an inexact
 * AlarmManager.setAndAllowWhileIdle backup (due time + [BACKUP_SLACK_MS]) covers a stalled handler.
 * On fire the cue is emitted to JS (`cueDue`); if JS does not call [ack] within [ACK_TIMEOUT_MS] the
 * service speaks the fallback text itself. Timing is logged: fire drift, JS ack latency, audible latency.
 */
class CueScheduler(
  private val context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
  private val speakFallback: (text: String, cueId: String) -> Unit,
) {
  private class Cue(val id: String, val atEpochMs: Long, val fallbackText: String) {
    @Volatile var fired = false
    @Volatile var firedRt = 0L
    @Volatile var acked = false
    @Volatile var fallbackStarted = false
    var fireRunnable: Runnable? = null
    var fallbackRunnable: Runnable? = null
    var alarm: PendingIntent? = null
  }

  private val thread = HandlerThread("vlc-cues").also { it.start() }
  private val handler = Handler(thread.looper)
  private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  private val cues = ConcurrentHashMap<String, Cue>()
  private val action = "${context.packageName}.VLC_CUE_ALARM"

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(c: Context, intent: Intent) {
      val id = intent.getStringExtra("cueId") ?: return
      handler.post { fire(id, "alarm_backup") }
    }
  }

  init {
    ContextCompat.registerReceiver(context, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)
  }

  fun schedule(id: String, atEpochMs: Long, fallbackText: String) {
    cancel(id)
    val cue = Cue(id, atEpochMs, fallbackText)
    cues[id] = cue
    val delay = atEpochMs - System.currentTimeMillis()
    val r = Runnable { fire(id, "handler") }
    cue.fireRunnable = r
    handler.postAtTime(r, SystemClock.uptimeMillis() + delay.coerceAtLeast(0))
    val pi = PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      Intent(action).setPackage(context.packageName).putExtra("cueId", id),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    cue.alarm = pi
    alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + delay.coerceAtLeast(0) + BACKUP_SLACK_MS, pi)
    log.log("cue_scheduled", mapOf("id" to id, "atEpochMs" to atEpochMs, "inMs" to delay))
  }

  fun cancel(id: String) {
    val cue = cues.remove(id) ?: return
    dispose(cue)
    log.log("cue_cancelled", mapOf("id" to id))
  }

  fun cancelAll() {
    cues.values.forEach { dispose(it) }
    cues.clear()
  }

  private fun dispose(cue: Cue) {
    cue.fireRunnable?.let { handler.removeCallbacks(it) }
    cue.fallbackRunnable?.let { handler.removeCallbacks(it) }
    cue.alarm?.let { alarmManager.cancel(it); it.cancel() }
  }

  private fun fire(id: String, by: String) {
    val cue = cues[id] ?: return
    if (cue.fired) return
    cue.fired = true
    cue.firedRt = SystemClock.elapsedRealtime()
    cue.fireRunnable?.let { handler.removeCallbacks(it) }
    cue.alarm?.let { alarmManager.cancel(it) }
    val drift = System.currentTimeMillis() - cue.atEpochMs
    log.log("cue_fire", mapOf("id" to id, "by" to by, "driftMs" to drift))
    emit("cueDue", mapOf("id" to id, "atEpochMs" to cue.atEpochMs, "firedEpochMs" to System.currentTimeMillis(), "driftMs" to drift, "firedBy" to by))
    val fb = Runnable {
      if (!cue.acked && !cue.fallbackStarted) {
        cue.fallbackStarted = true
        log.log("cue_js_timeout", mapOf("id" to id, "afterMs" to ACK_TIMEOUT_MS))
        speakFallback(cue.fallbackText, id)
      }
    }
    cue.fallbackRunnable = fb
    handler.postDelayed(fb, ACK_TIMEOUT_MS)
    // Housekeeping: forget the cue after 30 s regardless.
    handler.postDelayed({ cues.remove(id) }, 30_000)
  }

  /** Called by JS (synchronously) as soon as it receives `cueDue`. */
  fun ack(id: String): Boolean {
    val cue = cues[id] ?: return false
    if (!cue.fired || cue.acked) return false
    cue.acked = true
    val ms = SystemClock.elapsedRealtime() - cue.firedRt
    cue.fallbackRunnable?.let { handler.removeCallbacks(it) }
    log.log("cue_ack", mapOf("id" to id, "jsAckMs" to ms, "afterFallback" to cue.fallbackStarted))
    return true
  }

  /** True when the native fallback already took over, so JS should not speak the same cue again. */
  fun fallbackTookOver(id: String): Boolean = cues[id]?.fallbackStarted == true

  /** TTS onStart for an utterance tied to a cue. */
  fun audible(id: String, startRt: Long, source: String) {
    val cue = cues[id] ?: return
    val ms = startRt - cue.firedRt
    log.log("cue_audible", mapOf("id" to id, "source" to source, "fireToAudibleMs" to ms))
    emit("cueAudible", mapOf("id" to id, "source" to source, "fireToAudibleMs" to ms))
  }

  fun shutdown() {
    cancelAll()
    try { context.unregisterReceiver(receiver) } catch (_: Exception) { }
    thread.quitSafely()
  }

  companion object {
    const val ACK_TIMEOUT_MS = 700L
    private const val BACKUP_SLACK_MS = 1500L
  }
}
