package expo.modules.flnative.core

/** One selectable microphone. [id] is the platform AudioDeviceInfo id (changes on every reconnect). */
data class InputInfo(val id: Int, val type: String, val productName: String, val addressHash: String? = null)

/** Which microphone to record from. See api-v0 section 6, "Input selection". */
sealed class InputPref {
  object Auto : InputPref()
  object Phone : InputPref()
  data class Device(val type: String, val productName: String, val addressHash: String? = null) : InputPref()

  fun toMap(): Map<String, Any?> = when (this) {
    Auto -> mapOf("mode" to "auto")
    Phone -> mapOf("mode" to "phone")
    is Device -> HashMap<String, Any?>().apply {
      put("mode", "device"); put("type", type); put("productName", productName)
      addressHash?.let { put("addressHash", it) }
    }
  }

  companion object {
    /** Parses the JS shape; anything unknown or incomplete becomes [Auto]. */
    fun fromMap(m: Map<String, Any?>?): InputPref = when (m?.get("mode")) {
      "phone" -> Phone
      "device" -> {
        val type = m["type"] as? String
        val name = m["productName"] as? String
        if (type == null || name == null) Auto else Device(type, name, (m["addressHash"] as? String)?.takeIf { it.isNotEmpty() })
      }
      else -> Auto
    }
  }
}

object InputResolver {
  const val BUILTIN = "builtin_mic"

  /** Auto priority (lower wins): wired or USB, then BLE headset, then Bluetooth SCO, then the built-in microphone. */
  fun autoRank(type: String): Int = when (type) {
    "wired_headset", "usb" -> 0
    "ble_headset" -> 1
    "bluetooth_sco" -> 2
    BUILTIN -> 3
    else -> Int.MAX_VALUE
  }

  /** One entry per physical input: the same type + address (or name without an address) appears once. */
  fun dedupe(inputs: List<InputInfo>): List<InputInfo> {
    val seen = HashSet<String>()
    return inputs.filter { i ->
      val discriminator = if (i.type == BUILTIN) "" else (i.addressHash ?: i.productName)
      seen.add("${i.type}|$discriminator")
    }
  }

  fun matches(pref: InputPref.Device, i: InputInfo): Boolean =
    i.type == pref.type && i.productName == pref.productName &&
      (pref.addressHash == null || i.addressHash == null || pref.addressHash == i.addressHash)

  /** The input [pref] resolves to among [inputs], falling back to the built-in microphone; null if there is none. */
  fun resolve(pref: InputPref, inputs: List<InputInfo>): InputInfo? {
    val builtin = inputs.firstOrNull { it.type == BUILTIN }
    return when (pref) {
      InputPref.Phone -> builtin
      is InputPref.Device -> inputs.firstOrNull { matches(pref, it) } ?: builtin
      InputPref.Auto -> inputs.filter { autoRank(it.type) != Int.MAX_VALUE }.minByOrNull { autoRank(it.type) } ?: builtin
    }
  }
}
