# Audio separation SaaS: personas and user stories

**Status: exploration, 2026-11-04.** The user picked the sound-separation topic from the [AI media SaaS screening](../../market-studies/ai-media-saas-screening/ai-media-saas-idea-screening.md) and asked for personas and user stories, so that real use cases can be simulated before anyone commits to building an MVP.

The personas are **composite hypotheses**. They are built from that screening research and the [Gaudio Lab and separation market study](../../market-studies/audio-video-separation/gaudio-lab-and-ai-separation-market.md). Nobody has interviewed these people yet. Every price, frequency and willingness-to-pay figure below is a hypothesis to test unless a link says otherwise.

## Scope

**Product shape**, taken from the screening shortlist: one separation engine with three entry products. Each entry product gets its own landing page.
1. **People who film people.** Keep or remove one person's voice, including the camera holder's, or split a recording into one track per speaker.
2. **Creators publishing videos.** Separate voice, music and sound effects, for example to remove the music but keep the voice and other sounds.
3. **Musicians, singers and teachers.** Pull out any instrument, or an individual singer when the singers take turns.

**Inputs:**
- Audio or video, uploaded by the user. The product does not fetch from YouTube links.

**Ways to choose a sound (prompts):**
- **Click** a face or a player in the video.
- **Mark** a moment ("this voice at 0:42").
- **Describe** it in text ("the acoustic guitar", "the voice near the camera").
- The engine itself is Meta's SAM Audio, which accepts text, visual and time-span prompts. It needs a prompt to separate anything. Our computer-vision and audio-tagging layer therefore proposes the prompts, so the user starts from a list of detected sources rather than a blank page.

**Outputs:**
- A remixed MP4 with original video and new audio.
- WAV stems.
- One track per speaker.
- A level control for each source, because users often want to keep some ambience rather than a dry voice.

