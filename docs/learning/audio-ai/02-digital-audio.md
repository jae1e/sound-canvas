# 02. Digital audio

## 1. Sampling and aliasing

**Sampling.** An analog-to-digital converter (ADC) measures the continuous pressure signal at fixed intervals, **f_s** times per second. At 48 kHz that is 48,000 measurements per second. It is the same thing a data-acquisition system (DAQ) does with an accelerometer.

**Nyquist frequency.** To recognise a sine wave you need at least **two samples per cycle**, roughly one near the peak and one near the trough.
- So the highest frequency a sampled signal can represent is **f_s/2**, the Nyquist frequency: 24 kHz at f_s = 48 kHz.
- Human hearing stops around 20 kHz, which is why 44.1 kHz and 48 kHz are enough.

**Aliasing: a fast signal disguised as a slow one.** Sample a tone faster than f_s/2 and its samples are *identical* to those of a slower tone.

Example: f_s = 10 Hz (one sample every 0.1 s) and a 9 Hz tone. Between samples the tone advances 0.9 of a cycle, which lands in the same place as going back 0.1 of a cycle. So the samples look like a **1 Hz tone running backwards**:

| Sample n | 9 Hz: sin(2π·0.9n) | Inverted 1 Hz: −sin(2π·0.1n) |
|---|---|---|
| 0 | 0 | 0 |
| 1 | −0.588 | −0.588 |
| 2 | −0.951 | −0.951 |
| 3 | −0.951 | −0.951 |

Algebraically, sin(2π·0.9n) = sin(2πn − 2π·0.1n) = −sin(2π·0.1n), because the 2πn term vanishes for integer n. From the numbers alone, **there is no way to tell whether the tone was 9 Hz or 1 Hz**.

- **General rule:** the apparent frequency is |f − k·f_s|, for the integer k that brings it below f_s/2.
- **Audio example:** at f_s = 48 kHz, a 30 kHz ultrasonic tone shows up at 48 − 30 = **18 kHz**. An inaudible sound becomes audible noise.
- **Why it is called "folding":** content above f_s/2 is mirrored back down around f_s/2, like folding the spectrum over at 24 kHz.

**The wagon-wheel effect** is the same thing in video.
- Film samples time at 24 frames per second, so a fast wheel can appear to turn slowly or backwards, and helicopter blades can look frozen.
- A **stroboscope**, used to measure machine RPM, exploits aliasing on purpose: when the flash rate matches the rotation, the part appears to stand still.

**Anti-aliasing filter.** Aliasing cannot be undone afterwards: once sampled, a real 1 Hz tone and an aliased 9 Hz tone are the same numbers.
- So an analog **low-pass filter** removes content above f_s/2 *before* the ADC samples. It is the same reason a vibration DAQ has an anti-alias filter setting.
- Modern audio ADCs oversample and do much of this filtering digitally, but the principle is the same.

See it yourself (9 Hz and inverted 1 Hz passing through the same sample points):

```python
import numpy as np, matplotlib.pyplot as plt
t = np.linspace(0, 1, 2000); n = np.arange(11) / 10      # f_s = 10 Hz
plt.plot(t, np.sin(2*np.pi*9*t), alpha=.4, label="9 Hz")
plt.plot(t, -np.sin(2*np.pi*1*t), label="-1 Hz")
plt.plot(n, np.sin(2*np.pi*9*n), "ko", label="samples")
plt.legend(); plt.show()
```

**Common rates:**

| Rate | Bandwidth | Typical use |
|---|---|---|
| 16 kHz | 8 kHz | Speech models, telephony-plus. Most ASR and diarisation models; our LibriSpeech clips |
| 44.1 kHz | 22 kHz | CD and most music |
| 48 kHz | 24 kHz | Video and broadcast. SAM Audio works at 48 kHz |

**Resampling.** Changing the rate is a filtering problem, not just dropping or repeating samples.
- Converting 48 kHz audio to 16 kHz for pyannote by keeping every third sample would fold everything above 8 kHz back into the band as noise.
- Libraries therefore low-pass filter below the new Nyquist frequency (8 kHz) first, then reduce the sample count. They use polyphase or windowed-sinc filters.

## 2. Quantisation, bit depth and dither

**Two separate axes.**
- The **sample rate** decides the highest frequency you can capture (section 1): the horizontal, time axis.
- The **bit depth** decides how finely each sample's *value* is measured, and so how quiet the noise floor is: the vertical, amplitude axis.

The two are independent.

**Quantisation.** Each sample's value is stored as an N-bit integer, so only 2^N levels exist, like a ruler with a fixed number of tick marks.
- A 16-bit file has 65,536 levels.
- The true value is rounded to the nearest level. The rounding error, at most half a step, is the **quantisation error**.
- It is the same resolution limit as a 12-bit or 16-bit DAQ card.

**Noise floor and SNR ≈ 6.02·N + 1.76 dB.** For normal signals the rounding error behaves like a faint, uniform random noise under the signal: the **noise floor**. The formula comes from three steps:
- a full-scale sine with amplitude A has power A²/2;
- the step is Δ = 2A / 2^N, and an error spread uniformly over ±Δ/2 has power Δ²/12;
- the ratio is (A²/2) / (Δ²/12) = 1.5 · 2^(2N), so SNR = 10·log₁₀(1.5) + 20·N·log₁₀(2) ≈ 1.76 + 6.02·N dB.

Each extra bit halves the step and buys 6 dB.

