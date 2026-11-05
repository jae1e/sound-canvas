# 09. What today's services use (as of 2026-11-05)

**Caveat.** Vendors rarely publish their architectures. Labels used below:
- **[V]** vendor claim;
- **[P]** press or third-party report;
- **[F]** verified on a primary or official page;
- **[I]** our inference.

Funding and usage figures come from our earlier market studies, which have fuller sourcing.

**Words you will meet in this lecture** (each is explained again where it first appears in a table):

| Term | Plain meaning |
|---|---|
| Stem | One instrument group's track (vocals, drums, bass, other) cut out of a finished song |
| API | Application programming interface: a service you call over the internet from your own software. You send audio, you get the result back |
| Per-minute pricing | The vendor charges for each minute of audio processed. "$0.05/min" means a 3-minute song costs $0.15 |
| B2B | Business-to-business: sold to companies, not to individual consumers |
| Series A / Series D | Named rounds of venture funding. A is an early round, and later letters (B, C, D) come as the company grows |
| Valuation | The price tag investors put on the whole company in a funding round |
| ARR | Annual recurring revenue: the yearly value of subscriptions and contracts that repeat |
| On-device | The computation runs on the user's phone or computer, not on a company's servers |
| Latency | The delay between sound going in and the result coming out |
| Provenance | Where something came from. For model weights, which data they were trained on and whether that use was allowed |
| Licence | The legal terms of use. MIT is very permissive. CC BY 4.0 allows any use with credit (CC = Creative Commons, BY = attribution). *Gated* means you must log in and accept terms before you can download. The SAM License is Meta's own terms |

## 1. Open building blocks (what anyone can use)

| Component | What it is | Licence and notes |
|---|---|---|
| Spleeter (Deezer, 2019) | U-Net (a convolutional encoder-decoder with skip connections, shaped like a U; borrowed from image segmentation), 2/4/5 stems (splits into 2, 4 or 5 tracks), fast | MIT. Dated quality, but still inside many apps [I] |
| Demucs / HTDemucs (Meta) | Hybrid waveform and spectrogram transformer (works on both the raw waveform and the spectrogram, with attention layers) | Code MIT; check the training-data provenance of the weights before commercial use (see our licensing note) |
| BS-RoFormer / Mel-RoFormer community weights | Leaderboard leaders via UVR, MVSEP, ZFTurbo MSST. (BS = band-split: the spectrogram is cut into frequency bands. RoFormer = a transformer with rotary position encoding. "Weights" are the trained parameters. UVR, MVSEP and ZFTurbo MSST are free apps, a web service and a training toolkit that run these models.) | Many are trained on non-commercial datasets, so the provenance is risky for commercial use |
| pyannote community-1 | Diarisation pipeline ("who spoke when", lecture 07) | CC BY 4.0, gated |
| RNNoise, DeepFilterNet | Real-time speech denoisers (lecture 07) | Open source |
| **SAM Audio** (Meta, Dec 2025) | Prompted generative separation (text, visual, span) | SAM License, commercial use allowed with conditions |

**Implication [I].** ("Open parts" are components whose code or weights anyone may download.) A competent team can assemble a good separator from open parts in weeks. Quality on standard stems alone is not defensible.

## 2. Consumer and prosumer stem apps

