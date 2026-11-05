# Evidence-grade voice logging beats bundled transcription

A voice-first, self-hosted industrial logger can be built on the user's hardware today, and it fills a real gap. Customers will pay for evidence-grade records that stay inside their network, though, not for transcription. Transcription is already bundled. Procore launched a push-to-talk voice app on 2026-10-21, Mitti (formerly SafetyCulture), Fulcrum and Sitemate turn speech into forms, and push-to-talk radio apps include transcription for $8–15 per user per month. Yet none of the frontline or construction platforms publicly offers on-prem or no-external-AI deployment; the only on-prem option among field-voice products is Zello's Enterprise radio tier. No Korean product does voice-first TBM (tool-box meeting) or inspection logging with on-prem storage. The strongest demand signal is legal, not technological. Korea's daily pre-work TBM, under the labour ministry's continuous-assessment option, must be recorded and kept for three years. Courts penalize generic or copied risk assessments, and the Serious Accidents Punishment Act has covered about 830,000 small sites since 2024. Robot and autonomous-vehicle (AV) teams do value live spoken intent and corrections, but they buy data as B2B services. Physical AI is therefore an export feature and a design-partner track, not a first self-serve market. On the technology side, one RTX 4090 comfortably runs commercially licensed Korean and English speech recognition (ASR) plus a local LLM, and the phone can stream Korean offline. But no benchmark of Korean recognition in noise exists, speech-enhancement front-ends usually make recognition worse, and at 85–100 dBA the microphone decides accuracy. Two constraints shape the design more than any model choice. Korean wiretap law makes ambient always-on capture the one mode to avoid. And capture apps lose trust through silent failures, so the app must prove "recording", "saved on phone" and "synced" as separate states. The profit target points to a hybrid business. $300K in year 1 needs roughly 1,200 paid seats on average at $30 a month, or 10–15 on-prem deals. Self-serve sign-up for Korean manufacturing and safety teams would run on a vendor-operated private cloud with no third-party AI, with an on-prem box as the B2B upsell.

*Research notes: [research-notes/](research-notes/). Evidence labels follow the research notes: [F] verified on a primary source, [V] vendor claim, [P] press or third party, [A] anecdote, [E] estimate, [H] hypothesis. All four notes were researched on 2026-11-05. Time-sensitive items are flagged for recheck. Items marked **Counsel** need a lawyer before launch; nothing here is legal advice. Related repo context: [technical-decisions.md](../../products/voice-life-companion/technical-decisions.md) and [earbud-compatibility.md](../../products/voice-life-companion/earbud-compatibility.md) from the Voice Life Companion product.*

## Korean safety law creates a daily record that nobody yet captures by voice

### The TBM is a three-year legal record that courts read closely

