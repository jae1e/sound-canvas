package expo.modules.vlcsessionservice.log

import org.json.JSONObject
import kotlin.math.ceil

/** Builds the spike-report summary (counts, gaps, latency percentiles) from the JSONL log. */
object LogSummary {
  private fun percentiles(values: List<Double>): Map<String, Any?> {
    if (values.isEmpty()) return mapOf("count" to 0)
    val s = values.sorted()
    fun p(q: Double): Double = s[(ceil(q * s.size).toInt() - 1).coerceIn(0, s.size - 1)]
    return mapOf("count" to s.size, "min" to s.first(), "p50" to p(0.5), "p90" to p(0.9), "p95" to p(0.95), "max" to s.last())
  }

  fun build(lines: List<String>): Map<String, Any?> {
    val counts = sortedMapOf<String, Int>()
    val endpointLatency = ArrayList<Double>()
    val jsAck = ArrayList<Double>()
    val fireToAudible = ArrayList<Double>()
    val speakToStart = ArrayList<Double>()
    val cueDrift = ArrayList<Double>()
    val gaps = ArrayList<Double>()
    val accuracies = ArrayList<Double>()
    var firstT = Long.MAX_VALUE
    var lastT = 0L
    var batteryFirst: JSONObject? = null
    var batteryLast: JSONObject? = null
    var maxTemp = Double.NaN
    var fallbackSpoken = 0

    for (line in lines) {
      val o = try { JSONObject(line) } catch (_: Exception) { continue }
      val ev = o.optString("ev")
      counts[ev] = (counts[ev] ?: 0) + 1
      val t = o.optLong("t")
      if (t in 1 until firstT) firstT = t
      if (t > lastT) lastT = t
      when (ev) {
        "final_transcript" -> if (o.has("endpointLatencyMs")) endpointLatency.add(o.getDouble("endpointLatencyMs"))
        "cue_ack" -> if (o.has("jsAckMs")) jsAck.add(o.getDouble("jsAckMs"))
        "cue_audible" -> {
          if (o.has("fireToAudibleMs")) fireToAudible.add(o.getDouble("fireToAudibleMs"))
          if (o.optString("source") == "native_fallback") fallbackSpoken++
        }
        "cue_fire" -> if (o.has("driftMs")) cueDrift.add(o.getDouble("driftMs"))
        "tts_start" -> if (o.has("speakToStartMs")) speakToStart.add(o.getDouble("speakToStartMs"))
        "location_gap" -> gaps.add(o.getDouble("gapMs"))
        "location_fix" -> if (o.has("accuracy")) accuracies.add(o.getDouble("accuracy"))
        "battery" -> {
          if (batteryFirst == null) batteryFirst = o
          batteryLast = o
          val temp = o.optDouble("temperatureC", Double.NaN)
          if (!temp.isNaN() && (maxTemp.isNaN() || temp > maxTemp)) maxTemp = temp
        }
      }
    }

    return mapOf(
      "spanMs" to if (lastT > 0 && firstT != Long.MAX_VALUE) lastT - firstT else 0,
      "eventCounts" to counts,
      "endpointLatencyMs" to percentiles(endpointLatency),
      "cueNativeFireDriftMs" to percentiles(cueDrift),
      "cueJsAckMs" to percentiles(jsAck),
      "cueFireToAudibleMs" to percentiles(fireToAudible),
      "cueFallbackSpoken" to fallbackSpoken,
      "ttsSpeakToStartMs" to percentiles(speakToStart),
      "locationFixCount" to accuracies.size,
      "locationGapsOver5s" to gaps.size,
      "locationMaxGapMs" to (gaps.maxOrNull() ?: 0.0),
      "locationAccuracyM" to percentiles(accuracies),
      "batteryFirstPct" to batteryFirst?.opt("levelPct"),
      "batteryLastPct" to batteryLast?.opt("levelPct"),
      "batteryMaxTempC" to if (maxTemp.isNaN()) null else maxTemp,
      "recorderRestarts" to (counts["recorder_restart"] ?: 0),
      "errors" to (counts["error"] ?: 0),
    )
  }
}