| Service | Technology (as disclosed) | Signals |
|---|---|---|
| **Moises** (and the Music.AI API) | Proprietary models (not published); publishes API rates, i.e. per-minute prices (≈ $0.05/min for stems) | 2B (2 billion) minutes processed and $50M+ raised [V] ([2025 review](https://moises.ai/newsroom/company-milestones/2025-year-in-review)); Music.AI $40M Series A (an early venture-funding round), Jan 2025 [P] |
| **LALAL.AI** | Own model generations: Phoenix (2022), Orion, **Perseus** (its first transformer, i.e. attention-based network; about +1 dB over Orion), **Andromeda** (≈4× Perseus's training data) [V] ([about](https://lalal.ai/about/), [Perseus](https://www.lalal.ai/blog/perseus-ai-lalalai-transformer-neural-network/)) | Steady model releases are their story |
| **Gaudio Studio** (Gaudio Lab) | GSEP separation engine | CES 2024 Innovation Award per Gaudio (CES is a large consumer-electronics trade show) [V] ([blog](https://www.gaudiolab.com/blog/231)) |
| **Suno** stems | **Generative** (the model synthesises new audio rather than cutting the old): "regenerates each stem from scratch" rather than cutting the song apart; Advanced Split offers ~100 instrument types (Premier plan) [V] ([Suno, 2026-06-11](https://suno.com/blog/stem-separation-updates)) | Separation becomes a feature of a generator |
| **CapCut** | Free vocal remover and voice isolator, "up to 10 stems" [V] ([CapCut](https://www.capcut.com/resource/voice-isolator)) | Free and bundled (included at no extra price in a larger app), so convenience is the battleground |

## 3. Professional and B2B media

| Service | Technology and positioning | Signals |
|---|---|---|
| **AudioShake** | Proprietary models; says it trains on **licensed** production-library music (music the company has permission to use, from libraries that supply music for film and TV) [V]; real-time "Dialogue RT" at about 11 ms latency (11 thousandths of a second of delay) for broadcast [V] ([post](https://www.audioshake.ai/post/audioshake-debuts-dialogue-rt-the-first-ai-dialogue-isolation-model-built-for-live-broadcast)); multi-speaker separation API (an API as defined above) | $14M Series A (an early venture-funding round), 2025-10-01; claims Disney Music Group, WMG, UMG, NFL Films, WBD [V] ([post](https://www.audioshake.ai/post/series-a-round-raise-14-million-shinecapital-origin-thomson-reuters)) |
| **Gaudio Studio Pro** | DME Separator and Music Replacer for OTT and broadcast. **DME** = dialogue, music and effects, the three standard layers of a film or TV soundtrack; the separator splits a finished mix into them (lecture 04). **Music Replacer** swaps the music layer for other music. **OTT** = over-the-top, i.e. streaming services delivered over the internet (Netflix and the like); API live (available to call), web editor waitlisted (users sign up and wait for access) [V] ([overview](https://www.gaudiolab.com/ko/products/gaudio-studio-pro-overview)) | Two CES 2026 Innovation Awards, announced 2025-11-05 [V] ([news](https://www.gaudiolab.com/news/216)) |
| **ElevenLabs** | Voice Isolator, dubbing (re-voicing a video in another language), transcription (speech to text) with diarisation (speaker labels); API price list ([pricing](https://elevenlabs.io/pricing/api)) | ARR (annual recurring revenue) about $330M at end-2025 (company), Series D (a later venture-funding round) at about $11B valuation (the price investors put on the whole company), Feb 2026 [P] |
| **Adobe** Podcast Enhance Speech / Premiere Speech Enhancer | Speech "re-studio" enhancement (makes a rough recording sound as if recorded in a studio), likely partly generative [I] ([Enhance](https://podcast.adobe.com/enhance)) | Free or bundled; users complain about artifacts (anecdotes in our notes) |
| iZotope RX, DaVinci Resolve, Descript | Dialogue isolation and music-rebalance tools inside editors (audio and video editing programs; a program for editing audio is called a DAW, digital audio workstation) | Separation as a feature of professional editing software |

## 4. Platform and device features (separation becomes invisible)

- **Apple Music Sing** (Dec 2022): a vocal-level slider across the catalogue (the whole music library) on iPhone, iPad and Apple TV 4K. Apple notes the slider lowers the vocals but does not fully remove them [F] ([Apple Newsroom](https://www.apple.com/newsroom/2022/12/apple-introduces-apple-music-sing/)).
  - On-device ML separation at catalogue scale (the computation runs on the user's own device).
  - The feature is a sing-along (karaoke) mode: karaoke means singing over a track whose lead vocal has been removed or turned down.
  - Algoriddim's djay (a DJ app) already ran real-time stems on Apple's Neural Engine (the dedicated machine-learning chip in Apple devices) in 2020 [P] ([AppleInsider](https://appleinsider.com/articles/20/06/18/apples-neural-engine-tapped-in-new-djay-pro-to-reinvent-live-mixing/)).
- **Apple tvOS Enhance Dialogue:** reportedly works only with standard-player apps (the system's built-in players, not third-party apps) [P] ([iDownloadBlog](https://www.idownloadblog.com/?p=960018)).
- **YouTube Studio "Erase Song":** AI removes only the copyrighted music and keeps the other audio, upgraded in 2024 [P] ([Engadget](https://www.engadget.com/youtube-upgrades-its-erase-song-tool-to-remove-copyrighted-music-only-140032261.html)).
- **Samsung Galaxy Audio Eraser:**
  - S25 (2025): separates voice, music, wind, crowd and noise in recorded video, with a slider for each [P] ([SamMobile](https://www.sammobile.com/news/galaxy-s25-audio-eraser-what-how-it-works/)).
  - S26 (April 2026): adds a real-time "Voice focus" [V] ([Samsung](https://news.samsung.com/global/faster-real-time-enhanced-audio-eraser-with-the-galaxy-s26-series)).
  - It separates by **sound type**; no source says it can pick a specific person.
- **Spotify × UMG:** a deal (Spotify with Universal Music Group, UMG) for fan AI covers and remixes as a paid add-on [P] ([The Music Network](https://themusicnetwork.com/news/spotify-universal-music-ai-covers-deal)). Stems become a licensed consumer product.
- **Google:** acquired ProducerAI (Feb 2026), rebranded it as Flow Music, and released Lyria 3.5. See [google_producerai_acquisition.md](../../market-studies/audio-video-separation/research-notes/google_producerai_acquisition.md).

## 5. Technology trends to watch

1. **Fixed stems are saturated.** Band-split transformers plus ensembles (averaging several models' outputs) dominate. Gains come from data, not architecture.
2. **Licensed training data is the moat** (a lasting competitive advantage that rivals cannot easily copy) for B2B (AudioShake's pitch). Community weights carry provenance risk.
3. **Generative models are entering separation:** SAM Audio, Suno's regenerated stems and generative speech enhancers. This splits the market [I]:
   - *plausible* is fine for remixing and AI music;
   - *faithful* is required for weddings, podcasts, broadcast and legal use.
4. **Prompted and multimodal selection.** "Select the sound by pointing at it" with text, video or time. The selection UI (user interface) is the new product surface: the part of the product the user touches.
5. **On-device and real-time.** Apple, Samsung and AudioShake RT. Simple cases (voice versus everything) are becoming free OS (operating system) features.
6. **The hard frontier is identity:**
   - *this* speaker, *this* guitar;
   - kept consistent across a long file;
   - verified.

   No consumer product found so far does person-level separation well. That is our opening; see [technology-differentiation.md](../../products/audio-separation/technology-differentiation.md).

## Where our product sits [I]

- **Don't compete on** standard stems (the usual vocals, drums, bass, other split) (crowded and saturated).
- **Compete on:**
  - identity-level separation ("who is who") for long, real-world video and audio;
  - faithful output that sums back to the mix;
  - a selection UI built on visual and stereo cues;
  - convenience: a link or file in, and an edited video out.
