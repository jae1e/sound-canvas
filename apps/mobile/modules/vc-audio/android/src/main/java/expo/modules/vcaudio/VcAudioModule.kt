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
import expo.modules.vcaudio.core.ReviewAnalysis
import expo.modules.vcaudio.core.WavReader
import java.io.File
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import java.util.concurrent.Executors
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Expo surface for the Android voice-coach audio engine. */
class VcAudioModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)
  private val routes: DeviceRoutes by lazy { DeviceRoutes(context, { capture.taking }) {
    try {
      io.execute {
        capture.devicesChanged()
        output.routeChanged()
        sendEvent("onDevices", routes.snapshot(capture.activeInput ?: routes.selectedInput()))
      }
    } catch (_: java.util.concurrent.RejectedExecutionException) { }
  } }
  private val output: AudioOutput by lazy { AudioOutput(context, routes) { name, event -> sendEvent(name, event) } }
  private val capture: CaptureEngine by lazy { CaptureEngine(context, routes, { output.isMasked(it) }, { start, end -> output.beatsBetween(start, end) }) { name, event -> sendEvent(name, event) } }
  private val lifecycleObserver = LifecycleEventObserver { _, event ->
    if (event == Lifecycle.Event.ON_STOP) {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      if (AutoStopPolicy.shouldStop(true, capture.taking, power.isInteractive, keyguard.isKeyguardLocked, true)) {
        Thread { capture.stop("left_app"); output.stopAll() }.start()
      }
    }
  }
  private val main = Handler(Looper.getMainLooper())
  private val io = Executors.newCachedThreadPool()
  private fun runAsync(promise: Promise, block: () -> Any?) {
    io.execute {
      try { val result = block(); promise.resolve(if (result === Unit) null else result) }
      catch (e: CodedException) { promise.reject(e) }
      catch (e: Throwable) { promise.reject(CodedException("ERR_AUDIO", e.message ?: e.toString(), e)) }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("VcAudio")
    Events("onDevices", "onFrame", "onMonitorState", "onTakeStopped", "onBeat", "onPlayback")
    OnCreate { routes.register(); main.post { ProcessLifecycleOwner.get().lifecycle.addObserver(lifecycleObserver) } }
    OnDestroy { routes.unregister(); capture.stop(); output.stopAll(); io.shutdown(); main.post { ProcessLifecycleOwner.get().lifecycle.removeObserver(lifecycleObserver) } }
    AsyncFunction("getDevices") { routes.snapshot(capture.activeInput ?: routes.selectedInput()) }
    AsyncFunction("setInputPreference") { pref: Map<String, Any?>, promise: Promise -> runAsync(promise) { capture.withPreferencesUnlocked {
      routes.setInput(pref); capture.devicesChanged(); routes.snapshot(capture.activeInput ?: routes.selectedInput()).also { sendEvent("onDevices", it) }
    } } }
    AsyncFunction("setOutputPreference") { pref: Map<String, Any?> -> capture.withPreferencesUnlocked {
      routes.setOutput(pref); output.routeChanged(); routes.snapshot(capture.activeInput ?: routes.selectedInput()).also { sendEvent("onDevices", it) }
    } }
    AsyncFunction("startMonitor") { promise: Promise -> runAsync(promise) {
      if (!ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) throw CodedException("ERR_STATE", "The app is not in the foreground", null)
      capture.start()
    } }
    AsyncFunction("stopMonitor") { capture.stop() }
    AsyncFunction("startTake") { options: Map<String, Any?>, promise: Promise -> runAsync(promise) {
      if (!ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) throw CodedException("ERR_STATE", "The app is not in the foreground", null)
      capture.start()
      capture.begin(options["kind"] as? String ?: "") { if (options["countIn"] == true) output.countInEndMs() else null }
    } }
    AsyncFunction("stopTake") { capture.end("user") }
    AsyncFunction("getState") { capture.snapshot() }
    AsyncFunction("ackTake") { id: String -> capture.acknowledge(id) }
    AsyncFunction("listTakeFiles") { capture.listTakeFiles() }
    AsyncFunction("deleteTake") { path: String ->
      val dir = File(context.filesDir, "takes").canonicalFile
      val file = File(path).canonicalFile
      if (file.parentFile != dir || file.extension != "wav" || file.name.endsWith(".asr.wav")) throw CodedException("ERR_ARGUMENT", "Invalid take path", null)
      capture.deleteTake(file)
    }
    AsyncFunction("setBeat") { config: Map<String, Any?> -> output.setBeat(config) }
    AsyncFunction("startBeat") { output.startBeat() }
    AsyncFunction("stopBeat") { output.stopBeat() }
    Function("nowMs") { SystemClock.elapsedRealtimeNanos() / 1_000_000.0 }
    AsyncFunction("playCalibrationClicks") { count: Int, promise: Promise -> runAsync(promise) { output.calibration(count) } }
    AsyncFunction("setOutputLatency") { key: String, latency: Double ->
      capture.withPreferencesUnlocked { output.setLatency(key, latency) }
    }
    AsyncFunction("getMediaVolume") { output.getVolume() }
    AsyncFunction("setMediaVolume") { volume: Double -> output.setVolume(volume) }
    AsyncFunction("playTestTone") { output.testTone() }
    AsyncFunction("play") { path: String, start: Double?, promise: Promise -> runAsync(promise) { output.play(path, start) } }
    AsyncFunction("pause") { output.pause() }
    AsyncFunction("resume") { output.resume() }
    AsyncFunction("stop") { output.stopPlayback() }
    AsyncFunction("seek") { position: Double -> output.seek(position) }
    AsyncFunction("analyzeTake") { path: String, options: Map<String, Any?>?, promise: Promise -> runAsync(promise) {
      val maxPoints = (options?.get("maxPoints") as? Number)?.toInt() ?: 3000
      val buckets = (options?.get("waveformBuckets") as? Number)?.toInt() ?: 400
      if (maxPoints !in 1..100000 || buckets !in 1..100000) throw CodedException("ERR_ARGUMENT", "Invalid analysis size", null)
      val beats = (options?.get("beatTimesMs") as? List<*>)?.map {
        val value = (it as? Number)?.toDouble() ?: throw CodedException("ERR_ARGUMENT", "Invalid beat time", null)
        if (!value.isFinite()) throw CodedException("ERR_ARGUMENT", "Invalid beat time", null)
        value
      } ?: emptyList()
      val wav = try { WavReader.read(File(path)) } catch (_: Exception) { null }
        ?: throw CodedException("ERR_AUDIO", "Take is missing or is not a mono PCM16 WAV", null)
      ReviewAnalysis.analyze(wav, maxPoints, buckets, beats)
    } }
  }
}
