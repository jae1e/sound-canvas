# pyannote clustering spike (speaker and singer clustering)

Run date: 2026-11-04. Model: `pyannote/speaker-diarization-community-1` (pyannote.audio 4.0.7, torch 2.15.0+cu132, RTX 4090). Raw results are in `runs/pyannote/` (gitignored): `results.json`, `summary.json`, `hyp_*.json`. Code: `seplab/spike_pyannote.py`, `seplab/diar_metrics.py`, `seplab/dryness.py`. All numbers below are **measured on synthetic clips** (5 per story, fixed seeds, 16 kHz); they are not real-world results and each row is the mean of only 5 clips, so treat differences of a few points as noise.

## Method

- Clips: `seplab build-clips` (see [DATA.md](../DATA.md)). Ground truth is per-speaker activity from an energy VAD on the dry stems (so internal pauses count as silence).
- The pipeline runs on the full mixture with no speaker-count hint ("auto"). For US-6.1 it also runs on the clean vocal-only sum, and with the true number of singers given ("oracle_k").
- Metrics (own frame-based 10 ms implementation with optimal one-to-one speaker mapping; cross-checked with `pyannote.metrics` DER, collar 0.25 s, which came out 0.02 to 0.05 higher than ours in absolute terms, probably because of a different treatment of collars and overlap): DER with 0.25 s collar (headline), DER without collar, DER ignoring overlapped reference frames, speaker-count accuracy (speakers with at least 1 s of speech), overlap recall, purity and coverage, and phrase-level accuracy (each reference segment is correct if the cluster covering most of it is the cluster mapped to its true speaker).
- Runtime: wall-clock of the pipeline call after a warm-up, with CUDA synchronised. First model load took about 88 s including the download.
- Environment note: `sam-audio` pins numpy<2 and pyannote.audio 4 needs numpy>=2.2, so the extras cannot share a venv. Use `UV_PROJECT_ENVIRONMENT=.venv-diar uv sync --extra diarization` for this spike (declared as conflicting extras in `pyproject.toml`).

## Results

| Story / input | Clips | DER (collar 0.25) | Miss / FA / Confusion | DER ignoring overlap | Speaker count right | Overlap recall | Purity / Coverage | Phrase acc. |
|---|---|---|---|---|---|---|---|---|
| US-3.1 conversation, mixture (10 dB music and noise) | 5 | **0.085** (0.150 no collar) | 0.047 / 0.010 / 0.028 | 0.073 | 5/5 | 0.71 | 0.96 / 0.96 | 0.88 |
| US-1.x street interview, mixture | 5 | **0.346** (0.410) | 0.322 / 0.003 / 0.021 | 0.055 | 0/5 | 0.05 | 0.91 / 0.97 | 0.73 |
| US-2.1 toast, mixture | 5 | **0.136** (0.224) | 0.008 / 0.128 / 0.000 | 0.136 | 4/5 | n/a | 1.00 / 0.98 | 1.00 |
| US-6.1 singers, vocal-only sum, auto | 5 | **0.459** | 0.037 / 0.006 / 0.416 | 0.459 | 1/5 | n/a | 0.57 / 0.97 | 0.52 |
| US-6.1 singers, vocal-only sum, true count | 5 | 0.394 | 0.037 / 0.006 / 0.350 | 0.394 | 5/5 | n/a | 0.63 / 0.70 | 0.63 |
| US-6.1 singers, full mix with instrumental, auto | 5 | **0.591** | 0.260 / 0.013 / 0.318 | 0.591 | 2/5 | n/a | 0.57 / 0.94 | 0.49 |
| US-6.1 singers, full mix, true count | 5 | 0.548 | 0.260 / 0.013 / 0.275 | 0.548 | 5/5 | n/a | 0.63 / 0.62 | 0.54 |

Per-clip US-3.1: 2-speaker clips DER 0.016 to 0.031 (collar 0.25); 3-speaker clips 0.156 and 0.192, with purity 0.87 and 0.96 and overlap recall 0.56 and 0.59. Ground-truth overlap was 11 to 17% of speech time; the model's own overlap output was 9 to 11%.

**Runtime.** Real-time factor 0.006 on all inputs (about 0.45 to 0.6 s for 60 to 120 s of audio), i.e. about 160 times faster than real time on the 4090 after warm-up. Diarization is not a latency or cost concern.

### Failures and caveats

