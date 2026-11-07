package expo.modules.vcupdate

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

class VcUpdateModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context unavailable", null)
  private val io = Executors.newCachedThreadPool()

  override fun definition() = ModuleDefinition {
    Name("VcUpdate")
    Events("onDownload")
    OnCreate { Updates.sink = { event, payload -> sendEvent(event, payload) } }
    OnDestroy { Updates.sink = null }
    AsyncFunction("getAppInfo") { Updates.appInfo(context) }
    AsyncFunction("downloadFile") { id: String, url: String, headers: Map<String, String>, fileName: String, sha256: String, promise: Promise ->
      val ctx = context
      io.execute { run(promise, "ERR_DOWNLOAD") { Updates.download(ctx, id, url, headers, fileName, sha256) } }
    }
    AsyncFunction("cancelDownload") { id: String -> Updates.cancel(id) }
    AsyncFunction("canInstallPackages") { Updates.canInstall(context) }
    AsyncFunction("openInstallPermissionSettings") { Updates.openInstallSettings(context) }
    // Start the installer from the visible activity: starts from the application context are blocked in the background (VC-11).
    AsyncFunction("installApk") { path: String -> Updates.install(appContext.currentActivity ?: context, path) }
    AsyncFunction("cleanupUpdates") { all: Boolean?, promise: Promise ->
      val ctx = context
      io.execute { run(promise, "ERR_CLEANUP") { Updates.cleanup(ctx, all == true) } }
    }
  }

  private fun run(promise: Promise, code: String, block: () -> Any?) {
    try { promise.resolve(block()) }
    catch (e: CodedException) { promise.reject(e) }
    catch (e: Throwable) { promise.reject(CodedException(code, e.message ?: e.toString(), e)) }
  }
}
