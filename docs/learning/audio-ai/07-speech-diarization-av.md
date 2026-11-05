# 07. Speech: enhancement, diarisation, speaker separation and audio-visual

Most of our personas (P1–P5) are about **voices**, so this lecture covers the speech side of the field.

Four jobs come up again and again. Keep them apart:

| Job | Question it answers | Section |
|---|---|---|
| Enhancement | "Can you clean this voice up?" | 1 |
| Diarisation | "Who spoke when?" | 3 |
| Separation | "Give me each voice as its own track" | 4, 5 |
| Audio-visual | "Use the picture to help with the sound" | 6 |

## 1. Speech enhancement (denoise and dereverb)

**Speech enhancement** means making the speech in a recording clearer. Two common cases:
- **Denoise:** remove background noise (fan, traffic, hiss).
- **Dereverb** (de-reverberation): remove the room's echo tail, the smear of sound reflections you studied in lecture 01.

**Classical method.** Estimate the noise, then turn it down. Lecture 05 has the details; the short version is:
1. **Estimate the noise power spectrum.** The noise **PSD** (power spectral density) says how much noise power sits at each frequency. It is the same object as the PSD of a vibration test. The estimate is usually taken from moments when nobody is talking.
2. **Apply a gain per frequency**, a number between 0 and 1 that multiplies each frequency bin of the spectrogram.
   - The **Wiener gain** is roughly (speech power) / (speech power + noise power). Where speech dominates the gain is near 1. Where noise dominates it is near 0.
   - **Spectral subtraction** instead subtracts the estimated noise power from the measured power.

**RNNoise** (Jean-Marc Valin, 2017). A **hybrid** design (classical signal processing plus a small neural network) and a model of good engineering:
1. Classical **DSP** (digital signal processing, ordinary filters and transforms) computes two kinds of features:
   - about 22 **band energies**: the spectrum is split into about 22 bands, narrow at low frequencies and wide at high ones, roughly like the ear. Each band's energy is one number, a coarse picture of the spectrum;
   - **pitch features**: how strongly the frame is voiced, and at what pitch. Pitch is the vibration rate of the vocal folds, typically 100–250 Hz. Voiced speech has harmonics at whole-number multiples of it (lecture 01).
2. A tiny **recurrent network** predicts a gain for each band (0 = remove, 1 = keep).
   - A **recurrent neural network (RNN)** carries a memory from one time frame to the next. Think of a state-space model x(k+1) = f(x(k), input(k)) whose f is learned.
   - RNNoise uses **GRU** layers (gated recurrent units). A GRU adds "gates": learned valves between 0 and 1 that decide how much of the old state to keep and how much new input to let in.
3. DSP applies the gains, plus a **pitch comb filter**.
   - A comb filter has a gain pattern with regularly spaced peaks, like the teeth of a comb.
   - Set the teeth at the speech harmonics. The harmonics pass, and noise sitting *between* the harmonics is turned down.

**Real time.** It runs in real time on a CPU.
- "Real time" means the program finishes each short block of audio before the next block arrives, so it can be used live in a call.
- The usual measure is the **real-time factor (RTF)** = processing time / audio duration. RTF = 0.1 means 10 s of audio takes 1 s. RTF below 1 is the minimum for live use.

Its demo page is the best blog-style explanation of a neural audio model anywhere.

