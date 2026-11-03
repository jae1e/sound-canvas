package expo.modules.vlcsessionservice.log

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Handler

/** Logs battery level / temperature every minute while a session runs. */
class BatteryMonitor(private val context: Context, private val handler: Handler, private val log: DiagLog) {
  private var running = false
  private val tick = object : Runnable {
    override fun run() {
      if (!running) return
      sample("periodic")
      handler.postDelayed(this, INTERVAL_MS)
    }
  }

  fun start() {
    running = true
    sample("start")
    handler.postDelayed(tick, INTERVAL_MS)
  }

  fun stop() {
    if (running) sample("stop")
    running = false
    handler.removeCallbacks(tick)
  }

  fun sample(reason: String) {
    val i: Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    val level = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale = i?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
    val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    log.log(
      "battery",
      mapOf(
        "reason" to reason,
        "levelPct" to if (level >= 0) level * 100.0 / scale else null,
        "temperatureC" to (i?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)?.takeIf { it != Int.MIN_VALUE }?.div(10.0)),
        "plugged" to i?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0),
        "voltageMv" to i?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0),
        "currentNowUa" to bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW),
      ),
    )
  }

  companion object {
    private const val INTERVAL_MS = 60_000L
  }
}
