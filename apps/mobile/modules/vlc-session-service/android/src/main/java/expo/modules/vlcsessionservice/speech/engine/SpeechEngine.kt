package expo.modules.vlcsessionservice.speech.engine

import android.media.AudioDeviceInfo
import java.util.Locale

data class SpeakRequest(
  val id: String,
  val text: String,
  val locale: Locale,
  /** Engine specific voice id (platform voice name, ML Kit voice name, sherpa speaker id as text), or null = default. */
  val voice: String?,
  /** SystemClock.elapsedRealtime() when the user/session asked for speech. */
  val requestedRt: Long,
  /** Engine specific options, e.g. Supertonic `steps` (Int). */
  val options: Map<String, Any?> = emptyMap(),
)

interface SpeakCallback {
  /**
   * First audible audio handed to the output (TextToSpeech onStart, or first PCM written to our AudioTrack).
   * @param routed device our own AudioTrack is routed to, when the engine owns the track.
   */
  fun onFirstAudio(rt: Long, routed: AudioDeviceInfo? = null, info: Map<String, Any?> = emptyMap())

  /** outcome: "done", "stopped", or "error:<reason>". Called exactly once per request. */
  fun onFinished(outcome: String, info: Map<String, Any?> = emptyMap())
}

/**
 * One speech synthesiser behind a common surface so the session's cue TTS can switch engines later
 * (engine chosen per locale). Implementations must be safe to call from any thread; [prepare] blocks.
 */
interface SpeechEngine {
  val id: String
  val label: String
  /** True when synthesis and playback happen in our process (we own the AudioTrack and can pick the device). */
  val runsInProcess: Boolean

  fun supports(locale: Locale): Boolean = true

  /** Loads / binds / checks the engine for [locale]. Blocking: call off the main thread. Returns a status map for the UI. */
  fun prepare(locale: Locale, progress: (Map<String, Any?>) -> Unit = {}): Map<String, Any?>

  /** Selectable voices for [locale]; call after [prepare]. Each map has at least `name` and `label`. */
  fun voices(locale: Locale): List<Map<String, Any?>>

  /** Starts speaking without blocking (replaces anything already playing on this engine). */
  fun speak(request: SpeakRequest, callback: SpeakCallback)

  fun stop()
  fun release()
}
