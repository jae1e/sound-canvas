# Physical-AI language data capture: robot learning (VLA), autonomous driving, manufacturing context logging

Research date: 2026-11-05. Web research only, done in one session with about 40 search and fetch calls.

Labels:
- [F]: verified on a primary source (paper abstract or HTML, official docs, company blog or docs) fetched or extracted this session.
- [V]: vendor claim about its own product.
- [P]: press or third-party summary.
- [A]: anecdote.
- [E]: estimate.
- [H]: hypothesis or inference.

"(search extract)" means only a search-engine extract of the page was seen, not the full page. "(older)" flags material from before 2025.

Scope note: other researchers cover field-safety and frontline voice-documentation competitors, ASR technology, and sync, architecture and legal topics. Those areas are touched here only where they bear on physical-AI data pipelines.

---

## Q1. Robot learning and VLA: how is language attached to robot data, is it dense, and is any of it live speech?

### Takeaway
Most large robot datasets attach language after collection, with little or no live speech. The usual forms are one typed task instruction per episode, crowdsourced re-labels, or, increasingly, VLM auto-labels.

The research trend since 2024 is denser, hierarchical language: subtasks, plans, interjections and corrections. A few influential systems capture or simulate spoken language from the operator or user:
- YAY Robot: live narration through a microphone, a foot pedal and Whisper.
- RT-H: language-motion corrections.
- pi0.5: "verbal instructions" coaching.
- Hi Robot: interjections.
- Ego-Exo4D: spoken expert commentary.

Standard tooling has no first-class capture of spoken operator narration. LeRobot's new "speech" field is the robot's own `say` tool-call. Foxglove can replay audio in MCAP, but nothing turns it into labels.

### Cited Findings

