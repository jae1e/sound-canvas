package expo.modules.vcaudio.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

/** Streaming FIR low-pass decimator from 48 kHz to 16 kHz. State survives arbitrary input chunks. */
class Resampler {
  private val taps = 63
  private val coeff = DoubleArray(taps) { i ->
    val x = i - (taps - 1) / 2.0
    val fc = 0.15
    val sinc = if (x == 0.0) 2 * fc else sin(2 * PI * fc * x) / (PI * x)
    sinc * (0.54 - 0.46 * cos(2 * PI * i / (taps - 1)))
  }.let { a -> val sum = a.sum(); DoubleArray(a.size) { a[it] / sum } }
  private val history = ShortArray(taps)
  private var cursor = 0
  private var phase = 0

  fun process(input: ShortArray, count: Int = input.size): ShortArray {
    require(count in 0..input.size)
    val out = ShortArray((count + 2) / 3)
    return out.copyOf(processInto(input, count, out))
  }

  fun processInto(input: ShortArray, count: Int, out: ShortArray): Int {
    require(count in 0..input.size && out.size >= (count + 2) / 3)
    var n = 0
    for (i in 0 until count) {
      history[cursor] = input[i]
      cursor = (cursor + 1) % taps
      if (phase == 0) {
        var value = 0.0
        for (j in 0 until taps) value += coeff[j] * history[(cursor + j) % taps]
        out[n++] = value.roundToInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
      }
      phase = (phase + 1) % 3
    }
    return n
  }
}
