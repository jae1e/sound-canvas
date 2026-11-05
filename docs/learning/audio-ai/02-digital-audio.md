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

A digital recording has two separate questions: how are the samples *arranged in a file*, and are they *compressed*? Some words first:
- **Bitrate:** how many bits per second the audio takes, written in kbps (kilobits per second; 1 kbps = 1000 bits/s).
- **Codec** (coder-decoder): the method that compresses audio into fewer bits (encode) and turns it back into sound (decode).
- **Lossless** compression keeps every bit: decoding gives back exactly the original samples. **Lossy** compression throws information away on purpose to get a much smaller file.

**Size of uncompressed audio.** CD-quality stereo is 44,100 samples/s × 16 bits × 2 channels = 1,411,200 bits/s, about 1.41 Mbit/s. One minute is 1,411,200 / 8 × 60 ≈ 10.6 MB.

**Lossless:**
- **PCM** (pulse-code modulation): the plain list of sample values, uncompressed. Sections 1 and 2 described exactly this: a number per sample, per channel. "PCM" is what the audio data inside a WAV file is.
- **WAV** (Waveform Audio File Format): a small header (sample rate, bit depth, channel count) followed by raw PCM. **AIFF** (Audio Interchange File Format) is Apple's equivalent: same idea, different header. Both are huge but simple and exact.
- **FLAC** (Free Lossless Audio Codec): zip-like compression for audio. It predicts each sample from the previous ones and stores only the small prediction errors. The file is smaller (for music often around half the size of the WAV; this varies a lot), and decoding gives back **bit-exact** samples, meaning every bit identical to the original. Most datasets use it.

**Lossy:**
- **MP3** (MPEG-1 Audio Layer III), **AAC** (Advanced Audio Coding) and **Opus** are lossy codecs. A typical MP3 at 128 kbps is about 11 times smaller than CD-quality PCM (1411 / 128). Opus is a modern open codec designed for both speech and music at low delay, used in calls and web streaming.
- They transform the signal (**MDCT**, the modified discrete cosine transform), use a **psychoacoustic model** to find what is masked, and spend bits only on what is audible.
  - **MDCT:** the overlapped frequency transform lossy codecs use. It cuts the signal into short blocks that overlap by half, and turns each block into frequency coefficients with cosine functions. It is a cousin of the STFT (lecture 03). The overlap lets the blocks join smoothly, without producing extra data.
  - **Psychoacoustic model:** a computer model of human hearing, built on masking and the critical bands from lecture 01. For every frequency band it estimates how much noise could be added before a listener would notice.
  - **How the bits are spent:** the codec rounds the frequency coefficients coarsely where masking hides the error and finely where it does not. That is quantisation (section 2) with a different step size in each band, so the error noise sits just under the masking threshold.
- YouTube audio is Opus or AAC.

**Why lossy matters for separation:**
- Codec artifacts and band-limiting (often nothing above about 16 kHz) are already in most user uploads. The missing top end is the codec's deliberate low-pass, not aliasing. Models trained only on clean audio can behave oddly on them.
  - An *artifact* is a sound defect created by processing. Typical codec artifacts are a thin, watery or "swirly" quality in the high frequencies.
  - *Band-limiting* means the top of the spectrum is cut off: a spectrogram of such a file shows an empty region above the cutoff.
  - The codec discards the top end because it is expensive to code and usually masked or hard to hear.
- **Video containers** (MP4, MOV, MKV) wrap a video stream and an audio stream. Our demo copies the video stream and replaces only the audio ("remux"), so the video is not re-encoded.
  - **Container vs codec:** the container is the outer box (a file with labelled tracks, such as video, audio, subtitles); the codec is how the contents of each track are compressed (for example H.264 video and AAC audio). Changing the container does not change the compression, and vice versa.
  - **Remux:** repackage the same compressed streams into a new box (or swap one track). It is fast and loses no quality, because nothing is decoded.
  - **Re-encoding:** decode the stream to raw samples or pixels and compress it again. It is slower, and each lossy re-encode loses a little more quality (generation loss). Remuxing the video avoids this for the picture; the new audio track still has to be encoded once.

## 4. Channels, stereo and mid/side

**Channel.** A channel is one stream of samples intended for one speaker. Mono has one channel. **Stereo** has two: L (left) and R (right). A stereo file stores a pair of numbers per time step, at the same sample rate.

**Stereo panning.** A source panned to the centre has equal level in both. Mixers pan instruments by changing the L/R gain ratio (pan laws keep perceived loudness constant).
- **Panning** places a sound between the speakers. All left means R = 0; centre means L = R.
- **Pan law:** if a centred source simply used full gain on both sides, it would sound louder than the same source panned hard left, because two speakers add. A pan law lowers the centre by a fixed amount, commonly 3 dB, so the perceived loudness stays the same as the sound moves across.
- **Why it works:** L and R differ in level (and sometimes in timing). Our brains use those differences to place sources left or right.

**Mid/side transform:**

  M = (L + R) / 2,  S = (L − R) / 2,  and back: L = M + S, R = M − S.

- **M (mid)** is what the two channels share: the sum. It is what you would hear from a mono speaker.
- **S (side)** is how the two channels differ.
- Numbers: L = 0.8, R = 0.8 gives M = 0.8, S = 0. A sound with L = 0.5, R = −0.5 gives M = 0, S = 0.5. Check the way back: 0.8 + 0 = 0.8 and 0.8 − 0 = 0.8.
- It is a simple change of basis (a rotation by 45° plus scaling), which loses nothing. It is easier to process a "shared" part and a "different" part separately.
- Centre-panned sources (lead vocal, kick, bass) live in M.
- Wide sources (stereo reverb, guitars panned left and right) live mostly in S.

