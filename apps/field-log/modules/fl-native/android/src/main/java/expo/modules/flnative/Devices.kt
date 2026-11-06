package expo.modules.flnative

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import expo.modules.flnative.core.Hex

object Devices {
  fun routeType(type: Int): String = when (type) {
    AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtin_mic"
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth_sco"
    AudioDeviceInfo.TYPE_BLE_HEADSET -> "ble_headset"
    AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_USB_HEADSET -> "wired_headset"
    AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_ACCESSORY -> "usb"
    else -> "other"
  }

  fun isBluetoothVoice(type: Int) = type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || type == AudioDeviceInfo.TYPE_BLE_HEADSET

  /** The api-v0 `Route` as a map; the Bluetooth address is only ever hashed. */
  fun route(d: AudioDeviceInfo?): Map<String, Any?> {
    if (d == null) return mapOf("type" to "other")
    val address = if (Build.VERSION.SDK_INT >= 28) d.address else ""
    return mapOf(
      "type" to routeType(d.type),
      "productName" to d.productName?.toString()?.takeIf { it.isNotEmpty() },
      "addressHash" to address.takeIf { it.isNotEmpty() }?.let { Hex.sha256(it) },
      "deviceId" to d.id,
    )
  }

  /** Name shown in the notification for a routed input. */
  fun displayName(d: AudioDeviceInfo?): String =
    if (d == null || d.type == AudioDeviceInfo.TYPE_BUILTIN_MIC) "Phone mic" else (d.productName?.toString()?.takeIf { it.isNotEmpty() } ?: routeType(d.type))

  fun inputs(context: Context): List<AudioDeviceInfo> =
    (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager).getDevices(AudioManager.GET_DEVICES_INPUTS).toList()

  fun unprocessedSupported(context: Context): Boolean =
    (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager)
      .getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true"

  /** State of the platform effects for an audio session. Creates and immediately releases each effect to read it. */
  fun effects(sessionId: Int): Map<String, String> = mapOf(
    "ns" to effectState(NoiseSuppressor.isAvailable()) { NoiseSuppressor.create(sessionId)?.let { it.enabled to it::release } },
    "agc" to effectState(AutomaticGainControl.isAvailable()) { AutomaticGainControl.create(sessionId)?.let { it.enabled to it::release } },
    "aec" to effectState(AcousticEchoCanceler.isAvailable()) { AcousticEchoCanceler.create(sessionId)?.let { it.enabled to it::release } },
  )

  private fun effectState(available: Boolean, create: () -> Pair<Boolean, () -> Unit>?): String {
    if (!available) return "unavailable"
    return try {
      val pair = create() ?: return "unavailable"
      val enabled = pair.first
      pair.second()
      if (enabled) "on" else "off"
    } catch (_: Exception) {
      "unavailable"
    }
  }

  fun capabilities(context: Context): Map<String, Any?> = mapOf(
    "unprocessedSupported" to unprocessedSupported(context),
    "inputs" to Inputs.entries().map {
      mapOf("id" to it.info.id, "type" to it.info.type, "productName" to it.info.productName, "addressHash" to it.info.addressHash)
    },
    "sdkInt" to Build.VERSION.SDK_INT,
    "model" to Build.MODEL,
    "manufacturer" to Build.MANUFACTURER,
    "bootCount" to ClockReading.bootCount(context),
  )
}