**Live speech during teleoperation: the clearest precedent is YAY Robot (older, March 2024)**
- [F] YAY Robot (Shi, Hu, Zhao, Sharma, Pertsch, Luo, Levine, Finn; arXiv 2403.12910, submitted 2024-03-19) used live narration during data collection. The paper says: "By placing a microphone near the robot, the operator can narrate the skill they are performing in real-time." It continues: "The recorded audio is then transcribed into text using the Whisper" model. [arXiv HTML](https://arxiv.org/html/2403.12910v1); [abstract](https://arxiv.org/abs/2403.12910)
- [F] YAY Robot used foot pedals. An instruction pedal marks a new skill and a correction pedal marks a needed correction, which lets the authors filter out segments leading up to corrections. The appendix gives the sequence: the operator presses the pedal, speaks the command, releases the pedal, then demonstrates with leader arms. Transcribed audio is "synchronized with the robot's trajectory", but the alignment method is not described. [arXiv HTML](https://arxiv.org/html/2403.12910v1)
- [F] YAY Robot data scale: Bag Packing 1,170 trajectories (41,517 skill segments), Trail Mix 317 (7,008), Plate Cleaning 265 (3,236). These are dense, step-level language labels produced by live speech. [arXiv HTML](https://arxiv.org/html/2403.12910v1)
- [F] The YAY Robot abstract says corrections "can be readily obtained from humans observing the robot and making occasional suggestions." [arXiv abstract](https://arxiv.org/abs/2403.12910)

**Language corrections and hierarchical language (2023–2025)**
- [F] RT-H (Belkhale, Ding, Xiao, Sermanet et al.; arXiv 2403.01823, 2024-03-04, older) predicts fine-grained "language motions" such as "move arm forward" as an intermediate step. Humans can correct the policy during execution with language motions, and policies that learn from these interventions outperform those that learn from teleoperated interventions. [arXiv](https://arxiv.org/abs/2403.01823)
- [F] (search extract) OLAF, "Interactive Robot Learning from Verbal Correction" (arXiv 2310.17555, 2023, older), updates a robot policy from verbal corrections given by non-expert users. [arXiv PDF](https://arxiv.org/pdf/2310.17555)
- [F] (search extract) LILAC, "No, to the Right" (Stanford, 2022–2023, older), lets users issue real-time language corrections during shared-autonomy control. [PDF](https://iliad.stanford.edu/pdfs/publications/karamcheti2022lilac.pdf)
- [F] (search extract) arXiv 2211.00352 (older) studied the acoustic patterns of people narrating manipulation demonstrations to robots. Annotators labeled utterance start and stop times, transcriptions, and categories such as frustration and encouragement. This is evidence that the speech itself, not just the text, is studied as a signal. [arXiv PDF](https://arxiv.org/pdf/2211.00352)
- [F] Hi Robot (Physical Intelligence, published 2025-02-26) responds to real-time user interjections and corrections; for example, "that's not trash" causes a revised step, and the diagram includes a "Robot Verbal Response" output. Training language was produced by "synthetically labeling datasets — pairing robot observations and human-labeled skills with hypothetical prompts and human interjections." The page does not describe the ASR or TTS stack. [PI research page](https://www.pi.website/research/hirobot); [arXiv 2502.19417](https://arxiv.org/abs/2502.19417)
- [F] pi0.5 (Physical Intelligence blog, 2025-04-22) co-trains on several kinds of language data:
  - task prompts at multiple levels of detail;
  - subtask annotations ("observations labeled with the appropriate semantic behavior", e.g. "pick up the pillow");
  - high-level next-subtask prediction;
  - "verbal instructions", in which "a person coaches the robot through a complex task by telling it what to do step by step";
  - web multimodal data.

  This is the clearest signal from a frontier lab that step-level human verbal coaching is a training-data category. [PI blog](https://www.pi.website/blog/pi05)

**Major datasets: one instruction per episode, post-hoc labels, or VLM auto-labels**
- [F] Figure Helix (2025-02-20) used "~500 hours" of multi-robot, multi-operator teleoperated data. Language came from "an auto-labeling VLM to generate hindsight instructions" ("What instruction would you have given the robot to get the action seen in this video?"). The teleoperators did not speak the language labels. [Figure](https://www.figure.ai/news/helix)
- [F] (search extract) DROID (arXiv 2403.12945, March 2024, older) has 76k trajectories, and each episode includes language annotations. The original RLDS release contained only a subset of language labels. A December 2024 supplementary release added three natural-language annotations per episode for 75k successful episodes (about 95%). [arXiv HTML](https://arxiv.org/html/2403.12945); [HF README](https://huggingface.co/KarlP/droid/blob/refs%2Fpr%2F3/README.md)
  - [P] A third-party summary says the instructions were crowd-labeled (tasq.ai) and normalized with spaCy and GPT-4. This is unverified on the primary source. [Emergent Mind](https://api.emergentmind.com/topics/droid-a-large-scale-in-the-wild-robot-manipulation-dataset)
- [F] AgiBot World (arXiv 2503.06669, first submitted 2025-03-09, v5 2026-10-20) has more than 1M trajectories across 217 tasks in 5 deployment scenarios, with a "standardized collection pipeline with human-in-the-loop verification". The abstract does not describe how language is annotated. [arXiv](https://arxiv.org/abs/2503.06669)
- [F] EgoVerse (arXiv 2604.07607, 2026-04-08, v2 2026-07-07) contains 1,362 hours and 80k episodes of egocentric human demonstrations, covering 1,965 tasks, 240 scenes and 2,087 demonstrators. The abstract mentions "manipulation-relevant annotations" but no language or narration. [arXiv](https://arxiv.org/abs/2604.07607)
  - [V] Scale AI's blog frames EgoVerse (2026-03-25) as a Scale release that shows co-training across human and robot data improves transfer. [Scale blog](https://scale.com/blog/author/ben-levin)
- [F] (search extract) Build AI's Egocentric-10K is about 10,000 hours of head-camera factory footage across factories 001–085. It is Apache 2.0, gated on Hugging Face and stored as WebDataset. [HF dataset card](https://huggingface.co/datasets/builddotai/Egocentric-10K)
  - [P] Labellerr says Egocentric-10K covers 2,153 workers and that Build AI later released Egocentric-100K and Egocentric-1M. [Labellerr](https://www.labellerr.com/blog/egocentric-datasets-robotics/)
  - Whether it has audio or narration: not confirmed (see Gaps).
- [P] Tesla Optimus pivoted in about June 2025 from teleoperation and motion-capture suits to camera-only video of workers. The rig is five cameras on a helmet and backpack, the quota is at least 4 hours of usable video per 8-hour shift, and three workers reported motion sickness. Expansion to Austin was reported for about February 2026. This is Business Insider reporting relayed by secondary outlets; there is no mention of narration. [eWeek](https://www.eweek.com/news/tesla-optimus-robot-training/); [AOL/BI](https://www.aol.com/articles/inside-glass-walled-tesla-lab-101402958.html)

**Egocentric human-video datasets that do use spoken language**
- [F] Ego-Exo4D (arXiv 2311.18259, 2023-11-30, v4 2024-09-25, older) has 1,286 hours, 740 participants and 13 cities, with "multiple paired language descriptions" including "expert commentary" by coaches and teachers. [arXiv](https://arxiv.org/abs/2311.18259)
- [F] In the Ego-Exo4D expert commentary, domain experts (chefs, coaches, performers) paused the video and recorded verbal commentary, which was kept retrospective. The release includes "both the original audio recordings, as well as auto-transcriptions" made with Whisper, which "may contain errors." Experts could also draw on the video. This is a large, public, spoken-language-at-annotation-time precedent, but it was recorded while reviewing video, not live during capture. [Ego-Exo4D docs](https://docs.ego-exo4d-data.org/annotations/expert_commentary/)
- [F] (abstract, not re-fetched this session; older, 2018) EPIC-KITCHENS had participants narrate their own videos after recording so that labels reflect "true intention". Crowdsourced ground truth was built from these narrations. [arXiv 1804.02748](https://arxiv.org/abs/1804.02748)

**Tooling: does anything capture operator audio or language natively?**
- [F] LeRobot (Hugging Face) has `lerobot-annotate` for datasets in LeRobot format v3.1. It runs a VLM (default `Qwen/Qwen3.6-27B` on vLLM) over episode video and writes language into two parquet columns:
  - `language_persistent`: subtask, plan, memory, and `task_aug` rephrasings.
  - `language_events`: interjections, a speech tool-call atom (`say`), and VQA pairs.

  [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)
- [F] The design of `lerobot-annotate` follows Hi Robot (subtask granularity, interjection taxonomy), Pi0.7 ("how, not what" subtasks), MEM (memory) and ECoT (grounded VQA). Further details:
  - "Speech" is a robot-side tool call, `say(text)`, not recorded human audio.
  - Event rows "appear only on the one frame whose timestamp matches", and timestamps are "copied straight from the source parquet — never recomputed in floating point."
  - The validator checks that "every event row lands exactly on a real frame timestamp."
  - Cost is about 50 VLM calls per 30-second episode.
  - The documentation describes no input path for human audio recordings.

  [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline); [LeRobot "robots that talk" space](https://lerobot-robots-that-talk.hf.space/)
- [V] A FiftyOne plugin lets users hand-annotate per-episode subtask and dialogue segments and export a LeRobot v3.0 dataset. [Voxel51](https://docs.voxel51.com/plugins/plugins_ecosystem/fo_annotate_lerobot.html)
- [F]/[V] Foxglove has an Audio panel with "real-time synchronized audio playback" and waveform rendering for live or recorded streams. It requires the `foxglove.RawAudio` schema (decoded mono PCM plus sample rate and channel metadata). MCAP is a serialization-agnostic container for timestamped pub/sub data. Foxglove can therefore store and replay operator audio next to robot topics, but it does not turn it into language labels. [Foxglove blog](https://www.foxglove.dev/blog/announcing-audio-panel); [Foxglove MCAP blog](https://foxglove.dev/blog/mcap-and-the-foxglove-sdk-record-once-read-forever)
- [P] Crowdworks (Korea) released a teleoperation dataset in July 2026: 12,000+ successful episodes from 145 operators worldwide, delivered in LeRobot format. This shows that LeRobot format is becoming a commercial delivery format. [Digital Daily](https://www.ddaily.co.kr/page/view/2026071509522572229)

### Inferences
- [H] The field is moving from one instruction per episode (OXE- and DROID-style) to dense, timestamped, hierarchical language: subtasks, plans, interjections and corrections, as in pi0.5, Hi Robot and LeRobot v3.1. Dense language is now a first-class column in the most popular open dataset format. That creates a slot a voice logger could fill with human-originated, frame-aligned language events.
- [H] The main competitor to human narration is VLM auto-labeling (Helix hindsight labels, `lerobot-annotate`), not typing. VLMs label what is visible. Human speech adds intent, the reason for a correction, and failure explanations. EPIC-KITCHENS ("true intention") and Ego-Exo4D expert commentary are evidence that labs value this. Positioning should be "intent and corrections that VLMs cannot infer", not "cheaper captions".
- [H] YAY Robot is a ready-made workflow template: a push-to-talk pedal, live speech, Whisper, and segments aligned to the trajectory. Its practical friction points are a separate microphone, manual sync, and ad-hoc scripts. A product could take these over in earbuds, a phone or a bodycam.
- [H] Teleoperators' hands are busy, which supports the thesis, but their voice is free. YAY Robot and Wayve (see Q3) both report or imply that narration adds little collection overhead.

### Gaps
- Open X-Embodiment, BridgeData V2, Google DeepMind Gemini Robotics (1.0/1.5), NVIDIA GR00T N1/N1.5/N1.6, 1X and the Galaxea/RoboMIND language-annotation methods were not verified this session. From prior knowledge, OXE and Bridge carry one natural-language instruction per episode, but this was not re-checked.
- AgiBot World's sub-task and failure annotation details were not in the abstract; the project site or paper would be needed.
- Whether Egocentric-10K, EgoVerse or Micro1 deliverables include an audio track or narration was not confirmed. One egocentric gig posting explicitly said "no audio required" (see Q2).
- Rerun's native audio support was not checked. Whether ROS 2 `audio_common` is used in teleop rigs in practice was not checked.
- No public source was found showing a commercial lab running YAY Robot-style live narration at production scale. pi0.5's "verbal instructions" may be typed or spoken; the blog does not say.

---

## Q2. Data-collection vendors and marketplaces: who sells what, at what price, and is narrated egocentric video a growing purchase?

### Takeaway
Physical-AI data is now a large, fast-growing B2B services market. It is led by Scale AI's Physical AI Data Engine, plus a wave of gig-capture apps and brokers (Micro1, Figure Index, Atlas Capture/Mecka, Claru, Objectways, Build AI) and Chinese and Korean data factories.

Egocentric human video is being bought in bulk at very low unit cost. Workers earn about $2.40–4.50/h, and vendor blogs estimate about $2–5/h of egocentric capture versus about $15–200/h for teleoperation. Language is typically added afterwards by low-paid labelers writing short text descriptions. No source showed buyers paying a premium for live spoken narration, and one egocentric posting explicitly did not require audio.

### Cited Findings

**Scale AI**
- [V] Scale markets a "Physical AI Data Engine" with several offerings:
  - teleoperated demonstrations (Bimanual Manipulators);
  - "Scale Harness", a "robotless egocentric platform designed for distributed dextrous collection";
  - bespoke collection on customer hardware;
  - collection environments: data factories, residential at-home collectors, and "Commercial and Industrial" in-field deployments.

  Annotations are "Multi-Modal Grounding Annotations" and "context and grounding annotations". The page does not mention language, narration, audio, pricing or formats. [Scale](https://scale.com/robotics)
- [V] Scale's operating claims:
  - "1000+ hours of diverse demonstration data are collected and uploaded to Scale's data platform every day."
  - Customer and partner logos: Physical Intelligence, Generalist, Walden Robotics, Cobot, Dyna.
  - Certifications: SOC 2 Type II and ISO 27001.

  [Scale](https://scale.com/robotics)
- [V] A Scale and Universal Robots partnership (NVIDIA GTC, 2026-03-16) brings the Physical AI Data Engine to UR industrial robots. Scale job postings describe managing global collector teams and troubleshooting "egocentric collection devices (e.g., smart glasses, sensors, rig setups)". [Scale blog author page](https://scale.com/blog/author/ben-levin); [Scale job via Accel](https://jobs.accel.com/companies/scale-ai/jobs/67030635-strategic-project-lead-robotics)

**Gig capture and brokers (2026)**
- [P] Globe and Mail, 2026-10-09 (updated 10-11):
  - Worker pay: Atlas Capture recorders earn about US$2.40–2.94/h (Nigeria, Philippines) and US$4.50/h (Bali, formal arrangement); Human Motion Data Recorder pays about US$3/h.
  - Labeler pay: Atlas Capture labelers earn up to US$0.50 per annotated segment (segments up to 2 minutes) and write short text descriptions of each action. Verifiers earn US$0.0067 per clip.
  - Mecka (Carbon Based Technology Corp., linked to Atlas Capture) raised more than US$120M and projects a US$300M revenue run rate.
  - XDOF raised US$70M and runs teleoperation centres in Southeast Asia.
  - Claru (Reka's data arm) pays businesses: its calculator says a skilled-trades business can earn up to US$6,000/month with 5 workers recording 8 h/week.
  - Industry target: 10 million hours of video.
  - Volumes: Human Motion Data Recorder had 38,000 h from 3,900 contributors by mid-summer; Atlas Capture claims 1M users.
  - The article does not say whether audio is recorded.

  [Globe and Mail](https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/)
- [P] (search extract; fetch timed out) NPR, 2026-10-14: in Karur, India, Objectways and the textile firm Texworth give workers GoPros and smart glasses. One worker is paid about $2.60/h to record herself. Objectways also records "exocentric" gripper demonstrations. [NPR](https://www.npr.org/2026/10/14/g-s1-146907/these-workers-help-train-robots-who-could-one-day-steal-their-jobs)
- [P] Garland Magazine, 2026-06-29, citing The News Minute, Al Jazeera and an FT documentary:
  - Instawork (San Francisco) recruited Bengaluru shopkeepers and tailors to wear iPhone headbands about 5 h/day for a 3-month, multi-city project.
  - Karur textile workers wore camera glasses up to 8 h/day.
  - Arrangements rested on verbal agreements with no contracts, and "payment terms changed within days."

  [Garland](https://garlandmag.com/tailors-and-shopkeepers-wear-head-cameras-five-hours-a-day-to-train-robots/)
- [P] Micro1 has about 4,000 remote videographers in 71 countries and more than 160,000 hours of video per month. It launched a DIY home-video program in April 2026. Its robotics data VP said robotics may need "billions of hours" and will extend to factories, warehouses and healthcare. A competitor (Objectways) found only about half of contractor footage usable. [Pulse](https://www.pulse.bot/autonomy/news/micro1-launches-diy-video-program-to-train-homeassistant-robots-c19daf48-9831-46a6-8018-63c16eea01e2/); [Let's Data Science](https://letsdatascience.com/news/startups-pay-workers-to-film-household-chores-11bb7acb)
- [A] An undated Upwork egocentric-collection posting (client not confirmed as Micro1) asks for a head-mounted phone, both hands visible, indoors, and "no audio required". [Upwork](https://www.upwork.com/freelance-jobs/apply/Egocentric-Video-Data-Collection-Wear-Phone-Head-Daily-Household-and-Commercial-Activities_~022069743116691816976/)
- [P] Figure launched "Index", a paid app for smartphone video of everyday tasks. Forbes (2026-08-26) reports that Figure will spend $1B; aggregators say more than $1B on data and compute over 12 months. Reports cite 16M uploads from 108 countries and about $15M paid to contributors, and say Figure found outside vendors' data insufficiently diverse for Helix. Most of these figures come from aggregators; no primary Figure page was found. [Forbes](https://www.forbes.com/sites/johnkoetsier/2026/08/26/figure-launches-gig-platform-to-get-humans-to-do-work-to-train-robots-will-spend-1-billion/); [Crypto Briefing](https://cryptobriefing.com/figure-ai-index-app-humanoid-robots/)
- [P] Figure Index pays "by the minute" with no published US rate, and its privacy terms cover recordings of users and their surroundings plus location. Figure's separate motion-capture contract roles list US$28–33/h and US$30/h. [Blog](https://realwaystoearnmoneyonline.com/get-paid-for-chores/); [Mediabistro job](https://www.mediabistro.com/jobs/3539207213-motion-data-creator-for-humanoid-robotics)

**Price benchmarks: conflicting, mostly from vendor blogs**
- [V]/[E] Teleoperation pricing from vendor blogs:
  - DexSet: about $28–60 per raw hour, including rig amortization, operator and QA. [DexSet](https://dexset.ai/blogs/robot-training-data-costs-pricing-complete-2026/)
  - DataX Power: about $15–30/h for simple teleoperation, $40–80/h for bimanual ALOHA-style, $80–150/h for full humanoid multi-sensor. It warns that quotes under $15/h often exclude QA rejection costs. [DataX Power](https://www.dataxpower.com/blog/humanoid-robot-data-collection-cost)
  - Robotics Center report: high-quality teleop data fell from $340/h (early 2024) to $118/h (March 2026). [Robotics Center PDF](https://www.roboticscenter.ai/assets/pdf/state-of-robotics-2026.pdf)
  - A source quoted in search results: teleoperation at $50–200/h versus egocentric human capture at $2–5/h. [Forbes via search extract](https://www.forbes.com/sites/johnkoetsier/2026/08/26/figure-launches-gig-platform-to-get-humans-to-do-work-to-train-robots-will-spend-1-billion/)
  - These sources conflict by up to 10x.
- [P] China, citing 36kr and Sina:
  - Teleoperation-glove operators earn Rmb 20–40/h; one agency bills Rmb 25/h, of which Rmb 20 goes to the worker.
  - Galaxea's internal cost is Rmb 50–100/h for wearable capture, about Rmb 250/h with a robot in the loop, and Rmb 100–150/h blended; 1M hours costs Rmb 100–200M (CEO interview, 2026-06-17).
  - Mifeng (觅蜂科技, backed by AgiBot) quotes Rmb 200–400/h without a robot and Rmb 500–1,000/h with one (2026-04-17).
  - Government-backed training grounds list Rmb 500–1,000/h.
  - About 100 collected hours yield about 50 usable hours.
  - No language annotation or narration is mentioned.

  [Hello China Tech](https://hellochinatech.com/p/china-robot-training-data-cost)

**Annotation platforms**
- [V] Kognic launched "Language Grounding" (2026-02-27) for VLM and VLA training on driving data. It has three modes: write reasoning traces, edit model proposals, and rank outputs. Its Chain of Causation workflow shows annotators only the scene up to the decision point, to avoid hindsight bias. The work "cannot be effectively crowdsourced". Qualcomm autonomy programs are named as a customer. The page has no pricing and no voice or commentary input. [Kognic](https://www.kognic.com/articles/language-grounding-teaching-machines-why)
- Not verified this session: Encord, Segments.ai, Sama and iMerit physical-AI offerings and prices (see Gaps).

**Korean vendors**
- [P]/[V] Crowdworks (크라우드웍스):
  - January 2026: listed 3 real-world robot-learning datasets.
  - March 2026: MOU with XYZ for robot-learning data.
  - May 2026: created a "Physical AI Data Lab" covering teleoperation collection of joint trajectories, force and vision for robots, autonomous driving and manufacturing. It distributes more than 100 TB of robot data (gripper bimanual, sensor-glove and dexterous-hand data) on its "A1" marketplace.
  - June 2026: won part of a national MSIT/IITP "Physical AI leading technology" project worth 34 billion won in total, aimed at a physical-AI world foundation model.
  - July 2026: released 12,000+ teleop episodes from 145 operators in LeRobot format.

  [Digital Daily, May](https://www.ddaily.co.kr/page/view/2026052809560175185); [Digital Daily, June](https://www.ddaily.co.kr/page/view/2026061015341432530); [Digital Daily, July](https://www.ddaily.co.kr/page/view/2026071509522572229); [Byline Network, January](https://byline.network/2026/01/13-589/)
- [P] Korean government:
  - MSIT, KIMM and ETRI opened the "AI Humanoid Data Factory" at KIMM Daejeon on 2026-11-03 with 12 humanoids. It collects motion and task data from individual limbs up to whole-body tasks; language and voice annotation is not mentioned. [Seoul Shinmun](https://www.seoul.co.kr/news/economy/2026/11/03/20261103500190); [AI Times](https://www.aitimes.kr/news/articleView.html?idxno=42565)
  - A search summary says the factory will open to outside users in stages from late 2027; this is not verified on the fetched article.
  - MSIT plans a "Physical AI Training Center" in 2027 with field validation in Korea Post logistics.
  - An investment plan allocates 700 billion won through 2030, including 171.6 billion won next year, to a pan-government manufacturing and physical-AI data library. [Digital Daily, 2026-10-29](https://www.ddaily.co.kr/page/view/2026102910190541858)
  - The Herald reports 2.3 trillion won for humanoids and 2.8 trillion won for physical AI over 4 years. [Herald](https://biz.heraldcorp.com/article/10854066)
  - Nau Robotics was selected for an MSIT physical-AI validation project running July 2026 to December 2027. [DailySecu](https://www.dailysecu.com/news/articleView.html?idxno=207983)
- Not found: Selectstar, Testworks and Flitto physical-AI activity did not appear in the Korean search (see Gaps).

### Inferences
- [H] Language enters these pipelines mainly through post-hoc text labeling at about US$0.50 per segment of up to 2 minutes, through VLM auto-labeling, or through expert reasoning annotation (Kognic). Narration at capture time could replace or seed this stage. However, the people doing capture are low-paid gig workers, often non-native English speakers, and buyers sometimes exclude audio entirely, probably for privacy and bystander reasons.
- [H] Commercial pull is strongest where language quality matters more than volume: teleoperation stations, which already cost $15–200/h so a voice layer is a small marginal cost, AV reasoning annotation, and expert commentary. It is weakest in mass egocentric gig capture, which is a race to the bottom at about $2–5/h.
- [H] The capture tool is the vendor's own app (Atlas Capture, Figure Index, Scale Harness, Micro1 tooling). A third-party voice logger would more likely sell to collection vendors and robot labs as an SDK or white-label component than to end workers.
- [H] Korea has a well-funded, government-led physical-AI data build-out (KIMM data factory, a 700 billion won data library, Crowdworks national projects), and none of the coverage mentions language or voice. This is a possible gap to pitch: Korean-language task narration for Korean humanoid datasets.

### Gaps
- No public buyer-side price per hour of egocentric factory video, narrated or not, was found. Only worker pay and vendor-blog ranges were found.
- The pricing and audio or language features of Encord, Segments.ai, Sama, iMerit and Objectways' physical-AI offerings were not verified this session.
- Micro1 contract terms with labs, and "Cortex", were not found.
- Selectstar, Testworks and Flitto physical-AI activities were not found in one Korean search. A targeted search per company would be needed.
- No 2025–2026 report of a buyer paying explicitly for narrated egocentric video (spoken commentary during capture) was found.

---

## Q3. Autonomous driving: how is language and commentary data collected, and do safety drivers log events by voice?

### Takeaway
There is direct precedent for live spoken commentary by drivers. Wayve LINGO-1 (2023, older) used expert drivers narrating while driving, under a protocol, with commentary synced to sensor and actuator data, and Wayve reported it did not slow collection.

Current large-scale AV reasoning data has moved instead to hybrid VLM auto-labels plus human structured annotation in the office. Examples are NVIDIA Alpamayo's Chain-of-Causation data (0.7M→3M→3.7M traces) and Kognic Language Grounding.

Voice tagging during test drives is an established, if niche, practice:
- Racelogic VBOX 3i ADAS records GNSS-time-synced voice tags as WAV files.
- Elektrobit recommends tagging by voice control or a steering-wheel button.
- Tesla's FSD Beta voice drive notes after disengagements (2023, older).

No dedicated, modern voice-first logging tool for AV test fleets was found.

### Cited Findings
- [P] Wayve LINGO-1 (September 2023, older):
  - Expert drivers described their actions and surroundings while driving UK roads, in the style of driving-instructor commentary.
  - The commentary followed a protocol on word relevance and density and had to match what the car was doing.
  - It was synchronized with sensor and actuator data.
  - Wayve's paper reported that commentary did not slow standard expert data collection.

  [ADAS & Autonomous Vehicle International, January 2024](https://adas.mydigitalpublication.com/january-2024/page-49); [Wayve press release reprint](https://iconnect007.com//article/137799/robot-car-talk-introducing-wayves-new-ai-model-lingo1/137802/ein)
  - The Wayve primary blog failed to load (SSL error): [Wayve](https://wayve.com/thinking/lingo-natural-language-autonomous-driving/)
- LINGO-2 (April 2024, older) reportedly continued the driver-commentary approach. This was not re-verified this session (see Gaps).
- [F] NVIDIA Alpamayo-R1 (arXiv 2511.00088, late 2025): the Chain of Causation dataset was built through a hybrid pipeline of auto-labeling and human-in-the-loop review, producing causally linked reasoning traces tied to driving behavior. [arXiv PDF](https://arxiv.org/pdf/2511.00088v2)
- [F] (model card extracts) Alpamayo labeling and scale:
  - Alpamayo 1.5 labeling combines human structured CoC annotation, VLM auto-labeling with heuristic rules, and sensor-derived trajectory and egomotion labels.
  - Trace counts: Alpamayo 1 about 700K, Alpamayo 1.5 about 3M, Alpamayo-2-Super about 3.7M.
  - The cards describe the human role inconsistently: verification, structured annotation, or manual labeling.
  - No driver voice commentary is mentioned.

  [HF Alpamayo-R1](https://huggingface.co/nvidia/Alpamayo-R1-10B); [NGC Alpamayo 1.5](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/models/alpamayo-1-5-10b/); [NGC Alpamayo-2-Super](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/models/alpamayo-2-super/)
- [V] Kognic Language Grounding (2026-02-27): reasoning is written or edited in the annotation tool by "Perception Experts", using Chain of Causation with the future hidden. The page has no driver-commentary input and cites a "12% improvement in planning accuracy" from structured reasoning data. [Kognic](https://www.kognic.com/articles/language-grounding-teaching-machines-why)
- [F] Racelogic VBOX 3i ADAS "Voice Tagging":
  - A headset switch starts a tag, and recording stops automatically after 30 s.
  - Audio tags are time-synced to GNSS and stored as .wav files next to the .VBB data file.
  - Tags appear as speaker icons on the chart in VBOX Test Suite for playback at the recorded point.

  [Racelogic support](https://en.racelogic.support/VBOX_Automotive/Product_Info/VBOX_Data_Loggers/VBOX_3i_Product_Range/VBOX_3i_ADAS/User_Guide_VBOX_3i_ADAS/04_Installing_VBOX_3i_ADAS_in_the_Vehicle/Voice_Tagging_VBOX_3i_ADAS)
- [V] Elektrobit recommends letting the test driver tag data as it is recorded, "e.g. with a steering-wheel button or voice control", so engineers can find relevant segments faster. It also promotes AI-triggered smart logging and live labelling. [Elektrobit](https://www.elektrobit.com/?p=37849); [Elektrobit webinar](https://elektrobit.com/?p=44034)
- [P] (2023, older) Tesla FSD Beta v11 prompted drivers after an Autopilot disengagement to record a short voice memo (reportedly about 10 seconds, anonymized) explaining the cause. This is fleet-scale voice capture of disengagement reasons, in a consumer program. [Not a Tesla App](https://www.notateslaapp.com/news/1228/fsd-beta-v11-a-look-at-teslas-voice-drive-notes)
- [F] (search extract) A study of driver-initiated takeovers in assisted driving (arXiv 2404.13027, 2024, older) used voice annotations recorded by drivers, split into labeled components. Interventions with missing or incomplete voice notes were annotated from bus data when the reason was obvious. [arXiv PDF](https://arxiv.org/pdf/2404.13027)
- [F] The California DMV disengagement report (OL 311R) records, for each event, who initiated it (AV system, test driver, remote operator, passenger), the location type and a description of the cause. This is a regulatory schema that free-text or voice notes would need to map into. [CA DMV form](https://dmv.ca.gov/portal/uploads/2021/05/OL311R.pdf)
- [V] Commercial fleet-telematics tools for human-driven fleets let coaches and admins tag and annotate safety events after the fact (Motive). These are not AV test tools. [Motive help center](https://helpcenter.gomotive.com/hc/en-gb/articles/6189410468509-Safety-Events-on-the-Fleet-Dashboard)

### Inferences
- [H] The AV niche closest to the thesis is engineering test drives and safety-driver programs: ADAS validation, robotaxi safety operators, and OEM test fleets. Drivers there already tag events with buttons, and some loggers support voice tags. The pain points are likely 30-second WAV clips with no transcription or structure, and in-house glue code. A voice-first tagger that outputs structured, timestamped events (disengagement cause, scene description), keyed to GNSS or PTP time, is a plausible wedge.
- [H] For reasoning-model training data, the industry chose office annotation with the future hidden (Kognic CoC) plus VLM auto-labels over live driver commentary. Wayve is the exception. Live commentary has a known bias trade-off: it is free of hindsight but noisy. Selling "commentary as training data" to AV model teams would need to beat these office pipelines on quality per dollar.
- [H] Security matters here. AV OEMs keep test-drive data on-prem or in private clouds, which fits the product's on-prem sync design. This is not verified with a source this session.

### Gaps
- Wayve LINGO-2 and any 2025–2026 Wayve commentary-data updates were not verified because wayve.com failed to load.
- No public information was found on DriveLM details (2023, QA annotation, older), Waymo, or how Tesla's in-house engineering fleet logs events.
- Korean AV companies (42dot, Hyundai, StradVision, Kakao Mobility) were not searched specifically. No public info on language-data collection surfaced in the Korean physical-AI searches.
- The tools robotaxi safety operators use internally (tablets, buttons, voice) were not found in public sources.

---

## Q4. Manufacturing context logging: do factories want frontline language for AI and digital twins, and does voice feed it?

### Takeaway
There is clear vendor-side demand for operator and technician knowledge as language that industrial copilots can retrieve. Examples are shift handover, maintenance closeout notes, and "tribal knowledge" capture.

Siemens' Industrial Copilot for Operations targets shift handover and is offered as an on-prem bundle. The concrete voice example found is maintenance-CMMS voice notes at work-order closeout (MaintainX, via podcast). The evidence is mostly vendor marketing. No source showed factory voice logs being used as physical-AI or robot training data. That link is a hypothesis.

### Cited Findings
- [P]/[V] (search extract) Siemens Industrial Copilot for Operations:
  - It includes a shift and operations assistant that reduces handover effort and flags critical events.
  - It draws on live sensor data and static documents (manuals, worker instructions), translates machine error codes into plain language, and searches manuals and spare-parts lists.
  - Siemens planned an on-premises hardware and software bundle to keep data under customer control.
  - thyssenkrupp adopted it.
  - Siemens announced nine industrial copilots at CES 2026.
  - No voice interface for frontline operators was confirmed.

  [Manufacturing.net](https://www.manufacturing.net/operations/news/22926249/siemens-expands-generative-aipowered-industrial-copilot); [Siemens press release](https://press.siemens.com/global/en/pressrelease/siemens-industrial-copilot-expanded-adopted-thyssenkrupp); [Business Wire, January 2026](https://www.businesswire.com/news/home/20260106633962/en)
- [A] (podcast page) MaintainX uses "AI powered voice note capture at work order closeout", in which technicians give a verbal description of what they found and fixed. [Manufacturing Hub podcast](https://share.transistor.fm/s/96897a8d)
- [V] iFactory claims its AI turns free-text technician notes into "symptom-cause-remedy" records linked to photo and video and asset history. It also claims a copilot can generate a shift-handover summary "from sensor events, operator notes and MES entries". [iFactory](https://ifactoryapp.com/industries/manufacturing-plant/knowledge-management-ai-tribal-manufacturing)
- [V] Leena AI warns that manufacturing AI pilots yield generic answers ("Check the manual") because source data is poor. It recommends subject-matter-expert review, and says an AI agent should never publish a safety procedure without a human signature. [Leena AI](https://blog.leena.ai/ai-in-manufacturing-knowledge-transfer-risks/)
- [P] SaidText is positioned as "voice-driven AI for industrial operations". It is a possible competitor, covered by the frontline-competitor researcher. [Pulse](https://www.pulse.bot/manufacturing/news/saidtext-brings-voice-driven-ai-to-industrial-operations-8f638502-be3a-460f-996e-c67d8abf31d1)
- [P] The physical-AI data side reaches into factories:
  - Build AI's Egocentric-10K is about 10,000 h of factory-worker head-cam video. [HF](https://huggingface.co/datasets/builddotai/Egocentric-10K)
  - Objectways and Texworth record textile-factory workers. [NPR](https://www.npr.org/2026/10/14/g-s1-146907/these-workers-help-train-robots-who-could-one-day-steal-their-jobs)
  - Claru pays trades businesses whose workers record. [Globe and Mail](https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/)
  - Scale offers "Commercial and Industrial" in-field collection and partners with Universal Robots. [Scale](https://scale.com/robotics)
- [P] Korea's planned 700 billion won (through 2030) data library explicitly covers "manufacturing and physical-AI data". [Digital Daily](https://www.ddaily.co.kr/page/view/2026102910190541858)

### Inferences
- [H] Two distinct buyer needs share one capture act:
  - Operations knowledge: shift handover, maintenance observations, and retrieval by on-prem copilots. The buyer is plant operations or digital transformation.
  - Physical-AI training data: task narration aligned with egocentric video. The buyer is a robot lab or data vendor, or a factory monetizing data the way Claru pays businesses.

  A voice log with timestamps, images and GPS or indoor location could serve both. A product could start with the operations use, which has recurring, self-serve-able value, and treat the training-data export as an upsell.
- [H] Siemens' on-prem copilot bundle and general security sensitivity support the "sync to self-hosted server, not external cloud AI" design. The copilot would need an ingestion path for these logs (documents or a historian).

### Gaps
- Cognite (Atlas AI or field observations), Augury, Microsoft (Factory Operations Agent and others), Rockwell, Tulip and Augmentir were not verified this session.
- No independent evidence (customer case study, survey or numbers) was found of voice capture feeding an industrial copilot or digital twin.
- No example was found of a factory's operator voice notes being sold or used as robot or VLA training data.

---

## Q5. Market size and buyers: spending on physical-AI training data, buyer personas, and self-serve versus services

### Takeaway
Credible top-down market sizes for "robot training data" do not exist. Available figures are low-quality reports putting it in the high hundreds of millions to about $1B in 2025–2026, against much larger capital flows into the companies that buy data: about $48B raised by robotics and physical-AI companies year-to-date in 2026 (PitchBook via FT), and Figure's reported more-than-$1B data and compute commitment.

Buyers are frontier robot labs and humanoid companies (data-ops leads), AV programs (reasoning-annotation leads), and governments (Korea, China). Purchases are overwhelmingly B2B services and custom collection, not self-serve tools.

### Cited Findings
- [E] Market-size estimates:
  - Robotics Center blog: "robot training data" about $500M (2025), $900M (2026), $8B (2030). [Robotics Center](https://ae.roboticscenter.ai/blog/future-of-robot-data-market-2026)
  - LP Information: robot manipulation dataset market about US$1,008M (2025), 38.2% CAGR to 2032. [Market Publishers PDF](https://pdf.marketpublishers.com/lpinfo/global-robot-manipulation-dataset-market-lp.pdf)
  - Broader physical-AI market: MarketsandMarkets $1.50B (2026) to $15.24B (2032). [MarketsandMarkets](https://www.marketsandmarkets.com/blog/SE/physical-ai-market-robotics-industry)
  - Methodologies are opaque, and the publishers are low-visibility.
- [P] Robotics and physical-AI labs raised about $48B year-to-date in 2026 (PitchBook via FT). Labs including Physical Intelligence, Skild AI, NEURA and Generalist combine outside data vendors with internal data operations. [AI Weekly summary of FT](https://aiweekly.co/alerts/ft-robotics-and-physical-ai-labs-raise-48b-ytd-on-data-hunt)
- [P] Figure: more than $1B on data and compute over 12 months; about $15M paid to Index contributors (aggregator figures). [Forbes](https://www.forbes.com/sites/johnkoetsier/2026/08/26/figure-launches-gig-platform-to-get-humans-to-do-work-to-train-robots-will-spend-1-billion/); [Crypto Briefing](https://cryptobriefing.com/figure-ai-index-app-humanoid-robots/)
- [P] Mecka projects a US$300M revenue run rate. [Globe and Mail](https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/)
- [P] Galaxea's cost for 1M hours is Rmb 100–200M. [Hello China Tech](https://hellochinatech.com/p/china-robot-training-data-cost)
- [V] Scale's named robotics customers and partners are Physical Intelligence, Generalist, Walden Robotics, Cobot and Dyna. Kognic names Qualcomm autonomy programs. [Scale](https://scale.com/robotics); [Kognic](https://www.kognic.com/articles/language-grounding-teaching-machines-why)
- [P] Korean public buyers and funders: MSIT, KIMM, ETRI and IITP (a 34 billion won project won by Crowdworks; a 700 billion won data library through 2030). [Digital Daily](https://www.ddaily.co.kr/page/view/2026061015341432530); [Digital Daily](https://www.ddaily.co.kr/page/view/2026102910190541858)
- [F] The open-source tooling layer is free: LeRobot and `lerobot-annotate` (Apache-licensed repo; runs on Hugging Face Jobs paid per GPU hour). [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)

### Inferences
- [H] Buyer personas, in rough order of fit for a voice logger:
  1. Robot lab or humanoid-startup data-operations lead running teleop stations. Pain: dense subtask and correction labels; already pays $15–200/h.
  2. Data-collection vendors (Scale, Micro1, Objectways, Crowdworks, Claru, Mecka) who could embed a narration SDK in their capture apps.
  3. AV and ADAS test-fleet operations and validation engineers who need event tags.
  4. Factory digital-transformation and maintenance teams, for operations knowledge rather than training data.
  5. Government data-factory programs (Korea's KIMM factory and training center).
- [H] Self-serve fit: weak for the data-vendor and AV segments, which are enterprise and procurement-driven. A small self-serve wedge is plausible for research labs and small robot startups that use LeRobot and Foxglove: a phone or earbud narration app that exports `language_events` or subtask spans into LeRobot v3.x parquet, or audio and transcript topics into MCAP. The ceiling of this wedge is small. The factory operations-knowledge use case is the more natural self-serve SaaS.
- [E] Rough sanity check, assuming a typical small lab runs about 4–10 teleop stations: even a $50–200/month per-station tool reaches $300K/year profit only with thousands of stations. That implies vendor or enterprise deals or the factory use case, not lab self-serve alone. This is my estimate, not sourced.

### Gaps
- No credible analyst figure (Goldman, McKinsey, The Information) for 2025–2026 spending on robot or AV language annotation specifically was found.
- Scale AI's robotics revenue is not public in the sources checked.
- No data on willingness to pay for voice or narration tooling at teleop stations was found.

---

## Q6. Fit: where a precise-timestamp voice logger plugs in, must-haves, and pain points

### Takeaway
The best technical insertion points are:
1. Teleop and demonstration stations: YAY Robot-style live narration and corrections, written as frame-aligned language events into LeRobot or MCAP.
2. Egocentric capture rigs: narrate-and-act or post-capture expert commentary in the EPIC-KITCHENS and Ego-Exo4D style.
3. AV and ADAS test drives: voice event tags on GNSS or PTP time, mapped to disengagement schemas.
4. Factory maintenance and shift logs feeding on-prem copilots.

Must-haves:
- clock sync to robot or vehicle time, at frame level;
- exports in LeRobot v3.x parquet language columns, MCAP (`foxglove.RawAudio` plus text topics), ROS 2 bags, RLDS, or WAV plus JSON;
- operator ID;
- push-to-talk or pedal segmentation;
- multilingual ASR;
- consent and privacy controls, including an option to keep text without audio.

### Cited Findings
- [F] Timestamp precision: LeRobot requires event rows to land "exactly on a real frame timestamp", and timestamps are "never recomputed in floating point". A voice logger must snap utterances to dataset frame times or provide a mapping. [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)
- [F] Segmentation: YAY Robot used foot pedals to mark instruction versus correction boundaries and Whisper for ASR, synchronized with trajectories. This shows push-to-talk segmentation is part of the workflow. [arXiv HTML](https://arxiv.org/html/2403.12910v1)
- [F] Formats:
  - MCAP with `foxglove.RawAudio` (mono PCM) for synchronized audio playback in Foxglove. [Foxglove](https://www.foxglove.dev/blog/announcing-audio-panel)
  - LeRobot v3.x `language_persistent` and `language_events`. [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)
  - Racelogic-style WAV next to the data file on GNSS time. [Racelogic](https://en.racelogic.support/VBOX_Automotive/Product_Info/VBOX_Data_Loggers/VBOX_3i_Product_Range/VBOX_3i_ADAS/User_Guide_VBOX_3i_ADAS/04_Installing_VBOX_3i_ADAS_in_the_Vehicle/Voice_Tagging_VBOX_3i_ADAS)
  - Ego-Exo4D ships original audio plus Whisper transcripts. [Ego-Exo4D docs](https://docs.ego-exo4d-data.org/annotations/expert_commentary/)
- [F] Operator and multi-operator metadata matters. Helix's dataset is explicitly "multi-robot, multi-operator". [Figure](https://www.figure.ai/news/helix)
  - [P] Crowdworks' dataset came from 145 operators. [Digital Daily](https://www.ddaily.co.kr/page/view/2026071509522572229)
- [V] Hindsight bias is a known quality problem. Kognic hides the future from annotators. Live narration is naturally free of hindsight, which is a selling point. [Kognic](https://www.kognic.com/articles/language-grounding-teaching-machines-why)
- [F] Retrospective commentary also has a place: Ego-Exo4D instructed experts to keep commentary retrospective. A tool may need both live and review-mode narration. [Ego-Exo4D docs](https://docs.ego-exo4d-data.org/annotations/expert_commentary/)
- [P] Pain points from the field:
  - About 50% of collected hours are unusable. [Hello China Tech](https://hellochinatech.com/p/china-robot-training-data-cost); [Let's Data Science on Objectways](https://letsdatascience.com/news/startups-pay-workers-to-film-household-chores-11bb7acb)
  - Motion sickness and heavy rigs (Tesla). [eWeek](https://www.eweek.com/news/tesla-optimus-robot-training/)
  - Consent problems (verbal agreements, changed pay terms). [Garland](https://garlandmag.com/tailors-and-shopkeepers-wear-head-cameras-five-hours-a-day-to-train-robots/)
  - Labeling paid per segment at about US$0.50. [Globe and Mail](https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/)
  - VLM auto-labels describe only what is visible; the LeRobot "describe" step "narrates only what it actually sees ... (no guessing about the task)". [LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)
- [A] Privacy and bystanders: an egocentric gig spec said "no audio required". [Upwork](https://www.upwork.com/freelance-jobs/apply/Egocentric-Video-Data-Collection-Wear-Phone-Head-Daily-Household-and-Commercial-Activities_~022069743116691816976/)
  - [P] Figure Index's privacy terms cover recordings of surroundings and location. [Blog](https://realwaystoearnmoneyonline.com/get-paid-for-chores/)
- [P] Industry momentum toward data operations on-site and in the field (Scale "Commercial and Industrial" deployments; Universal Robots integration). [Scale](https://scale.com/robotics)

### Inferences
- [H] Concrete integration design implied by the evidence:
  - capture with push-to-talk (earbud tap, pedal or button) and tags for instruction, correction or failure;
  - on-device or on-prem ASR (Whisper-class is the de facto lab choice);
  - align to a shared clock (PTP or NTP with the robot PC, or GNSS on vehicles), then snap to frame timestamps;
  - export a LeRobot `language_events` and subtask-span writer, an MCAP writer (RawAudio plus a text topic), and RLDS or JSON sidecars;
  - keep audio optional and redactable;
  - per-utterance operator ID and language tag (Korean and English).
- [H] Differentiators against `lerobot-annotate` and VLM auto-labelers: human intent and "why", corrections and failure reasons, and non-visible context (force or feel, "the lid is stuck"). These are the things VLMs cannot infer from frames. A possible hybrid: use human narration as a seed or prior for VLM segmentation, analogous to LeRobot's "seeded relabel" pass.
- [H] Main risks to the thesis:
  1. Labs may decide VLM auto-labels are good enough (Helix, LeRobot), shrinking demand for human language.
  2. In egocentric gig capture, buyers exclude audio and workers are low-paid, so a premium voice product does not fit.
  3. Teleoperation is shifting toward human-video capture (Tesla, Figure Index), where narration must come from the wearer, which is possible but untested at scale.
  4. Teleop stations are already quiet and controlled, so the "noisy site" differentiator matters less there than in factories and vehicles.

### Gaps
- No primary source describes clock-sync methods used by teleop teams for audio (PTP, NTP, or the robot PC's monotonic clock). The sync and architecture researcher covers this.
- No user interviews or forum evidence (LeRobot Discord, robotics data-ops posts) on whether operators want to narrate or find it burdensome. YAY Robot is the only first-hand account, and it is from the researchers themselves.
- Whether ASR accuracy in noisy factory or vehicle cabins is adequate is covered by the ASR researcher.