**DeepFilterNet** (2022–23). It predicts complex "deep filters", which helps phase. Real-time and open source.
- Recall from lecture 03 that every time-frequency bin of the STFT (short-time Fourier transform, the spectrogram's underlying data) is a **complex number**: a magnitude and a phase.
- A simple **mask** is a real number between 0 and 1. It changes only the magnitude, and the noisy phase stays.
- A **deep filter** (also called a complex mask when it is a single complex number) is a short **FIR filter** (finite impulse response: a weighted sum of the last few inputs, like a moving average with chosen weights) with **complex** weights, one per frequency bin, applied across a few neighbouring frames.
- Complex weights can rotate the phase as well as scale the magnitude. That is why it helps phase.

**Commercial enhancers.** Adobe Podcast *Enhance Speech*, ElevenLabs *Voice Isolator*, Descript *Studio Sound*, Krisp, NVIDIA Broadcast, and the voice-isolation modes on phones.
- Some of these behave **generatively** (they synthesise new speech rather than only turning noise down) and make speech sound "studio".
- Users report robotic or muffled artifacts (sounds that were not in the original) and clipped word endings at high strength. These are anecdotes collected in our [market study notes](../../market-studies/ai-media-saas-screening/research-notes/demand_pain_points.md).
- Same trade-off as lecture 08: plausible against faithful.

## 2. Speaker embeddings: re-ID for voices

**Embeddings.** An **embedding** is a vector (a list of numbers) that summarises something. Here a network maps a speech segment of about 1–3 s to a fixed vector, typically of 192–512 dimensions:
- the same speaker lands close;
- different speakers land far apart.

You already know this idea from computer vision: a face re-identification network turns a face crop into a vector, and two crops of the same person end up near each other. A speaker embedding is the same thing for voices. It is also like a feature vector in estimation: a compact state that keeps what matters (who) and drops the rest (what was said).

**Cosine similarity.** How "close" is measured: the cosine of the angle between two vectors, cos θ = (a · b) / (|a| |b|).
- 1 means the same direction, 0 means unrelated (perpendicular), −1 means opposite.
- It ignores vector length and compares direction only.
- Example: a = (1, 0) and b = (0.8, 0.6) give cos θ = 0.8. A same-speaker pair might score 0.7 and a different-speaker pair 0.1; real scores depend on the model.

**History.** Each step replaced the one before:
- **i-vectors** ("identity vectors"): a pre-neural, statistical method. It compresses a whole recording into one vector of a few hundred numbers using a Gaussian mixture model (a statistical model of speech sounds).
- **x-vectors** (**TDNN**, time-delay neural network): the first widely used neural embeddings.
  - A TDNN is a 1-D convolution over time: each layer looks at the current frame and a few frames before and after.
  - "Statistics pooling" then takes the mean and standard deviation over time, so a clip of any length becomes one fixed-size vector.
- **ECAPA-TDNN**: an improved TDNN with channel attention (the network learns which feature channels matter) and with features combined across several layers. It is the common default.
- **ResNet** variants (WeSpeaker): ResNet is a residual convolutional network, with skip connections, taken from image recognition. WeSpeaker is an open toolkit with speaker models built on it.

**Training.** Classification over thousands of **VoxCeleb** speakers.
- VoxCeleb is a public dataset of celebrity interview clips collected from YouTube, labelled with speaker identity.
- The network learns to answer "which of these thousands of speakers is talking?". The layer just before the final answer becomes the embedding.
- The classifier uses **margin losses** (**AAM-softmax**, additive angular margin softmax, also called **ArcFace**). The loss pretends the correct class is a little *farther* away in angle than it really is. To still win, the network must pull same-speaker embeddings into tighter angular clusters and push speakers further apart.
- These are the **same losses used for face recognition**.

**Speaker verification.** The yes/no task "are these two recordings the same person?". Compute the cosine similarity and compare it to a threshold.
- The threshold trades two errors: accepting a wrong person (false accept) and rejecting the right person (false reject).
- Quality is reported as the **equal error rate (EER)**: the error rate at the threshold where those two errors are equal. Lower is better. It is the single point on an ROC curve where false-accept rate equals false-reject rate.

**Your face re-ID intuition transfers directly.** This is the building block for "is chunk 7 still speaker A?" in differentiator 1, identity-consistent separation. (A chunk is one short piece of a long file that is processed at a time; see lecture 08.)

## 3. Diarisation: "who spoke when"

**Diarisation** (speaker diarization) cuts a recording into pieces labelled by speaker, without knowing the speakers in advance. The output looks like: "Speaker A 0.0–4.2 s, Speaker B 4.2–9.0 s, Speaker A 9.0–12.5 s". It does not transcribe words and does not separate overlapping voices into audio tracks.

**The pyannote pipeline**, which our lab uses (`speaker-diarization-community-1`):
1. **Local segmentation.** A neural model looks at windows of about 10 s (the **segmentation window**: the network takes a fixed-length input, so long recordings are processed window by window).
   - For each short frame it outputs which of up to a few *local speakers* are active. "Local" means the labels are only valid inside this window: speaker 1 in window 1 may be speaker 2 in window 2.
   - It handles **overlapped speech**, where two or more people talk at the same time.
   - It uses a "**powerset**" multi-class formulation. Instead of one independent yes/no per speaker, the network picks one class out of all *combinations*: nobody, A, B, C, A+B, A+C, B+C. Overlap is then just another class, which is easier to learn than several yes/no outputs.
2. **Embeddings.** For each local speaker in each window, compute a speaker embedding (section 2). The community-1 model card cites WeSpeaker embeddings.
3. **Global clustering.** Links local speakers across windows into global identities.
   - **Clustering** means grouping vectors so that similar ones share a group, without labelled examples.
   - **Agglomerative** clustering (pyannote 3.x): start with every embedding as its own group and repeatedly merge the two closest groups until the closest pair is farther than a threshold.
   - **VBx** (cited by community-1): a **Bayesian HMM** clustering. An HMM (hidden Markov model) says "which speaker is talking" is a hidden state that changes over time with certain switching probabilities, and the embeddings are noisy measurements of it. This is like a state estimator with discrete states. "Bayesian" and "VB" (variational Bayes) mean the unknowns are given probability distributions and fitted by an approximate method. The time model makes labels smoother than merging embeddings independently.
4. **Output.** A timeline of speaker labels. Community-1 also returns an "exclusive" version, with one speaker per moment, that is easier to align with transcripts.

**The metric: DER** (diarisation error rate) = (missed speech + false alarms + speaker confusion) / total speech.
- **Missed speech:** someone talks, but the system says nobody does.
- **False alarm:** nobody talks, but the system says someone does. Deciding speech versus non-speech is called **VAD** (voice activity detection).
- **Speaker confusion:** the system hears speech but gives it to the wrong speaker.
- Example: in 100 s of speech, 3 s are missed, 2 s are false alarms and 4 s are confused. DER = (3 + 2 + 4) / 100 = 0.09.

**Our numbers:**

| Scenario | DER | Note |
|---|---|---|
| 2–3 person conversations | ~0.09 | Good |
| Toasts over crowd and music | ~0.11–0.14 | Good |
| Street interviews | ~0.34 | Poor: quiet passers-by merge into the interviewee's cluster |

**Alternatives:**
- **End-to-end diarisation (EEND):** one network goes from audio straight to speaker activity, with no separate embedding and clustering stages.
- **Diarisation inside ASR (WhisperX-style pipelines).** **ASR** (automatic speech recognition) turns speech into text. WhisperX combines the Whisper ASR model, word-level timestamps and a diarisation model (pyannote), so every word gets a speaker label.
- **Vendor APIs;** an API (application programming interface) is a service you call over the internet: you send audio, you get results back. ElevenLabs, AssemblyAI and others sell diarisation with transcription.

## 4. Blind speech separation (the "cocktail party problem")

The **cocktail party problem** is how a person follows one voice in a room full of talkers. Machines find it hard. **Blind** separation means we know nothing in advance about who is talking: only the mixture is given.

**The permutation problem.** A network that outputs "speaker 1" and "speaker 2" can't know which output should be which person.
- Training compares output 1 with target 1 and output 2 with target 2. If the network returns the right two voices in swapped order, the loss is huge even though the answer is right.
- The outputs have no natural order, like the labels of two identical particles.

Two fixes:
- **Deep clustering** (2016): the network gives every time-frequency bin (one cell of the spectrogram: one frame at one frequency) an embedding so that bins dominated by the same speaker are close. Then run **k-means**: pick k centres, assign each bin to its nearest centre, move each centre to the mean of its bins, and repeat. The groups become one mask per speaker.
- **PIT, permutation-invariant training** (2016–17): compute the loss for every assignment of outputs to targets and train on the best one. With 2 speakers there are 2 assignments; with N speakers, N!. It is now standard. It is the same idea as the assignment step in multi-object tracking, where detections are matched to tracks.

**Architectures.** All of them take the mixture and output one signal per speaker.
- **Conv-TasNet** (2018): a convolutional network (TasNet = time-domain audio separation network) that works on the waveform with learned filters instead of an STFT.
- **DPRNN** (dual-path RNN): handles very long sequences by alternating an RNN inside short chunks and an RNN across chunks.
- **SepFormer:** a transformer (attention-based) network using the same dual-path idea.
- **TF-GridNet:** works on the STFT grid and alternates modelling along frequency and along time.

Results:
- They reach well above **+20 dB SI-SDRi on clean synthetic two-speaker sets** (WSJ0-2mix).
  - **WSJ0-2mix** is made by adding two clean read-speech recordings from the Wall Street Journal corpus at random levels.
  - **SI-SDR** (scale-invariant signal-to-distortion ratio, lecture 05) is the wanted signal's energy relative to the error's energy, in dB, ignoring overall volume. The "i" in **SI-SDRi** means *improvement*: SI-SDR of the output minus SI-SDR of the unprocessed mixture.
  - +20 dB means the error has 1/100 of the energy of the wanted signal.
- They drop sharply on noisy, reverberant, real recordings. Benchmarks such as **WHAMR!** add real noise and room reverberation to the two-speaker mixes to measure this.
- They need a known maximum number of speakers, because the network has a fixed number of output slots.

**What this means for us.** Separating voice from voice is a hard, separately studied problem. Our lab shows SAM Audio's span-anchored voice-from-voice separation gives about **0 to +1 dB mean**, with identity swaps between chunks. (A **span** is a start-to-end time range given as a hint; lecture 08.) It is a weak spot to engineer around, not something a prompt fixes.

## 5. Target-speaker extraction: "this voice, please"

**Target-speaker extraction** pulls out one named voice rather than all voices.

**Conditioning.** Condition the separator on an **enrolment** embedding taken from a short clean sample of the target.
- **Enrolment** is the registration step, like enrolling a fingerprint on a phone: the person's voice is recorded once in advance and turned into an embedding.
- To *condition* a network means to feed it that embedding as an extra input, so its output depends on it.
- Examples: **VoiceFilter** (Google, 2018) and **SpeakerBeam** (NTT, a Japanese telecom research lab).

**Why it helps.** It removes the permutation problem and the unknown speaker count. The output is always "the enrolled person".

**For us.** This is differentiator 6, "find this voice", across a whole file or several files. SAM Audio has no audio-example prompt. (A **prompt** is the instruction given to the model. SAM Audio accepts text, a masked video and time spans, but not "here is a recording of the voice I mean".)

## 6. Audio-visual: using the face

**Audio-visual** methods use the video as well as the sound. A face on screen moves its lips in time with the voice, which is information a microphone never gives.

- **Looking to Listen** (Google, 2018): face embeddings from the video, joined with the mixture spectrogram, predict a **mask** (a 0-to-1 gain per time-frequency bin, lecture 05) for each visible speaker. Its blog post is excellent.
- **Active speaker detection (ASD)**, for example TalkNet and Light-ASD on the **AVA-ActiveSpeaker** dataset: for each **face track** (the same face followed across video frames, as in tracking), "is this person talking now?". It gives precise visual timing anchors.
  - AVA-ActiveSpeaker is a benchmark of film clips where every visible face is labelled speaking or not speaking.
- **Lip-sync** also distinguishes on-screen speakers from off-screen voices, such as commentators or the camera holder.
  - A lip-sync model measures whether mouth movement and audio match in time. A voice with no matching mouth is off-screen.

**For us.** These are the visual cues in differentiator 5. Combined with speaker embeddings (section 2), they give the identity tracking that SAM Audio lacks.

## Read or watch

- RNNoise demo and explainer (blog-style, interactive): https://jmvalin.ca/demo/rnnoise/
- DeepFilterNet repo: https://github.com/Rikorose/DeepFilterNet
- ElevenLabs, *What is speaker diarization?* (a vendor primer): https://elevenlabs.io/blog/what-is-speaker-diarization
- pyannote:
  - repo: https://github.com/pyannote/pyannote-audio
  - community-1 model card (gated, meaning you must log in to Hugging Face and accept its conditions before downloading; Hugging Face is the website that hosts most open models): https://huggingface.co/pyannote/speaker-diarization-community-1
  - project site: https://pyannote.github.io/
- SpeechBrain, whose tutorials cover speaker embeddings, verification and separation: https://github.com/speechbrain/speechbrain
- Google Research blog, *Looking to Listen: audio-visual speech separation*: https://research.google/blog/looking-to-listen-audio-visual-speech-separation/
- TalkNet active speaker detection: https://github.com/TaoRuijie/TalkNet-ASD
- Hugging Face Audio Course (ASR, audio classification and pipelines): https://huggingface.co/learn/audio-course
- Papers:
  - PIT: https://arxiv.org/abs/1607.00325
  - Conv-TasNet: https://arxiv.org/abs/1809.07454
  - VoiceFilter: https://arxiv.org/abs/1810.04826
  - Looking to Listen: https://arxiv.org/abs/1804.03619

## Exercise (1 h)

1. Run the lab's diarisation on `US-3.1` (see `seplab diarize --help`; it runs in `.venv-diar`) and plot the predicted timeline against the ground truth (the known-correct speaker labels that come with the clip).
2. Extract speaker embeddings for 3 s segments of two speakers.
3. Plot the cosine-similarity matrix. The same-speaker blocks should light up, as in face re-ID.
4. Find one segment where the similarity is ambiguous, and listen to it.
