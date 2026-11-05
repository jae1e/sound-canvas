# 04. Audio engineering in practice

This lecture covers how real recordings are made and mixed. Separation is the **inverse problem**: undoing a mix. You can't invert a process you don't understand.

- **Forward problem:** you know the cause and compute the effect. Sources go in, a mix comes out.
- **Inverse problem:** you see the effect and must find the cause. You have the mix and want the sources.
- Mechanical analogy: computing the vibration of a structure from the forces is the forward problem. Finding the forces from measured vibration is the inverse problem. It is harder, and it only works if you know how the structure behaves.
- Here the "structure" is the chain of microphones, effects and mixing steps described below.

## 1. Microphones

A microphone is a **transducer**: a sensor that turns sound pressure (a mechanical quantity) into an electrical voltage. Every microphone has a thin, light membrane called the **diaphragm**. Sound pressure pushes the diaphragm, and the microphone converts that motion into a voltage. The two main types differ in how they convert the motion.

**Dynamic and condenser microphones.**
- **Dynamic** mics are the "coil and magnet" type.
  - The diaphragm is attached to a small wire coil that moves inside a magnet's field. Moving a coil in a magnetic field induces a voltage (Faraday's law). A geophone or a velocity pickup works the same way.
  - They are robust and less sensitive. They suit loud sources and stage vocals.
- **Condenser** mics are the "capacitor" type. ("Condenser" is the old word for capacitor.)
  - The diaphragm is one plate of a capacitor, and a fixed back plate is the other. Sound changes the gap, which changes the capacitance. It is the same principle as a capacitive pressure sensor.
  - The capacitor needs an electrical bias, so the mic needs power. Studio mixers supply it through the mic cable as **phantom power** (usually 48 V). The name means that the power travels invisibly on the same wires as the audio.
  - They are more sensitive and more detailed. They are the studio standard.

**Preamp.** A microphone's output is tiny, in the range of millivolts. A **preamplifier** (preamp) boosts it to "line level" (around 1 V), the level the rest of the equipment expects. It is the same job as a signal conditioner or charge amplifier in front of a DAQ (data acquisition) card. The preamp's own electronic noise adds to the signal, which is why gain staging (section 2) matters.

**Polar patterns.** A polar pattern shows how sensitive the mic is to sound arriving from each direction. It is a directional gain pattern, like an antenna pattern. Here θ is the angle from the front of the mic (0° = straight ahead):
- **Omnidirectional:** picks up equally from all directions. Gain = 1 at every angle.
- **Cardioid:** named for its heart shape. Gain = (1 + cos θ)/2. It is 1 at the front, 0.5 at the sides and 0 at the rear, so it rejects sound from behind.
- **Figure-8:** gain = cos θ. It picks up front and back (the back with opposite sign) and rejects the sides.
- **Supercardioid and shotgun:** narrow patterns that favour the front even more. A shotgun mic has a long tube in front of the diaphragm to narrow the pattern. They are used on film sets, where the mic must hear the actor and not the crew.

**Proximity effect.** Directional mics boost the bass as the source gets closer.
- Why: a directional mic responds to the pressure *difference* between the front and the back of its diaphragm. Close to a small source, the sound level falls quickly with distance, so this difference grows. The effect is strongest at low frequencies.
- It is part of why close-miked voices, and the camera holder's voice, sound "big".

**Which mic, where:**
- **Film and interviews:**
  - A **lavalier** (lav) is a tiny mic clipped on the speaker's clothing. It gives a near-field (very close), dry (little room echo) and isolated track.
  - A **boom** is a pole that holds a shotgun mic just above the frame. It is the main alternative.
- **Phones:** two to four tiny **MEMS** mics (micro-electro-mechanical systems: silicon chips a few millimetres wide, with a microscopic diaphragm built in). The phone **already processes** the sound before it reaches the file:
  - noise suppression;
  - **automatic gain control (AGC)**, which keeps turning the gain up in quiet moments and down in loud ones so the level stays steady. It is a feedback control loop on volume;
  - wind filtering;
  - sometimes voice-isolation modes.
  - User uploads have therefore been through an unknown non-linear chain before we see them. "Non-linear" means the output for (A + B) is not the output for A plus the output for B, so you cannot simply subtract one part afterwards.
  - That chain helps explain why models trained on clean synthetic mixes get worse on real phone audio.

## 2. Gain staging and clipping

**dBFS.** Digital audio has a hard maximum: the largest value the file can store, called **full scale**. A level in **dBFS** (decibels relative to full scale) is measured against that maximum.
- 0 dBFS is the maximum. Every real level is negative.
- Decibels for amplitude: level = 20·log₁₀(amplitude / full scale). Every 6 dB is a factor of 2, and every 20 dB is a factor of 10.
- Example: −30 dBFS is 10^(−30/20) ≈ 0.032, about 3% of full scale.

