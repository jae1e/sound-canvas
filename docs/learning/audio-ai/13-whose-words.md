# 13. Whose words? Transcribing one speaker: the wearer's voice, enrolment, diarisation plus ASR, and target-speaker recognition

**Why this lecture.** Our field voice-logging app ([MVP requirements](../../products/industrial-voice-logging/mvp-requirements.md)) records on a phone, earbuds or a headset and sends the audio to our own server for transcription. A transcript is only useful, and only lawful, if it holds the right person's words:
- **Law.** Under Korea's 통신비밀보호법 (Protection of Communications Secrets Act), recording a conversation between other people that you are not part of is a crime, punishable by 1–10 years' imprisonment [P]. A participant recording their own conversation is generally lawful, but it still carries civil-liability risk [P].
- **Accuracy.** If a memo says "pressure is fine", the wearer must be the one who said it, not a passer-by.
- **Later.** Multi-person TBM (tool-box meeting) safety briefings need transcripts in which each line carries its speaker.

[Lecture 07](07-speech-diarization-av.md) covered the *audio* side: speaker embeddings, diarisation and DER, blind separation and PIT, target-speaker extraction, and audio-visual active speaker detection. This lecture covers the *text* side: which words belong to whom, and how to keep only the wearer's.

**Labels** (as in lecture 09; research date 2026-11-05): [F] verified on a primary page, in code or in a statute; [V] vendor claim; [P] paper, press or other third party; [E] our estimate or our own measurement; [I] our inference; [H] a hypothesis to test. Legal points come from our [legal research notes](../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md) (section 7) and are not legal advice.

**Words you will meet in this lecture** (each is explained again where it is first used):

| Term | Plain meaning |
|---|---|
| Wearer | The person carrying the phone, earbuds or headset; the owner of the memo |
| Bystander | Anyone else whose voice reaches the mic: a passer-by, a colleague, a PA announcement |
| PTT (push-to-talk) | Audio is captured only while the wearer holds or toggles a button, like a walkie-talkie |
| Armed session | A hands-free recording period that the wearer starts on purpose. VAD gates it, and it pauses after silence |
| VAD (voice activity detection) | A yes/no per frame (a 20 ms slice of audio): "is anyone speaking now?" It does not say who |
| Close-talk mic | A mic a few centimetres from the mouth, such as a headset boom or a lavalier |
| Near field / far field | Near field: close to the mic, where the level changes quickly with distance and the sound is dry. Far field: far from it, where the level changes slowly and the room's echo dominates |
| Critical distance | The distance from a talker at which the direct sound and the room's echo are equally loud |
| DRR | Direct-to-reverberant ratio (lecture 01): the energy of the direct sound over the energy of the echo, in dB |
| OVD (own-voice detection) | "Is the *wearer* speaking now?", answered from the device's sensors rather than from a voiceprint |
| VPU (voice pickup unit) | A vibration sensor in an earbud that feels the wearer's skull vibrate during speech (bone conduction) |
| Enrolment | Recording a person's voice once to make a reference embedding (lecture 07) |
| Speaker verification | "Is this the enrolled person?" A yes/no from comparing an embedding with the reference |
| FAR, FRR, EER | False-accept rate, false-reject rate, and the equal error rate where the two are equal (section 2c) |
| Personal VAD | A VAD conditioned on an enrolled voice. Per frame it says "nobody", "the enrolled person" or "someone else" |
| Diarisation | "Who spoke when", with anonymous labels (lecture 07) |
| ASR | Automatic speech recognition: audio in, text out, with a start and end time for each word. Ours runs on our own server ([lecture 12](12-speech-to-text.md)) |
| Forced alignment | Finding where each already-known word sits in time, with a phoneme or character recogniser |
| DER | Diarisation error rate: wrongly labelled seconds over total speech seconds (lecture 07) |
| cpWER | Concatenated minimum-permutation word error rate: a word score that also punishes words given to the wrong speaker (section 2d) |
| Target-speaker extraction | Pulling one enrolled voice out of a mixture, as audio (lecture 07) |
| Target-speaker ASR | A recogniser that is told whose words to transcribe and ignores the rest |
| Multi-talker ASR | A recogniser that transcribes several overlapping talkers at once |
| SOT | Serialized output training: one output stream holds all talkers' words, one talker after another, with a speaker-change token between them |
| Voiceprint | A stored speaker embedding used to recognise a person. Legally it is biometric data, so any use is opt-in: off until the person explicitly agrees |

## 1. The problem: who said what, in four cases

Three things can go wrong in a transcript that is supposed to carry speakers:
- **Bystander leakage:** someone else's words end up in the wearer's text. This is the legal and trust failure.
- **Missed words:** the wearer's words are dropped, because a gate cut them, an enhancer suppressed them, or the recogniser never produced them. This is the data-loss failure.
- **Wrong attribution:** the words are transcribed but given to the wrong person. In a safety record, "the valve is isolated" said by the supervisor and logged as the worker's statement is a factual error.

