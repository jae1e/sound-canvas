package expo.modules.vcaudio

import android.os.SystemClock
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Expo surface for the Android voice-coach audio engine. */
class VcAudioModule : Module() {
  private fun unavailable(): Any = throw CodedException("ERR_UNAVAILABLE", "Audio engine is not initialized", null)

  override fun definition() = ModuleDefinition {
    Name("VcAudio")
    Events("onDevices", "onFrame", "onMonitorState", "onTakeStopped", "onBeat", "onPlayback")
    AsyncFunction("getDevices") { unavailable() }
    AsyncFunction("setInputPreference") { _: Map<String, Any?> -> unavailable() }
    AsyncFunction("setOutputPreference") { _: Map<String, Any?> -> unavailable() }
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
