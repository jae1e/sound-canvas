# 09. What today's services use (as of 2026-11-05)

**Caveat.** Vendors rarely publish their architectures. Labels used below:
- **[V]** vendor claim;
- **[P]** press or third-party report;
- **[F]** verified on a primary or official page;
- **[I]** our inference.

Funding and usage figures come from our earlier market studies, which have fuller sourcing.

## 1. Open building blocks (what anyone can use)

| Component | What it is | Licence and notes |
|---|---|---|
| Spleeter (Deezer, 2019) | U-Net, 2/4/5 stems, fast | MIT. Dated quality, but still inside many apps [I] |
| Demucs / HTDemucs (Meta) | Hybrid waveform and spectrogram transformer | Code MIT; check the training-data provenance of the weights before commercial use (see our licensing note) |
| BS-RoFormer / Mel-RoFormer community weights | Leaderboard leaders via UVR, MVSEP, ZFTurbo MSST | Many are trained on non-commercial datasets, so the provenance is risky for commercial use |
| pyannote community-1 | Diarisation pipeline | CC BY 4.0, gated |
| RNNoise, DeepFilterNet | Real-time speech denoisers | Open source |
| **SAM Audio** (Meta, Dec 2025) | Prompted generative separation (text, visual, span) | SAM License, commercial use allowed with conditions |

**Implication [I].** A competent team can assemble a good separator from open parts in weeks. Quality on standard stems alone is not defensible.

## 2. Consumer and prosumer stem apps

