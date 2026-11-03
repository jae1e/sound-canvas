package expo.modules.vlcsessionservice.speech.stt

import kotlin.math.abs

/** Script based language helpers and the layered auto-detection policy. */
object SttLang {
  const val BY_PLATFORM = "platform_detection"
  const val BY_DUAL = "dual_decode"
  const val BY_SCRIPT = "script"
  const val BY_REQUESTED = "requested"
  const val BY_RETRY_PRIOR = "prior_retry"

  fun localeOf(lang: String) = if (lang == "en") "en-US" else "ko-KR"

  fun langOfLocale(tag: String?): String? = when {
    tag == null -> null
    tag.startsWith("ko", ignoreCase = true) -> "ko"
    tag.startsWith("en", ignoreCase = true) -> "en"
    else -> null
  }

  private fun isHangul(c: Char) = c in '가'..'힣' || c in 'ᄀ'..'ᇿ' || c in '㄰'..'㆏'

  /** Share of Hangul among letters (0..1); 0 when there are no letters. */
  fun hangulRatio(text: String): Double {
    var hangul = 0
    var letters = 0
    for (c in text) {
      if (isHangul(c)) { hangul++; letters++ } else if (c.isLetter()) letters++
    }
    return if (letters == 0) 0.0 else hangul.toDouble() / letters
  }

  /** Script of a recognized text: "ko" when mostly Hangul, "en" when mostly Latin letters, null if it has no letters. */
  fun scriptLang(text: String): String? {
    if (text.none { it.isLetter() }) return null
    return if (hangulRatio(text) >= 0.3) "ko" else "en"
  }

  /** One decoding hypothesis of the dual-decoding sherpa engine. [meanLogProb] is the mean token log probability. */
  data class Hypothesis(val lang: String, val text: String, val meanLogProb: Double?, val tokens: Int) {
    fun toMap() = mapOf(
      "lang" to lang, "text" to text, "meanLogProb" to meanLogProb, "tokens" to tokens,
      "hangulRatio" to hangulRatio(text), "chars" to text.length,
    )
  }

  data class Decision(val lang: String?, val rule: String)

  /**
   * Layer 2: choose between the ko and en hypotheses of the same audio.
   *
   * Hangul ratio alone cannot decide: each model only emits its own script (the Korean model turns English speech into
   * Hangul gibberish, verified offline), so both hypotheses look "pure" in their own script. The mean token log
   * probability separates them well (correct language about -0.3..-0.6, wrong language -0.9..-1.4 in the offline test), so
   * it is the primary signal; script/length is the tie-break and the rule used when probabilities are unavailable.
   */
  fun decideDual(ko: Hypothesis, en: Hypothesis): Decision {
    val koEmpty = ko.text.isBlank()
    val enEmpty = en.text.isBlank()
    if (koEmpty && enEmpty) return Decision(null, "both_empty")
    if (koEmpty) return Decision("en", "ko_empty")
    if (enEmpty) return Decision("ko", "en_empty")
    val a = ko.meanLogProb
    val b = en.meanLogProb
    if (a != null && b != null && abs(a - b) >= MIN_LOGPROB_MARGIN) {
      return Decision(if (a > b) "ko" else "en", "logprob_margin")
    }
    // Tie-break: the hypothesis with more recognized characters (a wrong-language decode of speech tends to be short
    // or broken), the Korean one when equal because the user's primary language is Korean.
    return if (en.text.length > ko.text.length * 1.5) Decision("en", "length") else Decision("ko", "length")
  }

  const val MIN_LOGPROB_MARGIN = 0.15
}

/**
 * Layer 3 (platform finals): keeps the last detected language as a prior and flips the locale of the next utterance when
 * the previous one was empty or low confidence in the selected language. Not thread-safe; the lab synchronizes.
 */
class LangPolicy(initial: String = "ko") {
  var prior: String = initial
    private set
  private var flipNext = false

  /** Language to try for the next utterance. */
  fun next(): String = if (flipNext) other(prior) else prior

  /** Reason string for logs (why [next] returned what it did). */
  fun nextReason(): String = if (flipNext) SttLang.BY_RETRY_PRIOR else "last_detected_prior"

  /**
   * @param tried language the utterance was recognized with
   * @param empty no text
   * @param confidence recognizer confidence or null
   * @param scriptLang language implied by the text itself
   */
  fun update(tried: String, empty: Boolean, confidence: Float?, scriptLang: String?) {
    if (empty || (confidence != null && confidence in 0f..LOW_CONFIDENCE)) {
      // The attempt in [tried] failed: next time use the other language, but remember what worked last.
      prior = tried
      flipNext = true
      return
    }
    flipNext = false
    prior = scriptLang ?: tried
  }

  private fun other(l: String) = if (l == "ko") "en" else "ko"

  companion object {
    const val LOW_CONFIDENCE = 0.35f
  }
}
