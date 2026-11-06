package expo.modules.flnative.core

/** What to do when the app stops being visible while a recording session exists. */
object AutoStopPolicy {
  /**
   * Returns true when the recording must be stopped (reason `left_app`).
   * A screen that is off or locked at ON_STOP counts as "not left" when [keepWhenScreenOff] is set.
   */
  fun shouldStop(
    onLeaveApp: Boolean,
    keepWhenScreenOff: Boolean,
    interactive: Boolean,
    locked: Boolean,
    sessionActive: Boolean,
  ): Boolean {
    if (!sessionActive || !onLeaveApp) return false
    if (keepWhenScreenOff && (!interactive || locked)) return false
    return true
  }
}
