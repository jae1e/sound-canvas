package expo.modules.vlcsessionservice.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import expo.modules.vlcsessionservice.audio.AudioCapture
import expo.modules.vlcsessionservice.audio.AudioRouting
import expo.modules.vlcsessionservice.audio.PacingPlayer
import expo.modules.vlcsessionservice.location.LocationTracker
import expo.modules.vlcsessionservice.log.BatteryMonitor
import expo.modules.vlcsessionservice.log.DiagLog
import expo.modules.vlcsessionservice.speech.ModelCatalog
import expo.modules.vlcsessionservice.speech.ModelManager
import expo.modules.vlcsessionservice.speech.PacingCache
import expo.modules.vlcsessionservice.speech.SpeechPipeline
import expo.modules.vlcsessionservice.speech.TtsController

/**
 * The combined foreground service (types: location | microphone | mediaPlayback).
 * Owns capture, VAD/STT, TTS, cue timer, location, routing and battery sampling for one session.
 * Must be started while the app's activity is visible (Android 14+ while-in-use restriction).
 */
class SessionService : Service() {
  private lateinit var log: DiagLog
  private var bgThread: HandlerThread? = null
  private var bg: Handler? = null
  private var wakeLock: PowerManager.WakeLock? = null

  var routing: AudioRouting? = null
    private set
  private var capture: AudioCapture? = null
  private var sessionStt: SessionStt? = null
  private var screenReceiver: BroadcastReceiver? = null
  var tts: TtsController? = null
    private set
  var cues: CueScheduler? = null
    private set
  var pacingCache: PacingCache? = null
    private set
  var pacing: PacingPlayer? = null
    private set
  @Volatile private var ttsSpeaking = false
  @Volatile private var paceSpeaking = false
  private var location: LocationTracker? = null
  private var battery: BatteryMonitor? = null
  @Volatile private var bargeIn = false
  @Volatile private var stopping = false
  private var startedRt = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    log = DiagLog.get(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSession("notification_stop")
      return START_NOT_STICKY
    }
    if (SessionRuntime.service != null) return START_NOT_STICKY // already running
    startSession()
    return START_NOT_STICKY // a killed session is not auto-restarted: the mic cannot start from the background anyway
  }

  private fun startSession() {
    val cfg = SessionRuntime.config
    bargeIn = cfg.bargeIn
    stopping = false
    startedRt = SystemClock.elapsedRealtime()
    SessionRuntime.setState("starting")
    log.log("service_start", mapOf("config" to cfg.toString(), "sdk" to Build.VERSION.SDK_INT))

    val hasLocation = cfg.locationEnabled && has(Manifest.permission.ACCESS_FINE_LOCATION)
    val hasMic = has(Manifest.permission.RECORD_AUDIO)
    if (!hasMic) {
      fail("PERMISSION_RECORD_AUDIO", "RECORD_AUDIO not granted")
      return
    }
    try {
      createChannel()
      var types = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      if (hasLocation) types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
      if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, buildNotification(), types)
      else startForeground(NOTIFICATION_ID, buildNotification())
    } catch (e: Exception) {
      // ForegroundServiceStartNotAllowedException, SecurityException (type vs permission), ...
      fail("FOREGROUND_START_FAILED", e.toString())
      return
    }

    try {
      SessionRuntime.service = this
      bgThread = HandlerThread("vlc-service-bg").also { it.start() }
      bg = Handler(bgThread!!.looper)
      val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
      wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vlc:session").apply {
        setReferenceCounted(false)
        acquire(MAX_SESSION_MS)
      }

      val emit: (String, Map<String, Any?>) -> Unit = { e, p -> SessionRuntime.emit(e, p) }
      val r = AudioRouting(this, log, emit)
      routing = r
      r.register(bg!!)

      val t = TtsController(this, log, emit) { _, cueId, rt, source -> if (cueId != null) cues?.audible(cueId, rt, source) }
      tts = t
      t.setCommunicationUsage(r.inCommunicationMode())
      t.init(cfg.language)
      t.onActiveChanged = { speaking -> ttsSpeaking = speaking; updateSttHalfDuplex() }

      cues = CueScheduler(this, log, emit) { text, cueId -> speak(text, "cue", cueId, "native_fallback") }
      val pc = PacingCache(this, log, t)
      pacingCache = pc
      pacing = PacingPlayer(
        this, log, emit, pc,
        speakLive = { text -> speak(text, "normal", null, "pace_fallback") },
        onSpeaking = { speaking -> paceSpeaking = speaking; updateSttHalfDuplex() },
      )

      val models = ModelManager(this)
      if (cfg.sttEngine == "platform") {
        // Exactly one recorder: the system recognizer records for us, so AudioCapture stays closed unless we fall back.
        val s = SessionStt(
          this, log, emit, cfg.language,
          canFallback = { cfg.sttAutoFallback && sherpaReady(models, cfg) },
          startFallback = { reason -> startSherpaCapture(reason) },
        )
        sessionStt = s
        registerScreenReceiver()
        emit("pipelineState", mapOf("sttEnabled" to true, "loadMs" to 0, "engine" to "platform"))
        s.start()
        if (bargeIn) log.log("barge_in_ignored", mapOf("reason" to "platform STT is half-duplex"))
      } else {
        startSherpaCapture("configured")
      }

      if (hasLocation) {
        location = LocationTracker(this, log, emit).also { it.start() }
      } else {
        log.log("location_disabled", mapOf("permission" to has(Manifest.permission.ACCESS_FINE_LOCATION), "requested" to cfg.locationEnabled))
      }

      battery = BatteryMonitor(this, bg!!, log).also { it.start() }
      log.log("service_running", mapOf("route" to r.state(), "location" to hasLocation))
      SessionRuntime.setState("running")
    } catch (e: Throwable) {
      log.log("error", mapOf("where" to "service_start", "message" to e.toString()))
      fail("SERVICE_START_FAILED", e.toString())
    }
  }

  private fun sherpaReady(models: ModelManager, cfg: SessionConfig): Boolean {
    val set = ModelCatalog.find(if (cfg.language.startsWith("en")) "en" else "ko") ?: return false
    return models.isReady(ModelCatalog.vad) && models.isReady(set)
  }

  /** Starts the old sherpa pipeline on our own AudioRecord. Main thread when called as a fallback. */
  private fun startSherpaCapture(reason: String) {
    val r = routing ?: return
    if (capture != null) return
    val cfg = SessionRuntime.config
    val models = ModelManager(this)
    log.log("stt_engine_sherpa_start", mapOf("reason" to reason))
    val c = AudioCapture(log, r, { e, p -> SessionRuntime.emit(e, p) }, { buildPipeline(models, cfg) })
    capture = c
    c.start()
  }

  private fun registerScreenReceiver() {
    val rx = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
          Intent.ACTION_SCREEN_OFF -> sessionStt?.onScreen(false)
          Intent.ACTION_SCREEN_ON -> sessionStt?.onScreen(true)
        }
      }
    }
    screenReceiver = rx
    val filter = IntentFilter().apply { addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON) }
    ContextCompat.registerReceiver(this, rx, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
  }

  private fun buildPipeline(models: ModelManager, cfg: SessionConfig): SpeechPipeline? {
    val vad = models.fileFor("vad", "silero_vad.onnx")
    val setId = if (cfg.language.startsWith("en")) "en" else "ko"
    val set = ModelCatalog.find(setId)!!
    if (!models.isReady(ModelCatalog.vad) || !models.isReady(set)) {
      val msg = "Models missing (vad ready=${models.isReady(ModelCatalog.vad)}, $setId ready=${models.isReady(set)}); STT disabled"
      log.log("error", mapOf("where" to "models_missing", "message" to msg))
      SessionRuntime.emit("sessionError", mapOf("code" to "MODELS_MISSING", "message" to msg))
      if (!cfg.allowMissingModels) SessionRuntime.emit("sessionError", mapOf("code" to "MODELS_REQUIRED", "message" to msg))
      return null
    }
    val f = { n: String -> models.fileFor(setId, n) }
    return SpeechPipeline(
      SpeechPipeline.Files(vad, f("encoder.int8.onnx"), f("decoder.int8.onnx"), f("joiner.int8.onnx"), f("tokens.txt")),
      bargeIn = { bargeIn },
      ttsActive = { grace -> tts?.isActive(grace) == true },
      stopTts = { tts?.stop("barge_in") },
      log = log,
      emit = { e, p -> SessionRuntime.emit(e, p) },
      lang = setId,
    )
  }

  /** Pauses or resumes the platform STT for an external recorder. Sherpa capture (fallback) is not affected. */
  fun holdStt(hold: Boolean) {
    sessionStt?.holdForExternalRecorder(hold)
  }

  /** Half-duplex hook: STT stays paused while either live TTS or a pacing clip is audible. */
  private fun updateSttHalfDuplex() {
    sessionStt?.onTtsActive(ttsSpeaking || paceSpeaking)
  }

  fun setBargeIn(enabled: Boolean) {
    bargeIn = enabled
    log.log("barge_in_setting", mapOf("enabled" to enabled))
  }

  /** Never throws; returns the utterance id, or null when skipped. */
  fun speak(text: String, priority: String, cueId: String?, source: String): String? {
    val t = tts ?: return null
    if (cueId != null && source != "native_fallback" && cues?.fallbackTookOver(cueId) == true) {
      log.log("cue_js_speak_skipped", mapOf("id" to cueId, "reason" to "native fallback already speaking"))
      return null
    }
    t.setCommunicationUsage(routing?.inCommunicationMode() == true)
    return t.speak(text, priority, cueId, source)
  }

  private fun fail(code: String, message: String) {
    log.log("error", mapOf("where" to "service_fail", "code" to code, "message" to message))
    SessionRuntime.emit("sessionError", mapOf("code" to code, "message" to message))
    SessionRuntime.setState("error", "$code: $message")
    teardown("failed")
    stopSelf()
  }

  fun stopSession(reason: String) {
    teardown(reason)
    SessionRuntime.setState("stopped", reason)
    stopSelf()
  }

  /** Idempotent release of every resource. */
  private fun teardown(reason: String) {
    if (stopping) return
    stopping = true
    log.log("service_stop", mapOf("reason" to reason, "uptimeMs" to SystemClock.elapsedRealtime() - startedRt))
    safe("battery") { battery?.stop(); battery = null }
    safe("location") { location?.stop(); location = null }
    safe("screen_receiver") { screenReceiver?.let { unregisterReceiver(it) }; screenReceiver = null }
    safe("stt_session") { sessionStt?.release(); sessionStt = null }
    safe("capture") { capture?.stop(); capture = null }
    safe("cues") { cues?.shutdown(); cues = null }
    safe("pacing") { pacing?.shutdown(); pacing = null; pacingCache = null }
    safe("tts") { tts?.shutdown(); tts = null }
    safe("routing") { routing?.unregister(); routing?.clear(); routing = null }
    safe("wakelock") { wakeLock?.takeIf { it.isHeld }?.release(); wakeLock = null }
    safe("bg") { bgThread?.quitSafely(); bgThread = null; bg = null }
    safe("foreground") { stopForeground(STOP_FOREGROUND_REMOVE) }
    SessionRuntime.service = null
    log.flush()
  }

  private inline fun safe(what: String, block: () -> Unit) {
    try { block() } catch (e: Throwable) { log.log("error", mapOf("where" to "teardown_$what", "message" to e.toString())) }
  }

  override fun onDestroy() {
    if (!stopping) {
      teardown("destroyed")
      SessionRuntime.setState("stopped", "destroyed")
    }
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the app away from recents: keep running (the session is meant to survive); just note it.
    log.log("task_removed")
    super.onTaskRemoved(rootIntent)
  }

  private fun has(permission: String) = ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

  private fun createChannel() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) == null) {
      nm.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Session", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Shown while a voice session is running"
        setShowBadge(false)
      })
    }
  }

  private fun buildNotification(): Notification {
    val stop = PendingIntent.getService(
      this, 1, Intent(this, SessionService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentTitle("Voice session running")
      .setContentText(when (SessionRuntime.config.mode) {
        "travel" -> "Travel Guide: listening and location are active"
        "coach" -> "Voice Coach: listening is active"
        else -> "Listening, location and cues are active"
      })
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(open)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stop)
      .build()
  }

  companion object {
    const val ACTION_STOP = "expo.modules.vlcsessionservice.STOP"
    private const val CHANNEL_ID = "vlc_session"
    private const val NOTIFICATION_ID = 4711
    private const val MAX_SESSION_MS = 4L * 60 * 60 * 1000
  }
}
