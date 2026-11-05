# 11. Noise reduction in hardware and software (and when speech recognition does not want it)

**Why this lecture.** Our field voice logging app records on an Android phone, earbuds or a headset, and a self-hosted RTX 4090 server transcribes ([MVP requirements](../../products/industrial-voice-logging/mvp-requirements.md)). It has to work on a subway, where Korean cars measure about 72–79 dBA, and later in factories at 85–100 dBA. (**dBA** is a sound level in decibels with **A-weighting**, a filter that copies the ear's weaker response to bass; lecture 01.) Our [research note](../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md) (sections Q4, Q5 and Q7) found two things that surprise most engineers:
- a denoiser placed in front of a modern speech recogniser usually makes the transcript *worse*;
- the microphone, and how close it sits to the mouth, matters more than any software.

This lecture explains both from the physics up. Lecture 05 already covers masks, the Wiener filter and MVDR beamforming; lecture 07 §1 covers RNNoise, DeepFilterNet and commercial enhancers; and [lecture 10](10-capture-chain.md) follows the capture chain (microphones, Bluetooth codecs, Android audio sources). We link to them and go deeper on what is new here.

**Labels** (as in the research note): **[F]** verified on a primary source; **[V]** vendor claim; **[P]** paper or third-party report; **[E]** our estimate; **[H]** our hypothesis. Facts were checked on 2026-11-05.

**Words you will meet in this lecture** (each is explained again where it first appears):

| Term | Plain meaning |
|---|---|
| ANC (active noise cancellation) | Headphones play an "anti-noise" wave so that noise cancels at *your* ear. It protects the listener |
| Uplink noise suppression, "ENC" | Cleaning the *microphone* signal before it goes to a call partner or a recogniser. ENC (environmental noise cancellation) is a marketing name for it |
| Passive isolation, NRR | Blocking sound with mass and seals (ear cups, ear tips, plugs). NRR (noise reduction rating) is the US lab rating of a hearing protector, in dB |
| Transparency (ambient) mode | Earbuds replay outside sound through their own mics so you can hear your surroundings |
| SNR (signal-to-noise ratio) | Speech power divided by noise power, in dB. 0 dB means equal power; +10 dB means the speech has 10 times the noise power |
| Anti-phase | A copy of a wave shifted by half a cycle (180°), so peaks meet troughs |
| Beamforming | Combining several mics so the group listens in one direction, like a phased-array radar |
| Differential array | Subtracting (instead of adding) slightly delayed mic signals, to get a directional pattern from a tiny array |
| Directivity index (DI) | How much a pickup favours the front over sound arriving equally from all directions, in dB |
| Diffuse noise | Noise arriving from all directions at once with random phases, as in a reverberant subway car |
| Coherence | A 0-to-1 measure, per frequency, of how linearly related two signals are. The same sound at two mics gives near 1; wind turbulence gives near 0 |
| VPU (voice pickup unit) | An accelerometer that feels your voice as vibration of the skull or ear canal (bone conduction) |
| Close-talk mic | A mic held within a few centimetres of the mouth, such as a headset boom |
| Musical noise | The twinkling, chirpy residue that crude denoisers leave behind |
| A priori / a posteriori SNR | The per-bin SNR you *believe* (estimated and smoothed) versus the one you *measure* in the current frame |
| VAD (voice activity detection) | A detector that labels each short frame "speech" or "no speech" |
| WER / CER | Word / character error rate of a transcript: (substitutions + deletions + insertions) / reference length. CER is used for Korean |
| PESQ, STOI, DNSMOS | Scores that predict how good or how intelligible audio is *for a human listener* (lecture 05 §6) |
| Distribution shift | Test data that look different from the training data, so a model behaves unpredictably |

## 1. Four different things called "noise cancelling"

Spec sheets that say "ANC + ENC" describe two separate systems. Keep four ideas apart:

| Name | Whose problem it solves | Where it acts | Helps our transcripts? |
|---|---|---|---|
| ANC | The wearer's ears | Sound field inside the ear cup or ear canal | No. The voice mic still hears all the noise (section 2) |
| Uplink suppression (ENC, Qualcomm cVc) | The far end: call partner or recogniser | DSP inside the earbud or phone, on the mic signal | Beamforming yes; aggressive suppression can hurt (section 7) |
| Passive isolation, hearing protection | The wearer's hearing | Ear cups, tips, plugs | Not for the mic. Hearing protection is expected from about 85 dBA |
| Transparency mode | The wearer's awareness | Outside mics replayed into the ear with low delay | No |

**cVc** ("Clear Voice Capture") is Qualcomm's uplink package of dual-mic beamforming, echo cancellation and noise suppression, found in many earbuds [V]. It is **DSP** (digital signal processing: filters and transforms on a small chip) that runs *inside the headset*, before the audio reaches the phone, so our app cannot switch it off.

**Worked example: what an earmuff does at 95 dBA.** The NRR is measured in a lab against C-weighted noise. For an A-weighted site level, the usual US rules of thumb are [P] ([Canadian Audiologist](https://canadianaudiologist.ca/the-infamous-nrr-new-derating/), [Wikipedia](https://en.wikipedia.org/wiki/Hearing_protection_device)):
- OSHA: subtract 7 dB, then halve for real-world fit. A Peltor-class earmuff rated NRR 28 [V] gives 95 − (28 − 7)/2 = **84.5 dBA** at the ear.
- NIOSH: derate earmuffs by 25%, then subtract 7: 95 − (0.75 × 28 − 7) = **81 dBA**.
- Either way, the boom mic sits *outside* the cup and still hears 95 dBA. Hearing protection protects ears, not recordings.

## 2. ANC physics: anti-phase sound

**Superposition.** Sound pressures add linearly (lecture 01). If a speaker produces p_anti = −p_noise at the ear, the sum is zero. The hard part is making the anti-noise *exactly* opposite: same amplitude, half a cycle shifted, at the right place and time.

**Three designs:**
- **Feedforward.** An outside **reference mic** hears the noise before it reaches the ear. A filter predicts the noise at the ear and drives the speaker. It is open-loop, so it is stable, but it depends on a good model of the acoustic path.
- **Feedback.** An inside **error mic** next to the speaker measures what is left, and a controller drives the speaker to push it to zero. It is a servo loop. As in any feedback loop, delay limits the gain, and Bode's sensitivity integral (the "waterbed effect") says that pushing noise down in one band pushes it up in another.
- **Hybrid.** Both together. Adaptive versions tune the filter continuously with **FxLMS** (filtered-x least mean squares: gradient descent on the error-mic power, with the reference signal filtered through a model of the speaker-to-mic path).

**The mechanical analogy.** This is active vibration control. An active engine mount or an active isolation table uses a reference accelerometer (feedforward), an error accelerometer (feedback) and a shaker. FxLMS is used in both fields, and the limits are the same: actuator dynamics, sensor-to-actuator delay, and the size of the region you can quiet compared with the wavelength.

**Worked example: how precise must the anti-noise be?** Let the anti-noise have the right amplitude but a phase error φ. The residual is |1 − e^{iφ}| = 2 sin(φ/2) of the original:

| Phase error φ | Residual | Noise reduction |
|---|---|---|
| 5° | 0.087 | −21.2 dB |
| 10° | 0.174 | **−15.2 dB** |
| 20° | 0.347 | −9.2 dB |
| 60° | 1.000 | 0 dB: no benefit. Beyond 60°, ANC *adds* noise |

An amplitude error of 1 dB alone limits the result to −19.3 dB; 10° and 1 dB together give −14.1 dB. ANC is a precision-matching problem.

**Worked example: the latency budget.** A timing error τ becomes a phase error φ = 360° · f · τ, which grows with frequency. An ams engineering article notes that with the mic 0.7 cm from the speaker, sound takes about 20 µs, and the whole digital chain must beat that [V]. If the anti-noise arrives 20 µs late:

| Frequency | 100 Hz | 1 kHz | 4 kHz | 8 kHz |
|---|---|---|---|---|
| Phase error | 0.7° | 7.2° | 28.8° | 57.6° |
| Best possible reduction | −38 dB | −18 dB | −6 dB | −0.3 dB |

For random, unpredictable noise, no filter can make up for a fixed delay at high frequencies. Low-frequency drone, such as subway rumble or engine hum, is where ANC shines.

**Worked example: wavelength and the zone of quiet.** A classic result in active control (Elliott and colleagues) is that cancelling at one point gives a 10 dB "zone of quiet" only about **λ/10** across [P]. The wavelength is λ = c/f with c = 343 m/s:

| Frequency | 100 Hz | 1 kHz | 4 kHz |
|---|---|---|---|
| Wavelength λ | 3.43 m | 34 cm | 8.6 cm |
| 10 dB zone (λ/10) | 34 cm | 3.4 cm | 0.9 cm |

The ear canal is about 2.5 cm long. At 4 kHz the quiet zone around the error mic does not even reach the eardrum. So ANC hands over to passive isolation above roughly 1 kHz. Typical figures from the same article [V]: feedback ANC up to about 20 dB below about 1 kHz; feedforward over 25 dB in its best bands, up to about 4 kHz; passive isolation 20–30 dB above a few kHz ([Electronic Design / ams](https://www.electronicdesign.com/technologies/analog/article/21789816/challenges-await-in-noise-cancelling-headset-design)).

**Why ANC does little for what the mic records.** ANC quiets a few cubic centimetres inside the ear cup. The voice mic on the stem or boom sits outside, in the full ambient field. ANC helps the *wearer*; uplink processing (section 3) is a separate system.

## 3. Microphone arrays and beamforming

Lecture 04 introduced polar patterns (cardioid = (1 + cos θ)/2), and lecture 05 §5 introduced delay-and-sum and MVDR. Here are the numbers for the tiny arrays in phones and earbuds, which have 2–3 mics each.

**Delay-and-sum.** Delay each mic so a wave from the target direction lines up, then add. The target adds in phase; other directions partly cancel.

**Worked example: two mics 15 mm apart.** The largest possible delay, for sound travelling along the line of the mics, is τ = d/c = 0.015 / 343 = **43.7 µs**. At 16 kHz sampling one sample lasts 62.5 µs, so this is 0.7 of a sample. Beamformers therefore use fractional-delay filters, or phase shifts in the STFT domain. In phase terms:
- at 1 kHz, 2π f τ = **15.7°**. A delay-and-sum beam aimed forward attenuates sound from directly behind by only |cos 15.7°| = 0.96, that is **−0.3 dB**;
- at 4 kHz the phase is **63°**, and the rear attenuation becomes |cos 63°| = 0.45, or −6.9 dB.

Summing only works when the array spans about half a wavelength or more (17 cm at 1 kHz). A 15 mm pair is nearly omnidirectional for summing.

**Differential arrays: subtract instead of add.** The mics sit along the line pointing at the mouth (an **endfire** array; **broadside** means perpendicular to that line). Take y(t) = x_front(t) − x_rear(t − d/c). Sound from behind reaches the rear mic first, and after the delay it exactly matches the front mic, so it cancels. The result is an electronic cardioid. The price is the on-axis response, 2 sin(2π f d/c) relative to one mic: **−25.2 dB at 100 Hz**, −5.3 dB at 1 kHz and +5.0 dB at 4 kHz.

The response rises 6 dB per octave, like a differentiator, so it must be equalised. At 100 Hz the EQ adds 25 dB, and the self-noise of two mics (uncorrelated, so +3 dB) is boosted with it: about **28 dB more hiss at 100 Hz** than a single mic. This is the central trade-off of small arrays.

**Directivity index (DI).** In diffuse noise, the SNR gain of a beam aimed at the talker equals its DI:

| Pattern | DI | Note |
|---|---|---|
| Omni | 0 dB | One mic |
| Delay-and-sum, 2 mics 15 mm apart | 0.1 dB at 1 kHz, 1.7 dB at 4 kHz | Too small to sum |
| Cardioid | 4.8 dB | First-order differential, 2 mics |
| Hypercardioid | 6.0 dB | The best any 2-mic first-order array can do |
| Second-order, 3 mics | up to 9.5 dB | Much worse self-noise and mismatch sensitivity |

**Diffuse noise and coherence.** For diffuse noise, the coherence between two mics a distance d apart is sin(kd)/(kd), where k = 2πf/c:
- d = 15 mm: 0.987 at 1 kHz and 0.81 at 4 kHz. The two mics hear almost the *same* noise, so averaging cannot remove it; only subtraction (differential or superdirective processing) can.
- d = 15 cm (a laptop or meeting bar): 0.14 at 1 kHz. The noise is nearly independent at each mic, so summing N mics gains up to 10·log₁₀ N dB (3 dB for 2).
- **MVDR** (lecture 05) with a diffuse-noise covariance gives exactly this superdirective solution. For two close mics it is the hypercardioid. Real designs add **diagonal loading** (a small constant on the covariance diagonal), giving up some DI in exchange for robustness to mic mismatch and self-noise.

**Realistic gains [E].** Expect about 3–5 dB from a 2-mic phone or earbud beamformer in truly diffuse noise, and much more (10–20 dB) against a single source that sits in the null. For comparison, moving the mic from 30 cm to 2.5 cm from the mouth gains 20·log₁₀(30/2.5) = **21.6 dB**, at every frequency, with no artifacts.

**Wind.** Wind noise is turbulence: small eddies of pressure at the mic port, not a sound wave. Two ports 15 mm apart see largely independent eddies, so coherence is low, while real sound at low frequency is coherent. A differential array boosts uncorrelated low-frequency signals, as the 28 dB figure above shows, so wind roars. Devices therefore detect wind by low coherence and fall back to one mic, a high-pass filter or a VPU (a common design [E]).

## 4. Bone conduction and the voice pickup unit (VPU)

**What it is.** A VPU is a MEMS accelerometer pressed against the ear canal or skin. Your own voice shakes the skull; the 75 dBA around you hardly does. So the VPU is nearly immune to airborne noise, and to other people's voices. That also makes it a near-perfect **own-voice detector** for VAD.

**The catch: bandwidth.**
- Tissue acts as a low-pass filter, and the sensors are built for that band: Knowles specifies a 4 kHz sensor bandwidth for its V2S200D voice vibration sensor [V] ([LCSC listing](https://www.lcsc.com/product-detail/C20099439.html)).
- In earbuds it is worse: own-voice vibration of the earbud housing rolls off at about −93 dB per decade above 400 Hz [P] ([Weyer and Jax 2026, paper](https://arxiv.org/abs/2609.02165)). From 400 Hz to 4 kHz is one decade, so the signal falls 93 dB, and capturing anything above about 1 kHz needs a very quiet sensor.
- Sibilants such as s (Korean ㅅ, ㅆ) carry most of their energy above about 4 kHz. Bone-conducted speech therefore sounds muffled, as if spoken through a pillow, and consonants are lost.

**Fusion.** Systems combine the VPU's clean low band with an air mic's high band, either with a crossover somewhere around 1–2 kHz [E] or with a neural network that takes both signals. Evidence collected in the research note [P]:
- a bone-conduction sensor fused with an air mic cut CER by more than 20% (relative); at 68 dB noise the bone signal had more than 5 times the SNR (amplitude ratio) of the air mic ([PMC12195400](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12195400/));
- a bone-conduction mic with a denoising autoencoder reached 9.13% CER, against 58.75% for an air mic, in real 62–74 dBA noise ([NTU](https://scholars.lib.ntu.edu.tw/handle/123456789/488045)).

**Relatives in the field:**
- **Throat mics** (laryngophones) sit on the neck. They are used in military and motorsport, with the same band-limit trade-off.
- **Shokz-style headsets** use bone conduction for the *speaker*. The OpenComm2's microphone is an ordinary air boom with cVc [P]. Read "bone conduction" on a spec sheet carefully.
- **Industrial headsets** for 85–100 dBA, such as the 3M Peltor WS LiteCom Pro III, combine earmuffs (NRR 24–28 depending on variant) with a noise-cancelling dynamic boom mic [V]. The RealWear Navigator 520 claims speech recognition up to 100 dBA with 4 mics [V] ([specs](https://shop.realwear.com/pages/realwear-navigator-520-specifications)).

**Worked example: why a noise-cancelling boom works.** Its capsule is a pressure-gradient (differential) type, the proximity effect of lecture 04. For a point source at distance r, a gradient mic's output relative to a distant plane wave of the same pressure is √(1 + 1/(kr)²). At r = 2.5 cm (idealised point source [E]), the mouth gains over distant noise **+26.8 dB at 100 Hz**, +17.3 dB at 300 Hz, +7.6 dB at 1 kHz and +1.8 dB at 3 kHz.

This comes on top of the 21.6 dB level advantage of being close. It is largest exactly where subway and factory noise is strongest. It also explains why boom position matters: at 5 cm you lose 6 dB of level and part of this gradient bonus.

## 5. Classical software denoising

Setting: one mic, STFT X(m,k) = S(m,k) + N(m,k) (lecture 03), where m is the frame and k the frequency bin. A denoiser picks a gain 0 ≤ G(m,k) ≤ 1 per bin and outputs Ŝ = G·X. Everything below needs an estimate σ²(k) of the noise power in each bin.

**Spectral subtraction (power form).** G = √max(1 − α·σ²/|X|², G_min²), with an **oversubtraction factor** α ≥ 1 and a **spectral floor** G_min. Lecture 05 §2 gave the basic idea.

**Worked example: where musical noise comes from.** In a noise-only bin, |X|² fluctuates around its mean σ². For Gaussian noise it follows an exponential distribution, so P(|X|² > a·σ²) = e^(−a). Simulated with 2 million samples:

| α | Noise-only bins surviving each frame | Of 257 bins (512-point FFT) | Residual noise power |
|---|---|---|---|
| 1 | e^(−1) = 36.8% | about 95 | −4.3 dB |
| 2 | 13.5% | about 35 | −8.7 dB |
| 3 | 5.0% | about 13 | −13.0 dB |

- Each survivor is a blip 31 Hz wide and 32 ms long at a random frequency. Dozens of them per frame make the twinkling "musical" texture.
- Subtracting exactly the average noise (α = 1) makes the noise only 4.3 dB quieter while making it sound *worse*.
- Larger α eats speech too. A floor such as G_min = 0.1 (−20 dB) leaves a steady, quiet hiss instead of blips, which ears tolerate much better.

**The Wiener gain** (lecture 05): G = ξ/(1 + ξ), where ξ is the **a priori SNR** of the bin.

| ξ | −10 dB | 0 dB | 10 dB | 20 dB |
|---|---|---|---|---|
| Wiener gain G | 0.091 (−20.8 dB) | 0.50 (−6.0 dB) | 0.909 (−0.8 dB) | 0.99 (−0.1 dB) |

At 0 dB the speech in that bin is cut by 6 dB along with the noise. Wherever speech and noise overlap, denoising removes speech.

**MMSE-STSA and LSA (Ephraim–Malah, 1984–85), intuitively.**
- **The question.** Instead of plugging one noisy measurement into a formula, ask: "given what I measured and what I believe, what is the expected clean amplitude?" It is a Bayesian estimator, like a Kalman update. **MMSE-STSA** minimises the error of the amplitude; **LSA** minimises the error of its logarithm, closer to how we hear.
- **Two inputs.** The **a posteriori SNR** γ = |X|²/σ² is measured in this frame. The **a priori SNR** ξ is believed, using the **decision-directed** rule ξ̂(m) = 0.98·|Ŝ(m−1)|²/σ² + 0.02·max(γ(m) − 1, 0).
- **Why it removes musical noise.** ξ̂ is mostly last frame's result, so a random one-frame spike in γ cannot open the gate, and isolated blips do not appear (Cappé 1994).
- **Numbers.** The LSA gain is G = ξ/(1+ξ) · exp(½·E₁(v)), with v = ξγ/(1+ξ) and E₁ the exponential integral. At ξ = −10 dB and γ = 1 it gives **0.24**, against Wiener's 0.09. At ξ = 0 dB and γ = 2 it gives 0.56 against 0.50; at ξ = 10 dB (γ = 11) both give 0.91. LSA suppresses *less* when unsure, accepting a little noise for fewer artifacts.

**Tracking the noise floor σ².**
- **VAD-gated averaging.** Update σ²(m) = β·σ²(m−1) + (1 − β)·|X|² only in frames the VAD calls noise. With β = 0.98 and a 16 ms hop, the time constant is 0.016/0.02 = 0.8 s. The weak point is VAD errors in loud noise: in one test Silero VAD v5 passed up to about 40% of pure-noise clips as speech [P].
- **Minimum statistics** (Martin, 2001). Speech has gaps between syllables, so the minimum of the smoothed power in each bin over about 1.5 s sits near the noise floor. Multiply it by a bias correction, because a minimum is lower than a mean. It needs no VAD, but it follows rising noise (a train entering a tunnel) with a lag of 1–2 s.
- **The cheapest denoiser** is a high-pass filter at 80–100 Hz. Subway noise is strong near 8 Hz and 20–80 Hz [P], while voice fundamentals start around 85 Hz for low male voices. It is linear and mild, so it is a safe candidate, but it still has to be tested [H].

## 6. Neural denoisers, products and metrics

- **RNNoise and DeepFilterNet** (lecture 07 §1): small real-time networks that predict per-band gains or complex filters.
- **Microsoft DNS Challenge** (Deep Noise Suppression, 2020–2023): open training data, an NSNet baseline model and the DNSMOS metric ([repo](https://github.com/microsoft/DNS-Challenge)). The 2023 edition scored **word accuracy alongside listening scores** [F]: good-sounding and recognisable are different goals.
- **Products [V]:** Krisp (calls and voice agents); NVIDIA Broadcast and the Maxine SDK (Background Noise Removal, Studio Voice); Apple's Voice Isolation mic mode for calls and recordings in supported apps ([Apple](https://support.apple.com/101993)); earbud uplink DSP such as cVc.
- **Generative "studio" enhancers** (Adobe Enhance Speech, NVIDIA Studio Voice, ElevenLabs Voice Isolator; lectures 07 and 08) re-synthesise the voice. In very noisy stretches they can produce plausible but wrong sounds. For an evidence log, that output is a reconstruction, not a record.

**Metrics: what each one rewards.**

| Metric | Measures | Needs a clean reference? | Designed to predict WER? |
|---|---|---|---|
| PESQ | Perceived call quality | Yes | No |
| STOI | Intelligibility for human listeners | Yes | No |
| DNSMOS (P.835: SIG, BAK, OVRL) | Predicted listener ratings of speech, background and overall | No | No. BAK rewards a quiet background |
| SI-SDR | Waveform fidelity (lecture 05) | Yes | No |
| WER / CER | What the recogniser got right | Needs a reference transcript | It *is* the target |

A sharp example: MetricGAN+ ([paper](https://arxiv.org/abs/2104.03538)) is trained to maximise PESQ, and it is the enhancer that raised WER in every configuration of the study in section 7.

## 7. Enhancement versus ASR: the key section

**Why denoising often raises WER for modern ASR:**
1. **Artifacts.** Where the mask is wrong it carves holes in speech (missing consonant energy), leaves blips or smears onsets. Iwamoto et al. split enhancement errors into a noise part, a speech-scaling part and an **artifact** part (anything that is not a linear mix of speech and noise). Artifacts were the main cause of ASR degradation [P] ([paper](https://arxiv.org/abs/2201.06685)).
2. **Distribution shift.** Whisper was trained on 680,000 hours of diverse web audio [F] ([paper](https://arxiv.org/abs/2212.04356)). Cohere Transcribe was trained at 0–30 dB SNR [V], and Qwen3-ASR reports strong extreme-noise results [V]. For these models noisy speech is familiar, while "enhanced" speech with spectral holes and gating is a new kind of audio.
3. **No new information.** A single-mic denoiser sees the same signal as the recogniser. It can only throw information away (the data-processing inequality of information theory). The recogniser already learned its own implicit denoising, tuned for recognition rather than for ears.
4. **Silent failures.** Over-suppression shows up as **deletions**, missing words, which are harder to spot than garbled words. Krisp makes the same point about its own product [V].

**Evidence** (from research note Q4 unless linked):

| Study | Setup | Result |
|---|---|---|
| *When De-noising Hurts* (2025) [P] | MetricGAN+ before Whisper, Parakeet, Gemini Flash 2.0, Parrotlet-a; 500 medical recordings | Raw audio better in **all 40** configurations; error rate up by 1.1–46.6 points ([paper](https://arxiv.org/abs/2512.17562)) |
| *Where Speech Enhancement Hurts Recognition* (2026) [P] | FRCRN; mask strength α scaled at inference | Whisper 6.44 → **5.57** at weak α = 0.25, back to 6.46 at full α = 1. wav2vec2.0 17.13 → 10.20 ([paper](https://arxiv.org/abs/2607.11157)) |
| SAM Audio before Whisper [P] | Separation as a front-end | Cleaner sound, higher WER/CER |
| Bridge module (2024) [P] | CMGAN/DEMUCS + Whisper | Helped, mostly for small Whisper models |
| Noise-augmented fine-tuning [P] | Whisper-medium, sung lyrics, −5 to 5 dB | 18.05% WER, against 63.45% with an enhancement module |
| Korean defence voice commands [P] | Denoiser before Whisper | A 6.17% CER reduction. It conflicts with the rest; results depend on the denoiser and noise |
| Krisp Voice Isolation benchmark [V] | 265 real recordings, 11 recogniser setups | Competing-voice audio: pooled WER 23.24% → 6.24%. Phone calls with noise but no competing voice: 3.48% → **3.91%** ([blog](https://krisp.ai/blog/voice-isolation-benchmark/)) |

**When it does help:**
- weak or older recognisers (small Whisper, wav2vec2.0);
- very low SNR, where the recogniser has already collapsed;
- **interfering speech**. A recogniser transcribes anything that sounds like words, so removing a neighbour's voice or a platform announcement removes insertions. That is Krisp's big win above;
- **weak or blended enhancement**: partial masks, or "observation adding", which mixes some of the raw signal back into the output and dilutes artifacts [P].

**Worked example: the better lever is the microphone [E].** Combine speech levels at 0.3 m (normal 70, raised 76, loud 82, shout 88 dB [P]) with distance: about +8 dB for an earbud stem (research-note estimate) and +20 dB for a boom at 2–3 cm:

| Situation | Phone at 30 cm | Earbud stem | Boom at 2–3 cm |
|---|---|---|---|
| Subway 75 dBA, raised voice | +1 dB | +9 dB | +21 dB |
| Subway 75 dBA, loud voice | +7 dB | +15 dB | +27 dB |
| Factory 95 dBA, shouting | −7 dB | +1 dB | +13 dB |

Parakeet-TDT-0.6B-v3 publishes its average WER against SNR in MUSAN noise [V]: 6.34% clean, 7.12% at 10 dB, 8.23% at 5 dB, 11.66% at 0 dB, 19.88% at −5 dB ([model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)). A phone in a factory sits below 0 dB, where every model degrades badly. A boom moves the same speech to about +5 to +15 dB, where the model loses only 1–2 points. No single-mic software offers +20 dB without artifacts. (These are broadband dBA estimates. Subway noise is concentrated below 100 Hz, so the SNR within the speech band is somewhat better [H].)

**The second lever: noise-augmented fine-tuning.** Mix recorded subway or factory noise into clean speech, and our own speech, at −5 to +10 dB, then fine-tune the server model. The model learns the noise, instead of a denoiser guessing what to delete.

**Rule of thumb for our app:**
1. Feed the recogniser the least-processed, closest-talk audio we have.
2. Use enhancement only for human listening and playback, never as the default ASR input.
3. Always keep the raw audio. An enhanced file is a derived copy.
4. If we try enhancement for ASR, test weak or blended versions as an A/B arm and judge them by CER/WER, never by ear.

## 8. In our app

| Lever | MVP choice | Why |
|---|---|---|
| Android capture source | `UNPROCESSED` where supported, otherwise `VOICE_RECOGNITION` (lecture 10 §4 and §7). `VOICE_COMMUNICATION` only as a test arm | The compatibility rules (CDD) allow no processing at all on `UNPROCESSED`, which is optional, and require noise reduction and AGC (automatic gain control) to be **off by default** on `VOICE_RECOGNITION` [F]. `VOICE_COMMUNICATION` is the call path: it "will for instance take advantage of echo cancellation or automatic gain control" [F]. Lecture 10 works through the levels and headroom |
| Bluetooth route | Log route, codec and enabled effects per segment (requirement A3) | Headset DSP (such as cVc) runs before the phone and cannot be switched off. A narrowband CVSD link stops at about 4 kHz (lecture 10 §3) |
| Capture start | Push-to-talk by default (A2) | No noise-only segments, so fewer VAD false triggers and fewer hallucinated words (research note Q5) |
| Subway | Earbuds with stem mics, on a wideband link | About +8 dB over a phone in the hand [E]; lecture 10 estimates about 9 dB |
| Above 85 dBA | Boom headset with earmuffs (Peltor class) | Protective equipment anyway, plus a close-talk boom: about +20 dB [E] |
| Server ASR input | The raw 16 kHz segment, no denoiser | Section 7 |
| Enhanced playback | Optional toggle. The server makes a denoised *listening* copy (for example with DeepFilterNet), marked as derived | Never fed to ASR by default. The raw file's hash stays the record (A3, A9) |

**Week-1 A/B tests** (with the noisy-subway set of MVP §3.3 and the CER/WER loop of S-3). Judge only by CER/WER and no-speech flags, and run one heavy job at a time on the server:
1. **Capture source and route** (shared with lecture 10's week-1 list): `UNPROCESSED`, `VOICE_RECOGNITION` and `VOICE_COMMUNICATION` on the phone mic, and the earbuds; later a boom headset. Use the same scripted Korean, English and mixed phrases.
2. **Server front-end:** raw vs 80 Hz high-pass vs DeepFilterNet vs DeepFilterNet blended with the raw signal.
3. **Capture mode:** push-to-talk vs an armed VAD session. Count no-speech and hallucinated segments.
4. **Context:** a phone SPL-app reading per session. Optionally record a 10 s noise-only clip for later fine-tuning, only when nobody nearby is talking, and under the same privacy rules as memos.

## Read or watch

- Audio University, *How Do Microphone Polar Patterns Work?* (video): cardioid and friends, the patterns a differential array builds electronically: https://www.youtube.com/watch?v=qV6mxPpqTv0
- Andrew Greensted, *Delay Sum Beamforming* (The Lab Book Pages): beam patterns, frequency dependence, spacing and grating lobes, with plots: http://www.labbookpages.co.uk/audio/beamforming/delaySum.html
- Oliver Jones (ams), *Challenges Await In Noise-Cancelling Headset Design* (Electronic Design; a vendor engineer's article): feedforward vs feedback, frequency ranges, the 20 µs budget: https://www.electronicdesign.com/technologies/analog/article/21789816/challenges-await-in-noise-cancelling-headset-design
- Rivera Benois, Nowak and Zölzer, *Hybrid Active Noise Control Structures: A Short Overview* (paper; short, with block diagrams for headphones): https://www.hsu-hh.de/ant/wp-content/uploads/sites/699/2019/01/Hybrid-Active-Noise-Control-Structures_-A-Short-Overview-Rivera-Nowak-Zoelzer.pdf
- Olivier Cappé, *Elimination of the musical noise phenomenon with the Ephraim and Malah noise suppressor* (paper; the clearest explanation of the decision-directed rule): https://www.di.ens.fr/olivier.cappe/Publications/Self-archive/ephma94.pdf
- Iwamoto et al., *How Bad Are Artifacts?: Analyzing the Impact of Speech Enhancement Errors on ASR* (paper): https://arxiv.org/abs/2201.06685
- Krisp, *Voice Isolation Benchmark* (vendor blog; read it critically, including the cases where WER got worse): https://krisp.ai/blog/voice-isolation-benchmark/
- Android Compatibility Definition, §5.4.2 *Capture for Voice Recognition* and §5.11 *Capture for Unprocessed*: https://source.android.com/docs/compatibility/16/android-16-cdd#542_capture_for_voice_recognition

## Exercise (1 h)

1. **Set up** `~/audio-learn` as in the [README](README.md), and run the script from the repository root.
2. **Clean speech and noise.** The script uses a Korean Zeroth clip, `tools/separation-lab/data/zeroth/test_data_01/003/105/105_003_2246.flac` (18.7 s, 16 kHz). For English, use `tools/separation-lab/data/librispeech/LibriSpeech/test-clean/1089/134686/1089-134686-0000.flac` (10.4 s). The noise is a synthetic rumble (57% of its power lies below 100 Hz, like subway noise), or set `NOISE` to your own subway recording.
3. **Run it**, then listen on headphones at a comfortable volume to `noisy_*` and `specsub_*` at 0, 5 and 10 dB. With α = 1 and no floor, listen for the twinkling musical noise. Compare it with the floor of 0.1.
4. **Look** at `spectrograms.png`. Speckles in the pauses are musical noise; gaps in the high-frequency consonants are speech the denoiser removed. The script prints the noise drop in the pause. Across random seeds we measured −4 to −5 dB for α = 1 and −8 to −10 dB for α = 2, close to section 5's −4.3 and −8.7 dB.
5. **Optional: DeepFilterNet.** Download the prebuilt `deep-filter-0.5.6-x86_64-unknown-linux-musl` binary from https://github.com/Rikorose/DeepFilterNet/releases, save it as `~/audio-learn/deep-filter` and `chmod +x` it (it carries its own model and needs no PyTorch; it accepts only 48 kHz WAV, hence the `_48k` files). Check `free -h` first, run one heavy job at a time, and cap memory:
   `mkdir -p ~/audio-lab11/dfn && systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 ~/audio-learn/deep-filter -D -o ~/audio-lab11/dfn ~/audio-lab11/noisy_5dB_48k.wav`
6. **Answer:** which version would you rather *listen* to, and which would you feed a recogniser? Why might the answers differ?

All recordings and outputs stay in `~/audio-lab11`, outside the repository. Never commit them.

```python
from pathlib import Path
import numpy as np, soundfile as sf, matplotlib.pyplot as plt
from scipy.signal import stft, istft, resample_poly

CLEAN = "tools/separation-lab/data/zeroth/test_data_01/003/105/105_003_2246.flac"
NOISE = None                      # or the path to your own subway recording
OUT = Path.home() / "audio-lab11"; OUT.mkdir(exist_ok=True)   # outside the repo
rng = np.random.default_rng(0)

s, fs = sf.read(CLEAN)                                          # 16 kHz mono
s = np.concatenate([1e-5 * rng.standard_normal(int(0.7 * fs)), s])  # 0.7 s with no speech
if NOISE:                         # own recording: mono, resampled, looped to length
    n, nfs = sf.read(NOISE); n = n.mean(axis=1) if n.ndim > 1 else n
    noise = np.resize(resample_poly(n, fs, nfs), len(s))
else:                             # white noise tilted -4.5 dB/octave above 50 Hz: a rumble
    spec = np.fft.rfft(rng.standard_normal(len(s)))
    f = np.maximum(np.fft.rfftfreq(len(s), 1 / fs), 50.0)      # flat below 50 Hz
    noise = np.fft.irfft(spec * (f / 1000) ** (-4.5 / 6.02), len(s))

def mix_at_snr(s, noise, snr_db):
    g = np.sqrt(np.sum(s**2) / (np.sum(noise**2) * 10 ** (snr_db / 10)))
    return s + g * noise

def spectral_subtraction(x, alpha=2.0, floor=0.0, noise_sec=0.5):
    t, X = stft(x, fs, nperseg=512, noverlap=384)[1:]          # 32 ms window, 8 ms hop
    P = np.abs(X) ** 2
    sigma2 = P[:, t < noise_sec].mean(axis=1, keepdims=True)   # noise PSD from the lead-in
    G = np.sqrt(np.maximum(1 - alpha * sigma2 / np.maximum(P, 1e-12), floor**2))
    return istft(G * X, fs, nperseg=512, noverlap=384)[1][: len(x)]

pause = slice(1000, int(0.6 * fs))
for snr in [0, 5, 10]:
    x = mix_at_snr(s, noise, snr); x *= 0.9 / np.max(np.abs(x))
    sf.write(OUT / f"noisy_{snr}dB.wav", x, fs)
    sf.write(OUT / f"noisy_{snr}dB_48k.wav", resample_poly(x, 3, 1), 48000)  # DeepFilterNet
    for alpha, floor in [(1, 0), (2, 0), (2, 0.1)]:
        y = spectral_subtraction(x, alpha, floor)
        sf.write(OUT / f"specsub_{snr}dB_a{alpha}_f{floor}.wav", y, fs)
        drop = 10 * np.log10(np.mean(y[pause] ** 2) / np.mean(x[pause] ** 2))
        print(f"{snr:>2} dB SNR, alpha={alpha}, floor={floor}: pause noise {drop:5.1f} dB")

x = mix_at_snr(s, noise, 5); y = spectral_subtraction(x)
fig, ax = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
for a, sig, name in zip(ax, [s, x, y], ["clean", "noisy, 5 dB SNR", "spectral subtraction"]):
    a.specgram(sig, NFFT=512, Fs=fs, noverlap=384, cmap="magma", vmin=-120); a.set_title(name)
fig.tight_layout(); fig.savefig(OUT / "spectrograms.png", dpi=120); plt.show()
```
