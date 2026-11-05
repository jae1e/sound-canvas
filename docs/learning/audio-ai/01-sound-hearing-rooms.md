# 01. Sound, hearing and rooms

## 1. Sound is a pressure wave

**Wave equation and speed.** Sound is a small pressure fluctuation p(x, t) on top of atmospheric pressure. Air is pushed together and pulled apart, and that disturbance travels outward. It obeys the wave equation you already know:

  ∂²p/∂t² = c² ∇²p,  with c ≈ 343 m/s in air at 20 °C.

- p is the pressure *change* (in pascals), not the absolute pressure. Atmospheric pressure is about 101,000 Pa; a loud shout changes it by about 1 Pa.
- The speed c is the speed of the wave, not of the air. Air molecules only jiggle back and forth.
- A microphone is a pressure sensor, like a strain gauge or accelerometer. The signal it outputs is p(t) at one point in space.

**Wavelength.** λ = c / f (wavelength = speed ÷ frequency). Its range explains a lot:

| Frequency | Wavelength | Behaviour |
|---|---|---|
| 100 Hz | 3.4 m | Bends around heads and furniture; room modes dominate |
| 1 kHz | 34 cm | |
| 10 kHz | 3.4 cm | Beams and is shadowed by the head; important for direction and "air" |

- **Why wavelength matters:** a wave bends around an obstacle that is smaller than its wavelength, and is blocked by one that is larger. A head is about 20 cm wide. So low notes wrap around it and high notes are shadowed.
- **Room modes:** standing waves between walls, exactly like the modes of a vibrating string or a duct. Between two walls 5 m apart the lowest one is c / (2 × 5 m) ≈ 34 Hz. In a small room the low notes are boomy or thin depending on where you stand.
- **"Air":** the sense of openness that comes from energy near 10 kHz and above. It is a producer's word, not a measurement.

**Decibels.** Level is measured in dB because the ear is close to logarithmic: each doubling of loudness takes a similar *ratio* of pressure, not a similar difference.
- A decibel is ten times the base-10 logarithm of a power ratio. Since power goes with amplitude squared, an amplitude ratio uses 20 log₁₀.
- **Sound pressure level (SPL):** L = 20 log₁₀(p_rms / 20 µPa).
  - p_rms is the root-mean-square pressure, the usual way to average a wave that swings positive and negative.
  - µPa is micropascal, a millionth of a pascal. 20 µPa is roughly the quietest 1 kHz tone a young adult can hear, so 0 dB SPL means "at the threshold of hearing".
  - Example: 1 Pa rms gives 20 log₁₀(1 / 0.00002) ≈ 94 dB SPL, which is about the level of loud shouting at close range.
- **+6 dB** means double the amplitude (20 log₁₀ 2 = 6.02).
- **+3 dB** comes from adding two equal *uncorrelated* sources (two different people talking), because powers add and doubling power is 10 log₁₀ 2 = 3.01 dB.
- **+6 dB** comes from adding two equal *in-phase, correlated* sources (the same signal twice), because the amplitudes add.

**Inverse-square law.** In a free field (open space with no reflecting surfaces), level drops **6 dB per doubling of distance**.
- Reason: the power spreads over a sphere whose area grows as r². So intensity falls as 1/r² and pressure falls as 1/r. Halving the pressure is −6 dB.
- This is why the camera holder in a phone video is so loud: a mouth at 30 cm is about 16 dB louder than someone speaking at 2 m. Check: 20 log₁₀(200 / 30) ≈ 16.5 dB.
- It is also why their voice sounds "dry" (see section 3).

## 2. Pitch, harmonics and timbre: modal analysis again