| Bit depth | Levels | SNR | Meaning |
|---|---|---|---|
| 16-bit | 65,536 | ≈ 98 dB | Covers the range from a quiet room to very loud listening; enough for delivery (CD) |
| 24-bit | ≈ 16.8 million | ≈ 146 dB | More than any microphone and preamp can deliver, because their own noise sits higher. The lowest bits just record the mic's hiss. Used in recording for **headroom**: you can record 20 dB below full scale, safe from clipping, and still have more resolution than you need |

**Dither.** For very quiet signals only a few steps tall, such as fade-outs and reverb tails, the rounding error stops looking random: it follows the signal.
- **Example:** a sine 1.5 steps tall is rounded into a staircase close to a square wave. That adds harmonics, heard as gritty **distortion**.
- **The fix:** add a tiny random noise of about one step *before* rounding. The error becomes uncorrelated with the signal: a steady, faint **hiss**, which ears tolerate much better than distortion. On average, detail smaller than one step even survives.
- **Familiar from images:** a 1-bit dithered picture shows grey tones as patterns of black and white dots. Measurement engineers also dither ADCs to resolve below one step by averaging.
- **In practice:** dither is applied once, when the final file is reduced to 16-bit.

**Float formats.** Production software and the numpy arrays in our lab use 32-bit floating point: in effect scientific notation, with a 24-bit mantissa and an exponent.
- Values can go above full scale (1.0) without harm, and tiny values keep their relative precision. So inside the software, headroom is effectively unlimited.
- **Clipping** happens only at export to a fixed-point (integer) format such as 16-bit or 24-bit WAV. Anything above 1.0 is flattened, and that cannot be undone (lecture 04).
- **For us:** summing stems, or boosting a track's gain in a remix, can push peaks above 1.0. Check the peaks or apply a limiter before writing an integer WAV, or write a float WAV.

**The "stair-step" myth.** Drawings of digital audio show stair-steps, which suggests the wave between samples is lost. Monty Montgomery's *Digital Show & Dither* shows on real test equipment that this is wrong:
- if the signal is band-limited (below Nyquist), the samples hold all of its information, and the converter reconstructs a smooth wave exactly;
- the bit depth only sets the noise floor. It does not make the wave "smoother".

## 3. Files and codecs

**Lossless:**
- WAV and AIFF hold raw PCM.
- FLAC is compressed and lossless, used by most datasets.

**Lossy:**
- MP3, AAC and Opus transform the signal (MDCT), use a psychoacoustic model to find what is masked, and spend bits only on what is audible.
- YouTube audio is Opus or AAC.

**Why lossy matters for separation:**
- Codec artifacts and band-limiting (often nothing above about 16 kHz) are already in most user uploads. The missing top end is the codec's deliberate low-pass, not aliasing. Models trained only on clean audio can behave oddly on them.
- **Video containers** (MP4, MOV, MKV) wrap a video stream and an audio stream. Our demo copies the video stream and replaces only the audio ("remux"), so the video is not re-encoded.

## 4. Channels, stereo and mid/side

**Stereo panning.** Stereo is two channels, L and R. A source panned to the centre has equal level in both. Mixers pan instruments by changing the L/R gain ratio (pan laws keep perceived loudness constant).

**Mid/side transform:**

  M = (L + R) / 2,  S = (L − R) / 2,  and back: L = M + S, R = M − S.

- Centre-panned sources (lead vocal, kick, bass) live in M.
- Wide sources (stereo reverb, guitars panned left and right) live mostly in S.

**The old "karaoke" trick.** L − R cancels the centre-panned vocal. It also cancels the bass and kick, which is why it sounds poor.

**Relevance to us.** SAM Audio's processor averages channels to mono, which throws away this spatial information. Using L/R and M/S as extra cues is one of our candidate differentiators.

## 5. Loudness: LUFS

**What LUFS measures.**
- Peak level (dBFS) says nothing about how loud something *sounds*.
- **LUFS/LKFS** (ITU-R BS.1770) applies a K-weighting filter (roughly matching the ear) and a gate that ignores silence, then averages.
- The meters show **momentary** (400 ms), **short-term** (3 s) and **integrated** (whole file) values.
- **True peak** (dBTP) catches peaks between samples.

**Targets.** Streaming platforms normalise to targets that vendor blogs commonly give as about −14 LUFS integrated with a −1 dBTP ceiling. Figures differ by platform, so check the current documentation. Broadcast and Netflix use dialogue-gated targets around −27 LKFS.

**For our product.** When we remix stems we should report or normalise loudness, so the user doesn't get a quieter file than the one they uploaded.

## Read or watch

- Xiph.org, *A Digital Media Primer for Geeks* (video): https://xiph.org/video/vid1.shtml
- Xiph.org, *Digital Show & Dither* (video): https://xiph.org/video/vid2.shtml
- iZotope, *What is mid/side processing?*: https://www.izotope.com/en/learn/what-is-midside-processing.html, and a deeper dive: https://www.izotope.com/en/learn/mid-side-deep-dive.html
- NUGEN Audio, *What are LUFS?*: https://nugenaudio.com/what-are-lufs
- iZotope, *Mastering for streaming platforms*: https://www.izotope.com/en/learn/mastering-for-streaming-platforms.html
- DSP Guide, chapter 3 (ADC and DAC): https://www.dspguide.com/

## Exercise (30 min)

1. Take any stereo music file, compute M and S, and listen to each.
2. Compute L − R and hear the "karaoke" effect and its side effects.
3. This is the cheapest separator there is. Note what it gets wrong; lecture 05 explains why.
