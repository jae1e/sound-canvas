# 07. Speech: enhancement, diarisation, speaker separation and audio-visual

Most of our personas (P1–P5) are about **voices**, so this lecture covers the speech side of the field.

## 1. Speech enhancement (denoise and dereverb)

**Classical.** Estimate the noise power spectrum, then apply a Wiener or spectral-subtraction gain (lecture 05).

**RNNoise** (Jean-Marc Valin, 2017). A **hybrid** design and a model of good engineering:
1. Classical DSP computes about 22 band energies and pitch features.
2. A tiny recurrent network predicts a gain for each band.
3. DSP applies the gains, plus a pitch comb filter.

It runs in real time on a CPU. Its demo page is the best blog-style explanation of a neural audio model anywhere.

**DeepFilterNet** (2022–23). It predicts complex "deep filters" (a short complex FIR filter per bin), which helps phase. It is real-time and open source.

**Commercial enhancers.** Adobe Podcast *Enhance Speech*, ElevenLabs *Voice Isolator*, Descript *Studio Sound*, Krisp, NVIDIA Broadcast, and the voice-isolation modes on phones.
- Some of these behave **generatively** and make speech sound "studio".
- Users report robotic or muffled artifacts and clipped word endings at high strength. These are anecdotes collected in our [market study notes](../../market-studies/ai-media-saas-screening/research-notes/demand_pain_points.md).
- Same trade-off as lecture 08: plausible against faithful.

## 2. Speaker embeddings: re-ID for voices

**Embeddings.** A network maps a speech segment of about 1–3 s to a fixed vector, typically of 192–512 dimensions:
- the same speaker lands close (by cosine similarity);
- different speakers land far apart.

**History.** i-vectors, then **x-vectors** (TDNN), then **ECAPA-TDNN** and ResNet variants (WeSpeaker).

**Training.** Classification over thousands of VoxCeleb speakers with margin losses (AAM-softmax/ArcFace). These are the **same losses used for face recognition**.

**Speaker verification.** Threshold the cosine similarity; quality is reported as an equal error rate (EER).

**Your face re-ID intuition transfers directly.** This is the building block for "is chunk 7 still speaker A?" in differentiator 1, identity-consistent separation.

## 3. Diarisation: "who spoke when"

**The pyannote pipeline**, which our lab uses (`speaker-diarization-community-1`):
1. **Local segmentation.** A neural model looks at about 10 s windows and outputs frame-level activity for up to a few local speakers, including **overlapped speech**. It uses a "powerset" multi-class formulation.
2. **Embeddings.** For each local speaker in each window. The community-1 model card cites WeSpeaker embeddings.
3. **Global clustering.** Links local speakers across windows into global identities. The community-1 card cites **VBx** (Bayesian HMM clustering); pyannote 3.x used agglomerative clustering.
4. **Output.** A timeline of speaker labels. Community-1 also returns an "exclusive" version, with one speaker per moment, that is easier to align with transcripts.

**The metric: DER** (diarisation error rate) = (missed speech + false alarms + speaker confusion) / total speech.

**Our numbers:**

| Scenario | DER | Note |
|---|---|---|
| 2–3 person conversations | ~0.09 | Good |
| Toasts over crowd and music | ~0.11–0.14 | Good |
| Street interviews | ~0.34 | Poor: quiet passers-by merge into the interviewee's cluster |

**Alternatives:**
- End-to-end diarisation (EEND).
- Diarisation inside ASR (WhisperX-style pipelines).
- Vendor APIs; ElevenLabs, AssemblyAI and others sell diarisation with transcription.

## 4. Blind speech separation (the "cocktail party problem")

**The permutation problem.** A network that outputs "speaker 1" and "speaker 2" can't know which output should be which person.
- **Deep clustering** (2016): embed every time-frequency bin, then run k-means.
- **PIT, permutation-invariant training** (2016–17): compute the loss for every assignment of outputs to targets and train on the best one. It is now standard.

**Architectures.** Conv-TasNet (2018), DPRNN, SepFormer, TF-GridNet.
- They reach well above **+20 dB SI-SDRi on clean synthetic two-speaker sets** (WSJ0-2mix).
- They drop sharply on noisy, reverberant, real recordings.
- They need a known maximum number of speakers.

**What this means for us.** Separating voice from voice is a hard, separately studied problem. Our lab shows SAM Audio's span-anchored voice-from-voice separation gives about **0 to +1 dB mean**, with identity swaps between chunks. It is a weak spot to engineer around, not something a prompt fixes.

## 5. Target-speaker extraction: "this voice, please"

**Conditioning.** Condition the separator on an **enrolment** embedding taken from a short clean sample of the target. Examples: **VoiceFilter** (Google, 2018) and SpeakerBeam (NTT).

**Why it helps.** It removes the permutation problem and the unknown speaker count. The output is always "the enrolled person".

**For us.** This is differentiator 6, "find this voice", across a whole file or several files. SAM Audio has no audio-example prompt.

## 6. Audio-visual: using the face

- **Looking to Listen** (Google, 2018): face embeddings from the video, joined with the mixture spectrogram, predict a mask for each visible speaker. Its blog post is excellent.
- **Active speaker detection (ASD)**, for example TalkNet and Light-ASD on the AVA-ActiveSpeaker dataset: for each face track, "is this person talking now?". It gives precise visual timing anchors.
- **Lip-sync** also distinguishes on-screen speakers from off-screen voices, such as commentators or the camera holder.

**For us.** These are the visual cues in differentiator 5. Combined with speaker embeddings (section 2), they give the identity tracking that SAM Audio lacks.

## Read or watch

- RNNoise demo and explainer (blog-style, interactive): https://jmvalin.ca/demo/rnnoise/
- DeepFilterNet repo: https://github.com/Rikorose/DeepFilterNet
- ElevenLabs, *What is speaker diarization?* (a vendor primer): https://elevenlabs.io/blog/what-is-speaker-diarization
- pyannote:
  - repo: https://github.com/pyannote/pyannote-audio
  - community-1 model card (gated; accept its conditions on Hugging Face): https://huggingface.co/pyannote/speaker-diarization-community-1
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

1. Run the lab's diarisation on `US-3.1` (see `seplab diarize --help`; it runs in `.venv-diar`) and plot the predicted timeline against the ground truth.
2. Extract speaker embeddings for 3 s segments of two speakers.
3. Plot the cosine-similarity matrix. The same-speaker blocks should light up, as in face re-ID.
4. Find one segment where the similarity is ambiguous, and listen to it.
