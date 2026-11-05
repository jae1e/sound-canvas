# 04. Audio engineering in practice

This lecture covers how real recordings are made and mixed. Separation is the **inverse problem**: undoing a mix. You can't invert a process you don't understand.

## 1. Microphones

**Dynamic and condenser microphones.**
- **Dynamic** mics (a coil moving in a magnet) are robust and less sensitive. They suit loud sources and stage vocals.
- **Condenser** mics (a capacitor diaphragm with a powered preamp) are more sensitive and more detailed. They are the studio standard.

**Polar patterns.** These are directional gain patterns, like antenna patterns:
- **Omnidirectional:** picks up equally from all directions.
- **Cardioid:** rejects sound from the rear.
- **Figure-8:** picks up front and back, rejects the sides.
- **Supercardioid and shotgun:** narrow, for film sets.

**Proximity effect.** Directional mics boost the bass as the source gets closer. This is part of why close-miked voices, and the camera holder's voice, sound "big".

**Which mic, where:**
- **Film and interviews:** a lavalier (lav) clipped on the speaker gives a near-field, dry and isolated track. A boom shotgun above the frame is the main alternative.
- **Phones:** two to four tiny MEMS mics. The phone **already processes** the sound before it reaches the file: noise suppression, automatic gain control (AGC), wind filtering, and sometimes voice-isolation modes.
  - User uploads have therefore been through an unknown non-linear chain before we see them.
  - That chain helps explain why models trained on clean synthetic mixes get worse on real phone audio.

## 2. Gain staging and clipping

**Headroom.** Each stage (mic, preamp, converter) has a noise floor and a maximum level. Good gain staging keeps the signal well above the noise and below clipping.

**Clipping cannot be undone.** Once a waveform flattens at full scale, the information is gone. Declipping is itself a reconstruction problem, and often a generative one.

## 3. The processing toolbox

**EQ (equaliser).** Filters that shape the spectrum:
- a high-pass around 80 Hz removes rumble;
- a presence boost around 3–5 kHz improves intelligibility;
- a notch removes hum at 60 Hz or 50 Hz.

**Compressor.** A non-linear, time-varying gain controller. For an engineer it is just a control loop:

```
level_dB  = 20·log10(envelope(x))          # envelope follower
gain_dB   = 0                    if level ≤ T
          = (T − level)·(1 − 1/R) otherwise  # threshold T, ratio R
gain_s    = smooth(gain_dB, attack τa, release τr)   # first-order smoothing
y         = x · 10^((gain_s + makeup)/20)
```

- **Limiter:** a compressor with a very high ratio and a fast attack. It sets the final peak ceiling.
- **Gate or expander:** the opposite of a compressor. It turns down signals below a threshold, for example the room noise between phrases.
- **De-esser:** a compressor triggered only by sibilant "s" sounds in the 5–9 kHz band.
- **Reverb and delay:** add synthetic room or echo. A convolution reverb is exactly the RIR model from lecture 01.
- **Noise reduction:** classical spectral gating, which estimates the noise spectrum and attenuates bins below it. It is the ancestor of the speech enhancers in lecture 07.

## 4. Multitrack, stems, mix and master

**Music production flow.** Record **multitrack** (one track per mic or instrument), mix the tracks into **stems**, then **master** the result.
- A **stem** is a group submix: drums, bass, vocals, guitars, keys.
- Labels and remix contests distribute stems. The famous separation datasets (MUSDB18, MoisesDB) are collections of stems.

**The mix is not a simple sum.** In practice it includes:
- panning;
- group (bus) compression, which couples the sources;
- reverbs shared by several tracks;
- mastering limiters.

So "mixture = Σ stems" holds only approximately. This is one reason no separator can be perfect, and why our "others = mix − Σ targets" output is the honest way to keep the result summing to the mix.

## 5. Film, TV and broadcast: DME and M&E

**DME stems.** Film and TV mixes are delivered as **dialogue**, **music** and **effects** stems, plus the final mix.

**M&E.** The "M&E" (music and effects, no dialogue) is what a dubbing studio needs: it adds a new-language dialogue track over it.
- Netflix asks for DME stems that sum exactly to the mix, and for a "fully filled" M&E. "Fully filled" means the ambience and Foley under the dialogue are rebuilt, so removing the speech leaves no holes.

**Why separation is needed when studios should already have stems.**
- Archives, older TV and many non-fiction productions have **only the final mix**. Stems were lost or never made.
- Music licences often don't cover new territories or platforms, so the music must be replaced.
- See our market study for verified examples and the vendors involved.

**Live sports.** Commentary, crowd and effects microphones are mixed live. Archives usually keep only the broadcast mix. This is exactly our "commentator 1 / commentator 2 / crowd" scenario.

**Concerts.** The front-of-house (FOH) engineer mixes the band through the PA. A phone in the crowd records the PA through the room, plus the crowd near the phone. That is a very different signal from a studio mix (lecture 09; the CrowdioSet paper).

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
