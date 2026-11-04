# Demand-side pain points in audio/video processing (creators, prosumers, small businesses) - longlist of candidate jobs

Research date: 2026-11-04. Tool budget was about 20 calls. Search was US-only and web-wide; it returned almost no direct reddit.com or Korean community (Clien, DC Inside, Naver Cafe) threads. Most evidence below is therefore vendor pages, review sites, vendor-community forums, and press. Every item is tagged [FACT] (verified from a primary or reputable source), [VENDOR] (vendor claim), [ANECDOTE] (forum or user post), [ESTIMATE] or [HYPOTHESIS] (my inference, no source). Where I could not source something it is listed under Gaps, not asserted. Recommended next step: manual reading of the named subreddits and Korean cafes, since this tool could not reach them.

## Which audio/video problems come up most often in creator, videographer, podcaster, educator, streamer and small-business communities (2024-2026)? What is the longlist of candidate jobs?

### Takeaway
Direct community-thread evidence for 2024-2026 was largely not retrievable with this tooling. The sourced evidence supports these demand signals: speech enhancement (noise, echo, "robotic" artifacts), Twitch/VOD copyrighted-audio muting, old-footage restoration and the price backlash against Topaz, vertical clip repurposing, and a crowded vocal/music separation market. The longlist (below) is mostly hypothesis built from these signals plus the user's examples; treat ranking as provisional.

