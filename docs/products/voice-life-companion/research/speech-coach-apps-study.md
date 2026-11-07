# Speech and Public-Speaking Coaching Apps: Feature Study

Research date: 2026-11-07 (all links accessed on this date unless noted).
Purpose: inform the feature design of the "speech coach" in Voice Life Companion. We are building an original app; this study covers features and UX patterns only, not branding or content.
Product context: [README](../README.md), [technical decisions](../technical-decisions.md), [speech cloud vs device](../speech-cloud-vs-device.md).

## 0. How to read this document

Labels used throughout:

- **[Verified]** read on a primary page (vendor docs, app store listing, paper) on the access date.
- **[Vendor]** a claim made by the vendor's own marketing.
- **[Secondary]** a third-party review, directory or aggregator. Prices and features from these often conflict; do not rely on them.
- **[Anecdote]** a user or reviewer opinion.
- **[Inference]** our own reasoning.

Research limits: no app was installed or used. Most pricing and feature data for smaller apps is [Secondary]. Many "best apps 2026" posts are written by competing vendors (Orai, Wellspoken, Oratori and others) and are treated as marketing.

## 1. Status of each requested app (verified 2026-11-07)

| App | Still exists? | Evidence |
|---|---|---|
| Orai | Yes | [orai.com](https://orai.com) lists live App Store, Google Play and web links [Verified]. No date or status notice on the page. |
| Yoodli | Yes, now enterprise-first | [Pricing page](https://yoodli.ai/pricing) [Verified]; 2026 press releases on Programs (March) and auto-generated learning content (June 9) [Secondary: press-release reposts, see section 3.2]. |
| Speeko | Yes | [App Store listing](https://apps.apple.com/us/app/-/id1071468459): version 5.4.3 dated Oct 26 [Verified; year not shown, treated as 2026 because it lists spring 2025 features as "earlier"]. |
| Poised | **Shutting down.** | [poised.com](https://www.poised.com) shows banner "Poised is shutting down on 10/8/2026" and promotes a successor, "Shortcut by Poised" [Verified]. Date format is ambiguous (8 Oct or 10 Aug); both are in the past, so treat as defunct. |
| Microsoft Speaker Coach | Yes (renamed from Presenter Coach) | [Microsoft support](https://support.microsoft.com/en-us/office/rehearse-your-slide-show-with-presenter-coach-cd7fc941-5c3b-498c-a225-83ef3f64f07b) [Verified]. |
| Google Interview Warmup | **Retired, reportedly April 2026** | [grow.google/interview-warmup](https://grow.google/interview-warmup) no longer mentions Warmup and points to Gemini Live interview simulation (page dated 2025-12-11) [Verified]. The April 2026 retirement date comes only from vendor blogs ([ResumeHog](https://resumehog.com/blog/posts/google-interview-warmup-is-gone-best-ai-prep-tools-for-june-2026.html), [AceRound](https://www.aceround.app/blog/google-interview-warmup-review/)) [Secondary]; no official Google notice found. |
| Google Search "Speaking practice" | Exists as Search Labs experiment for English learners (2024 launch); current status unverified | [9to5Google 2024](https://9to5google.com/2024/04/29/google-search-english-speaking-practice/), [Voicebot](https://voicebot.ai/?p=30278) [Secondary]. No official Google page retrieved. |
| VirtualSpeech | Yes | [virtualspeech.com/pricing](https://virtualspeech.com/pricing) exists; tier details not retrieved [Secondary for content]. |
| Ummo | **Discontinued** | [AlternativeTo](https://alternativeto.net/software/ummo/about) lists it as discontinued; a 2020 article said no longer in app stores [Secondary]. A "2026 comparison" page calling it current conflicts and is likely unreliable. |
| LikeSo | Probably legacy; status unverified | 2016-2019 press coverage; store listing mirrored at [mwm.ai](https://mwm.ai/apps/likeso/1074943747) [Secondary]. |
| ELSA Speak | Yes (per many 2026 reviews) | Only [Secondary] sources retrieved; no ELSA primary page fetched. |
| BoldVoice | Yes (per FAQ and listings) | [BoldVoice FAQ](https://boldvoice.com/frequently-asked-questions) appeared in search; content not fetched. [Secondary] for details. |

Takeaway [Inference]: of the "classic" consumer speech-coach apps, two are dead or dying (Ummo, Poised) and one free incumbent (Interview Warmup) was retired. Yoodli moved to enterprise. The consumer solo-practice niche is crowded with small new entrants but has a visible churn rate.

## 2. Per-app profiles

### 2.1 Orai (consumer, mobile)

- Practice flows: daily short scenarios (pitch, toast, "tough question"), a "60-second pitch" example, a personalised curriculum of lessons and courses. [Vendor: orai.com](https://orai.com), [Yoodli comparison, competitor-written](https://yoodli.ai/blog/orai-vs-speeko-what-to-know)
- Metrics: filler words, pace (example shown: 147 wpm), clarity score, energy rating, practice streak, weekly clarity change. Also conciseness, pausing, confidence and facial expressions per competitor/aggregator summaries. [Vendor] + [Secondary]
- Pace display: after the session, as a number on a scorecard. No documented live gauge or target band. Recommended WPM range not published on the pages read.
- Transcript: not described on the pages read. A user review on SourceForge calls transcription accuracy "consistently poor" [Anecdote, [SourceForge](https://sourceforge.net/software/product/Orai)].
- Planning features: none found.
- AI feedback style: "scorecard and one suggestion for next time" [Vendor]. A single next action per session is a notable pattern.
- Progress: streaks, trends, weekly change [Vendor].
- Pricing: conflicting. Directory listings range from a $9.99-$12 monthly plan to a $199 lifetime deal [Secondary: [Stork](https://www.stork.ai/en/orai), [Neowin](https://www.neowin.net/news/save-15-off-a-lifetime-subscription-to-orai-personal-ai-speech-coach/)]. Official page lists only "Download Orai free".
- Privacy: not addressed on the page [Verified absence].
- Complaints [Anecdote]: buggy web app, poor transcription; aggregated review analysis claims majority negative sentiment but pools several products ([JustUseApp](https://justuseapp.com/en/app/1203178170/orai-improve-public-speaking/reviews)), so low confidence.

### 2.2 Yoodli (consumer origin, now enterprise roleplay platform)

- Practice flows: free-talk or uploaded recording analysis, live AI roleplays (sales, interview, difficult conversations), custom roleplays for teams. Pricing page lists "feedback on uploaded recordings" under Pro. [Verified: [pricing](https://yoodli.ai/pricing)]
- Metrics: filler words, words per minute, pause frequency, sentence conciseness, plus a transcript in the report [Vendor blog, via [search summary of Yoodli posts](https://yoodli.ai/blog/how-to-stop-using-filler-words)]. Hedging and repetition appear in reviews [Secondary].
- Pace: after-session number with a comparison to "ideal conversational pacing" [Secondary]. Yoodli's own blog states typical conversational pace is 130-170 wpm and most native English speakers talk about 140 wpm [Vendor, [blog](https://yoodli.ai/blog/how-many-words-in-a-5-minute-speech) as summarised by search; not independently re-read]. Its own sample report called 172 wpm "a bit fast" [Vendor, via [Inc.](https://www.inc.com/minda-zetlin/improve-public-speaking-elon-musk-speech-yoodli.html)].
- Transcript features: filler words marked in the transcript [Vendor/Secondary].
- Planning: none found for solo users; team side has a roleplay builder and rubrics [Secondary].
- AI feedback style: LLM-based, rubric-driven for teams; "Coach for every learner" in Business tier [Verified: pricing page].
- Progress: dashboards for teams ("Measure dashboards and exports") [Verified]; individual history not documented in sources read.
- Pricing [Verified, [yoodli.ai/pricing](https://yoodli.ai/pricing), annual billing]: Starter free, **5 lifetime roleplay sessions**; Pro $8/month, up to 10 roleplays per week; Advanced $20/month, unlimited roleplays and data excluded from AI training. Team plans custom.
- Privacy [Verified]: on Starter and Pro, "session data may be used to improve the platform"; training exclusion is a paid tier feature. Business tier lists SOC 2 Type 2. Cloud processing.
- Complaints: none found with reliable provenance. The free tier shrank to 5 lifetime sessions, which is itself a signal [Inference: free solo practice is not a viable business for Yoodli].

### 2.3 Speeko (consumer, mobile)

- Practice flows [Verified: [App Store](https://apps.apple.com/us/app/-/id1071468459)]: short lessons, guided exercises, courses (latest: a course on TED-style talk preparation), rehearsal tools for presentations, speeches and interviews, "Convos" (AI roleplays for interviews, difficult conversations, small talk), daily warm-ups, coach-led live group events. Digital notecards and interview prompt banks per [SourceForge](https://www.sourceforge.net/software/product/Speeko) [Secondary].
- Metrics: pace, filler words, tone, pauses [Verified]; talk time, word choice, intonation, sentiment [Secondary].
- Pace: "real-time guidance" is a Pro feature per [Speeko site](https://speeko.co/subscriptions) [Verified]; whether it is a live gauge is not stated. No WPM target published in sources read.
- Planning: notecards (script/key points); course on idea-to-talk preparation [Verified/Secondary]. No per-section timing found.
- AI feedback style: personalised feedback (Pro), shareable feedback reports [Verified].
- Progress: not detailed.
- Pricing [Verified, [speeko.co/subscriptions](https://speeko.co/subscriptions)]: monthly $29.99, annual $8.33/month with 7-day trial, lifetime $299.99. App Store in-app purchases list Annual $99.99 and Monthly $24.99. Prices vary by listing and country; the site and the store disagree.
- Privacy: App Store labels (developer-declared) list purchases, contact info, identifiers, usage data and diagnostics, with uses including advertising/marketing and analytics [Verified]. Whether audio leaves the device is not stated.
- Complaints [Anecdote, from App Store review summary]: repetitive posture and breathing tips; wish for more interview content. Rating 4.7 from 4.8K ratings [Verified].

### 2.4 Poised (meeting coach, desktop; defunct)

- Flow: live coaching during real video calls on Mac and Windows; no bot joins; live speaker notes; meeting summaries. [Verified: [poised.com](https://www.poised.com)]
- Metrics: three scores shown on the page: Speakshare (share of contribution), Clarity (filler words), Confidence (hedging words). Pace, volume, energy, empathy mentioned in testimonials. [Verified/Vendor]
- Pace display: live during the call; details of band unknown.
- Pricing: Pro about $13-19/month per aggregators [Secondary]. Company is shutting down (section 1).
- Privacy: says it does not sell personal information; does not state on-device vs cloud [Verified absence].
- Lesson [Inference]: "hedging words" and "speak share" are distinctive metrics worth borrowing; the shutdown suggests live meeting coaching is hard to monetise or maintain.

### 2.5 Microsoft Speaker Coach (PowerPoint, Teams; free)

All from the [Microsoft support article](https://support.microsoft.com/en-us/office/rehearse-your-slide-show-with-presenter-coach-cd7fc941-5c3b-498c-a225-83ef3f64f07b) and [Suggestions from Speaker Coach](https://support.microsoft.com/en-US/PowerPoint/suggestions-from-speaker-coach) [Verified].

- Practice flow: rehearse a deck in Slide Show; prepared presentation only. "Rehearse Again" on desktop and iOS. It does not add per-slide timings (separate Rehearse Timings feature).
- Metrics (vary by platform): pace, monotone/pitch, filler words, speech refinement (informal speech, euphemisms), originality, inclusive language, repetitive language (database of about 200 common words and phrases), reading slide text, overly wordy phrasing, profanity. Pronunciation is US-English only and "coming soon" on some platforms.
- Pace: **live on-screen guidance during rehearsal**, then a **Rehearsal Report** with statistics. The report's pace is computed from "the most recent few seconds", so values fluctuate.
- **Recommended range: 100 to 165 wpm**, with the rationale that too fast reduces comprehension and recall and too slow loses interest [Verified: Microsoft].
- Pitch: no numeric threshold; advises varying pitch, stressing key words, avoiding reading verbatim.
- Fillers: no threshold; advice to pause, breathe and prepare transition phrases.
- Transcript: report with "Learn More" sections; transcript highlighting is not described in the sources read.
- AI style: rule/statistics-based, suggestion text per category; no free-text LLM coaching.
- Progress: **none**. The report disappears when closed; the user must screenshot it.
- Pricing: free preview, no Office subscription required.
- Privacy [Verified]: cloud. "Your speech utterances are sent to Microsoft." Needs mic and internet. English only (Spanish, French, Japanese "planned").

### 2.6 Google features

- **Interview Warmup** (2022-2026): see section 1 for retirement. Documented behaviour from launch coverage [Secondary: [9to5Google 2022](https://9to5google.com/2022/05/17/google-interview-warmup/), [Voicebot 2022](https://voicebot.ai/2022/05/26/google-launches-free-interview-warmup-voice-ai-tool-for-job-seekers/)]: role-specific question sets, answer by voice or typing, real-time transcription, no grading, unlimited retries, insights "Talking points" (topics detected by ML), "Most-used words" (words used three or more times, tap for alternatives), "Job-related terms"; audio not saved; transcript copyable. This is the best-documented example of a **non-judgmental, content-oriented** interview loop.
- **Search "Speaking practice"** [Secondary]: Search Labs experiment (2024) for English learners; the user answers a conversational prompt using specific target words and gets feedback on grammar and clarity. Not a public-speaking coach.
- **Gemini Live** is now Google's suggested interview-simulation path [Verified: grow.google page], but is a general voice assistant with no persistent metrics [Inference].

### 2.7 VirtualSpeech (VR and web training, B2B-leaning)

- Flow: 20+ structured courses and 55+ exercises; VR scenarios (audiences, interviews, meetings) and web version; AI coaching [Vendor via [Stork](https://www.stork.ai/en/virtualspeech), [pricing page exists](https://virtualspeech.com/pricing)] [Secondary].
- Metrics: pace, filler words, eye contact (excluded here), overall speech analysis [Secondary].
- Pricing: from about $45 per user per month for organisations; individual plans reported at $45/month or $399/year; no free tier [Secondary, conflicting].
- Relevance [Inference]: VR audience simulation is out of scope; the structured-course-plus-exercise catalogue is the relevant pattern.

### 2.8 Ummo (discontinued)

- Historic features [Secondary: [MacStories](https://www.macstories.net/?p=43461), [Paste](https://pastemagazine.com/tech/app/ummo-app-review-ios-speech-therapy)]: filler detection with a user-editable filler list (default nine words), optional beep on filler, post-session report with WPM, word count, clarity, pause locations, bar graph of counts next to the full transcript. Built on IBM Watson ASR plus custom analysis; a reviewer found recognition struggled at times [Anecdote].
- Relevance: the **editable filler list** and **transcript next to the counts** are the right basics. The app's disappearance after about 2016-2020 is unexplained [Inference: ASR dependency and a niche market are plausible but unverified causes].

### 2.9 LikeSo (legacy)

- Modes [Secondary: [Daily Tar Heel era coverage](https://dailytarheel.com/article/2016/09/leave-behind-the-ums-likes-and-ya-knows-with-likeso), [WTOP 2017](https://wtop.com/business-finance/2017/01/like-use-filler-words-stop-app)]: FreeStyle (just listens and counts), TalkAbout (conversation prompts, e.g. "The Job Interview"), user-selectable filler words, 30 or 60 second time limits, an "Articulate score" grade based on the share of non-filler words and pace.
- Anecdote/commentary: a linguist reviewer noted that "like" and similar words also serve discourse functions, so zero-filler is not a universal goal ([Through Line Group](https://throughlinegroup.com/?p=39539)) [Anecdote].
- Pattern worth keeping: **short timed rounds (30 or 60 s) with a single composite grade**.

### 2.10 ELSA Speak and BoldVoice (pronunciation and accent)

Only [Secondary] sources were retrieved ([ELSA listings](https://us.fitgap.com/products/035408/elsa), [BoldVoice listings](https://www.educationalappstore.com/app/boldvoice-learn-pronunciation)); treat as indicative.

- ELSA: phoneme-level feedback with immediate error highlighting; ASR trained on non-native accents; intonation and stress analysis; IELTS/TOEFL speaking simulation; thousands of lessons. Pricing reports conflict ($13-18 per month, higher AI tiers).
- BoldVoice: initial speech assessment, personalised plan, video lessons from accent coaches, record-and-score drills, sound-by-sound analysis, roleplay (e.g. interviews), daily 10-minute routine, progress dashboard. Pricing reports conflict ($15-20 per month, about $90/year, higher in-app purchases).
- Relevance [Inference]: these target L2 learners at phoneme level, which needs a pronunciation-scoring model. For a native-language speech coach this is out of MVP scope, but the **assessment, then plan, then daily 10-minute routine** structure is relevant to the vocal-practice feature in Voice Life Companion.

### 2.11 2025-2026 newcomers (all [Secondary]; vendor-written lists)

Source: [Orai blog](https://orai.com/blog/best-ai-speech-coach-apps/), [Oratori](https://oratori.app/best-ai-speech-coach-apps-2026/), [Wellspoken](https://www.wellspoken.me/blog/best-app-for-public-speaking), [AIToolsBakery](https://aitoolsbakery.com/blog/best-ai-public-speaking-coach-apps/), [SpeakUp Coach](https://speakupcoach.com/best-free-public-speaking-apps). Several of these lists are authored by a company that ranks itself.

- Oratori (launched April 2026): short, focused professional moments.
- Oompf (January 2026): gamified daily speaking practice.
- Speakio: web scenario practice (interviews, presentations).
- SpeakUp Coach (founded March 2026): free, browser-based, English and Spanish.
- Orator (iOS): scenario rehearsal (mock interviews, objection handling, drills).
- Wellspoken: structured daily practice and meeting notes.
- Cadency: AI Speech Coach (store listing seen in search, not examined).
- Public Speaking Coach (iOS, id6744645684): lists a Korean store page, but Korean-language analysis is unverified.

Pattern across newcomers [Inference]: scenario-based AI roleplay plus daily short practice plus streaks. Metrics are the same four (pace, fillers, pauses, energy). Differentiation is in the loop and the persona, not in the DSP.

### 2.12 Korean-language apps

- No Korean-specific speech-coaching app with verified Korean ASR and metrics was found. A search result suggested "스피치 캔버스"; its App Store URL returned 404 and I could not confirm it exists. Do not treat it as real.
- Public Speaking Coach has a Korean-language store page ([mwm.ai/ko](https://mwm.ai/ko/apps/public-speaking-coach/6744645684)), which proves only localised marketing text, not Korean speech analysis [Secondary].
- Orai, Yoodli, Speeko, Microsoft Speaker Coach: English-first; Korean analysis not documented. Microsoft states English only [Verified].
- Conclusion [Inference]: **Korean-language speech analytics (syllable-based pace, Korean filler lexicon) appears to be an open gap**, but a thin search (web search, no Korean app store crawl) cannot prove absence. Recheck with Korean app stores (Google Play KR, Naver) before relying on this.

## 3. Cross-app comparison

### 3.1 Metrics matrix (Y = documented, ? = unclear/secondary only)

| Metric | Orai | Yoodli | Speeko | Poised | MS Speaker Coach | Interview Warmup | Ummo | LikeSo |
|---|---|---|---|---|---|---|---|---|
| WPM / pace | Y | Y | Y | Y | Y (live + report) | n/a | Y | Y |
| Filler words | Y | Y | Y | Y | Y | n/a | Y | Y |
| Pauses | ? | Y | Y | ? | n/a | n/a | Y (locations) | n/a |
| Pitch / monotone | ? | ? | Y (intonation) | ? | Y | n/a | n/a | n/a |
| Volume / energy | Y (energy) | Y (volume) | ? | Y | n/a | n/a | n/a | n/a |
| Repetition | ? | ? | ? | Y (most-used words) | Y (about 200-word list) | Y (3+ uses) | n/a | n/a |
| Hedging | n/a | ? | n/a | Y | n/a | n/a | n/a | n/a |
| Conciseness / wordiness | Y | Y | n/a | Y | Y | n/a | n/a | n/a |
| Reading-from-slide detection | n/a | n/a | n/a | n/a | Y | n/a | n/a | n/a |
| Content topics covered | n/a | rubric (team) | n/a | n/a | n/a | Y (talking points) | n/a | n/a |
| Speaking share / talk time | n/a | n/a | Y | Y | n/a | n/a | n/a | n/a |

### 3.2 Practice flows, pace display, planning

| App | Free talk | Prepared / script | Interview Qs | Impromptu / scenarios | Pace shown | Planning tools | Progress |
|---|---|---|---|---|---|---|---|
| Orai | yes | pitch | yes | daily scenarios | after, number | none found | streak, trend |
| Yoodli | yes, upload | team content | roleplay | roleplay | after, number | none (solo) | team dashboards |
| Speeko | yes | notecards, TED course | prompts, Convos | Convos, warm-ups | "real-time guidance" (Pro) | notecards | not detailed |
| Poised | live meetings | no | no | no | live | speaker notes | trends |
| MS Speaker Coach | no | **yes (deck)** | no | no | **live + report** | none (no timings) | **none** |
| Interview Warmup | no | no | **yes** | no | n/a | none | none (retained nothing) |
| LikeSo | FreeStyle | no | yes | TalkAbout | score includes pace | none | not detailed |

Note on Yoodli's 2026 press releases: they come from PR Newswire reposts ([StreetInsider](https://www.streetinsider.com/PRNewswire/Yoodli+Launches+Auto-Generated+Learning+Content%2C+Bringing+Content+Creation+Inside+the+AI+Roleplay+Platform/26631910.html)) [Vendor].

Observation [Inference]: **No surveyed app combines planning (outline, per-section time budget) with rehearsal against that plan with section-level feedback.** Microsoft comes closest for prepared decks but has no timings or history. This is the clearest gap for our app.

### 3.3 Pricing and privacy summary

| App | Price (see profile for provenance) | Processing |
|---|---|---|
| Orai | conflicting, about $10/month or lifetime deals [Secondary] | not stated |
| Yoodli | free 5 lifetime sessions; $8 or $20 per month [Verified] | cloud; training exclusion only on top tier |
| Speeko | $8.33/month annual to $29.99 monthly; lifetime $299.99 [Verified, inconsistent with store] | not stated |
| MS Speaker Coach | free | cloud (Microsoft Speech Services) [Verified] |
| Interview Warmup | free; audio reportedly not saved [Secondary] | cloud |
| VirtualSpeech | about $45 per month [Secondary] | not stated |

No surveyed consumer app claims fully on-device processing [Verified absence on pages read; Inference that none does]. On-device-first is therefore a differentiator for us, consistent with [speech-cloud-vs-device.md](../speech-cloud-vs-device.md).

## 4. Evidence on speaking rate

### 4.1 English, words per minute

| Figure | Context | Source | Label |
|---|---|---|---|
| 100-165 wpm | recommended presentation range | [Microsoft](https://support.microsoft.com/en-US/PowerPoint/suggestions-from-speaker-coach) | Verified (vendor guidance, no cited study) |
| 130-170 wpm, about 140 typical | conversational pace | Yoodli blog | Vendor |
| about 180-210 wpm, many speakers above 200 | normal conversation | review in [Hux et al., AJSLP 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7231913) citing Tauroza and Allison (1990), Robb et al. (2004) | Verified that the review cites them; primary papers not read |
| 113 / 154 / 200 wpm slow / medium / fast; medium preferred | listeners with aphasia | same paper | Verified, **not a typical-listener result** |
| comprehension intact at 270 wpm, steeply worse at 315 wpm | typical adults, listening | same search digest, original not located | Secondary |
| BBC radio bulletins about 168 wpm; Spanish RNE 210 | broadcast | [search digest](https://core.ac.uk/download/161266569.pdf), not verified | Secondary |

Interpretation [Inference]:

- Everyday conversation is faster (about 180-210 wpm) than the 120-160 band that coaching apps recommend. The app bands are **conventions for presenting to an audience**, chosen for comprehension and a deliberate delivery, not measured norms of natural speech.
- A single band is a poor fit across tasks: read-aloud, rehearsed speech, interview answer, and casual talk all differ. Our target band should be task-dependent and user-adjustable, with the baseline learned from the user's own recordings.
- Practical default for English presentation mode: about 130-160 wpm articulation-inclusive target, warn above about 170 and below about 110. These are our design choices [Inference], bounded by Microsoft's 100-165 and Yoodli's 130-170.
- WPM depends on word length, so it varies with content [Inference]; compare a user to themselves over time.

### 4.2 Korean, syllables per minute (SPM) or per second (SPS)

WPM is a poor fit for Korean because eojeol (space-delimited units) combine content and particles, so word counts vary with spacing conventions and ASR tokenisation [Inference]. Korean research uses syllables per second.

| Finding | Detail | Source | Label |
|---|---|---|---|
| TV news announcers | mean **356.9 SPM** (men, SD 6.5, range 338.6-401.5) and **353.1 SPM** (women, SD 4.5, range 336.9-390.0), about 5.9 SPS; no significant gender difference. 20 broadcasts (KBS, YTN, JTBC, SBS, Yonhap TV, Channel A), recorded Sept 2019, first sentence of each segment only; pauses not analysed and treatment unclear | Kim, Kim and Yoo (2021), *J. Speech-Language & Hearing Disorders* 30(3), 75-80, DOI 10.15724/jslhd.2021.30.3.075; [page](https://www.jslhd.org/_common/do.php?a=full&b=23&bidx=2656&aidx=30072) | Verified (small sample, one sentence per broadcast) |
| Korean standard speech DB, 412 speakers | **speaking rate (pauses included) about 4.8-4.9 SPS (about 290 SPM)**; **articulation rate (pauses excluded) about 5.8-6.2 SPS (about 350-370 SPM)**; women 4.85 / 5.81 SPS, men 4.80 / 6.18 SPS; pause proportion 17.1% (women) and 23.1% (men) of speech time | Lee, Shin, Yoo and Kim (2017), *Phonetics and Speech Sciences* 9(1), 27-39, [PDF](https://koreascience.kr/article/JAKO201713647763102.pdf) (I read tables 3 and 4) | Verified |
| Age | young adults' speaking rate **5.45 SPS** vs older adults' **4.24 SPS**; a difference of 1-2 SPS is noticeable (listeners notice about 5% change) | same paper | Verified |
| Pause lengths | between-utterance pauses about 530 ms (women) and 680 ms (men); within-utterance pauses about 300 ms (women), 330 ms (men) | same paper | Verified |
| Read at three speeds | slow 4.50, normal 5.96, fast 7.75 SPS (9-syllable sentences, 6 students) | Lee and Ko (2004), as cited in Lee et al. 2017 | Verified as cited; original not read |
| Region | no significant effect on rate | Lee et al. 2017 | Verified |
| Spontaneous Seoul speech | articulation rate varies by speaker; SPS separates speakers better than sec/syllable | Kim (2018), *Phonetics and Speech Sciences* 10(4), 19-29, [page](https://koreascience.kr/article/JAKO201810760742376.page?lang=en) | Verified abstract only; numbers not read |

Derived design guidance for Korean [Inference, built on the figures above]:

- Report **speaking rate in SPS or SPM including pauses** and **articulation rate excluding pauses** separately; the gap (about 1 SPS in the DB) is the pause behaviour and is itself coachable.
- Broadcast reading is about 350-360 SPM (about 6 SPS) and is **not a target for conversation or presentation**: it is trained read speech with short pauses. Natural speaking rate is about 4.5-5.5 SPS (about 270-330 SPM) with 17-23% pause time.
- Starting presentation band proposal: **speaking rate about 4.0-5.0 SPS (240-300 SPM)**, articulation rate up to about 6 SPS. Flag above 6 SPS articulation (faster than a news anchor) or below about 3.5 SPS speaking rate. These thresholds are our hypothesis and need user testing; no study links these Korean ranges to audience comprehension.
- Sociolinguistic variation is real (age: 1-2 SPS); use a personal baseline and give relative feedback ("20% faster than your calm recording").
- Cross-language comparison (Korean vs English) by SPS is unreliable because syllable structure differs (the Lee et al. discussion makes this point). Do not translate between wpm and spm for users.
- Not found: Korean speech-rate studies tied to listener comprehension in presentations, and a broadcast-announcer manual figure from KBS/MBC. A secondary page quotes "330-350 characters per minute" for announcers ([pdnote timer](https://pdnote.com/pt_timer/)), an unverified rule of thumb in characters, not syllables.

## 5. Synthesis

### 5.1 MVP must-have feature list

Scope: transcript, pace measure, planning, practice. Languages: Korean and English from day one (project decision).

Transcript

1. Record plus on-device transcription with word timestamps (see [speech-cloud-vs-device.md](../speech-cloud-vs-device.md)); transcript is editable by the user.
2. Inline marks for fillers, long pauses (gap markers with duration), repeated words/phrases, and hedges. Tap a mark for explanation.
3. Playback synced to the transcript (tap a word to hear it).
4. Editable filler list per language (Ummo, LikeSo precedent); Korean default list required (see 5.3).

Pace

5. **Language-aware unit**: WPM for English, SPS/SPM for Korean; speaking rate and articulation rate shown separately.
6. After-session pace timeline (rate in rolling windows of 10-15 s, see 5.3) with a shaded target band; per-section values when a plan exists.
7. Optional live indicator (see pitfalls: keep it minimal and off by default).
8. Target band chosen per task (presentation, interview answer, read-aloud, casual) and adjustable; default uses section 4 values; offer "learn my baseline".

Planning

9. Outline with sections, key points per section and a time budget per section; total time limit.
10. Paste or write a script; align it with the transcript to show skipped, added and reordered content (inference from Microsoft's reading-detection and notecards in Speeko).
11. Timer countdown with per-section checkpoints during rehearsal.

Practice

12. Four modes: free talk, prepared (script or outline), question prompts (interview), impromptu topic with a prep timer (for example 20 s).
13. Timed rounds (30/60/120 s), borrowing LikeSo.
14. Retry on the same prompt with side-by-side comparison to the previous take.

Progress and privacy

15. Local session history: per-session metrics and trends against the user's own baseline.
16. One concrete "next action" after each take (Orai pattern).
17. Audio and transcript stay on device by default; any cloud LLM feedback is opt-in per session and shows what is sent (differentiator against Microsoft/Yoodli, section 3.3).
18. Shared journaling hook: a session can be saved as a journal entry (project requirement; see [README](../README.md)).

Later (not MVP): pitch-based monotone score, LLM content critique, rubric-based roleplay, L2 pronunciation scoring, VR, meeting-live coaching.

### 5.2 Practice loop design

Best-of-breed elements and where they come from:

| Step | Design | Borrowed from |
|---|---|---|
| 1. Choose goal | pick mode (prepared / question / impromptu), language, time limit, target band | Speeko modes, MS deck mode |
| 2. Plan (optional, 1-3 min) | outline, key points, time per section, read back the budget | gap in market; Speeko notecards |
| 3. Record | minimal screen: timer, section checkpoint, optional soft pace cue (vibrate or colour) | MS live guidance, LikeSo time limit |
| 4. Instant summary (under 10 s) | three numbers (pace vs band, fillers per minute, longest pause) and exactly **one** next action | Orai scorecard + one suggestion |
| 5. Review | transcript with marks, pace timeline, section overrun/underrun, replay from any word | Ummo, Yoodli transcript |
| 6. Retry | same prompt, show delta vs previous take and vs personal baseline | Interview Warmup unlimited retries, no grading |
| 7. Save | add to journal, track weekly trend, streak is optional | Orai streak; avoid punishing misses |

Principles [Inference]:

- Non-judgmental language. Interview Warmup deliberately did not "grade" answers [Secondary]; LikeSo coverage notes fillers are not universally bad. Offer observations ("you paused 8 times over 1 s") over grades.
- One focus per session. Choose the metric with the largest deviation from the band, and rotate.
- Compare to self, not to a population: pace and pause behaviour vary with age, task and language (section 4).
- Keep the loop short (a 5-minute daily routine matches BoldVoice's 10-minute and LikeSo's 30-60 s precedent).
- Make walking-era use possible (Voice Life Companion context): audio-only cues through earbuds without needing the screen; summary spoken or shown afterwards. This is our context, not found in surveyed apps [Inference].

### 5.3 Metrics computable on-device (audio + transcript with word timestamps)

Assumes an ASR that returns per-word start/end times and a language tag. All thresholds are starting hypotheses [Inference] requiring tuning on real recordings.

| Metric | Computation | Notes |
|---|---|---|
| Speaking rate | units / total duration (first word start to last word end) | English: words; Korean: Hangul syllables (U+AC00-U+D7A3 count in transcript); handle digits and Latin text by a language-specific reading rule or exclude |
| Articulation rate | units / (duration minus pauses of at least 250 ms) | Matches Lee et al. 2017 definition; pause floor chosen near the within-utterance mean of about 300 ms |
| Rolling pace | same measure in 10-15 s sliding windows, excluding silence | Microsoft uses "the most recent few seconds" and acknowledges variability; use a longer window for the displayed gauge |
| Pause stats | gaps between consecutive word timestamps; classify short (250-600 ms), medium (0.6-1.5 s), long (over 1.5 s); count, mean, pause time share | Korean reference: pause share about 17-23% of time |
| Filler count and rate | lexicon match on transcript, per minute and per 100 units | English: um, uh, like, you know, so, basically, actually. Korean candidates: 음, 어, 그, 저, 뭐, 이제, 약간, 좀, 그니까 [Inference; needs a Korean linguist check]. Context rules needed for "like", "그" |
| Hesitation sounds missing in ASR | detect voiced, low-energy segments with no word as "unlabelled hesitation" | Many ASR systems drop fillers [Inference, known behaviour of ASR post-processing; verify with the chosen model] |
| Repetition | repeated n-grams (n=1-3) within a window; most-used words with stop-word filter | Google: 3+ uses; Microsoft: about 200-word list |
| Self-repair / restarts | immediate repeated word or short phrase, truncated word | Indicates disfluency |
| Hedging | lexicon: "I think", "maybe", "sort of", "kind of", "just"; Korean "아마", "것 같아요", "좀" | Poised "confidence" idea; high false-positive risk, show as hint only |
| Conciseness | words per sentence, time to first key point, ratio of content words to total, sentence count over a limit; with a plan: fraction of key points covered | LLM unnecessary; key point coverage can use embedding similarity on-device [Inference] |
| Plan adherence | per-section start/end times (via alignment to script or detected topic shifts or user tap), overrun % | Gap in market |
| Script adherence | word-level alignment (edit distance) between script and transcript; reading flag if near-verbatim and low pitch variation | Microsoft "reading slide text" |
| Volume | frame RMS in dBFS (relative to the user's calibration), variance, clipping share | Only relative to device and mic; do not claim absolute dB SPL |
| Pitch variation | F0 via a pitch tracker (for example YIN/pYIN or CREPE-tiny) on voiced frames; use **semitone** standard deviation or range per phrase, not Hz | Kim et al. (2021) used semitone range (about 20-21 st for news reading, Praat 75-500 Hz); men and women differ in Hz but not in semitones, so semitones are the fair unit. Monotone threshold must be calibrated per user |
| Speaking share / talk time | only with diarisation; skip in solo MVP | Poised "speakshare" |
| Confidence score | per-word ASR confidence | Use as a data-quality guard: down-weight or hide metrics when mean confidence is low |

Compute budget [Inference]: all rows except pitch tracking and embeddings are O(words); pitch at 16 kHz is light. Target under 1 s post-processing for a 5-minute take.

### 5.4 Pitfalls

1. **ASR hides what you want to measure.** Fillers, false starts and stutters are often removed or normalised by ASR [Inference; verify per model]. Orai users complain about poor transcription accuracy [Anecdote]; Ummo reviewers noted misrecognition [Anecdote]. Validate on recordings with real disfluency in both languages before promising filler counts.
2. **Word timestamps are approximate** (frame-level quantisation, forced-alignment drift). Pause thresholds near 250 ms are within error for some models [Inference]. Measure alignment error on your own models.
3. **WPM for Korean misleads.** Use syllables (section 4.2) and keep English and Korean thresholds separate.
4. **One universal ideal pace is a myth.** Everyday English speech runs about 180-210 wpm [Verified as cited in a review] while apps recommend 100-165; Korean news reading is about 6 SPS but natural speech is about 4.8 SPS. Misleading "too fast" warnings on normal conversation will erode trust. Use task-dependent bands plus personal baselines.
5. **Live pace gauges can hurt.** A live number is distracting and noisy (Microsoft computes from the last few seconds and warns of fluctuation). Make live feedback optional and coarse (three states), show detail afterwards. [Inference]
6. **Zero fillers is not the goal.** Fillers have discourse functions [Anecdote, LikeSo coverage]; target a trend and awareness rather than elimination, and make the list editable.
7. **Gamification churn.** Streaks and scores can pull attention toward the metric rather than communication. Prefer "one next action" and self-comparison. [Inference]
8. **Pitch is speaker-dependent.** Use semitones, per-user baseline, and avoid gendered or accent-related judgments. Microsoft gives no numeric pitch threshold, a hint that thresholds are hard [Inference].
9. **Privacy claims need to be earned.** No surveyed app is clearly on-device; Microsoft and Yoodli send audio to the cloud. If we say "on-device", ensure that the cloud fallback is explicit and per-use, and that logs and crash reports contain no transcripts.
10. **Business viability.** Poised shut down, Ummo is discontinued, Interview Warmup was retired, Yoodli cut its free tier to 5 lifetime sessions. Solo speech coaching has weak standalone monetisation [Inference]; this supports bundling it inside Voice Life Companion rather than shipping separately.
11. **Overclaiming AI feedback.** LLM feedback on content can sound confident and wrong. Keep numeric metrics deterministic and label LLM text as suggestions, as Google did by not grading.
12. **Data quality of this study.** Pricing and features for smaller apps are secondary and conflicting; Google Search "Speaking practice" status and Korean-app absence are unverified; the Korean newscaster study used one sentence per broadcast. Re-verify before any external claim.

## 6. Open questions and next steps

- Hands-on trial of Yoodli, Speeko and Microsoft Speaker Coach to document the real UI (this study is desk research only).
- Check Korean app stores (Google Play KR, Naver) for Korean speech-coaching apps.
- Record a 30-minute Korean and English test set (with fillers) and measure ASR filler recall and timestamp error on our chosen on-device model.
- Collect our own Korean SPS baselines for presenting, reading and casual talk from the target users before fixing the band.
- Obtain the primary papers: Tauroza and Allison (1990, *Applied Linguistics* 11(1), 90-105) and Lee and Ko (2004), which were only seen via citations.
