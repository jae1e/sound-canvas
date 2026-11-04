# Platform Coverage Map: Free/Cheap Audio and Video AI on Big Platforms (as of 2026-11-04)

Labels: [VF] verified fact (primary or reliable press, fetched or quoted in search 2026-11-04); [VC] vendor claim; [SEC] secondary/low-quality source, treat as unverified; [EST] estimate; [HYP] hypothesis / prior knowledge not re-verified this session.
Research method note: about 20 tool calls, mostly search snippets (few primary pages fetched). Many cells below are therefore [HYP] or [SEC]; they are flagged. Recheck before relying on any cell.

## Which jobs are thoroughly commoditized, and which remain uncovered or partial?

### Takeaway
Commoditized (free, decent, on several major platforms): noise removal/speech enhancement, auto-captions (incl. Korean), basic background removal, auto-reframe, stabilization, loudness normalization, basic color correction, face/plate blur (face only for plates), auto-dubbing (YouTube, viewer-side). Partial: stem separation/voice isolation (mostly paid or Studio-tier or device-bound), music removal/replacement (YouTube-only, claimed videos only), lip-sync (pilot only), clip repurposing, upscaling/restoration, object removal in video. Least covered (best candidates to survive screening): batch/offline processing of existing files from any source, speaker-specific voice extraction, music removal for non-YouTube or unclaimed content, license-plate blur, Korean-quality dubbing/lip-sync, video face restoration/upscaling as a cheap API. Caveat: coverage evidence for several rows is thin (see Gaps).

CORRECTION (coordinator, 2026-11-04): do not use this matrix to drop jobs. People pay for convenience even when a free option exists (YouTube face blur is free; BlurMe still sells). Use the matrix to find convenience gaps; see the section 'Convenience gaps and why someone would still pay' below. Reasons in that table are [HYP] inferences from the cited facts unless a source is given.

### Coverage matrix
Legend: C = covered, P = partial, N = not covered, ? = not verified this session. Notes carry limits.

| Job | YouTube | CapCut/TikTok | IG Edits | Adobe | Resolve | Apple | Samsung | Pixel/Google | Descript | Vrew / Korean |
|---|---|---|---|---|---|---|---|---|---|---|
| Noise removal / speech enhancement | ? | C (HYP) | ? | C: Enhance Speech (Premiere, Podcast) paid/credits | C: Voice Isolation, Studio (mostly) | C: Voice Isolation mic mode, Audio Mix Studio, FCP Voice Isolation; iPhone 16+ for Audio Mix (HYP on exact models) | C: Audio Eraser, S24+ (One UI 7+) | C: Audio Magic Eraser, Pixel only, 1s-2min clips | P: Studio Sound, tiny free limit | P: Vrew has noise/AI audio tools (HYP) |
| Echo/reverb removal | N | ? | ? | C: Enhance Speech/Podcast dereverb (HYP) | P: Studio only | C: Audio Mix "Studio" reduces reverb | ? | ? | C: Studio Sound (paid) | ? |
| Music/vocal stem separation | N | P (HYP, paid) | N (?) | N in Premiere (HYP) | C: Music Remixer, Studio | N | N | N | N | N |
| Voice isolation from background | C only for claimed songs | C (HYP) | ? | C | C (Studio; free-vs-Studio conflict) | C | C | C | P | P |
| Pick a specific speaker | N | N | N | N | P: Dialogue Separator = dialogue vs music/FX, not per speaker | P: Audio Mix In-Frame, capture-time, camera-frame based | N | N | N | N |
| Background-music removal for copyright | C but only claimed videos in Studio | ? | ? | N | P (Studio stems, manual) | N | P (Audio Eraser, device only) | P (device only) | N | N |
| Music replacement | C: Replace Song, YouTube-only | P (CapCut music library; rights limited by commercial license) | P (Meta library, HYP) | N | N | N | N | N | N | N |
| Auto-captions (incl. Korean) | C (HYP) | C (20+ languages [SEC]) | C (HYP) | C (Premiere) | C: Studio speech-to-text (HYP) | C: FCP Transcribe to Captions (Mac/M-series) | ? | ? | C (free tier limited) | C: Vrew strong Korean (review) |
| AI dubbing / translation | C: 27 languages, viewer-side, Feb 2026 | P (HYP) | P: Meta AI translations on Reels (HYP) | P: Firefly dubbing (HYP) | N | N | P: Live Translate (HYP) | N | P (paid) | P (Vrew voice, Korean TTS) |
| Lip-sync | P: pilot only | N? | N? | N? | N | N | N | N | N | N |
| Filler-word removal / silence cutting | N | C: auto-cut silence (SEC) | ? | C: Premiere text-based editing (since 2023) | P (HYP) | N | N | N | C but paid (Hobbyist+) | C (Vrew silence/filler) |
| Clip repurposing (long to short) | ? | C (HYP) | N | P (HYP) | N | N | N | N | C: Create Clips, paid/credits | P (HYP) |
| Video upscaling / restoration | N | P (paid) | N | P (Premiere/Firefly upscale, HYP) | C Studio: SuperScale / UltraSharpen (Resolve 21) | N | N | P: Video Boost, Pixel Pro, cloud, capture-time | N | N |
| Face restoration | N | P (HYP) | N | N | P Studio (HYP) | N | N | N | N | N |
| Low-light enhancement | N | P (HYP) | N | N | P Studio denoise | P: Night mode capture | P (capture) | P: Video Boost/Night Sight Video | N | N |
| Stabilization | ? | C | C (HYP) | C: Warp Stabilizer | C | C (capture) | C | C (+Pro Stable Video, Pixel 11 Pro) | N | N |
| Object/person removal | N | P | N | P: Generative Extend (extend, not remove); object removal (HYP) | C Studio: Magic Mask + Object Removal | N for video (Photos clean-up is stills) | N | P: Magic Eraser (stills) | N | N |
| Background removal for video | N | C (some paid) | C: AI green screen / Cutout | C | C Studio: Magic Mask | C: FCP Magnetic Mask (Mac) | ? | ? | C | N |
| Face / plate blur | C: Studio blur, face + custom + tracking; plates by custom only | P (HYP) | N | N | C Studio tracker | N | N | N | N | N |
| Auto-reframe | ? | C | C | C | C (Smart Reframe) | N | N | N | N | N |
| Color correction | N | C (auto-color, HYP) | C | C | C (free) | C | C | C | N | N |
| Loudness normalization | ? | ? | ? | C | C (Fairlight) | N | N | N | C (HYP) | C (HYP) |

