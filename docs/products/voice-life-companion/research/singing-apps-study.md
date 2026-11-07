# Singing and Vocal-Practice Apps: Feature Study for the "Song Coach"

Research date: 2026-11-07. All links accessed 2026-11-07 unless noted.
Scope: features and UX patterns only. We are building an original app; nothing here is a request to copy branding, content, or assets.
Context: Voice Life Companion (Android-first, Expo/React Native, Korean + English, on-device-first). See [README](../README.md) and [technical-decisions](../technical-decisions.md).

## 0. How to read this document

Labels used throughout:

- **[F]** Verified fact: read on a primary page (app-store listing, developer docs, paper) during this research.
- **[V]** Vendor claim: the developer says it; not independently tested.
- **[A]** Anecdote: user or reviewer opinion from store reviews or third-party blogs. Many blogs are written by competitors (Singing Carrots sells its own product), so weigh them accordingly.
- **[I]** Inference: our own reasoning.

Limits of this study:

- No app was installed or tested hands-on. Everything is from listings, docs, and articles.
- Reddit threads could not be retrieved through the search tool. No Reddit quote below is first-hand; "anecdote" items come from store reviews and review-analysis blogs. Re-check r/singing, r/vocaltechnique and Korean communities manually before relying on complaint rankings.
- Most app-store pages fetched were iOS. Google Play pages were not retrievable, so Android availability is often unconfirmed.
- Version dates shown on App Store pages were relative ("2 days ago") or lacked a year; where so, the date is approximate.

## 1. Per-app findings

### 1.1 Vanido

Status: **uncertain, possibly stale.**

