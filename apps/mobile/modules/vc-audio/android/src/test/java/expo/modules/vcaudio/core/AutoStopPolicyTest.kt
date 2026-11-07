package expo.modules.vcaudio.core

import org.junit.Assert.assertEquals
import org.junit.Test

class AutoStopPolicyTest {
  private fun d(leave: Boolean, keep: Boolean, interactive: Boolean, locked: Boolean, active: Boolean = true) =
    AutoStopPolicy.shouldStop(leave, keep, interactive, locked, active)

  @Test fun noSessionNeverStops() {
    assertEquals(false, d(true, true, true, false, active = false))
    assertEquals(false, d(true, false, true, false, active = false))
  }

  @Test fun disabledNeverStops() {
    for (keep in listOf(true, false)) for (i in listOf(true, false)) for (l in listOf(true, false)) assertEquals(false, d(false, keep, i, l))
  }

  @Test fun leavingWithScreenOnStops() {
    assertEquals(true, d(true, true, true, false))
    assertEquals(true, d(true, false, true, false))
  }

  @Test fun screenOffOrLockedKeptOnlyWhenRequested() {
    assertEquals(false, d(true, true, false, false)) // screen off
    assertEquals(false, d(true, true, true, true)) // keyguard locked
    assertEquals(true, d(true, false, false, false))
    assertEquals(true, d(true, false, true, true))
  }
}