| Case | What "single-speaker text" means here | What goes wrong most |
|---|---|---|
| 1. Solo memo in a crowd (subway, yard) | Only the wearer's words. Everyone else is noise and should produce no text | Leakage: a passenger's sentence or a PA announcement lands in the memo. Missed words if the gate is too strict |
| 2. The wearer talks to one other person | The wearer's side is the record. The partner's side is dropped or kept under its own anonymous label, never merged into the wearer's text | Wrong attribution at turn changes and in overlap: the partner's "yes, it's locked out" becomes the wearer's statement |
| 3. TBM briefing led by one person | The leader, who wears the mic, gives the main text. Attendees' questions and answers are labelled "attendee 1", "attendee 2" | Attendees far from the mic are missed. One person is split into two labels, or two people are merged into one. Everyone must know they are being recorded |
| 4. Open meeting, many talkers | There is no single speaker. A full transcript with every line attributed is needed | All three failures, plus overlap and a wrong speaker count. This is still research-hard (the CHiME and NOTSOFAR challenges) |

Cases 1 and 2 are the MVP. Case 3 is the first vertical. Case 4 is out of scope until there is a mic per speaker or a proper conference mic [H, from our [ASR research notes](../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md), Q7 and Q8].

**The capture rule carries the legal weight.** Removing a bystander's text afterwards does not undo the recording of their conversation. What keeps case 1 lawful is *when* the app records: push-to-talk, sessions the wearer starts, and a bystander pause [H; counsel needed].

## 2. A ladder of approaches, from cheapest to hardest

Each rung costs more than the one below it, in compute, data, consent or engineering. Climb only as far as the case needs.

| Rung | Idea | Needs a voiceprint? | Our status |
|---|---|---|---|
| a | By construction: PTT and a close mic | No | MVP |
| b | Own-voice detection from the device's sensors | No | Later, if the hardware allows |
| c | Personal VAD or speaker verification | Yes | Only after counsel, opt-in |
| d | Diarisation plus ASR | No (anonymous labels) | TBM vertical |
| e | Target-speaker extraction before ASR | Yes | Not planned |
| f | Target-speaker and multi-talker ASR | Depends on the model | Watch |
| g | Audio-visual | No | Bodycams, later |

### 2a. By construction: push-to-talk and a close mic

**The idea.** Make the wearer far louder than anyone else at the mic, and record only when the wearer chooses to. Most of the problem then never arises.

**Worked example 1: the inverse-square law.** From lecture 01: in a free field (no reflections), sound pressure falls as 1/r, so the level difference between two distances is 20·log₁₀(r_far / r_near) dB. Assume both people speak with the same effort.
- Mouth to the headset boom mic: 3 cm. Bystander to the same mic: 1.5 m = 150 cm.
- Ratio 150 / 3 = 50, and 20·log₁₀(50) = 20 × 1.699 = **34.0 dB**: a pressure ratio of 50 and a power ratio of 2,500. The bystander's voice arrives with 1/2,500 of the wearer's power.

| Mic position | Gap to a bystander at 1.5 m | Gap to a partner at 1.0 m |
|---|---|---|
| Headset boom, 3 cm from the mouth | 34.0 dB | 30.5 dB |
| Phone held at the mouth for PTT, 5 cm | 29.5 dB | 26.0 dB |
| Earbud, about 12 cm from the mouth | 21.9 dB | 18.4 dB |
| Phone held in front of the face, 30 cm | 14.0 dB | 10.5 dB |

**Two corrections that eat into the gap.**
- **Effort.** A shouting bystander is louder at the source. Typical levels at 1 m are about 60 dB for normal speech and 76 dB for a shout [P, ANSI S3.5 via our ASR notes]: 16 dB, about half of the boom's advantage. People also raise their voices in noise without noticing (the Lombard effect).
- **The room.** Indoors, the level stops falling beyond the **critical distance** r_c, where the room's echo (diffuse, roughly the same everywhere in the room) becomes as loud as the direct sound. A common estimate for a non-directional source is r_c ≈ 0.057·√(V / RT60) metres, with V in m³ and RT60 in seconds (lecture 01).
  - **Worked example 2.** Lecture 01's room: V = 60 m³ and RT60 = 0.48 s, so r_c = 0.057 × √125 = 0.057 × 11.2 ≈ **0.64 m**.
  - Bystander at 1.5 m: the direct sound is 20·log₁₀(0.64 / 1.5) = −7.4 dB relative to the echo level, so direct plus echo comes to 10·log₁₀(1 + 10^(−0.74)) = **+0.7 dB** above the echo level.
  - Wearer at 3 cm: the direct sound is 20·log₁₀(0.64 / 0.03) = **+26.5 dB** above the same echo level, and the wearer's own echo is negligible next to it.
  - Gap: 26.5 − 0.7 ≈ **25.8 dB**, not 34 dB. The room hands the bystander back about 8 dB. Subway cars and concrete plant rooms are reverberant as well [I].

