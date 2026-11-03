package expo.modules.vlcsessionservice.speech.stt

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.speech.ModelDownloadListener
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat

/**
 * Availability / installed-language report and model-download trigger for the platform recognizer.
 * Both calls must run on the main thread; they hop there themselves and answer through [done] on the main thread.
 */
object PlatformSttSupport {
  private val main = Handler(Looper.getMainLooper())

  private fun baseIntent(tag: String?) = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    if (tag != null) putExtra(RecognizerIntent.EXTRA_LANGUAGE, tag)
  }

  private fun tagsFor(list: List<String>?, prefix: String) = list.orEmpty().filter { it.startsWith(prefix, ignoreCase = true) }

  /** Collects what the platform says about on-device recognition and which languages are installed. */
  fun report(context: Context, done: (Map<String, Any?>) -> Unit) {
    main.post {
      val onDeviceAvailable = Build.VERSION.SDK_INT >= 33 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
      val info = mutableMapOf<String, Any?>(
        "sdk" to Build.VERSION.SDK_INT,
        "recognitionAvailable" to SpeechRecognizer.isRecognitionAvailable(context),
        "onDeviceAvailable" to onDeviceAvailable,
        "recognizerPath" to if (onDeviceAvailable) "on_device" else "system_prefer_offline",
        "defaultService" to (try { Settings.Secure.getString(context.contentResolver, "voice_recognition_service") } catch (_: Exception) { null }),
        "languageDetectionApi" to (Build.VERSION.SDK_INT >= 34),
        "segmentedSessionApi" to (Build.VERSION.SDK_INT >= 33),
      )
      if (Build.VERSION.SDK_INT < 33) {
        info["supportCheck"] = "unavailable_before_api_33"
        done(info)
        return@post
      }
      var recognizer: SpeechRecognizer? = null
      var finished = false
      fun finish() {
        if (finished) return
        finished = true
        try { recognizer?.destroy() } catch (_: Exception) { }
        done(info)
      }
      try {
        recognizer = if (onDeviceAvailable) SpeechRecognizer.createOnDeviceSpeechRecognizer(context) else SpeechRecognizer.createSpeechRecognizer(context)
        recognizer.checkRecognitionSupport(
          baseIntent("ko-KR"),
          ContextCompat.getMainExecutor(context),
          object : RecognitionSupportCallback {
            override fun onSupportResult(s: RecognitionSupport) {
              val installed = s.installedOnDeviceLanguages
              val supported = s.supportedOnDeviceLanguages
              val pending = s.pendingOnDeviceLanguages
              val online = s.onlineLanguages
              info["supportCheck"] = "ok"
              info["installedOnDevice"] = installed
              info["supportedOnDevice"] = supported
              info["pendingOnDevice"] = pending
              info["onlineLanguages"] = online
              info["koInstalled"] = tagsFor(installed, "ko").isNotEmpty()
              info["enInstalled"] = tagsFor(installed, "en").isNotEmpty()
              info["koSupported"] = tagsFor(supported, "ko").isNotEmpty() || tagsFor(online, "ko").isNotEmpty()
              info["enSupported"] = tagsFor(supported, "en").isNotEmpty() || tagsFor(online, "en").isNotEmpty()
              info["installedKoEn"] = (installed + pending).filter { it.startsWith("ko", true) || it.startsWith("en", true) }
              finish()
            }

            override fun onError(error: Int) {
              info["supportCheck"] = "error:${PlatformSttEngine.errorName(error)}"
              finish()
            }
          },
        )
        main.postDelayed({ if (!finished) { info["supportCheck"] = "timeout"; finish() } }, 5_000)
      } catch (e: Exception) {
        info["supportCheck"] = "exception:$e"
        finish()
      }
    }
  }

  /**
   * Asks the recognition service to download the on-device model for [tag]. API 34+ reports progress through [progress];
   * API 33 only fires the request (no listener). [done] gets the final outcome map.
   */
  fun triggerDownload(context: Context, tag: String, progress: (Map<String, Any?>) -> Unit, done: (Map<String, Any?>) -> Unit) {
    main.post {
      if (Build.VERSION.SDK_INT < 33) {
        done(mapOf("ok" to false, "locale" to tag, "reason" to "triggerModelDownload needs API 33"))
        return@post
      }
      val onDevice = SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
      val recognizer = try {
        if (onDevice) SpeechRecognizer.createOnDeviceSpeechRecognizer(context) else SpeechRecognizer.createSpeechRecognizer(context)
      } catch (e: Exception) {
        done(mapOf("ok" to false, "locale" to tag, "reason" to e.toString()))
        return@post
      }
      val intent = baseIntent(tag)
      var finished = false
      fun finish(r: Map<String, Any?>) {
        if (finished) return
        finished = true
        // Keep the recognizer alive a bit: destroying it right away may cancel a scheduled download.
        main.postDelayed({ try { recognizer.destroy() } catch (_: Exception) { } }, 15_000)
        done(r)
      }
      try {
        if (Build.VERSION.SDK_INT >= 34) {
          recognizer.triggerModelDownload(
            intent,
            ContextCompat.getMainExecutor(context),
            object : ModelDownloadListener {
              override fun onProgress(completedPercent: Int) = progress(mapOf("locale" to tag, "event" to "progress", "percent" to completedPercent))
              override fun onScheduled() {
                progress(mapOf("locale" to tag, "event" to "scheduled"))
                finish(mapOf("ok" to true, "locale" to tag, "outcome" to "scheduled"))
              }
              override fun onSuccess() {
                progress(mapOf("locale" to tag, "event" to "success"))
                finish(mapOf("ok" to true, "locale" to tag, "outcome" to "success"))
              }
              override fun onError(error: Int) {
                finish(mapOf("ok" to false, "locale" to tag, "outcome" to "error", "error" to PlatformSttEngine.errorName(error)))
              }
            },
          )
          main.postDelayed({ finish(mapOf("ok" to true, "locale" to tag, "outcome" to "requested_no_callback_yet")) }, 10_000)
        } else {
          recognizer.triggerModelDownload(intent)
          finish(mapOf("ok" to true, "locale" to tag, "outcome" to "requested_no_progress_api33"))
        }
      } catch (e: Exception) {
        finish(mapOf("ok" to false, "locale" to tag, "outcome" to "exception", "error" to e.toString()))
      }
    }
  }
}