- **US-1.x** is a hard design: the two or three bystanders were reverberant and quieter, but they speak 32 to 54% of the time in overlap with the interview (ground-truth overlap fraction), so the clips are far more overlapped than real street audio probably is. The model detects 95% of bystander speech as speech, but never gives bystanders their own cluster in 4 of 5 clips and finds only 1 or 2 of 3 or 4 speakers (miss rate comes from overlapped frames, where it outputs only one speaker: overlap recall 5%). Ignoring overlap, DER is 0.055: the interviewee and camera holder are separated well.
- **US-2.1** has one real speaker; in 3 of 5 clips the crowd babble (six reverberant speakers at 8 dB below the toast) is labelled as a second speaker, giving false alarm 0.13 and a wrong count in 1 of 5. The toast speaker itself is clean (phrase accuracy 1.0, coverage 0.98).
- **US-6.1 (singers)**: this is the important negative result. Even on the clean vocal-only sum, singers are not reliably separated: phrase accuracy 0.52 on average (chance for two singers is about 0.5), confusion 0.42 of reference time, and the speaker count is wrong in 4 of 5 clips (singers are merged into one cluster: purity 0.57, coverage 0.97). Giving the true count helps only a little (0.63). It works for the mixed-gender two-singer clip (phrase accuracy 0.77 on the vocal sum, 0.69 on the full mix) and fails on same-gender pairs and the three-singer clip. Adding the instrumental makes it worse (accuracy 0.49 to 0.54, miss rate rising to 0.26).
- Singer test limits: phrases are 4 to 6 s excerpts from VocalSet "excerpts" (straight and vibrato singing, cut at 6 s, so some end mid-phrase); singers are recorded in a studio, so there is no room difference between them. Real group songs with the same room, processing and stylised delivery could be harder or easier. VocalSet has only one recording condition per singer.
- The DER here is on synthetic data with VAD-derived references; collar 0.25 s hides boundary errors, so the no-collar column is the stricter number.

## Camera-holder heuristic (US-1.2, US-5.1)

For each diarized cluster (non-overlapped "exclusive" segments, at least 2 s) on the mixture we computed: RMS level (loudest 80% of frames), dynamic range (p90 minus p10 frame energy: reverb and noise fill the valleys), high-band energy share above 3 kHz, and a tail-drop measure (energy fall after speech offsets). The camera holder is, by construction, +4 dB louder and unreverberated; the interviewee has a mild room; bystanders have a large room and are 10 to 14 dB quieter.

| Feature used to rank clusters | Camera holder ranked first (5 clips) |
|---|---|
| Level | 4/5 (rank 2 in clip 4, where a bystander cluster was nearly as loud) |
| Dynamic range | 5/5 |
| Tail drop | 5/5 |
| Level + dynamic range (z-score sum) | 5/5 |
| Level + tail drop | 5/5 |

Caveat: only 2 clusters existed in 4 of 5 clips (bystanders merged into other clusters), so a random guess would be right about 50 to 60% of the time; 5/5 is encouraging but weak evidence. The synthetic gap is also probably larger than in reality (dry +4 dB vs reverberant). Hypothesis status: promising as one cue, not validated. It must be re-tested on real recordings, where the phone holder's voice level depends on the microphone and noise reduction, and combined with "no matching on-screen face".

## What this means for the stories

- **US-3.1 speaker split: viable.** For 2 speakers with music and noise at 10 dB SNR, DER is about 0.03 and purity 0.98. Three speakers degrade (DER 0.16 to 0.19), mainly in overlaps. Use pyannote segments (and the model's own overlap segments) as span prompts, then judge the separation itself with SI-SDRi.
- **US-1.2 keep me too / US-5.1 remove us: partly.** The two close speakers cluster well, and level plus dryness ranks the camera holder first on these clips. Bystanders are not given their own clusters when they overlap with the main voices; for "remove everyone else" we should not rely on clustering bystanders. Use "target plus camera holder" spans and send the rest to "others".
- **US-2.3 batch the reception (same voice across files): not tested here.** It needs cross-file speaker matching with embeddings; the pipeline returns `speaker_embeddings`, so the next step is to test cosine matching across the five US-2.1 toasts and across files of the same LibriSpeech speaker. Within one file, the toast speaker was found correctly in 5/5, but crowd babble can add a false second speaker, so expect to need a min-duration and loudness filter.
- **US-6.1 / US-6.2 singers: not viable with speech diarization alone.** Phrase accuracy is about 0.5 on the vocal sum and about the same on the full mix. The plan "vocal stem, then cluster singers, then span prompts" fails at the clustering step except for male-versus-female pairs. Options (hypotheses, untested): (a) user marks one line per singer and SAM Audio span prompts or similar-voice matching do the clustering; (b) singing-specific embeddings or a pitch/timbre feature; (c) for videos, use the on-screen face (US-6.3) as the cue. Keep US-6.2 a user-marked-lines feature rather than automatic.

## Next steps once SAM Audio runs

1. For each US-3.1 clip, build span prompts from the diarized exclusive segments (longest non-overlapped segment per cluster, 3 to 6 s), run the sequential strategy, and compare SI-SDRi with prompts built from the ground-truth marked spans (`spans` in each manifest) to isolate the cost of diarization errors.
2. Overlap regions: test whether a span prompt on a non-overlapped part of speaker A also extracts A's speech while B talks (the model-level answer to US-3.1's "talking over each other").
3. US-1.x: prompts "interviewee" and "camera holder" from clusters, others to residual; measure bystander suppression. US-2.1: span prompt on the first non-overlapped toast segment plus text prompts for "music" and "crowd".
4. US-6.1: for each singer, one marked phrase as a span prompt, with the other phrases from the same singer as a check (the separation result will tell if the model can follow a voice across phrases); compare with the diarization clustering above.
5. Cross-file matching (US-2.3) with `speaker_embeddings`, and re-check the camera-holder heuristic on real clips.