**Gain staging and headroom.** A recording passes through several stages: mic, preamp, then the analogue-to-digital converter. Each has a noise floor (the faint hiss it adds) and a maximum level. **Gain staging** means choosing the gain at each stage so the signal stays well above the noise and below clipping.
- **Headroom** is the safety margin between your typical or peak level and the maximum.
- Example: if speech peaks at −12 dBFS, you have 12 dB of headroom. A sudden shout 12 dB louder would just reach full scale.
- It is the same as choosing the input range on a DAQ channel. Too small a range clips the peaks. Too large a range wastes resolution on noise.

**Clipping cannot be undone.** Clipping means the signal tried to go above the maximum and was cut off. A waveform that hits full scale is flattened ("clipped") at the top. Once flattened, the information about the true peak is gone, and the flat tops add harsh distortion. Declipping is itself a reconstruction problem, and often a generative one: the model has to invent the missing peaks.

## 3. The processing toolbox

**EQ (equaliser).** An equaliser is a set of filters that shape the spectrum, boosting or cutting chosen frequency regions. Examples:
- a **high-pass** filter around 80 Hz passes everything above 80 Hz and removes **rumble** (low-frequency noise from traffic, footsteps, air conditioning or handling the mic);
- a **presence** boost around 3–5 kHz raises the region where the ear is most sensitive and where consonants live, so speech is easier to understand (better **intelligibility**);
- a **notch** removes a very narrow band, for example **hum** at 60 Hz or 50 Hz. Hum is the tone from mains electricity, 60 Hz in some countries and 50 Hz in others. A notch filter is the same tool a vibration engineer uses to remove line interference from a sensor signal.

**Compressor.** A compressor reduces the loudness *difference* between loud and quiet parts. It does this by turning the gain down when the signal is loud. It is a non-linear, time-varying gain controller. For an engineer it is just a control loop:

```
level_dB  = 20·log10(envelope(x))          # envelope follower
gain_dB   = 0                    if level ≤ T
          = (T − level)·(1 − 1/R) otherwise  # threshold T, ratio R
gain_s    = smooth(gain_dB, attack τa, release τr)   # first-order smoothing
y         = x · 10^((gain_s + makeup)/20)
```

What each part means:
- **Envelope follower:** a detector that tracks the slowly changing outline (envelope) of the waveform, not each oscillation. It is like a rectifier plus low-pass filter, and it gives the "level" of the signal at each moment.
- **Threshold (T):** the level above which the compressor starts to act.
- **Ratio (R):** how strongly it acts. With R = 4, every 4 dB the input goes above T becomes only 1 dB above T at the output.
- **Attack (τa) and release (τr):** time constants of the smoothing. Attack is how fast the gain is turned *down* when the signal gets loud. Release is how fast it recovers when the signal gets quiet. The smoothing is a first-order lag, the same as an RC filter or a first-order ODE: after one time constant, the gain has moved about 63% of the way to its target. Typical values are a few ms for attack and 50–500 ms for release.
- **Makeup gain:** a fixed gain added at the end to bring the now-quieter loud parts back up.

Worked example: T = −30 dB, R = 4, input level = −10 dB.
- The input is 20 dB over the threshold.
- Gain = (T − level)·(1 − 1/R) = (−30 − (−10))·0.75 = **−15 dB**.
- The output level is −25 dB, which is 5 dB over the threshold: 20 dB / 4 = 5 dB, as the ratio says.
- Quiet parts below −30 dB are untouched. After makeup gain, the quiet parts are louder and the whole signal sounds "denser".

Other tools:
- **Limiter:** a compressor with a very high ratio (often 10:1 or more) and a fast attack. It sets the final **peak ceiling**: nothing gets above it.
- **Gate or expander:** the opposite of a compressor. It turns down signals *below* a threshold, for example the room noise between phrases. A **gate** cuts them off almost completely. An **expander** turns them down gradually, by a ratio.
- **De-esser:** a compressor triggered only by **sibilance**, the hissy "s" and "sh" sounds, in the 5–9 kHz band. It tames harsh "s" sounds without squashing the rest of the voice.
- **Reverb and delay:** add synthetic room or echo.
  - **Reverb** is the dense tail of reflections in a room. **Delay** is a distinct echo.
  - A **convolution reverb** applies a real room's measured response by convolving the dry signal with that room's **room impulse response (RIR)**. This is exactly the RIR model from lecture 01. It is like the hammer-tap test of a structure: the response to an impulse tells you the response to any input.
- **Noise reduction:** classical **spectral gating**.
  - It first estimates the noise spectrum from a stretch with no wanted sound.
  - It then chops the signal into short frames and frequency **bins** (narrow slots of the Fourier transform) and attenuates the bins that are not clearly above that noise.
  - It is the ancestor of the speech enhancers in lecture 07.

