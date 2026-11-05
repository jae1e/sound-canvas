# Audio and AI sound separation: a curriculum for an engineer

**Written 2026-11-05 for the user**, a mechanical engineer who knows engineering math well but is new to audio. It runs from the physics of sound to the deep-learning and generative models behind today's separation services. (**Deep learning** means training large neural networks, layered stacks of simple adjustable functions, from many examples. A **generative** model is one that creates new data, such as new audio, instead of only analysing existing data.) It is tied to our own work in `tools/separation-lab` and the [audio separation product docs](../../products/audio-separation/).

The reading favours blogs, interactive explainers, videos and tutorials over papers. A paper appears only when it is the clearest source, and is marked *(paper)*. Every link was checked on 2026-11-05.

Korean learning translation (English stays canonical): [ko/README.md](ko/README.md).

## How it maps to what you already know

| You know (mechanical engineering) | Audio equivalent | Lecture |
|---|---|---|
| Wave equation, vibration modes, resonance | Sound waves, harmonics (overtones at whole-number multiples of a base frequency), room modes (a room's standing-wave resonances), formants (the resonance peaks of the vocal tract that shape vowels) | 1 |
| Signals and systems, transfer functions, convolution | Rooms and microphones as LTI systems (linear time-invariant: linear, and the same today as tomorrow, so the output is the input convolved with the system's impulse response), impulse responses (the output after a single sharp click), reverb (the dense echo tail a room adds) | 1, 3 |
| Fourier series and transforms | Spectrum (energy per frequency), FFT (fast Fourier transform, the efficient algorithm), STFT (short-time Fourier transform: an FFT on short overlapping slices of the signal), spectrograms (the STFT shown as an image of time against frequency, with colour for loudness) | 3 |
| Sampling and data acquisition, aliasing | Digital audio: sample rate, bit depth (how finely each sample's value is measured), dither (tiny deliberate noise that hides rounding distortion) | 2 |
| Modal decomposition, least squares, matrix factorisation | NMF (non-negative matrix factorisation: split a spectrogram into a few building-block spectra and how strongly each is active over time), Wiener filtering (a least-squares optimal gain per frequency, from signal and noise power), masking (multiply the spectrogram by a 0-to-1 gain to keep or remove parts) | 5 |
| Optimisation, regression | Training neural separators (losses; PIT = permutation-invariant training, which scores the best matching of outputs to targets, because the outputs have no natural order) | 6 |
| Stochastic processes, ODEs | Diffusion and flow-matching generative models (they create audio by starting from random noise and integrating an ODE for a number of steps) | 8 |

## Schedule (about 4 weeks at 6–8 hours a week)

| Week | Lecture | Time | Core idea |
|---|---|---|---|
| 1 | [01 Sound, hearing and rooms](01-sound-hearing-rooms.md) | 2 h | Sound is pressure, ears are logarithmic, rooms are filters |
| 1 | [02 Digital audio](02-digital-audio.md) | 2 h | Sampling, quantisation (rounding values to a fixed number of levels), stereo and mid/side (a sum-and-difference view of left and right), loudness (LUFS = loudness units relative to full scale, a measure of how loud something sounds) |
| 1 | [03 Spectral analysis: FFT to spectrogram](03-spectral-analysis.md) | 3 h | The STFT (see the table above) is the main working representation in this field |
| 2 | [04 Audio engineering in practice](04-audio-engineering-practice.md) | 2 h | Microphones, EQ (equalisation: boosting or cutting frequency ranges), compression (reducing loudness swings), stems (one instrument group's track), DME (dialogue, music and effects: the three layers of a film soundtrack) and M&E (music and effects: the soundtrack without dialogue, used for dubbing) |
| 2 | [05 Classical separation and metrics](05-classical-separation.md) | 3 h | Masks, the Wiener filter, NMF, HPSS (harmonic-percussive source separation: split tonal from drum-like sound), SI-SDR (scale-invariant signal-to-distortion ratio: a dB score of separation quality) |
| 3 | [06 Deep learning for separation](06-deep-learning-separation.md) | 3 h | U-Net (an image-segmentation network) to Demucs (Meta's separation network) to band-split RoFormers (transformers that treat frequency bands separately) |
| 3 | [07 Speech: enhancement, diarisation, audio-visual](07-speech-diarization-av.md) | 3 h | RNNoise (a small real-time noise remover), pyannote (a "who spoke when" toolkit), target-speaker (extract one chosen voice) and audio-visual (using the video too) separation |
| 4 | [08 Generative and foundation models](08-generative-foundation-models.md) | 3 h | Neural codecs (learned audio compressors), diffusion and flow matching, CLAP (a model linking text and audio), SAM Audio (Meta's prompt-driven separation model) |
| 4 | [09 What today's services use](09-industry-map.md) | 1.5 h | Open building blocks, vendor models (what companies use), platform features (what phones and apps build in), trends |

**Fast track (about 8 hours)**, if time is short: lectures 03, 05, 06 and 08. Those four explain how our product works and where its weaknesses lie.

## Tools for the exercises

Keep a separate, light environment for learning. Do not install anything into the lab's `.venv`, which is pinned for SAM Audio.

```bash
uv venv ~/audio-learn && source ~/audio-learn/bin/activate
uv pip install numpy scipy librosa matplotlib soundfile jupyter
```

- **Clips:** the lab's synthetic clips under `tools/separation-lab/data/clips/` come with ground-truth stems, which makes them ideal for exercises.
- **SAM Audio experiments:** use the local web demo (`tools/separation-lab/run-demo.sh`) rather than loading models in notebooks. The workstation has limited RAM; see the lab README.
- **Listening:** listen on headphones at a comfortable volume. Spectrograms show far more than plots of the waveform.

## Core references to keep open

- Meinard Müller, *Fundamentals of Music Processing*, the free FMP notebooks: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C0/C0.html
- Manilow, Seetharaman and Salamon, *Open-Source Tools & Data for Music Source Separation* (ISMIR 2020 tutorial, an online book): https://source-separation.github.io/tutorial/
- Steven W. Smith, *The Scientist and Engineer's Guide to Digital Signal Processing* (free): https://www.dspguide.com/
- Julius O. Smith III, CCRMA online books: https://ccrma.stanford.edu/~jos/
- Hugging Face Audio Course: https://huggingface.co/learn/audio-course
- Video channels:
  - The Sound of AI (Valerio Velardo), audio signal processing for ML: https://www.youtube.com/@ValerioVelardoTheSoundofAI
  - Audio University, recording and mixing basics: https://www.youtube.com/@AudioUniversity
