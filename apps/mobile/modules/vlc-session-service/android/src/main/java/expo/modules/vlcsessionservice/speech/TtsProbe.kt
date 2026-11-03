package expo.modules.vlcsessionservice.speech

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Enumerates installed TTS engines and checks ko-KR / en-US availability per engine. Blocking: call off the main thread. */
object TtsProbe {
  fun probe(context: Context): Map<String, Any?> {
    val engines = mutableListOf<Map<String, Any?>>()
    var defaultEngine: String? = null
    var infoList: List<TextToSpeech.EngineInfo> = emptyList()
    val bootstrap = initTts(context, null)
    if (bootstrap != null) {
      defaultEngine = bootstrap.defaultEngine
      infoList = bootstrap.engines
      bootstrap.shutdown()
    }
    for (info in infoList) {
      val t = initTts(context, info.name)
      if (t == null) {
        engines.add(mapOf("name" to info.name, "label" to info.label, "initFailed" to true))
        continue
      }
      try {
        engines.add(
          mapOf(
            "name" to info.name,
            "label" to info.label,
            "isDefault" to (info.name == defaultEngine),
            "ko-KR" to langInfo(t, Locale.KOREA),
            "en-US" to langInfo(t, Locale.US),
          ),
        )
      } finally {
        t.shutdown()
      }
    }
    return mapOf("defaultEngine" to defaultEngine, "engines" to engines)
  }

  private fun langInfo(t: TextToSpeech, locale: Locale): Map<String, Any?> {
    val code = t.isLanguageAvailable(locale)
    val voices = try { t.voices ?: emptySet() } catch (_: Exception) { emptySet() }
    val matching = voices.filter { it.locale.language == locale.language && (locale.country.isEmpty() || it.locale.country == locale.country) }
    val offline = matching.filter { !it.isNetworkConnectionRequired && !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) }
    return mapOf(
      "availabilityCode" to code, // 0 lang, 1 country, 2 country+variant available; -1 missing data; -2 not supported
      "voiceCount" to matching.size,
      "offlineInstalledVoices" to offline.map { it.name },
      "offlineInstalled" to offline.isNotEmpty(),
    )
  }

  private fun initTts(context: Context, engine: String?): TextToSpeech? {
    val latch = CountDownLatch(1)
    var ok = false
    val t = if (engine == null) TextToSpeech(context) { ok = it == TextToSpeech.SUCCESS; latch.countDown() }
    else TextToSpeech(context, { ok = it == TextToSpeech.SUCCESS; latch.countDown() }, engine)
    if (!latch.await(6, TimeUnit.SECONDS) || !ok) {
      t.shutdown()
      return null
    }
    return t
  }
}