| Service | Technology (as disclosed) | Signals |
|---|---|---|
| **Moises** (and the Music.AI API) | Proprietary models; publishes API rates (≈ $0.05/min for stems) | 2B minutes processed and $50M+ raised [V] ([2025 review](https://moises.ai/newsroom/company-milestones/2025-year-in-review)); Music.AI $40M Series A, Jan 2025 [P] |
| **LALAL.AI** | Own model generations: Phoenix (2022), Orion, **Perseus** (its first transformer, about +1 dB over Orion), **Andromeda** (≈4× Perseus's training data) [V] ([about](https://lalal.ai/about/), [Perseus](https://www.lalal.ai/blog/perseus-ai-lalalai-transformer-neural-network/)) | Steady model releases are their story |
| **Gaudio Studio** (Gaudio Lab) | GSEP separation engine | CES 2024 Innovation Award per Gaudio [V] ([blog](https://www.gaudiolab.com/blog/231)) |
| **Suno** stems | **Generative**: "regenerates each stem from scratch" rather than cutting the song apart; Advanced Split offers ~100 instrument types (Premier plan) [V] ([Suno, 2026-06-11](https://suno.com/blog/stem-separation-updates)) | Separation becomes a feature of a generator |
| **CapCut** | Free vocal remover and voice isolator, "up to 10 stems" [V] ([CapCut](https://www.capcut.com/resource/voice-isolator)) | Free and bundled, so convenience is the battleground |

## 3. Professional and B2B media

| Service | Technology and positioning | Signals |
|---|---|---|
| **AudioShake** | Proprietary models; says it trains on **licensed** production-library music [V]; real-time "Dialogue RT" at about 11 ms latency for broadcast [V] ([post](https://www.audioshake.ai/post/audioshake-debuts-dialogue-rt-the-first-ai-dialogue-isolation-model-built-for-live-broadcast)); multi-speaker separation API | $14M Series A, 2025-10-01; claims Disney Music Group, WMG, UMG, NFL Films, WBD [V] ([post](https://www.audioshake.ai/post/series-a-round-raise-14-million-shinecapital-origin-thomson-reuters)) |
| **Gaudio Studio Pro** | DME Separator and Music Replacer for OTT and broadcast; API live, web editor waitlisted [V] ([overview](https://www.gaudiolab.com/ko/products/gaudio-studio-pro-overview)) | Two CES 2026 Innovation Awards, announced 2025-11-05 [V] ([news](https://www.gaudiolab.com/news/216)) |
| **ElevenLabs** | Voice Isolator, dubbing, transcription with diarisation; API price list ([pricing](https://elevenlabs.io/pricing/api)) | ARR about $330M at end-2025 (company), Series D at about $11B, Feb 2026 [P] |
| **Adobe** Podcast Enhance Speech / Premiere Speech Enhancer | Speech "re-studio" enhancement, likely partly generative [I] ([Enhance](https://podcast.adobe.com/enhance)) | Free or bundled; users complain about artifacts (anecdotes in our notes) |
| iZotope RX, DaVinci Resolve, Descript | Dialogue isolation and music-rebalance tools inside editors | Separation as a feature of professional editing software |

## 4. Platform and device features (separation becomes invisible)

- **Apple Music Sing** (Dec 2022): a vocal-level slider across the catalogue on iPhone, iPad and Apple TV 4K. Apple notes the slider lowers the vocals but does not fully remove them [F] ([Apple Newsroom](https://www.apple.com/newsroom/2022/12/apple-introduces-apple-music-sing/)).
  - On-device ML separation at catalogue scale.
  - Algoriddim's djay already ran real-time stems on Apple's Neural Engine in 2020 [P] ([AppleInsider](https://appleinsider.com/articles/20/06/18/apples-neural-engine-tapped-in-new-djay-pro-to-reinvent-live-mixing/)).
- **Apple tvOS Enhance Dialogue:** reportedly works only with standard-player apps [P] ([iDownloadBlog](https://www.idownloadblog.com/?p=960018)).
- **YouTube Studio "Erase Song":** AI removes only the copyrighted music and keeps the other audio, upgraded in 2024 [P] ([Engadget](https://www.engadget.com/youtube-upgrades-its-erase-song-tool-to-remove-copyrighted-music-only-140032261.html)).
- **Samsung Galaxy Audio Eraser:**
  - S25 (2025): separates voice, music, wind, crowd and noise in recorded video, with a slider for each [P] ([SamMobile](https://www.sammobile.com/news/galaxy-s25-audio-eraser-what-how-it-works/)).
  - S26 (April 2026): adds a real-time "Voice focus" [V] ([Samsung](https://news.samsung.com/global/faster-real-time-enhanced-audio-eraser-with-the-galaxy-s26-series)).
  - It separates by **sound type**; no source says it can pick a specific person.
- **Spotify × UMG:** a deal for fan AI covers and remixes as a paid add-on [P] ([The Music Network](https://themusicnetwork.com/news/spotify-universal-music-ai-covers-deal)). Stems become a licensed consumer product.
- **Google:** acquired ProducerAI (Feb 2026), rebranded it as Flow Music, and released Lyria 3.5. See [google_producerai_acquisition.md](../../market-studies/audio-video-separation/research-notes/google_producerai_acquisition.md).

## 5. Technology trends to watch

1. **Fixed stems are saturated.** Band-split transformers plus ensembles dominate. Gains come from data, not architecture.
2. **Licensed training data is the moat** for B2B (AudioShake's pitch). Community weights carry provenance risk.
3. **Generative models are entering separation:** SAM Audio, Suno's regenerated stems and generative speech enhancers. This splits the market [I]:
   - *plausible* is fine for remixing and AI music;
   - *faithful* is required for weddings, podcasts, broadcast and legal use.
4. **Prompted and multimodal selection.** "Select the sound by pointing at it" with text, video or time. The selection UI is the new product surface.
5. **On-device and real-time.** Apple, Samsung and AudioShake RT. Simple cases (voice versus everything) are becoming free OS features.
6. **The hard frontier is identity:**
   - *this* speaker, *this* guitar;
   - kept consistent across a long file;
   - verified.

   No consumer product found so far does person-level separation well. That is our opening; see [technology-differentiation.md](../../products/audio-separation/technology-differentiation.md).

## Where our product sits [I]

- **Don't compete on** standard stems (crowded and saturated).
- **Compete on:**
  - identity-level separation ("who is who") for long, real-world video and audio;
  - faithful output that sums back to the mix;
  - a selection UI built on visual and stereo cues;
  - convenience: a link or file in, and an edited video out.
