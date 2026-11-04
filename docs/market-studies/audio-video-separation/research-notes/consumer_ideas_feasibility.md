# Consumer app ideas built on dialogue/music/effects (DME) audio separation: feasibility assessment

Research date: 2026-11-04. Labels: [VERIFIED] = from a primary or authoritative page; [VENDOR] = vendor or marketing claim; [ANECDOTE] = user or press anecdote; [ESTIMATE] = secondary-source number or my arithmetic; [HYPOTHESIS] = my inference. Search used ~14 calls; many sources are press summaries or vendor blogs and are flagged. Page dates are given where the source showed one; undated pages are marked "undated".

## Idea 1: "Clear Voice" dialogue boost for TV/OTT (technical access, incumbents, demand)

### Takeaway
Dialogue boost is already shipped free by Samsung, Sony, LG, Amazon (Prime Video and Fire TV), Apple (tvOS) and DTS. A third-party phone or TV app cannot reliably get at DRM-protected OTT audio, so the idea is strategically weak as a standalone consumer app. Demand for the problem is well evidenced, though.

### Cited Findings
- [VERIFIED] Android AudioPlaybackCapture (Android 10+) needs RECORD_AUDIO, a user-approved MediaProjection prompt, and the same user profile. Captured audio must use USAGE_MEDIA, USAGE_GAME or USAGE_UNKNOWN, and the source app must allow capture. Apps targeting API 29+ allow capture by default, but can set `android:allowAudioPlaybackCapture="false"` or `ALLOW_CAPTURE_BY_SYSTEM/NONE`. The most restrictive policy wins. The stated primary use case is streaming apps capturing game audio. (Page undated, current as fetched 2026-11-04.) — [Android Developers: Capture video and audio playback](https://developer.android.com/media/platform/av-capture)
- [VERIFIED] The same page says system components can capture playback by default, which is why vendors can build captioning/accessibility features that third-party apps cannot. — [Android Developers](https://developer.android.com/media/platform/av-capture)
- [HYPOTHESIS] The page does not mention Widevine DRM. I could not confirm whether Netflix, Prime Video or Disney+ set the opt-out flag or a restrictive capture policy. A search for this returned nothing specific. Treat "OTT apps block playback capture" as unverified. It must be tested on-device before any commitment. Screen-record audio may also be silenced via capture policy.
- [VERIFIED] Samsung Active Voice Amplifier (AVA) uses the TV's built-in sound sensor to measure room noise and adjust volume. The Pro version uses AI to analyse background sounds, voice clarity and ambient noise. It is limited to select models and only works with TV speakers as the output. — [Samsung AU support](https://www.samsung.com/au/support/tv-audio-video/active-voice-amplifier-on-samsung-tvs); [Samsung India support (Pro)](https://www.samsung.com/in/support/tv-audio-video/active-voice-amplifier-pro-on-samsung-tv/)
- [VENDOR] Samsung's 2025 soundbars include Active Voice Amplifier Pro for dialogue clarity. — [Samsung US newsroom](https://news.samsung.com/us/samsung-debuts-2025-soundbars-with-new-designs-improved-bass-and-enhanced-ai)
- [VENDOR] Sony "Voice Zoom 3" uses AI to recognise voices and raise or lower their volume. Reviewers say it works best with a Sony Bravia TV plus Bravia Theatre Bar, and it is on Bravia 8 and 9, not Bravia 3 (Tom's Guide). — [Sony Bravia Theatre Bar 5 feature page](https://www.sony.co.in/home-theatre-sound-bars/products/bravia-theatre-bar-5/feature3); [Tom's Guide](https://www.tomsguide.com/tvs/heres-why-you-cant-hear-dialogue-on-your-tv-and-how-to-fix-it)
- [VENDOR/ANECDOTE] LG Clear Voice Pro and AI Sound Pro are described in a French retail guide (algorithm identifies the dialogue frequency range; AI Sound Pro compares against a sample database). I found no English LG primary documentation. — [Son-Video guide](https://www.son-video.com/guide/toutes-les-solutions-pour-augmenter-le-volume-des-dialogues-des-films-et-series)
- [VENDOR] DTS Clear Dialogue uses ML to tell voice from ambient sound and is built into the TV processor. — [Digital Trends](https://digitaltrends.com/home-theater/dts-clear-dialogue)
- [VERIFIED/VENDOR] Prime Video Dialogue Boost launched in 2023 with low/medium/high levels. Amazon's delivery docs say Prime Video needs to create the new audio ahead of time for each title (server-side pre-processed track). Per press, it is now standard across new Fire TV models. — [Amazon Prime Video tech docs](https://videocentral.amazon.com/support/delivery-specifications/dialogue-boost); [SlashGear](https://www.slashgear.com/1983280/new-amazon-fire-tv-dialogue-boost-solves-speaking-background-music-volume-problem); [Amazon News](https://www.aboutamazon.com/md/news/entertainment/prime-video-dialogue-boost)
- [VERIFIED via press] Apple tvOS 17 "Enhance Dialogue" uses ML on Apple TV 4K and HomePod 2nd gen. It works with apps using standard tvOS playback, such as Disney+, Hulu and Max. Apps with custom players such as Netflix are reported not to work, and it does not work on TV speakers or soundbars. This summary came from search results (iDownloadBlog/Wired-era coverage); not re-checked on Apple's support page. — [iDownloadBlog](https://www.idownloadblog.com/?p=960018); [Wired](https://wirednews.pages.dev/story/how-to-boost-spoken-dialogue-in-movies-and-shows)
- [ANECDOTE] Netflix: I found no evidence of a native dialogue-enhancement mode, only "Reduce Loud Sounds" (undated blog) and dialogue-only subtitles for new originals. — [Hearably blog (undated, vendor)](https://hearably-web.pages.dev/blog/netflix-dialogue-fix/); [Neowin](https://www.neowin.net/news/dialogue-only-subtitles-are-finally-making-their-way-to-netflix)
- [VERIFIED] Dolby AC-4 supports dialogue enhancement and is used in ATSC 3.0 and DVB broadcast. In ATSC 3.0, viewers can tailor dialogue level. — [Dolby ATSC 3 audio handbook](https://professional.dolby.com/siteassets/broadcast/nextgen-tv/atsc3_audio_handbook.pdf); [Sofia Digital](https://sofiadigital.com/sofia-digital-has-worked-with-dolby-to-create-technical-implementation-of-ac4-dialogue-enhancement-service-signalled-over-dvb-i/)
- [ESTIMATE, news report of survey] NPR (2025-04-17): more than half of the 1,260 Americans surveyed use subtitles because soundtracks are muddled. Attributed to mumbling, layered soundtracks and small TV speakers. — [NPR](https://www.npr.org/2025/04/17/nx-s1-5346742/more-than-half-of-americans-use-subtitles-because-audio-is-muddled-survey-finds)
- [ESTIMATE, news report] Preply 2022 survey: half of Americans watch with subtitles most of the time. 72% cite muddled audio and 78% say loud background music makes dialogue hard to hear (secondhand, from search summary; no primary Preply report retrieved). — see NPR link above and [Fox affiliate coverage](https://www.fox6now.com/news/young-people-watch-tv-movies-subtitles-more-than-older-viewers-survey)
- [ESTIMATE] Hearing loss: GBD 2019 counted ~1.5 billion people with some hearing loss, mostly mild; about one third of people over 65 have disabling hearing loss per a WHO-derived secondary source. — [PMC: Updates on hearing from the Global Burden of Disease study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7743268/)

### Inferences
- [HYPOTHESIS] The workable form is a hardware or TV-embedded licensing play (B2B to TV/soundbar makers) rather than a consumer app. Consumer-app routes: a phone app processing mic-captured room audio (low quality, latency, feedback), or earbuds/hearing-aid firmware, where it competes with AirPods Conversation Boost / hearing-aid features (not researched here).
- [HYPOTHESIS] Prime Video's approach (pre-computed server-side track) shows the platform-owner path avoids the DRM problem entirely and makes third-party capture unnecessary.
- [HYPOTHESIS] Most plausible consumer monetisation is hearing-health or accessibility bundles or OEM licensing, not subscriptions, because manufacturers give it away free.

### Gaps
- No device test of OTT apps against AudioPlaybackCapture; Widevine L1 output-path behaviour not sourced.
- iOS limits (ReplayKit audio capture of DRM apps; FairPlay) not verified in this pass.
- No primary LG documentation, no Roku speech-clarity source, no Apple support page re-check, no Preply primary report, no BBC research located.

## Idea 2: UGC dubbing-challenge app

### Takeaway
Product is technically easy (offline separation of clips) but legally the hardest: user-uploaded film/drama/anime clips need licences. Dubsmash's history shows the format can go viral yet did not survive TikTok. Viable only with licensed or original content.

### Cited Findings
- [VERIFIED] Dubsmash (lip-sync to quotes/songs) was acquired by Reddit in December 2020 and shut down on 2022-02-22, with tools folded into Reddit. — [TechCrunch 2021-11-23](https://techcrunch.com/2021/11/23/reddit-is-shutting-down-dubsmash-and-integrating-video-tools-into-its-own-app); [Bloomberg 2022-02-22](https://www.bloomberg.com/news/articles/2022-02-22/dubsmash-no-match-for-tiktok-dies-quietly-after-its-acquisition-by-reddit)
- [VERIFIED, secondary] Korean Copyright Act Art. 35-5 is a general fair-use clause. Factors: purpose and character of use, type and purpose of the work, proportion and importance of the portion used, and market effect. Also required: no conflict with normal exploitation and no unreasonable prejudice to the author's legitimate interests. Practice sources say outcomes are case-by-case; one non-authoritative source suggests ~5 second clips might qualify, with no case cited. A court decision reportedly distinguishes Art. 28 (quotation) from Art. 35-5. Penalties: up to 5 years in prison or 50M KRW fine. — [korea.legal Art. 35-5](https://korea.legal/wiki/%ec%a0%80%ec%9e%91%ea%b6%8c%eb%b2%95-%ec%a0%9c35%ec%a1%b0%ec%9d%985/); [Lawtalk](https://www.lawtalk.co.kr/posts/135842); [KCC counsel page](https://www.copyright.or.kr/business/counsel/auto-advice-service/practice/detail.do?counselSeq=3578)
- [ANECDOTE] A Japanese enforcement wave against "fast movie" (edited clip summary) uploads was followed with alarm by Korean YouTubers (Ajunews, 2022-12-07). — [Ajunews](https://www.ajunews.com/view/20221207144128072)
- [HYPOTHESIS] Removing dialogue and leaving music/effects creates a derivative of the soundtrack (music, effects and picture all remain protected), so a dub app that hosts the clips is not helped by fair use, because the whole clip is the product.

### Inferences
- [HYPOTHESIS] Safe variants: licensed catalogues (anime publishers, K-drama distributors, public domain films), or users dub in their own device with no hosting or redistribution. Platform-native tools (TikTok voiceover/duet; not verified in this pass) already offer much of the format.
- [HYPOTHESIS] Likely monetisation: rev-share licensing with studios, ad-supported, or B2B education/fandom campaigns. Studio approvals are the rate limiter.

### Gaps
- No search results for TikTok duet/voiceover specifics, Japan/Korea voice-actor apps, or licensing partnership precedents. No Korean court case on clip dubbing located.

## Idea 3: BGM copyright clearance for vlogs and shorts

### Takeaway
YouTube already ships a free "Erase song" in Studio, but only for already-claimed content on YouTube. The remaining gap is pre-upload cleaning for other platforms. Residual-music Content ID matching is a real risk.

### Cited Findings
- [VERIFIED] YouTube Help: Erase song (audio claims only) can mute just the claimed song or all audio in the claimed segment. If all claimed audio is removed, the claim clears automatically. If some claimed content remains, the claim isn't removed. Alternatives: Trim, Replace song (YouTube Audio Library). — [YouTube Help: Remove claimed content](https://support.google.com/youtube/answer/2902117?hl=en)
- [VERIFIED via press, 2024-07-08] YouTube launched an AI-based version that separates song from speech. Beta performed poorly and YouTube says the updated one works if the song isn't too hard to remove from the mix. — [Tubefilter 2024-07-08](https://www.tubefilter.com/2024/07/08/youtube-copyright-tool-ai-erase-song-content-id/amp/); [TechRadar](https://www.techradar.com/computing/artificial-intelligence/a-new-ai-tool-lets-you-remove-copyrighted-songs-from-your-youtube-video-without-erasing-any-other-audio)
- [VENDOR] A vendor blog says faintly bleeding music in an exported speech-only track can still be matched by Content ID and generate a second claim. No independent test found. — [Perso.ai blog](https://perso.ai/blog/youtube-copyright-claim-background-music); see also [Lalal.ai vlog guide](https://www.lalal.ai/blog/how-to-remove-background-music-from-vlog-footage/)
- [VENDOR] CapCut desktop offers one-click "Voice isolation / Remove vocal"; export may need a subscription (CapCut marketing pages, undated). Third-party guides say separation usually leaves residue. — [CapCut vocal remover](https://capcut.com/tools/vocal-remover)
- [VERIFIED, general] A Content ID claim is not a strike; strikes come from manual takedowns (Perso.ai/YouTube help summaries; stated in search summary, not separately re-fetched).

### Inferences
- [HYPOTHESIS] Legal: recording a licensed work in public ambient is a grey area; removing the music does not license prior use but removes the infringing element from the output. Publishing the voice-only track is less risky than publishing with the music.
- [HYPOTHESIS] Differentiator would be "verified-clean" certification (pre-check against a fingerprint database), which would require rights-holder data not available to a small startup. TikTok/Instagram muting behaviour and Adobe Premiere/Audition remix features were not researched.
- [HYPOTHESIS] Monetisation: prosumer subscription or per-minute credits; the most credible buyers are creators and agencies, with pricing capped by free YouTube and CapCut tools.

### Gaps
- Instagram/TikTok muting policies, Adobe and Descript tools, and any independent test of Content ID on separated audio were not found.

## Idea 4: Language-learning shadowing player

### Takeaway
Clean-speech extraction from TV is technically feasible only on content the user can access in files or non-DRM streams. For Netflix-class content the incumbents work through subtitle overlays in the browser, which avoids touching audio. Licensed-library partners are the cleaner path.

### Cited Findings
- [ANECDOTE/VENDOR] Language Reactor is a browser extension adding dual subtitles and dictionary to Netflix and YouTube (reviews disagree on Prime/Disney+ support). Pro is about $5/month per one review. — [Mezzoguild review](https://www.mezzoguild.com/language-reactor-review/); [FluentU review](https://fluentu.com/blog/reviews/language-reactor)
- [VENDOR] Lingopie is a curated library with its own player, not an overlay; its competitor-comparison blog is promotional. Current price not verified. — [Lingopie blog (2026, vendor)](https://lingopie.com/blog/language-reactor-review/)
- [HYPOTHESIS] A browser extension can in principle route a tab's audio through a Web Audio graph, but DRM (Widevine/EME) media typically yields protected output; I did not verify this. LingQ and Korean apps (말해보카, 스픽) were not researched.

### Inferences
- [HYPOTHESIS] Best path: licensed content (YouTube creators with consent, open-licensed or publisher-partnered shows) with cached clean-speech tracks. Monetisation: subscription (consumer language-learning typically $5-15/month; estimate, not sourced here).
- [HYPOTHESIS] Value of separation is modest: most TV dialogue already dominates the mix; the pain point is subtitle/transcript alignment, which incumbents address.

### Gaps
- No pricing for Lingopie/LingQ, nothing on 말해보카/스픽, no DRM test for browser-based tab capture.

## Idea 5: BGM-swap meme app

### Takeaway
Fun and technically trivial, but sits squarely inside CapCut, TikTok and Reels, which have music libraries and templates. Poor standalone defensibility.

### Cited Findings
- [VENDOR] CapCut already markets "remove vocals / separate voice from music" tools and template pages for removing background music while keeping voice, then adding own music. — [CapCut remove-background-music template](https://www.capcut.com/explore/remove-background-music-from-video-but-keep-voice/7512700136369195025); [CapCut AI vocal remover](https://www.capcut.com/create/ai-vocal-remover)
- [HYPOTHESIS] TikTok/Reels in-app licensed music is cleared only inside those apps; an independent app's genre-swap export would carry licensing cost or limit to royalty-free libraries.

### Inferences
- [HYPOTHESIS] Likelihood of being a feature rather than a product is very high. Could work as a viral acquisition funnel or white-label SDK feature, not a revenue business. I found no specific trend data (e.g., search interest) in this pass.

### Gaps
- No Google Trends or app-store ranking data gathered; TikTok template behaviour not verified.

## Idea 6: Music-education / practice creator tools (stems for teaching)

### Takeaway
Crowded: Moises is the incumbent with tens of millions of users and a B2B arm. Creator-specific teaching tools are a niche, and separation quality is commoditised.

### Cited Findings
- [ESTIMATE] Moises reports 30M+ registered users (2023-era), later press says 50M worldwide; its company Music AI sells 50+ B2B audio AI solutions and was reported to have raised funding ($40M tied to Music AI per Hypebot; earlier $10.25M). Pricing figures are conflicting and from aggregators; none verified. — [Push.fm blog](https://blog.push.fm/?p=9800); [Hypebot](https://www.hypebot.com/music-ai-adds-40-million/); [Moises site](https://moises.ai/)
- [VERIFIED via press] Free tier includes vocals/drums/bass separation with limits (aggregator sources). — [Moises-related aggregator](https://whichaitools.pages.dev/tools/moises-app)

### Inferences
- [HYPOTHESIS] Differentiate through teacher workflows (classroom assignments, notation sync, licensed catalogues) rather than separation. Rights to teach with commercial songs remain with the user (sheet-music/practice use generally personal; legal specifics not researched).
- [HYPOTHESIS] Monetisation: freemium subscriptions, school/teacher licences.

### Gaps
- No verified current Moises pricing; no TikTok-teaching-creator tooling research.

## Platform risk and on-device performance

### Takeaway
Platform owners already ship the feature for free where it matters (YouTube Erase song, Prime Video Dialogue Boost, Apple Music Sing, TV makers). On-device real-time separation is proven in mainstream hardware, so latency and cost are not the moat.

### Cited Findings
- [VENDOR] Apple said Apple Music Sing uses an on-device ML algorithm that processes music in real time and isolates vocals. A reverse-engineering project attributes it to the `AUSoundIsolation` audio unit (iOS 16/macOS 13) and notes the second-generation Neural Engine (A13 and above); that attribution is the author's analysis, not Apple's. Reported minimum is iPhone 11 and iOS 16.2. — [MusicRadar](https://www.musicradar.com/news/apple-music-sing-vocal-removal); [GitHub QuietNow](https://github.imc.re/spotlightishere/QuietNow)
- [VERIFIED] Algoriddim djay Pro used Neural Engine for real-time stem separation by 2020. — [AppleInsider 2020-06-18](https://appleinsider.com/articles/20/06/18/apples-neural-engine-tapped-in-new-djay-pro-to-reinvent-live-mixing/)
- [VERIFIED] Apple research on resource-constrained stereo singing voice cancellation exists. — [Apple ML Research](https://machinelearning.apple.com/research/resource-constrained)
- [VERIFIED] YouTube Erase song (2024) and Prime Video Dialogue Boost (2023) are free platform features (see above).

### Inferences
- [HYPOTHESIS] Phone-side separation of files is feasible now; real-time processing of other apps' audio is constrained by OS/DRM access rather than compute.

### Gaps
- No benchmark numbers (RTF, memory, battery) for Android on-device separation models.

## Ranked feasibility across the six ideas

Scores combine technical, legal, competitive and demand evidence; they are my judgment ([HYPOTHESIS]) based on the findings above.

| Rank | Idea | Technical | Legal | Competitive | Demand evidence | Verdict |
|---|---|---|---|---|---|---|
| 1 | 3. BGM clearance for vlogs/shorts | High (file-based, offline) | Medium (output cleaner than input; residue risk) | Medium-low (YouTube and CapCut cover part; cross-platform gap) | Medium (creator pain real; no hard data) | Best consumer fit; must prove Content ID-clean |
| 2 | 6. Music-education stems | High | Medium (user-provided songs) | Low (Moises dominant) | Medium | Niche workflow play only |
| 3 | 4. Shadowing player | Medium (DRM blocks Netflix audio) | Medium (needs licensed content) | Medium (Language Reactor, Lingopie) | Medium | Works with licensed/YouTube content |
| 4 | 5. BGM-swap meme app | High | Medium (music licensing) | Very low (CapCut/TikTok built in) | Unmeasured | Feature, not product |
| 5 | 2. UGC dubbing challenge | High | Low (film/anime clips; Art. 35-5 case-by-case) | Low (TikTok native; Dubsmash died) | Unmeasured | Licensed-catalogue only |
| 6 | 1. Clear Voice for TV/OTT | Low as consumer app (DRM/OS access unverified) | Medium | Very low (every TV maker and Amazon/Apple ship it) | High (surveys) | Strong demand, but B2B/OEM only |
