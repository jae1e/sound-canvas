# 10. The capture chain: microphones, Bluetooth, Android audio paths and file formats

A transcript can only be as good as the audio it came from, and most of the damage happens before the file exists: in the air, in the microphone, in a Bluetooth link and inside Android. This lecture follows a voice from the mouth to a 16 kHz WAV segment, shows where each stage can lose information and how to measure the loss. It ends with what this means for our field-logging app on the Galaxy S25: the subway at 72–79 dBA now, factories at 85–100 dBA later.

**Labels**, as in our research notes: [F] verified on an official or primary page, [V] vendor claim, [P] paper or third-party report, [E] our estimate, [H] hypothesis to test. Checked on 2026-11-05.

**Words you will meet in this lecture** (each is explained again where it first appears):

| Term | Plain meaning |
|---|---|
| dB SPL | Sound pressure level: how loud a sound is in the air, 20·log₁₀(p_rms / 20 µPa) ([lecture 01](01-sound-hearing-rooms.md) §1). 94 dB SPL is 1 Pa |
| dBA | dB SPL measured through the A-weighting filter, which discounts low frequencies roughly as the ear does. Noise figures such as "75 dBA in a subway car" use it |
| dBFS | Decibels relative to full scale, the largest number the file can hold ([lecture 02](02-digital-audio.md) §5). 0 dBFS is the ceiling |
| MEMS microphone | Micro-electro-mechanical system: a silicon-chip microphone a few millimetres wide, as used in phones and earbuds |
| Sensitivity, SNR, AOP | Datasheet numbers: the output for 1 Pa; the distance from the mic's own hiss to 1 Pa; the loudest sound before heavy distortion |
| Near field / far field | Close to a source, where the level changes fast with distance / far away, where sound arrives as nearly flat waves |
| Bluetooth profile | A standard "job description" for a Bluetooth link: A2DP for music, HFP for calls |
| CVSD, mSBC, LC3 | The speech codecs (compressors) of the hands-free link, sampling at 8, 16 and 32 kHz |
| LE Audio | The newer audio system on the Bluetooth Low Energy radio, with the LC3 codec |
| AudioRecord | The Android class an app uses to read raw microphone samples |
| Audio source | The preset an app asks for (`MIC`, `VOICE_RECOGNITION` and others): which microphone, and which processing |
| AEC, NS, AGC | Acoustic echo cancellation, noise suppression, automatic gain control: processing the phone may apply |
| CDD | Android's Compatibility Definition Document: the rules a phone must meet to ship with Google's Android |
| Route | The input device actually used for a recording: phone mic, Bluetooth headset, USB |
| Resampling, downmix | Changing the sample rate / combining several channels into one |
| ASR | Automatic speech recognition: speech to text |

## 1. The chain from mouth to file

A recording is a measurement chain, like a vibration measurement: sensor, signal conditioning, ADC (analog-to-digital converter), driver, file format. Each stage can lose information, and almost none of the losses can be undone later. Clipping is covered in [lecture 04](04-audio-engineering-practice.md) §2, aliasing in [lecture 02](02-digital-audio.md) §1.

| # | Stage | What happens | What can be lost | How you notice |
|---|---|---|---|---|
| 1 | Air | Speech spreads from the mouth; noise arrives from everywhere | SNR, set by distance and noise level; wind turbulence | Noise in the pauses; low rumble |
| 2 | Microphone | Pressure moves a diaphragm, which gives a voltage or bits | Self-noise; distortion and clipping above the AOP | Flat-topped waveform |
| 3 | Preamp and ADC | Gain, anti-aliasing filter, sampling | Clipping if the gain is too high; hiss if too low | Peaks stuck at 0 dBFS |
| 4 | Headset DSP (digital signal processing) and Bluetooth, if used | Earbud firmware denoises, then a speech codec squeezes the signal into a radio link | Everything above 4, 8 or 16 kHz; speech damaged by aggressive denoising; 20–150 ms of delay; dropouts | Spectrum cut off flat; clicks or gaps |
| 5 | Android audio framework | Source preset (NS, AGC, AEC), resampling, routing, rules for several apps recording at once | Processing artefacts; time-varying gain; the wrong mic; silence | Level "breathing"; unexpected route |
| 6 | Our encoder | PCM WAV (lossless) or a lossy codec | Nothing for WAV; detail at low bitrates | Watery, swirly highs |
| 7 | Server normalisation | Decode, resample, downmix, set the level | Cancelled channels, aliasing, clipping, if done carelessly | Silent or hollow audio |

**The key lesson.** The server can re-run a better model on a stored file, but it cannot restore what stages 1–5 threw away. So the capture path must be chosen on purpose, and the path actually used must be **logged** with every segment. Stages 4 and 5 also add delay: the time at which the app *received* a buffer is not the time at which the words were *spoken* (section 3.3).

## 2. Microphones in the field

### 2.1 Phone MEMS microphones and their datasheet numbers

A phone usually has two to four MEMS microphones ([lecture 04](04-audio-engineering-practice.md) §1): one at the bottom near the mouth, one at the top, often one beside the camera. The phone compares them to cancel noise and to detect wind. The platform decides which ones a recording uses, and reports them through `AudioRecord.getActiveMicrophones()` [F].

