package expo.modules.vlcsessionservice.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.service.SessionRuntime

/**
 * Where speech output goes, and the "force phone speaker" option.
 *
 * Reporting: `AudioManager.getAudioDevicesForAttributes(attrs)` (API 31+) is the platform's answer to
 * "which devices would a track with these attributes use right now"; it is what `dumpsys audio` shows as the
 * routed device. We log it as `speech_output_route` with the full output device list.
 *
 * Forcing (mode "speaker"), by engine type:
 *  - Engines in another process (Google / Samsung TextToSpeech, ML Kit playback): we cannot touch their AudioTrack.
 *    The only supported lever is the attributes we hand to `TextToSpeech.setAudioAttributes`. With
 *    USAGE_VOICE_COMMUNICATION the track follows the communication strategy, which `setCommunicationDevice(speaker)`
 *    controls, so we set MODE_IN_COMMUNICATION + setCommunicationDevice(builtin speaker) and use that usage.
 *  - Engines in our process (sherpa-onnx, own AudioTrack): `AudioTrack.setPreferredDevice(speaker)` with normal
 *    assistant usage. No mode change is needed, and any communication route we set earlier is released.
 */
object SpeechOutput {
  const val MODE_AUTO = "auto"
  const val MODE_SPEAKER = "speaker"

  @Volatile var mode: String = MODE_AUTO
    private set

  /** True while we ourselves hold MODE_IN_COMMUNICATION + a communication device for forcing. */
  @Volatile private var ownsCommRoute = false

  /** True after the session route picker (AudioRouting.select) set a communication device; cleared by AudioRouting.clear. */
  @Volatile private var pickerOwnsCommRoute = false

  /**
   * Per-utterance override used by the TTS lab so the lab can default to the phone speaker without changing the
   * global [mode] that the session cue path uses. Valid while [labToken] names the active lab request.
   */
  @Volatile private var labOverride: String? = null
  @Volatile private var labToken: String? = null

  /** The mode in force right now: the lab override while a lab utterance is active, otherwise the global mode. */
  val effectiveMode: String get() = labOverride ?: mode

  private var appContext: Context? = null
  private var callback: AudioDeviceCallback? = null
  @Volatile var lastReport: Map<String, Any?>? = null
    private set

  private fun am(c: Context) = c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private fun log(c: Context) = DiagLog.get(c)

