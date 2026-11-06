package expo.modules.flnative.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class InputResolverTest {
  private val mic = InputInfo(1, "builtin_mic", "Mic")
  private val sco = InputInfo(2, "bluetooth_sco", "QCY HT08", "aa")
  private val ble = InputInfo(3, "ble_headset", "QCY HT08", "aa")
  private val wired = InputInfo(4, "wired_headset", "Headset")
  private val usb = InputInfo(5, "usb", "USB mic")

  @Test fun autoPriority() {
    assertEquals(mic, InputResolver.resolve(InputPref.Auto, listOf(mic)))
    assertEquals(sco, InputResolver.resolve(InputPref.Auto, listOf(mic, sco)))
    assertEquals(ble, InputResolver.resolve(InputPref.Auto, listOf(mic, sco, ble)))
    assertEquals(wired, InputResolver.resolve(InputPref.Auto, listOf(mic, sco, ble, wired)))
    assertEquals(usb, InputResolver.resolve(InputPref.Auto, listOf(mic, ble, usb)))
    assertEquals(mic, InputResolver.resolve(InputPref.Auto, listOf(InputInfo(9, "other", "Telephony"), mic)))
    assertNull(InputResolver.resolve(InputPref.Auto, emptyList()))
  }

  @Test fun phoneAlwaysBuiltin() {
    assertEquals(mic, InputResolver.resolve(InputPref.Phone, listOf(wired, ble, mic)))
  }

  @Test fun deviceMatchAndFallback() {
    val pref = InputPref.Device("bluetooth_sco", "QCY HT08", "aa")
    assertEquals(sco, InputResolver.resolve(pref, listOf(mic, ble, sco)))
    assertEquals(mic, InputResolver.resolve(pref, listOf(mic, ble))) // absent: phone mic
    // Address hash only compared when both sides have one; ids are irrelevant.
    assertEquals(sco, InputResolver.resolve(InputPref.Device("bluetooth_sco", "QCY HT08"), listOf(mic, sco)))
    assertEquals(mic, InputResolver.resolve(InputPref.Device("bluetooth_sco", "QCY HT08", "bb"), listOf(mic, sco)))
    assertEquals(sco.copy(id = 77), InputResolver.resolve(pref, listOf(mic, sco.copy(id = 77))))
    assertEquals(sco.id, InputResolver.resolve(pref, listOf(mic, sco.copy(addressHash = null)))!!.id)
    assertEquals(mic, InputResolver.resolve(InputPref.Device("wired_headset", "Other"), listOf(mic, wired)))
  }

  @Test fun dedupe() {
    val list = listOf(mic, mic.copy(id = 10), sco, sco.copy(id = 11), ble, InputInfo(12, "bluetooth_sco", "Other", "cc"))
    assertEquals(listOf(mic, sco, ble, InputInfo(12, "bluetooth_sco", "Other", "cc")), InputResolver.dedupe(list))
  }

  @Test fun prefMapRoundTrip() {
    assertEquals(InputPref.Auto, InputPref.fromMap(null))
    assertEquals(InputPref.Auto, InputPref.fromMap(mapOf("mode" to "device")))
    assertEquals(InputPref.Phone, InputPref.fromMap(mapOf("mode" to "phone")))
    val d = InputPref.Device("ble_headset", "X", "ab")
    assertEquals(d, InputPref.fromMap(d.toMap()))
  }

  @Test fun lockedDeviceIsMatchedAcrossReconnectsAndNeverByNewDevices() {
    // The session locks the resolved input at start and later finds it again by type + name + address, not by id.
    val locked = InputResolver.resolve(InputPref.Auto, listOf(mic, sco))!!
    val lockedPref = InputPref.Device(locked.type, locked.productName, locked.addressHash)
    val reconnected = sco.copy(id = 99)
    assertEquals(reconnected, InputResolver.resolve(lockedPref, listOf(mic, reconnected)))
    // A wired headset plugged in later would win Auto, but the locked preference ignores it.
    assertEquals(sco, InputResolver.resolve(lockedPref, listOf(mic, sco, wired)))
    // Once the locked device is gone the resolver yields the built-in microphone.
    assertEquals(mic, InputResolver.resolve(lockedPref, listOf(mic, wired)))
  }
}
