package expo.modules.vcaudio

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.util.concurrent.CountDownLatch

class RecordingService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(NotificationChannel("vc_recording", "Voice Coach recording", NotificationManager.IMPORTANCE_LOW))
      val notification = NotificationCompat.Builder(this, "vc_recording")
        .setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentTitle("Voice Coach is recording")
        .setOngoing(true).setSilent(true).build()
      startForeground(4821, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
      if (wakeLock == null) {
        val power = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "voicecoach:recording").apply {
          setReferenceCounted(false)
          acquire(12L * 60 * 60 * 1000)
        }
      }
      failure = null
    } catch (e: Exception) { failure = e.message ?: e.toString(); stopSelf() }
    latch?.countDown()
    return START_NOT_STICKY
  }
  override fun onDestroy() {
    try { wakeLock?.takeIf { it.isHeld }?.release() } catch (_: Exception) { }
    wakeLock = null
    onInterrupted?.invoke()
    super.onDestroy()
  }
  companion object {
    @Volatile var onInterrupted: (() -> Unit)? = null
    @Volatile var latch: CountDownLatch? = null
    @Volatile var failure: String? = null
  }
}
