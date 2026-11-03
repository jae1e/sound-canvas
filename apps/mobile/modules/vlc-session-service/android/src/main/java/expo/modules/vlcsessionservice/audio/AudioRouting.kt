package expo.modules.vlcsessionservice.audio

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioRecord
import android.os.Build
import android.os.Handler
import expo.modules.vlcsessionservice.log.DiagLog

/** Communication-device listing/selection and route-change reporting. */
class AudioRouting(
  private val context: Context,
  private val log: DiagLog,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var callback: AudioDeviceCallback? = null
  @Volatile var recorder: AudioRecord? = null

  fun communicationDevices(): List<AudioDeviceInfo> =
    if (Build.VERSION.SDK_INT >= 31) am.availableCommunicationDevices
    else am.getDevices(AudioManager.GET_DEVICES_INPUTS or AudioManager.GET_DEVICES_OUTPUTS).toList()

  fun listDevices(): List<Map<String, Any?>> = communicationDevices().map(::describe)

  /** Selects a communication device by id (also switches to MODE_IN_COMMUNICATION). */
  fun select(id: Int): Map<String, Any?> {
    if (Build.VERSION.SDK_INT < 31) return mapOf("ok" to false, "reason" to "setCommunicationDevice needs Android 12+")
    val dev = am.availableCommunicationDevices.firstOrNull { it.id == id }
      ?: return mapOf("ok" to false, "reason" to "Device $id not in available communication devices")
    am.mode = AudioManager.MODE_IN_COMMUNICATION
    val ok = am.setCommunicationDevice(dev)
    log.log("route_select", mapOf("requested" to describe(dev), "ok" to ok))
    return mapOf("ok" to ok, "route" to state())
  }

  fun clear(): Map<String, Any?> {
    if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice()
    am.mode = AudioManager.MODE_NORMAL
    log.log("route_clear")
    return mapOf("ok" to true, "route" to state())
  }

  fun inCommunicationMode(): Boolean = am.mode == AudioManager.MODE_IN_COMMUNICATION

  /** Actual current communication device and AudioRecord routed device. */
  fun state(): Map<String, Any?> {
    val comm = if (Build.VERSION.SDK_INT >= 31) am.communicationDevice else null
    val routed = try { recorder?.routedDevice } catch (_: Exception) { null }
    return mapOf(
      "audioMode" to am.mode,
      "communicationDevice" to comm?.let(::describe),
      "recordRoutedDevice" to routed?.let(::describe),
    )
  }

  fun register(handler: Handler) {
    val cb = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) = changed("added", addedDevices)
      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) = changed("removed", removedDevices)
    }
    callback = cb
    am.registerAudioDeviceCallback(cb, handler)
  }

  fun unregister() {
    callback?.let { am.unregisterAudioDeviceCallback(it) }
    callback = null
  }

  private fun changed(kind: String, devices: Array<out AudioDeviceInfo>) {
    val payload = mapOf("change" to kind, "devices" to devices.map(::describe), "route" to state())
    log.log("route_change", payload)
    emit("routeChanged", payload)
  }

  companion object {
    fun typeName(type: Int): String = when (type) {
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "builtin_earpiece"
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "builtin_speaker"
      AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtin_mic"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired_headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired_headphones"
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth_sco"
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetooth_a2dp"
      AudioDeviceInfo.TYPE_USB_DEVICE -> "usb_device"
      AudioDeviceInfo.TYPE_USB_HEADSET -> "usb_headset"
      AudioDeviceInfo.TYPE_HEARING_AID -> "hearing_aid"
      AudioDeviceInfo.TYPE_TELEPHONY -> "telephony"
      AudioDeviceInfo.TYPE_BLE_HEADSET -> "ble_headset"
      AudioDeviceInfo.TYPE_BLE_SPEAKER -> "ble_speaker"
      AudioDeviceInfo.TYPE_BLE_BROADCAST -> "ble_broadcast"
      else -> "type_$type"
    }

    fun describe(d: AudioDeviceInfo): Map<String, Any?> = mapOf(
      "id" to d.id,
      "type" to d.type,
      "typeName" to typeName(d.type),
      "productName" to d.productName?.toString(),
      "isSource" to d.isSource,
      "isSink" to d.isSink,
    )
  }
}
