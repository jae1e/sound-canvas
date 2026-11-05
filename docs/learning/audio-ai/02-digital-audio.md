# 02. Digital audio

## 1. Sampling and aliasing

**Sampling rate and Nyquist.** An analog-to-digital converter samples at f_s.
- Frequencies above **f_s/2 (Nyquist)** fold back as false lower frequencies (**aliasing**), the audio version of the wagon-wheel effect.
- An analog anti-alias low-pass filter removes them before sampling.

**Common rates:**

| Rate | Bandwidth | Typical use |
|---|---|---|
| 16 kHz | 8 kHz | Speech models, telephony-plus. Most ASR and diarisation models; our LibriSpeech clips |
| 44.1 kHz | 22 kHz | CD and most music |
| 48 kHz | 24 kHz | Video and broadcast. SAM Audio works at 48 kHz |

**Resampling.** Changing the rate is a filtering problem, not just dropping or repeating samples. Libraries do it with polyphase or windowed-sinc filters.

## 2. Quantisation, bit depth and dither

**Bit depth.** Each sample is stored with N bits. The quantisation noise floor gives SNR ≈ 6.02·N + 1.76 dB:
- 16-bit gives about 98 dB.
- 24-bit gives about 146 dB, which is more than any microphone delivers.

**Dither.** Tiny added noise that turns quantisation distortion, which is correlated with the signal, into benign hiss.

**Float formats.** Production uses 32-bit float, so headroom is effectively unlimited inside the software. **Clipping** happens only at the final fixed-point export.

Watch Monty Montgomery's *Digital Show & Dither*. It is the clearest demonstration that sampled audio reconstructs the continuous wave exactly when it is band-limited.

## 3. Files and codecs

**Lossless:**
- WAV and AIFF hold raw PCM.
- FLAC is compressed and lossless, used by most datasets.

**Lossy:**
- MP3, AAC and Opus transform the signal (MDCT), use a psychoacoustic model to find what is masked, and spend bits only on what is audible.
- YouTube audio is Opus or AAC.

**Why lossy matters for separation:**
- Codec artifacts and band-limiting (often nothing above about 16 kHz) are already in most user uploads. Models trained only on clean audio can behave oddly on them.
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