**Harmonics.** A vibrating string or air column has modes at f_n ≈ n·f₀ (harmonics). This is modal analysis again, with one difference from a beam: an ideal string or air column has modes at exact integer multiples of f₀, while a beam's bending modes are not integer multiples. Integer-multiple modes are what make a sound feel like one clear pitch.
- Here f₀ is the **fundamental** (lowest mode) and f_2, f_3 ... are whole-number multiples of it. For f₀ = 220 Hz (the note A3) the harmonics are 220, 440, 660, 880 Hz and so on.
- **Pitch** is mostly perceived from f₀. This is the note name you would sing or hum.
- **Timbre** (pronounced "TAM-ber"; the tone colour) is why a guitar and a piano differ on the same note. It comes from:
  - the *spectral envelope*, meaning the relative strength of each harmonic. Think of the outline you get by joining the tops of the harmonic peaks in a spectrum plot;
  - the *transients*, meaning the attack: plucks, hammer strikes, breath. A transient is a short, sudden, non-repeating burst of energy at the start of a sound. Cut the first 50 ms off a piano note and it becomes hard to recognise.

**Voice.** The voice is a source-filter system, like a force input driving a structure with resonances:
- **Source:** the vocal folds (vocal cords) open and close about 100 times per second in a typical adult male voice and about 200 in a female voice. This makes a harmonic pulse train, whose f₀ is the pitch.
- **Filter:** the vocal tract (throat and mouth) is a tube with resonances called **formants**, which shape the vowels. A formant is a broad peak in the spectral envelope; moving the tongue and lips moves the peaks. The first two formants (F1 and F2) mostly identify the vowel: "ee" and "ah" have the same kind of source but different formants.
- **Noisy sounds:** consonants such as s and f are broadband noise, meaning energy spread over a wide range of frequencies with no harmonic structure.

**Why separation is hard.** Two speakers of the same gender share f₀ ranges and formant ranges. Two guitars share both harmonics and envelope. Separation models have to tell apart sources that look alike in exactly these features.

## 3. Rooms are linear filters

**A room is an LTI system.** LTI means linear time-invariant: doubling the input doubles the output (linear), and a sound played now or later gives the same response (time-invariant). Between a source and a microphone, a room behaves like such a system with impulse response h(t), the **room impulse response (RIR)**:

  y(t) = (h * s)(t)  (convolution)

- **Impulse response:** what the system outputs when the input is a single instantaneous click. It is like the hammer-tap test in vibration analysis, where one tap reveals every mode of a structure. In a room, a clap or a balloon pop is the "tap" and the microphone records the RIR.
- **Convolution:** every moment of the source sound s triggers a scaled and delayed copy of h. Add up all the copies and you get the sound at the microphone, y. Direct sound plus echoes of everything, smeared in time.
- **Microphone signal = clean source filtered by the room.** That is why the same voice sounds different in a bathroom and in a field.

**What an RIR contains:**
- the direct sound (the straight path from mouth to microphone, arriving first);
- the early reflections (within roughly 50 ms; they bounce once or twice off walls, desk or floor, and they colour the tone);
- a diffuse **reverberant tail** (thousands of weaker reflections that blend into a smooth, fading wash; what people call "reverb").

**RT60** is the time for the tail to decay by 60 dB (to one-thousandth of the pressure, or one-millionth of the power). The name stands for "reverberation time, 60 dB". Sabine's formula estimates it:

  RT60 ≈ 0.161 · V / A,

where V is the room volume in m³ and A is the total absorption in m² sabins.
- **Sabin:** the unit of absorption. One square metre of perfectly absorbing surface (an open window, which lets all sound escape) is 1 m² sabin. A real surface counts as its area times its absorption coefficient (0 = fully reflective, 1 = fully absorbing). A is the sum over all surfaces.
- **Example:** a 60 m³ room with A = 20 m² sabins has RT60 ≈ 0.161 × 60 / 20 ≈ 0.48 s. A bathroom with hard tiles has a long RT60 (a second or more); a bedroom with a bed and curtains has a short one.
- **Why it works:** it is an energy balance. A bigger volume stores more sound energy, and more absorption drains it faster.

**Direct-to-reverberant ratio (DRR).** DRR is the energy of the direct sound divided by the energy of the reverberant tail, usually quoted in dB.
- Close to the mic, direct sound dominates (high DRR, "dry").
- Far away, reverb dominates (low DRR, "wet" or "roomy"). The direct sound weakens with distance as in the inverse-square law, but the diffuse reverb level is roughly the same everywhere in the room.

