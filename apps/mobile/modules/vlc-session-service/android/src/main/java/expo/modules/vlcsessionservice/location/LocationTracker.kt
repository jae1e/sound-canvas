package expo.modules.vlcsessionservice.location

import android.annotation.SuppressLint
import android.content.Context
import android.os.HandlerThread
import android.os.SystemClock
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationAvailability
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import expo.modules.vlcsessionservice.log.DiagLog
import java.util.concurrent.atomic.AtomicInteger

/** FusedLocationProviderClient at ~1 Hz with gap tracking (> 5 s between received fixes). */
class LocationTracker(
  private val context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  private val client: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
  private var thread: HandlerThread? = null
  private var started = false
  private val fixCount = AtomicInteger()
  @Volatile private var lastReceivedRt = 0L
  @Volatile private var startedRt = 0L
  @Volatile private var maxGapMs = 0L
  @Volatile private var gapCount = 0
  @Volatile private var lastAccuracy = Float.NaN

  private val callback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      for (loc in result.locations) {
        val nowRt = SystemClock.elapsedRealtime()
        val ref = if (lastReceivedRt != 0L) lastReceivedRt else startedRt
        val gap = nowRt - ref
        if (gap > GAP_MS) {
          gapCount++
          if (gap > maxGapMs) maxGapMs = gap
          log.log("location_gap", mapOf("gapMs" to gap, "afterFirstFix" to (lastReceivedRt != 0L)))
          emit("locationGap", mapOf("gapMs" to gap))
        }
        lastReceivedRt = nowRt
        lastAccuracy = loc.accuracy
        val n = fixCount.incrementAndGet()
        val payload = mapOf(
          "latitude" to loc.latitude,
          "longitude" to loc.longitude,
          "accuracy" to loc.accuracy.toDouble(),
          "speed" to if (loc.hasSpeed()) loc.speed.toDouble() else null,
          "provider" to loc.provider,
          "fixEpochMs" to loc.time,
          "receivedEpochMs" to System.currentTimeMillis(),
          "count" to n,
        )
        log.log("location_fix", payload)
        emit("location", payload)
      }
    }

    override fun onLocationAvailability(a: LocationAvailability) {
      log.log("location_availability", mapOf("available" to a.isLocationAvailable))
    }
  }

  @SuppressLint("MissingPermission")
  fun start() {
    if (started) return
    val t = HandlerThread("vlc-location").also { it.start() }
    thread = t
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
      .setMinUpdateIntervalMillis(500L)
      .setWaitForAccurateLocation(false)
      .build()
    startedRt = SystemClock.elapsedRealtime()
    try {
      client.requestLocationUpdates(request, callback, t.looper)
        .addOnFailureListener { e ->
          log.log("error", mapOf("where" to "location_request", "message" to e.toString()))
          emit("sessionError", mapOf("code" to "LOCATION_FAILED", "message" to e.toString()))
        }
      started = true
    } catch (e: SecurityException) {
      log.log("error", mapOf("where" to "location_security", "message" to e.toString()))
      emit("sessionError", mapOf("code" to "LOCATION_PERMISSION", "message" to e.toString()))
      t.quitSafely()
      thread = null
    }
  }

  fun stop() {
    if (!started) return
    val sinceLast = SystemClock.elapsedRealtime() - (if (lastReceivedRt != 0L) lastReceivedRt else startedRt)
    if (sinceLast > GAP_MS) {
      gapCount++
      if (sinceLast > maxGapMs) maxGapMs = sinceLast
      log.log("location_gap", mapOf("gapMs" to sinceLast, "atStop" to true))
    }
    client.removeLocationUpdates(callback)
    thread?.quitSafely()
    thread = null
    started = false
    log.log("location_stats", stats())
  }

  fun stats(): Map<String, Any?> = mapOf(
    "fixCount" to fixCount.get(),
    "gapCount" to gapCount,
    "maxGapMs" to maxGapMs,
    "lastAccuracyM" to if (lastAccuracy.isNaN()) null else lastAccuracy.toDouble(),
  )

  companion object {
    private const val GAP_MS = 5_000L
  }
}
