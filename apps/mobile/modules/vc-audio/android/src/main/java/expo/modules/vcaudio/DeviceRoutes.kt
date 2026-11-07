package expo.modules.vcaudio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import java.security.MessageDigest

/** Persistent device preferences use the stable contract key, never an Android device id. */
class DeviceRoutes(private val context: Context, private val locked: () -> Boolean, private val changed: () -> Unit) {
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val prefs = context.getSharedPreferences("vc_audio", Context.MODE_PRIVATE)
  private val handler = Handler(Looper.getMainLooper())
  private val callback = object : AudioDeviceCallback() {
    override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) = changed()
    override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) = changed()
  }

  fun register() = audio.registerAudioDeviceCallback(callback, handler)
  fun unregister() = audio.unregisterAudioDeviceCallback(callback)
  private fun type(d: AudioDeviceInfo): String = when (d.type) {
    AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtin"
    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BUILTIN_SPEAKER_SAFE -> "speaker"
    AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired"
    AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_ACCESSORY -> "usb"
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO, AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
    AudioDeviceInfo.TYPE_BLE_HEADSET, AudioDeviceInfo.TYPE_BLE_SPEAKER, AudioDeviceInfo.TYPE_BLE_BROADCAST -> "bluetooth"
    else -> "other"
  }
  fun isBluetoothMic(d: AudioDeviceInfo) = d.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || d.type == AudioDeviceInfo.TYPE_BLE_HEADSET
  private fun allowed(d: AudioDeviceInfo) = type(d) != "bluetooth" || ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
  fun key(d: AudioDeviceInfo): String {
    val t = type(d)
    val name = d.productName?.toString().orEmpty()
    val address = if (t == "builtin" || t == "speaker") "" else try { d.address.orEmpty() } catch (_: SecurityException) { "" }
    val hash = if (address.isEmpty()) "" else MessageDigest.getInstance("SHA-256").digest(address.toByteArray()).take(6).joinToString("") { "%02x".format(it.toInt() and 255) }
    return "$t:$name:$hash"
  }
  fun info(d: AudioDeviceInfo): Map<String, Any> {
    val key = key(d)
    return mapOf("key" to key, "type" to type(d), "productName" to d.productName.toString(), "addressHash" to key.substringAfterLast(':'), "callQuality" to (d.isSource && isBluetoothMic(d)))
  }
  fun inputs() = audio.getDevices(AudioManager.GET_DEVICES_INPUTS).filter(::allowed).distinctBy(::key)
  fun outputs() = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).filter(::allowed).distinctBy(::key)
  fun inputPreference(): Map<String, Any> = prefs.getString("inputKey", null)?.let { mapOf("mode" to "device", "key" to it) } ?: mapOf("mode" to "builtin")
  fun outputPreference(): Map<String, Any> = prefs.getString("outputKey", null)?.let { mapOf("mode" to "device", "key" to it) } ?: mapOf("mode" to "system")
  fun selectedInput(): AudioDeviceInfo? {
    val all = inputs()
    return prefs.getString("inputKey", null)?.let { k -> all.firstOrNull { key(it) == k } } ?: all.firstOrNull { type(it) == "builtin" }
  }
  fun builtin(): AudioDeviceInfo? = inputs().firstOrNull { type(it) == "builtin" }
  fun preferredOutput(): AudioDeviceInfo? = prefs.getString("outputKey", null)?.let { k -> outputs().firstOrNull { key(it) == k } }
  fun activeOutput(): AudioDeviceInfo? {
    preferredOutput()?.let { return it }
    if (Build.VERSION.SDK_INT < 33) return null
    return try {
      val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build()
      audio.getAudioDevicesForAttributes(attrs).firstOrNull()
    } catch (_: Exception) { null }
  }
  fun setInput(pref: Map<String, Any?>) = setPreference(pref, "inputKey", "builtin")
  fun setOutput(pref: Map<String, Any?>) = setPreference(pref, "outputKey", "system")
  private fun setPreference(pref: Map<String, Any?>, field: String, defaultMode: String) {
    if (locked()) throw CodedException("ERR_LOCKED", "Device preferences are locked during a take", null)
    val edit = prefs.edit()
    when (pref["mode"]) {
      defaultMode -> edit.remove(field)
      "device" -> edit.putString(field, (pref["key"] as? String)?.takeIf { it.isNotEmpty() } ?: throw CodedException("ERR_ARGUMENT", "Device key is required", null))
      else -> throw CodedException("ERR_ARGUMENT", "Unknown device preference", null)
    }
    edit.apply()
  }
  fun snapshot(active: AudioDeviceInfo? = selectedInput(), output: AudioDeviceInfo? = activeOutput()): Map<String, Any?> = mapOf(
    "inputs" to inputs().map(::info), "outputs" to outputs().map(::info), "inputPreference" to inputPreference(),
    "outputPreference" to outputPreference(), "activeInput" to active?.let(::info), "activeOutput" to output?.let(::info), "locked" to locked(),
  )
}