**Level gating.** With a gap like that, a simple rule removes most other speech: keep a frame only if its level is close to the wearer's typical speech level.
1. Measure each 20 ms frame's level in dB: 10·log₁₀ of the mean of the squared samples.
2. Estimate the wearer's reference level L_ref from the session, for example the 95th percentile of frame levels. When the gap is large, the loudest 5% of frames are almost always the wearer.
3. Keep frames whose level is at least L_ref − G. With G = 15 dB and a 34 dB gap, a bystander speaking normally sits about 19 dB below the gate.

The exercise's simulation on two lab conversation clips (US-3.1, English and Korean; noise 15 dB below the wearer; our run on 2026-11-05) gives [E]:

| Wearer's mic vs the other talker | Level gap | Wearer frames kept | Other-only frames kept |
|---|---|---|---|
| 3 cm vs 1.5 m | 34.0 dB | 87–92% | 4–6% |
| 12 cm vs 1.0 m | 18.4 dB | 88–93% | 13–19% |
| 30 cm vs 1.0 m | 10.5 dB | 90–93% | 42–49% |

- **At 34 dB the leak is noise, not the voice.** The 4–6% are loud bursts in the background noise: with the noise removed, no frame of the other voice passes. Without noise (English clip), about 3% of the other voice passes at 18.4 dB and about 34% at 10.5 dB.
- **The wearer loses 10–15% of their own frames.** Speech swings by 30 dB or more between vowels, soft consonants and the pauses inside a sentence, and a 15 dB gate cuts the quiet parts. That is why the app decides per word or per segment, not per frame (section 3).
- **Mic position decides.** The gate works with a boom or a phone at the mouth, is marginal with earbuds, and fails with a phone held in front of the face. So the threshold must depend on the input route, which requirement A3 already logs with every segment. A phone held away from the face needs rung (b) or later.

### 2b. Own-voice detection (OVD)

**The idea.** Use a signal that only the wearer can produce, so that no voiceprint is needed.