Datasheet terms. Each refers to the standard test tone, 1 kHz at 94 dB SPL (1 Pa):
- **Sensitivity** is the output for that tone. Digital MEMS mics quote it in dBFS: −37 dBFS means a 1 Pa tone comes out 37 dB below full scale.
- **SNR** (signal-to-noise ratio) is 94 dB minus the mic's own hiss, expressed as an equivalent sound level and A-weighted. An SNR of 65 dBA means the hiss sounds like a 29 dBA room (94 − 65): a quiet bedroom. That is irrelevant in a 75 dBA subway and matters in a quiet office.
- **AOP** (acoustic overload point) is the loudest level before distortion becomes severe. It is usually defined at 10% **THD** (total harmonic distortion: the share of the output made of harmonics the mic created, which were not in the sound). Above the AOP the mic itself clips. The **dynamic range** is the AOP minus the self-noise level.
- **Typical values.** TDK announced phone-class MEMS mics with −37 dBFS sensitivity, 68 dBA SNR and a 133 dB SPL AOP [V] ([announcement](https://www.microcontrollertips.com/mems-microphones-excel-in-high-dynamic-range-environments/)). Phone-class parts commonly quote 65–70 dBA SNR and 120–135 dB SPL AOP [V]. Android exposes each mic's sensitivity and maximum SPL through `MicrophoneInfo`, and the CDD requires phones to fill it in [F]. Values can still come back as "unknown".

**Worked example 1: will a shout clip?** After the mic, the phone sets its own gain. The CDD (section 4.2) gives target gains for two audio sources:
- `VOICE_RECOGNITION`: a 1 kHz tone at 90 dB SPL *should* give an RMS of 2500 out of 32768 in 16-bit samples, that is 20·log₁₀(2500/32768) = −22.35 dBFS [F]. A sine's peak is √2 × RMS = 3536, and it can grow by a factor of 9.3 (+19.3 dB) before it reaches full scale (32767). So this path clips a sine at about **109 dB SPL**.
- `UNPROCESSED`: a tone at 94 dB SPL *must* give an RMS of 520 (−36 dBFS) [F]. The same arithmetic gives clipping at about **127 dB SPL**, 18 dB more headroom.
- The peaks of speech sit roughly 12 dB or more above its RMS level [E, rule of thumb].
  - Subway, phone at 30 cm, raised voice (76 dB SPL): peaks near 88 dB SPL, more than 20 dB below both limits. Safe.
  - Factory, phone held at the lips (3 cm) while shouting: about 108 dB SPL on average (the 3 cm row of worked example 2) and peaks near 120 dB SPL. That clips a `VOICE_RECOGNITION` path tuned to the CDD target, but not `UNPROCESSED`.
- **Caveat.** These are CDD targets. The S25's real gains stay unknown until we measure them (section 7).

### 2.2 Other microphones you will meet

| Microphone | Distance to the mouth | Link to the phone | Strength | Weakness |
|---|---|---|---|---|
| Phone in hand | 20–30 cm | Built in | Widest bandwidth (hardware runs at 48 kHz); several mics | Far from the mouth |
| Phone in a pocket; chest bodycam | 20–40 cm, often covered | Built in, or its own recorder | Hands-free | Muffled by cloth; rustle. Estimated SNR on the subway −5 to +3 dB [E] |
| Lavalier (clip-on) | 15–25 cm, on the chest | Wired or its own radio | Steady distance | Loses some treble below the chin; clothing noise |
| Earbud mics | 10–12 cm, at the ear | Bluetooth HFP or LE Audio | Always worn. **Beamforming**: two mics combined to "aim" at the mouth. Some add a bone-conduction or voice-pickup sensor | Bluetooth codec limits; firmware denoising you cannot switch off |
| Close-talk boom | 2–3 cm, beside the lips | Wired or Bluetooth headset | Highest SNR; often noise-cancelling (section 2.4) | Must be positioned; less comfortable |
| Hearing-protection headset with boom (3M Peltor WS LiteCom Pro III class) | 2–3 cm | Bluetooth A2DP and HFP | Doubles as PPE (personal protective equipment), which loud sites need anyway; noise-cancelling boom [V] | Its Bluetooth codec and wideband support are unconfirmed [gap] |
| Head-worn array (RealWear Navigator 520) | 5–10 cm | Its own computer | "Accurate voice recognition in noise up to 100 dBA" [V] | A separate device |

Product facts come from [asr_noise_ondevice_onprem.md](../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md) Q7.

### 2.3 Near field, far field and the SNR budget

- **Noise is diffuse.** In a subway car or a factory hall, noise arrives from every direction after many reflections. Its level is about the same wherever the mic is, unless one machine right beside you dominates. Think of it as background vibration in a plant.
- **Speech comes from a nearby point source.** Its level falls by 6 dB for each doubling of distance (the inverse-square law, [lecture 01](01-sound-hearing-rooms.md) §1). So moving the mic closer raises only the speech, and the SNR rises by the same number of dB.
- **Near field and far field.** Closer than about λ/2π to a source (5.5 cm at 1 kHz, 18 cm at 300 Hz), the wavefronts are strongly curved and the level changes steeply with distance: this is the near field. Far away the waves are almost flat: the far field. A boom mic 2–3 cm from the lips sits in the near field of the voice, while it hears the noise as far-field sound.

**Worked example 2: an SNR budget.**
- Speech levels at 0.3 m: raised voice 76 dB, shout 88 dB (a table traced to ANSI S3.5 [P]). People raise their voices in noise, the **Lombard effect** [P]. At distance r the level is L(r) = L(0.3 m) + 20·log₁₀(0.3 / r).
- Ambient noise: subway 75 dBA (Korean cars measure 72–79 dBA [P]); factory 95 dBA (assumed, inside the 85–100 range).

| Mic position | Distance | Speech gain vs 30 cm | Subway: speech / SNR | Factory: speech / SNR |
|---|---|---|---|---|
| Phone in hand | 30 cm | 0 dB | 76 dB / **+1 dB** | 88 dB / **−7 dB** |
| Earbud | 11 cm | +8.7 dB | 84.7 dB / **+9.7 dB** | 96.7 dB / **+1.7 dB** |
| Close-talk boom | 3 cm | +20 dB | 96 dB / **+21 dB** | 108 dB / **+13 dB** |

**What these numbers mean for ASR.** One vendor reports for Parakeet-TDT-0.6B-v3 on English benchmarks with added noise: 6.3% **WER** (word error rate, the share of words wrong) when clean, 7.1% at 10 dB SNR, 11.7% at 0 dB and 19.9% at −5 dB [V]. So a phone at 30 cm is at the edge of usable on the subway and useless in a factory. A boom mic is comfortable in both.

- **Caveat: the source.** At 3 cm the mouth is not a point source, so +20 dB is approximate. Our research notes use the same rule of thumb [E].
- **Caveat: the weighting.** dBA discounts low frequencies, and much subway noise lies below 100 Hz [P]. A high-pass filter at 80–100 Hz removes it cheaply, so the SNR inside the speech band is often better than the A-weighted figure suggests.
- **Caveat: no measurements yet.** Nobody has published measured SNRs inside a subway car [gap]. Our week-1 recordings will give them.

### 2.4 Wind noise and the proximity effect

**Wind noise is not sound from far away.** Air flowing over the mic opening becomes turbulent, and the eddies push directly on the diaphragm.
- The pressure swings are large and concentrated at low frequencies. They can drive the mic or the ADC into clipping even when the speech is quiet. Eddies a few centimetres apart are unrelated, while real sound reaching two mics is strongly related. Phones use this difference to detect wind, then switch mics or filter. That is processing again (section 4).
- Remedies, best first: a foam or fur windscreen (it keeps the turbulence away from the opening), shielding with the body or a hand, and a high-pass filter. You will meet wind on subway platforms (the air push of an arriving train) and on outdoor sites.

**The proximity effect, and why noise-cancelling booms work.** [Lecture 04](04-audio-engineering-practice.md) §1 explained that directional mics boost the bass close to a source, because they respond to the pressure *difference* across the diaphragm. A noise-cancelling boom is a pressure-gradient ("differential") mic placed on purpose in the near field of the voice.
- For a spherical wave from a point source, p = (A/r)·e^(i(ωt − kr)). Its gradient has magnitude |∂p/∂r| = (|A|/r)·√(k² + 1/r²), where k = 2πf/c is the wavenumber.
- A distant plane wave with the same pressure at the mic has a gradient of only k·|p|.
- So the nearby voice gets an extra gain of √(1 + 1/(kr)²) over distant noise of equal pressure.

**Worked example 3.** A boom at r = 2 cm gets an extra ≈ 19 dB at 300 Hz (k = 5.5 rad/m, kr = 0.11), ≈ 9 dB at 1 kHz (kr = 0.37) and ≈ 2.6 dB at 3 kHz (kr = 1.1). This comes on top of the inverse-square advantage, and it is largest exactly where subway and machine noise is strongest. Headset makers equalise the resulting bass boost. The catch is that the advantage depends on distance: a boom pushed away from the mouth loses it quickly.

## 3. Bluetooth headsets

### 3.1 Two profiles on one radio

A Bluetooth **profile** is a standard description of one job.
- **A2DP** (Advanced Audio Distribution Profile) streams music *one way*, phone to headset, at high quality (codecs such as SBC, the basic Bluetooth music codec, or AAC; 44.1 or 48 kHz stereo). It has **no microphone channel**.
- **HFP** (Hands-Free Profile) is the *two-way* call link. Voice travels over a **SCO** link (synchronous connection-oriented; **eSCO** is its extended form). That is a fixed time slot reserved on the radio, like a dedicated channel on a time-multiplexed bus. The slots are small, so a speech codec squeezes the voice.

| HFP codec | Introduced in | Sampling rate | Audio bandwidth, roughly | Class |
|---|---|---|---|---|
| CVSD (continuously variable slope delta modulation) | The original HFP | 8 kHz | Up to about 3.4–4 kHz | Narrowband |
| mSBC (modified sub-band codec) | HFP 1.6 | 16 kHz | 50 Hz–7 kHz [P] | Wideband |
| LC3-SWB (Low Complexity Communication Codec, super-wideband) | HFP 1.9 | 32 kHz, 7.5 ms frames [F] | 50 Hz–14 kHz [P] | Super-wideband |
| LE Audio with LC3 (a separate system, not HFP) | Android 13 and later | Mic capture up to 32 kHz [F] | Up to about 14–16 kHz | Super-wideband |

- **Sources.** The 32 kHz and 7.5 ms figures come from [Espressif's HFP header](https://github.com/espressif/esp-idf/blob/master/components/bt/host/bluedroid/api/include/api/esp_hf_defs.h), which cites the HFP 1.9 specification. The bandwidths come from the press sources in our research note.
- **LE Audio.** Android's guide says LC3 "is the default audio codec and replaces the SBC codec used for A2DP (media) and mSBC in HFP (voice)", and that "with BLE Audio, input and output sampling can reach 32 kHz" [F] ([Android](https://developer.android.com/develop/connectivity/bluetooth/ble-audio/overview)). Galaxy Buds3 Pro support LE Audio [P]. The cheap QCY earbuds used earlier in the repo are probably classic HFP with a narrowband mic [unverified].
- **Which codec?** The phone and the headset negotiate the codec. We found no public app API that reports it [gap], so we read it off the spectrum (Exercise).

### 3.2 Why music sounds worse when the mic opens

When an app opens the mic of a classic Bluetooth headset, the phone switches the headset from A2DP to HFP. Playback now shares the same narrow voice link: mono, 8 or 16 kHz, through a speech codec. Music suddenly sounds like a phone call. Android's guide says it plainly: "Bluetooth classic lowers audio quality when using Bluetooth microphones" [F]. LE Audio avoids most of this. For us: while a recording holds the headset mic, our start and stop sounds also play through the voice link. That is fine, and one more reason not to hold the mic open when nothing is being recorded.

### 3.3 Latency, and why it matters for timestamps

- **The size of the delay.** Bluetooth mic paths add roughly **20–150 ms** of delay, not measured for our devices [E]. Reported figures: about 40 ms for HFP [P], and 20–30 ms for optimised LE Audio links against "typically 100ms" for classic Bluetooth [P] (see [architecture_security_legal_trust.md](../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md) §3). Software cannot see it: `AudioRecord.getTimestamp()` maps sample frames to the boot clock, but it "cannot account for any delay unknown to the implementation" [F]. A headset's internal delay is exactly such an unknown.
- **Worked numbers.** A 120 ms offset is 3.6 video frames at 30 fps (33 ms per frame). "Tap a transcript line to play it" does not notice it. Aligning speech with a robot log or a video to ±50 ms does, so the route must be logged and each headset model calibrated once.
- **Push-to-talk (PTT).** When the user releases the button at time t, the last 20–150 ms of speech are still in the radio link. Keep recording for a short post-roll after release; 200 ms or more is a reasonable starting point [H].
- **Setup time.** Android's documentation of the older `startBluetoothSco()` method warns that setting up the link "can take several seconds" [F]. The first words of a memo can be lost while the headset switches to HFP, which matters for the 2-second start target.

### 3.4 Android routing, at concept level

- `AudioManager.setCommunicationDevice(device)` (API level 31, i.e. Android 12) tells Android which device to use for communication. You pass the *output* device, the headset; "the matching source device is selected automatically by the platform" [F]. It replaces `startBluetoothSco()`, deprecated since API level 34 (Android 14) [F]. Call `clearCommunicationDevice()` when you are done.
- `AudioRecord.setPreferredDevice(device)` asks for a specific input. It is a preference, which the user's system settings can override [F].
- `AudioRecord.getRoutedDevice()` reports the input actually in use while recording, for example `TYPE_BUILTIN_MIC`, `TYPE_BLUETOOTH_SCO` or `TYPE_BLE_HEADSET` [F]. **Log this, not what you asked for.**
- The headset's own noise suppression runs inside its firmware. No Android setting reaches it.

## 4. Android capture paths

### 4.1 AudioRecord and audio sources

- **AudioRecord.** This class hands an app raw PCM samples in buffers, much like reading the buffer of a DAQ driver. PCM (pulse-code modulation) means plain sample values ([lecture 02](02-digital-audio.md) §3).
- **Audio source.** When an app opens an `AudioRecord`, it names an audio source. Android defines one as "both a default physical source of audio signal, and a recording configuration" [F]: which mic, and which processing.
- **The processing blocks:**
  - **AEC** (acoustic echo cancellation) removes what the phone's own speaker plays from what the mic hears, so the far end of a call does not hear itself. An adaptive filter uses the playback signal as a reference, predicts the echo and subtracts it.
  - **NS** (noise suppression) turns down what it judges to be noise, frame by frame and band by band ([lecture 07](07-speech-diarization-av.md) §1).
  - **AGC** (automatic gain control) keeps the level steady by turning the gain up in quiet moments and down in loud ones ([lecture 04](04-audio-engineering-practice.md) §1). It also raises the noise in every pause.

| Source | Android's description [F] | Processing you may get | Use for us |
|---|---|---|---|
| `MIC` / `DEFAULT` | "Microphone audio source" | Whatever the manufacturer tuned; not specified | Baseline only |
| `CAMCORDER` | "tuned for video recording, with the same orientation as the camera if available" | Often stereo, wind filter, AGC [E] | No. While another app uses it, our capture is silenced [F] |
| `VOICE_RECOGNITION` | "tuned for voice recognition" | NS and AGC off by default, per the CDD [F] | **Default for ASR** |
| `VOICE_COMMUNICATION` | "tuned for voice communications such as VoIP" (internet calls), with "echo cancellation or automatic gain control if available" | AEC, NS, AGC | Comparison arm only: this is the call path |
| `UNPROCESSED` | "tuned for unprocessed (raw) sound if available, behaves like DEFAULT otherwise" | None except a level multiplier, where supported (CDD) [F] | **Best raw path, where supported** |

### 4.2 What the CDD asks

The **CDD** is the rule book a phone maker must satisfy to ship Google's Android. MUST is a hard rule. SHOULD is a recommendation, and STRONGLY RECOMMENDED one that may become a MUST later, so treat the SHOULD items as what a well-behaved phone does, and measure ours. We read the Android 17 CDD (last updated 2026-08-31); the user's S25 ran Android 17 in our 2026-11-03 tests ([technical-decisions.md](../../products/voice-life-companion/technical-decisions.md) §4.4).

**`VOICE_RECOGNITION`** (§5.4.2) [F]:
- It MUST capture at one of 44.1 or 48 kHz.
- It MUST, by default, disable any noise reduction and any automatic gain control.
- It SHOULD be flat within ±3 dB from 100 Hz to 4 kHz. Outside that band the strongly recommended tolerance is loose: ±20 dB for 30–100 Hz and **±30 dB for 4–22 kHz**. So the region above 4 kHz, where much of the "s" sound lives, is barely specified.
- It SHOULD give an RMS of 2500 at 90 dB SPL (worked example 1), track the level linearly from 72 to 102 dB SPL, and keep THD below 1% at 90 dB SPL.
- If the phone has noise suppression tuned for recognition, that MUST be controllable through the `NoiseSuppressor` API.

**`UNPROCESSED`** (§5.11) [F] is optional. A phone that offers it MUST report it through `AudioManager.getProperty(PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED)`. It MUST be flat within ±10 dB from 100 Hz to 7 kHz, give an RMS of 520 (−36 dBFS) at 94 dB SPL, and have an SNR of at least 60 dB. And it MUST NOT have "any other signal processing (e.g. Automatic Gain Control, High Pass Filter, or Echo cancellation)" apart from a level multiplier.

**Several apps recording at once** (§5.4.5) [F]. While another app captures with `VOICE_COMMUNICATION` (a call) or `CAMCORDER` (a video), our capture is silenced. `AudioRecordingConfiguration.isClientSilenced()` reports this [F], so the app can mark the segment instead of storing silence as if it were a memo.

### 4.3 Native 48 kHz, resampling and the audio effects

- **Downsampling.** Phone mic hardware typically runs at 48 kHz [E], and the CDD requires `VOICE_RECOGNITION` at 44.1 or 48 kHz [F]. When we ask `AudioRecord` for 16 kHz, Android resamples, and the CDD requires "an appropriate anti-aliasing filter" when it downsamples [F]. [Lecture 02](02-digital-audio.md) §1 explains why resampling is a filtering problem.
- **Upsampling.** A narrowband Bluetooth route goes the other way: the link delivers 8 kHz and the app receives it at the 16 kHz it asked for [E]. The file header says 16 kHz, and the content stops at 4 kHz. **The header tells you the sample rate, not the bandwidth.**
- **Audio effects.** `NoiseSuppressor`, `AcousticEchoCanceler` and `AutomaticGainControl` (package `android.media.audiofx`) can be attached to a recorder's audio session, and each has an `isAvailable()` check. Android warns that "on some devices, NS can be inserted by default in the capture path by the platform according to the MediaRecorder.AudioSource used", and tells apps to check the enabled state [F]. So each segment should log the source and whether each effect was on (`getEnabled()`).

### 4.4 Why ASR wants the least-processed path

- **Tuned for ears, not for models.** A phone's NS and AGC are tuned for *human listeners* on a call. They remove what a listener does not need, and they add level changes and artefacts. A modern ASR model was trained on noisy speech and copes with steady noise. It copes worse with artefacts it never saw. In a December 2025 study, a speech enhancer placed in front of Whisper, Parakeet and others made the error rate worse in all 40 combinations tested [P] (research note Q4).
- **So:** the best microphone first, then the least-processed path (`UNPROCESSED`, otherwise `VOICE_RECOGNITION`), and denoising, if any, only as a tested option. [Lecture 11](11-noise-reduction.md) covers that debate.

## 5. File formats for speech

[Lecture 02](02-digital-audio.md) §3 explains codecs, containers, lossless and lossy.

| Format | Lossless? | Typical speech settings | Where you meet it | Notes for ASR |
|---|---|---|---|---|
| PCM WAV | Yes | 16 kHz, 16-bit, mono | Our segments; ASR tools | Simple, exact, large: a 44-byte header, then the samples |
| FLAC | Yes | The same, often half the size or less | Archives, datasets | Bit-exact; good for long-term storage |
| Opus in Ogg (.opus, .ogg) or WebM | No | 16–32 kbit/s for speech; 6–510 kbit/s possible [F] | Messengers, browsers, web calls | Modes from narrowband (4 kHz) to fullband (20 kHz) [F]. ffmpeg decodes it at 48 kHz, so ffprobe reports 48000 even for a 16 kHz original (tested) |
| AAC in m4a or mp4 | No | 64–128 kbit/s at 44.1 or 48 kHz | Phone voice recorders, video | Small effect at these bitrates [E] |
| AMR-NB / AMR-WB (.amr, .3gp) | No | 8 kHz at 4.75–12.2 kbit/s / 16 kHz at 6.6–23.85 kbit/s [F] | Mobile calls, old recorders | AMR-NB is telephone quality: avoid it |
| MP3 | No | 64–128 kbit/s | Everywhere | Fine at these bitrates; avoid repeated re-encoding |

Sources: [RFC 6716](https://www.rfc-editor.org/rfc/rfc6716) (Opus), [RFC 4867](https://www.rfc-editor.org/rfc/rfc4867) (AMR).

**Sample rates and where they come from:** 8 kHz (telephone, CVSD), 16 kHz (wideband speech, mSBC, the ASR standard), 32 kHz (LC3 super-wideband), 44.1 kHz (CD), 48 kHz (phone hardware, video). The bandwidth is at most half the rate. **Mono or stereo:** speech recognition uses one channel, and a stereo phone recording is two mics, not "left and right" in the music sense.

**Worked example 4: data rates.**
- 16 kHz × 16 bits × 1 channel = 256,000 bit/s = 256 kbit/s = 32,000 bytes/s, so **1.92 MB per minute**. A 30 s segment is 960,000 bytes plus the 44-byte header.
- 48 kHz 16-bit mono is three times that, 5.76 MB per minute. Opus at 24 kbit/s is 0.18 MB per minute, a tenth of the 16 kHz WAV.
- One hour of memos a day, kept 90 days (the `standard` retention class) as 16 kHz WAV: 1.92 × 60 × 90 ≈ 10.4 GB.

**What ASR models expect: 16 kHz, mono, floating point.**
- Whisper's loader asks ffmpeg for exactly that (`-ac 1 -ar 16000`), then divides the 16-bit integers by 32768 to get floats in [−1, 1) [F] ([audio.py](https://github.com/openai/whisper/blob/main/whisper/audio.py)). Its spectrogram uses 25 ms windows every 10 ms.
- faster-whisper decodes any file and resamples it to 16 kHz mono [F]. Parakeet's model card asks for "16kHz" "Monochannel audio" [V].
- Hand a 48 kHz array to a model that assumes 16 kHz, and it hears speech three times slower and about an octave and a half lower: nonsense. The rate must travel with the samples.

**Worked example 5: what narrowband removes.**
- Whisper turns 16 kHz audio into 80 mel bands ([lecture 03](03-spectral-analysis.md) §4) from 0 to 8 kHz (large-v3 uses 128). Computing the band centres with librosa, 18 of the 80 (28 of the 128) lie above 4 kHz. About a fifth of the model's input is empty for CVSD audio.
- Those bands carry much of the **fricatives**, the hiss-like consonants: s, sh, f and Korean ㅅ, ㅆ, ㅊ. Upsampling 8 kHz audio to 16 kHz does not refill them; it only gives the file the right shape.
- Low bitrates hurt too. In an Amazon study (2020; an LSTM model, a recurrent network as in [lecture 07](07-speech-diarization-av.md) §1, for microphones across the room), Opus raised the WER by 202% relative to uncompressed audio at 8 kbit/s, by 12.6% at 16 kbit/s and by 6.6% at 32 kbit/s [P] ([paper](https://arxiv.org/abs/2002.00122)). Newer models may be more robust; we do not count on it.

## 6. A robust normalisation pipeline: any file from any mic

The server will see our own WAV segments, and later imports too: videos, messenger voice notes, files from other recorders. One pipeline must turn all of them into what the model wants, without silently damaging any of them.

1. **Keep the original untouched.** Store it under its SHA-256 hash (`sha256sum file`), and record the source hash in every derived file. Our [architecture notes](../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md) §5 set the same rule for evidence.
2. **Inspect it, and store the result next to the file:**
   ```bash
   ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,bit_rate:format=format_name,duration -of default=noprint_wrappers=1 in.m4a
   ```
   Trust the header for structure, not for content: Opus files report 48000 Hz, and a narrowband Bluetooth capture may be labelled 16 kHz.
3. **Check channels, clipping and DC offset before converting.** A **DC offset** is a constant shift of the whole waveform away from zero, typically from a slightly unbalanced ADC. It wastes headroom and makes a click wherever the audio is cut.
   ```python
   import sys, numpy as np, soundfile as sf
   x, fs = sf.read(sys.argv[1], always_2d=True)   # keep the native rate and every channel
   print(f"{fs} Hz, {x.shape[1]} ch, {len(x)/fs:.1f} s")
   for c, ch in enumerate(x.T):
       clipped = np.mean(np.abs(ch) >= 0.999)      # share of samples at full scale
       print(f"ch{c}: peak {20*np.log10(np.max(np.abs(ch))+1e-12):.1f} dBFS, "
             f"DC {np.mean(ch):+.4f}, clipped {100*clipped:.3f} %")
   if x.shape[1] == 2:
       r = np.corrcoef(x[:, 0], x[:, 1])[0, 1]     # near -1 means one channel is inverted
       print(f"L/R correlation {r:+.2f}", "-> do NOT average; pick one channel" if r < 0 else "")
   ```
   ffmpeg's `astats` filter (`ffmpeg -i in.wav -af astats -f null -`) reports the same things: peak level, DC offset, and a "Flat factor" that grows with runs of clipped samples.
4. **Choose a channel before downmixing.** Averaging the channels (ffmpeg's `-ac 1` computes (L + R)/2) is only safe when they hold the same signal.
   - **Polarity inversion.** If one channel's signal is upside down (a mis-wired mic or a processing chain), then L = s and R = −s, so (L + R)/2 = 0 and the speech disappears. We tested it: `-ac 1` turns such a file into total silence.
   - **Comb filtering.** Two mics at different distances from the mouth record the same speech with a delay τ between them. Their average is a **comb filter**, with notches (deep cuts) at f = (2m + 1)/(2τ) for m = 0, 1, 2 and so on. **Worked example 6:** a 10 cm path difference gives τ = 0.10/343 = 0.29 ms and notches at 1.7 kHz, 5.1 kHz and so on, a hollow sound right in the speech band.
   - So if the correlation is negative, or the channels are different mics, keep the better channel. `-af "pan=mono|c0=c0"` keeps the first one.
5. **Convert and resample properly:**
   ```bash
   ffmpeg -i in.m4a -af aresample=resampler=soxr -ac 1 -ar 16000 -c:a pcm_s16le out_16k.wav
   ```
   - `soxr` is a high-quality resampler included in many ffmpeg builds (check with `ffmpeg -hide_banner -buildconf | grep soxr`). Without it, drop the `-af` part: the default resampler is also a proper filter. Never resample by dropping samples ([lecture 02](02-digital-audio.md) §1). In Python, `librosa.load(path)` silently resamples to **22,050 Hz** and averages the channels. Pass `sr=None` to keep the rate, or `sr=16000`, and `mono=False` if you want to inspect the channels.
6. **High-pass at about 80 Hz** to remove DC and rumble; subway noise is concentrated below 100 Hz [P]. This is the one filter that is almost always safe.
7. **Set the level with one constant gain, never a moving one.** *Peak normalisation* scales the file so that its highest peak sits at, say, −1 dBFS. *Loudness normalisation* scales it to a target loudness such as −23 LUFS ([lecture 02](02-digital-audio.md) §5). Both are a single constant gain, and ASR models are trained on recordings at many levels, so a constant gain matters little [E]. Compressors, limiters and AGC change the gain over time; avoid them. Keep intermediate files in float (`-c:a pcm_f32le`) so that a gain step can never clip.
8. **Trim silence with care, or not at all.** A **VAD** (voice activity detector) decides frame by frame whether speech is present, and VADs misfire in loud noise: one study found Silero VAD v5 classified only 61% of pure-noise clips correctly [P]. Trimming can also cut word starts and ends, and it shifts the timestamps. Prefer keeping the audio and letting the ASR step mark no-speech regions. If you trim, store the offset map.
9. **Log everything:** the original hash, the ffprobe output, the route, source and effects (for our own segments), every conversion command with its tool version, and the hash of each derived file.

## 7. In our app

How the lecture maps to the [MVP requirements](../../products/industrial-voice-logging/mvp-requirements.md):

- **Segments (A3).** 16 kHz mono 16-bit PCM WAV, at most 30 s each. Worked example 4 confirms the "about 1.9 MB/min" figure. WAV is lossless, so stage 6 of the chain loses nothing.
- **Route per segment (A3).** Log at least the `getRoutedDevice()` type and product name, the audio source, the requested and delivered sample rate, whether NS, AEC and AGC were enabled, the active microphones and any `isClientSilenced()` periods. Close the segment and open a new one when the route changes, so that one file never mixes two mics [H].
- **Audio source.** The requirements do not fix it yet, and research note Q4 asks for a test. Proposal: `UNPROCESSED` where `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED` says it is supported, otherwise `VOICE_RECOGNITION`. Record a `VOICE_COMMUNICATION` arm in testing only, to measure what call processing does to the error rate.
- **Earbuds versus phone mic on the subway.** The earbuds gain about 9 dB of SNR (worked example 2), *if* the link is at least wideband. A narrowband CVSD link throws away everything above 4 kHz, which may cost more than the SNR gains, and the earbud firmware's denoising is a front end we cannot switch off. That is why the noisy-subway set records both.
- **Above 85 dBA.** A phone at 30 cm is at about −7 dB SNR, which is not usable. Plan for close-talk boom headsets (worked examples 2 and 3), which double as hearing protection, used with push-to-talk.
- **Timing (A8).** Bluetooth adds 20–150 ms of unknown offset, and the route log tells the server which segments carry it. Add a short post-roll after a PTT release.
- **Cues (A4).** Start and stop sounds follow the current route and never force the loudspeaker. With a Bluetooth headset they play through the HFP link. Play the start cue before capture begins, or log its time, so that it is not transcribed.

**What to measure in week 1** (alongside section 3.3 of the requirements):
1. **The S25's capabilities.** Is `UNPROCESSED` supported? What do `getMicrophones()` and `MicrophoneInfo` report (sensitivity, maximum SPL)? Which effects are available, and which are enabled by default, for each source?
2. **Quality per route on the subway set.** For the phone mic with `VOICE_RECOGNITION`, `UNPROCESSED` and `VOICE_COMMUNICATION`, and for the earbuds: the bandwidth (the band levels from the Exercise script), the estimated SNR, the clipped samples, and the **CER** (character error rate, the usual score for Korean) per route and environment tag (S-3).
3. **Level calibration.** Note the phone SPL app reading and the file's dBFS for the same steady sound. This maps dBFS back to dB SPL and checks the headroom of worked example 1.
4. **Bluetooth setup time and offset.** Time from requesting the headset route to the first non-silent buffer. A per-headset latency calibration comes later, and it must use the selected output, never a forced loudspeaker.
5. **A 48 kHz comparison arm (a proposal, not a decision).** The research notes suggest keeping the best raw stream when the route supports more than 16 kHz [H]. A few 48 kHz recordings, downsampled on the server, would show whether this changes the CER. The MVP stays at 16 kHz unless the user decides otherwise.

## Read or watch

- Android, *Compatibility Definition Document* (Android 17), §5.4 "Audio Recording" and §5.11 "Capture for Unprocessed": https://source.android.com/docs/compatibility/17/android-17-cdd
- Android Developers, the `MediaRecorder.AudioSource` reference (the source presets): https://developer.android.com/reference/android/media/MediaRecorder.AudioSource, and `NoiseSuppressor` (how an effect attaches and how to check it): https://developer.android.com/reference/android/media/audiofx/NoiseSuppressor
- Android Developers, *Bluetooth Low Energy Audio overview* (LC3, 32 kHz capture, `setCommunicationDevice`): https://developer.android.com/develop/connectivity/bluetooth/ble-audio/overview
- Android Developers (video), *Supporting BLE Audio in your voice communication applications*: https://www.youtube.com/watch?v=cXl9fUyW6FM
- TDK InvenSense (video, vendor), *Digital MEMS Microphones Explainer*: https://www.youtube.com/watch?v=MzolAmXYf90
- FFmpeg documentation, *ffprobe* and the *resampler* options, including soxr: https://ffmpeg.org/ffprobe.html and https://ffmpeg.org/ffmpeg-resampler.html
- OpenAI Whisper, `audio.py`, a short file that shows exactly what an ASR model expects (16 kHz mono float, log-mel): https://github.com/openai/whisper/blob/main/whisper/audio.py
- Khare, Sundaram and Wu (Amazon, 2020), *Multi-channel acoustic modeling using mixed bitrate Opus compression* *(paper)*; Table 1 gives WER against bitrate: https://arxiv.org/abs/2002.00122

## Exercise (1 h)

Goal: see the route in the data. Use the learning venv (`source ~/audio-learn/bin/activate`; see the [curriculum README](README.md)).

1. **Record.** Choose one sentence in Korean and English with many s-sounds, for example "세 시 삼십 분, 3번 펌프 압력 센서 점검. Check the pressure sensor on pump three." Say it on the subway, or at home with noise playing from a *separate* device at about 75 dBA on a phone SPL app. Record it twice: (a) with the phone mic, phone held at about 30 cm; (b) with the earbuds, in a recorder app that can select the Bluetooth microphone. Put the route in the file name (`phone.m4a`, `buds.m4a`).
2. **Keep the files local.** Copy them to a folder outside the repository, for example `~/recordings/lecture10/`. Recordings are never committed.
3. **Inspect** both files with the ffprobe command from section 6, and note the codec, sample rate and channels. Convert them to WAV *at the native rate* for Python: `ffmpeg -i phone.m4a -c:a pcm_s16le phone.wav` (no `-ar`).
4. **Compare spectrograms:** `ffmpeg -i buds.wav -lavfi showspectrumpic=s=1024x512:legend=1 buds.png`. A narrowband link shows a flat ceiling near 4 kHz (CVSD), a wideband link near 8 kHz (mSBC), and LE Audio or LC3-SWB near 16 kHz. The phone mic recorded at 48 kHz may reach 20 kHz.
5. **Estimate SNR and bandwidth** with the script below: `python snr_bw.py phone.wav`. It treats the quietest 20% of 20 ms frames as noise and the loudest 10% as speech plus noise. On synthetic test files with known SNR it read within about 3 dB: good enough to compare routes, not an absolute measurement. A band more than about 40 dB below the 0.3–3 kHz level is empty: the route cut it off.
   ```python
   import sys, numpy as np, soundfile as sf, scipy.signal as sg
   x, fs = sf.read(sys.argv[1], always_2d=True); x = x[:, 0]           # first channel, native rate
   x = sg.sosfilt(sg.butter(4, 80, "highpass", fs=fs, output="sos"), x)  # drop DC and rumble < 80 Hz
   # 1) SNR from 20 ms frame powers: quiet frames = pauses (noise), loud frames = speech + noise
   hop = int(0.02 * fs); n = len(x) // hop
   p = np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12
   p_noise, p_loud = np.percentile(p, 20), np.percentile(p, 90)
   print(f"estimated SNR {10 * np.log10(max(p_loud - p_noise, 1e-12) / p_noise):.1f} dB")
   # 2) Bandwidth: average level of each band relative to the 0.3-3 kHz speech core
   f, P = sg.welch(x, fs, nperseg=1024)
   level = lambda lo, hi: 10 * np.log10(P[(f >= lo) & (f < hi)].mean() + 1e-20)
   for lo, hi in [(4500, 7000), (8500, 14000), (16500, 20000)]:
       if hi <= fs / 2:
           print(f"{lo/1000:g}-{hi/1000:g} kHz: {level(lo, hi) - level(300, 3000):6.1f} dB")
   ```
6. **Write down** which route had the higher SNR, which had the wider bandwidth, and which you expect to transcribe better, and why. Keep the note: the ASR bake-off will check your prediction.
