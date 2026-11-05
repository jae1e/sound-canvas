# Korean speech vs English: pyannote and SAM Audio on synthetic twin sets

Run date: 2026-11-05. Hardware: RTX 4090, bf16 SAM Audio, pyannote `speaker-diarization-community-1` (4.0.7). Code: `seplab/zeroth.py`, `seplab/eval_language.py`, `seplab/build_sets.py` (`build_korean`), tests in `tests/test_korean.py`. Raw outputs are in `runs/korean/` (gitignored).

**Limitation up front.** Every number below comes from 5 synthetic clips per set (12 or 17 speaker tracks), built from read speech. The English and Korean sets use different speakers and different recording conditions, so a difference of a few dB or a few DER points is within noise. Read the results as "no sign of a Korean-specific problem", not as a ranking of languages. Nothing here is a real-world measurement.

## Data and method

- **Korean speech:** Zeroth-Korean (OpenSLR SLR40, CC BY 4.0, licence checked on https://www.openslr.org/40/ on 2026-11-05). The first 1.3 GB of the 10 GB tar.gz was streamed with curl into tar (the Google Storage URL on the page returned `AccessDenied`, so the OpenSLR mirror `https://www.openslr.org/resources/40/zeroth_korean.tar.gz` was used). One truncated FLAC at the cut was deleted. The loader keeps speakers with at least 40 utterances of 2 to 15 s: **47 speakers (29 F, 18 M)**, 61 to 504 utterances each. The corpus ships `AUDIO_INFO` with speaker sex, so same-gender and mixed-gender pairs are labelled (speaker names in that file are not used anywhere). Zeroth utterances are short read sentences (mostly 3 to 8 s).
- **English speech:** LibriSpeech test-clean, 40 speakers, as in the earlier spikes.
- **Korean clip sets** (`seplab build-clips --language ko`): the same builders, recipes, seeds (310+i, 110+i, 210+i), durations (60 to 120 s), target overlap ratio (0.17 for US-3.1, 0.05 for US-1.x), background SNR (10 dB), room impulse responses (SLR28 small, medium and large rooms), noise (SLR28 background noises), music (BabySlakh mixes) and babble recipe (six reverberant speakers at 8 dB below the toast) as the English sets. Only the speech pool differs, so the speakers, utterance lengths and the random picks of rooms, noise and music differ too (the random stream is consumed identically, but the pools have different sizes).
  - `US-3.1-ko`: 5 conversations (2 same-gender, 2 mixed 2-speaker, 3 speakers same, 3 speakers mixed).
  - `US-1.x-ko`: 5 street interviews (interviewee, dry and close camera holder, 1 or 2 passers-by).
  - `US-2.1-ko`: 5 reverberant toasts with music and six-speaker Korean babble.
- **Realised differences between the sets** (ground-truth speech overlap, mean of 5 clips): US-3.1 0.134 (en) vs 0.093 (ko); US-1.x 0.43 vs 0.44. The Korean conversations overlap less because the utterances are shorter, so Korean US-3.1 is slightly easier for diarization on this one axis. Durations are 76 to 108 s (en) and 79 to 117 s (ko).
- **pyannote:** same procedure as the earlier spike (`spike_pyannote.run_clip`): full mixture, no speaker-count hint, DER with 0.25 s collar, speaker count with speakers of at least 1 s, overlap recall. The English numbers were re-run and reproduce the 2026-11-04 spike exactly.
- **SAM Audio large:** `SamAudioBackend("large", autocast="bf16", bf16_weights=True)`, 30 s chunks, 2 s crossfade (`ChunkedBackend`), 16 kHz clips. Peak GPU memory 14.7 GB. SI-SDR and SI-SDRi are computed against the reverberant ground-truth stem, over the whole clip. SAM small: bf16 autocast, 45 s chunks (peak 12.9 GB).
  - Item 2 (US-2.1): text prompt `"speech"` only.
  - Item 3 (US-3.1, US-1.x): one track per speaker, text `"speech"` plus positive anchors from (a) the ground-truth activity in the manifest (oracle; includes time where another speaker also talks), or (b) pyannote exclusive segments (at least 0.3 s, as in the web demo), taking for each ground-truth speaker the cluster with the largest overlap with that speaker's activity. Two ground-truth speakers can end up with the same cluster ("shared"), which is what the demo would do when pyannote merges them. A chunk with no positive anchor gives silence (`require_span`), as in the web demo's speaker split.
  - **Chunk identity:** for every 30 s chunk in which the speaker is active for at least 2 s, the Pearson correlation of the estimate with the right speaker's stem and the maximum correlation with any wrong stem (other speakers; for US-2.1 also the babble). A chunk is "ok" when the right stem correlates best.

## 1. pyannote (mixture, no speaker-count hint)

| Set | Clips | DER (collar 0.25) | Miss / FA / Confusion | Speaker count right | Overlap recall | Purity / Coverage | Phrase acc. |
|---|---|---|---|---|---|---|---|
| US-3.1 en | 5 | 0.085 | 0.047 / 0.010 / 0.028 | 5/5 | 0.71 | 0.96 / 0.96 | 0.88 |
| US-3.1 ko | 5 | 0.089 | 0.045 / 0.012 / 0.032 | 4/5 | 0.47 | 0.94 / 0.97 | 0.85 |
| US-1.x en | 5 | 0.346 | 0.322 / 0.003 / 0.021 | 0/5 | 0.05 | 0.91 / 0.97 | 0.73 |
| US-1.x ko | 5 | 0.343 | 0.314 / 0.003 / 0.026 | 0/5 | 0.06 | 0.93 / 0.98 | 0.57 |
| US-2.1 en | 5 | 0.136 | 0.008 / 0.128 / 0.000 | 4/5 | n/a | 1.00 / 0.98 | 1.00 |
| US-2.1 ko | 5 | 0.106 | 0.018 / 0.088 / 0.000 | 4/5 | n/a | 1.00 / 0.99 | 0.96 |

- **US-3.1:** DER is the same (0.085 vs 0.089). Korean per-clip DER: 0.030, 0.051, 0.072 (2 speakers), 0.103 and 0.190 (3 speakers). English: 0.030, 0.031, 0.016, 0.192, 0.156. The lower Korean overlap recall (0.47 vs 0.71) is mostly clip 3 (ground-truth overlap only 7%, recall 0.03) and the lower overlap in the Korean clips; with 5 clips it is not a language effect we can claim. The one wrong speaker count was `clip5_3spk_mixed` (two of three Korean speakers merged, DER 0.19).
- **US-1.x:** same DER (0.346 vs 0.343), same failure: bystanders are never found as their own speakers (count right 0/5 in both; overlap recall about 5%). Korean phrase accuracy is lower (0.57 vs 0.73), probably because more passers-by phrases land in the interviewee's cluster (not checked per phrase); the ground-truth overlap in the Korean clip 4 is also higher (0.71 vs 0.52).
- **US-2.1:** Korean is a little better (DER 0.106 vs 0.136, false alarm 0.088 vs 0.128). The false alarm is crowd babble labelled as speech (a second speaker in 1 of 5 clips in each language).

## 2. SAM Audio, text prompt `"speech"` only, US-2.1 (all 5 clips per language)

| Model | Set | SI-SDRi per clip (dB) | Mean SI-SDRi | Median | Mean SI-SDR | Chunk identity ok | Correlation right / wrong |
|---|---|---|---|---|---|---|---|
| large | US-2.1 en | 7.9, 5.8, 3.6, 1.4, 10.9 | **5.89** (sem 1.64) | 5.75 | 4.63 | 15/15 | 0.86 / 0.04 |
| large | US-2.1 ko | 7.5, 8.2, 5.8, 4.9, 8.5 | **6.98** (sem 0.71) | 7.48 | 5.75 | 15/15 | 0.88 / 0.18 |
| small | US-2.1 en | 5.4, 4.4, 1.6, 0.6, 8.5 | 4.10 (sem 1.41) | 4.40 | 2.84 | 10/10 | 0.81 / 0.06 |
| small | US-2.1 ko | 5.1, 6.8, 3.4, 4.1, 6.7 | 5.21 (sem 0.67) | 5.07 | 3.98 | 10/10 | 0.84 / 0.13 |

Mixture SI-SDR is about -1.2 dB in both languages. Large beats small by about 1.8 dB in English and 1.8 dB in Korean (earlier single-clip estimate: 2 to 3 dB). Korean is 1.1 dB higher with both models, which is inside the clip-to-clip spread (sem 0.7 to 1.6 dB). The target is the right person in every chunk, in both languages: with one reverberant speaker louder than the babble, the text prompt `"speech"` picks the toast speaker.

## 3. SAM Audio large, one track per speaker (US-3.1 and US-1.x)

SI-SDRi in dB over the whole clip, one value per speaker track. "Mean" is over all tracks, "median" next to it because a single identity swap gives -20 to -40 dB.

**US-3.1 (conversations, 12 speaker tracks per language)**

| Anchors | Language | Mean SI-SDRi | Median | Share of tracks above 3 dB | Mean SI-SDR (mixture) | Chunk identity ok | Correlation right / wrong |
|---|---|---|---|---|---|---|---|
| (a) ground-truth activity | en | -2.25 | 2.06 | 5/12 | -4.74 (-2.49) | 27/42 | 0.65 / 0.32 |
| (a) ground-truth activity | ko | 0.01 | 0.92 | 5/12 | -3.55 (-3.57) | 31/45 | 0.65 / 0.32 |
| (b) pyannote segments | en | 0.93 | 1.42 | 4/12 | -1.56 (-2.49) | 29/42 | 0.65 / 0.31 |
| (b) pyannote segments | ko | -0.18 | 2.91 | 6/12 | -3.74 (-3.57) | 28/45 | 0.61 / 0.38 |

- Tracks that kept the right identity in every active chunk: oracle 4/12 (en) and 6/12 (ko); pyannote 3/12 (en) and 6/12 (ko). Tracks with SI-SDRi below -10 dB (a clear swap to the other speaker): 2 per condition in en (oracle) and 2 in ko, 0 and 2 for pyannote.
- By gender pairing (mean SI-SDRi, oracle): en same 5 tracks -3.5, mixed 7 tracks -1.4; ko same +4.6, mixed -3.3. Five to seven tracks per cell, so no conclusion, but gender difference does **not** reliably predict success in either language.
- Pyannote merged two speakers in 2 of 12 tracks in each language (shared cluster, so both tracks get the same anchors).

**US-1.x (interviews, 17 tracks per language: 10 interviewee or camera holder, 7 passers-by)**

| Anchors | Language | Tracks | Mean SI-SDRi | Median | Share above 3 dB | Chunk identity ok | Correlation right / wrong |
|---|---|---|---|---|---|---|---|
| (a) ground-truth | en | all 17 | -5.60 | -11.62 | 7/17 | 23/47 | 0.48 / 0.49 |
| (a) ground-truth | ko | all 17 | -3.95 | -2.25 | 8/17 | 24/50 | 0.48 / 0.51 |
| (a) ground-truth | en | interviewee + camera holder (10) | 2.99 | 6.62 | 7/10 | 23/29 | 0.76 / 0.22 |
| (a) ground-truth | ko | interviewee + camera holder (10) | 1.02 | 8.41 | 8/10 | 23/30 | 0.75 / 0.26 |
| (a) ground-truth | en | passers-by (7) | -17.88 | -15.01 | 0/7 | 0/18 | 0.02 / 0.94 |
| (a) ground-truth | ko | passers-by (7) | -11.04 | -9.07 | 0/7 | 1/20 | 0.09 / 0.89 |
| (b) pyannote | en | all 17 | -7.09 | -7.64 | 4/17 | 21/47 | 0.43 / 0.50 |
| (b) pyannote | ko | all 17 | -4.98 | -2.34 | 7/17 | 24/50 | 0.46 / 0.51 |
| (b) pyannote | en | interviewee + camera holder (10) | 0.92 | 2.39 | 4/10 | 21/29 | 0.68 / 0.24 |
| (b) pyannote | ko | interviewee + camera holder (10) | 0.40 | 7.45 | 7/10 | 24/30 | 0.73 / 0.26 |
| (b) pyannote | en | passers-by (7) | -18.54 | -18.35 | 0/7 | 0/18 | 0.03 / 0.93 |
| (b) pyannote | ko | passers-by (7) | -12.66 | -11.22 | 0/7 | 0/20 | 0.05 / 0.89 |

- Passers-by sit 16 to 20 dB below the mix (mixture SI-SDR about -17 dB): the estimate follows the loud interviewee instead (correlation with the wrong speaker 0.9). This fails equally in both languages and says nothing about Korean.
- For the interviewee and the camera holder, the median SI-SDRi is 6.6 to 8.4 dB with oracle anchors and 2.4 (en) vs 7.5 (ko) with pyannote anchors; the means are pulled down by 2 swapped tracks per condition.
- Pyannote shares a cluster between two ground-truth speakers for 13 of 17 (en) and 12 of 17 (ko) tracks, almost always passers-by merged into the interviewee, as in the earlier spike.

### Chunk identity (does a track keep the same person across 30 s chunks?)

Across the three conversational conditions (excluding passers-by), the right speaker correlates best in about two thirds of active chunks: US-3.1 27/42 and 31/45 (oracle en, ko), US-1.x main speakers 23/29 and 23/30. Identity is a per-track property: a track that is right in the first chunk is usually right in all of them (tracks with every chunk ok: US-3.1 oracle 4 and 6 of 12; US-1.x oracle 6 and 7 of 10). Every chunk gets its own re-based anchors, so the anchors (not the text prompt) are what carries identity; we did not analyse whether swaps start at the first chunk or later. We did not see a language difference (Korean 31/45 vs English 27/42, within noise).

## Failures and caveats

- **SAM with whole-speaker anchors is unreliable in both languages**, much worse than the single-speaker text case (US-2.1, +6 dB): US-3.1 mean SI-SDRi is about 0 dB with a median of 1 to 3 dB, with swaps of -20 to -40 dB (for example `US-3.1 clip4/clip5` en, `clip5` and `clip3` ko). This is the main result, and it is independent of language.
- **The single "mark a moment" prompt was not a valid test.** We also ran one 2 to 6 s non-overlapped span per speaker (the manifest `spans`) with `require_span`. All other chunks then get silence by design, so SI-SDRi is -14 to -25 dB for every set (US-3.1 -13.6 en / -17.3 ko; US-1.x -24.7 / -21.8). Only the chunk containing the span gave a usable test: right speaker in 7/11 (en) and 5/8 (ko) chunks for US-3.1, 6/9 and 5/12 for US-1.x. This is an artefact of the test design, not a measure of the model, and shows that one marked moment cannot carry a voice across chunks. These numbers are in `runs/korean/sam-large/results.json` (condition `marked`) and are not used in the conclusions.
- Passers-by in US-1.x cannot be extracted at -17 dB relative level by either language or either anchor source.
- The synthetic Korean clips have somewhat shorter utterances and lower conversational overlap than the English ones, and the speech corpus is read sentences recorded by Zeroth with unknown microphones; real Korean conversation (fillers, backchannels, fast turn-taking, dialects, loud phone speech) was not tested.
- Anchor construction used the exclusive pyannote segments mapped by best overlap; a different mapping rule (one-to-one) would give two tracks fewer anchors in the shared cases.
- The SI-SDR reference is the reverberant stem. Estimates that remove reverb score lower than they sound.

## Is Korean worse, the same, or better?

**The same, as far as 5 clips per set can tell.** Every comparison is within clip-to-clip noise: pyannote DER on conversations 0.085 vs 0.089 and on interviews 0.346 vs 0.343; text-prompt SAM on toasts 5.9 vs 7.0 dB (large) and 4.1 vs 5.2 dB (small), where Korean is nominally higher; per-speaker tracks within a few dB, with both languages showing the same swaps and the same passers-by failure. Korean is nominally better on US-2.1 for both models and for pyannote, and nominally worse on pyannote overlap recall and US-1.x phrase accuracy; none of these differences are large relative to their spread.

Why Korean might still differ in reality (hypotheses, not tested): (1) the two corpora differ in speakers and recording quality more than in language (Zeroth uses many distinct recording sessions, LibriSpeech is audiobook reading); (2) shorter Korean sentences lower the overlap in our scheduler; (3) the US-2.1-ko babble is Korean, and its effect on a text prompt `"speech"` was not isolated; (4) neither model is language-conditioned (a diarization embedding and a text-prompted separator that responds to a generic "speech" description) so a big language gap is not expected, but their training data language mix is not known to us.

## Implications for the demo

- Korean voices do **not** need a different pipeline than English voices on this evidence. The same guidance holds for both: text prompt `"speech"` works for one clear speaker against crowd and music (US-2.1: +5 to +7 dB, right speaker in every chunk, large clearly better than small); speaker split with anchors is unreliable and should be offered with an honest warning.
- For several speakers, the web demo's speaker split (pyannote then anchors) performs on Korean about like the oracle anchors (the diarization error is not the bottleneck: oracle and pyannote anchors give the same SI-SDRi within noise). The weak point is SAM following an anchored speaker, so improving diarization will not fix it.
- Bystanders (roughly 15 dB below the main voice) are not separable in either language; do not promise per-bystander tracks. Target plus camera holder, with everyone else in "others", still holds.
- The demo's page warning ("with text prompts a target may switch voices between chunks; use spans or speaker split for voices") should say that speaker split and spans are also not reliable yet: roughly one active chunk in three follows the wrong person in the conversation clips, in both languages.

## Next steps

1. Find out why anchored speaker tracks swap: try shorter, non-overlapped anchors only (exclusive ground-truth segments), longer anchors (a few seconds each, merged), and `-` anchors on the other speaker; compare on the same 24 conversation tracks.
2. Re-run the single-moment prompt properly: marked span plus description in every chunk (no silence), and the per-chunk identity check, to see whether one marked moment can carry a voice.
3. Chunk identity with overlap-stitching: check the crossfade region for swaps, and test 60 s chunks with the small model for conversations (fewer chunk boundaries).
4. Add real Korean material (own recordings of conversation with fillers and backchannels, and a Korean interview video) once the synthetic result stabilises; add more speakers per set (at least 15 clips) so that a 1 to 2 dB gap can be resolved.
5. Add the same twin sets for a language with a different phonology if the product targets one (for example Japanese), reusing `KoreanCorpora` as a pattern.

## Reproduce

```bash
# 1. data (about 1.3 GB streamed; keep complete files)
mkdir -p data/zeroth && cd data/zeroth
curl -s -r 0-1300000000 https://www.openslr.org/resources/40/zeroth_korean.tar.gz | tar xzf - ; cd ../..
# 2. clip sets (drop a truncated last FLAC first: seplab.zeroth.drop_truncated)
uv run --no-sync seplab build-clips --language ko
# 3. pyannote, then SAM (one model process at a time, inside systemd-run ... MemoryMax=14G -p MemorySwapMax=0)
UV_PROJECT_ENVIRONMENT=.venv-diar uv run --no-sync python -m seplab.eval_language diar --out runs/korean/pyannote
uv run --no-sync python -m seplab.eval_language sam --model large --out runs/korean/sam-large --pyannote runs/korean/pyannote
uv run --no-sync python -m seplab.eval_language sam --model small --out runs/korean/sam-small --stories US-2.1
uv run --no-sync python -m seplab.eval_language report --pyannote runs/korean/pyannote --sam runs/korean/sam-large runs/korean/sam-small
```
