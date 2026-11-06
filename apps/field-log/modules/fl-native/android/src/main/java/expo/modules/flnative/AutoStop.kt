package expo.modules.flnative

import android.app.KeyguardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ProcessLifecycleOwner
import expo.modules.flnative.core.AutoStopPolicy

/**
 * Stops a recording when the user leaves the app. Uses the process lifecycle's ON_STOP (delayed about 700 ms and not
 * sent for configuration changes), never onPause: permission dialogs and the notification shade only pause the activity.
 */
object AutoStop {
  private const val PREFS = "fl_native"
  private const val KEY_LEAVE = "auto_stop_leave"
  private const val KEY_SCREEN_OFF = "auto_stop_keep_screen_off"

  @Volatile private var registered = false

  fun get(c: Context): Pair<Boolean, Boolean> {
    val p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return p.getBoolean(KEY_LEAVE, true) to p.getBoolean(KEY_SCREEN_OFF, true)
  }

  fun set(c: Context, onLeaveApp: Boolean, keepWhenScreenOff: Boolean) {
    c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean(KEY_LEAVE, onLeaveApp).putBoolean(KEY_SCREEN_OFF, keepWhenScreenOff).apply()
  }

  /** Idempotent; lives for the process (a recording can outlive the JS module). */
  fun register(context: Context) {
    if (registered) return
    registered = true
    val app = context.applicationContext
    Handler(Looper.getMainLooper()).post {
      ProcessLifecycleOwner.get().lifecycle.addObserver(LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_STOP) onStop(app)
      })
    }
  }

  private fun onStop(c: Context) {
    val session = Engine.session ?: return
    val (leave, keepOff) = get(c)
    val interactive = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    val locked = (c.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
    if (!AutoStopPolicy.shouldStop(leave, keepOff, interactive, locked, sessionActive = true)) return
    Log.i("FlAutoStop", "left the app: stopping recording ${session.recordingId}")
    Thread({ Engine.stop("left_app", null) }, "fl-leave-stop").start()
  }
}
