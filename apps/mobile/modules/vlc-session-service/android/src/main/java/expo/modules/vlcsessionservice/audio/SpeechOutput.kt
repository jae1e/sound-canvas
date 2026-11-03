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
 * The TTS lab never forces anything: it follows the system route (or setPreferredDevice for in-process engines).
 *
 * Forcing (session cue mode "speaker"), by engine type:
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
   * TTS lab state. While a lab utterance is active ([labToken] set) the lab NEVER forces the speaker or touches the
   * communication mode: in-process engines use [labDeviceId] through AudioTrack.setPreferredDevice (null = system route)
   * and every engine uses media-style attributes so the hardware volume keys control STREAM_MUSIC.
   */
  @Volatile private var labDeviceId: Int? = null
  @Volatile private var labToken: String? = null

  /** The mode in force right now: the lab always follows the system route, otherwise the global mode. */
  val effectiveMode: String get() = if (labToken != null) MODE_AUTO else mode

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
    labToken != null -> AudioAttributes.USAGE_MEDIA
    effectiveMode == MODE_SPEAKER && !inProcess -> AudioAttributes.USAGE_VOICE_COMMUNICATION
    communicationMode && !inProcess -> AudioAttributes.USAGE_VOICE_COMMUNICATION
    else -> AudioAttributes.USAGE_ASSISTANT
  }

  /** Usage for tracks we own (in-process engines, ML Kit own playback): media style during a lab run. */
  fun trackUsage(): Int = if (labToken != null) AudioAttributes.USAGE_MEDIA else AudioAttributes.USAGE_ASSISTANT

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
    if (labToken != null) {
      return if (inProcess) (if (labDeviceId != null) "preferred_device(id=$labDeviceId)" else "system_route")
      else "system_route(platform engine follows it)"
    }
    if (effectiveMode != MODE_SPEAKER) return "auto"
    return if (inProcess) {
      releaseCommRoute(c)
      "preferred_device(builtin_speaker)"
    } else {
      if (ensureCommRoute(c)) "communication_device(builtin_speaker)+voice_communication" else "communication_device_failed"
    }
  }

  /** In-process engines call this on their AudioTrack. Returns true if a preferred device was applied. */
  fun applyToTrack(context: Context, track: android.media.AudioTrack): Boolean {
    val wanted = labDeviceId
    if (labToken != null) {
      if (wanted == null) return false // system route
      val dev = outputDevices(context).firstOrNull { it.id == wanted }
      if (dev == null) {
        log(context).log("lab_output_missing", mapOf("deviceId" to wanted))
        return false
      }
      return track.setPreferredDevice(dev)
    }
    if (effectiveMode != MODE_SPEAKER) return false
    val sp = builtinSpeaker(context) ?: return false
    return track.setPreferredDevice(sp)
  }

  private val selectableTypes = setOf(
    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_HEADSET,
    AudioDeviceInfo.TYPE_BLE_SPEAKER, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
    AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_HEARING_AID,
  )

  /** Connected outputs the lab can target: phone speaker, Bluetooth A2DP / LE audio, wired and USB. */
  fun outputDevices(context: Context): List<AudioDeviceInfo> =
    am(context).getDevices(AudioManager.GET_DEVICES_OUTPUTS).filter { it.type in selectableTypes }

  /** Describes the lab selection for logs: "system" or "device:<id> <label>". */
  fun selectionText(context: Context, deviceId: Int?): String {
    if (deviceId == null) return "system"
    val d = outputDevices(context).firstOrNull { it.id == deviceId }
    return if (d == null) "device:$deviceId (not connected)" else "device:$deviceId ${label(d)}"
  }

  /** STREAM_MUSIC volume as {volume, max, percent}. */
  fun musicVolume(context: Context): Map<String, Any?> {
    val a = am(context)
    val v = a.getStreamVolume(AudioManager.STREAM_MUSIC)
    val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    return mapOf("volume" to v, "max" to max, "percent" to if (max > 0) Math.round(v * 100f / max) else 0)
  }

  fun setMusicVolume(context: Context, percent: Int): Map<String, Any?> {
    val a = am(context)
    val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val idx = Math.round(percent.coerceIn(0, 100) * max / 100f)
    try { a.setStreamVolume(AudioManager.STREAM_MUSIC, idx, 0) } catch (e: SecurityException) {
      log(context).log("music_volume_failed", mapOf("error" to e.toString()))
    }
    val r = musicVolume(context)
    log(context).log("music_volume_set", mapOf("requestedPercent" to percent) + r)
    return r
  }

  /** Logs the audio mode (lab start/end etc.). */
  fun logAudioMode(context: Context, where: String, extra: Map<String, Any?> = emptyMap()) {
    val a = am(context)
    log(context).log(
      "audio_mode",
      mapOf("where" to where, "audioMode" to a.mode, "communicationDevice" to a.communicationDevice?.let(AudioRouting::describe), "commOwner" to commOwner()) + extra,
    )
  }

  /** Who holds MODE_IN_COMMUNICATION / the communication device right now (for diagnostics). */
  private fun commOwner(): String = when {
    ownsCommRoute -> "speech_output"
    pickerOwnsCommRoute -> "route_picker"
    appContext?.let { am(it).mode == AudioManager.MODE_IN_COMMUNICATION } == true -> "unknown_external"
    else -> "none"
  }

  /**
   * Starts a lab utterance. [deviceId] null = follow the system route. Any communication route/mode we hold is released
   * (and a stale MODE_IN_COMMUNICATION nobody owns is reset) so the lab always plays on the media path.
   */
  fun beginLab(context: Context, deviceId: Int?, token: String) {
    val c = context.applicationContext
    appContext = c
    labToken = token
    labDeviceId = deviceId
    releaseCommRoute(c)
    resetStaleCommunicationMode(c, "lab_start")
    logAudioMode(c, "lab_start", mapOf("selection" to selectionText(c, deviceId), "requestId" to token))
  }

  /** Ends the lab utterance [token] (no-op if a newer request already took over). */
  fun endLab(context: Context, token: String) {
    if (labToken != token) return
    val c = context.applicationContext
    labToken = null
    labDeviceId = null
    if (mode != MODE_SPEAKER) releaseCommRoute(c)
    resetStaleCommunicationMode(c, "lab_end")
    logAudioMode(c, "lab_end", mapOf("requestId" to token))
  }

  /** Releases any lab state unconditionally (lab stop / release). */
  fun endLabAny(context: Context) {
    labToken?.let { endLab(context, it) }
  }

  /** MODE_IN_COMMUNICATION that neither we nor the session route picker own (e.g. left by an older run): back to normal. */
  private fun resetStaleCommunicationMode(c: Context, where: String) {
    val a = am(c)
    if (a.mode != AudioManager.MODE_IN_COMMUNICATION || ownsCommRoute || pickerOwnsCommRoute) return
    a.clearCommunicationDevice()
    a.mode = AudioManager.MODE_NORMAL
    log(c).log("audio_mode_reset", mapOf("where" to where, "audioMode" to a.mode))
  }

  /** Cue path: called when TTS goes idle. Forced-speaker mode must not keep MODE_IN_COMMUNICATION between cues. */
  fun onSpeechIdle(context: Context) {
    val c = context.applicationContext
    if (labToken != null) return
    releaseCommRoute(c)
  }

  /**
   * Route a lab utterance would take for [deviceId] (null = system route), without side effects or events. Also returns
   * the selectable outputs and the STREAM_MUSIC volume so the UI needs one call.
   */
  fun previewRoute(context: Context, deviceId: Int?): Map<String, Any?> {
    val c = context.applicationContext
    appContext = c
    val a = am(c)
    val outputs = outputDevices(c)
    val planned = a.getAudioDevicesForAttributes(attributes(AudioAttributes.USAGE_MEDIA)).firstOrNull()
    val chosen = if (deviceId == null) null else outputs.firstOrNull { it.id == deviceId }
    val target = chosen ?: planned
    return mapOf(
      "output" to (deviceId?.toString() ?: "system"),
      "selection" to selectionText(c, deviceId),
      "label" to (target?.let(::label) ?: "unknown"),
      "systemRoute" to (planned?.let(::label) ?: "unknown"),
      "ok" to (target != null && (deviceId == null || chosen != null)),
      "warning" to when {
        target == null -> "No output device reported"
        deviceId != null && chosen == null -> "Selected output is no longer connected"
        else -> null
      },
      "platformNote" to if (deviceId != null && planned != null && planned.id != deviceId) {
        "Platform engines (Google, Samsung, ML Kit) follow the system route (${label(planned)}), not this selection"
      } else if (deviceId != null) "Platform engines follow the system route" else null,
      "audioMode" to a.mode,
      "communicationDevice" to a.communicationDevice?.let(AudioRouting::describe),
      "commOwner" to commOwner(),
      "outputs" to outputs.map { AudioRouting.describe(it) + ("label" to label(it)) },
      "allOutputs" to a.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map(AudioRouting::describe),
      "music" to musicVolume(c),
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
    val inLab = labToken != null
    val ok = if (inLab) effective != null && (labDeviceId == null || effective.id == labDeviceId)
    else effective != null && (isSpeaker || isSelected)
    val warning = when {
      effective == null -> "No output device reported for this usage"
      ok -> null
      inLab -> "Selected output is not where this engine plays: speech goes to ${label(effective)}"
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
