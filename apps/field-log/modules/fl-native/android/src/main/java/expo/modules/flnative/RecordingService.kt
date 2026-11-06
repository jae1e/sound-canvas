package expo.modules.flnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/** Microphone foreground service: keeps capture alive with the screen locked and shows "Recording · m:ss". */
class RecordingService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val tick = object : Runnable {
    override fun run() {
      if (Engine.session == null) return
      notifyNow()
      handler.postDelayed(this, 1000)
    }
  }

  private fun notifyNow() {
    val s = Engine.session ?: return
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    try { nm.notify(NOTIFICATION_ID, buildNotification(s.elapsedMs)) } catch (_: Exception) {}
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        try {
          createChannel()
          startForeground(NOTIFICATION_ID, buildNotification(0), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } catch (e: Exception) { // ForegroundServiceStartNotAllowedException, SecurityException, ...
          Engine.serviceError = "startForeground failed: $e"
          Engine.serviceLatch?.countDown()
          stopSelf()
          return START_NOT_STICKY
        }
        Engine.serviceLatch?.countDown()
        Engine.refreshNotification = { handler.post { notifyNow() } }
        handler.removeCallbacks(tick)
        handler.postDelayed(tick, 1000)
      }
      ACTION_RESUME -> Thread({
        try { Engine.resume() } catch (e: Exception) { android.util.Log.w("FlService", "resume failed", e) }
      }, "fl-resume").start()
      ACTION_STOP -> Thread({ Engine.stop("user", null) }, "fl-stop").start()
      else -> stopSelf()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    Engine.refreshNotification = {}
    // The system or app tore the service down while a recording was open: close it cleanly.
    val s = Engine.session
    if (s != null) Thread({ s.stop("interrupted", null) }, "fl-stop").start()
    super.onDestroy()
  }

  private fun createChannel() {
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) == null) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Recording", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while a voice memo is being recorded"
          setShowBadge(false)
        },
      )
    }
  }

  private fun buildNotification(elapsedMs: Long): Notification {
    val stop = PendingIntent.getService(
      this, 1, Intent(this, RecordingService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val total = elapsedMs / 1000
    val paused = Engine.session?.paused == true
    val resume = PendingIntent.getService(
      this, 3, Intent(this, RecordingService::class.java).setAction(ACTION_RESUME),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentTitle(
        "${if (paused) "Paused" else "Recording"} · ${total / 60}:${(total % 60).toString().padStart(2, '0')}" +
          (Engine.session?.inputName?.let { " · $it" } ?: ""),
      )
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(open)
    if (paused) builder.addAction(android.R.drawable.ic_media_play, "Resume", resume)
    return builder
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stop)
      .build()
  }

  companion object {
    const val ACTION_START = "expo.modules.flnative.START"
    const val ACTION_RESUME = "expo.modules.flnative.RESUME"
    const val ACTION_STOP = "expo.modules.flnative.STOP"
    private const val CHANNEL_ID = "fl_recording"
    private const val NOTIFICATION_ID = 4711
  }
}
