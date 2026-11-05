# 01. Sound, hearing and rooms

## 1. Sound is a pressure wave

**Wave equation and speed.** Sound is a small pressure fluctuation p(x, t) on top of atmospheric pressure. It obeys the wave equation you already know:

  ∂²p/∂t² = c² ∇²p,  with c ≈ 343 m/s in air at 20 °C.

**Wavelength.** λ = c / f, and its range explains a lot:

| Frequency | Wavelength | Behaviour |
|---|---|---|
| 100 Hz | 3.4 m | Bends around heads and furniture; room modes dominate |
| 1 kHz | 34 cm | |
| 10 kHz | 3.4 cm | Beams and is shadowed by the head; important for direction and "air" |

**Decibels.** Level is measured in dB because the ear is close to logarithmic:
- Sound pressure level: L = 20 log₁₀(p_rms / 20 µPa).
- **+6 dB** means double the amplitude.
- **+3 dB** comes from adding two equal *uncorrelated* sources, because powers add.
- **+6 dB** comes from adding two equal *in-phase, correlated* sources.

**Inverse-square law.** In a free field, level drops **6 dB per doubling of distance**. This is why the camera holder in a phone video is so loud: a mouth at 30 cm is about 16 dB louder than someone speaking at 2 m. It is also why their voice sounds "dry" (see section 3).

## 2. Pitch, harmonics and timbre: modal analysis again

**Harmonics.** A vibrating string or air column has modes at f_n ≈ n·f₀ (harmonics), exactly like the modes of a beam.
- **Pitch** is mostly perceived from f₀.
- **Timbre**, which is why a guitar and a piano differ on the same note, comes from:
  - the *spectral envelope*, meaning the relative strength of each harmonic;
  - the *transients*, meaning the attack: plucks, hammer strikes, breath.

**Voice.** The voice is a source-filter system:
- **Source:** the vocal folds produce a harmonic pulse train, whose f₀ is the pitch.
- **Filter:** the vocal tract is a tube with resonances called **formants**, which shape the vowels.
- **Noisy sounds:** consonants such as s and f are broadband noise.

**Why separation is hard.** Two speakers of the same gender share f₀ ranges and formant ranges. Two guitars share both harmonics and envelope. Separation models have to tell apart sources that look alike in exactly these features.

## 3. Rooms are linear filters

**A room is an LTI system.** Between a source and a microphone, a room behaves like a linear time-invariant system with impulse response h(t), the **room impulse response (RIR)**:

  y(t) = (h * s)(t)  (convolution)

**What an RIR contains:**
- the direct sound;
- the early reflections (within roughly 50 ms; they colour the tone);
- a diffuse **reverberant tail**.

**RT60** is the time for the tail to decay by 60 dB. Sabine's formula estimates it:

  RT60 ≈ 0.161 · V / A,

where V is the room volume in m³ and A is the total absorption in m² sabins.

**Direct-to-reverberant ratio (DRR).**
- Close to the mic, direct sound dominates (high DRR, "dry").
- Far away, reverb dominates.

This difference, together with level, is what our camera-holder heuristic uses.

**In the lab.** The lab's synthetic clips are built by convolving clean speech with real RIRs (OpenSLR SLR28) and adding noise. This is the same "mixture = Σ filtered sources" model that separation assumes.

## 4. Hearing: why perceptual scales matter

**Frequency range.** About 20 Hz to 20 kHz, with the upper limit falling with age.

**Equal-loudness contours.** The ear is most sensitive around 2–5 kHz. Low and very high frequencies need more energy to sound equally loud.

**Critical bands.**
- The cochlea works like a bank of overlapping band-pass filters, narrow at low frequencies and wide at high ones.
- **Mel** and **Bark** scales approximate this, for example m = 2595 log₁₀(1 + f / 700).
- Many neural separators split the spectrum into bands for this reason (lecture 06).

**Masking.** A loud sound hides quieter sounds close to it in frequency and time.
- MP3 and AAC codecs exploit masking to discard inaudible content.
- Separation artifacts are only audible if they are not masked. This is why listening tests matter more than raw error numbers.

## Read or watch

- Josh Comeau and The Pudding, *Let's Learn About Waveforms* (interactive, 20 min): https://pudding.cool/2018/02/waveforms/
- Jack Schaedler, *Seeing Circles, Sines and Signals* (interactive DSP primer): https://jackschaedler.github.io/circles-sines-signals/
- Shure, *Microphone Techniques for Recording*, which covers polar patterns, proximity effect and placement: https://pubs.shure.com/guide/Microphone-Techniques-for-Recording/en-US
- Optional: FMP notebooks chapter 1 (music representations): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C0/C0.html

## Exercise (30 min)

1. Open a lab clip folder, for example `tools/separation-lab/data/clips/US-1.x/clip1_*`.
2. Listen to the camera holder's stem and a bystander's stem.
3. Compute each stem's RMS level in dB, and estimate how much louder the camera holder is.
4. Explain the difference using the inverse-square law and DRR.