**Out of scope:**
- **Harmony groups and unison choruses** (user decision, 2026-11-04: too difficult). Sections where several singers sing together are shown as "group section, not separable".
- **A single instrument inside an orchestra.** Meta says this is still a challenge ([The Register, 2025-12-16](https://www.theregister.com/2025/12/16/meta_sam_ai_audio/)).
- **Real-time processing** (see the team's earlier ad-replacement experience).
- **Fetching media from platform links.**

**Concert sing-along (user decision, 2026-11-04):** kept as a case. Fans' singing goes into "others"; leakage is expected where it is near-unison with the performer.

## Persona summary

| ID | Persona | Entry product | Core job | How often | How they would pay [hypothesis] | Priority |
|---|---|---|---|---|---|---|
| P1 | Street-interview Shorts creator (Seoul) | 1 | Keep the interviewee and themselves; remove passers-by and shop music | Daily | Monthly, $15–25 | High |
| P2 | Wedding and event videographer (US, solo) | 1, 2 | Rescue a toast or vows from camera audio under DJ music and crowd noise | 30–40 events a year, in batches | Monthly, $30–60, or per job | High |
| P3 | Interview podcaster or oral-history journalist | 1 (audio) | Split a single-mic interview into one track per speaker, including crosstalk | Weekly | Monthly, $20–30 | High |
| P4 | Freelance VOD highlight editor for a Chzzk or SOOP streamer | 2 | Strip music from VOD segments; keep the voice, game sound and alerts | Several videos a week | Monthly, $20–40, possibly paid by the streamer | High |
| P5 | Parent filming a child's recital, game or taekwondo demo | 1 | Remove their own and other parents' chatter; keep the performance | A few times a year | Per video, $5–10 | Medium (distribution engine) |
| P6 | K-pop cover singer, vocal student or vocal teacher | 3 | Isolate one member's lines, or remove them to sing along | Weekly | $5–10 a month (students); about $20 (teachers) | Medium (demand unmeasured) |
| P7 | Hobby guitarist learning songs by ear | 3 | Isolate "the second guitar" from a two-guitar song; click the guitarist in a live video | Weekly | $5–10 a month | Medium (crowded) |
| P8 | Shop or café owner posting Reels | 2 | Remove in-store music so the clip can be posted with licensed platform music | Weekly | Free tier, then about $5 | Low (free-tier funnel test) |

The priority scores four things together:
- the user's product thesis (helps people make money, tedious work, an individual buyer);
- how often the job recurs, since that limits churn;
- how feasible it is technically;
- how reachable the persona is.

P5 is ranked for its shareable before/after "wow", not its revenue.

---

## P1. Street-interview Shorts creator (Seoul)

**Who.** Min-jun, 29. Runs a street-interview Shorts channel with about 50K subscribers. Posts 3–5 Shorts a day, each 30–90 s, cut from 5–10 minutes of raw footage. Earns from Shorts revenue and brand deals.

**Setup.**
- Galaxy or iPhone, sometimes with a wireless lav clipped on the interviewee, often without.
- Busy areas such as Hongdae, Gangnam and Seongsu: buskers, shop music, crowds, and the interviewee's friends talking.
- His own questions come from off-screen, so he is the camera holder.

**Current workaround and why it fails [hypothesis].**
- Noise removal in CapCut or Adobe keeps every voice, so a passer-by talking over the answer stays.
- Adobe Enhance Speech can sound robotic ([Adobe community, 2025](https://community.adobe.com/t5/adobe-podcast-discussions/is-enhance-speech-really-that-bad/m-p/15148784/highlight/true)).
- He falls back on burned-in subtitles or a reshoot.
- Shop music in the background is also a copyright risk.

**Stories.**
- **US-1.1. Keep the interviewee.** As a street-interview creator, I want to click the interviewee's face and keep only their voice, so the answer is clear even when strangers talk nearby.
  - The answer is intelligible without subtitles, and passers-by are inaudible at normal listening volume.
  - No robotic or warbling artifacts. Lip sync is unchanged.
  - A 90 s clip processes in under 2 minutes.
- **US-1.2. Keep me too.** As the camera holder, I want to keep my own questions as well as the interviewee and drop everyone else, so the exchange stays natural.
  - The camera holder can be picked by marking one of their questions, or from the suggested source "voice near the camera (probably you)".
- **US-1.3. Remove the shop music.** I want the shop's music gone and some street ambience kept, so the Short isn't claimed and still sounds like the street.
  - A level slider for "street ambience" goes from 0 to 100%.

**Simulated session.**
1. He uploads a 6-minute MP4 from his phone gallery through the mobile web app. To keep the upload small, the app extracts the audio and a low-resolution proxy video in the browser and uploads those [design hypothesis].
2. The app lists the detected sources: 3 faces, "voice near the camera", "music", and "crowd".
3. He taps the interviewee's face (keep), "voice near the camera" (keep), "music" (remove), and sets "crowd" to 20%.
4. He gets a free 30-second preview. He compares it with the original using an A/B toggle.
5. He exports an MP4 and opens it in CapCut to cut the Short.
6. **Decision point:** if two of his first three clips work, he subscribes, because he publishes daily.

**Hard cases.**
- A passer-by with a voice similar to the interviewee's (same gender and age), the "highly similar sources" problem.
- The interviewee turns away from the camera.
- Overlapping speech.
- A distance of 2 m with no lav.

**Test clips.**
- **Real:** 5 street clips with 2–3 friends acting as interviewee, camera holder and passers-by.
- **Synthetic with ground truth:** put a lav on the interviewee while the phone records. The lav track becomes the reference for scoring what the app extracts from the phone mic.
- **Synthetic mixes:** mix in separately recorded passer-by speech and music at 0 and −5 dB.

## P2. Wedding and event videographer (US, solo business)

**Who.** Daniel, 34. Films 30–40 weddings a year and delivers 4–8 weeks later. Each wedding brings in several thousand dollars [estimate].

**Setup.**
- Two or three cameras with on-camera mics, plus a lav or recorder on the groom or officiant that sometimes fails or never gets clipped on.
- Toasts happen near the DJ's speakers, with the guests' chatter and the room's echo on top.

**Current workaround.**
- iZotope RX, which is expensive and takes skill.
- Adobe Enhance Speech, or DaVinci Resolve Studio's Voice Isolation ($295 licence).
- Manual editing.
- Or he tells the couple the audio failed.

**Stories.**
- **US-2.1. Rescue the toast.** As a wedding videographer, I want to pull the best man's toast out of my camera audio when the DJ music and guests are loud, so I can deliver it without apologising.
  - The result sounds natural, not dry or robotic.
  - It works on 10–20 minute speeches.
  - The output is a WAV that matches the source length exactly, so it drops onto the Premiere or Resolve timeline in sync.
- **US-2.2. Keep the room.** I want the speaker plus the room's laughter and applause, without the DJ music, so the moment still feels alive.
  - Typing "laughter and applause" keeps them, with a level control.
- **US-2.3. Batch the reception.** I want to queue all the speeches from one wedding overnight and get stems in the morning.

**Simulated session.**
1. He uploads 4 camera files (2–3 GB each) from his desktop. Large uploads must resume after a dropped connection.
2. He marks a moment in the first speech: "the speaker at 00:01:12". The app proposes the same voice in all 4 files.
3. He removes "music", keeps "laughter and applause" at 40%, and queues the batch.
4. In the morning he downloads the WAVs and drops them on his timeline.
5. **Decision point:** a single rescued toast justifies a month's subscription, because it saves a client relationship.

**Hard cases.**
- The voice comes out of the PA speakers as well, so it is doubled and delayed.
- The DJ plays songs with vocals.
- Ballroom reverb.
- Speeches that run longer than 20 minutes.

**Test clips.**
- **Real:** event recordings if the user or a contact has any, used with consent.
- **Synthetic:** clean speech convolved with a ballroom impulse response, plus party crowd noise and a song with vocals.

## P3. Interview podcaster or oral-history journalist

**Who.** Sarah, 41. Publishes a weekly interview podcast. She often records in person on one recorder or a phone placed on a café table.

**Setup.**
- Two or three speakers on one microphone.
- Crosstalk and laughter.
- Café music and espresso machines.
- 30–90 minute files.

**Current workaround.**
- Descript transcribes and edits but cannot split overlapping speech into separate tracks.
- AudioShake sells multi-speaker separation, but mainly as a pay-as-you-go API for businesses [vendor claim] ([AudioShake developer](https://developer.audioshake.ai)).
- Otherwise she edits manually.

**Stories.**
- **US-3.1. Speaker split.** As a podcaster, I want my single-mic interview split into one track per speaker, including when we talk over each other, so I can edit and level each voice as if it were a multitrack recording.
  - Each track contains only that speaker, with the others clearly reduced.
  - All tracks are time-aligned and exported as a multitrack WAV.
  - Processing is faster than real time.
- **US-3.2. Name the speakers.** I want to name each speaker once, from a 3-second sample the app picks, and have the names carry into the export and an optional transcript.
- **US-3.3. Remove the café.** I want the café music and machine noise removed from all tracks.

**Simulated session.**
1. She uploads a 70-minute M4A.
2. The app clusters the voices into 3 speakers, plays a short sample of each, and she names them.
3. The app flags overlap regions and shows a confidence score for each.
4. She exports the multitrack WAV and imports it into her editor.
5. **Decision point:** she repeats this every week, so a subscription makes sense. Churn depends on quality during crosstalk.

**Hard cases.**
- Two speakers with similar voices.
- Laughter over speech.
- Long files, where compute cost becomes a factor.

**Test clips.**
- **Synthetic:** record two people separately, each on their own lav, while they talk together. The lav tracks serve as ground truth for the table-mic mix.
- **Real:** a 10-minute café conversation.

## P4. Freelance VOD highlight editor for a Chzzk or SOOP streamer

**Who.** Ha-neul, 26. Edits 1–3 YouTube highlight videos a week from a streamer's 6-hour VODs on Chzzk (Naver) or SOOP. Paid per video by the streamer. The rate is unverified.

**Setup.**
- The streamer plays K-pop or other background music on stream.
- YouTube claims trigger demonetisation, or the music gets muted.
- The VOD also contains the streamer's voice, game sound, and donation-alert text-to-speech.
- On Twitch, VODs are muted and clips are deleted when copyrighted audio is detected ([Twitch](https://www.twitch.tv/p/en/legal/community-guidelines/music)). Korean platforms' policies were not checked [gap].

**Current workaround.**
- Muting sections, or replacing them with royalty-free music by hand.
- YouTube Erase Song after upload. It works only on claimed videos and can mute rather than erase ([TechCrunch, 2024-07-05](https://techcrunch.com/2024/07/05/youtubes-updated-eraser-tool-removes-copyrighted-music-without-impacting-other-audio)).

**Stories.**
- **US-4.1. Remove the music, keep everything else.** As a highlight editor, I want the background music removed from a 1–3 hour VOD segment while keeping the streamer's voice, game sound and alerts, so the upload isn't claimed and I don't have to rebuild the timeline.
  - After processing, an unlisted test upload gets few or no claims (see the Content ID gate).
  - The voice is unchanged.
  - Game sound effects are kept.
- **US-4.2. Stems for my editor.** I want separate voice, game/effects and music stems, aligned with the source, to import into Premiere.
- **US-4.3. Overnight batch.** I want to queue 10 segments and get them back the next morning.

**Simulated session.**
1. She uploads a 2-hour MP4 segment. A long upload and processing queue is the norm for this persona.
2. The app detects "speech", "music with vocals", "game sounds" and "TTS alert".
3. She removes "music with vocals" and keeps the rest.
4. She downloads the stems and edits as usual.
5. **Decision point:** each claim avoided protects the streamer's revenue, so she may expense the subscription to the streamer.

**Hard cases.**
- The streamer talking over a K-pop vocal: speech against singing.
- In-game music that is also claimable.
- Leftover music that still matches Content ID.

**Test clips.**
- Own recordings: speech over a commercial track plus game audio.
- Upload unlisted to YouTube and count claims (the Content ID gate in the screening).

## P5. Parent filming a recital, game or taekwondo demo

**Who.** Ji-eun, 38. Films her child's piano recital, school play, football game or taekwondo demonstration on her phone, and shares it with grandparents and a family chat.

**Setup.**
- The phone is in her hand, so her own voice and her spouse's are the loudest sources. Her voice is near the microphone.
- Other parents chatter, and people clap and cheer.
- Clips are 3–10 minutes long.

**Current workaround.** She lives with it, mutes the clip and adds music, or doesn't share it.

**Stories.**
- **US-5.1. Remove us.** As a parent, I want my own voice and nearby parents' chatter removed from my child's recital video, so the performance is what we hear.
  - The piano or the performer sounds intact, with no warbling.
  - Chatter can't be heard at normal volume.
  - It works from a phone browser, and the large video upload is handled.
- **US-5.2. Keep the cheering.** At a game, I want the crowd cheering kept but our own conversation removed.

**Simulated session.**
1. She opens the link from her phone and picks a 4-minute video (about 300 MB). The browser extracts the audio and a low-resolution proxy before uploading.
2. The app suggests "voice near the camera (probably you)", "people talking", "piano" and "applause".
3. She taps remove on the first two.
4. She plays the free preview, pays about $5–10 (or ₩5,000–9,900) for this video, and shares the MP4.
5. **Decision point:** this is a one-off emotional purchase. The share loop of the before/after is the distribution value [hypothesis].

**Hard cases.**
- A spouse or child speaking at a similar distance to the camera.
- A performer who is singing rather than playing an instrument.
- A parent singing along with the performer, which is near-unison and a stretch test only.

**Test clips.**
- **Real:** a piano piece (live, or played through a speaker) with two people talking near the phone.
- **Synthetic:** a clean performance recording plus speech recorded close to the phone.

## P6. K-pop cover singer, vocal student or vocal teacher

**Who.**
- Yuna, 22. A vocal-academy student who posts covers on TikTok and YouTube. She practises one member's part in group songs.
- Variant: her vocal teacher, who prepares practice tracks for several students.

**Setup.** Group songs where members take turns singing lines, with ad-libs that overlap. Chorus sections where everyone sings together are out of scope by user decision.

**Current workaround.**
- LALAL.AI's Lead & Back Vocal Splitter separates the lead and background layers, not individual singers ([LALAL.AI](https://www.lalal.ai/lead-back-vocals-remover/)).
- Guides say duets come out as a single "vocals" stem and need manual work in a DAW ([guide](https://macmyths.com/how-to-separate-multiple-singers-with-ai-on-mac-iphone-and-ipad/)).

**Stories.**
- **US-6.1. Only her lines.** As a cover singer, I want only member X's lines from a group song, so I can learn her exact phrasing and ad-libs.
  - Marking one of her lines finds all her other lines (singer clustering).
  - Her lines are clean enough to study the phrasing.
  - Group sections are labelled "group, not separable" rather than returned with silent errors.
- **US-6.2. Sing with the group.** I want the song with member X's lines removed and everything else kept, so I can sing her part with the rest of the group.
- **US-6.3. Use the music video.** I want to upload a music video and tap the member while she is on screen, so I don't need to know the timestamps. Members are usually on screen during their own lines, which helps tell them apart [hypothesis].
- **US-6.4. Teacher batch.** As a vocal teacher, I want to make "minus one member" tracks for several students and songs at once.

**Simulated session.**
1. She uploads an audio file she owns, or an MV file.
2. She marks "her line at 0:35". The app highlights every line it thinks is hers on the waveform, and she can correct each one.
3. She exports "her lines only" and "minus her lines".
4. **Decision point:** she buys monthly during practice periods. The teacher variant is steadier and pays more.

**Rights.** Same posture as Moises and LALAL.AI: users upload their own files, for personal practice. Publishing a cover is the user's responsibility. Check cover-licensing norms on Korean platforms [gap].

**Hard cases.**
- Members with similar voices.
- Heavy processing such as autotune and doubled vocals.
- Harmony stacked under the lead line.

**Test clips.** Two friends record alternating lines over an instrumental, each on a separate track, which gives ground truth. Then one real group song the team owns, for subjective rating.

## P7. Hobby guitarist learning songs by ear

**Who.** Tom, 45. Learns songs by ear and already uses Moises or a similar app.

**Setup.**
- Many songs have two guitars, rhythm and lead, which come out together in one "guitar" stem.
- Live performance videos where the guitarist is sometimes visible.

**Current workaround.**
- Moises, LALAL.AI, or free UVR/Demucs, which use fixed stem menus.
- Suno's Advanced Split offers about 100 instruments, but Suno says it "regenerates each stem from scratch" ([Suno, 2026-06-11](https://suno.com/blog/stem-separation-updates)).

**Stories.**
- **US-7.1. The second guitar.** As a guitarist, I want to type "the acoustic rhythm guitar" and hear only that part from a two-guitar song, so I can work out what it plays.
  - The named part dominates and the other guitar is reduced enough to transcribe.
  - It is the original recording, not a regenerated copy, with no pitch or timing artifacts.
- **US-7.2. Click the player.** In a live video, I want to tap the guitarist to isolate their guitar.
- **US-7.3. Practise.** Looping and slowing down a section. This may be out of MVP scope, since it can be handed off to existing practice apps.

**Simulated session.**
1. He uploads a song.
2. The app proposes detected instruments.
3. He types "acoustic guitar, strummed" and exports the result.
4. **Decision point:** he compares it with Moises. He switches only if this gives him the specific part Moises can't.

**Hard cases.**
- Two guitars with similar tone.
- Double-tracked parts.
- A keyboard and guitar playing the same chords.

**Test clips.** Songs for which multitrack stems exist with licences that allow evaluation, plus a few self-recorded two-guitar pieces.

## P8. Shop or café owner posting Reels

**Who.** So-young, 35. Posts store Reels several times a week. The store's speakers play K-pop.

**Stories.**
- **US-8.1. Remove store music.** As a shop owner, I want one tap to remove the background music from a 15–60 second Reel, so I can add Instagram's licensed music and avoid being muted.
  - Works on mobile and processes in under a minute.

**Why low priority.**
- Willingness to pay is low.
- CapCut already offers voice isolation and vocal removal, though export may need a subscription ([CapCut](https://www.capcut.com)). That is a vendor claim from the earlier study.

**Why it is included.** It tests the free-tier funnel and the "one-tap" landing-page conversion.

---

## Requirements shared across personas (MVP candidates)

| # | Requirement | Needed by |
|---|---|---|
| R1 | Upload audio or video: phone clips up to about 1 GB, desktop files of several GB with resumable upload, and lengths up to 3 hours | All; long files for P2, P3, P4 |
| R2 | Browser-side extraction of the audio plus a low-resolution video proxy, so only that is uploaded and the full original stays on the device [design hypothesis] | P1, P5, P8 |
| R3 | A list of detected sources (faces, "voice near the camera", speech, music, effects, instruments), used as suggested prompts | All |
| R4 | Three ways to prompt: click a face or player, mark a moment, describe in text | All |
| R5 | Keep or remove each source, plus a level slider for it | All; ambience levels for P1, P2, P5 |
| R6 | Speaker and singer clustering ("find all lines by this voice"), with corrections on the waveform | P2, P3, P6 |
| R7 | Free 30-second preview with an A/B toggle; pay to export | All |
| R8 | Exports: remixed MP4, WAV stems, and multitrack WAV with exactly the same length as the source | All; P2, P3, P4 for editors |
| R9 | Overnight batch queue | P2, P4, P6 (teacher) |
| R10 | Explicit "not separable" labels (group singing, overlap with low confidence) instead of silent failure | P3, P6 |
| R11 | Privacy: automatic deletion after N days and no use of uploads for training without opt-in | P2 (client footage), P5 (children) |
| R12 | Pricing: per-video purchases and monthly plans | P5 per video; the rest monthly |

## Simulation plan

The goal is to replay each story with realistic clips before building the full product, and to measure whether the result would satisfy that persona.

1. **Clip sets for each story.** Use 3–5 real clips and 3–5 synthetic mixes with ground truth.
   - **Lav-reference trick:** record the target person on a lav while the phone records the scene. The lav track then serves as near ground truth for scoring what the app extracts from the phone mic. This works for P1, P2, P3 and P5.
   - For singers (P6), record each singer on their own track and mix them afterwards.
2. **Baselines for each persona,** using the tool that persona would try first:

   | Persona | Baselines |
   |---|---|
   | P1 | CapCut, Adobe Enhance Speech |
   | P2 | Adobe, DaVinci Resolve Voice Isolation, iZotope RX if available |
   | P3 | AudioShake (if trial access allows), Descript |
   | P4 | YouTube Erase Song |
   | P5 | Samsung Audio Eraser on a Galaxy, iPhone Audio Mix where possible |
   | P6 | LALAL.AI Lead & Back Vocal Splitter |
   | P7 | Moises, LALAL.AI, Suno |
   | P8 | CapCut |

3. **Metrics:**
   - SI-SDR improvement on synthetic clips.
   - Blind preference against the baseline, from 5–10 raters.
   - "Usable without apology" rate, judged per persona.
   - Recall and precision of the target lines (P3, P6).
   - Processing time and GPU cost per audio minute.
   - Content ID claim rate (P4).
4. **Pass bar for a story:**
   - The prototype wins the blind preference on at least 60% of that story's clips.
   - At least half the clips are rated usable without apology.
   - These are the bake-off thresholds from the screening.
5. **Order of work:**
   - First wave: P1, P2, P3, P4, the high-priority jobs that link to income.
   - Second wave: P6, P7.
   - P5 runs alongside the first wave as the shareable demo.
   - P8 is checked only through a landing-page test.
6. **After the clips: the session simulation.** Walk through each persona's simulated session in a clickable prototype and time the steps. Record where a first-time user would stall: upload size, the source list, the prompt choice, the preview.

## User decisions on the open questions (2026-11-04)

1. **Concert sing-along:** a good case to keep. Fans' singing is simply classified as "others"; the product does not try to identify every sound. See the targets-plus-others model in [demo-plan.md](demo-plan.md).
2. **Demo scope:** P1 to P7. All 8 personas stay; P8 is not in the demo.
3. **Functionality first:** landing pages and demand tests are deferred.
4. Real clip recording (lav-reference clips, event footage, VOD segments) is not yet decided. Synthetic clips with ground truth come first.