### Cited Findings
- Adobe's own community forum carries many 2024-2025 posts that Enhance Speech v2 / Premiere "Speech Enhancer" sounds muffled, robotic, clips sentence endings, and that the in-app version is worse than the web version [ANECDOTE] - [Is Enhance Speech really that bad](https://community.adobe.com/t5/adobe-podcast-discussions/is-enhance-speech-really-that-bad/m-p/15148784/highlight/true); [Enhance causing robotic voice](https://community.adobe.com/t5/audition-discussions/enhance-causing-robotic-voice/m-p/14905124); [Speech enhancer not as good as v2](https://community.adobe.com/t5/premiere-pro-discussions/speech-enhancer-not-as-good-as-enhance-speech-v2/m-p/15476597) (threads dated roughly 2025; exact dates not verified).
- Comparison reviews say Descript Studio Sound can add robotic artifacts at high settings and Adobe can sound "sterile"; both depend on source quality [VENDOR/blog] - [Production Expert](https://www.pro-tools-expert.com/production-expert-1/adobe-podcast-enhance-is-it-any-good); [Clipped podcast comparison](https://metacast.app/podcast/clipped-your-content-creation-toolkit/Qpn11Oxc/adobe-speech-enhancement-vs-descript-studio-sound---which-ai-audio-tool-sounds-better/sf3WP0pD).
- Twitch states it scans VODs and clips and may mute VODs / delete clips where copyrighted audio is detected; mutes are distinct from DMCA notices; appeals exist [FACT] - [Twitch music guidelines](https://www.Twitch.tv/p/en/legal/community-guidelines/music); [Twitch Creator Camp](https://twitch.tv/creatorcamp/en/paths/copyrights-and-your-channel/copyright-school-resources-tools). Third-party blogs describe workarounds (download VOD and cut, or record a separate OBS audio track) [VENDOR/blog] - [Kapwing](https://kapwing.com/resources/twitch-dmca-guidelines-what-you-need-to-know).
- Topaz Video AI moved to subscription (reports say Sept/Oct 2025; sources disagree on the month); perpetual price was $299, subscriptions reported $299-$699/yr; a Dec 2025 Reddit thread reportedly argued it is no longer worth the price (second-hand, competitor blog) [VENDOR/blog, partly ANECDOTE] - [MyArchitectAI](https://www.myarchitectai.com/blog/topaz-ai-pricing); [Krea blog](https://www.krea.ai/blog/is-topaz-ai-free-pricing-system-requirements-and-alternatives-in-2026). A ProVideo Coalition tester said Topaz's online-only Astra model "does a remarkable job in rescuing old footage" [ANECDOTE/review] - [ProVideo Coalition](https://www.provideocoalition.com/?p=305041).
- Descript's Sept 2025 pricing overhaul (media minutes + AI credits) is a recurring complaint in reviews [VENDOR/blog] - [CheckThat reviews](https://checkthat.ai/brands/descript/reviews).
- OpusClip: Trustpilot reported 4.0/5 over 302 reviews with 22% 1-star, mainly credit mechanics, failures and cancellation (via competitor Ssemble blog, so possibly biased); reframing from horizontal to vertical can crop graphics [VENDOR/blog] - [Ssemble](https://ssemble.com/blog/opus-clip-review-2026); [eesel](https://www.eesel.ai/blog/opusclip-reviews).
- Wedding videographers' long-running audio problems (bad lav, wind, vows); old forum advice is to re-record vows or hire cleanup. Threads are 2004-2016, so not current evidence of 2024-26 volume [ANECDOTE, dated] - [DVinfo](https://www.dvinfo.net/forum/wedding-event-videography-techniques/532762-cleaning-up-audio.html); freelancers sell vow-audio cleanup on Fiverr [VENDOR] - [Fiverr](https://fiverr.com/omegacake/mix-your-wedding-video).
- Lecture-recording echo/noise: only vendor guides and an Audacity forum post found; no independent volume data [VENDOR/ANECDOTE] - [Audacity forum](https://forum.audacityteam.org/t/please-help-check-noisy-audio-lecture/42302); [TensorPix](https://tensorpix.ai/blog/how-to-fix-lecture-recordings).
- Korea: Korean AI voice/background separation and noise-removal tools (CapCut KR, Kapwing KR, StemSplit KR, Perso.ai) are marketed to Korean users, indicating supply, but I found no Korean community complaint threads [VENDOR] - [CapCut KR](https://www.capcut.com/ko-kr/explore/%EC%9D%8C%EC%84%B1%EA%B3%BC-%EB%B0%B0%EA%B2%BD%EC%9D%8C%EC%95%85-%EB%B6%84%EB%A6%AC/7513462048473253905); [Perso.ai](https://perso.ai/audio-separation).

### Candidate longlist (22 jobs)
Legend: Evidence = strength of sourced evidence in this file (Strong / Some / None-hypothesis). Wow = visibly shareable before/after. Money = helps earn or saves paid time. All "who/population" figures marked [ESTIMATE] are unsourced guesses unless a link is given.

1. Fix echoey/noisy phone-video voice (vlogs, small-biz promos). Who: casual creators and SMB owners, very large [ESTIMATE]. Evidence: Some (Adobe forum complaints about incumbents). Today: Adobe Enhance Speech (free web / Creative Cloud), Descript Studio Sound, CapCut, Samsung Audio Eraser (free on Galaxy). Wow: high (audio A/B). Money: saves time; low willingness to pay because free options exist [HYPOTHESIS].
2. Natural-sounding speech enhancement without robotic/muffled artifacts (the quality gap in #1). Evidence: Strong-ish (see Adobe threads). Wow: medium. Money: podcasters/editors who currently re-record or hire audio fixers [HYPOTHESIS].
3. Click-a-person, get that person's clean voice from noisy multi-person footage (candidate under consideration; see dedicated section below). Wow: very high. Evidence: Some (technical + competitor features); direct demand posts not found.
4. Remove or replace background music in my own or archived video (re-upload, Twitch VOD, YouTube claims). Evidence: Some (Twitch policy; many separator-tool pages). Today: UVR (free), LALAL.AI, Kapwing, CapCut, StemSplit. Wow: high. Money: protects monetization [HYPOTHESIS]. Note: prior repo study covers this in docs/market-studies/music-audio.md.
5. Twitch/streamer VOD cleanup: unmute DMCA-muted segments by regenerating or replacing music, plus remove dead air. Evidence: Some (Twitch docs). Who: streamers, a few million active monthly [ESTIMATE, unsourced]. Money: VOD/clip reuse for YouTube Shorts/TikTok.
6. Long-video to vertical shorts (clipping + reframe + captions). Evidence: Some (OpusClip reviews and billing complaints). Today: OpusClip, Submagic, CapCut. Gap: credit-based pricing and cancellation complaints. Money: strong (growth/ad revenue). Wow: medium. Caution: crowded.
7. Podcast multi-guest leveling/cleanup (loudness, crosstalk, bleed). Today: Auphonic (loudness), Descript, Adobe, Riverside. Evidence: Some (reviews). Money: saves hourly editor cost (Fiverr/Upwork) [HYPOTHESIS].
8. Dialogue clarity for event/wedding videographers (vows, speeches, wind, clipped lavs). Evidence: Some but old (DVinfo). Who: wedding/event videographers, tens of thousands in US [ESTIMATE]. Today: iZotope RX (pro, expensive), Audition, Fiverr cleanup. Money: direct (client deliverable, upsell). Wow: high.
9. Upscale and restore old family videos (VHS/camcorder/8mm digitized). Evidence: Some (Topaz pricing backlash; Astra praised). Today: Topaz, Aiarty/AVCLabs/UniFab lifetime tools, scanning services. Who: consumers, huge [ESTIMATE]. Wow: very high. Money: consumer one-off; per-video pricing fits.
10. Low-light/noisy phone video denoise and upscale. Evidence: Some (Topaz). Wow: high. Money: mixed.
11. Lecture/classroom/meeting recording cleanup (echo, distant mic). Evidence: weak (vendor guides). Who: educators, course creators, corporate trainers. Money: course sellers yes [HYPOTHESIS]. Wow: medium.
12. Livestream/VOD audio cleanup (game audio vs voice balance, mic noise). Evidence: None direct. HYPOTHESIS.
13. Voice isolation for dubbing/translation prep (separate voice from music/effects, keep stems). Evidence: Some (Perso.ai, ElevenLabs). Money: localization for creators. Crowded with vendors.
14. Fix audio sync/drift and dual-system audio auto-match (camera vs recorder). Evidence: None here; HYPOTHESIS. Who: videographers.
15. Remove wind noise / traffic noise from outdoor shots (travel, street content). Evidence: Some (old DVinfo wind threads). Wow: high.
16. Speaker-level stems from interviews (separate interviewer vs guest on single mic). Evidence: None direct. HYPOTHESIS; related to #3.
17. Auto-fix mismatched room tone/ambience for clips cut from different takes. HYPOTHESIS, no evidence.
18. Clean sports/event/club recordings where the target is a performer (concert phone clips: clear vocals, tame distortion). HYPOTHESIS; wow potential high.
19. Hearing-friendly "dialogue boost" for TV/film/consumer video (personal-use accessibility). HYPOTHESIS; vendors exist (e.g., Samsung Voice focus on S26, below).
20. Ad-free, privacy-safe cleanup of recorded calls/interviews (journalists, researchers). Evidence: None here; HYPOTHESIS. Transcript is adjacent only.
21. Batch audio normalization/mastering for YouTube channels (loudness targets, de-ess, de-click). Today: Auphonic, iZotope. Evidence: Some (Auphonic positioning). Low wow.
22. Real-time stream noise suppression (NVIDIA Broadcast, Krisp). Out of scope for file-based SaaS; listed for completeness [HYPOTHESIS].

### Inferences
- Jobs 1-2 are real but the incumbent is free (Adobe web, Samsung Audio Eraser), so willingness to pay depends on a visible quality gap, specifically "no robotic voice" - an inference from Adobe forum complaints.
- Jobs 8, 9, 5 combine strong wow with identifiable payers (videographers, consumers, streamers). That is my judgement, not measured.
- Pricing backlash (Topaz, Descript, OpusClip credits) suggests an opening for transparent per-job pricing; only vendor/blog evidence supports this.

### Gaps
- No direct 2024-2026 threads from r/videography, r/podcasting, r/youtubers, r/NewTubers, r/editors, r/Twitch, r/weddingvideography, r/audioengineering were retrieved (search tool returned mirrors or none). Needs manual or Reddit-API pass; counts and rankings of problem frequency are unavailable.
- No Google Trends or search-volume data retrieved.
- No Descript, Riverside, Adobe, Linktree or Kajabi creator-survey numbers found for editing pain points.
- Population estimates in the list are unsourced estimates except Korea figures below.

## Which of these problems already have paid tools, and what do users complain about? Where are the gaps?

### Takeaway
Paid and free tools exist for most of the listed jobs. Documented complaints cluster on artifacts (robotic/muffled), subscription conversion and credit-metering, and tool quality varying by build (web vs in-app). Gaps: dense-crowd single-speaker extraction and low-cost old-footage restoration without a heavy subscription.

### Cited Findings
- Adobe Enhance Speech: robotic/muffled, clipped endings, worse in Premiere than web, suggested remedy is the strength slider [ANECDOTE] - [Adobe thread](https://community.adobe.com/t5/adobe-podcast-discussions/is-enhance-speech-really-that-bad/m-p/15148784/highlight/true); [Premiere thread](https://community.adobe.com/t5/premiere-pro-discussions/enhance-speech-has-somehow-gotten-worse-samples-attached/m-p/14993347).
- Descript: Sept 2025 pricing change; learning curve; limits [VENDOR/blog] - [CheckThat](https://checkthat.ai/brands/descript/reviews); competitor Riverside says the same [VENDOR] - [Riverside](https://riverside.com/blog/descript-alternatives).
- Topaz Video AI: subscription-only, price, performance/stability, color shift, learning curve [VENDOR/blog] - [MyArchitectAI](https://www.myarchitectai.com/blog/topaz-ai-pricing). Lifetime-license competitors priced $45-$350 per a roundup [VENDOR] - [Krea blog](https://www.krea.ai/blog/is-topaz-ai-free-pricing-system-requirements-and-alternatives-in-2026).
- OpusClip: credits lost on failures, cancellation, watermarks [VENDOR/blog] - [Ssemble](https://ssemble.com/blog/opus-clip-review-2026).
- Auphonic is positioned on loudness/mastering rather than noisy-speech repair [VENDOR/blog] - [Pro-tools-expert/Production Expert](https://www.production-expert.com/production-expert-1/adobe-podcast-enhance-is-it-any-good).
- Samsung Galaxy Audio Eraser (Galaxy S24+ with One UI 7 per Samsung support; S26 adds real-time "Voice focus", April 2026) separates voices, music, wind, crowd, noise with sliders; Samsung account needed; results vary [FACT/VENDOR] - [Samsung S26 announcement](https://news.samsung.com/global/faster-real-time-enhanced-audio-eraser-with-the-galaxy-s26-series); [Samsung support](https://ushl.samsung.com/sa_en/support/mobile-devices/how-to-remove-unwanted-sound-from-videos-using-audio-eraser-on-your-galaxy). This is a free, built-in competitor for Korea's dominant Android brand.
- Adobe community: a question about removing a louder voice from a video appears unanswered [ANECDOTE] - [Adobe thread](https://community.adobe.com/questions-544/removing-a-louder-voice-from-a-video-164042).

### Inferences
- Samsung's built-in Audio Eraser lowers the value of generic "denoise/split by sound type" in Korea (Samsung share of Korean smartphones is high; not sourced here). Differentiation must be per-person selection, older footage, and non-Samsung devices.
- Free first-party tools (Adobe, Samsung, Apple) set a price anchor near zero for jobs 1, 2 and 4; paid wedge likely in pro-ish deliverables (#8, #9).

### Gaps
- No Trustpilot/App Store rating data pulled for LALAL.AI, Kapwing, CapCut, iZotope RX.
- No price table verified against vendor pricing pages (prices above are from third-party blogs).

## Which jobs have large populations reachable online (SEO, app stores, communities)? Korea vs US?

### Takeaway
Reach is plausible for broad jobs (#1, #4, #6, #9) via SEO, since many tool vendors already run "remove music from video"/"voice isolator" landing pages (evidence of search demand, not a volume). Korea's registered creator base is sizable and growing but small relative to hobbyists.

### Cited Findings
- Korea: tax-registered one-person-media creators grew from 9,449 (2020) to 34,806 (2024); 2024 combined declared income about KRW 2.47 trillion; average about KRW 24.63M per person [FACT via secondary reporting of National Tax Service data] - [TechStory](https://techstory.in/average-south-korean-youtuber-income-hits-new-peak-amid-stark-inequality/). In 2022: 39,366 registered, KRW 1.14 trillion, top 1% about 30% of revenue [FACT via press] - [Korea Times, 2024-02-08](https://www.koreatimes.co.kr/amp/business/banking-finance/20240208/top-1-of-korean-youtubers-dominate-30-of-total-revenues). The two articles differ in headcount framing (2022 vs 2024 totals); I did not reconcile them.
- YouTube-commissioned Oxford Economics report: Korean creators contribute about $2.3B to the Korean economy [VENDOR, commissioned] - [Korea Times, 2026-06-11](https://www.koreatimes.co.kr/business/companies/20260611/youtube-creators-pump-23-bil-into-korean-economy-report-says).
- Many tool vendors localize landing pages in Korean (CapCut KR, Kapwing KR, StemSplit KR, Perso.ai KR) [VENDOR] - links above, which suggests perceived Korean search demand but is not volume data.
- Korean Android dominance: Samsung is the main Android brand and ships Audio Eraser (see prior section). I did not verify Korea market-share numbers.

### Inferences
- Only about 35k registered Korean creators means a creator-only Korean market is small; consumer (family video, event clips) and SMB jobs probably matter more. This is an inference.
- Korean videographers/wedding makers (Kmong, Soomgo freelance markets) are likely buyers, but no Kmong pricing was found (see Gaps).

### Gaps
- No Korean community (Clien, DC Inside video-editing gallery, Naver Cafe for YouTubers/editing) threads retrieved; searches returned only vendor pages. Differences from US in terms of tool preference (e.g., Vrew, CapCut, Premiere, Final Cut usage) not verified. Vrew in particular is a Korean AI subtitle/edit tool I did not research.
- No Kmong/Soomgo editing or audio-cleanup prices.
- No app-store ranking or download data.
- No Google Trends data.

## "Click a person in a video, get that person's clean voice": evidence of demand, existing solutions, Android/older-footage gap

### Takeaway
The technology is well established in research and Apple ships a related feature (In-Frame) restricted to iPhone 16-series spatial-audio clips; Samsung offers sound-type separation, not per-person. I found no direct user threads demanding per-person extraction, so demand is plausible but unmeasured.

### Cited Findings
- Google Research published audio-visual speech separation ("Looking to Listen at the Cocktail Party") where the user specifies the face of the person to isolate; it targets interviews and debates [FACT, research] - [Google Research](https://research.google/pubs/looking-to-listen-at-the-cocktail-party-audio-visual-speech-separation/).
- Apple Audio Mix on iPhone 16 / 16e offers Standard, In-Frame, Studio, Cinematic; In-Frame emphasizes voices of people visible and reduces off-screen sounds [FACT, secondary reporting] - [MacRumors how-to](https://www.macrumors.com/how-to/iphone-16-edit-spatial-audio-in-video-audio-mix); [MacRumors forum](https://forums.macrumors.com/threads/iphone-16-edit-spatial-audio-in-videos-with-audio-mix.2438780).
- Requirements/limits: video must be recorded with Spatial Audio (default on iPhone 16); reported not to work with external mics, and native-camera-app focus; a developer reported ProRes spatial captures not eligible [ANECDOTE/secondary] - [Apple developer forum](https://developer.apple.com/forums/thread/835263); user bug reports [ANECDOTE] - [Apple discussions](https://discussions.apple.com/thread/255769121?page=2). iOS 26 opens an Audio Mix API to third-party apps (June 2025) [FACT] - [MacRumors 2025-06-21](https://www.macrumors.com/2025/06/21/ios-26-audio-mix-beyond-photos-app/). I did not find an official Apple page listing In-Frame limitations.
- Samsung Audio Eraser separates by sound type (voice, music, wind, crowd, noise) and S26 adds "Voice focus" (April 2026); no source says it picks a specific person [FACT/VENDOR] - [Samsung](https://news.samsung.com/global/faster-real-time-enhanced-audio-eraser-with-the-galaxy-s26-series).
- Generic web voice-isolator tools (ElevenLabs, Notevibes, Woz, etc.) target noise and music removal, not per-person selection [VENDOR] - [Notevibes](https://notevibes.com/voice-isolator); [Refine docs](https://refineai.pages.dev/docs/examples/voice-isolation).
- Reddit tips on isolating a voice recommended Demucs and stacking denoise plugins (via search summary of mirror pages, not verified at source) [ANECDOTE] - [mirror](https://reddit.sentinel-team.org/posts/1skza26/snapshots/2026-04-15T02%3A00%3A09.567899Z).
- Wedding and event videographers historically cope with unusable vows by re-recording or hiring cleanup [ANECDOTE, 2004-2016 threads] - [DVinfo](https://www.dvinfo.net/forum/wedding-event-videography-techniques/532762-cleaning-up-audio.html).

### Inferences
- Gap for Android and non-iPhone-16 footage (including all pre-2024 footage, DSLR/mirrorless, and GoPro) is real in the sense that Apple's feature needs spatial-audio capture; no verified consumer product found that does click-a-person on arbitrary video. Not exhaustively searched (only 3 queries), so "none exists" is not proven.
- Likely buyers: wedding/event videographers, interviewers, journalists, street-interview/vlog creators, parents with school-event footage, classroom recordings. Hypothesis, not sourced demand.
- Failure risk: dense crowd with overlapping speech (Adobe community post unanswered) and artifacts at heavy separation; quality varies with SNR.

### Gaps
- No direct user threads requesting per-person extraction (search returned research papers and vendor pages).
- No verified check of newer competitor products (e.g., startups or CapCut/Descript features) after mid-2026 for per-person selection; a dedicated tool check is needed before building (the repo already has a prior "existing-tool check" in the music-audio study per git log).
- No testing of Apple In-Frame quality or comparative audio samples.
- No Android-user complaint threads found.
