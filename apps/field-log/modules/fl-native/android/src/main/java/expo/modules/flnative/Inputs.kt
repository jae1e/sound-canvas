package expo.modules.flnative

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.flnative.core.Hex
import expo.modules.flnative.core.InputInfo
import expo.modules.flnative.core.InputPref
import expo.modules.flnative.core.InputResolver
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/** Input devices, the persisted [InputPref] and the live `onInputs` event. */
object Inputs {
  class Entry(val info: InputInfo, val device: AudioDeviceInfo)

  private const val PREFS = "fl_native"
  private const val KEY = "input_pref"
  private const val DEBOUNCE_MS = 300L

  @Volatile private var context: Context? = null
  private val scheduler = Executors.newSingleThreadScheduledExecutor { r -> Thread(r, "fl-inputs").also { it.isDaemon = true } }
  private var pending: ScheduledFuture<*>? = null
  private var callback: AudioDeviceCallback? = null

  fun init(c: Context) { context = c.applicationContext }

  fun btAllowed(c: Context) =
    Build.VERSION.SDK_INT < 31 || ContextCompat.checkSelfPermission(c, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED


  fun entries(): List<Entry> {
    val c = context ?: return emptyList()
    val btOk = btAllowed(c)
    val all = try { Devices.inputs(c) } catch (e: Exception) { emptyList() }
    val seen = ArrayList<Entry>()
    val infos = all.filter { btOk || !Devices.isBluetoothVoice(it.type) }.map { d ->
      val type = Devices.routeType(d.type)
      val address = if (Build.VERSION.SDK_INT >= 28 && type != InputResolver.BUILTIN) d.address else ""
      Entry(
        InputInfo(d.id, type, d.productName?.toString() ?: "", address.takeIf { it.isNotEmpty() }?.let { Hex.sha256(it) }),
        d,
      )
    }
    val keep = InputResolver.dedupe(infos.map { it.info }).map { it.id }.toSet()
    for (e in infos) if (e.info.id in keep) seen.add(e)
    return seen
  }

  fun preference(): InputPref {
    val c = context ?: return InputPref.Auto
    val raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return InputPref.Auto
    return try {
      InputPref.fromMap(Json.toPlainMap(JSONObject(raw)))
    } catch (_: Exception) { InputPref.Auto }
  }

  fun resolve(pref: InputPref = preference(), list: List<Entry> = entries()): Entry? {
    val info = InputResolver.resolve(pref, list.map { it.info }) ?: return null
    return list.firstOrNull { it.info.id == info.id }
  }

  private fun infoMap(i: InputInfo) =
    HashMap<String, Any?>().apply {
      put("id", i.id); put("type", i.type); put("productName", i.productName)
      i.addressHash?.let { put("addressHash", it) }
    }

  fun event(pref: InputPref = preference()): Map<String, Any?> {
    val list = entries()
    return mapOf(
      "inputs" to list.map { infoMap(it.info) },
      "selected" to resolve(pref, list)?.let { infoMap(it.info) },
      "preference" to pref.toMap(),
    )
  }

  /** Persists [pref] and emits onInputs. The input is locked per recording, so this is refused while a session exists. */
  fun setPreference(pref: InputPref): Map<String, Any?> {
    if (Engine.session != null) throw CodedException("ERR_BUSY_RECORDING", "The input is locked while a recording is open", null)
    val c = requireNotNull(context) { "not initialised" }
    c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(KEY, Json.toJson(pref.toMap()).toString()).apply()
    val e = event(pref)
    Engine.emit("onInputs", e)
    return e
  }

  fun register(c: Context) {
    init(c)
    if (callback != null) return
    val am = c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val cb = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) {
        if (added.any { it.isSource }) changed()
      }

      override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) {
        if (removed.any { it.isSource }) changed()
      }
    }
    callback = cb
    am.registerAudioDeviceCallback(cb, Handler(Looper.getMainLooper()))
  }

  fun unregister() {
    val c = context ?: return
    callback?.let { (c.getSystemService(Context.AUDIO_SERVICE) as AudioManager).unregisterAudioDeviceCallback(it) }
    callback = null
  }

  /** Bluetooth connects produce several callbacks (SCO, BLE); coalesce them before recomputing. */
  private fun changed() {
    synchronized(this) {
      pending?.cancel(false)
      pending = scheduler.schedule({
        try {
          Engine.emit("onInputs", event())
          Engine.session?.onInputsChanged()
        } catch (e: Exception) {
          Log.w("FlInputs", "input change handling failed", e)
        }
      }, DEBOUNCE_MS, TimeUnit.MILLISECONDS)
    }
  }
}
