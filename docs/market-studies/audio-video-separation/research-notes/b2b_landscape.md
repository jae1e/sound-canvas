# B2B landscape: AI audio source separation and AI dubbing/localization (research date 2026-11-04)

Coverage note: this pass used about 17 search/fetch calls. Several vendors (Audionamix, iZotope, Dolby, Adobe, Sony, Steinberg, Supertone, Gaudio, Iyuno/Deluxe, Netflix, Rask, CAMB.AI recent rounds) were not researched in depth and are listed under Gaps. Label key: [VF] verified fact (primary or press source), [VC] vendor claim, [EST] third-party estimate, [HYP] hypothesis. Search-engine summaries were cross-checked only where a primary page was fetched (marked "fetched").

## Separation and stem vendors

### Takeaway
AudioShake is the best-documented B2B separation vendor (Series A $14M, Oct 2025, 40+ enterprise partners, ~400% YoY revenue growth claimed). Music.AI (Moises) is the best-funded ($40M Series A) but mostly consumer-subscription revenue. API per-minute prices for AudioShake, Music.AI and LALAL.AI were not published in anything found; ElevenLabs is the only vendor with a public per-minute rate (Voice Isolator).

### Cited Findings
- AudioShake raised a $14M Series A announced 2025-10-01, led by Shine Capital with Thomson Reuters Ventures, Origin Ventures, Background Capital; returning Indicator Ventures and Precursor Ventures [VF, fetched company post] — [AudioShake](https://www.audioshake.ai/post/series-a-round-raise-14-million-shinecapital-origin-thomson-reuters)
- AudioShake says it has 40+ enterprise partners; named: Disney Music Group, Warner Music Group, Universal Music, NFL Films, Warner Bros Discovery; unnamed "Mag 7" tech companies [VC] — same source
- AudioShake claims "nearly 400% year-over-year revenue growth" and 100M+ minutes of audio processed in the past year (no absolute revenue disclosed) [VC] — same source
- AudioShake use cases named: instrumentals for sync licensing, immersive mixes, lyric transcription; removing unlicensed music from archival footage for NFL Films/sports (copyright-fine avoidance); clean audio/datasets for voice-AI and model training [VC] — same source
- AudioShake pricing: no rates on the fetched page; Studio "free to start", REST API and developer platform offered without public rates [VF that rates are unpublished there, checked 2026-11-04] — same source
- Earlier AudioShake seed: $2.7M, backers include Indicator Ventures, Crush Music, peermusic, Metallica-backed Black Squirrel [VF, press] — [MBW](https://musicbusinessworldwide.com/ai-music-startup-audioshake-raises-2-7m-in-seed-round-with-backing-crush-music-and-peermusic)
- Aggregator totals for AudioShake conflict (CB Insights ~$18.71M; VCBacked $14.0M) [EST, aggregators] — [CB Insights](https://www.cbinsights.com/company/audioshake/financials)
- AudioShake 2026 integrations: Caplight lists AI-Media and ESPN integrations dated 2026-03-15 [aggregator, unverified]; a Telos Alliance "Minnetonka AudioTools Server" adds AudioShake separation, dated 2026-07-14 per a search result snippet [unverified, snippet only] — [Caplight](https://www.caplight.com/company/audioshake)
- Music AI (Moises' parent; B2B Music.ai plus consumer Moises app) raised a $40M Series A, led by Connect Ventures and monashees, total about $50M; Moises reported at 50M users [VF for round per MBW headline; details from search summary] — [MBW](https://musicbusinessworldwide.com/music-ai-raises-40m-in-series-a-round-as-its-moises-platform-hits-50m-users). Page returned HTTP 403 on fetch, so the exact date is not confirmed here; prior rounds: $1.6M seed 2021, $8.65M Aug 2022 ([Moises](https://moises.ai/newsroom/company-milestones/moises-raises-8-65-million))
- A Portuguese-language report says subscriptions are over 90% of Music AI revenue [EST, single secondary source, not fetched] — [Bloomberg Linea](https://www.bloomberglinea.com.br/startups/dona-do-moises-musicai-capta-us-40-milhoes-para-levar-ia-generativa-a-musicos/)
- Music.AI partnered with SourceAudio to offer stem separation to 567,000 users [VF headline, date unconfirmed] — [MBW](https://www.musicbusinessworldwide.com/music-ai-partners-with-sourceaudio-to-offer-stem-separation-technology-to-567000-users/)
- LALAL.AI: no official API per-minute rate found; API access is reportedly in higher/volume tiers and quoted by volume; consumer plans reported variously from $7.26 to $15/month [unverified third-party] — [LALAL.AI pricing](https://lalal.ai/pricing), [G2](https://g2.com/products/lalal-ai/pricing)
- ElevenLabs API: Voice Isolator listed at $0.12/min on the official API pricing page per search summary (one third-party guide says $0.0968/min); Dubbing v1 reported $0.33/min with watermark, $0.50 without; one guide lists Dubbing v2 at $2.20 per source minute [pricing as seen via search 2026-11-04; verify on page] — [ElevenLabs API pricing](https://elevenlabs.io/pricing/api), [guide](https://developer.puter.com/tutorials/elevenlabs-api-pricing/)
- ElevenLabs funding: Series D at about $11B valuation, Feb 2026 ($500M reported), ARR about $330M end-2025 (company) and about $500M by Apr 2026 (Sacra estimate); one single-source claim of $22B valuation in Sep 2026 is unconfirmed [mixed] — [Sacra](https://sacra.com/c/elevenlabs/), [Parsers](https://parsers.vc/news/260208-elevenlabs-secures-500m--reaches-11b/)
- Audionamix: PitchBook lists an M&A entry dated 2023-03-24 with status "Out of Business" [ambiguous, snippet only] — [PitchBook](https://pitchbook.com/profiles/company/55605-61)
- Consolidation: Syntiant acquired AudioSourceRE (Cork sound-separation company, DeMIX) along with Orosound; date not found — [audioXpress](https://audioxpress.com/tags/advanced-anc)
- Beatles "Now and Then": Peter Jackson's MAL ML system, built for "Get Back", isolated Lennon's vocal from a demo; nominated for a Grammy [VF] — [MusicRadar](https://www.musicradar.com/news/ai-stem-separation-now-and-then)

### Inferences
- [HYP] Public API price lists are rare; enterprise separation is sold on negotiated contracts, so ElevenLabs' $0.12/min is a useful public ceiling/benchmark for voice isolation.
- [HYP] The 400% growth claim comes off a small base; with a $14M round and 40+ partners, AudioShake revenue is plausibly in the low-single-digit $M range, but no source states it.

### Gaps
- Not researched: iZotope RX (NI/Soundwide), Dolby, Adobe Enhance Speech, Sony, Steinberg SpectraLayers, Supertone, Gaudio Lab, 2025-2026 new entrants, and Audionamix current status beyond the PitchBook snippet.
- No published AudioShake or Music.AI API per-minute pricing found.
- Music.AI "acquisitions" (asked about) not found.

## AI dubbing and localization vendors

### Takeaway
Papercup did not simply shut down: RWS bought its dubbing IP on 2025-06-26 after much of the team left for Scale AI. Deepdub and CAMB.AI show only old/small disclosed rounds; ElevenLabs, Synthesia and HeyGen dominate by scale. Platform dubbing (YouTube, Meta) is free to creators, pressuring pure-play pricing.

### Cited Findings
- RWS acquired Papercup's IP (not the company) announced 2025-06-26; terms undisclosed; to be integrated with Language Weaver and Trados [VF] — [RWS](https://www.rws.com/about/news/2025/rws-acquires-papercups-ip); team departure to Scale AI reported by [UKTN](https://www.uktech.news/ai/rws-snaps-up-ip-behind-ai-translation-startup-papercup-20250626)
- Papercup earlier raised $20M Series A, 2022-06 [VF] — [Slator/UKTN](https://www.uktech.news/ai/papercup-funding-16m-20220610)
- Deepdub: $20M Series A led by Insight Partners, Feb 2022 [VF]; no later round found — [Calcalist](https://www.calcalistech.com/ctech/articles/0,7340,L-3929183,00.html). Partnerships: Duplitech (May 2025, 110+ classic episodes into Latin American Spanish) and Verbit (shown at IBC, Sep 2025) [press] — [Advanced Television](https://www.advanced-television.com/?p=264067), [TechIntelPro](https://techintelpro.com/news/ai/generative-ai/deepdub-verbit-launch-ai-dubbing-for-faster-localization)
- CAMB.AI: $4M seed, Feb 2024, led by Courtside Ventures [VF] — [Slator](https://tech.slator.com/?p=95277)
- Flawless (visual dubbing, TrueSync): Caplight lists $33.5M total, last round 2024-05-13; CB Insights disagrees [conflicting aggregators] — [Caplight](https://www.caplight.com/company/flawless)
- Synthesia: announced $100M+ ARR Apr 2025 [VC]; $200M Series E at $4B post-money, Jan 2026, led by GV [press]; Sacra estimates about $146M ARR end-2025 [EST] — [Sacra](https://sacra.com/c/synthesia)
- HeyGen: Sacra estimates about $95M ARR in Sep 2025 (up from about $57.5M end-2024); last cited valuation about $500M [EST] — [Sacra](https://sacra.com/research/heygen/)
- YouTube auto-dubbing expanded to all creators with 27 languages (reported Feb 2026), Expressive Speech in 8 languages, lip-sync testing [press] — [India TV](https://www.indiatvnews.com/technology/news/youtube-auto-dubbing-feature-expands-to-all-users-now-supports-27-languages-2026-02-05-1029070)
- Meta AI Reels translation launched Aug 2025 (English/Spanish), Hindi and Portuguese added; free for creators per Slator [press] — [Slator](https://tech.slator.com/?p=107728)

### Inferences
- [HYP] Pipelines that preserve music and effects (voice-cloned dubbing of film/TV) need dialogue/M&E separation; Deepdub, Flawless and ElevenLabs Dubbing do separation internally or via partners, but no source confirmed which vendor uses which separator. Creator-grade tools often just separate voice from background.
- [HYP] Free platform dubbing narrows the market for creator-focused startups (Rask, Papercup-style) and pushes pure plays toward enterprise/studio work.

### Gaps
- Rask.ai: no funding, revenue or pricing found. Iyuno, Deluxe, Netflix tooling: not researched. Whether each vendor needs M&E separation: unconfirmed. Pricing for Deepdub, CAMB.AI, HeyGen, Synthesia not captured.

## Market sizes

### Takeaway
Estimates vary by 25x depending on definition and come mostly from report mills; none is a reliable basis.

### Cited Findings
- AI dubbing tools market $1.16B in 2025 (from $0.98B in 2024), Business Research Company [EST, report-mill, low quality] — [MarketResearch](https://www.marketresearch.com/Business-Research-Company-v4006/Artificial-Intelligence-AI-Dubbing-Tools-40929379)
- AI video dubbing segment $45.3M (2025) to $397M (2032), 44.4% CAGR, Intel Market Research via an aggregator [EST, report-mill, low quality] — [Voxbooster](https://voxbooster.com/blog/ai-dubbing-statistics-2026)
- Dubbing/voice-over market $4.55B in 2025, Business Research Insights via aggregator [EST, report-mill, low quality] — [Vozo](https://www.vozo.ai/blogs/ai-dubbing-statistics)
- Language solutions and AI industry $30.85B in 2025, projected $36.10B by 2031 (Slator 2026 market report) [EST, specialist analyst, higher quality, but broad] — [Slator](https://slator.com/2026-market-report-language-solutions-ai/)
- Slator also sells a 2025 AI Dubbing Report (85 pages); figure not visible — [Slator](https://tech.slator.com/?p=107204)

### Inferences
- [HYP] The $45M vs $1.16B spread reflects definitions (video-only vs tools incl. TTS); treat $50M-$1B as a plausible range for AI dubbing software, with Slator-style figures preferred.

### Gaps
- Nothing found for audio post-production software or music stem-separation/remix market size.

## Adjacent use cases and trends

### Takeaway
Best evidence of willingness to pay: sports/archive music clearance (NFL Films), label catalog work (Disney, WMG, UMG with AudioShake), and AI-data suppliers. Stereo-to-Atmos catalog upmixing and sports crowd/commentary separation were not independently evidenced.

### Cited Findings
- AudioShake cites NFL Films and sports orgs removing unlicensed music from archival footage, and Disney Music Group for immersive mixes (see above) [VC] — [AudioShake](https://www.audioshake.ai/post/series-a-round-raise-14-million-shinecapital-origin-thomson-reuters)
- AI companies are buyers of clean audio and structured datasets [VC] — same source
- Stem separation is now embedded in mainstream tools (Logic Pro, FL Studio) [press] — [MusicRadar](https://www.musicradar.com/news/ai-stem-separation-now-and-then)
- 2024-2026 deals: RWS-Papercup IP (Jun 2025), AudioShake Series A (Oct 2025), Music AI $40M Series A, Synthesia $4B (Jan 2026), ElevenLabs $11B (Feb 2026), Syntiant-AudioSourceRE (date unknown)

### Inferences
- [HYP] Separation is being absorbed as a feature by platforms (DAWs, ElevenLabs, YouTube), so standalone vendors differentiate via quality, rights-safe workflows, and enterprise integrations.

### Gaps
- No sourced figures on Atmos remix catalog spend, music rights clearance spend, or sports crowd/commentary separation; no Music.AI acquisitions found.
