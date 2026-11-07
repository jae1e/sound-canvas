package expo.modules.vcaudio

import android.content.Context
import android.os.SystemClock
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Expo surface for the Android voice-coach audio engine. */
class VcAudioModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)
  @Volatile private var takeActive = false
  private val routes: DeviceRoutes by lazy { DeviceRoutes(context, { takeActive }) { sendEvent("onDevices", routes.snapshot()) } }
  private fun unavailable(): Any = throw CodedException("ERR_UNAVAILABLE", "Audio engine is not initialized", null)

  override fun definition() = ModuleDefinition {
    Name("VcAudio")
    Events("onDevices", "onFrame", "onMonitorState", "onTakeStopped", "onBeat", "onPlayback")
    OnCreate { routes.register() }
    OnDestroy { routes.unregister() }
    AsyncFunction("getDevices") { routes.snapshot() }
    AsyncFunction("setInputPreference") { pref: Map<String, Any?> -> routes.setInput(pref); routes.snapshot().also { sendEvent("onDevices", it) } }
    AsyncFunction("setOutputPreference") { pref: Map<String, Any?> -> routes.setOutput(pref); routes.snapshot().also { sendEvent("onDevices", it) } }
    AsyncFunction("startMonitor") { unavailable() }
    AsyncFunction("stopMonitor") { unavailable() }
    AsyncFunction("startTake") { _: Map<String, Any?> -> unavailable() }
    AsyncFunction("stopTake") { unavailable() }
    AsyncFunction("deleteTake") { _: String -> unavailable() }
    AsyncFunction("setBeat") { _: Map<String, Any?> -> unavailable() }
    AsyncFunction("startBeat") { unavailable() }
    AsyncFunction("stopBeat") { unavailable() }
    Function("nowMs") { SystemClock.elapsedRealtimeNanos() / 1_000_000.0 }
    AsyncFunction("playCalibrationClicks") { _: Int -> unavailable() }
    AsyncFunction("setOutputLatency") { _: String, _: Double -> unavailable() }
    AsyncFunction("getMediaVolume") { unavailable() }
    AsyncFunction("setMediaVolume") { _: Double -> unavailable() }
    AsyncFunction("playTestTone") { unavailable() }
    AsyncFunction("play") { _: String, _: Double? -> unavailable() }
    AsyncFunction("pause") { unavailable() }
    AsyncFunction("resume") { unavailable() }
    AsyncFunction("stop") { unavailable() }
    AsyncFunction("seek") { _: Double -> unavailable() }
    AsyncFunction("analyzeTake") { _: String, _: Map<String, Any?>? -> unavailable() }
  }
}