Rows or cells marked HYP/? were NOT checked in this session. Trust the cells annotated with specific dates/sources in the findings below more than the grid.

## Key findings by platform

### YouTube
- Erase Song (July 2024): AI removes copyright-claimed music, keeps dialogue and effects; options for creators with a music claim are Erase Song, Replace Song, Trim out segment, Dispute. "This edit might not work if the song is hard to remove"; fallback is mute. [VF, press 2024-07; no 2026 update found] — [TechRadar](https://www.techradar.com/computing/artificial-intelligence/a-new-ai-tool-lets-you-remove-copyrighted-songs-from-your-youtube-video-without-erasing-any-other-audio), [Engadget](https://www.engadget.com/youtube-upgrades-its-erase-song-tool-to-remove-copyrighted-music-only-140032261.html)
- Lock-in [VF-by-design]: only for videos already uploaded to YouTube and with a Content ID claim; not a general-purpose tool.
- Auto dubbing: 27 languages, available to all viewers and creators; Expressive Speech limited to 8 languages (EN, FR, DE, HI, ID, IT, PT, ES); lip sync still a pilot; smart filtering skips music/silent vlogs; 6M+ daily viewers watching 10+ min of dubbed content (December 2025 figures). [VF, Google blog 2026-02-05] — [Google blog](https://blog.google/intl/en-in/products/platforms/unlocking-a-global-audience-with-auto-dubbing/). A July 2026 third-party article says lip sync had not shipped by then [SEC] — [sync.so](https://sync.so/blog/youtube-auto-dubbing). Korean as a dubbing target/source not verified.
- Blur: Studio face blur, custom blur (rectangle/oval), tracking of a moving object, multiple regions; face detection can miss faces. [VF/SEC, undated press] — [Social Media Today](https://www.socialmediatoday.com/news/youtubes-working-on-new-updates-for-its-blur-tools-within-youtube-studio/584230), [YouTube Help](https://support.google.com/youtube/answer/9057652?hl=en-GB). Works on own uploads only; plate-specific detection not claimed.
- Likeness detection opened to all adult creators May 2026 (reports differ: 16 or 17 May), experimental, not in all countries [SEC] — [YouTube Help](https://support.google.com/youtube/answer/16440338), [PhotographyTalk](https://www.photographytalk.com/youtube-opens-ai-likeness-detection-to-every-creator-18-and-older/). Relevant to voice/face protection ideas.
- Auto Shorts-from-long-video: nothing found in this session (gap).

### CapCut / TikTok
- Official: paid features carry a "Pro" icon; features once free can become paid after trials end. [VF] — [CapCut Help](https://www.capcut.com/help/features-needs-to-paid)
- Claim that Feb 2026 pricing restructure moved auto-captions, 4K export, AI avatars, watermark-free export behind Pro ($19.99/mo, $179.99/yr) comes from a blog dated March 2026; unconfirmed. [SEC] — [blog](https://deepseek-techpulse.blogspot.com/2026/03/capcut-free-vs-pro-2026.html). Other guides say the free tier still has auto-captions (20+ languages) and auto silence trimming, and that Pro AI is credit-metered (~200 credits/mo). Prices cited from $7.99 to $19.99. [SEC] — [Fluxnote](https://fluxnote.io/guides/capcut-ai-features-free-vs-paid-2026), [CostBench](https://www.costbench.com/software/video-editing/capcut/hidden-costs/)
- Free tier reportedly limited to personal-social commercial license [SEC] — [VidPros](https://vidpros.com/capcut-pro-vs-free/). Treat CapCut paywall details as unresolved; must check in-app.

### Instagram Edits (Meta)
- June 2026: AI assistant and desktop version previewed (not widely available yet); reported features: AI green screen with subject isolation, Cutout model, AI Animate, Modify, Keyframes, export up to 15 min. [SEC, aggregator coverage] — [AlternativeTo](https://alternativeto.net/news/2026/6/meta-is-adding-an-ai-assistant-and-a-desktop-version-to-its-edits-video-editing-app/), [Hypebeast](https://hypebeast.com/2026/6/instagram-edits-app-adds-beat-markers-and-ai-tools)
- Mosseri: Edits will be free, paid features possible later for compute-heavy AI. [VC, quoted in secondary coverage]
- No evidence of audio enhancement, stem separation, or captions in Edits found this session (gap).

### Adobe
- Premiere Pro: Enhance Speech and filler-word detection (text-based editing) launched 2023; Generative Extend beta then (2 s video, 10 s audio). [VF, 2023-09 press] — [Engadget](https://www.engadget.com/adobe-premiere-pro-is-getting-an-ai-tool-to-cut-your-hems-and-haws-145019681.html), [Adobe Research](https://research.adobe.com/news/new-ai-features-make-audio-editing-easier/). No 2026 release-note check done (gap).
- Premiere mobile app (iPhone launched 2025-09-30; free, no watermark, 4K export reported) but generative AI requires Firefly credits; Android status unclear. [VF/VC] — [PetaPixel](https://petapixel.com/2025/09/30/you-can-now-edit-your-videos-in-premiere-on-iphone-for-free). Whether speech enhancement is free vs credit-gated in the app: unknown.
- Podcast/Express limits: not verified.

### DaVinci Resolve
- Resolve 21 and Studio 21 released ~2026-06-03; Studio $295; AI Magic Mask, AI UltraSharpen (upscale), IntelliSearch, CineFocus, face tools; photo page. [VF, press] — [PetaPixel](https://petapixel.com/2026/06/03/davinci-resolve-21-officially-released-with-new-photo-editing-ai-tools/), [Videomaker](https://www.videomaker.com/news/davinci-resolve-21-adds-photos-page-ai-focus-tools-and-free-upgrades/). Sources conflict on how many AI tools are in the free edition; one says none of the new AI suite is free. [SEC]
- Dialogue Separator: Studio-only in all sources; Voice Isolation: mostly cited as Studio-only, Larry Jordan material implies otherwise (conflict; Blackmagic comparison page not fetched). [SEC] — [Larry Jordan](https://larryjordan.com/articles/compare-ai-voice-isolation-ai-dialogue-leveler-ai-dialogue-separator-in-davinci-resolve-20/), [Storyblocks](https://www.storyblocks.com/resources/tutorials/davinci-resolve-free-vs-studio)
- Takeaway: desktop, one-time $295, manual editor workflow; not an API/batch service, but it removes the quality argument for many Studio-level jobs.

### Apple
- iPhone 16 Audio Mix (Standard/In-Frame/Studio/Cinematic) in Photos edit; iOS 26 extends controls to third-party apps. Wind noise reduction reported. [VF-ish, tech press] — [Heise](https://heise.de/-10461891), [BGR](https://www.bgr.com/2276353/audio-mix-iphone-feature-to-improve-audio-quality-in-videos/), [Tom's Guide](https://www.tomsguide.com/phones/iphones/ios-26-lets-third-party-apps-access-these-two-big-iphone-camera-features-what-we-know). Device list (iPhone 16 series and newer) not verified here [HYP].
- Final Cut Pro 11 (2024-11-13): Magnetic Mask, Transcribe to Captions, Voice Isolation; $299 one-time, M-series Macs for AI features. [VF] — [Apple Newsroom via Nasdaq](https://www.nasdaq.com/press-release/final-cut-pro-11-begins-new-chapter-for-video-editing-on-mac-2024-11-13), [Newsshooter](https://newsshooter.com/2024/11/13/final-cut-pro-11-features-magnetic-mask-transcribe-to-captions-and-more)
- Photos clean-up and Voice Isolation mic mode: not directly sourced (stills clean-up is HYP).

### Samsung Galaxy AI
- Audio Eraser in Galaxy Video Editor from S24 with One UI 7+ (Samsung says availability varies by region, model, carrier). One UI 8: one-tap in Gallery; also Notes, Voice Recorder, calls. One UI 8.5/Galaxy S26: reported system-level use over third-party apps (YouTube, Instagram, Netflix, TikTok) with strength/voice-focus controls [SEC]. [VF/SEC] — [Samsung support](https://www.samsung.com/ca/support/mobile-devices/how-to-remove-unwanted-sound-from-videos-using-audio-eraser-on-your-galaxy/), [Android Authority](https://www.androidauthority.com/samsung-audio-eraser-update-3575263/), [SamMobile](https://www.sammobile.com/news/samsung-galaxy-s26-ai-audio-eraser-third-party-apps/)
- Instant Slow-mo and other video features: not researched (gap).

### Google Pixel / Photos
- Audio Magic Eraser: Pixel only, Google Photos Edit > Audio, videos 1 s to 2 min. [VF] — [Google Photos Help](https://support.google.com/photos/answer/14674995)
- Video Boost: cloud-processed, requires backup to Google Photos; Pixel 10 Pro review (Android Authority) says it only applies to footage captured with the feature on and is not processed locally. Pixel 11 Pro (Aug 2026 retailer page) adds "Pro Stable Video". [VF/SEC] — [Android Authority](https://www.androidauthority.com/5-ways-video-boost-disappoints-me-on-pixel-10-pro-3633915), [Google Store](https://store.google.com/intl/en_au/ideas/articles/video-boost/)
- Magic Eraser for video, Photos video features in 2026: not found (gap).

### Descript
- Free: roughly 1 media hour/month, watermarked, 720p exports, 100 AI credits one-time; Studio Sound ~5 lifetime uses (single 2025 review); filler removal and Studio Sound on paid tiers; Hobbyist $16-24, Creator $24-35, Business $50-65 per user per month. [SEC; Sonix is a competitor] — [Sonix](https://sonix.ai/resources/descript-pricing/), [CostBench](https://costbench.com/software/video-editing/descript-editor/free-plan/), [Descript](https://www.descript.com/tools/remove-filler-from-audio)

### Korean apps
- Vrew: free plan with auto-subtitles, watermarked exports, AI-voice free quota (e.g., 10 uses cited); paid tiers priced inconsistently ($8.99 vs $15 per month); Vrew Mobile Service ends 2026-07-01 (desktop continues). Reviewer calls it the right text-based editor for Korean. [SEC/VF] — [Vrew](https://vrew.ai/en/), [Vrew pricing guide](https://book.st-hakky.com/en/business/vrew-pricing-guide), [Saiteki](https://saiteki-ai.com/creative/movie/vrew-pricing/)
- Naver CLOVA Note: Korean speech-to-text/meeting minutes with speaker separation (NEST/WISE), summarization added 2023-11; audio transcription, not video subtitle editing. Clova Dubbing: TTS narration. Kakao: nothing found. [VF/SEC] — [Naver press](https://navercorp.com/en/media/pressReleasesDetail?seq=2318), [Asiae](https://www.asiae.co.kr/en/article/2020112916363719641)

## What changed in 2025-2026 that closed gaps

- 2025-09-30: Adobe Premiere iPhone app, free, AI credit-gated. [VF] — PetaPixel link above.
- 2025 (One UI 8) to 2026 (One UI 8.5 / S26): Samsung Audio Eraser moved from one app to system-wide/live use. [VF/SEC] — links above.
- iOS 26 (2025-2026): Audio Mix opened to third-party apps. [VF-ish] — Tom's Guide above.
- 2026-02-05: YouTube auto dubbing to 27 languages, all users, expressive speech (8 languages). [VF] — Google blog.
- 2026-05: YouTube likeness detection for all adult creators. [SEC]
- 2026-06: Resolve 21 (UltraSharpen upscaling, Magic Mask AI, face tools), Studio $295. [VF] — PetaPixel.
- 2026-06: Instagram Edits AI assistant/desktop preview and AI green screen/cutout. [SEC]
- 2026-08: Pixel 11 Pro Video Boost with Pro Stable Video (retailer page). [SEC]
- 2026-07-01: Vrew mobile app discontinued (a gap opening for mobile Korean captioning, but desktop remains). [SEC]

### Convenience gaps and why someone would still pay for a dedicated tool
Gap types: UPL = only after upload to that platform; CLM = only claimed/own videos; DEV = device/OS locked; DEEP = buried in an editor; NB = no batch; LIM = format/resolution/length/quota limit; Q = quality or Korean weakness; PRIV = files go to platform; HEAVY = heavy desktop app/learning curve. All "why pay" entries are [HYP]; the gap facts they rest on are cited in the platform sections above.

| Job | Free option and its convenience gaps (evidence) | Why someone would still pay for a dedicated tool [HYP] |
|---|---|---|
| Noise removal / enhancement | Samsung Audio Eraser: DEV (S24+, One UI 7+), region/carrier variance. Pixel Audio Magic Eraser: DEV (Pixel), LIM (1 s-2 min clips). Apple Audio Mix: DEV (iPhone 16-era), capture/Photos-bound. Resolve Voice Isolation: HEAVY, mostly Studio (conflict). Premiere Enhance Speech: HEAVY, subscription. Descript: LIM (tiny free quota) | Drag-drop any file (any phone, camera, recorder, Zoom) in a browser; long files and batches; no editor to learn; works for people who do not own the right phone |
| Echo/reverb removal | Apple Studio mix (DEV, iPhone video only); Descript/Adobe paid and editor-bound | One-click on existing recordings of any source; podcasts and lectures in bulk |
| Stem separation | Resolve Music Remixer: HEAVY, Studio $295; YouTube: none | Simple web upload, stems as downloads, batch, no $295 licence or NLE |
| Voice isolation | Same as noise removal; YouTube only for claimed songs (CLM) | Same, plus audio-only workflows (no video editor needed) |
| Specific speaker | No platform covers it; Apple In-Frame is capture-time and camera-based (DEV) | Whole category open; convenience of a click-a-person flow on existing footage |
| Music removal for copyright | YouTube Erase Song: UPL + CLM (video must be uploaded and already claimed, so risk is incurred first); may fail on hard songs, falls back to mute; PRIV (video sits on YouTube first) | Fix before upload (avoid claim/strike entirely); works for TikTok, Reels, clients' files, archives; batch back-catalogue clean-up; private; guaranteed output file |
| Music replacement | YouTube Replace Song: UPL + CLM + YouTube library only (LIM) | Replace with own/licensed track on any platform, export a file; one workflow with removal |
| Captions incl. Korean | Many free options; Vrew strong in Korean but mobile ended 2026-07-01 and exports watermarked/limited on free; CapCut paywall churn (SEC) | Korean accuracy and styling, SRT in many formats, batch, mobile; teams that avoid watermark and subscription churn |
| AI dubbing | YouTube auto-dub: UPL, viewer-side track on their platform only; no downloadable dubbed video, Expressive Speech only 8 languages, lip-sync pilot; Korean pairs unverified | Own the dubbed file for use on any platform; voice-preserving Korean/English; lip-sync; review/edit before publish |
| Lip-sync | YouTube pilot only | Open gap |
| Filler/silence cutting | Premiere (HEAVY, subscription), Descript (paid, LIM), CapCut auto-cut (SEC), Vrew | Batch podcast/lecture clean-up with a flat price; no editor |
| Clip repurposing | CapCut/Descript credit-metered (SEC) | Flat-price, batch long-to-short with brand templates and Korean captions |
| Upscaling / restoration | Resolve Studio UltraSharpen (HEAVY, $295); Pixel Video Boost (DEV, capture-time, cloud, not on existing videos per one review) | Fix old/existing footage from any source; batch; per-file pricing instead of a $295 licence or new phone |
| Face restoration | Little free coverage | Open gap |
| Low-light | Capture-time only on Pixel/Samsung/Apple (DEV); Resolve Studio (HEAVY) | Rescue already-shot footage |
| Stabilization | Common free; Pixel Pro Stable Video (DEV) | Low pull; only for post-hoc fixes of existing files |
| Object/person removal | Resolve Studio (HEAVY); Photos clean-up is stills | Video object removal without NLE knowledge |
| Background removal | CapCut/Edits (UPL to app ecosystem, some paid); FCP Magnetic Mask (Mac, HEAVY); Resolve Studio | Web/API, batch, transparent export (alpha formats) |
| Face / plate blur | YouTube Studio blur: UPL (must upload first, so unblurred video is on the platform; PRIV), face detection can miss faces and needs manual review; plates only via manual custom blur; own uploads only. BlurMe is the existing proof that this still sells | Blur before upload, any source/batch (dashcam, drone, security footage), plate detection, auditable output, privacy; compliance users need guaranteed redaction |
| Auto-reframe | Free in CapCut, Edits, Premiere, Resolve (HEAVY or tied to ecosystem) | Low pull unless bundled with batch/captions |
| Color correction | Free in all editors | Low pull; only as batch auto-grade |
| Loudness normalization | Free in Resolve/Premiere; HEAVY for non-editors | Batch loudness targets (LUFS) per platform for podcasters, no DAW |

Cross-cutting convenience themes [HYP]:
- Platform-first lock: the strongest free tools (YouTube Erase Song, blur, dubbing) work only after the file is on YouTube and for the channel owner; they offer no processed file for other platforms and mean exposing unprocessed content first.
- Device lock: Samsung/Pixel/Apple audio and video tools only help owners of recent flagship phones and mostly on their own captures.
- Heavy desktop licences: Resolve Studio ($295) and Final Cut ($299, Mac) cover many jobs but demand an editor workflow; not batch or API.
- Quota and churn: CapCut, Descript and Adobe gate AI via credits, watermarks or changing paywalls (some pricing claims are SEC), so flat-price single-purpose tools can appeal.
- Korean: Vrew is the strong Korean incumbent, but its mobile app ended 2026-07-01 and dubbing/lip-sync Korean pairs are unverified; open area to test.

### Inferences
- [HYP] Per coordinator correction: free coverage does not rule out a job. Jobs with the least convenience gap (reframe, color, stabilization, basic captions) are weakest; jobs where the free tool is platform-first, device-locked or desktop-heavy are strongest.
- [HYP] Surviving gaps: platform-independent music removal/replacement (YouTube's tool only for claimed YouTube uploads, no 2026 update found); per-speaker extraction; plate blur; batch/API/offline processing; video upscaling/face restoration outside Resolve Studio/Pixel; Korean lip-sync dubbing; mobile Korean subtitle editing after Vrew mobile shutdown.
- [HYP] On-device features (Samsung, Pixel, Apple) pull consumer short-clip noise removal to zero price, so a SaaS needs professional length, batch, or non-phone sources.

## Gaps
- Not verified this session: CapCut actual current paywall (in-app/official), Meta Edits audio features, Adobe Podcast/Express free limits and Premiere 2026 release notes, Blackmagic official free-vs-Studio list (Voice Isolation conflict), Apple Photos clean-up and Voice Isolation mic-mode details and device lists, Samsung Instant Slow-mo, Google Photos video features, Kakao, Naver video-subtitle tools, YouTube auto-captions/auto-highlights and Korean support, YouTube Erase Song 2026 changes and non-music-claim limits, quality comparisons (no benchmarks found for any tool), and all cells marked HYP or "?" in the matrix.
- Pricing figures from secondary sources conflict (CapCut, Descript, Vrew); no primary pricing pages fetched.