- [F] A store-aggregator page lists "Vanido: Learn to Sing" by Vanido Inc., original publication 2019-12-22, no current version/update date shown. Source: [JustUseApp](https://justuseapp.com/en/app/1130249200/vanido-learn-to-sing/reviews). The developer site vanido.io returned an error when fetched, so liveness is not confirmed.
- [A] A forum user called it "abandoned" and said sign-in does not work ([LoopyPro forum](https://forum.loopypro.com/discussion/31165/voice-training)). Treat as anecdote.
- Core loop [V]: short daily goal-based exercises (foundational, head voice, chest voice, flexibility) adapted to range and progress; free tier with a few sessions a day. Sources: [edshelf](https://edshelf.com/tool/vanido/), [JustUseApp](https://justuseapp.com/en/app/1130249200/vanido-learn-to-sing/reviews).
- Pitch display: not confirmed in sources; described as real-time pitch tracking with live self-monitoring.
- Range: a vocal-range tester exists (per user reviews on the aggregator).
- Pricing [F, aggregator]: free daily sessions; "Unlimited" subscription listed from USD 39.99/year with one-week trial. Older third-party reviews list $2.99/month or $17.99/year ([Wiingy](https://wiingy.com/blog/best-apps-for-voice-lessons)); prices clearly changed or differ by source.
- Complaints [A]: login loops; notes read a half step off (one reviewer says fixed Jan 2020); app picking up its own audio; no way to save recordings or adjust playback; voice distortion with earbuds; little explanation of technique; no self-monitoring in headphones (forum).
- Takeaway [I]: useful as a historical reference for the "daily 5-minute guided session adapted to your range" loop, not as a current benchmark.

### 1.2 Simply Sing (Simply Ltd, JoyTunes)

- [F] iOS listing: free with in-app purchases, 4.6/5 from about 2.8k ratings (Ireland storefront), version 3.2.2. Source: [App Store](https://apps.apple.com/ie/app/simply-sing/id1592900217).
- Core loop: take a vocal test, get a voice type, sing songs unlocked in levels; songs are transposed to fit your voice; daily singing tips [F].
- Pitch display [V/A]: real-time pitch feedback against the song melody ([Preply](https://preply.com/en/blog/best-singing-learning-apps/)). The listing itself does not describe the display.
- Exercises: song-first lessons; little technique/warm-up content [A] ([Singing Carrots blog, competitor](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/)).
- Feedback and scoring: per-song feedback; the format is not documented in the listing. A comparison review found Yousician stricter than Simply Sing ([American Songwriter](https://americansongwriter.com/yousician-singing-review/)) [A].
- Range: vocal test sets voice type and transposes songs [F]. A listing summary flags inaccurate range detection as a weakness [A] ([Marlvel, AI-generated aggregator](https://marlvel.ai/intel-report/music/com-joytunes-sing); low reliability).
- Metronome/backing: songs come with backing; no standalone metronome documented.
- Recording/playback, streaks: not confirmed in sources.
- Pricing [F/A]: Premium sold in many tiers; American Songwriter reports $14.99/month, $59.99/year, and higher tiers at $19.99/month and $89.99/year ([review](https://americansongwriter.com/simply-sing-review/)). The Irish listing shows EUR 5.49 to 99.99 in ten entries.
- Complaints [A, store reviews on the listing above]: no free songs; subscription requirement unclear before download; songs failing to open after the vocal test.

### 1.3 Yousician (singing)

- [F] Singing is one of the instruments in the Yousician subscription; lessons cover breath support, melody, harmony, intervals, scales, ear training, solfege; the app listens through the microphone for timing and accuracy; range calibration with Auto transpose; slow-down and loop; an external mic is recommended but not required. Source: [yousician.com/voice](https://yousician.com/voice).
- Pitch display [V/A]: target notes against your live pitch, rated on target / slightly off / well off ([BloomVocal review, dated 2026-05-27, updated 2026-10-28](https://www.bloomvocal.site/en/blog/yousician-review-2026); a singing-coach competitor).
- Skill areas [A, same source]: Resonance, Breathing, Pitch, Rhythm, Performance.
- Progress: badges, streaks, levels [A, same source].
- Range: calibration used for transposition and exercise fitting [F].
- Backing/metronome: song-based; rhythm training is part of the curriculum. Details not confirmed.
- Pricing [A, verified by that reviewer on US App Store 2026-07-29]: no vocals-only plan; Premium $19.99/month or $119.99/year (one instrument, own library); Premium+ $29.99/month or $179.99/year (all instruments, 10,000+ licensed songs); 7-day trial on annual only. Yousician's own page does not list ongoing prices [F]. Another source lists different tiers ([Singing Carrots blog](https://singingcarrots.com/blog/best-yousician-alternatives-for-singing-beginners/)), so prices are unstable.
- Complaints [A]: depth runs out after beginner level; pitch detection struggles in noisy rooms and an external USB mic is often suggested; Western-pop-heavy catalog with no confirmed Korean-language songs; streaks can feel pressuring; no diagnosis of tension or chest-voice carry ([BloomVocal](https://www.bloomvocal.site/en/blog/yousician-review-2026)).

### 1.4 Smule (karaoke reference only)

- Core loop: choose a karaoke track, sing solo/duet/group, publish and social-share; subscription (VIP) unlocks the full catalog; weekly, monthly, yearly plans [F, listing summary via search] ([App Store](https://apps.apple.com/sg/app/smule-sing-record-karaoke/id509993510)).
- Pitch display: on-screen pitch guide overlay with scrolling lyrics [F, listing wording]; no documented numeric score found.
- Effects: AI voice effects and pitch correction [V] ([Singing Carrots blog](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/)). That blog argues correction masks problems; opinion [A].
- Latency: reviewers report vocals drifting behind the track, echo on wired and Bluetooth headphones, and a sync slider that does not fully fix it [A] ([review analysis](https://unstar.app/blog/smule-starmaker-yokee-wesing-singa-karaoke-apps-ranked-2026)). Smule's own advice, as summarized, is to check latency settings in the app menu.
- Pricing complaints [A]: popular songs behind VIP; cancellation difficulty.
- Lessons for us [I]: manual latency-offset slider is a de-facto industry pattern; do not copy the social/gamified-posting loop (out of scope for a private coach).

### 1.5 Singing Carrots

Most detailed and most current documentation of all apps (web + mobile; see [docs](https://singingcarrots.com/docs/singing-carrots-pitch-training)).

- Core loop [F]: 16 numbered levels plus three warm-up levels; each level has four modes: Practice, Basic (melody and metronome), Challenging (metronome only, melody played once, three mistakes allowed), Hard (no melody, no metronome). Basic must be cleared to unlock the next two; progress resets daily.
- Pitch display [F]: piano view; target notes as blue lines, your voice a red line, color feedback (green in tune, yellow slightly off), plus a pitch-stability visualization.
- Exercises [F]: arpeggios, major/minor and pentatonic scales, range extension, speed, breath duration; difficulty tags Easy/Average/Challenging.
- Feedback and scoring [F]: result popup with notes hit, precision %, sustain %, and "carrot" rewards; replay available; leaderboards; daily goal of 300 notes and 600 points.
- Range [F]: separate [range test](https://singingcarrots.com/docs/singing-carrots-vocal-range-test): sing low then high; a note registers after about 1 second held steady; lowest/highest shown on a keyboard, with famous-singer comparison; save to account to chart range over time. Practice mode can limit exercises to your range.
- Metronome/backing [F]: adjustable BPM, metronome, reference tones, looping in Practice mode.
- Recording: replay of the pitch run exists; audio recording not described [F].
- Progress [F]: daily goal bar, daily note-hit chart, weekly leaderboard, Hall of Fame.
- Headphones/latency [F]: settings let you pick the mic (with input check), the output device (with a C4 test tone), and set an audio latency from 0 to 300 ms to compensate for Bluetooth delay. No explicit headphone advice on the page.
- Pricing [F]: Pro plans are chosen via a short quiz; prices are not shown on the plan page; Pro Performance Edition adds weekly custom-song exercise and monthly teacher feedback; AI Vocal Coach not included in legacy plans bought before Oct 2025 ([pricing page](https://singingcarrots.com/pro)). A reseller listed a lifetime Pro at $59.99 ([TechSpot store](https://store.techspot.com/sales/singing-carrots-pro-lifetime-subscription)); own blog cites from $119.99/year. Range test, pitch test, pitch monitor free [V].
- Complaints: none gathered with confidence. [I] Plan opacity (no visible prices) may itself be a friction.

### 1.6 SingSharp ("Sing Sharp")

Two similarly named products exist; do not confuse.

- Sing Sharp (Sing Sharp Limited, "Singing Lessons - Vocal Coach"): [F] real-time pitch feedback marking notes hit or missed; built-in tuner; resonance visualization (chest vs head voice); range test; lessons generated within your range; six warm-up programs (Daily Workout, Recovery, High Notes, Mix, Vibrato, Harmony); ear training; coach video lessons; audio and video recording; achievements; "Voice Mentor" AI; version 15.2; rating 4.3/5 from about 14k ratings; contains ads. Source: [App Store](https://apps.apple.com/us/app/id772052329?l=en-us).
- Pricing [F]: free with IAP; memberships listed at $19.99 (1 month), $39.99 (3 months), $29.99 and $99.99 (1 year, two entries); $0.99 warm-up packs; $2.99 ad removal.
- Complaints [A, store reviews]: ads between lessons and during practice; many songs members-only; range presets only three and too coarse; thin value without full purchase; rating prompt loop.
- Different app: SingSpark (Voidful, 2026) [F, [listing](https://apps.apple.com/app/id6767637172)]: karaoke mode with imported songs and pitch line, "sing with another music app" overlay, range test to suggest keys, line looping, take review with scores, daily plan, tuner/metronome. Pro is cheap: $0.99/month, $1.99/3 months, $5.99 lifetime; 3-day trial; free tier caps saved recordings at 5; the page says audio is processed on the phone. No rating yet. Useful as a 2026 newcomer reference.

### 1.7 Swiftscales

- [F] "Vocal Trainer" by VELDEN LLC: simulates a piano plus coach; sessions climb/descend in pitch and speed; build custom scale patterns; share routines in a cloud; beginner to expert presets; video tutorials. Free with ads; one-time PRO upgrade $6.99; 4.2/5 from 112 ratings; v3.0.1 ([App Store](https://apps.apple.com/us/app/id1079277628?l=en-us)).
- Pitch display: none described. It is a piano-accompanist (play scales to sing along), not a pitch monitor. [I]
- Range, recording, progress: not documented.
- Complaint [A]: no sound until the ringer volume was raised.
- Lesson [I]: shows that a pure "scale generator that walks up and down" has an audience and a low-cost one-time-purchase model.

### 1.8 Erol Singer's Studio

- [F] Erol Studios, iOS (iPhone, iPad, Mac, Vision), rating 4.8/5 from about 3.4k, v5.5 (iOS 26 compatible), iOS 17+. Source: [App Store](https://apps.apple.com/us/app/id502780186).
- Features [F]: progressive levels; trophies and three stars across four difficulty levels per exercise; daily and custom training programs; metronome; microphone monitoring; breathing and posture animations; Bluetooth audio support; optional exercise editor.
- Range [F]: "My Vocal Range" page, double-tap keyboard to start; developer suggests repeating every couple of weeks; lessons start in the most comfortable part of the range.
- Pitch: "super-smooth" tracking [V]; one reviewer noted no automatic voice-type detection [A].
- Pricing [F]: free Beginner 1-2 plus selected exercises; IAP all-access $1.99 / $6.99 / $49.99; permanent add-ons $2.99 and $24.99. Version history and listing disagree on what is included; verify.
- Complaints [A]: lacks blues/contemporary scales; lesson-plan structure; awkward range setup for a beginner.

### 1.9 Pitch monitors (Vocal Pitch Monitor, OnPitch, Voice Tools-style)

All [F] from store listings unless noted; feature claims are vendor claims.

- Vocal Pitch Monitor (iPad, $1.99): scrolling time graph, C1-B7, record and playback ([listing](https://apps.apple.com/app/id842218231)).
- OnPitch ($3.99): note, cents, Hz; vibrato and drift display over time; no reference tones ([listing](https://apps.apple.com/app/id1212118228)).
- Vocal Pitch Monitor: Tuner (2026, free+IAP): needle meter with cents plus pitch-history graph and range test; on-device ([listing](https://apps.apple.com/app/id6767428503)).
- PitchMonitorPro: overlay on a reference track, per-take 0-100 grade, practice history ([listing](https://apps.apple.com/de/app/id6766515700)).
- Voice Analyzer: spectrograms and saved sessions ([listing](https://apps.apple.com/us/app/id6761127638)).
- [I] This class shows two display idioms: needle/cents (tuner) and scrolling history line (piano roll without targets). A coach should offer both: needle for sustained notes, scrolling roll for melody.
- Voice Tools: not verified in this research; omitted.

### 1.10 Vocal Image

- [F] Vocal Image is primarily an AI voice/speaking-coach app with some singing content, such as a warm-up and performance-prep "Singers Basic Challenge"; daily lessons; tongue-twister exercises scored for Clarity and Speed. Freemium "Vocal Image Plus"; US prices listed at $12.99/month and $79.99-$129.99/year across plan entries, varying by country ([App Store](https://apps.apple.com/us/app/vocal-image-ai-voice-coach/id1535324205), [Adapty paywall library](https://adapty.io/paywall-library/vocal-image/)).
- [A] Complaints about subscription management and limited trial features on a third-party forum; low reliability.
- [I] Relevant because Voice Life Companion also covers speech/voice life. Vocal Image's "speech clarity score from a recorded phrase" pattern could feed the shared journal, but it is not a pitch coach.

### 1.11 Newcomers (2025-2026) and Korean-market apps

Only listings seen; no Play Store pages retrieved. Treat all as [V] and unverified for Android.

- SingSpark (see 1.6): privacy-forward, cheap lifetime Pro, "sing over any music app" overlay.
- Singing Carrots AI Vocal Coach (introduced about Oct 2025 per its own pricing page [F]).
- Bloom Vocal: post-recording critique reports, credit-priced; no live target ([competitor blog](https://singingcarrots.com/blog/top-7-ai-vocal-coaches/)) [V/A].
- VOIS, Vocalista, Singing Coach AI, Time to Sing, Rate My Singing: all AI-analysis apps listed in the same competitor blog; mostly iPhone-only [V]. Not verified.
- Korean-language store listings (App Store KR; Play Store not reachable):
  - VocalTuner (음감/음역체크/보컬트레이닝): live pitch, comparison with the original track's pitch, vocal separation, updated 2026-08 per aggregator ([mwm.ai](https://mwm.ai/ko/apps/vocaltuner/1505735245)).
  - 포켓싱어: range detection, warm-up, breathing; free with IAP ([App Store KR](https://apps.apple.com/kr/app/%ED%8F%AC%EC%BC%93%EC%8B%B1%EC%96%B4-%EC%9D%8C%EA%B0%90-%EC%B2%B4%EC%9D%B8%EC%A0%80-%EC%9D%8C%EC%84%B1%EB%B3%80%EC%A1%B0%EA%B8%B0-%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C%ED%8F%B0/id6503248997)).
  - 음성 훈련 - 노래 배우기: piano-key pitch guide ([App Store KR](https://apps.apple.com/kr/app/%EC%9D%8C%EC%84%B1-%ED%9B%88%EB%A0%A8-%EB%85%B8%EB%9E%98-%EB%B0%B0%EC%9A%B0%EA%B8%B0/id894620096)).
  - 보컬 레인지 파인더, Nail the Pitch, Vocal Toner (2026-06 release), Vocal Pitch Monitor Track Note (2026-01 release): range or real-time pitch monitors ([search listing](https://mwm.ai/ko/apps/vocal-toner/6780105203)).
- [I] Korean market looks fragmented with small utility apps and no clear "Yousician for Korean pop" winner in what we saw. Yousician's lack of a Korean catalog is a reported complaint [A]. This is a hypothesis; confirm on the Play Store with Korean queries ("음정 연습", "보컬 트레이닝", "노래방 음정") before treating it as a gap. Licensing K-pop backing tracks is likely out of reach [I]; original backing/MIDI-style scale content avoids it.

## 2. Comparison table (summary)

| App | Pitch display | Range test | Recording | Streaks/progress | Price model |
|---|---|---|---|---|---|
| Vanido | live (unspecified) | yes | limited [A] | yes | sub, unstable |
| Simply Sing | melody-following | yes (voice type) | not confirmed | levels | sub, expensive |
| Yousician | target notes vs voice | calibration | not confirmed | streaks, badges | sub, expensive |
| Smule | pitch guide overlay | no | yes (core) | social | VIP sub |
| Singing Carrots | piano roll, blue/red lines | yes, charted | replay only | daily goal, charts | sub, hidden prices |
| Sing Sharp | note hit/miss | yes | audio and video | achievements | sub plus packs, ads |
| SingSpark | pitch line | yes | yes, 5 cap free | daily plan | $5.99 lifetime |
| Swiftscales | none | no | no | no | $6.99 one-time |
| Erol | tracked pitch | yes | not confirmed | stars, trophies | sub or add-ons |
| Pitch monitors | needle or scrolling line | some | some | history | $0 to $4 |

## 3. Synthesis

### 3.1 MVP must-have list (song coach)

1. **Pitch graph with target notes.** Scrolling piano roll: target bars (in tolerance bands), live voice line, color by cents error. Needle/cents meter as an alternate view for sustained notes. Pattern from Singing Carrots and Yousician [F/A].
2. **Volume/level graph.** Simple level meter plus loudness trace under the pitch roll. Neither the apps studied document one prominently [I]; it supports clipping and breath-support feedback and costs little.
3. **Range test.** Sing low, then high; require about 1 s of stable pitch to register an edge (Singing Carrots' rule [F]); show the comfortable range separately from the extreme range [I]; store results with date; offer a re-test prompt every couple of weeks (Erol [F]); let users override manually.
4. **Warm-up exercises.** Generated within range: sustained notes, five-note scales, arpeggios, sirens/glides, interval jumps. Start in the comfortable middle (Erol [F]). Custom patterns (Swiftscales, Erol editor [F]).
5. **Practice-mode stage ladder.** Hear-and-sing, then sing with only a click, then sing from memory (Singing Carrots' four stages [F]) is a strong progression for ear training.
6. **Metronome or drum loop.** Adjustable BPM, count-in, accents, looping; reference tone for the start pitch.
7. **Song/phrase practice.** User-imported or original melodies in a simple format (no licensed catalog); line looping; auto-transpose into range (Yousician, Simply Sing [F/V]).
8. **Recording plus playback with the pitch overlay.** Record the mic, store the pitch track alongside the audio, replay with target vs sung overlay and A/B against a previous take. This is a gap in several apps: Vanido users asked for it [A], Singing Carrots has replay without clear audio recording [F], Sing Sharp and SingSpark do record [F].
9. **Progress.** Simple, honest metrics per session: time on pitch, notes hit, stable-pitch percent, range over time. Daily goal, soft streak with a grace day.
10. **Latency/headphone setup.** First-run "best with wired or USB-C headphones" screen, mic and output pick, a latency-offset slider with a test tone (Singing Carrots 0-300 ms [F]; Android's own guidance recommends a "Best with headphones" screen when monitoring [F]).
11. **Offline and on-device processing.** Pitch detection and storage local (fits the project's on-device-first decision; SingSpark advertises this [V]).
12. **Korean and English UI and coaching text**, per project decision.

### 3.2 Differentiators worth considering

- **Shared journaling tie-in.** A short voice note or mood tag after practice; link takes to the journal. No studied app does this [I].
- **Walk-and-sing and conversational coach.** Hands-free, earbud-based warm-up while walking (GPS/walking is already in Voice Life Companion). Needs the Bluetooth caveats in 3.4. Fits the project's selected combined scope.
- **Spoken, specific coaching.** The conversational layer explains what the graph showed ("you drift flat on the third note of the phrase"), addressing the "score without explanation" complaint [A]. Verify on-device LLM feasibility in [on-device-llm.md](../on-device-llm.md).
- **Per-note diagnostics.** Systematic offset (always flat on high notes), vibrato rate and extent, onset scoop, stability. Pitch-monitor apps show vibrato and drift [F]; coaching apps rarely summarize it [I].
- **Original, license-free content with a Korean-friendly style.** Folk-style and original melodies; user-supplied songs; avoid K-pop licensing.
- **Cheap or one-time pricing and transparent plans.** Complaints about paywalls and hidden prices recur [A]; SingSpark's $5.99 lifetime and Swiftscales' $6.99 one-time show price points users accept [F].
- **Speech-clarity exercises** (Vocal Image style tongue twisters) as a bridge to the speech side of the product [I].
- **Mic-quality guidance.** Check noise level and clipping before a session and tell the user plainly; noisy-room misdetection is a repeated complaint [A].

### 3.3 UX pitfalls to avoid

1. **Hard paywall before any value** (no free songs, unclear subscription before download): recurring complaint on Simply Sing and Sing Sharp [A].
2. **Ads between exercises** (Sing Sharp [A]).
3. **Hidden or unstable pricing** (Singing Carrots' quiz-only prices, Yousician tier churn [F/A]).
4. **Coarse range presets** instead of a measured range (Sing Sharp [A]).
5. **Pitch detection octave and half-step errors with no user recourse** (Vanido [A]). Provide a "wrong note?" correction, manual transpose, and a calibration check.
6. **Score without explanation or technique advice** (Vanido, Simply Sing [A]).
7. **No playback of your own voice or no saved recordings** (Vanido [A]).
8. **Streak pressure** (Yousician [A]). Use grace days and "practice day" credit for short sessions.
9. **Single feedback tolerance** that is too strict for beginners or too lenient for advanced; offer adjustable bands (Yousician strict vs Simply Sing forgiving [A]).
10. **Locking progress behind daily resets** (Singing Carrots resets level unlock progress daily [F]); fine for a game, annoying for a coach. Keep long-term history.
11. **Ignoring system volume/ringer state** (Swiftscales silent until ringer raised [A]); play audio through the media stream and warn if muted.
12. **Forcing the phone speaker or built-in mic when earbuds are selected** (also a project rule: see user memory on device audio tests).
13. **Sign-in walls** (Vanido login loops [A]). Local-first, account optional.

### 3.4 Technical notes

#### Real-time pitch detection

- **YIN / pYIN.** YIN is a time-domain autocorrelation-family method; pYIN adds probabilistic voicing and Viterbi smoothing. Per the CREPE authors, pYIN was the best prior heuristic method ([CREPE paper](https://arxiv.org/pdf/1802.06182) [F]). Streaming YIN needs only one analysis window of about 2-3 periods of the lowest pitch plus a hop; for male voices down to about 80 Hz a 40-50 ms window is typical [I]; actual latency depends on implementation. Full pYIN's Viterbi pass is offline or needs a lag buffer [I].
- **CREPE.** CNN on the raw waveform; reported as accurate and noise-robust (above 90% raw pitch accuracy at 10 cents) but about 22M parameters ([CREPE paper](https://arxiv.org/pdf/1802.06182) [F], parameter count via [SwiftF0 paper](https://arxiv.org/pdf/2508.18440)). In the SwiftF0 paper's CPU benchmark on a 5 s clip: CREPE about 5508 ms, pYIN about 1421 ms, PENN about 919 ms, YAAPT about 319 ms, SWIPE about 133 ms, SwiftF0 about 132 ms (summaries differ slightly) [F, author-run batch timings, not streaming latency]. Conclusion [I]: full CREPE is too heavy for mobile real-time; the "tiny" CREPE variants and small models are the practical neural options.
- **SwiftF0** (2025): about 96k parameters, reported 91.8% harmonic mean at 10 dB SNR ([arXiv 2508.18440](https://arxiv.org/pdf/2508.18440)) [V/F paper claim]. Candidate for the noisy-environment case; needs an on-device test (ONNX/TFLite on target Android phones).
- **Recommendation [I].** Start with a streaming YIN-family detector in native code (C++ via JSI or a native module) for lowest latency and battery; add a tiny neural estimator as an optional "noisy room" or refinement path; apply median smoothing and hysteresis for voicing; show cents error not raw Hz. Evaluate with recorded Korean and English voices, including quiet and noisy rooms, before committing.
- **Octave errors.** Track pitch continuity (penalize jumps of more than an octave in one hop) to avoid the half-step/octave glitches reported for Vanido [A].
- **Audio source.** Android advises the `VOICE_RECOGNITION` preset to avoid processing when recording and suggests a "Best with headphones" screen for monitoring apps ([Android NDK latency guide](https://developer.android.com/ndk/guides/audio/audio-latency) [F]). Note that voice-recognition processing may still include noise suppression or AGC on some devices [I]; test with and without.

#### Latency numbers (Android)

- [F] Android CDD specifies round-trip latency of 20 ms or lower for compatible pro-audio devices ("musicians generally require 10 ms"); `android.hardware.audio.low_latency` indicates continuous output latency of 45 ms or less; `android.hardware.audio.pro` indicates round-trip of 20 ms or less. There is no runtime API for the latency of an arbitrary path ([Android NDK guide](https://developer.android.com/ndk/guides/audio/audio-latency)). So: measure, don't assume.
- [I] A visual pitch trace is tolerant: about 50-100 ms from voice to screen is not noticeable to a singer. Latency matters mostly for (a) hearing your own voice in the headphones (monitoring) and (b) aligning a recorded take with the backing track.

#### Why headphones matter

- [I] If the backing track plays from the phone speaker, the mic hears it too. The pitch detector then sees a mix of voice and instrument, which breaks monophonic detection, and the recording contains the backing. Headphones remove the acoustic path. With a metronome-only mode the problem is smaller but still present for loud clicks.
- [A] Vanido users reported the app picking up its own audio ([aggregator](https://justuseapp.com/en/app/1130249200/vanido-learn-to-sing/reviews)); Yousician users report noisy-room problems ([BloomVocal](https://www.bloomvocal.site/en/blog/yousician-review-2026)).
- [F] Yousician says an external mic improves results ([yousician.com/voice](https://yousician.com/voice)). Android recommends headset use when monitoring ([NDK guide](https://developer.android.com/ndk/guides/audio/audio-latency)).
- Mitigation [I]: headphone detection at start; warn when the speaker is the output and a backing track is on; optionally use echo cancellation (AEC) as a fallback, accepting some voice coloration; recommend a click-only mode for speaker use.

#### The Bluetooth problem

- [F] Singing Carrots offers a 0-300 ms audio-latency compensation setting aimed at Bluetooth delay ([docs](https://singingcarrots.com/docs/singing-carrots-pitch-training)). This is the strongest evidence of what apps do in practice.
- [A/V] A karaoke how-to from an audio-accessory vendor says basic Bluetooth is roughly 150-200 ms and aptX Low Latency up to 40 ms or less ([Avantree](https://avantree.com/blogs/knowledge/how-to-do-karaoke-at-home-with-simple-equipment)); vendor figure. The 150-300 ms range in the brief is consistent with this but no neutral measurement source was found; treat 150-300 ms as an estimate.
- [A] Smule users report vocals drifting behind the backing track even with the sync slider on both wired and Bluetooth setups ([review analysis](https://unstar.app/blog/smule-starmaker-yokee-wesing-singa-karaoke-apps-ranked-2026)).
- Generic advice [F/V]: use wired or USB-C earbuds, use the app's latency calibration if present, or try a low-latency mode on the earbuds ([troubleshooting guide](https://www.itechguides.com/how-to-reduce-bluetooth-earbud-audio-lag-on-android/)). Latency varies by phone and earbud pair (one user reports 200 ms on a PC but none noticeable on an Android phone with the same earbuds [A]).
- **HFP mic is narrowband.** [F] HFP's mandatory codec is CVSD at 8 kHz; the wideband option is mSBC at 16 kHz, used only if negotiated and some phones default to CVSD ([applied-ee notes](https://applied-ee.github.io/embedded/docs/audio-projects/bluetooth-audio/hfp-voice-calls/), [Microsoft docs](https://learn.microsoft.com/windows-hardware/drivers/bluetooth/bluetooth-classic-audio); sources disagree on codec naming). 8 kHz sampling limits audible content to about 4 kHz, which loses harmonics; for pitch (f0 under about 1 kHz) it may still be usable, but timbre, resonance and brightness analysis will be poor [I]. Also, using a Bluetooth mic usually switches the headset from stereo A2DP to the call profile, degrading music quality [I; general behavior, confirm on target devices].
- **What apps advise (summary).** No studied app gives detailed Bluetooth guidance beyond a latency slider and "use wired" [F/A]. Erol lists Bluetooth audio support without detail [F].
- **Design recommendation [I].**
  - Default: phone's built-in mic or a wired headset mic for capture; Bluetooth earbuds for output only (A2DP), with a user-calibrated offset for the visual playhead and for recording alignment.
  - Do not route capture through the earbud mic for analysis unless the user chooses it; label it "voice-call quality, pitch only".
  - Provide a one-tap "calibrate latency" test (play click, record via mic, measure), plus a manual slider as in Singing Carrots.
  - Hide live self-monitoring over Bluetooth (the ear will hear voice 150+ ms late); rely on the visual graph and offer post-take playback instead.
  - Check `audio.low_latency` and `audio.pro` flags and expose a "this phone is good/bad for live monitoring" hint.
  - Cross-check with [earbud-compatibility.md](../earbud-compatibility.md), which covers the project's earbud decisions.

## 4. Open questions for follow-up

1. Hands-on test of 3-4 apps (Singing Carrots, Yousician, SingSpark, Sing Sharp) on an Android phone with built-in mic, wired, and Bluetooth earbuds, measuring perceived latency and mic behavior.
2. Play Store availability and Korean-language reviews for the Korean apps above; confirm any local newcomer.
3. Reddit and Korean community threads (r/singing, r/vocaltechnique, DC Inside, Naver Cafe) for first-hand complaints.
4. Benchmark streaming YIN vs a small neural pitch model on target Android devices for latency, battery, and octave-error rate with Korean voices.
5. Check whether the voice-recognition audio source on target devices applies AGC or noise suppression that distorts level graphs.
6. Decide whether the level graph is dB-based or perceptual (LUFS-style), and how it should treat HFP narrowband input.

## 5. Source list (all accessed 2026-11-07)

- Android audio latency guide: https://developer.android.com/ndk/guides/audio/audio-latency
- CREPE paper: https://arxiv.org/pdf/1802.06182
- SwiftF0 paper: https://arxiv.org/pdf/2508.18440
- Singing Carrots docs and pricing: https://singingcarrots.com/docs/singing-carrots-pitch-training, https://singingcarrots.com/docs/singing-carrots-vocal-range-test, https://singingcarrots.com/pro
- Yousician: https://yousician.com/voice
- App Store listings: Simply Sing https://apps.apple.com/ie/app/simply-sing/id1592900217; Sing Sharp https://apps.apple.com/us/app/id772052329?l=en-us; SingSpark https://apps.apple.com/app/id6767637172; Erol https://apps.apple.com/us/app/id502780186; Swiftscales https://apps.apple.com/us/app/id1079277628?l=en-us; Vocal Image https://apps.apple.com/us/app/vocal-image-ai-voice-coach/id1535324205
- Third-party reviews (anecdote or competitor-written): https://www.bloomvocal.site/en/blog/yousician-review-2026, https://singingcarrots.com/blog/top-7-ai-vocal-coaches/, https://americansongwriter.com/simply-sing-review/, https://americansongwriter.com/yousician-singing-review/, https://justuseapp.com/en/app/1130249200/vanido-learn-to-sing/reviews, https://unstar.app/blog/smule-starmaker-yokee-wesing-singa-karaoke-apps-ranked-2026, https://preply.com/en/blog/best-singing-learning-apps/