This difference, together with level, is what our camera-holder heuristic uses. A heuristic is a rule of thumb: loud and dry means close to the microphone, so probably the person holding the phone.

**In the lab.** The lab's synthetic clips are built by convolving clean speech with real RIRs (OpenSLR SLR28, a public collection of measured and simulated RIRs) and adding noise. This is the same "mixture = Σ filtered sources" model that separation assumes. A *mixture* is the sum of everything the microphone hears; the separator's job is to undo that sum.

## 4. Hearing: why perceptual scales matter

**Frequency range.** About 20 Hz to 20 kHz, with the upper limit falling with age.

**Equal-loudness contours.** These are curves from listening experiments: for each frequency, how loud (in dB SPL) a tone must be to sound as loud as a 1 kHz reference tone. (The loudness unit is the phon, equal to dB SPL at 1 kHz.)
- The ear is most sensitive around 2–5 kHz, where the ear canal resonates.
- Low and very high frequencies need more energy to sound equally loud. A 50 Hz tone may need 40 dB more than a 3 kHz tone to be just audible.
- Consequence: a flat dB spectrum is not a flat *perceived* spectrum.

**Critical bands.**
- The cochlea (the fluid-filled spiral in the inner ear that converts vibration into nerve signals) works like a bank of overlapping band-pass filters (each passes a narrow range of frequencies). They are narrow at low frequencies and wide at high ones. Each such filter is a **critical band**. Two tones inside the same band blend or compete; tones in different bands are heard separately.
- **Mel** and **Bark** scales approximate this, for example m = 2595 log₁₀(1 + f / 700). A mel scale stretches low frequencies and compresses high ones so that equal steps *sound* like equal pitch steps. The Bark scale divides hearing into about 24 critical bands.
- **Check with the formula:** 1000 Hz is about 1000 mel. 1 kHz to 2 kHz spans about 520 mel, but 5 kHz to 6 kHz spans only about 180 mel, though both are 1000 Hz wide.
- Many neural separators split the spectrum into bands for this reason (lecture 06).

**Masking.** A loud sound hides quieter sounds close to it in frequency and time.
- *In frequency:* a loud 1 kHz tone makes a weak 1.1 kHz tone inaudible. *In time:* a loud hit hides quiet sounds just before and especially just after it.
- MP3 and AAC codecs exploit masking to discard inaudible content. (MP3 is MPEG-1 Audio Layer III and AAC is Advanced Audio Coding; both are lossy audio compression formats, covered in lecture 02.)
- Separation artifacts (unwanted leftover or invented sounds that the separator introduces) are only audible if they are not masked. This is why listening tests matter more than raw error numbers.
- Do not confuse this with the *masks* in lecture 03, which are numbers a model multiplies a spectrum by. Same word, different thing.

## Read or watch

- Josh Comeau and The Pudding, *Let's Learn About Waveforms* (interactive, 20 min): https://pudding.cool/2018/02/waveforms/
- Jack Schaedler, *Seeing Circles, Sines and Signals* (interactive DSP primer; DSP is digital signal processing, maths on sampled signals): https://jackschaedler.github.io/circles-sines-signals/
- Shure, *Microphone Techniques for Recording*, which covers polar patterns (from which directions a microphone picks up sound), proximity effect (extra bass when a directional microphone is very close to the source) and placement: https://pubs.shure.com/guide/Microphone-Techniques-for-Recording/en-US
- Optional: FMP notebooks chapter 1 (music representations; FMP is *Fundamentals of Music Processing*): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C0/C0.html

## Exercise (30 min)

1. Open a lab clip folder, for example `tools/separation-lab/data/clips/US-1.x/clip1_*`.
2. Listen to the camera holder's stem and a bystander's stem. (A *stem* is one separated track containing one source.)
3. Compute each stem's RMS level in dB, and estimate how much louder the camera holder is. (RMS: square the samples, average, take the square root. Then 20 log₁₀ of the result, relative to full scale 1.0.)
4. Explain the difference using the inverse-square law and DRR.