## 4. Multitrack, stems, mix and master

**Music production flow.** Record **multitrack** (one track per mic or instrument), mix the tracks into **stems**, then **master** the result.
- **Multitrack:** every mic or instrument is recorded on its own track, so each can be adjusted separately later.
- **Mixing:** combining the tracks, with level, panning (left-right placement), EQ and effects, into a stereo (or surround) file. The software used is a **DAW** (digital audio workstation), for example Pro Tools, Logic or Ableton Live.
- A **stem** is a group submix: drums, bass, vocals, guitars, keys. Many tracks are summed into one stem.
- **Mastering:** the last step. It gives the whole mix a final EQ, compression and limiting, and sets the overall loudness for release.
- Labels and remix contests distribute stems. The famous separation datasets (MUSDB18, MoisesDB) are collections of stems. They are the "ground truth" a separation model learns from.

**The mix is not a simple sum.** In practice it includes:
- panning;
- group (bus) compression, which couples the sources. A **bus** is a channel that sums several tracks so that one effect can process them together. When the loud drums make the compressor turn down, the quiet vocals on the same bus are turned down too;
- reverbs shared by several tracks;
- mastering limiters.

So "mixture = Σ stems" holds only approximately. This is one reason no separator can be perfect, and why our "others = mix − Σ targets" output is the honest way to keep the result summing to the mix.

## 5. Film, TV and broadcast: DME and M&E

**DME stems.** Film and TV mixes are delivered as **dialogue**, **music** and **effects** stems, plus the final mix. "DME" is short for these three.

**M&E.** The "M&E" (music and effects, no dialogue) is what a **dubbing** studio needs. Dubbing means replacing the actors' speech with a new language. The studio adds a new-language dialogue track over the M&E.
- Netflix asks for DME stems that sum exactly to the mix, and for a "fully filled" M&E.
- "Fully filled" means the ambience and Foley under the dialogue are rebuilt, so removing the speech leaves no holes.
  - **Ambience** is the continuous background sound of a place: room tone, wind, distant traffic, crowd murmur.
  - **Foley** is sound effects performed and recorded by artists in time with the picture: footsteps, clothing rustle, door handles. On a film set, the dialogue microphones pick these up mixed with the speech.
  - If the original ambience and Foley were recorded only together with the dialogue, then cutting the dialogue also cuts them. The gaps must be refilled.

**Why separation is needed when studios should already have stems.**
- Archives, older TV and many non-fiction productions have **only the final mix**. Stems were lost or never made.
- Music licences often don't cover new territories or platforms, so the music must be replaced.
- See our market study for verified examples and the vendors involved.

**Live sports.** Commentary, crowd and effects microphones are mixed live. Archives usually keep only the broadcast mix. This is exactly our "commentator 1 / commentator 2 / crowd" scenario.

**Concerts.** The **front-of-house (FOH)** engineer sits at the mixing desk out in the audience area and mixes the band through the **PA** (public address system, the big loudspeaker system). A phone in the crowd records the PA through the room, plus the crowd near the phone. That is a very different signal from a studio mix (lecture 09; the CrowdioSet paper).

## Read or watch

- Shure, *Microphone Techniques for Recording*: https://pubs.shure.com/guide/Microphone-Techniques-for-Recording/en-US
- Audio University (YouTube), for short, clear videos on compression, EQ, gain staging and mic types: https://www.youtube.com/@AudioUniversity
- iZotope Learn, a hub of practical mixing and mastering articles: https://www.izotope.com/en/learn.html
- Sound On Sound, *Techniques*, for deeper articles from working engineers: https://www.soundonsound.com/techniques
- Netflix:
  - *Sound Mix Specifications & Best Practices*: https://backlothelp.netflix.com/hc/en-us/articles/360001794307-Netflix-Sound-Mix-Specifications-Best-Practices-v1-5
  - *M&E Creation Guidelines*: https://backlothelp.netflix.com/hc/en-us/articles/115006122187-M-E-Creation-Guidelines
- AudioShake glossary, *DME* (a vendor's explainer): https://www.audioshake.ai/glossary/dme-dialogue-music-and-effects
- Our own study, for why separation is needed in media: [gaudio-lab-and-ai-separation-market.md](../../market-studies/audio-video-separation/gaudio-lab-and-ai-separation-market.md)

## Exercise (45 min)

1. Implement the compressor above in about 20 lines of numpy and apply it to a speech stem from `tools/separation-lab/data/clips/US-3.1/`.
2. Try T = −30 dBFS, R = 4, τa = 5 ms and τr = 100 ms.
3. Plot the gain curve over time.
4. Then add the compressed speech to a music stem and notice the problem: you can no longer recover the original speech by subtraction, because the gain varied with time.
