package expo.modules.flnative

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.flnative.core.Hex
import expo.modules.flnative.core.InputPref
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody

/** JS-facing surface (see src/FlNative.types.ts). Real work lives in [Engine] and [RecordingSession]. */
class FlNativeModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)
  private val io = Executors.newCachedThreadPool()

  override fun definition() = ModuleDefinition {
    Name("FlNative")
    Events("onLevel", "onJournal", "onLive", "onWave", "onCapture", "onPlayback", "onInputs", "onDownload")

    OnCreate {
      appContext.reactContext?.let { Engine.init(it); Inputs.register(it); AutoStop.register(it) }
      Engine.sink = { event, payload -> sendEvent(event, payload) }
    }
    OnDestroy {
      try { Inputs.unregister() } catch (_: Exception) {}
      if (Engine.player.state != "idle") Engine.player.stop()
      Engine.sink = null // a running recording keeps going in the service; events resume when the module is recreated
    }

    AsyncFunction("getCapabilities") { Devices.capabilities(context) }

    Function("clock") { ClockReading.now(context).toMap() }

    AsyncFunction("startRecording") { options: Map<String, Any?>, promise: Promise ->
      val ctx = context
      Engine.init(ctx)
      io.execute {
        try {
          promise.resolve(Json.toPlain(Json.toJson(Engine.start(ctx, parseOptions(options)))))
        } catch (e: CodedException) {
          promise.reject(e)
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_AUDIO_START", e.message ?: e.toString(), e))
        }
      }
    }

    AsyncFunction("stopRecording") { location: Map<String, Any?>?, promise: Promise ->
      io.execute {
        try {
          Engine.stop("user", location)
          promise.resolve(null)
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_STOP", e.message ?: e.toString(), e))
        }
      }
    }

    AsyncFunction("pauseRecording") { promise: Promise ->
      io.execute { run(promise, "ERR_PAUSE") { Engine.pause(); null } }
    }

    AsyncFunction("resumeRecording") { promise: Promise ->
      io.execute { run(promise, "ERR_RESUME") { Engine.resume(); null } }
    }

    AsyncFunction("getWaveform") { pathOrUri: String, buckets: Int, promise: Promise ->
      io.execute { run(promise, "ERR_WAVEFORM") { Segments.waveform(resolveFile(pathOrUri), buckets).toList() } }
    }

    AsyncFunction("playFiles") { paths: List<String>, startMs: Double?, promise: Promise ->
      val ctx = context
      Engine.init(ctx)
      io.execute {
        if (Engine.session != null) {
          promise.reject(CodedException("ERR_BUSY_RECORDING", "Cannot play while a recording is open", null))
        } else {
          run(promise, "ERR_PLAYBACK") { Engine.player.play(paths.map { resolveFile(it) }, (startMs ?: 0.0).toLong()); null }
        }
      }
    }

    AsyncFunction("pausePlayback") { promise: Promise -> io.execute { run(promise, "ERR_PLAYBACK") { Engine.player.pause(); null } } }
    AsyncFunction("resumePlayback") { promise: Promise -> io.execute { run(promise, "ERR_PLAYBACK") { Engine.player.resume(); null } } }
    AsyncFunction("stopPlayback") { promise: Promise -> io.execute { run(promise, "ERR_PLAYBACK") { Engine.player.stop(); null } } }
    AsyncFunction("seekPlayback") { positionMs: Double, promise: Promise ->
      io.execute { run(promise, "ERR_PLAYBACK") { Engine.player.seek(positionMs.toLong()); null } }
    }

    AsyncFunction("setInputPreference") { preference: Map<String, Any?>, promise: Promise ->
      val ctx = context
      Engine.init(ctx)
      Inputs.init(ctx)
      io.execute { run(promise, "ERR_INPUT") { Inputs.setPreference(InputPref.fromMap(preference)) } }
    }

    AsyncFunction("getInputs") { promise: Promise ->
      val ctx = context
      Inputs.init(ctx)
      io.execute { run(promise, "ERR_INPUT") { Inputs.event() } }
    }

    AsyncFunction("setAutoStop") { options: Map<String, Any?> ->
      val (leave, keepOff) = AutoStop.get(context)
      AutoStop.set(context, options["onLeaveApp"] as? Boolean ?: leave, options["keepWhenScreenOff"] as? Boolean ?: keepOff)
    }

    AsyncFunction("getAppInfo") { Updates.appInfo(context) }

    AsyncFunction("downloadFile") { id: String, url: String, headers: Map<String, String>, fileName: String, sha256: String, promise: Promise ->
      val ctx = context
      Engine.init(ctx)
      io.execute { run(promise, "ERR_DOWNLOAD") { Updates.download(ctx, id, url, headers, fileName, sha256) } }
    }

    AsyncFunction("cancelDownload") { id: String -> Updates.cancel(id) }

    AsyncFunction("canInstallPackages") { Updates.canInstall(context) }

    AsyncFunction("openInstallPermissionSettings") { Updates.openInstallSettings(context) }

    AsyncFunction("installApk") { path: String -> Updates.install(context, path) }

    AsyncFunction("cleanupUpdates") { all: Boolean?, promise: Promise ->
      val ctx = context
      io.execute { run(promise, "ERR_CLEANUP") { Updates.cleanup(ctx, all == true) } }
    }

    AsyncFunction("getStatus") { Engine.status() }

    AsyncFunction("readJournal") { after: Double, promise: Promise ->
      io.execute {
        try {
          Engine.init(context)
          promise.resolve(Engine.journal.readAfter(after.toLong()).map { Json.toPlainMap(it) })
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_JOURNAL", e.message ?: e.toString(), e))
        }
      }
    }

    AsyncFunction("recoverInterrupted") { promise: Promise ->
      val ctx = context
      Engine.init(ctx)
      io.execute {
        try {
          promise.resolve(Engine.recoverInterrupted(ctx))
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_RECOVER", e.message ?: e.toString(), e))
        }
      }
    }

    AsyncFunction("sha256File") { pathOrUri: String, promise: Promise ->
      io.execute {
        try {
          promise.resolve(Hex.sha256(resolveFile(pathOrUri)))
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_HASH", e.message ?: e.toString(), e))
        }
      }
    }

    AsyncFunction("uploadFile") { url: String, pathOrUri: String, contentType: String, headers: Map<String, String>, promise: Promise ->
      io.execute {
        try {
          val file = resolveFile(pathOrUri)
          val body = file.asRequestBody(contentType.toMediaTypeOrNull())
          val builder = Request.Builder().url(url).put(body)
          for ((k, v) in headers) builder.header(k, v)
          val client = Engine.http.newBuilder()
            .connectTimeout(60, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS).callTimeout(0, TimeUnit.SECONDS).build()
          client.newCall(builder.build()).execute().use { r ->
            promise.resolve(mapOf("status" to r.code, "body" to (r.body?.string() ?: "")))
          }
        } catch (e: Throwable) {
          promise.reject(CodedException("ERR_UPLOAD", e.message ?: e.toString(), e))
        }
      }
    }
  }

  private fun run(promise: Promise, code: String, block: () -> Any?) {
    try {
      promise.resolve(block())
    } catch (e: CodedException) {
      promise.reject(e)
    } catch (e: Throwable) {
      promise.reject(CodedException(code, e.message ?: e.toString(), e))
    }
  }

  @Suppress("UNCHECKED_CAST")
  private fun parseOptions(o: Map<String, Any?>) = StartOptions(
    memoId = o["memoId"] as String,
    recordingId = o["recordingId"] as String,
    input = (o["input"] as? Map<String, Any?>)?.let { InputPref.fromMap(it) },
    source = o["source"] as? String,
    location = o["location"] as? Map<String, Any?>,
    live = o["live"] as? Map<String, Any?>,
  )

  private fun resolveFile(pathOrUri: String): File =
    if (pathOrUri.startsWith("file://")) File(Uri.parse(pathOrUri).path ?: pathOrUri.removePrefix("file://")) else File(pathOrUri)
}