  /** Registers the device callback once; reports on every output device change. */
  fun startMonitoring(context: Context) {
    if (callback != null) return
    val c = context.applicationContext
    appContext = c
    val cb = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) { report("device_added", currentUsage()) }
      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) { report("device_removed", currentUsage()) }
    }
    callback = cb
    am(c).registerAudioDeviceCallback(cb, Handler(Looper.getMainLooper()))
  }

  fun stopMonitoring() {
    val c = appContext ?: return
    callback?.let { am(c).unregisterAudioDeviceCallback(it) }
    callback = null
  }

  /** Usage a platform-engine utterance would get right now. */
  fun currentUsage(): Int {
    val c = appContext ?: return AudioAttributes.USAGE_ASSISTANT
    return usageFor(inProcess = false, communicationMode = am(c).mode == AudioManager.MODE_IN_COMMUNICATION)
  }

  /** @param communicationMode the session routed to a communication device (existing picker behaviour). */
  fun usageFor(inProcess: Boolean, communicationMode: Boolean): Int = when {
    effectiveMode == MODE_SPEAKER && !inProcess -> AudioAttributes.USAGE_VOICE_COMMUNICATION
    communicationMode && !inProcess -> AudioAttributes.USAGE_VOICE_COMMUNICATION
    else -> AudioAttributes.USAGE_ASSISTANT
  }

  fun attributes(usage: Int): AudioAttributes =
    AudioAttributes.Builder().setUsage(usage).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()

  fun builtinSpeaker(context: Context): AudioDeviceInfo? =
    am(context).getDevices(AudioManager.GET_DEVICES_OUTPUTS).firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }

  /** Sets the mode; the actual routing change happens lazily in [beginSpeech] (and eagerly here for reporting). */
  fun setMode(context: Context, newMode: String): Map<String, Any?> {
    val c = context.applicationContext
    appContext = c
    mode = if (newMode == MODE_SPEAKER) MODE_SPEAKER else MODE_AUTO
    val method = if (mode == MODE_SPEAKER) {
      "communication_device(builtin_speaker)+USAGE_VOICE_COMMUNICATION for platform engines; setPreferredDevice(builtin_speaker) for in-process engines"
    } else {
      releaseCommRoute(c)
      "none"
    }
    log(c).log("speech_output_mode", mapOf("mode" to mode, "method" to method))
    if (mode == MODE_SPEAKER) ensureCommRoute(c)
    return report("mode_change", currentUsage())
  }

  /**
   * Called right before an utterance starts. Makes the routing match the mode for this engine type and returns
   * a label of the method used (also logged by the caller).
   */
  fun beginSpeech(context: Context, inProcess: Boolean): String {
    val c = context.applicationContext
    appContext = c
    log(c).log(
      "speech_begin",
      mapOf(
        "effectiveMode" to effectiveMode, "inProcess" to inProcess, "audioMode" to am(c).mode,
        "communicationDevice" to am(c).communicationDevice?.let(AudioRouting::describe), "commOwner" to commOwner(),
      ),
    )
    if (effectiveMode != MODE_SPEAKER) return "auto"
    return if (inProcess) {
      releaseCommRoute(c)
      "preferred_device(builtin_speaker)"
    } else {
      if (ensureCommRoute(c)) "communication_device(builtin_speaker)+voice_communication" else "communication_device_failed"
    }
  }

  /** In-process engines call this on their AudioTrack. Returns true if the preferred device was applied. */
  fun applyToTrack(context: Context, track: android.media.AudioTrack): Boolean {
    if (effectiveMode != MODE_SPEAKER) return false
    val sp = builtinSpeaker(context) ?: return false
    return track.setPreferredDevice(sp)
  }

  /** Who holds MODE_IN_COMMUNICATION / the communication device right now (for diagnostics). */
  private fun commOwner(): String = when {
    ownsCommRoute -> "speech_output"
    pickerOwnsCommRoute -> "route_picker"
    appContext?.let { am(it).mode == AudioManager.MODE_IN_COMMUNICATION } == true -> "unknown_external"
    else -> "none"
  }

  /**
   * Starts a lab utterance with its own output mode ("speaker" or "auto"). Releases a communication route we hold
   * when the lab wants auto, so "auto" really means the system route.
   */
  fun beginLab(context: Context, labMode: String, token: String) {
    val c = context.applicationContext
    appContext = c
    labToken = token
    labOverride = if (labMode == MODE_SPEAKER) MODE_SPEAKER else MODE_AUTO
    if (effectiveMode != MODE_SPEAKER) releaseCommRoute(c)
  }

  /**
   * Ends the lab utterance [token] (no-op if a newer request already took over). Restores MODE_NORMAL and clears the
   * communication device if the lab's forced speaker route is the only reason we hold them.
   */
  fun endLab(context: Context, token: String) {
    if (labToken != token) return
    val c = context.applicationContext
    labToken = null
    labOverride = null
    if (mode != MODE_SPEAKER) releaseCommRoute(c)
  }

  /** Releases any lab override unconditionally (lab stop / release). */
  fun endLabAny(context: Context) {
    labToken?.let { endLab(context, it) }
  }

  /**
   * Route a lab utterance would take for [labMode], without side effects or events. Phone speaker mode reports the
   * built-in speaker (that is where we force it); auto reports the platform's pick for assistant speech.
   */
  fun previewRoute(context: Context, labMode: String): Map<String, Any?> {
    val c = context.applicationContext
    appContext = c
    val a = am(c)
    val outputs = a.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val target = if (labMode == MODE_SPEAKER) {
      builtinSpeaker(c)
    } else {
      a.getAudioDevicesForAttributes(attributes(AudioAttributes.USAGE_ASSISTANT)).firstOrNull()
    }
    val ok = target?.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
    return mapOf(
      "output" to labMode,
      "label" to (target?.let(::label) ?: "unknown"),
      "ok" to ok,
      "warning" to when {
        target == null -> "No output device reported"
        ok -> null
        else -> "Speech goes to ${label(target)}, not the phone speaker"
      },
      "audioMode" to a.mode,
      "communicationDevice" to a.communicationDevice?.let(AudioRouting::describe),
      "commOwner" to commOwner(),
      "allOutputs" to outputs.map(AudioRouting::describe),
    )
  }

  private fun ensureCommRoute(c: Context): Boolean {
    val a = am(c)
    val sp = a.availableCommunicationDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER } ?: return false
    if (ownsCommRoute && a.communicationDevice?.id == sp.id && a.mode == AudioManager.MODE_IN_COMMUNICATION) return true
    a.mode = AudioManager.MODE_IN_COMMUNICATION
    val ok = a.setCommunicationDevice(sp)
    ownsCommRoute = ok
    if (ok) pickerOwnsCommRoute = false
    log(c).log("speech_force_speaker", mapOf("ok" to ok, "device" to AudioRouting.describe(sp)))
    return ok
  }

  private fun releaseCommRoute(c: Context) {
    if (!ownsCommRoute) return
    ownsCommRoute = false
    val a = am(c)
    a.clearCommunicationDevice()
    a.mode = AudioManager.MODE_NORMAL
    log(c).log(
      "speech_force_speaker_released",
      mapOf("audioMode" to a.mode, "communicationDevice" to a.communicationDevice?.let(AudioRouting::describe)),
    )
  }

  /** The session's route picker changed or cleared the communication device: our forced route is no longer ours. */
  fun onExternalRouteChange(selectedDevice: Boolean) {
    ownsCommRoute = false
    pickerOwnsCommRoute = selectedDevice
    if (selectedDevice && mode == MODE_SPEAKER) {
      mode = MODE_AUTO
      appContext?.let { log(it).log("speech_output_mode", mapOf("mode" to mode, "method" to "reset: user picked a communication device")) }
    }
  }

  fun label(d: AudioDeviceInfo): String {
    val kind = when (d.type) {
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Phone speaker"
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "Phone earpiece"
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth A2DP"
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth SCO"
      AudioDeviceInfo.TYPE_BLE_HEADSET -> "Bluetooth LE Audio headset"
      AudioDeviceInfo.TYPE_BLE_SPEAKER -> "Bluetooth LE Audio speaker"
      AudioDeviceInfo.TYPE_BLE_BROADCAST -> "Bluetooth LE broadcast"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired headphones"
      AudioDeviceInfo.TYPE_USB_HEADSET -> "USB headset"
      AudioDeviceInfo.TYPE_USB_DEVICE -> "USB device"
      AudioDeviceInfo.TYPE_HEARING_AID -> "Hearing aid"
      else -> AudioRouting.typeName(d.type)
    }
    val name = d.productName?.toString()?.takeIf { it.isNotBlank() }
    return if (name != null && d.type != AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) "$kind — $name" else kind
  }

  /**
   * Builds, logs (`speech_output_route`) and emits (`speechOutputRoute`) the current speech route.
   * @param routed the device an in-process AudioTrack reports via getRoutedDevice(), when known.
   */
  fun report(reason: String, usage: Int, routed: AudioDeviceInfo? = null, extra: Map<String, Any?> = emptyMap()): Map<String, Any?> {
    val c = appContext ?: return emptyMap()
    val a = am(c)
    val planned = a.getAudioDevicesForAttributes(attributes(usage))
    val outputs = a.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val comm = a.communicationDevice
    val effective = routed ?: planned.firstOrNull()
    val isSpeaker = effective?.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
    val isSelected = effective != null && comm != null && effective.id == comm.id && a.mode == AudioManager.MODE_IN_COMMUNICATION
    val ok = effective != null && (isSpeaker || isSelected)
    val warning = when {
      effective == null -> "No output device reported for this usage"
      ok -> null
      effectiveMode == MODE_SPEAKER -> "Forced speaker is on but speech goes to ${label(effective)}"
      else -> "Speech goes to ${label(effective)}, which is not the phone speaker or a headset you selected"
    }
    val payload = mapOf(
      "reason" to reason,
      "usage" to usageName(usage),
      "mode" to mode,
      "effectiveMode" to effectiveMode,
      "commOwner" to commOwner(),
      "label" to (effective?.let(::label) ?: "unknown"),
      "ok" to ok,
      "warning" to warning,
      "planned" to planned.map(AudioRouting::describe),
      "trackRouted" to routed?.let(AudioRouting::describe),
      "allOutputs" to outputs.map(AudioRouting::describe),
      "communicationDevice" to comm?.let(AudioRouting::describe),
      "audioMode" to a.mode,
    ) + extra
    lastReport = payload
    log(c).log("speech_output_route", payload)
    SessionRuntime.emit("speechOutputRoute", payload)
    return payload
  }

  fun usageName(usage: Int) = when (usage) {
    AudioAttributes.USAGE_ASSISTANT -> "USAGE_ASSISTANT"
    AudioAttributes.USAGE_VOICE_COMMUNICATION -> "USAGE_VOICE_COMMUNICATION"
    AudioAttributes.USAGE_MEDIA -> "USAGE_MEDIA"
    else -> "usage_$usage"
  }
}
