package expo.modules.vlcsessionservice.speech.engine

import android.content.Context
import android.os.Bundle
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import expo.modules.vlcsessionservice.audio.SpeechOutput
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Android [TextToSpeech] bound to a specific engine package (Google `com.google.android.tts`,
 * Samsung `com.samsung.SMT`) or to the system default when [enginePackage] is null.
 * The engine runs in its own process, so only the AudioAttributes we pass can influence its routing.
 */
class PlatformTtsEngine(
  private val context: Context,
  override val id: String,
  override val label: String,
  private val enginePackage: String?,
) : SpeechEngine {
  override val runsInProcess = false

  private var tts: TextToSpeech? = null
  private val callbacks = ConcurrentHashMap<String, SpeakCallback>()
  private val lock = Any()

  override fun prepare(locale: Locale, progress: (Map<String, Any?>) -> Unit): Map<String, Any?> = synchronized(lock) {
    val started = SystemClock.elapsedRealtime()
    if (tts == null) {
      val latch = CountDownLatch(1)
      var status = -99
      val listener = TextToSpeech.OnInitListener { status = it; latch.countDown() }
      // The 3-arg constructor does not fall back to the default engine: a failed bind reports ERROR.
      val t = if (enginePackage == null) TextToSpeech(context, listener) else TextToSpeech(context, listener, enginePackage)
      val finished = latch.await(10, TimeUnit.SECONDS)
      if (!finished || status != TextToSpeech.SUCCESS) {
        val installed = try { t.engines.map { it.name } } catch (_: Exception) { emptyList() }
        val dflt = try { t.defaultEngine } catch (_: Exception) { null }
        t.shutdown()
        return@synchronized mapOf(
          "ok" to false,
          "error" to if (!finished) "init timed out after 10 s" else "init failed (status $status)",
          "requestedEngine" to (enginePackage ?: "default"),
          "defaultEngine" to dflt,
          "installedEngines" to installed,
          "requestedInstalled" to (enginePackage == null || installed.contains(enginePackage)),
        )
      }
      t.setOnUtteranceProgressListener(progressListener)
      tts = t
    }
    val t = tts!!
    val langResult = t.setLanguage(locale)
    mapOf(
      "ok" to (langResult >= TextToSpeech.LANG_AVAILABLE),
      "error" to if (langResult >= TextToSpeech.LANG_AVAILABLE) null else "setLanguage(${locale.toLanguageTag()}) = $langResult",
      "requestedEngine" to (enginePackage ?: "default"),
      "defaultEngine" to t.defaultEngine,
      "boundEngine" to boundEngine(t),
      "installedEngines" to t.engines.map { it.name },
      "languageResult" to langResult,
      "initMs" to SystemClock.elapsedRealtime() - started,
    )
  }

  /** TextToSpeech.getCurrentEngine() is hidden API; try it, report null when blocked. */
  private fun boundEngine(t: TextToSpeech): String? = try {
    TextToSpeech::class.java.getMethod("getCurrentEngine").invoke(t) as? String
  } catch (_: Throwable) {
    null
  }

  private fun matching(t: TextToSpeech, locale: Locale): List<Voice> {
    val all = try { t.voices ?: emptySet() } catch (_: Exception) { emptySet() }
    return all.filter { it.locale.language == locale.language && (locale.country.isEmpty() || it.locale.country == locale.country) }
  }

  override fun voices(locale: Locale): List<Map<String, Any?>> {
    val t = tts ?: return emptyList()
    return matching(t, locale)
      .sortedWith(compareBy<Voice> { it.isNetworkConnectionRequired }.thenBy { it.name })
      .map { v ->
        val notInstalled = v.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
        val local = !v.isNetworkConnectionRequired
        mapOf(
          "name" to v.name,
          "label" to "${v.name}${if (local) "" else " (network)"}${if (notInstalled) " (not installed)" else ""}",
          "networkRequired" to !local,
          "installed" to !notInstalled,
          "quality" to v.quality,
          "latency" to v.latency,
        )
      }
  }

  override fun speak(request: SpeakRequest, callback: SpeakCallback) {
    val t = tts
    if (t == null) {
      callback.onFinished("error:not_prepared")
      return
    }
    val usage = SpeechOutput.usageFor(inProcess = false, communicationMode = false)
    val method = SpeechOutput.beginSpeech(context, inProcess = false)
    t.setAudioAttributes(SpeechOutput.attributes(usage))
    val chosen = request.voice?.let { name -> t.voices?.firstOrNull { it.name == name } }
    if (chosen != null) t.voice = chosen else t.setLanguage(request.locale)
    callbacks[request.id] = callback
    pendingUsage[request.id] = usage
    pendingMethod[request.id] = method
    val r = t.speak(request.text, TextToSpeech.QUEUE_FLUSH, Bundle(), request.id)
    if (r != TextToSpeech.SUCCESS) {
      callbacks.remove(request.id)?.onFinished("error:speak_$r")
    }
  }

  private val pendingUsage = ConcurrentHashMap<String, Int>()
  private val pendingMethod = ConcurrentHashMap<String, String>()

  private val progressListener = object : UtteranceProgressListener() {
    override fun onStart(utteranceId: String) {
      val usage = pendingUsage[utteranceId] ?: SpeechOutput.currentUsage()
      callbacks[utteranceId]?.onFirstAudio(SystemClock.elapsedRealtime(), null, mapOf("usage" to usage, "method" to pendingMethod[utteranceId]))
    }

    override fun onDone(utteranceId: String) = finish(utteranceId, "done")

    @Deprecated("Deprecated in Java")
    override fun onError(utteranceId: String) = finish(utteranceId, "error:engine")

    override fun onError(utteranceId: String, errorCode: Int) = finish(utteranceId, "error:$errorCode")

    override fun onStop(utteranceId: String, interrupted: Boolean) = finish(utteranceId, "stopped")
  }

  private fun finish(id: String, outcome: String) {
    pendingUsage.remove(id)
    pendingMethod.remove(id)
    callbacks.remove(id)?.onFinished(outcome)
  }

  override fun stop() {
    tts?.stop()
    for (k in callbacks.keys.toList()) finish(k, "stopped")
  }

  override fun release() {
    stop()
    tts?.shutdown()
    tts = null
  }
}
