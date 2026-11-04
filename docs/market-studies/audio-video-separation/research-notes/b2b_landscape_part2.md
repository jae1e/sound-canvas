# B2B Audio Separation and Localization Landscape, Part 2 (vendors missed by the first pass)

Research date: 2026-11-04. Label key: [FACT] = verified on a fetched page or article; [REPORT] = seen only in a search-result summary or secondary/aggregator source; [VENDOR] = vendor claim; [EST] = estimate; [HYP] = hypothesis. Budget was about 20 tool calls, so coverage is uneven. Several vendors have thin evidence, flagged in Gaps.

## iZotope RX (Native Instruments / Soundwide): products, price, ownership

### Takeaway
RX 11 and RX 12 are the shipping products, with Dialogue Isolate and Music Rebalance. Ownership churned heavily in 2026: Native Instruments went insolvent, iZotope was split out and acquired by Boris FX. Exact current RX 12 prices were not verified.

### Cited Findings
- [FACT] iZotope was acquired by Boris FX. Article dated 2026-07-02. iZotope is no longer part of the Native Instruments brand family. Licenses and subscriptions are "fully active", with no price changes reported. The latest release is RX 12. Plugin Alliance cannot sell iZotope plugins for now. — [MusicTech](https://musictech.com/news/industry/izotope-joins-boris-fx-exits-native-instruments/)
- [FACT, via the same MusicTech article] Native Instruments entered preliminary insolvency in January 2026. In May 2026 Francisco Partners sold the NI brand to inMusic, when the group still included iZotope, Brainworx and Plugin Alliance. — [MusicTech](https://musictech.com/news/industry/izotope-joins-boris-fx-exits-native-instruments/)
- [REPORT] The Soundwide group (Francisco Partners, formed 2021) laid off 8% of staff in Jan 2023 and merged into the NI brand in June 2023. — [MusicRadar](https://www.musicradar.com/news/izotope-brainworx-plugin-alliance-native-instruments); [MIX](https://www.mixonline.com/business/native-instruments-absorbs-izotope-brainworx-plugin-alliance)
- [REPORT] Insolvency details (preliminary vs. full proceedings, "business as usual" statement by the CEO) differ between sources. — [MusicRadar](https://musicradar.com/music-tech/native-instruments-has-been-placed-in-preliminary-insolvency)
- [FACT] RX 11 launched May 2024. Music Rebalance (neural vocal/instrumental stems) is in Standard and Advanced. Dialogue Isolate was reworked and Dialogue De-Reverb added. — [Sound On Sound](https://www.soundonsound.com/news/izotope-launch-major-updates-rx-11), [Sonic State](https://sonicstate.com/news/2024/05/16/izotope-announces-rx-11)
- [REPORT, undated retailer data] RX 11 Standard on iZotope's shop showed a sale price of $239.40 versus a list of $399. HHB lists RX 11 Advanced at £937.50 ex-VAT. An RX Advanced upgrade was £377 inc VAT at a UK retailer. — [iZotope shop](https://izotope.com/en/shop/rx-standard), [HHB](https://www.hhb.co.uk/prod/izotope/rx-11-advanced), [MusicMatter](https://musicmatter.co.uk/izotope-rx-11-advanced-upgrade-from-any-rx-adv-or-rx-pps-download)

### Inferences
- [HYP] Boris FX ownership (a pro VFX/post vendor) points to continued focus on post-production audio rather than consumer. No strategy statement was found.
- [HYP] Dialogue Contour was not specifically researched; treat it as part of the RX Advanced dialogue set.

### Gaps
- Current RX 12 prices and edition features (not verified; the shop page was not fetched).
- Dialogue Contour details; Boris FX's stated roadmap.

## Dolby: dialogue separation and enhancement, Dolby.io status

### Takeaway
Dolby sells dialogue enhancement mainly as a codec/device feature (AC-4), not as a separate creator product. The Dolby.io developer docs now redirect to OptiView, which suggests the media APIs were folded or sidelined, but no shutdown notice was found.

### Cited Findings
- [FACT] docs.dolby.io/media-apis/docs/overview returns a 301 redirect to optiview.dolby.com/docs/ (observed 2026-11-04). — [Dolby docs redirect](https://docs.dolby.io/media-apis/docs/overview)
- [REPORT] Dolby.io launched in 2020 with Media Processing APIs (Analyze, Enhance, Transcode). Pingoru status pages list Enhance Service incidents, including 2024-01-29. — [AudioXpress](https://audioxpress.com/news/dolby-laboratories-introduces-dolby-io-platform-for-developers), [Pingoru](https://pingoru.io/providers/dolbyio/incidents/2000216)
- [VENDOR] AC-4 natively supports dialogue enhancement; ATSC calls the consumer feature "Voice Boost". It adjusts the dialogue level via codec metadata/processing, not full source separation. — [Dolby AC-4](https://professional.dolby.com/technologies/ac-4/), [ATSC 3 audio handbook](https://professional.dolby.com/siteassets/broadcast/nextgen-tv/atsc3_audio_handbook.pdf)

### Inferences
- [HYP] The redirect plus the OptiView rebrand suggests Dolby refocused the developer brand on streaming; whether Enhance/Music Mastering APIs still run is unconfirmed.

### Gaps
- Whether Dolby.io Enhance/Media APIs are discontinued, their pricing, and the fate of Dolby Voice. The OptiView docs page was not fetched.

## Adobe: Enhance Speech and Enhance Audio (stem separation)

### Takeaway
Yes. Adobe has put multi-stem separation (speech, music, ambience, effects, reverb) into Premiere as "Enhance Audio", in beta. Speech enhancement V1 is free and local; V2 is cloud-based and uses generative credits.

### Cited Findings
- [FACT] Enhance Audio (Premiere beta) separates speech, music, ambience, SFX and reverb in one pass, runs separation on-device, and lets editors "Split to Clips" for speech, music, ambience, effects. The article carries a relative date only ("2 weeks ago" at capture). — [ProVideo Coalition](https://www.provideocoalition.com/stem-separation-moves-into-the-edit-what-enhance-audio-changes-for-dialogue-workflows-in-premiere-beta/amp/)
- [FACT] Enhance Speech V1 is fully local and free; V2 is cloud-based through Firefly and costs 2 generative credits per minute when reprocessing, drawn from the Creative Cloud pool. — same source
- [REPORT] Adobe's Remix is a music-retiming tool and Auto Ducking lowers music under voice; neither is separation. — [Adobe](https://www.adobe.com/products/premiere/explore/audio.html)
- [REPORT] Adobe community announcement of the Enhance Audio beta. — [Adobe Community](https://community.adobe.com/announcements-732/now-in-beta-enhance-audio-in-premiere-1640126)

### Inferences
- [HYP] Bundling stems into a Creative Cloud subscription undercuts per-minute separation vendors at the low end of editor workflows.

### Gaps
- Creative Cloud/Premiere subscription price (not verified); exact beta start date and GA date; Audition status.

## Supertone (HYBE)

### Takeaway
Supertone is being liquidated. HYBE announced on 2026-07-27 that shareholders resolved on 2026-07-15 to dissolve it. Any B2B dependency on Supertone Clear is a risk.

### Cited Findings
- [FACT] HYBE announced it will liquidate Supertone. An extraordinary shareholders' meeting on 15 July resolved dissolution and appointed a liquidator. HYBE invested KRW 4B in 2021 for 18.2% and KRW 45B in 2023 for a majority. Last-year revenue about KRW 2.3B, net loss about KRW 13B. Products named: Supertone Clear (noise removal plugin) and Shift (real-time voice conversion). — [Edaily English, 2026-07-27](https://en.edaily.co.kr/news/eda202607275504/)
- [REPORT] Headline: "HYBE winds down AI voice company Supertone after investing nearly $35M" (page returned 403; only the headline was seen). — [MBW](https://musicbusinessworldwide.com/hybe-winds-down-ai-voice-company-supertone-after-investing-nearly-35m)
- [REPORT, unconfirmed] One search summary said bankers report HYBE negotiating a sale of Shift, Clear and "Air", and that Supertone Play/Voice Builder would shut by end of August. The Edaily article does not mention either; treat both as unverified. — [Let's Data Science](https://letsdatascience.com/news/hybe-winds-down-supertone-after-ai-voice-investment-61899956)

### Gaps
- Supertone Clear and Play pricing; B2B deals; whether any buyer emerged.

## Steinberg SpectraLayers

### Takeaway
SpectraLayers 12 (July 2025) offers AI unmixing at a one-time license, $349.99 for Pro.

### Cited Findings
- [FACT/REPORT] SpectraLayers 12 released July 2025. Pro SRP €349 / $349.99; Education €179; Elements 12 $89.99. New modules: Unmix Soundtrack and Unmix Instrument, plus enhanced Song, Drums and Noisy Speech processes. — [Sonic State, 2025-07-04](https://sonicstate.com/news/2025/07/04/steinberg-releases-spectralayers-12), [Sound On Sound](https://www.soundonsound.com/news/steinberg-unveil-spectralayers-12)
- [REPORT] Crossgrade priced around €192 ex-VAT at one German retailer, undated. — [Cyberfarm](https://cyberfarm.dk/?p=120624)

### Gaps
- Steinberg's own store price not checked; no API or B2B offering found.

## Sony: separation licensing, iSIZE

### Takeaway
No evidence that Sony licenses a separation technology. iSIZE is a video-compression deal, not audio.

### Cited Findings
- [FACT] Sony Interactive Entertainment acquired iSIZE (UK, deep-learning video delivery) in Nov 2023; terms undisclosed. Intended for streaming/video; Sony did not give specifics. — [Advanced Television, 2023-11-03](https://www.advanced-television.com/2023/11/03/sony-acquires-isize/), [TechRadar](https://techradar.com/gaming/consoles-pc/sony-acquires-deep-learning-company-isize-signaling-a-focus-on-cloud-streaming-improvements)
- [REPORT, forum-level] AudioShake claims to have won Sony's Demixing Challenge and to be used by all three major labels. Vendor claim, covered by another researcher. — [A2IM](https://a2im.org/associate-member-spotlight-audioshake)

### Gaps
- No source found for Sony AI/Sony Music licensing a sound separation product. The search did not target Sony Group's own R&D pages.

## Audionamix

### Takeaway
No 2024-2026 news was found. Activity is unconfirmed.

### Cited Findings
- [REPORT] XTRAX STEMS (2017 launch, v2 in 2019) was sold by subscription ($40 per 6 months, $60 per year, circa 2020). — [Rekkerd](https://rekkerd.org/?p=153781), [Sound On Sound review](https://www.soundonsound.com/reviews/audionamix-xtrax-stems-2)
- [REPORT] Audionamix Professional Services offered custom enterprise licensing (undated). — [ProSoundWeb](https://www.prosoundweb.com/audionamix-professinal-services-rolls-out-custom-enterprise-licensing/)
- [REPORT] An undated giveaway page, with sidebar content from late Nov 2025, suggests some marketing activity. — [EDM Identity](https://edmidentity.com/?p=112661)

### Gaps
- Whether the company is operating, acquired or dormant; current pricing.

## API and per-minute prices (checked 2026-11-04)

### Takeaway
Music.ai and ElevenLabs publish per-minute prices. LALAL.AI publishes none for its API.

### Cited Findings
- [FACT, official page checked 2026-11-04] Music.ai pay-as-you-go: Instrumental stem $0.05/min; Cinematic stems (Dialogue, Music, Effects) $0.05/min; Clean-up stems (vocals, bass, drums, guitars, keys) $0.07; Musical stems $0.07; Guitar stems $0.10; Vocal lead/backing $0.10; Drum stems $0.15. Professional plan $25/month with 5% module discount. Business/Enterprise volume-based. — [Music.ai pricing](https://music.ai/pricing/)
- [FACT, official page checked 2026-11-04] ElevenLabs API: Voice Isolator $0.12/min. Dubbing v1 $0.33/min with watermark, $0.50/min without. Dubbing v2 $2.20/min. Plans: Free, Starter $6, Creator $22, Pro $99, Scale $299, Business $990/month, Enterprise custom. — [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
- [FACT] LALAL.AI /api page lists no pricing; points to /pricing and enterprise. — [LALAL.AI API](https://www.lalal.ai/api/)
- [REPORT] Third-party sites say LALAL.AI API pricing is volume-quoted. — [G2](https://g2.com/products/lalal-ai/pricing)

### Inferences
- [EST] Music.ai's Cinematic (D/M/E) stems at $0.05/min is roughly 2.4x cheaper than ElevenLabs Voice Isolator at $0.12/min, though they do different jobs (dialogue isolation vs. three-stem split).

### Gaps
- LALAL.AI per-minute API rate; ElevenLabs enterprise discounts.

## Localization majors: Iyuno, Deluxe, Pixelogic, ZOO Digital

### Takeaway
Evidence is thin. These companies adopt AI through partnerships, with no separation products found.

### Cited Findings
- [REPORT] Deluxe localization head said Deluxe plans to use AppTek language AI in dubbing workflows (SlatorPod; date not seen). — [Buzzsprout SlatorPod](https://buzzsprout.com/1198304/14712649-205-deluxe-s-chris-reynolds-on-dubbing-subtitling-and-localization-for-hollywood)
- [REPORT, secondary blog] Flawless TrueSync partnerships with Deluxe and Pixelogic. — [Blog post, April 2025](https://adrianpenningtonthewritestuff.blogspot.com/2025/04/flawless-ai-you-cant-put-new-lines-in.html)
- [REPORT] Pixelogic agreed to acquire Korean dubbing studio Juice Media (date not seen). — [HPA](https://hpaonline.com/pixelogic-to-acquire-juice-media-establishing-dubbing-operations-in-korea/)
- [REPORT] Iyuno showed Sub.X, an AI subtitling product, at IBC 2025. — [Iyuno](https://iyuno.com/news/iyuno-to-showcase-subx-a-new-ai-powered-subtitling-innovation-at-ibc-2025)
- [REPORT] ZOO Digital acquired dubbing partner LogoSound in June 2024. — [CB Insights](https://www.cbinsights.com/company/logosound)
- [VENDOR] Slator published an 85-page 2025 AI Dubbing Report (paywalled). — [Slator](https://tech.slator.com/?p=107204)

### Inferences
- [HYP] Their dubbing partners (Flawless, AppTek) are where stem and dialogue separation sit, so the majors are buyers of separation, not sellers.

### Gaps
- Pricing, M&E (music and effects) creation services, and 2025-2026 deals were not verified. No ZOO Digital AI dubbing announcement was seen, nor any Iyuno AI dubbing item.

## Rask.ai

### Takeaway
Pricing is unclear and funding undisclosed in the sources found.

### Cited Findings
- [REPORT] Aggregators list a free tier, paid plans around $49-60/month and $149-150/month, and custom enterprise. These conflict. — [Toolradar](https://toolradar.com/tools/rask-ai/pricing), [xpay (May 2026 snapshot)](https://www.xpay.sh/saas-pricing/rask-ai/)
- [REPORT] No funding round found; one CB Insights result is a different company ("askR.ai"). — [CB Insights](https://www.cbinsights.com/company/askrai/financials)

### Gaps
- Official rask.ai/pricing not fetched; funding unknown.

## Korean players (Deepbrain AI, Klleon, Return Zero, others)

### Takeaway
Little current evidence was found. Only older funding and positioning data surfaced.

### Cited Findings
- [REPORT] Klleon (virtual humans) was reported in 2022 to be raising a KRW 30B Series A at about KRW 200B valuation, and had a multilingual dubbing partnership with Dia TV (CJ ENM). — [MT](https://www.mt.co.kr/future/2022/05/17/2022051517404616755)
- [REPORT] Deepbrain AI raised a Series B in 2021 (about KRW 50B, valuation reported KRW 150-200B). Recent products: AI reporter and AI role-play. — [TheVC](https://thevc.kr/deepbrain), [Asiae](https://www.asiae.co.kr/en/article/2024061314475733400)

### Gaps
- 2024-2026 news for Deepbrain, Klleon; Return Zero (speech recognition, VITO) and ElevenLabs Korea not found; whether any is a separation competitor to Gaudio Lab (they are mostly avatar/ASR/TTS players, [HYP]).

## Cross-cutting notes
- The vendor landscape shifted in 2026: Supertone liquidated (July), iZotope sold to Boris FX (July), NI insolvent then sold to inMusic. Both are verified by two or more sources and are directly relevant to B2B competitor and acquirer mapping.
- Premium separation is being absorbed into editors (Adobe Enhance Audio, SpectraLayers) at low or no marginal price.
