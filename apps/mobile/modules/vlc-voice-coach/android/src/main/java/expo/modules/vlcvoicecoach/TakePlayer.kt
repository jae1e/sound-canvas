package expo.modules.vlcvoicecoach

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import java.io.File

/**
 * Plays a take through the system route (media attributes). Never forces the speaker, never sets a preferred device
 * or the communication mode, and only plays when JS asks for it (the user pressed play).
 */
class TakePlayer(private val context: Context, private val onState: (id: String, state: String) -> Unit) {
  private var player: MediaPlayer? = null
  private var currentId: String? = null
  private var focus: AudioFocusRequest? = null
  private val audioManager get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val attrs = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA)
    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
    .build()

  @Synchronized
  fun play(id: String, file: File) {
    stopInternal("stopped")
    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attrs).setOnAudioFocusChangeListener { change ->
      if (change == AudioManager.AUDIOFOCUS_LOSS) stop()
    }.build()
    audioManager.requestAudioFocus(req)
    focus = req
    val mp = MediaPlayer()
    try {
      mp.setAudioAttributes(attrs)
      mp.setDataSource(file.absolutePath)
      mp.setOnCompletionListener { synchronized(this) { if (player === mp) stopInternal("completed") } }
      mp.setOnErrorListener { _, _, _ -> synchronized(this) { if (player === mp) stopInternal("error") }; true }
      mp.prepare()
      player = mp
      currentId = id
      mp.start()
      onState(id, "playing")
    } catch (e: Exception) {
      mp.release()
      releaseFocus()
      throw e
    }
  }

  @Synchronized fun stop() = stopInternal("stopped")

  private fun stopInternal(state: String) {
    val mp = player ?: return
    val id = currentId ?: ""
    player = null
    currentId = null
    try { mp.stop() } catch (_: Exception) { }
    mp.release()
    releaseFocus()
    onState(id, state)
  }

  private fun releaseFocus() {
    focus?.let { audioManager.abandonAudioFocusRequest(it) }
    focus = null
  }

  val isPlaying get() = player != null
}