**The old "karaoke" trick.** L − R (which is 2S) cancels the centre-panned vocal: the same signal in both channels subtracts to zero. It also cancels the bass and kick, which is why it sounds poor. Stereo reverb on the vocal and anything not exactly centred stays behind.

**Relevance to us.** SAM Audio's processor averages channels to mono, which throws away this spatial information. Using L/R and M/S as extra cues is one of our candidate differentiators.
- *SAM Audio* is the separation model we evaluate. *Averaging to mono* means (L + R) / 2, which is exactly M, so S is lost.
- A *cue* is a piece of extra evidence a separator can use to tell sources apart, such as "this source sits left of centre".

## 5. Loudness: LUFS

**dBFS and peak level.** dBFS means decibels relative to full scale, the largest value the format can store (1.0). 0 dBFS is the maximum; everything else is negative. Half the maximum amplitude is 20 log₁₀(0.5) ≈ −6 dBFS. This is the scale of the level meter in recording software.

**What LUFS measures.**
- Peak level (dBFS) says nothing about how loud something *sounds*. A single sharp drum hit and a sustained organ chord can have the same peak, but the organ sounds far louder.
- **LUFS/LKFS** (ITU-R BS.1770) applies a K-weighting filter (roughly matching the ear) and a gate that ignores silence, then averages.
  - **LUFS:** Loudness Units relative to Full Scale. **LKFS:** Loudness, K-weighted, relative to Full Scale. They are the same quantity under two names. One loudness unit (LU) equals 1 dB, so raising the gain by 3 dB raises the reading by 3 LUFS.
  - **ITU-R BS.1770:** the standard from the International Telecommunication Union (radio sector) that defines the measurement. EBU R 128, the European broadcast rule, builds on it.
  - **K-weighting:** a fixed filter applied before measuring. It cuts very low frequencies and boosts frequencies above a few kHz slightly, to mimic how the ear and head respond (see equal-loudness contours, lecture 01).
  - **Gating:** the measurement skips parts that would drag the average down, namely near-silence and very quiet passages. So a file with long silences is not rated as quiet.
- The meters show **momentary** (400 ms), **short-term** (3 s) and **integrated** (whole file) values. Integrated is the single number used for targets.
- **True peak** (dBTP) catches peaks between samples.
  - The reconstructed smooth wave (section 2, "stair-step myth") can rise above every sample value. Example: a sine at a quarter of the sample rate, with phase such that samples fall at 45° points, has samples of ±0.707 but a true peak of 1.0. The sample peak underestimates by 3 dB.
  - dBTP estimates the reconstructed peak by oversampling. Converting to a lossy format or playing through a DAC can clip at such peaks, even though the file's sample peaks are below 0 dBFS.

**Targets.** Streaming platforms normalise to targets that vendor blogs commonly give as about −14 LUFS integrated with a −1 dBTP ceiling. Figures differ by platform, so check the current documentation. Broadcast and Netflix use dialogue-gated targets around −27 LKFS.
- *Normalise* here means the platform measures each track and turns it up or down so that all tracks play at a similar loudness.
- *Dialogue-gated* means only the speech passages are measured, so loud music or effects do not drive the number.
- Example of the arithmetic: a file at −20 LUFS needs +6 dB of gain to reach −14 LUFS. That gain also raises the peaks by 6 dB, so a peak at −3 dBFS would become +3 dBFS and clip. That is the reason for the true-peak ceiling and for limiters.
- A *limiter* is an automatic gain reducer that turns the level down for a split second whenever a peak would exceed the ceiling.

**For our product.** When we remix stems we should report or normalise loudness, so the user doesn't get a quieter file than the one they uploaded.

## Read or watch

- Xiph.org, *A Digital Media Primer for Geeks* (video): https://xiph.org/video/vid1.shtml
- Xiph.org, *Digital Show & Dither* (video): https://xiph.org/video/vid2.shtml
- iZotope, *What is mid/side processing?*: https://www.izotope.com/en/learn/what-is-midside-processing.html, and a deeper dive: https://www.izotope.com/en/learn/mid-side-deep-dive.html
- NUGEN Audio, *What are LUFS?*: https://nugenaudio.com/what-are-lufs
- iZotope, *Mastering for streaming platforms*: https://www.izotope.com/en/learn/mastering-for-streaming-platforms.html (mastering is the final preparation of a mix for release, including loudness)
- DSP Guide, chapter 3 (ADC and DAC; a DAC is a digital-to-analog converter, the reverse of an ADC): https://www.dspguide.com/

## Exercise (30 min)

1. Take any stereo music file, compute M and S, and listen to each.
2. Compute L − R and hear the "karaoke" effect and its side effects.
3. This is the cheapest separator there is. Note what it gets wrong; lecture 05 explains why.

A starting point (the file must be stereo; writing as float avoids the clipping described in section 2, because L − R can exceed 1.0):

```python
import soundfile as sf
x, fs = sf.read("song.wav")          # x has shape (samples, 2)
L, R = x[:, 0], x[:, 1]
M, S = (L + R) / 2, (L - R) / 2
sf.write("mid.wav", M, fs, subtype="FLOAT")
sf.write("side.wav", S, fs, subtype="FLOAT")
sf.write("karaoke.wav", L - R, fs, subtype="FLOAT")
```
