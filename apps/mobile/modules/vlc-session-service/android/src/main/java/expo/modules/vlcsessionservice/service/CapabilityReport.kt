package expo.modules.vlcsessionservice.service

import android.content.Context
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.PowerManager
import android.speech.SpeechRecognizer
import com.google.android.gms.common.GoogleApiAvailability
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.speech.ModelManager
import expo.modules.vlcsessionservice.speech.TtsProbe

object CapabilityReport {
  /** Blocking (TTS probing); call off the main thread. */
  fun build(context: Context, routing: AudioRouting): Map<String, Any?> {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return mapOf(
      "model" to Build.MODEL,
      "manufacturer" to Build.MANUFACTURER,
      "device" to Build.DEVICE,
      "sdkInt" to Build.VERSION.SDK_INT,
      "release" to Build.VERSION.RELEASE,
      "securityPatch" to Build.VERSION.SECURITY_PATCH,
      "supportedAbis" to Build.SUPPORTED_ABIS.toList(),
      "speechRecognizerAvailable" to SpeechRecognizer.isRecognitionAvailable(context),
      "onDeviceRecognitionAvailable" to if (Build.VERSION.SDK_INT >= 33) SpeechRecognizer.isOnDeviceRecognitionAvailable(context) else null,
      "aecAvailable" to AcousticEchoCanceler.isAvailable(),
      "noiseSuppressorAvailable" to NoiseSuppressor.isAvailable(),
      "playServicesStatus" to GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context), // 0 = SUCCESS
      "ignoringBatteryOptimizations" to pm.isIgnoringBatteryOptimizations(context.packageName),
      "tts" to TtsProbe.probe(context),
      "communicationDevices" to routing.listDevices(),
      "models" to ModelManager(context).status().map { mapOf("id" to it["id"], "ready" to it["ready"]) },
      "mlKitGenAi" to "not probed in this spike",
    )
  }

  fun describeDevice(d: android.media.AudioDeviceInfo) = AudioRouting.describe(d)
}
