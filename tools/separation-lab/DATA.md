# Data sources and licences

All synthetic clip sets are built from the corpora below. Licences were read on the official pages on 2026-11-04 (OpenSLR pages; Zenodo records via the Zenodo API). Raw data lives in the gitignored `data/` folder; never commit audio. A copy of this table is kept in `data/SOURCES.md`.

| Source | URL | Licence | Downloaded | What we use |
|---|---|---|---|---|
| LibriSpeech `test-clean` (346 MB) | https://www.openslr.org/12/ | CC BY 4.0 (stated on the page) | 2026-11-04 | 40 speakers of read speech (20 F, 20 M) for conversations, interviews, toast, babble |
| OpenSLR SLR28 RIRs and noises (1.3 GB) | https://www.openslr.org/28/ | Apache 2.0 (stated on the page). The point-source noises are Freesound recordings the dataset's own LICENSE file marks as public domain | 2026-11-04 | Simulated room impulse responses (small, medium, large rooms); the 36 noises annotated as background |
| BabySlakh (883 MB, 16 kHz) | https://zenodo.org/records/4603870 (DOI 10.5281/zenodo.4603870) | CC BY 4.0 (Zenodo record metadata) | 2026-11-04 | 20 rendered multi-instrument songs with stems: guitars for US-7.1, and music beds and instrumentals |
| VocalSet (2.1 GB zip; only the `excerpts` folders are extracted, via HTTP range requests) | https://zenodo.org/records/1193957 (DOI 10.5281/zenodo.1193957) | CC BY 4.0 (Zenodo record metadata) | 2026-11-04 | Solo singing excerpts, cut into phrases for US-6.1 |
| Zeroth-Korean (OpenSLR SLR40; first 1.3 GB of the 10 GB tar.gz streamed, complete files only) | https://www.openslr.org/40/ (downloaded from the OpenSLR mirror https://www.openslr.org/resources/40/zeroth_korean.tar.gz; the Google Storage URL on the page returned AccessDenied) | CC BY 4.0 (stated on the page, checked 2026-11-05) | 2026-11-05 | 47 speakers (29 F, 18 M; sex from the corpus's own AUDIO_INFO file) with at least 40 utterances of 2-15 s: Korean read speech for the `-ko` clip sets |

Attribution (CC BY 4.0): Zeroth-Korean (Zeroth Project, https://github.com/goodatlas/zeroth), LibriSpeech (Panayotov et al., ICASSP 2015), BabySlakh/Slakh2100 (Manilow et al., 2019), VocalSet (Wilkins et al., ISMIR 2018). Cite them if results or derived audio are published.

Not used, on purpose: MUSDB18, MoisesDB, MedleyDB (non-commercial or restricted), ESC-50, FSD50K (mixed per-clip licences), and Slakh2100 full (only the small BabySlakh subset was needed). Generated clips are derivative works of CC BY material; keep them internal unless attribution is added.

Layout under `data/`: `librispeech/`, `slr28/`, `babyslakh/`, `vocalset/`, `zeroth/` (Korean speech, extracted partial archive), `raw/` (archives), `clips/<story>/<clip>/` (generated), `tmp/` (set `TMPDIR` here; `/tmp` hit the disk quota).
