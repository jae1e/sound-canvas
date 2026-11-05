# Audio and AI sound separation: a curriculum for an engineer

**Written 2026-11-05 for the user**, a mechanical engineer who knows engineering math well but is new to audio. It runs from the physics of sound to the deep-learning and generative models behind today's separation services. It is tied to our own work in `tools/separation-lab` and the [audio separation product docs](../../products/audio-separation/).

The reading favours blogs, interactive explainers, videos and tutorials over papers. A paper appears only when it is the clearest source, and is marked *(paper)*. Every link was checked on 2026-11-05.

Korean learning translation (English stays canonical): [ko/README.md](ko/README.md).

## How it maps to what you already know

| You know (mechanical engineering) | Audio equivalent | Lecture |
|---|---|---|
| Wave equation, vibration modes, resonance | Sound waves, harmonics, room modes, formants | 1 |
| Signals and systems, transfer functions, convolution | Rooms and microphones as LTI systems, impulse responses, reverb | 1, 3 |
| Fourier series and transforms | Spectrum, FFT, STFT, spectrograms | 3 |
| Sampling and data acquisition, aliasing | Digital audio: sample rate, bit depth, dither | 2 |
| Modal decomposition, least squares, matrix factorisation | NMF, Wiener filtering, masking | 5 |
| Optimisation, regression | Training neural separators (losses, PIT) | 6 |
| Stochastic processes, ODEs | Diffusion and flow-matching generative models | 8 |

## Schedule (about 4 weeks at 6–8 hours a week)

| Week | Lecture | Time | Core idea |
|---|---|---|---|
| 1 | [01 Sound, hearing and rooms](01-sound-hearing-rooms.md) | 2 h | Sound is pressure, ears are logarithmic, rooms are filters |
| 1 | [02 Digital audio](02-digital-audio.md) | 2 h | Sampling, quantisation, stereo and mid/side, loudness (LUFS) |
| 1 | [03 Spectral analysis: FFT to spectrogram](03-spectral-analysis.md) | 3 h | The STFT is the main working representation in this field |
| 2 | [04 Audio engineering in practice](04-audio-engineering-practice.md) | 2 h | Microphones, EQ, compression, stems, DME and M&E |
| 2 | [05 Classical separation and metrics](05-classical-separation.md) | 3 h | Masks, the Wiener filter, NMF, HPSS, SI-SDR |
| 3 | [06 Deep learning for separation](06-deep-learning-separation.md) | 3 h | U-Net to Demucs to band-split RoFormers |
| 3 | [07 Speech: enhancement, diarisation, audio-visual](07-speech-diarization-av.md) | 3 h | RNNoise, pyannote, target-speaker and audio-visual separation |
| 4 | [08 Generative and foundation models](08-generative-foundation-models.md) | 3 h | Neural codecs, diffusion and flow matching, CLAP, SAM Audio |
| 4 | [09 What today's services use](09-industry-map.md) | 1.5 h | Open building blocks, vendor models, platform features, trends |

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
