package expo.modules.vcaudio

import android.content.Context
import android.app.KeyguardManager
import android.os.PowerManager
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ProcessLifecycleOwner
import expo.modules.vcaudio.core.AutoStopPolicy
import java.io.File
import android.os.SystemClock
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Expo surface for the Android voice-coach audio engine. */
class VcAudioModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)
  private val routes: DeviceRoutes by lazy { DeviceRoutes(context, { capture.taking }) {
    capture.devicesChanged()
    sendEvent("onDevices", routes.snapshot(capture.activeInput ?: routes.selectedInput()))
  } }
  private val capture: CaptureEngine by lazy { CaptureEngine(context, routes) { name, event -> sendEvent(name, event) } }
  private val lifecycleObserver = LifecycleEventObserver { _, event ->
    if (event == Lifecycle.Event.ON_STOP) {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      if (AutoStopPolicy.shouldStop(true, capture.taking, power.isInteractive, keyguard.isKeyguardLocked, true)) {
        Thread { capture.stop("left_app") }.start()
      }
    }
  }
  private val main = Handler(Looper.getMainLooper())
  private fun unavailable(): Any = throw CodedException("ERR_UNAVAILABLE", "Audio engine is not initialized", null)

  override fun definition() = ModuleDefinition {
    Name("VcAudio")
    Events("onDevices", "onFrame", "onMonitorState", "onTakeStopped", "onBeat", "onPlayback")
    OnCreate { routes.register(); main.post { ProcessLifecycleOwner.get().lifecycle.addObserver(lifecycleObserver) } }
    OnDestroy { routes.unregister(); capture.stop(); main.post { ProcessLifecycleOwner.get().lifecycle.removeObserver(lifecycleObserver) } }
    AsyncFunction("getDevices") { routes.snapshot(capture.activeInput ?: routes.selectedInput()) }
    AsyncFunction("setInputPreference") { pref: Map<String, Any?> -> routes.setInput(pref); capture.devicesChanged(); routes.snapshot(capture.activeInput ?: routes.selectedInput()).also { sendEvent("onDevices", it) } }
    AsyncFunction("setOutputPreference") { pref: Map<String, Any?> -> routes.setOutput(pref); routes.snapshot().also { sendEvent("onDevices", it) } }
    AsyncFunction("startMonitor") { capture.start() }
    AsyncFunction("stopMonitor") { capture.stop() }
    AsyncFunction("startTake") { options: Map<String, Any?> -> capture.begin(options["kind"] as? String ?: "") }
    AsyncFunction("stopTake") { capture.end("user") }
    AsyncFunction("deleteTake") { path: String ->
      val dir = File(context.filesDir, "takes").canonicalFile
      val file = File(path).canonicalFile
      if (file.parentFile != dir || file.extension != "wav" || file.name.endsWith(".asr.wav")) throw CodedException("ERR_ARGUMENT", "Invalid take path", null)
      if (capture.taking) throw CodedException("ERR_LOCKED", "Cannot delete while recording", null)
      file.delete(); File(dir, "${file.nameWithoutExtension}.asr.wav").delete(); Unit
    }
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