**VPU and bone conduction.** When you speak, your skull vibrates. An accelerometer pressed against the ear canal or the skin feels it; a bystander's voice, arriving through the air, barely moves it.
- An Apple patent describes the core rule: declare "wearer speech" only when the accelerometer shows vibration **and** the microphones show voiced speech at the same moment, an AND of two detectors [P, [US9313572B2](https://patents.google.com/patent/US9313572B2/en)]. The accelerometer mainly catches *voiced* sound (made by the vocal folds) below about 800 Hz, so unvoiced sounds such as /s/ and /f/ must come from the microphones.
- It is the same trick as telling which machine is running with a structure-borne vibration sensor instead of an airborne microphone: the coupling path identifies the source. Weakness: coughing, chewing and footsteps shake the sensor too [P].
- Apple lists a "speech-detecting accelerometer" and Conversation Awareness (media volume drops when you start talking) for AirPods Pro 3 [F, [Apple specs](https://www.apple.com/airpods-pro/specs/)], without saying which sensor drives the feature. Samsung describes the Galaxy Buds4 Pro VPU as a bone-conduction sensor fused with three microphones [V, [Samsung Newsroom, 2026-06-25](https://news.samsung.com/uk/finding-your-voice-anywhere-the-tech-behind-galaxy-buds4-pros-crystal-clear-calls)].

**Near-field cues without a VPU.**
- **Level** (section 2a) and **DRR**: in the example room the wearer at 3 cm is dry (DRR ≈ +26 dB) and the bystander at 1.5 m is wet (DRR ≈ −7 dB). DRR can be estimated from the recording alone, for example from how fast energy decays after each word, but the estimate is noisier than level [I].
- **Spectral tilt** (the balance between low and high frequencies): a close directional mic boosts the bass (the proximity effect, lecture 04), and a far talker arrives partly through reflections off soft surfaces that absorb the highs. Useful as an extra feature, weak on its own [I].
- **Inter-mic level difference (ILD).** Most phones have one mic at the bottom edge and one at the top. Both are almost the same distance from a far talker, but very different distances from a mouth near the bottom edge.

**Worked example 3: two phone mics.** The phone is held at the mouth for PTT. The bottom mic is 5 cm from the lips, and the top mic is 14 cm further away, at 19 cm.
- Wearer: 20·log₁₀(19 / 5) = **11.6 dB** louder at the bottom mic. Bystander 1.5 m away, in line with the phone (the worst case): 20·log₁₀(1.64 / 1.50) = **0.8 dB**; from the side, about 0 dB.
- A rule such as "wearer if ILD > 6 dB" separates them *regardless of how loudly each person talks*. In our simulation the wearer's median ILD came out at 9 dB (noise pulls it below 11.6) and the other talker's at about 0 dB [E].
- It is a gradiometer: like two accelerometers a few centimetres apart, the difference cancels distant sources and keeps nearby ones. It works only while the phone is near the mouth; at 30 cm both mics are far. Earbuds do the same internally by beamforming (combining their mics so that they listen in one direction) toward the mouth.

**What vendors expose (checked 2026-11-05).**
- We found **no public Android or iOS API** that gives a third-party app the earbud's VPU signal or an own-voice flag [I, from searches; absence is hard to prove]. Over Bluetooth the phone receives one processed mono voice stream, with the VPU already fused in.
- Android does describe the phone's own mics: `AudioRecord.getActiveMicrophones()` returns a `MicrophoneInfo` per active mic with its position in metres (API level 28 and later), and the position may be reported as unknown [F, [Android reference](https://developer.android.com/reference/android/media/MicrophoneInfo)]. Whether the Galaxy S25 gives an app two raw mic channels has to be tested on the device [I].

### 2c. Personal VAD and speaker verification with enrolment

**The idea.** Enrol the wearer once, then ask of every stretch of audio: "is this the enrolled voice?"
- **Speaker verification** (lecture 07, section 2): an ECAPA-TDNN network turns 1–3 s of speech into an embedding, and its cosine similarity with the wearer's enrolment embedding is compared with a threshold.
- **Personal VAD** (Google, 2019–20) merges VAD and verification into one tiny network of about 130,000 parameters. Per frame it outputs non-speech, target speaker or other speaker, conditioned on the enrolment embedding or a verification score, so that a streaming recogniser runs only while the enrolled user talks [P, [project page](https://google.github.io/speaker-id/publications/PersonalVAD/)].

**The two errors.** **FAR** (false-accept rate) is the fraction of other people's segments accepted as the wearer: bystander leakage. **FRR** (false-reject rate) is the fraction of the wearer's segments rejected: missed words. Raising the threshold lowers FAR and raises FRR. The **EER** (equal error rate) is the error rate at the threshold where FAR = FRR: one summary number, not necessarily the setting to use.

**Worked example 4.** Ten wearer segments and ten segments from other people, with their cosine scores:
- Wearer: 0.82, 0.77, 0.74, 0.71, 0.66, 0.62, 0.58, 0.49, 0.41, 0.33
- Others: 0.52, 0.44, 0.38, 0.31, 0.27, 0.22, 0.18, 0.12, 0.08, 0.03

| Threshold (accept if score ≥ threshold) | FAR | FRR |
|---|---|---|
| 0.30 | 4/10 = 40% | 0/10 = 0% |
| 0.42 | 2/10 = 20% | 2/10 = 20% |
| 0.50 | 1/10 = 10% | 3/10 = 30% |
| 0.55 | 0/10 = 0% | 3/10 = 30% |

- Check one row by hand: at 0.42 the others' 0.52 and 0.44 pass (FAR 2/10), and the wearer's 0.41 and 0.33 fail (FRR 2/10). Any threshold above 0.41 and up to 0.44 gives FAR = FRR = 20%, so **EER = 20%**.
- For us, a false accept puts a bystander's words in the log, which is worse than a false reject when the audio is kept for review. So we would set the threshold above the EER point, for example 0.55 (FAR 0%, FRR 30%), and send rejected segments to review rather than delete them.

```python
import numpy as np

target   = np.array([0.82, 0.77, 0.74, 0.71, 0.66, 0.62, 0.58, 0.49, 0.41, 0.33])  # wearer
impostor = np.array([0.52, 0.44, 0.38, 0.31, 0.27, 0.22, 0.18, 0.12, 0.08, 0.03])  # others

def rates(th):
    far = np.mean(impostor >= th)   # someone else accepted as the wearer
    frr = np.mean(target < th)      # the wearer rejected
    return far, frr

for th in (0.30, 0.42, 0.50, 0.55):
    far, frr = rates(th)
    print(f"threshold {th:.2f}: FAR {far:.0%}  FRR {frr:.0%}")

# EER: try every observed score as the threshold and take the one where FAR and FRR meet
ths = np.sort(np.concatenate([target, impostor]))
t_eer = ths[np.argmin([abs(np.subtract(*rates(t))) for t in ths])]
print("EER about", f"{np.mean(rates(t_eer)):.0%}", "at threshold", t_eer)   # 20% at 0.44
```

**Short and noisy segments degrade verification.**
- A pretrained ECAPA-TDNN on VoxCeleb1 (celebrity interviews: real-world, but not a subway) had an EER of 17.29% on 0.5 s segments, 6.98% at 1.0 s, 2.99% at 1.5 s and 2.30% at 2.0 s [P, [He et al. 2023](https://arxiv.org/abs/2310.04681)]. On full-length test utterances, SpeechBrain's ECAPA model reports 0.80% [V, [model card](https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb)]. Field memos are full of short pieces: "yes", "done", "valve three".
- **Worked example 5: leakage per hour.** Say an hour of armed session has 120 bystander segments that reach the verifier, with the threshold at the EER point. With 2 s segments, 120 × 0.023 ≈ **3** leak; at 1 s, 120 × 0.070 ≈ **8**; at 0.5 s, 120 × 0.173 ≈ **21**. Noise and Bluetooth codecs make this worse, because those EERs come from cleaner audio [I]. So verification can be a second check behind rung (a), never a replacement for it.

**Legal status: a voiceprint is biometric data.**
- **Korea:** a voice used to recognise a person is biometric "sensitive information" under PIPC guidance on PIPA (개인정보보호법, the Personal Information Protection Act). It needs separate consent, and in principle the raw voice should be deleted once the features are extracted [P].
- **Illinois BIPA** (Biometric Information Privacy Act): "voiceprint" is a biometric identifier, requiring written notice, a written release and a public retention schedule [F].
- **EU GDPR, Article 9:** biometric data used to identify people is a special category, and an employee's consent is rarely valid [P]. The AI Act treats pure one-to-one verification ("is this the person they claim to be?") as outside high-risk remote biometric identification [F, per our notes], but the GDPR still applies.
- **Consequence:** opt-in per person, off by default, templates only on our server, nothing before counsel has reviewed it, and not in v1.

### 2d. Diarisation plus ASR

**The pipeline.** Run ASR (words with timestamps) and diarisation (speaker turns) separately on the same audio, then give each word to the speaker whose turn overlaps it most.
- WhisperX does exactly this: Whisper writes the text, wav2vec2 forced alignment finds the word times, pyannote community-1 finds the speaker turns, and `assign_word_speakers` gives each word the speaker with the largest total time overlap [F, [code](https://github.com/m-bain/whisperX/blob/main/whisperx/diarize.py)]. Its default alignment models include a Korean one (`kresnik/wav2vec2-large-xlsr-korean`) [F, code]; check that model's licence before use.

**Worked example 6: a word at a turn boundary.** The word "valve" spans 4.10–4.50 s. Diarisation says A speaks until 4.30 s and B from 4.20 s.
- Overlap with A: 4.10–4.30 = 0.20 s. Overlap with B: 4.20–4.50 = 0.30 s. The word goes to **B**.
- If A actually said "valve" and B only coughed at 4.20 s, the word is misattributed. Attribution errors live at turn boundaries. pyannote's "exclusive" output (exactly one speaker at each moment) makes the assignment simpler [V, [pyannote blog](https://pyannote.ai/blog/community-1)], but it still has to pick one.

**Overlap.** A standard recogniser outputs one stream of words. When two people talk at once, it usually transcribes the louder one and drops or garbles the other, and whatever it produces gets a single label. In our case the wearer is louder, so recognised bystander words in an overlap are glued into the wearer's text: leakage disguised as the wearer. The lab's US-3.1 conversation clips have 11–14% overlapped speech, so this is not a corner case.

**Metrics: DER against cpWER.** DER (lecture 07) counts *seconds* (missed, false alarm, confusion) and ignores words. **WER** (lecture 12) = (substituted + deleted + inserted words) / reference words, and it ignores speakers. **cpWER**, concatenated minimum-permutation WER, was introduced for the CHiME-6 challenge [P, [Watanabe et al. 2020](https://arxiv.org/abs/2004.09249)]:
1. For each reference speaker, join all their words in time order into one string. Do the same for each label the system output.
2. Try every one-to-one pairing of reference speakers with system labels. The labels are anonymous, so "spk1" might be A or B: the same permutation problem as PIT in lecture 07.
3. For each pairing, add up the word errors of each pair. A system label with no reference partner counts as insertions; a reference speaker with no system partner counts as deletions.
4. cpWER = the smallest total / the number of reference words.

**Worked example 7.** A says "close valve three now", B says "valve three is open", then A says "okay done". The system gets every word right except "open" → "often", but gives "okay done" to the wrong speaker.
- Reference: A = "close valve three now okay done" (6 words), B = "valve three is open" (4 words), N = 10. System: spk1 = "close valve three now", spk2 = "valve three is often okay done".
- Plain WER, ignoring speakers: 1 substitution / 10 = **10%**.
- Pairing A↔spk1, B↔spk2: A loses "okay done" (2 deletions); B gets "often" for "open" (1 substitution) and the extra "okay done" (2 insertions). Total 5. The other pairing, A↔spk2 and B↔spk1, gives 3 + 3 = 6 (check it by hand).
- cpWER = min(5, 6) / 10 = **50%**.
- **Lesson:** every word given to the wrong speaker costs two errors, a deletion where it belongs and an insertion where it landed. DER would barely notice, because "okay done" lasts under a second. [MeetEval](https://github.com/fgnt/meeteval) (MIT licence) computes cpWER, and also tcpWER, a time-constrained version that requires each word to fall at roughly the right time.

**Diarisation models we could run on our server.**
- **NeMo Streaming Sortformer** (NVIDIA) outputs per-frame activity for at most **4 speakers**, labelled in order of arrival, with a speaker cache that keeps labels stable from chunk to chunk [V, [NVIDIA blog, 2025-08-18](https://developer.nvidia.com/blog/identify-speakers-in-meetings-calls-and-voice-apps-in-real-time-with-nvidia-streaming-sortformer/)]. Its [model card](https://huggingface.co/nvidia/diar_streaming_sortformer_4spk-v2) gives CC-BY-4.0, a DER of about 13.2–14.9 on DIHARD III with up to 4 speakers, and latency settings from 0.32 s to 30.4 s [F, per our notes]. NVIDIA calls it optimised for English and says heavy crosstalk and rapid turn-taking still hurt; Nemotron 3 Diarization (up to 8 speakers) is the newer release [V].
- **pyannote community-1** (offline): DER from 17.0 (AMI-IHM) to 20.3 (AliMeeting) [F, [model card](https://huggingface.co/pyannote/speaker-diarization-community-1)]. Expect about 20% on far-field noisy audio [H].
- **For TBM:** anonymous labels ("leader", "attendee 1", ...). The leader is the loud, close voice found by rung (a), not by a voiceprint.

### 2e. Target-speaker extraction before ASR

- **The idea** (lecture 07, section 5): enrol the voice, extract it as audio with VoiceFilter or SpeakerBeam, then run ASR on the result. It needs enrolment, so the legal status of section 2c applies.
- **The enhancement caveat.** Any front-end that rewrites the waveform can leave artifacts ([lecture 11](11-noise-reduction.md)): watery or "musical" noise, clipped word endings. Recognisers are trained to tolerate noise, not artifacts, so over-suppression drops words.
  - Google's VoiceFilter-Lite post says exactly this, and counters it with a training loss that punishes over-suppression more than under-suppression, and by adapting the suppression strength to the noise type at run time. It works on the recogniser's own input features, not the waveform, and reports WER improvements of 25.1% on noisy overlapped speech and 14.7% on reverberant overlapped speech [V, [Google Research blog, 2020](https://research.google/blog/improving-on-device-speech-recognition-with-voicefilter-lite/)].
  - Our ASR notes found enhancement front-ends mostly neutral to harmful for modern recognisers [P]. **For us:** not in the ASR path; at most a cleaned copy for human listening.

### 2f. Target-speaker ASR and multi-talker ASR (concepts only)

- **Target-speaker ASR.** Give the recogniser a "who" input, either an enrolment embedding or one speaker's diarisation activity, and train it to output only that speaker's words. Extraction and recognition become one network, so no audio artifacts are created on the way.
  - Example: NVIDIA's streaming multitalker Parakeet (0.6B parameters) is conditioned on Sortformer's per-speaker activity through learned "speaker kernels", with no enrolment. It reports cpWER 21.26 on AMI IHM (headset mics) and 37.44 on AMI SDM (one distant mic), under the NVIDIA Open Model License; the card lists no languages [V, [model card](https://huggingface.co/nvidia/multitalker-parakeet-streaming-0.6b-v1)].
- **SOT (serialized output training).** One decoder writes all talkers' transcripts one after another, in order of start time, with a speaker-change token between them: "close valve three now ⟨sc⟩ valve three is open" [P, [Kanda et al. 2020](https://arxiv.org/abs/2003.12687)]. There is no fixed number of output heads, so it can also estimate how many people spoke.
- **Speaker-attributed ASR** adds a speaker label to each output word, or an identity when enrolled profiles exist [P, [Kanda et al. 2021](https://arxiv.org/abs/2104.02128)].
- **Status:** mostly English meeting benchmarks; Korean and mixed Korean-English performance is unknown [I]. Watch, do not build.

### 2g. Audio-visual (later, for bodycams)

- Active speaker detection (lecture 07, section 6) tells which visible face is talking. **The twist:** on a bodycam the wearer is the one person never in frame, so a loud, dry voice with no moving mouth in view points to the wearer, and a voice that matches a visible mouth is a bystander [I]. In Korea, business-purpose mobile video devices in public places must signal recording by light, sound or signs (PIPA §25-2) [P]. Video is outside the MVP.

## 3. Confidence and fallbacks

**Principle:** when you are not sure whose words they are, do not write them down as the wearer's. Measure it with a **wearer-dominance score per segment**: D = (speech frames within G dB of L_ref) / (all speech frames, as judged by VAD). It pools many frames, so the quiet consonants that section 2a showed falling below the gate do not sink a segment. Proposed starting values [H; tune them on the noisy-subway test set]:

| Condition | What the app does |
|---|---|
| D ≥ 0.8 and the recogniser is confident | Show the text as the wearer's |
| 0.4 ≤ D < 0.8, or overlap suspected | Show it greyed with "check speaker", and queue it for review |
| D < 0.4: likely a bystander | Do not transcribe by default. Show "[other voice, not transcribed]" with its time |
| No speech, or low recogniser confidence | Mark it and show no text (requirement A11) |

**Worked example 8.** A 6 s segment has 300 frames of 20 ms. VAD marks 250 as speech, and 230 of those are within 15 dB of L_ref: D = 230 / 250 = **0.92**, the wearer. Another segment has 40 such frames out of 180 speech frames: D = 0.22, so it is not transcribed.

**Fallbacks:**
- **Do not transcribe likely bystander speech.** Send only wearer-dominant spans to the recogniser, padded at each end (start with about 0.3 s [H]) so word edges survive. The EDPB (European Data Protection Board) guidance on voice assistants asks designers to filter out background speech and other people's voices [F, [EDPB guidelines 02/2021](https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf)].
- **Bystander pause.** One tap pauses capture and logs a pause event (requirement A14), for moments when others are talking nearby. It is the only fallback that prevents a recording rather than cleaning one up afterwards.
- **Human review.** The user taps a flagged line to hear it (A11) and marks it "mine" or "not mine", or corrects the text. Edits become revision events (A9) and feed the evaluation set (S-3).
- **Two numbers per mic route:** the **leak rate** (bystander words that reached the transcript) and the **miss rate** (wearer words that were lost). They are FAR and FRR, counted in words.

## In our app

- **MVP:**
  - rung (a): push-to-talk by default and armed sessions that the wearer starts, with no ambient mode (MVP decision 2);
  - a route-aware level gate and the dominance score D, computed on the server from the stored 16 kHz segments and the recogniser's word timestamps, with the route taken from requirement A3;
  - low-confidence flags, "not transcribed" placeholders, the bystander pause (A14) and review (A11);
  - in the data model, `speaker.label` is always `"wearer"` and `identity_ref` stays empty (the schema in our legal notes).
- **Later:**
  - **(b)** once an earbud exposes a VPU or own-voice signal to apps (none found so far), or once the two-mic ILD check works in a capture test on the S25;
  - **(d)** for TBM: pyannote community-1, or Sortformer when there are at most 4 speakers and streaming matters; anonymous `diar_N` labels with the leader found by level; a spoken announcement, an attendee sign-in and a logged consent event; cpWER measured on our own recorded briefings. One mic per speaker will help more than a better model;
  - **(c)** only after counsel: opt-in per person, templates only on our server, raw enrolment audio deleted after feature extraction, and used only to check that the speaker is the wearer, never to identify other people;
  - **(e) and (f):** watch them. Nothing touches the recogniser's input without an A/B test.
- **Never:** emotion, stress or "productivity" analytics from voice. The EU AI Act bans emotion recognition in the workplace (Article 5(1)(f)) [P], and it would destroy workers' trust. No covert identification of bystanders either.

## Read or watch

All links checked on 2026-11-05.

- pyannote.ai, *Community-1* release post, including "exclusive" diarisation for aligning speaker turns with transcripts: https://pyannote.ai/blog/community-1
- WhisperX README: Whisper, forced alignment and pyannote in one pipeline, with word-level speaker labels: https://github.com/m-bain/whisperX
- NVIDIA Technical Blog, *Identify Speakers in Meetings, Calls, and Voice Apps in Real-Time with NVIDIA Streaming Sortformer*: https://developer.nvidia.com/blog/identify-speakers-in-meetings-calls-and-voice-apps-in-real-time-with-nvidia-streaming-sortformer/
- NVIDIA NeMo documentation, *Speaker Diarization* (end-to-end Sortformer, the cascaded pipeline, and diarisation with ASR): https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/speaker_diarization/intro.html
- Google Research blog, *Improving On-Device Speech Recognition with VoiceFilter-Lite* (enrolment-conditioned filtering, and why over-suppression hurts ASR): https://research.google/blog/improving-on-device-speech-recognition-with-voicefilter-lite/
- MeetEval, the toolkit for cpWER and tcpWER: https://github.com/fgnt/meeteval
- Hervé Bredin (pyannoteAI), *Beyond Transcription: Building Voice AI That Understands Conversations* (video, AI Engineer): https://www.youtube.com/watch?v=mFLlVpnGpds
- Kanda et al., *Serialized Output Training for End-to-End Overlapped Speech Recognition* (paper): https://arxiv.org/abs/2003.12687

## Exercise (1 h)

**Data.** The lab's synthetic clips are described in the [lab README](../../../tools/separation-lab/README.md) and [DATA.md](../../../tools/separation-lab/DATA.md).
- Use `tools/separation-lab/data/clips/US-3.1/` (English, LibriSpeech) and `US-3.1-ko/` (Korean, Zeroth-Korean): two- and three-person conversations. Each clip folder has `mixture.wav`, one stem per speaker (`spk_<id>.wav`), the background (`others.wav`) and a `manifest.json` whose `targets[].activity` lists each speaker's speech segments in seconds. All are 16 kHz mono. (`US-2.1` is not a conversation: it is one toast speaker over crowd babble and music.)
- **Recordings stay local and are never committed.** The whole `data/` folder is git-ignored.

**(a) Wearer near, bystander far (40 min).** Run this from the repo root inside `~/audio-learn`:

```python
# Reads local clips; writes one WAV under data/tmp/ (git-ignored).
import json
import numpy as np, soundfile as sf

clip = "tools/separation-lab/data/clips/US-3.1/clip2_2spk_mixed"   # or US-3.1-ko/clip2_2spk_mixed
m = json.load(open(f"{clip}/manifest.json"))
sr, hop = m["sr"], int(0.02 * m["sr"])                  # 20 ms frames
stems = [sf.read(f"{clip}/{t['path']}")[0] for t in m["targets"]]
noise = sf.read(f"{clip}/others.wav")[0]
n = len(noise) // hop
tc = (np.arange(n) + 0.5) * hop / sr                    # frame centres in seconds

def is_active(segs):                                    # ground truth from the manifest
    return np.any([(tc >= s) & (tc < e) for s, e in segs], axis=0)

def frame_db(x):
    return 10 * np.log10((x[: n * hop] ** 2).reshape(n, hop).mean(axis=1) + 1e-12)

def unit(x, act):                                       # unit RMS while the person talks
    return x / np.sqrt(np.mean(x[: n * hop][np.repeat(act, hop)] ** 2))

aw, ab = (is_active(t["activity"]) for t in m["targets"])   # first speaker = the wearer
w, b = unit(stems[0], aw), unit(stems[1], ab)
z = noise / np.sqrt(np.mean(noise ** 2)) * 10 ** (-15 / 20)   # noise 15 dB below the wearer

for r_w, r_b in [(0.03, 1.5), (0.12, 1.0), (0.30, 1.0)]:
    mix = w + b * r_w / r_b + z                         # pressure falls as 1/r
    lv = frame_db(mix)
    keep = lv >= np.percentile(lv, 95) - 15             # the level gate, G = 15 dB
    right = np.concatenate([keep[aw], ~keep[ab & ~aw]]).mean()
    print(f"{r_w*100:.0f} cm vs {r_b} m ({20*np.log10(r_b/r_w):.1f} dB): "
          f"wearer kept {keep[aw].mean():.0%}, other-only kept {keep[ab & ~aw].mean():.0%}, "
          f"right decisions {right:.0%}")
    if r_w == 0.12:                                     # to listen to (headphones, low volume)
        sf.write("tools/separation-lab/data/tmp/l13_mix_12cm.wav", 0.1 * mix, sr, subtype="FLOAT")
```

1. Run it on the English and the Korean clip and compare with the table in section 2a. "Right decisions" is the share of speech frames where the gate made the correct keep-or-drop choice.
2. Set the noise to zero (`z = 0 * noise`) and run again. Which leaks were the voice, and which were the noise?
3. Try G = 10, 15 and 20 dB and plot "wearer kept" against "other-only kept". It is the same trade-off as FAR against FRR in section 2c.
4. Swap the roles (make the second speaker the wearer) and check that the conclusions hold.
5. Listen to `l13_mix_12cm.wav` on headphones. Can you understand the other talker? A recogniser probably can, too.
6. Stretch: with `r_w = 0.05`, build a second "top mic" signal `w * 5/19 + b * r_w / (r_b + 0.14) + np.roll(z, 8000)` and use the frame-level dB difference between the two mics as the rule ("wearer if more than 6 dB"). Does it still work when you make the other talker 16 dB louder?
7. Variants: in `US-1.x`, the `camera_holder_*` stem is dry and 4 dB hot (the closest thing to a wearer) and the `passer_by_*` stems are bystanders. In `US-2.1`, treat `others_crowd_babble.wav` as the crowd of case 1.

**(b) cpWER by hand (15 min).** Reference: A says "lock out pump two"; B says "pump two is locked". System: spk1 = "lock out pump", spk2 = "two pump two is locked". Compute the plain WER on the time-ordered words (ignoring speakers), then the errors for both pairings and the cpWER, and explain in one sentence why the two differ. Check: plain WER 0%, cpWER 2/8 = 25%.

**(c) Reflect (5 min).** For each of the four cases in section 1, write which rung you would use first, and which of the three failures (leakage, missed words, wrong attribution) worries you most.
