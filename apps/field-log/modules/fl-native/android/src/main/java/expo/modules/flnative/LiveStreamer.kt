package expo.modules.flnative

import android.util.Log
import java.util.ArrayDeque
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import org.json.JSONObject

/**
 * Live draft transcript over a WebSocket (api-v0 section 5). Recording never depends on it: [feed] only appends to a
 * bounded queue (2 s, oldest dropped) and never blocks. Each (re)connection is a new stream with a fresh `start`
 * frame; the recording-sample offset of the first frame sent on a stream converts the server's stream-relative times
 * to recording-relative milliseconds.
 */
class LiveStreamer(
  private val http: OkHttpClient,
  private val url: String,
  private val token: String,
  private val language: String,
  private val memoId: String,
  private val recordingId: String,
  private val emit: (Map<String, Any?>) -> Unit,
) {
  private class Frame(val startSample: Long, val data: ByteArray)

  private inner class Stream {
    @Volatile var ws: WebSocket? = null
    @Volatile var ready = false
    @Volatile var closed = false
    /** Recording sample index of the first binary frame sent on this stream; -1 until one is sent. */
    @Volatile var baseSample = -1L
  }

  private val lock = Object()
  private val queue = ArrayDeque<Frame>()
  private var stream: Stream? = null
  private var attempt = 0
  private var nextAttemptAtMs = 0L
  @Volatile private var finishing = false
  @Volatile private var busy = false
  @Volatile var state: String = "off"; private set
  private val client = http.newBuilder().pingInterval(10, TimeUnit.SECONDS).readTimeout(0, TimeUnit.MILLISECONDS)
    .connectTimeout(5, TimeUnit.SECONDS).build()
  private var thread: Thread? = null

  fun start() {
    setState("connecting")
    thread = Thread({ loop() }, "fl-live").also { it.isDaemon = true; it.start() }
  }

  /** Called from the capture thread with 100 ms of PCM16 LE; never blocks. */
  fun feed(data: ByteArray, startSample: Long) {
    if (finishing || busy) return
    synchronized(lock) {
      queue.addLast(Frame(startSample, data))
      while (queue.size > MAX_QUEUED_FRAMES) queue.removeFirst()
      lock.notifyAll()
    }
  }

  /** Flushes queued audio, sends `end`, closes shortly after, and reports state `off`. Returns immediately. */
  fun finish() {
    finishing = true
    synchronized(lock) { lock.notifyAll() }
  }

  private fun setState(s: String) {
    if (state == s) return
    state = s
    emit(mapOf("type" to "state", "state" to s))
  }

  private fun loop() {
    try {
      while (!busy) {
        var frame: Frame? = null
        var cur: Stream? = null
        var exit = false
        var doConnect = false
        synchronized(lock) {
          cur = stream
          val c = cur
          val ready = c != null && c.ready && !c.closed
          if (finishing && (!ready || queue.isEmpty())) {
            exit = true
          } else if (ready && queue.isNotEmpty()) {
            frame = queue.pollFirst()
          } else if (c == null) {
            val wait = nextAttemptAtMs - System.currentTimeMillis()
            if (wait <= 0) doConnect = true else lock.wait(minOf(wait, 200L))
          } else {
            lock.wait(200)
          }
        }
        if (exit) break
        if (doConnect) { connect(); continue }
        val f = frame ?: continue
        val st = cur ?: continue
        val ws = st.ws ?: continue
        if (st.baseSample < 0) st.baseSample = f.startSample
        if (ws.queueSize() > MAX_SOCKET_QUEUE_BYTES) continue // socket backed up: drop, never block recording
        ws.send(f.data.toByteString())
      }
    } catch (_: InterruptedException) {
    } catch (e: Exception) {
      Log.w(TAG, "live loop failed", e)
    }
    shutdown()
  }

  private fun shutdown() {
    val st = stream
    if (st != null && st.ready && !st.closed && !busy) {
      st.ws?.send("""{"type":"end"}""")
      // Give the server a moment to deliver the last final before closing.
      synchronized(lock) { try { lock.wait(GRACE_MS) } catch (_: InterruptedException) {} }
    }
    st?.closed = true
    try { st?.ws?.close(1000, "done") } catch (_: Exception) {}
    stream = null
    if (state != "busy") setState("off")
  }

  private fun connect() {
    val s = Stream()
    stream = s
    if (state != "connecting") setState("connecting")
    try {
      val request = Request.Builder().url(url).header("Authorization", "Bearer $token").build()
      s.ws = client.newWebSocket(request, listener(s))
    } catch (e: Exception) { // malformed URL and the like
      Log.w(TAG, "connect failed", e)
      lost(s)
    }
  }

  private fun lost(s: Stream) {
    synchronized(lock) {
      if (s.closed) return
      s.closed = true
      if (stream === s) stream = null
      if (busy || finishing) return
      val delay = BACKOFF_S[minOf(attempt, BACKOFF_S.size - 1)]
      attempt++
      nextAttemptAtMs = System.currentTimeMillis() + delay * 1000L
      lock.notifyAll()
    }
    setState("paused")
  }

  private fun listener(s: Stream) = object : WebSocketListener() {
    override fun onOpen(webSocket: WebSocket, response: Response) {
      val start = JSONObject().put("type", "start").put("memo_id", memoId).put("recording_id", recordingId)
        .put("language", language)
      webSocket.send(start.toString())
    }

    override fun onMessage(webSocket: WebSocket, text: String) {
      if (s.closed) return
      try {
        val m = JSONObject(text)
        when (m.optString("type")) {
          "ready" -> {
            attempt = 0
            s.ready = true
            setState("live")
            synchronized(lock) { lock.notifyAll() }
          }
          "partial" -> emit(mapOf("type" to "partial", "text" to m.optString("text"), "utterance" to m.optInt("utterance")))
          "final" -> {
            if (s.baseSample < 0) return
            val offsetMs = s.baseSample * 1000L / 16000L
            emit(mapOf(
              "type" to "final", "text" to m.optString("text"), "utterance" to m.optInt("utterance"),
              "startMs" to offsetMs + m.optLong("start_ms"), "endMs" to offsetMs + m.optLong("end_ms"),
            ))
          }
          "busy" -> {
            busy = true
            setState("busy")
            s.closed = true
            webSocket.close(1000, "busy")
            synchronized(lock) { queue.clear(); lock.notifyAll() }
          }
          "error" -> Log.w(TAG, "server error: ${m.optString("message")}")
        }
      } catch (e: Exception) {
        Log.w(TAG, "bad live message", e)
      }
    }

    override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
      webSocket.close(code, reason)
    }

    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) { lost(s) }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
      Log.w(TAG, "live socket failure: $t")
      lost(s)
    }
  }

  companion object {
    private const val TAG = "FlLive"
    const val MAX_QUEUED_FRAMES = 20 // 2 s of 100 ms frames
    private const val MAX_SOCKET_QUEUE_BYTES = 64 * 1024L
    private const val GRACE_MS = 1500L
    private val BACKOFF_S = intArrayOf(1, 2, 4, 8, 15)
  }
}