The strongest demand evidence is a paperwork duty, not interest in AI. Article 4(3) of the Serious Accidents Punishment Act (중대재해처벌법, SAPA) Enforcement Decree requires a procedure for identifying and fixing site-specific hazards, checked **at least every half year**. Yulchon counts it among the most frequently contested duties in about 20 SAPA rulings. Courts found it unmet where risk assessments copied other sites or listed generic hazards that did not reflect the actual work [P, quoting the statute] ([Yulchon, 2024-11-27](https://www.yulchon.com/ko/resources/publications/legal-update-view/38691/page.do)).

The Ministry of Employment and Labor (MOEL) guideline 고시 제2023-19호 (2023-05-22) added a 상시평가 (continuous assessment) option. It runs on monthly site walks, weekly prime/subcontractor meetings and a **daily pre-work TBM**, and its summary chart requires results to be **recorded and kept for 3 years** [F] ([MOEL guide PDF](https://cbcci.korcham.net/file/dext5uploaddata/2023/2023%20%EC%83%88%EB%A1%9C%EC%9A%B4%20%EC%9C%84%ED%97%98%EC%84%B1%ED%8F%89%EA%B0%80%20%EC%95%88%EB%82%B4%EC%84%9C%202023_05%20%281%29.pdf)). SAPA has covered firms with 5–49 workers since 2024-01-27, which one law firm counts as about **830,000 sites** [P] ([Lawwin](https://www.lawwin.co.kr/busan/newsdetail?index=2545)). Penalties are rising. The National Labor Safety Plan of 2025-09-15 and the OSH Act amendments that followed add a fine of up to 10M KRW for not conducting a risk assessment, plus a proposed surcharge of up to 5% of operating profit [P] ([MOEL press release](https://moel.go.kr/news/enews/report/enewsView.do?news_seq=19675); [BKL](https://www.bkl.co.kr/law/insight/newsletter/6782)). Sources disagree on the effective dates, so recheck them on law.go.kr before quoting them to a customer.

The records behind these duties are thin. A KCTU union survey found that **83.9%** of construction sites substitute a TBM of about 15 minutes for periodic and ad hoc assessments, and only 17.2% collect and reflect workers' opinions [P, union survey] ([Nocut News](https://www.nocutnews.co.kr/news/6232836)). Research on site safety managers quotes the complaint that "taking photos for documents eats all the time" [P] ([KoreaScience](https://koreascience.kr/article/JAKO202318172438693.page?lang=ko)). A working safety manager says paperwork leaves no time to go out on site [A] ([Comento](https://comento.kr/job-questions/모든회사/건설안전/현직_건설_안전관리자_분들_분위기가_어떤지_궁금_합니다-296581)). The land ministry (MOLIT) itself cut the construction safety-management plan from about 4,000 pages to about 500 in February 2026 [P] ([News Seoul](https://www.newsseoul.co.kr/news/view/1065583217449376)).

The daily TBM is therefore the highest-frequency legally relevant record. There is one per crew per workday, it is kept for three years, and it is the first document examined after an accident [H]. The courts and the union both say the paper TBM lacks site-specific content. Spoken content with a timestamp, attendees, photos and GPS supplies exactly that [H].

Voice already reaches Korean sites, but through translation, not record keeping:

- GS E&C's Xi Voice interprets a foreman's TBM announcement live into 120 languages, with a keyboard fallback for when recognition fails [P] ([Herald, 2026-01-03](https://www.heraldk.com/article/2026010318000000821)).
- Lotte Innovate built a construction-specific ASR "to convert speech to text even on noisy sites". Daewoo E&C adopted it for TBM in May–June 2026 [P] ([Herald, 2026-05-31](https://www.heraldk.com/article/2026053121011269483)).
- HJ Heavy Industries is rolling out real-time TBM interpretation (September 2026) [P] ([Hankyung Money](https://magazine.hankyung.com/money/article/202609043973c)).
- Hanwha E&C added voice auto-fill to its safety-reporting channel on 2026-10-15 [P] ([Herald Biz](https://biz.heraldcorp.com/article/10903816)).
- Korea Rural Community Corporation built an in-house "AI TBM APP" that automatically creates and saves the meeting log [P] ([Herald, 2026-03-30](https://www.heraldk.com/article/2026033021363241545)).

The opening is a logger that produces the multilingual briefing and the signed TBM minutes as one artefact, riding a budget line that already exists [H]. One caution cuts the other way. DL E&C translates safety notices with ChatGPT [P] ([Herald, 2026-01-11](https://www.heraldk.com/article/2026011118141404446)), so some Korean contractors accept external cloud AI. "No external cloud" is a requirement of particular buyers, not a universal one.

### Field crews everywhere hit the same walls: gloves, noise and no time

Outside Korea the complaints are the same. They come mostly from vendor blogs, because no Reddit threads surfaced in the research.

- **Gloves, dust and noise.** Typing with work gloves is "painful", dust makes screens unusable, and loud equipment defeats ordinary dictation [V/A] ([Zack Proser](https://zackproser.com/blog/voice-ai-for-construction-foremen); [InspectMind](https://www.inspectmind.ai/guides/construction-field-reporting)).
- **No time, and AI mistakes.** "Most superintendents are too busy to document stuff in real time". Some dictate on the drive home into a general chatbot, and AI voice workflows need review because "AI gets names and quantities wrong" [V/A] ([Dan Cumberland Labs](https://dancumberlandlabs.com/blog/commercial-construction-superintendent/); [BuildTools, 2026-06-01](https://www.buildtools.com/blog/2026-06-01-your-superintendent-shouldnt-have-to-type)).
- **Paperwork frustration.** Mining trials of a voice tool started from worker frustration with paperwork. The tool also helped with language and literacy barriers [A/P] ([AusIMM abstract](https://airdrive.eventsair.com/eventsairseasiaprod/production-ausimm-public/b0933519580248d0878efe52780a3f30)).
- **What buyers check.** Buyers ask whether crews will actually use an app in the field, and check record locking and approval traceability [P] ([Safety Evolution](https://www.safetyevolution.com/blog/best-jsa-apps-field-crews)). A signed, timestamped PDF produced offline for an inspector is a selling point [V] ([JSA-OnTheGo](https://apps.apple.com/us/app/jsa-onthego/id1369505754)).

Policing shows that people pay to turn audio into a draft report. Axon's Draft One drafts police reports from bodycam audio using GPT-4o on Microsoft Azure [P, 2024] ([Fortune/AP](https://fortune.com/2024/08/26/police-ai-chatbot-incident-reports-axon-emergency-call-response/)). Axon reported **$750M of AI bookings** in March 2026, with per-officer revenue rising from the mid-$200s to over $600 [P] ([MarketBeat, 2026-03-05](https://www.marketbeat.com/instant-alerts/axon-enterprise-flags-broad-2025-momentum-as-ai-bookings-hit-750m-at-morgan-stanley-conference-2026-03-05/)).

Motorola's Assisted Narrative (2025-10-16) reverses the order. The officer writes or dictates first, then AI cross-references up to 10 sources and flags discrepancies, because AI-first drafts contaminated officers' memory [V] ([Motorola](https://www.motorolasolutions.com/newsroom/press-releases/motorola-solutions-advances-ai-assisted-policing.html)). That ordering carries straight over to industrial incident and TBM records.

### Manufacturing context logging has vendor pull but thin proof

Factories want frontline knowledge as language that AI copilots can retrieve: shift handover, maintenance closeout notes and "tribal knowledge". Siemens' Industrial Copilot for Operations targets shift handover and translates machine error codes into plain language. thyssenkrupp adopted it, and Siemens planned an on-prem hardware-and-software bundle to keep data under customer control [P/V] ([Siemens](https://press.siemens.com/global/en/pressrelease/siemens-industrial-copilot-expanded-adopted-thyssenkrupp); [Manufacturing.net](https://www.manufacturing.net/operations/news/22926249/siemens-expands-generative-aipowered-industrial-copilot)). MaintainX captures AI-powered voice notes at work-order closeout [A] ([Manufacturing Hub podcast](https://share.transistor.fm/s/96897a8d)).

The proof is thin. No independent case study shows voice notes feeding a copilot, and none shows a factory's voice notes used as robot training data. Leena AI warns that poor source data makes copilots answer "Check the manual". It also says an AI agent should never publish a safety procedure without a human signature [V] ([Leena AI](https://blog.leena.ai/ai-in-manufacturing-knowledge-transfer-risks/)).

The useful conclusion is that one capture act can feed both the safety record and the context log: a spoken note with a timestamp and a photo. That gives a safety product a daily use beyond safety, and retention follows daily use [H].

## Robot and AV teams prize spoken intent but buy it as a service

Robot-learning research has moved from one typed instruction per episode to dense, layered language, and some of it is spoken:

- **YAY Robot** (arXiv 2403.12910, March 2024) placed a microphone near the robot so the operator could "narrate the skill they are performing in real-time". It transcribed the narration with Whisper and used instruction and correction foot pedals to segment it. Bag Packing alone yielded **41,517 skill segments** from 1,170 trajectories [F] ([arXiv](https://arxiv.org/html/2403.12910v1)).
- **RT-H** showed that policies learning from spoken-style "language motion" corrections outperform those learning from teleoperated interventions [F] ([arXiv 2403.01823](https://arxiv.org/abs/2403.01823)).
- **pi0.5** (Physical Intelligence, 2025-04-22) lists "verbal instructions", where "a person coaches the robot through a complex task by telling it what to do step by step", as a co-training data category [F] ([PI blog](https://www.pi.website/blog/pi05)).
- **Hi Robot** responds to real-time interjections, although its training language was synthesized [F] ([PI research](https://www.pi.website/research/hirobot)).

The tooling has caught up with the text, but not with the audio. Hugging Face's LeRobot format v3.1 now has `language_persistent` and `language_events` columns. Every event row must land "exactly on a real frame timestamp", and labelling costs about 50 VLM calls per 30-second episode. Its "speech", however, is the robot's own `say` tool call, and it has no input path for human audio [F] ([LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)). Foxglove can replay operator audio next to robot topics through `foxglove.RawAudio` in MCAP files, but nothing turns that audio into labels [F/V] ([Foxglove](https://www.foxglove.dev/blog/announcing-audio-panel)).

Driving has the same precedent:

- **Wayve LINGO-1** (2023) had expert drivers narrate under a protocol, synchronized with sensor and actuator data. Wayve reported that the commentary did not slow collection [P] ([ADAS & AV International](https://adas.mydigitalpublication.com/january-2024/page-49)).
- **Racelogic VBOX 3i ADAS** shows test-fleet voice tagging is established but crude. A headset switch starts a tag, recording stops after 30 s, and the GNSS-synced WAV file is stored next to the data file [F] ([Racelogic](https://en.racelogic.support/VBOX_Automotive/Product_Info/VBOX_Data_Loggers/VBOX_3i_Product_Range/VBOX_3i_ADAS/User_Guide_VBOX_3i_ADAS/04_Installing_VBOX_3i_ADAS_in_the_Vehicle/Voice_Tagging_VBOX_3i_ADAS)).
- **Elektrobit** recommends tagging by voice or a steering-wheel button [V] ([Elektrobit](https://www.elektrobit.com/?p=37849)).
- **Tesla's FSD Beta v11** asked drivers for short voice notes after disengagements (2023) [P] ([Not a Tesla App](https://www.notateslaapp.com/news/1228/fsd-beta-v11-a-look-at-teslas-voice-drive-notes)).
- **Regulatory schemas** apply. Records must map onto forms such as California's OL 311R disengagement report, which records who initiated the disengagement, the location type and the cause [F] ([CA DMV](https://dmv.ca.gov/portal/uploads/2021/05/OL311R.pdf)).

For reasoning data, the industry chose office annotation instead. NVIDIA Alpamayo's chain-of-causation traces grew from about 700K to 3.7M through VLM auto-labels plus human structured annotation [F] ([HF Alpamayo-R1](https://huggingface.co/nvidia/Alpamayo-R1-10B)). Kognic's Language Grounding (2026-02-27) hides the future from annotators and says the work "cannot be effectively crowdsourced" [V] ([Kognic](https://www.kognic.com/articles/language-grounding-teaching-machines-why)).

The money is large, but it flows to services:

- **Lab funding.** Robotics and physical-AI labs raised about **$48B year-to-date in 2026** [P] ([AI Weekly on FT](https://aiweekly.co/alerts/ft-robotics-and-physical-ai-labs-raise-48b-ytd-on-data-hunt)). Figure reportedly committed more than $1B to data and compute [P] ([Forbes, 2026-08-26](https://www.forbes.com/sites/johnkoetsier/2026/08/26/figure-launches-gig-platform-to-get-humans-to-do-work-to-train-robots-will-spend-1-billion/)).
- **Cheap egocentric video dominates volume.** Gig recorders earn about $2.40–4.50/h, and labelers earn up to $0.50 per segment for writing short text [P] ([Globe and Mail, 2026-10-09](https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/)). One egocentric job posting says "no audio required" [A] ([Upwork](https://www.upwork.com/freelance-jobs/apply/Egocentric-Video-Data-Collection-Wear-Phone-Head-Daily-Household-and-Commercial-Activities_~022069743116691816976/)). No 2025–2026 source showed a buyer paying extra for live narration.
- **Teleoperation is expensive.** It costs $15–200/h by vendor-blog estimates that conflict by up to 10x [V/E] ([DataX Power](https://www.dataxpower.com/blog/humanoid-robot-data-collection-cost); [Robotics Center PDF](https://www.roboticscenter.ai/assets/pdf/state-of-robotics-2026.pdf)), so a voice layer adds little cost there.
- **Market sizes are weak.** Estimates for "robot training data" of $500M–1B in 2025–2026 come from low-quality reports [E] ([Robotics Center](https://ae.roboticscenter.ai/blog/future-of-robot-data-market-2026); [LP Information](https://pdf.marketpublishers.com/lpinfo/global-robot-manipulation-dataset-market-lp.pdf)).
- **Korea is funding the build-out.** A KIMM AI Humanoid Data Factory opened on 2026-11-03, and a 700 billion won manufacturing and physical-AI data library runs through 2030. None of the coverage mentions language or voice [P] ([Seoul Shinmun](https://www.seoul.co.kr/news/economy/2026/11/03/20261103500190); [Digital Daily, 2026-10-29](https://www.ddaily.co.kr/page/view/2026102910190541858)).

The fit is real but narrow [H]. To labs, the selling point is intent, corrections and failure reasons that vision-language models cannot see, not cheaper captions. LeRobot's describe step "narrates only what it actually sees" [F] ([LeRobot docs](https://huggingface.co/docs/lerobot/annotation_pipeline)). The buyers are lab data-operations leads, collection vendors and AV validation teams, all B2B. Teleop stations are quiet, so the noise advantage matters less there. Even at $50–200 per station per month, $300K of profit would need thousands of stations [E]. Physical AI should therefore shape the data model (frame-aligned timestamps, operator IDs, instruction and correction tags) from day one, while its exporters ship later.

## Incumbents bundle voice-to-form, and none of them offers it on-prem

### The competitive map

| Category | Examples (date) | Voice capability | Price | Deployment |
|---|---|---|---|---|
| Construction and frontline platforms | Procore AI Go (2026-10-21), Mitti (renamed 2026-08-11), Fieldwire, Raken | Push-to-talk spoken Q&A is live; creating daily logs by voice is "soon" (Procore) [V]; AI issue creation (Mitti) [F] | Mitti Premium $24/seat/month billed annually, free up to 10 users [F]; Fieldwire $0–89 [F]; Raken $15–80, conflicting sources [P] | Cloud SaaS. No on-prem or offline option on public pages [F] |
| Voice-to-form tools | Fulcrum Audio FastFill, Sitemate AI Form Fill, Highwire, Benetics, SuperReports | Speech turned into structured fields or draft reports for approval [V/P] | Fulcrum about $43 [P]; SuperReports $29 per superintendent [P] | Cloud. Benetics is built on OpenAI [P] |
| Push-to-talk radio with transcription | Zello, Buddycom (with RICOH, July 2026), Cybertel Bridge (Korea, on-device STT) | Transcription, AI digests, extraction of work records [F/V/P] | Zello Plus $12.75/user/month [F]; Buddycom ¥1,200 including 10 h of transcription [F] | Zello Enterprise offers "on-premise server options" [F] |
| Police bodycam AI | Axon Draft One, Motorola Assist and SVX | Audio turned into draft reports [P/V] | $199–570 per officer per year, bundled [P] | Cloud (Azure; CommandCentral) |
| Hands-free hardware | RealWear Navigator 520 | Offline dictation only in US English, German and Mandarin [F] | $3,300–3,750 [F/V] | Device |
| Korean safety apps | 세이프로, 스마트위험성평가V2, Plan2Do, 세이프디, AI안전함; GS AIR (free to SMEs) | Voice input not verified; GS AIR generates risk assessments [P] | No published prices | B2B contracts |
| Korean large-contractor tools | GS Xi Voice, Lotte with Daewoo, DL 어깨동무M, HJ Hi-Worker, Hanwha 안전신문고 | TBM interpretation; voice auto-fill for reports [P] | In-house | Not disclosed |
| Self-hosted ASR licences | Deepgram, Speechmatics, NVIDIA AI Enterprise (Riva), Azure disconnected containers, Selvas server edition | ASR engines only | NVIDIA $4,500/GPU/year [F]; others estimated at $15–50K+/year [E] | On-prem, enterprise contracts only |

Sources: [Procore](https://www.procore.com/press/procore-launches-voice-first-ai-mobile-app-built-for-the-jobsite), [Mitti pricing](https://mitti.com/pricing/), [Mitti rebrand](https://www.cadillacnews.com/ap/business/safetyculture-becomes-mitti-unveiling-a-platform-built-for-the-future-of-frontline-work/article_4f035e24-a056-51d2-8b87-2a42ce236a7c.html), [Fieldwire](https://www.fieldwire.com/pricing/), [Raken pricing](https://erpresearch.com/erp-add-ons/construction/raken/pricing), [Fulcrum](https://toolradar.com/tools/fulcrum/pricing), [Sitemate](https://sitemate.com/use-cases/safety-inspection), [Benetics](https://techintelpro.com/news/benetics-ai-voice-assistant-expands-to-us-canada-at-groundbreak), [SuperReports](https://www.getapp.com/all-software/a/superreports/), [Zello](https://zello.com/pricing/), [Buddycom](https://buddycom.net/price/), [Buddycom for RICOH](https://digitalpr.jp/r/138507), [Cybertel Bridge](https://linkonbiz.com/product/iframe-detail/11001), [Axon pricing](https://fintool.com/app/research/companies/AXON/earnings/Q1%202025), [RealWear languages](https://developer.realwear.com/docs/hardware/languages), [RealWear shop](https://shop.realwear.com/products/realwear-navigator-520), [GS AIR](https://www.koreatimes.co.kr/business/companies/20260119/gs-to-offer-self-developed-ai-safety-agent-free-of-charge-to-smes), [NVIDIA](https://docs.nvidia.com/ai-enterprise/planning-resource/licensing-guide/latest/pricing.html), [Deepgram self-hosting](https://developers.deepgram.com/on-prem), [Speechmatics licensing](https://docs.speechmatics.com/on-prem/containers/licensing), [Azure disconnected containers](https://learn.microsoft.com/azure/ai-services/containers/disconnected-containers), [Selvas](https://www.venturesquare.net/956911/).

Speech-to-form is becoming a bundled feature of platforms that already own the crew. Mitti alone claims more than two million frontline workers across 80,000 organizations [V] ([Business Wire via Cadillac News, 2026-08-11](https://www.cadillacnews.com/ap/business/safetyculture-becomes-mitti-unveiling-a-platform-built-for-the-future-of-frontline-work/article_4f035e24-a056-51d2-8b87-2a42ce236a7c.html)). None of these platforms lists on-prem or private deployment on a public page. The only on-prem option among field-voice products is Zello's Enterprise tier, which records radio traffic rather than structured records [F] ([Zello](https://zello.com/pricing/)). The researcher expects Procore's in-package voice app and OpenAI-based entrants to commoditize "speak and it fills the form" within 12–18 months [H].

Transcription by itself is already priced at $8–15 a seat inside push-to-talk apps. Korean speech AI is consolidating: Ubase, Korea's largest AI contact-centre company, agreed to acquire RTZR [P] ([Outsource Accelerator](https://news.outsourceaccelerator.com/?p=83938)). Standalone transcription is a feature market [H].

The user's rule is that convenience counts even when a feature is free elsewhere, and it applies here. Crowding is a real risk, but it is not a reason to drop the job. The wedge is everything the incumbents do not do [H]:

- capture with one press while wearing gloves;
- offline evidence packaged for an inspector or a court;
- Korean recognition that works on site;
- deployment that never leaves the customer's network.

Licensed self-hosted ASR does not change this picture. At an estimated $5–50K a year before integration, it is far above a $15–40 per-seat SaaS budget [E]. Open models on the vendor's own server are the realistic cost floor.

### "No external cloud" is a requirement tied to data grade, not a blanket ban

The security story has softened since 2023:

- **Samsung** banned generative AI in May 2023 after engineers uploaded source code [P] ([NBC News](https://www.nbcnews.com/tech/tech-news/samsung-bans-use-chatgpt-employees-misuse-chatbot-rcna82407)). On 2026-05-26 it adopted ChatGPT, Gemini and Claude for its DX division, but only for staff who complete security training. Internal data stays on the in-house Samsung Gauss [P] ([Herald, 2026-05-25](https://www.heraldk.com/article/2026052520140966904)).
- **Korean finance.** The Financial Services Commission (FSC) relaxed network separation (망분리) for security-purpose generative AI in May 2026 [P] ([Daum/News](https://v.daum.net/v/20260524120202416)).
- **Korean public sector.** The NIS's N2SF framework replaces blanket network separation with Confidential, Sensitive and Open data grades, and broadly allows generative AI only for Open data [P] ([Newsis, 2026-03-13](https://www.newsis.com/view/NISX20260313_0003547805)). CSAP cloud certification is being folded into a single NIS-run verification [P] ([Digital Daily, 2026-04-19](https://www.ddaily.co.kr/page/view/2026041901574681336)).

The other side is just as concrete:

- **US defence.** CMMC Phase 2, with third-party Level 2 certification, starts on **2026-11-10**, five days after this report. Cloud providers handling controlled unclassified information (CUI) must meet FedRAMP Moderate or an equivalent [F/P] ([DoD CIO](https://dodcio.defense.gov/cmmc/About); [Arnold & Porter](https://arnoldporter.com/en/perspectives/advisories/2025/09/cmmc-final-rule-key-takeaways-for-defense-contractors)).
- **Single-vendor risk.** Defence-tech firms reportedly dropped Claude after a Pentagon blacklisting of Anthropic. The date is unverified, but it shows that depending on one model vendor carries political risk [P] ([Capital Brief](https://www.capitalbrief.com/briefing/defence-tech-companies-drop-claude-after-pentagon-blacklists-anthropic-d5368958-2be4-4e26-a92c-e98e727e3d31/)).
- **Survey data.** A vendor-sponsored Cloudian survey (about 203 respondents) found that 91% would put AI on sensitive data on-prem (20%), in a private cloud (33%) or in a hybrid (38%). 58% had declined, delayed or scaled back an AI initiative over data leaving their premises [V-sponsored] ([Cloudian](https://cloudian.com/press/enterprise-repatriating-ai-workloads/)).
- **Plant phone controls.** Korean plants enforce phone controls physically. A Samsung Semiconductor partner MDM app blocks the camera in secured zones [V] ([App Store](https://apps.apple.com/us/app/%EC%82%BC%EC%84%B1%EB%B0%98%EB%8F%84%EC%B2%B4-%ED%98%91%EB%A0%A5%EC%82%ACmdm/id6451467400)).

The durable requirement is control by data grade [H]. Audio, photos and GPS of plants and sites are what most security teams will classify as Sensitive or Confidential, while generic office text is opening up. Buyers will ask first for a private cloud or a hybrid. Fully air-gapped deployment is a niche of defence, fabs and some public bodies, with long sales cycles. Being neutral about model vendors is a selling point in its own right.

### The profit target forces a hybrid of self-serve and on-prem deals

The market researcher's arithmetic assumes about 70% contribution margin. On that basis, $300K of profit needs about $430K of revenue [E], which is any one of:

- roughly **1,200 paid seats on average at $30 a month**;
- 2,400 seats at $15;
- **10–15 self-hosted deals at $30–40K a year**.

Year 2's $0.5–1M doubles or triples those numbers.

One refinement matters [E]. Seats sold during the year earn only for the months they are paid. With a linear ramp from zero, the business needs about **2,400 seats at $30 by month 12** to average 1,200. Annual-prepaid on-prem licences avoid this ramp penalty, which favours a few B2B deals in year 1.

| Segment | Self-serve? | No-external-cloud need | Plausible price [E] | Evidence and risk |
|---|---|---|---|---|
| US and EU small contractors, foremen, independent inspectors | Yes | Low | $15–40 per seat per month; inspectors $30–100 | Free tiers are the norm, and Procore and Benetics are moving in [H] |
| Korean specialty subcontractors' safety managers | Possible but hard | Low to medium | ₩10–30K per seat per month, or a flat price per site | Legal pressure is high, but free tools and subsidies compress prices, and the buyer is often the prime contractor [H] |
| Korean small factories (5–49 workers) | Possible | Medium | ₩50–200K per site per month | Newly under SAPA. The smart-safety subsidy covers up to 80–90% (capped at 30M KRW) if the product registers as an eligible item; whether software-only voice loggers qualify is unverified [P/H] ([Kyungbuk Maeil](https://www.kbmaeil.com/article/20260831500493)) |
| Korean mid-size manufacturers (100–999 workers) | Hybrid: self-serve trial, then a sales-assisted box | **High** | $5–30K per site per year | They have security rules but no budget for a system integrator, so a box on-prem could be the wedge [H] |
| Large contractors, utilities, public bodies | No | Medium to high | Enterprise licence or tender | They build in-house or buy through procurement, such as Selvas on the PPS Digital Service Mall [P] |
| Semiconductor and defence | No | Very high (air-gap) | Enterprise on-prem | Long security reviews [H] |
| Robot and AV data teams | Weak | Medium | $50–200 per station per month | B2B services dominate [H] |

## The microphone, not the model, decides accuracy on a loud site

### One RTX 4090 is ample for authoritative Korean and English transcription

Throughput is not the constraint. faster-whisper processed 13 minutes of audio in 17 s at batch size 8 on an RTX 3070 Ti, using 6.1 GB of VRAM [F] ([faster-whisper](https://github.com/SYSTRAN/faster-whisper)). The ASR researcher estimates that a 4090 transcribes 100 hours of daily speech in well under an hour of GPU time with any shortlisted model [E].

VRAM is comfortable too. Qwen3-ASR-1.7B needs about 4–6 GB, Whisper large-v3 3–6 GB and Nemotron 2–3 GB [E]. That leaves room for a 4-bit 26–35B mixture-of-experts LLM, or an 8-bit 7–9B one, if jobs run one after another [E]. The binding limit on the user's box is its 29 GiB of system RAM. Heavy jobs should run one at a time under a memory cap, as the user already does.

Accuracy is the real constraint, and the Korean evidence is thin.

| Server model (release) | Korean evidence | Licence | Notes |
|---|---|---|---|
| Qwen3-ASR-1.7B (January 2026) | FLEURS-ko 2.57, CommonVoice-ko 5.88 [V] | Apache-2.0 [F] | Mandarin ExtremeNoise 16.17 vs 63.17 for Whisper-large-v3 [V]. Context prompt of up to 10k tokens [V/P]. Streams only on vLLM, without timestamps [F] |
| Cohere Transcribe 03-2026 (2B) | Korean supported, but per-language error rates appear only in a figure [V] | Apache-2.0, gated download [V/P] | English #1 on the Open ASR leaderboard at 5.42 WER (March 2026) [V]. Needs a language tag, was not trained on code-switching, and transcribes non-speech sounds, so it needs voice activity detection (VAD) [V] |
| Whisper large-v3 or turbo, via faster-whisper or WhisperX | FLEURS-ko CER 3.2 on the HiKE benchmark [P]; raw large-v3 KsponSpeech eval_clean CER 17.03 [P] | MIT / BSD-2 [F] | Baseline for code-switching. Hallucinates on non-speech without VAD [P] |
| Nemotron 3.5 ASR Streaming 0.6B (2026-06-04) | FLEURS-ko CER 7.12–7.59, depending on chunk size [V] | OpenMDW-1.1, "ready for commercial use" [F] | True streaming. The same model can run on the phone |
| Voxtral Mini 4B Realtime (February 2026) | Korean is the second-worst language at every delay [V] | Apache-2.0 [F] | Not suited to Korean |
| Parakeet-TDT-0.6B-v3 | No Korean [F] | CC-BY-4.0 [F] | English-only fallback. WER rises from 6.34 clean to 11.66 at 0 dB on MUSAN noise [V] |

Sources: [Qwen3-ASR report](https://arxiv.org/html/2601.21337v1), [Qwen3-ASR card](https://huggingface.co/Qwen/Qwen3-ASR-1.7B), [Cohere](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release), [HiKE](https://arxiv.org/html/2509.24613v4), [batisay card](https://huggingface.co/batiai/batisay-ko-base), [Nemotron card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b), [Voxtral card](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602), [Parakeet card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).

Four caveats keep this table from settling the choice:

- **The numbers do not compare cleanly.** Qwen3 and HiKE report CER, Voxtral's table is unlabelled, and Nemotron warns that its own text normalization inflates its error rates.
- **Code-switching is the likely failure point for industrial Korean.** By that we mean Korean speech with English part numbers and equipment names. On HiKE, Whisper-Large reaches 26.1% mixed error rate (MER) versus 21.8% for GPT-4o-transcribe. Fine-tuning Whisper-Medium on natural code-switched speech cut MER from 31.3 to 9.0, but raised Korean CER from 3.4 to 6.0 [F/P] ([HiKE](https://arxiv.org/html/2509.24613v4)).
- **No vendor publishes Korean results in noise.** One Korean fine-tune trained with synthetic construction-site noise warns that Whisper models may invent or repeat text in heavy noise [P] ([whisper-wesol-ko](https://friendli.ai/models/TLSJ/whisper-wesol-ko)).
- **Fine-tuning data has licence limits.** Zeroth-Korean is CC BY 4.0 [F] ([OpenSLR 40](https://www.openslr.org/40/)). AI Hub's general policy allows for-profit research and development, but only for training. It requires NIA attribution, needs a separate agreement for overseas transfer, and does not address deploying trained models [F] ([AI Hub policy](https://www.aihub.or.kr/intrcn/guid/usagepolicy.do)). **Counsel** should confirm this before any model trained on KsponSpeech ships.

The practical consequence is that the user's own recordings are the missing benchmark. Subway runs and site-noise playback in Korean and English, scored with one normalized CER, will decide the model. Published tables will not [H].

### The phone can stream Korean offline, at a size and licence cost

| On-device option | Size in app | Korean | Streaming and biasing | Caveats |
|---|---|---|---|---|
| Platform `SpeechRecognizer` (Google SODA) | 0 MB | Recognized Korean and English with language detection on the user's Galaxy S25 running Android 17 ([SPIKE.md](../../../apps/mobile/SPIKE.md), internal, 2026-11-03) | Partial results; no hotword API | The segmented-session flag was ignored, so a restart loop is needed. Screen-off and background behaviour untested |
| ML Kit GenAI Speech Recognition 1.0.0-alpha2 | 0 MB | Basic mode: ko-KR in beta. Advanced mode: ko-KR not in beta, with SM8750 (Snapdragon 8 Elite) listed [F] | Partial results | Alpha, "not subject to any SLA" [F]. Another page snapshot lists Advanced mode for Pixel 10 only [P]. Check `checkFeatureStatus` at runtime |
| sherpa-onnx Nemotron 3.5 int8 | About 650 MB (627 + 14 + 9.1 MB) [F] | FLEURS-ko CER about 7.1–7.6 [V] | True streaming; transducer hotwords likely, unconfirmed for Korean | No Android APK listed for the multilingual build [F]. Speed, memory and battery unmeasured on the S25 |
| sherpa-onnx Qwen3-ASR-0.6B int8 | About 937 MB [F] | FLEURS-ko 3.72 [V] | Offline only in sherpa | RTF 0.53 on a Galaxy S10 [P] |
| Korean streaming zipformer | About 160 MB | Converted from a KsponSpeech recipe [F] | Hotwords | AI Hub data terms apply; development use only until cleared |
| Moonshine tiny-ko and base-ko | About 34 MB | FLEURS-ko CER 8.9 and 8.00 on GGUF ports [P] | Non-streaming | Community License: commercial use after registration, terminating above **US$1M annual revenue** [F] |

Sources: [ML Kit GenAI](https://developers.google.com/ml-kit/genai/speech-recognition/android), [sherpa Nemotron](https://k2-fsa.github.io/sherpa/onnx/nemo/nemotron-streaming.html), [sherpa Qwen3-ASR](https://k2-fsa.github.io/sherpa/onnx/qwen3-asr/export.html), [VoicePing phone benchmark](https://voiceping-landingpage-prod.pages.dev/en/blog/research-offline-speech-transcription-benchmark/), [k2-fsa zipformer](https://huggingface.co/k2-fsa/sherpa-onnx-streaming-zipformer-korean-2024-06-16), [Moonshine LICENSE](https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE), [Moonshine base-ko GGUF](https://huggingface.co/handy-computer/moonshine-base-ko-gguf).

The Voice Life Companion's cap of about 100 MB per model (technical-decisions §4.5) would leave only the zero-size platform recognizer for Korean in this product. Moonshine's revenue ceiling also collides with the year-2 target, because $0.5–1M of profit implies roughly $0.7–1.4M of revenue at the assumed 70% margin [E].

The ASR researcher estimates that the S25 runs Nemotron at a real-time factor (RTF) of about 0.05–0.15 using 0.8–1.2 GB of RAM, and Qwen3-ASR-0.6B at 0.1–0.25 using 1.2–1.8 GB [E]. Android 17 now enforces memory limits based on device RAM [F] ([Android 17 changes](https://developer.android.com/about/versions/17/behavior-changes-all)), so a resident ASR model that grows too large shows up as recording that stops for no visible reason.

The sensible split is for the phone to give live feedback and an offline safety net, while the server, after sync, produces the authoritative transcript [H]. Five items in technical-decisions.md (§1.1, §4.3, §4.5) are now stale:

- the Moonshine licence wording;
- ML Kit Advanced mode on the S25;
- the size of Qwen3-ASR-0.6B (937 MB, not "likely over 100 MB");
- the AI Hub licence status;
- the absence of Nemotron 3.5 as a Korean and English streaming option.

### Enhancement hurts, VAD misfires, and the SNR is set at the mouth

Generic speech-enhancement front-ends usually hurt modern recognizers:

- In a December 2025 study, MetricGAN+ before Whisper, Parakeet and Gemini raised semantic WER in **all 40 configurations** tested [F/P] ([arXiv 2512.17562](https://arxiv.org/abs/2512.17562)).
- A 2026 study found that only weak, partial magnitude correction helped Whisper (6.44 to 5.57), and full correction undid the gain [F] ([arXiv 2607.11157](https://arxiv.org/abs/2607.11157)).
- SAM-Audio produced cleaner-sounding output but higher error rates [P] ([arXiv 2603.04710](https://arxiv.org/abs/2603.04710)).

Training on noise works better. Qwen3-ASR's ExtremeNoise result and Cohere's training at 0–30 dB signal-to-noise ratio (SNR) are the vendor evidence [V]. Enhancement should therefore produce only the human-listening copy of the audio, while recognition gets raw or minimally processed audio [H].

Korean subway cars measure **72.0–79.1 dBA LAeq** [P] ([Hanyang ScholarWorks](https://scholarworks.bwise.kr/hanyang/handle/2021.sw.hanyang/161903)), with strong content below 100 Hz. Speech at 1 m runs about 58–60 dB at normal effort and 76 dB shouted [P] ([ESTA](https://protocol.esta.org/fall-2019/page-25)). The ASR researcher's acoustic estimates show why microphone placement dominates:

| Capture position [E] | Subway (about 75 dBA) | Factory or site (85–100 dBA, shouting) |
|---|---|---|
| Phone held at about 30 cm | About 0 to +7 dB SNR | About −15 to 0 dB, where every published model degrades badly |
| Phone in a pocket, or chest-mounted bodycam | About −5 to +3 dB | Worse than phone in hand |
| Earbud mic with two-mic beamforming | About +8 to +15 dB | About −7 to +8 dB (extrapolated here from the +8 dB advantage over 30 cm) |
| Close-talk noise-cancelling boom | About +20 to +25 dB | About +5 to +15 dB, the usable range |

For scale, Parakeet already reaches 19.9% WER at −5 dB on MUSAN noise [V]. The subway is therefore a fair proxy for moderate noise with earbuds, but it understates the factory problem. A high-pass filter at about 80–100 Hz is a cheap, safe pre-step [H].

VAD fails exactly where sites are loudest. Silero VAD v5 correctly classified only 61% of pure-noise ESC-50 clips at utterance level, so up to about 40% of noise could pass as speech [P] ([Calm-Whisper](https://arxiv.org/html/2505.12969v1)). In a Korean study, vanilla Whisper hallucinated text on 100% of 3,429 UrbanSound8K noise samples, and Silero filtering cut that to 0.73% [P, second-hand] ([SNU PDF](https://hi.snu.ac.kr/wp-content/uploads/sites/103/2026/07/26하계전자공학회_박우성.pdf)). Silero is MIT-licensed, about 2 MB, and takes under 1 ms per 30 ms chunk [F] ([Silero VAD](https://github.com/snakers4/silero-vad)). TEN VAD claims sharper endpoints, but its Apache-2.0 licence carries "additional conditions" that must be read before shipping [F/V] ([TEN VAD](https://github.com/TEN-framework/ten-vad)).

At 85–100 dB, the trigger should be push-to-talk: an earbud tap, a hardware button, or a headset's voice-operated switch. VAD-gated listening is for quieter places. Low-confidence or no-speech segments should be flagged rather than logged as text [H].

Hardware ranks in the same order as the SNR table:

- **Close-talk boom headsets.** The 3M Peltor WS LiteCom Pro III has a noise-cancelling boom mic, IP67 sealing and Bluetooth hands-free (HFP) support [V/P] ([3M](https://3m.com/3M/en_US/p/d/b10263723)). RealWear rates its four-mic array for recognition up to 100 dBA [V] ([RealWear specs](https://shop.realwear.com/pages/realwear-navigator-520-specifications)).
- **Bone-conduction sensors fused with air mics.** One such system reached 9.13% CER against 58.75% for an air mic in real noise of 62–74 dBA [P] ([NTU](https://scholars.lib.ntu.edu.tw/handle/123456789/488045)).
- **Earbuds**, then **phones and chest bodycams**.

Bluetooth adds a codec ceiling. Wideband HFP covers 50 Hz–7 kHz, and LE Audio LC3 super-wideband covers 50 Hz–14 kHz [P] ([MobileSyrup](https://mobilesyrup.com/2023/04/17/android-bluetooth-calls-improved-super-wideband-speech/)). Galaxy Buds3 Pro use LE Audio [P] ([SamMobile](https://www.sammobile.com/samsung/galaxy-buds-3-pro/)), while the QCY earbuds used earlier in the repo are likely narrowband classic HFP (technical-decisions §1.1, §8). A headset's own aggressive noise suppression is also an enhancement front-end, so each headset needs testing with scripted Korean and English phrases under controlled noise playback [H].

### Biasing, diarization and local LLMs fill the gaps around ASR

Domain vocabulary needs three layers [H]:

1. **Decoder biasing with the site's equipment list.** sherpa-onnx supports hotwords only for transducer models with modified beam search [F] ([sherpa hotwords](https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html)). NeMo supports per-stream phrase boosting for streaming RNNT models [F] ([NeMo docs](https://docs.nvidia.com/nemo/speech/3.0.0/asr/asr_customization/word_boosting.html)). Qwen3-ASR takes free-text context [V/P] ([Alibaba docs](https://docs.platform.qianwenai.com/developer-guides/accuracy-tuning/speech-recognition)). The platform recognizer has no hotword API. Part numbers such as "P-203B" are poorly served by token boosting alone.
2. **A deterministic normalizer** that turns spoken digits, letters and Korean numerals into codes.
3. **A server LLM pass** that snaps candidates to the site dictionary and flags uncertain ones for confirmation.

For group TBM recordings, the default speaker-separation (diarization) model is pyannote community-1 (CC-BY-4.0, gated), with diarization error rates (DER) of about 17–20% on meeting benchmarks [F] ([pyannote](https://huggingface.co/pyannote/speaker-diarization-community-1)). A single phone in the middle of a noisy yard will be poor, so it is better to capture the leader's briefing on a close-talk mic and take attendance separately [H].

For structuring transcripts on the 4090, the usable models are Apache-2.0: Qwen3.5 [P, single source] ([Verdent](https://www.verdent.ai/guides/model/qwen-3-5)), Gemma 4 [P] ([The Decoder](https://the-decoder.com/googles-gemma-4-is-now-available-with-apache-2-0-licensing-for-the-first-time/)), Kanana 1.5 8B [P] ([HF](https://huggingface.co/kakaocorp/kanana-1.5-8b-instruct-2505)) and A.X 4.0 Light [V] ([SKT](https://sktelecom.github.io/en/project/axllm)). EXAONE 4.0 is non-commercial and excluded [F] ([HF](https://huggingface.co/LGAI-EXAONE/EXAONE-4.0-32B)). The licence files of Gemma 4, Qwen3.5 and A.X were not checked on primary pages and need confirmation before shipping.

## An append-only, hash-chained event log serves every use case

### Sync: a small outbox beats every off-the-shelf engine

This domain rarely produces conflicts. Each utterance, photo or marker is created once by one device and never changed. Corrections are new events that reference the original, so an idempotent, server-authoritative "insert if absent by ID" is enough [E]. Each off-the-shelf engine fails at least one hard constraint:

| Engine | Licence | Blocking issue for this product |
|---|---|---|
| PowerSync | Service Apache-2.0 since **2026-11-03** (PR #878); client SDK Apache-2.0 [F] | Workable fallback. It adds a service and its storage database to the appliance, and writes still go through your own API [V]. Its legal pages still say FSL, so recheck |
| Zero (Rocicorp) | Apache-2.0 [F] | "Writes are rejected" while offline [V] |
| Electric | Apache-2.0 [F] | "Does not do write-path sync" [V] |
| Turso offline sync | MIT [F] | Beta, "data loss is possible", built around Turso Cloud [V] |
| Realm / Atlas Device Sync | Apache-2.0 database [F] | Sync reached end-of-life on 2025-09-30 [F] |
| Couchbase Lite for React Native | Enterprise edition [F] | Licence |
| Ditto | Proprietary [V] | Contact-sales pricing. It is the only mature device-to-device mesh, which may matter later for tunnels |

Sources: [PowerSync licence history](https://github.com/powersync-ja/powersync-service/commits/main/LICENSE), [PowerSync writes](https://docs.powersync.com/installation/app-backend-setup/writing-client-changes), [PowerSync legal](https://powersync.com/legal/licensing-terms), [Zero](https://zero.rocicorp.dev/docs/connection), [Electric](https://electric.ax/docs/guides/writes), [Turso](https://turso.tech/blog/turso-offline-sync-public-beta), [Realm](https://www.mongodb.com/docs/atlas/device-sdks/deprecation/), [Couchbase](https://github.com/Couchbase-Ecosystem/cbl-reactnative), [Ditto](https://ditto.com/pricing/cloud-sync).

The recommended design keeps an `events` table and an outbox index in expo-sqlite or op-sqlite [E]. The device sends `POST /sync/push` with its device ID, starting sequence number and a batch of events. The server returns the acknowledged sequence number and its own hash of each event. A `GET /sync/pull` channel brings down configuration, reviewer edits and project metadata. This is roughly WatermelonDB's protocol shape, simplified [V] ([WatermelonDB](https://watermelondb.dev/docs/Sync/Intro)).

### Media: short hashed segments over resumable uploads

Audio should be written as short, immutable segments of 10–60 s or one utterance each. SHA-256 is computed on the device when each segment closes [E]. This turns a large upload into many small ones that finish in short connectivity windows, limits a crash to losing one segment, and gives natural units for integrity checks.

The upload protocol is tus. Its checksum extension uses an `Upload-Checksum` header and returns `460 Checksum Mismatch` [F] ([tus protocol](https://tus.io/protocols/resumable-upload)). The reference server tusd is MIT-licensed, at v2.10.1 (2026-09-16) [F] ([tusd](https://github.com/tus/tusd)), and tus-js-client supports React Native [F] ([tus-js-client](https://github.com/tus/tus-js-client)). Production uploads should move into the Kotlin layer so background execution does not depend on the JavaScript runtime. Local files are never deleted until the server echoes the same hash [E].

For storage, MinIO's GitHub repository is archived and its community edition is "source code only" under AGPLv3 [F] ([MinIO](https://github.com/minio/minio)). Garage is AGPL and lacks Object Lock [V] ([Garage](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)). The appliance should start with tusd's local filesystem store and move to SeaweedFS (Apache-2.0) when it needs an S3 layer [F/E] ([SeaweedFS](https://github.com/seaweedfs/seaweedfs)). **Counsel** should review any AGPL component bundled into a commercial appliance.

Android's scheduling rules set the transport:

- Android 15 caps dataSync foreground services at **6 hours in 24** [F] ([FGS timeout](https://developer.android.com/develop/background-work/services/fgs/timeout)).
- Android 14 added user-initiated data-transfer (UIDT) jobs for transfers the user explicitly asks for [F] ([UIDT](https://developer.android.com/develop/background-work/background-tasks/uidt)).
- Android 16 puts jobs that run alongside a foreground service under quota [F] ([Android 16](https://developer.android.com/about/versions/16/behavior-changes-all)).

The resulting pattern is opportunistic pushes from the recording service's own thread during a session (to be verified against Play policy), WorkManager for routine sync, and a UIDT job for "Sync now" or end of shift [E].

### Time: the boot clock plus server exchanges beats Android's wall clock

Stock Android checks network time over SNTP roughly every 18 hours, with a theoretical error of up to about **2.5 s** [F] ([AOSP network time](https://source.android.com/docs/core/connect/time/network-time-detection)). Phone drift can exceed 150 ms a day [P] ([Kyushu Univ.](https://kyushu-u.elsevierpure.com/en/publications/rapid-clock-synchronisation-for-ubiquitous-sensing-services-invol/)). App-level NTP with drift correction stayed within 1 ms in 95% of cases on campus Wi-Fi [P] ([GoodClock](https://github.com/nesl/GoodClock)).

The design follows [E]:

1. Stamp every event with `elapsedRealtimeNanos` plus a boot ID.
2. Map audio frames to time with `AudioRecord.getTimestamp`, which "cannot account for any delay unknown to the implementation" [F] ([AudioTimestamp](https://developer.android.com/reference/android/media/AudioTimestamp)).
3. Log NTP-style exchanges with the on-prem server on connect, every few minutes during a session, and at stop.
4. Fit offset and drift on the server.
5. Discipline the server to robot or vehicle time with chrony or PTP.

The weak link is Bluetooth. HFP adds about 40 ms [P] ([USPTO 10705793](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10705793)), and Bluetooth Classic is "typically 100ms" against 20–30 ms for optimized LE Audio links [P] ([audioXpress](https://audioxpress.com/article/wireless-audio-ultra-low-latency-audio-transmission-over-bluetooth-le-audio)). The app should record the input route with every segment, calibrate each headset model once with a loopback chirp, and offer clapperboard-style sync markers: a chirp, or a QR code showing corrected time, for the robot's camera to capture.

With calibration on Wi-Fi, ±50 ms end to end is realistic [E]. That meets LeRobot's frame-exact requirement once utterances are snapped to frame timestamps [F] ([LeRobot](https://huggingface.co/docs/lerobot/annotation_pipeline)).

### Integrity: hash at capture, chain on the device, prove on the server

The canonical record is one table with a type field and a JSON payload [E]. Each record carries:

- **Identity:** a UUIDv7 ID, the device and user, the session and a per-device sequence number.
- **Time:** boot-clock times plus UTC estimates with uncertainty.
- **Content:** transcript revisions with the engine and model version, per-word timing, and a pointer to the audio segment with its hash.
- **Context:** the input route, a GPS fix with accuracy, photo hashes, and the template field (for example the TBM form).
- **Lifecycle:** supersede and annotate links, a consent reference and a retention class.
- **Integrity:** `prev_hash` and `record_hash`.

The OpenTelemetry logs model, which is stable, gives naming precedent for "when it happened" versus "when it was observed" [F] ([OTel](https://opentelemetry.io/docs/specs/otel/logs/data-model/)). Robot exports derive from this record on the server: MCAP with JSON-schema channels and `foxglove.Log` [F] ([MCAP spec](https://mcap.dev/spec)), rosbag2, and LeRobot v3.x language columns [V] ([LeRobot v3](https://huggingface.co/docs/lerobot/lerobot-dataset-v3)).

Integrity should be a property of capture [E]:

1. Hash every segment and photo on the device, and chain each device's events through `prev_hash`.
2. Sign periodic checkpoints with a hardware-backed P-256 key. Knox Vault backs StrongBox on Galaxy S21 and later [V] ([Knox Vault](https://docs.samsungknox.com/admin/fundamentals/whitepaper/samsung-knox-mobile-security/system-security/knox-vault/)). Verify the key's attestation chain at enrolment [F] ([Key attestation](https://source.android.com/docs/security/keystore/attestation)). Android 17 caps an app at 50,000 Keystore keys, so use one key per device, not per record [F] ([Android 17](https://developer.android.com/about/versions/17/behavior-changes-all)).
3. On the server, append hashes to a Merkle transparency log such as Trillian Tessera (Apache-2.0) [F] ([Tessera](https://github.com/transparency-dev/tessera)).

This mirrors Axon Evidence, which stores a SHA-2 hash on arrival and shows it in the audit trail [V] ([Fort Pierce packet](https://public.destinyhosted.com/fortpdocs/2020/CCCONFER/20200713_1686/11411_PCAC_Body_Camera_Ordinance_Recommendation.pdf)). It also matches what Korean courts examine. Supreme Court 2013도2511 calls equal hash values a "유력한 방법" (strong method) for proving that a copy is identical to the original. 2012도7461 makes direct comparison such as hashing the principle for recordings [P] ([nepla](https://www.nepla.ai/wiki/형사/형사소송/전자기록의-증거능력-1zp8jvww8j43); [LawTalk](https://www.lawtalk.co.kr/posts/105292)).

C2PA 2.2 can add portable content credentials to JPEG, MP4/M4A and WAV files [F] ([C2PA 2.2](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)), and an Apache-2.0 Android library exists [F] ([c2pa-android](https://github.com/contentauth/c2pa-android)). The Galaxy S25 adds C2PA only to images edited with Galaxy AI [P] ([PetaPixel](https://petapixel.com/2025/02/13/samsungs-image-authenticity-approach-is-backward-and-its-ais-fault)), and an app-issued certificate shows as an "unknown signer", so C2PA is a bonus, not the core mechanism.

### Security: the appliance must pass a review and an MDM gate

**On the device.** The local database should be encrypted with SQLCipher, through expo-sqlite's `useSQLCipher` build option [F] ([Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)), or op-sqlite's SQLCipher build. op-sqlite "accepts the key and ignores it" when the native build lacks SQLCipher, writing plaintext silently [V] ([Stream docs](https://getstream.io/chat/docs/sdk/react-native/v10/state/offline-support/encrypting-the-offline-database/)), so a startup self-check that the file is not plaintext is mandatory [E].

**Identity and network.** A device enrolled by QR code gets a StrongBox key and a client certificate from the appliance's CA. All traffic then uses mutual TLS (mTLS) plus OIDC user tokens [E]. Network options, in order of large-customer preference [E]:

1. The customer's MDM per-app or always-on VPN [V] ([Intune](https://learn.microsoft.com/en-us/mem/intune/configuration/vpn-settings-android-enterprise)).
2. A Headscale-controlled WireGuard mesh, which is BSD-3 licensed and works with the Tailscale Android client [F/P] ([Headscale](https://github.com/juanfont/headscale)).
3. Site Wi-Fi only, with offline buffering.

**The appliance.** It is a docker-compose stack:

- reverse proxy with mTLS;
- API and sync service;
- Postgres;
- tusd;
- GPU worker;
- Keycloak (Apache-2.0) [F] ([Keycloak](https://github.com/keycloak/keycloak)), or federation with the customer's identity provider;
- Tessera;
- chrony;
- backups;
- metrics.

It makes zero outbound calls by default.

**Security reviews.** Reviewers ask for SOC 2 or ISO 27001 scope, an SBOM, pen tests, SSO, RBAC, audit logs and encryption. Standard questionnaires assume multi-tenant SaaS [P] ([Teleport](https://goteleport.com/blog/saas-vs-on-prem-security/)).

**Plant phone controls are the bigger Korean deployment risk.** The Samsung Semiconductor partner MDM blocks the camera [V]. An LG Electronics MDM plan restricts phone functions after the gate [P] ([Pressian](https://pressian.com/pages/articles/106598)). The product's core functions (microphone, camera, GPS) are exactly what fabs block, so selling there means company-managed devices with the app allow-listed. That needs customer security sign-off and sales collateral, not just code [H].

### Android lifecycle and battery set hard rules

Since Android 14, a microphone foreground service created from the background throws a `SecurityException`, even though `checkSelfPermission()` still reports the permission as granted [F] ([FGS restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)). It also cannot start from `BOOT_COMPLETED` [F] ([FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)). Android 17 silently mutes background audio and fails audio-focus requests unless a properly started foreground service exists [F] ([Android 17 background audio](https://developer.android.com/about/versions/17/changes/bg-audio)).

The session service must therefore start only from the visible app, a notification action, a widget, or a deep link opened by the Samsung side button. After a reboot, the app posts a "Resume logging?" notification instead of restarting on its own [E]. Samsung scores in the worst tier for killing apps. Samsung claims that compliant foreground services on One UI 6.0 and later "work as intended", but user workarounds can be reverted by OS updates [P] ([dontkillmyapp](https://dontkillmyapp.com/samsung)). Onboarding should walk users through the "Unrestricted" battery setting and log process deaths [E].

No credible measurement exists of battery life under continuous recording plus on-device ASR [P] ([NAACL 2025](https://preview.aclanthology.org/setup/2025.naacl-industry.50)). A rough envelope of 0.4–1.0 W average, or about 15–35 h on an S25-class battery, suggests an 8–10 h shift is feasible [E]. It has to be measured in the first prototype week.

## Korean wiretap law makes ambient always-on capture the mode to avoid

**Korea: recording.** Under 통신비밀보호법 (the Protection of Communications Secrets Act), recording, or listening by device to, a non-public conversation between others is a crime carrying **1–10 years' imprisonment**, and the recording is inadmissible [P] ([korea.legal §14](https://korea.legal/wiki/%ed%86%b5%ec%8b%a0%eb%b9%84%eb%b0%80%eb%b3%b4%ed%98%b8%eb%b2%95-%ec%a0%9c14%ec%a1%b0/); [LawTalk](https://www.lawtalk.co.kr/posts/94570)). Commentators treat a participant recording their own conversation as lawful, though passing it to third parties can create civil liability [P] ([Lawtimes](https://www.lawtimes.co.kr/news/articleView.html?idxno=182425)). The criminal-risk scenario is a device left recording others while the wearer is absent. That rules out an unattended "leave it on the table" mode and a rolling audio pre-buffer by default. Axon itself keeps audio out of its bodycam pre-event buffer by default [V] ([Axon Body 4](https://www.axon.com/help/axon-body-4/cameras-and-sensors/body/operation.htm)).

**Korea: personal data, monitoring and location.** Further duties stack up:

- **Biometric data.** Voice becomes biometric sensitive information once it is used to recognize a speaker, which needs separate consent [P] ([nepla on voice data](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/녹음된-목소리를-ai-학습용으로-활용할-수-있을까-6349gpgz29zx); [Lawtimes](https://www.lawtimes.co.kr/news/articleViewAmp.html?idxno=172836)).
- **Worker-monitoring equipment.** Installing such equipment requires consultation with the 노사협의회 (labour-management council) at workplaces with 30 or more workers. The Supreme Court reads "monitoring equipment" by its effect [P] ([Shin & Kim](https://www.shinkim.com/kor/media/newsletter/2201)). Whether an AI tool counts depends on its functions [P] ([Shin & Kim](https://www.shinkim.com/kor/media/newsletter/2270)).
- **Mobile video devices.** Since 2023-09-15, business-purpose filming with mobile devices in public places must be signalled by "lights, sounds, signs or other means" (개인정보보호법 §25-2) [P] ([itwiki](https://itwiki.kr/w/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95_%EC%A0%9C25%EC%A1%B0%EC%9D%982)).
- **Location.** Collecting another person's location needs consent under 위치정보법 §15 [P] ([nepla](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/개인-위치정보를-활용한-근태-관리-사생활-침해일까-ov59rpxm0n06)).

**United States.** At least nine states clearly require all-party consent to record. Washington treats a recorded announcement as consent, and the strictest rule generally applies across state lines [P] ([Layer3 Labs, 2026-08-13](https://www.layer3labs.io/guides/two-party-consent-states)). Illinois BIPA lists "voiceprint" as a biometric identifier [F] ([740 ILCS 14/10](https://lig.ilga.gov/legislation/ilcs/documents/074000140K10.htm)). It requires written notice, a written release and a public retention schedule, though a 2024 amendment limits damages to one recovery per person [F] ([P.A. 103-0769](https://ilga.gov/legislation/publicacts/103/103-0769.htm)).

**European Union.**

- **Consent and legal basis.** Employee consent is rarely valid. Legitimate interest plus a documented balancing test is the norm, and German works councils have co-determination over monitoring systems [P] ([Baker McKenzie](https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/germany/topics/data-processing-in-the-employment-context)).
- **Voice assistants.** The EDPB's voice-assistant guidelines say designers should filter out background speech, and that a DPIA is "very likely" required [F] ([EDPB](https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf)).
- **Emotion inference.** AI Act Article 5(1)(f) bans inferring emotions in the workplace except for medical or safety reasons [P] ([FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/)).
- **High-risk deadlines.** The Digital Omnibus on AI, reported as Regulation (EU) 2026/1744 and in force from 2026-07-27, moves stand-alone high-risk obligations, including employment uses, to no later than 2027-12-02. This needs verification on EUR-Lex [P] ([NatLawReview](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force)).

The design rule that follows works across all three jurisdictions [H]:

- capture only conversations the wearer takes part in and starts deliberately;
- announce recording sessions;
- keep speaker labels anonymous unless someone opts in with separate consent;
- ship no emotion or stress inference anywhere.

| # | Jurisdiction | Question for counsel | Why it matters |
|---|---|---|---|
| 1 | Korea | Where is the line for a hands-free session the wearer arms? When does nearby talk become "others' conversation" under 통신비밀보호법 §14/§16, and what auto-pause rule is enough? | Criminal penalty of 1–10 years; inadmissible evidence |
| 2 | Korea | Is the app "worker-monitoring equipment" requiring 노사협의회 consultation (근로자참여법 §20①14)? Does BYOD versus company devices change that? | The Tata Daewoo CCTV ruling (2023) |
| 3 | Korea | Does §25-2 cover helmet or bodycam photos and video? Does §25⑤'s ban on audio recording reach mobile devices through §25-2④? | Unresolved in the notes |
| 4 | Korea | Does a vendor-operated private cloud make the vendor a location business under 위치정보법, when on-prem software does not? | Registration and penalties |
| 5 | Korea | When does anonymous diarization become 생체인식정보 (biometric recognition data)? Must raw voice be deleted after feature extraction? | Separate consent |
| 6 | Korea | Will hash-chained logs and preserved originals meet the 2013도2511 and 2012도7461 standards in accident investigations? How does the hearsay rule treat transcripts? | The product promises evidence that holds up |
| 7 | Korea | May models trained on AI Hub or KsponSpeech data be deployed commercially, and used or hosted abroad? | The policy is silent on trained models |
| 8 | All | What consent and contract terms allow using customer audio to fine-tune shared models? | Building the Korean noisy-ASR data set |
| 9 | US | Is a start announcement enough consent in each all-party state? How are multi-state recordings handled? | Nine or more states |
| 10 | US (Illinois) | What does any voiceprint feature require under BIPA? | Statutory damages |
| 11 | EU | Is legitimate interest plus a DPIA the right basis? How should works councils be involved, and how should bystander voices be filtered? | Employee consent is rarely valid |
| 12 | EU | Would any worker analytics make the product Annex III employment high-risk? | Article 5 ban; deadlines moved by the Omnibus |
| 13 | All | What are the risks of bundling AGPL components, of OpenMDW-1.1's termination terms, and of Moonshine's revenue cap? | Licence exposure of the appliance |
| 14 | US defence | When a customer stores CUI in a vendor-run cloud, which DFARS 7012 and FedRAMP-equivalence duties apply? | CMMC Phase 2 starts 2026-11-10 |

## Trust means proving three separate states, continuously

Capture products lose trust silently:

- **Google Recorder.** On 2026-07-07 users reported that it "isn't actually creating recordings when it appears to be", and clearing the cache did not help [P] ([Android Authority](https://www.androidauthority.com/google-recorder-not-recording-3684852/)).
- **Plaud NotePin.** A vibration without the red light means recording did not start, and a full device will not record [V] ([Plaud](https://support.plaud.ai/hc/en-us/articles/50841183397273-Start-recording); [Plaud storage](https://support.plaud.ai/hc/en-us/articles/59018767068313-Plaud-NotePin-S-storage-is-full)).
- **Otter.** During an outage, Otter's advice was to record audio elsewhere and import it later [V] ([isdown](https://isdown.app/status/otter-ai/incidents/559991-manual-ad-hoc-recording-not-working)).

Bodycams solved the signalling problem with redundancy. Axon Body 4 blinks red while recording, plays two tones at start and a long tone at stop, and repeats a reminder every 2 minutes (configurable by the agency) [V] ([Axon](https://www.axon.com/help/axon-body-4/cameras-and-sensors/body/icons-leds-sounds.htm)). Android adds a green microphone indicator that apps cannot cover [F] ([AOSP privacy indicators](https://source.android.com/devices/tech/config/privacy-indicators)), but that indicator proves only that the microphone is open, not that anything was saved.

The app therefore has to show three states continuously and separately, in its header and in the foreground-service notification, using text and shape as well as colour [E]:

1. **Recording:** elapsed time, a live level meter and the rolling partial transcript.
2. **Saved on phone:** the segment is closed, hashed and verified by reading it back.
3. **Synced:** the server has acknowledged the same hash, and each item shows its receipt time.

Read-back verification is the direct guard against a Pixel-Recorder-style failure. Crash recovery should rescan incomplete segments and tell the user, for example "Recovered 2 min of audio from an interrupted session".

Health monitors should speak up or vibrate when [E]:

- there is no speech for N minutes ("mic covered or earbud disconnected?");
- the input route changes;
- storage or battery will not last the shift;
- clock sync is stale;
- uploads back up;
- the phone throttles for heat.

A start-of-shift self-test records 2 s and confirms the level, the route, server reachability and the clock offset as a green checklist.

Hands-free start has to fit Android's rules. Microphone access from a foreground service started in the background is still granted when the service was started from a notification, a widget, a visible app's `PendingIntent`, a device-owner policy app, or a voice-interaction service [F] ([FGS restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)). Samsung's side button can open an app on a double press, and on One UI 7 and later can launch an app's key feature [V] ([Samsung](https://www.samsung.com/us/support/answer/ANS00084203/); [SamMobile](https://www.sammobile.com/news/galaxy-s25-side-button-options-one-ui-7/)).

Earbud media buttons are constrained. On API 31 and later, the media button receiver throws if the app is in the background, and a service it starts must begin playback [F] ([Media3](https://developer.android.com/reference/androidx/media3/session/MediaButtonReceiver)). An earbud tap should therefore mark moments or open a new entry inside a session that is already running, not cold-start one. [earbud-compatibility.md](../../products/voice-life-companion/earbud-compatibility.md) already warns against promising universal double-tap-to-start.

The last trust lever is how the AI's output is presented. In this market, trust means evidence that holds up after an accident. Courts reject generic content, and buyers check record locking and approval trails. Free tools such as GS AIR already generate risk assessments, so generated text carries no premium. Motorola puts the officer's own account first because AI drafts contaminate memory.

The consistent design is for the worker's spoken words to be the record [H]. AI extracts fields, flags missing items and discrepancies, and highlights names and quantities for confirmation. A human signs and locks the result.

## Conclusion

The research turns the product from "a voice memo app with secure sync" into an evidence system that happens to use voice. The commodity layer is transcription, already bundled at $8–15 a seat and spreading through Procore, Mitti and push-to-talk apps. The defensible layers are elsewhere: one-press capture with gloves on, records that are hashed and chained from capture and stay inside the customer's network, and Korean recognition tuned on real site noise. Because no Korean-in-noise benchmark exists, the user's own consented recordings would be both the evaluation set and the start of a data advantage competitors cannot download.

Three constraints that looked separate turn out to agree. The wiretap law, the VAD failures at 85+ dB and the trust problem all point to the same capture design: wearer-initiated push-to-talk through a close-talk mic, recorded as short hashed segments. That convergence is the strongest argument that the design is right.

The self-serve-versus-B2B tension mostly disappears once "secure cloud" is defined as a vendor-run private cloud with open models and no third-party AI. That cloud is the self-serve tier, and the same stack in a box is the B2B tier.

The biggest unknowns are commercial. Nobody has published what Korean safety buyers pay, and price comparison fails against free government and chaebol tools. The plan should therefore spend its first weeks on paid pilots and an S25 battery measurement, not on model tuning.

## Implications for the prototype requirements

The tiers below assume the recommendations in the open decisions that follow. Rows marked "D1" apply if the user confirms Korean safety and manufacturing records as the first segment. "Target" values are proposals to be confirmed after the first bake-off [E].

**Must-have (prototype)**

| ID | Requirement | Evidence basis |
|---|---|---|
| M1 | Fast start with gloves: one large on-screen push-to-talk control, a notification action, a home or lock-screen widget, and a deep-link start activity for the Samsung side button. Target: launch to recording in 2 s or less [E] | Glove and screen pain [V/A]; exemptions for microphone access started in the background [F]; side-button launch [V] |
| M2 | Capture is started by the wearer only. Push-to-talk is the default. An optional armed session uses VAD with silence timeout and auto-pause. No unattended or ambient mode, and no automatic start after reboot. 300–600 ms pre-roll | 통신비밀보호법 [P]; VAD false triggers [P]; Android 14+ restrictions on starting foreground services [F]; internal spike pre-roll finding |
| M3 | Crash-safe segmented audio: utterance or 10–60 s segments flushed every 1–2 s, SHA-256 on close, read-back verification before "saved", and a recovered-audio notice after a crash. 16 kHz minimum. The actual input route is logged per segment | Google Recorder silent loss [P]; segment design [E]; route-dependent quality [P] |
| M4 | Live on-device transcript behind the existing STT adapter. The platform recognizer comes first and works offline on the S25. Partial and final results are shown | SODA Korean and English on the S25 (internal spike); ML Kit alpha [F] |
| M5 | Authoritative re-transcription on the 4090 with a bake-off harness: Qwen3-ASR-1.7B, Whisper large-v3 (faster-whisper with Silero VAD) and Cohere Transcribe, scored on our own Korean and English recordings (subway, earbud and phone; site-noise playback) with one normalized CER/WER. No-speech and low-confidence segments are flagged, not logged as text | No Korean noise benchmark; metric incompatibility; hallucination on noise [P] |
| M6 | Photo capture: byte-identical original, hashed, with boot-clock and UTC-estimate times and GPS with accuracy. App metadata is stored in the record, not written into the original | Integrity and admissibility [P]; EXIF limits [P] |
| M7 | Append-only event model: UUIDv7, per-device sequence number, boot-clock times with boot ID, UTC estimate and uncertainty, corrections as superseding events, `prev_hash` and `record_hash` | Conflict-free sync [E]; Korean hash standards [P]; robot export needs [F] |
| M8 | Offline-first outbox sync, acknowledged with server hashes. Resumable chunked upload (tus with checksum). WorkManager for routine sync and a UIDT job for "Sync now". No dataSync foreground service. Local data is never deleted before acknowledgement | Engine limitations [V/F]; Android 15/16 limits [F] |
| M9 | A three-state trust indicator (Recording, Saved on phone, Synced) per item and in the notification, shown with text and shape. Distinct start, stop and failed-to-start earcons and haptics that follow the system audio route and never force the loudspeaker (as in technical-decisions §4.5) | Plaud and Recorder failures [V/P]; Axon cues [V] |
| M10 | Health monitors for silence or covered mic, route change, storage, battery against shift end, stale clock sync, upload backlog and process death (via `ApplicationExitInfo`). Start-of-shift self-test. Samsung battery onboarding | dontkillmyapp [P]; Android 17 memory limiter [F] |
| M11 | Device security: SQLCipher with a plaintext self-check, a Keystore-wrapped key, app-private media, and QR enrolment that issues an mTLS client certificate. No third-party network calls by default | Silent-plaintext risk [V]; security reviews [P] |
| M12 | Clock sync: NTP-style exchanges with the server logged as events (on connect, during sessions, at stop), with an offset and drift fit on the server | 2.5 s Android error bound [F]; 1 ms app-level NTP [P] |
| M13 | Basic consent and notice: configurable start announcement, persistent indicator, and a one-tap "bystander" pause logged as an event. No speaker identification and no emotion inference | Korean, US and EU law [P/F] |
| M14 | Review: tapping a transcript line replays its audio; edits are saved as revisions; names, quantities and codes are highlighted for confirmation | "AI gets names and quantities wrong" [V/A] |
| M15 | Server stack: docker-compose on the Linux box, with API and sync, Postgres, tusd on the local filesystem, and a GPU worker that runs one heavy job at a time under a memory cap. A web view to browse, search, play and export JSONL plus media with a hash manifest, and CSV or PDF records | 29 GiB RAM; MinIO archived [F] |
| M16 | Battery and thermal measurement on the S25 in week 1 against an 8–10 h shift | No published measurement [P]; 15–35 h envelope [E] |
| K1 (D1) | TBM record template: work, spoken hazards, measures, attendee sign-in, photo and GPS, with the leader's briefing captured on a close-talk mic, plus supervisor sign-off and record lock. A 3-year retention class | MOEL 3-year record [F]; courts reject generic content [P]; diarization limits [F/H] |
| K2 (D1) | Quick safety-patrol and near-miss log: photo plus spoken finding plus location becomes a finding with an action owner | Photo burden on safety managers [P] |
| K3 (D1) | Korean and English with code-switching support: a site vocabulary list feeding a deterministic normalizer for codes and numerals | HiKE code-switching gap [F/P] |

**Should-have (pilot release)**

| ID | Requirement | Evidence basis |
|---|---|---|
| S1 | Nemotron 3.5 streaming int8 on device as an optional Wi-Fi download of about 650 MB, after measuring speed, memory and battery on the S25. Sherpa hotwords built from the site vocabulary | Only offline Korean and English streaming model with biasing [F/V] |
| S2 | Server context biasing (Qwen3-ASR prompt) and a local LLM, Apache-2.0 Qwen3.5 or Gemma 4 (Kanana 1.5 or A.X 4.0 Light if a small model is needed), to extract template fields and snap terms to the dictionary, with human sign-off | Biasing mechanisms [F/V]; licences [P/V]; Motorola ordering [V] |
| S3 | Device-signed checkpoints with a StrongBox or Knox Vault key, with attestation verified at enrolment | Knox Vault [V]; attestation [F] |
| S4 | Chain-of-custody view, access audit log, and export packages with hash manifests | Axon Evidence pattern [V] |
| S5 | Multilingual TBM briefing output: translated text and playback for foreign workers | Korean TBM translation budget [P] |
| S6 | Anonymous diarization labels (pyannote community-1) for TBM and meeting audio | DER 17–20% [F] |
| S7 | Supported-headset list from a bake-off (Galaxy Buds on LE Audio, a Peltor-class boom, a Shokz-class boom) with per-model latency calibration | SNR ranking [E]; Bluetooth latency [P] |
| S8 | Headscale WireGuard option in the appliance, and compatibility with customer MDM per-app VPNs | Headscale [F]; Intune and Knox VPN [V] |
| S9 | OIDC single sign-on (Keycloak or the customer's identity provider) and role-based access control | Security-review asks [P] |
| S10 | Retention classes with signed tombstones that keep hashes, and a per-user view of what was recorded about them | EDPB and PIPA principles [F/P] |
| S11 | Korean deployment kit: 노사협의회 consultation template, privacy notice, location consent and signage | 근로자참여법, 위치정보법 and §25-2 [P] |
| S12 | Vendor-operated private-cloud tenant on the same stack, for self-serve sign-up | Cloudian deployment preferences [V] |

**Later**

| ID | Requirement | Evidence basis |
|---|---|---|
| L1 | Robot and AV exports: MCAP (`foxglove.Log`, `foxglove.RawAudio`, text topics), rosbag2, and LeRobot v3.1 `language_events` snapped to frame timestamps. Instruction and correction tags, pedal input, chrony or PTP time, and chirp or QR sync markers | YAY Robot [F]; LeRobot [F]; MCAP [F]; Racelogic [F] |
| L2 | Bodycam or video capture with §25-2 signalling and Axon-style defaults (no audio in a pre-buffer) | §25-2 [P]; Axon [V]; worker pushback [P] |
| L3 | C2PA credentials, a Tessera transparency log, and an on-prem RFC 3161 timestamp authority | C2PA 2.2 [F]; Tessera [F] |
| L4 | Air-gapped install bundle: image tarballs, cosign signatures, SBOM, offline licence file and hardening guide | Air-gap niche [H]; SBOM for self-hosted software [P] |
| L5 | iPhone, using file-based background `URLSession` uploads | Apple background upload limits [V] |
| L6 | Korean noisy-ASR fine-tune on consented recordings | Noise-augmented fine-tuning beats enhancement [P] |
| L7 | Push-to-talk radio channel integration for communication records | Zello and Buddycom traction [F] |
| L8 | Peer-to-peer mesh for tunnels and basements | Ditto [V] |
| L9 | Opt-in voiceprint enrolment, only after counsel | PIPA, BIPA and GDPR [P/F] |
| L10 | Subsidy and procurement listings (NIPA smart-safety item, PPS Digital Service Mall) | 80–90% subsidy [P]; Selvas listing [P] |

## Open decisions for the user

**D1. First target segment and use case.**

*Options:*
- (a) Korean site-safety records: the daily TBM, safety-patrol findings and risk-assessment evidence.
- (b) Robot and AV data operations: narration and event tags exported to LeRobot and MCAP.
- (c) General field memo: global self-serve for foremen, inspectors and technicians.

*Recommendation:* (a), aimed at Korean mid-size manufacturers (about 100–999 workers) and their safety managers and line leads, with small factories (5–49 workers) as the self-serve long tail. The same capture also serves shift and maintenance context notes, the "manufacturing context logging" use case, which gives daily use beyond safety. Keep the capture core generic, so (c) becomes a packaging change and (b) runs as one or two export-only design partners. Kill criterion: if early Korean pilots do not convert to paid per-site plans, switch to (c) English-first.

*Evidence:* The legally required daily record is kept for 3 years [F], and courts reject generic or copied content [P]. No Korean voice-first TBM product with on-prem storage exists [P]. Mid-size manufacturers combine strong security needs with no system-integrator budget [H], and Korean ASR is where US incumbents are weakest (RealWear has no offline Korean [F]). Against (a): there are no published Korean prices, free tools such as GS AIR exist, and large contractors build in-house [P]. Against (b): buyers are B2B and the self-serve ceiling is small [H/E]. Against (c): it is being commoditized, and its need for no-external-cloud deployment is low [H].

**D2. Self-serve versus B2B.**

*Options:*
- (a) Pure self-serve seats.
- (b) On-prem B2B first.
- (c) Hybrid: self-serve sign-up on a vendor-run private cloud with per-site pricing, plus a sales-assisted on-prem box.

*Recommendation:* (c). Price Korean plans per site, following Mitti's location-based plan, and global plans per seat. Build enterprise features (SSO, SCIM, pen tests) only when the first paying box customer asks. Prefer annual prepayment for box deals.

*Evidence:* Ramp arithmetic: about 2,400 seats at $30 by month 12, or 10–15 deals [E]. Mitti's free-to-paid model (free up to 10 users [F]) serves a claimed 80,000 organizations [V]. Zello offers on-prem only on Enterprise [F]. Private cloud and hybrid are the deployments buyers prefer [V-sponsored].

**D3. Server form factor.**

*Options:*
- (a) Customer on-prem GPU appliance.
- (b) Vendor-operated private cloud with its own GPUs and no third-party AI.
- (c) Deployment into the customer's own private cloud.
- (d) Air-gapped installation.

*Recommendation:* one docker-compose stack that runs as (a), (b) or (c). Prototype it on the user's 4090 box. Sell (b) to self-serve customers and (a) to B2B customers, and defer (d).

*Evidence:* Throughput is ample [F/E]. Licensed ASR costs $4,500 per GPU per year or more [F], so open models are the cost floor. Deployment preferences are 20% on-prem, 33% private cloud and 38% hybrid [V-sponsored], while air-gapped deployment means long sales cycles [H]. **Counsel**: whether running (b) makes the vendor a location business under 위치정보법.

**D4. Audio retention by default.**

*Options:*
- (a) Transcript only; audio is never stored.
- (b) Audio is deleted after server re-transcription and user confirmation.
- (c) Audio is kept with the record for the record's whole retention period.
- (d) Retention classes set by an admin.

*Recommendation:* capture audio by default and use (d). The default class keeps audio for a fixed window, then deletes it with a signed tombstone that keeps the hash and the transcript; 90 days is proposed [E]. An "evidence" class keeps audio with records such as the TBM for 3 years, and a "text-only" class exists for sensitive organizations. In pilots, keep audio with explicit consent to build the Korean noisy test set.

*Evidence:* Server re-transcription needs the audio. Replaying audio is how users verify names and quantities [V/A]. Courts compare hashes of originals [P]. Against keeping audio: voice is personal data, an egocentric data buyer specified "no audio required" [A], and workers have resisted bodycams [P]. **Counsel**: retention for SAPA evidence versus data minimization, and consent for training use.

**D5. Push-to-talk or always-on.**

*Options:*
- (a) Push-to-talk only.
- (b) Push-to-talk by default, plus a hands-free session the wearer arms, with VAD and auto-pause.
- (c) Ambient always-on capture.

*Recommendation:* (b), and never (c). Earbud buttons mark moments or open entries inside a running session.

*Evidence:* Criminal risk under 통신비밀보호법 [P]. Silero passes up to about 40% of noise as speech [P], and Whisper hallucinates on noise [P]. YAY Robot's pedals and Racelogic's headset switch [F] show push-to-talk is the norm in data capture. Android's foreground-service and media-button rules apply [F].

**D6. On-device model size budget and role.**

*Options:*
- (a) 0 MB: platform recognizer only.
- (b) Keep the 100 MB cap from Voice Life Companion.
- (c) One optional Nemotron 3.5 download of about 650 MB.
- (d) Also add Qwen3-ASR-0.6B (about 937 MB) as an on-device second pass.

*Recommendation:* the phone is live feedback and an offline safety net, and the server owns the authoritative transcript. Ship (a) in the prototype and add (c) after measuring it on the S25. Lift the 100 MB cap for this product, and skip (d) for now. Exclude Moonshine Community models and AI Hub-trained weights until both are cleared in writing.

*Evidence:* Nemotron's Korean CER is about 7.1–7.6 against 2.57 for Qwen3-ASR on the server [V]. No hotword API was found for the platform recognizer [H], and ML Kit is alpha [F]. RAM estimates are 0.8–1.8 GB [E], and Android 17 enforces a memory limiter [F]. Moonshine's licence terminates above $1M of revenue [F].

**D7. Languages.**

*Options:*
- (a) Korean only.
- (b) Korean and English, with code-switching handled.
- (c) (b) plus foreign-worker languages for TBM output.
- (d) English-first global.

*Recommendation:* (b) for speech input in v1. Add (c) as translated briefing output (text and playback) at the should-have tier, and leave foreign-language speech input for later.

*Evidence:* Code-switching is the main accuracy gap (MER 21.8–31.3 on HiKE) [F/P]. The Korean voice budget currently goes to TBM translation [P]. Qwen3-ASR covers 52 languages [F]. Cohere expects monolingual audio [V]. Nemotron's automatic language mode costs about 0.2–0.7 CER points [V].

**D8. Microphone and capture hardware.**

*Options:*
- (a) Phone mic only.
- (b) Phone with consumer earbuds.
- (c) Phone with an industrial close-talk headset (Peltor-class).
- (d) Bodycam or smart glasses.

*Recommendation:* support (b) up to about 80 dBA; the subway is the right proxy test. Require (c) in zones of 85 dBA and above. Treat (a) as quiet-only, and defer (d). Publish a tested-headset list, prefer LE Audio or wideband HFP, and log the route.

*Evidence:* The SNR estimates [E]. Bone-conduction and boom-mic results [P/V]. Codec bandwidth [P]. RealWear costs $3,300–3,750 and has no offline Korean [F]. Workers have pushed back on bodycams [P], and §25-2 adds signalling duties [P]. Workers in 85 dB+ zones generally wear hearing protection already, so a boom headset adds little burden [H].

**D9. Device ownership.**

*Options:*
- (a) Personal phones (BYOD).
- (b) Company-managed Android Enterprise devices.
- (c) Both.

*Recommendation:* (c). Use BYOD for self-serve. Plants that block the camera and recording need managed devices with the app allow-listed, plus Knox or Intune-friendly settings (battery exemptions, per-app VPN).

*Evidence:* Samsung Semiconductor and LG MDM controls [V/P]. Samsung's app killing [P]. The 노사협의회 consultation duty [P]. **Counsel**: monitoring on BYOD devices.

**D10. Speaker identity and analytics boundaries.**

*Options:*
- (a) No speaker information.
- (b) Wearer versus others, plus anonymous diarization labels.
- (c) Voiceprint enrolment to name speakers.
- (d) Emotion, stress or productivity analytics.

*Recommendation:* (b) in v1. Offer (c) only as an opt-in after counsel. Never ship (d) in v1.

*Evidence:* Speaker recognition makes voice sensitive information in Korea [P] and a biometric identifier under BIPA [F]. AI Act Article 5(1)(f) bans emotion inference at work [P]. Analytics risk triggering Annex III employment high-risk rules [P, verify].

**D11. Data plumbing: sync engine and integrity level.**

*Options:*
- Sync: (a) custom outbox; (b) self-hosted PowerSync (Apache-2.0 since 2026-11-03).
- Integrity: (i) hashes plus a hash chain on each device; (ii) also StrongBox-signed checkpoints; (iii) also Tessera, RFC 3161 timestamps and C2PA.

*Recommendation:* (a) with (i) in the prototype, (ii) in the pilot, and (iii) later. Use PowerSync only if the app must replicate large shared datasets in both directions.

*Evidence:* The append-only log has no conflicts [E]. Zero, Electric and Turso each fail a hard constraint [V]. Korean courts' hash standard [P]. The S25 lacks C2PA on unedited photos [P].

**D12. The AI's role in the record.**

*Options:*
- (a) AI drafts the TBM or risk record from brief input.
- (b) The worker's spoken words are the record; AI transcribes, extracts fields and flags gaps and discrepancies, with human sign-off and lock.
- (c) No AI beyond transcription.

*Recommendation:* (b).

*Evidence:* Courts reject generic or copied assessments [P]. GS AIR already gives generated risk assessments away free [P]. Motorola puts the human account first to avoid contaminating memory [V]. Leena AI says safety procedures need a human signature [V]. Sitemate keeps an officer-approval step [V].
