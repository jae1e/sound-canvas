# Voice-First Field Documentation in Industrial Operations: Competitors, Pricing, Buyers and No-External-Cloud Demand (Korea, US, EU, Japan)

Research date: 2026-11-05. Web research only (vendor pages, press, government and law-firm sources, aggregators). No sign-ups or contact.

Labels: **[F]** verified on a primary source (vendor pricing/doc page, government document, statute or law-firm quote of statute) · **[V]** vendor claim · **[P]** press or third party (including aggregators and directories) · **[A]** anecdote · **[E]** estimate · **[H]** hypothesis.

Scope notes: robot/AV data, ASR model technology, sync architecture and recording law are covered by other researchers and are left out here. Earlier repo work already covers US home inspectors (Spectora with AI at $109/month, Hive Inspect "voice-to-report" at $99/month, Binsr's $1.1M pre-seed) and ITAR-gated FAI tools. See `docs/market-studies/assistive-ai-workflow-applications/prosumer-professional-tools.md` and `manufacturing-quality-compliance.md`. They are not repeated here.

Method caveat: Reddit and Korean community threads did not appear in any search, even with `site:reddit.com`. Practitioner anecdotes therefore come mostly from vendor blogs, a Korean Q&A site, a union survey and an academic paper, and are labelled as such. Statute pages on law.go.kr could not be fetched (JavaScript pages). Korean statutory text comes from law-firm quotations and the Ministry of Employment and Labor (MOEL) guide PDF.

---

## Q1. Frontline/connected-worker and construction field-reporting platforms: voice features, pricing, deployment

### Takeaway
Voice capture is becoming a standard feature of the big frontline platforms rather than a product category of its own. On 2026-10-21 Procore launched a voice-first field app, Mitti (formerly SafetyCulture) ships AI issue creation, and Fulcrum, Sitemate, Raken and Benetics all turn voice into forms. All of them are cloud SaaS, and none offered an on-prem or air-gapped option on a public page. Self-serve price points sit between $0 and $99 per user per month.

### Cited Findings
**SafetyCulture / Mitti**
- [V] SafetyCulture rebranded as **Mitti** on 2026-08-11. It describes itself as "the global operations system used by more than two million frontline workers across 80,000 organizations". The new scope covers software, hardware, consumables and insurance. — [Business Wire via Cadillac News/AP, 2026-08-11](https://www.cadillacnews.com/ap/business/safetyculture-becomes-mitti-unveiling-a-platform-built-for-the-future-of-frontline-work/article_4f035e24-a056-51d2-8b87-2a42ce236a7c.html); [Startland News, 2026-08](https://startlandnews.com/2026/08/safetyculture-mitti/); [IT Brief Australia](https://itbrief.com.au/story/safetyculture-rebrands-as-mitti-in-frontline-software-push)
- [F] Mitti pricing page, fetched 2026-11-05. safetyculture.com/pricing now 301-redirects to mitti.com/pricing.
  - **Free:** $0, up to 10 users, 5 active templates, 300 AI credits per seat per month.
  - **Premium:** $24/seat/month billed annually or $29 monthly, 500 AI credits.
  - **Enterprise:** custom, 800 AI credits, SCIM and sandbox.
  - **Location-based:** one fixed price per site with unlimited users.
  - **AI features listed:** AI Assistant, AI Issue Creation, report generation, agent builder (early access).
  - **Not on the page:** voice, offline mode, data residency, on-prem/private deployment. — [Mitti pricing](https://mitti.com/pricing/)
- [P] A Verdantix profile says incidents can be logged "by prompt, voice note, or photo", with AI-drafted descriptions and embedded agents that do nothing without human sign-off. — [Verdantix Atlas](https://atlas.verdantix.com/safetyculture/safetyculture-platform-2)
- [A] G2 reviewers name voice-to-text as a strength, and a community thread says voice-to-text "has transformed the use of SafetyCulture for many of our clients". — [G2 pricing/reviews](https://www.g2.com/products/safetyculture-iauditor/pricing); [SafetyCulture community](https://community.safetyculture.com/ask-the-community-6/voice-to-text-596)

**Procore**
- [V] **Procore AI Go**, announced 2026-10-21 at Groundbreak 2026.
  - It is a voice-first mobile app with push-to-talk.
  - **Live now:** spoken Q&A over drawings, specs, RFIs, submittals, daily logs, observations and inspections.
  - **"Soon":** creating daily logs and observations by voice, drafting RFIs, translation, and a Daily Log Agent and Site Safety Agent.
  - **Availability:** open beta for North American customers in the "Digital Coworker Starter, Pro, and Enterprise packages". A Meta AI glasses integration is in closed beta.
  - Price, languages, offline support and models are not stated. — [Procore press release](https://www.procore.com/press/procore-launches-voice-first-ai-mobile-app-built-for-the-jobsite); [Procore Daily Log agent page](https://www.procore.com/ai/agents/daily-log)

**Construction field-reporting tools**
- [P] **Benetics** (Swiss) sells a voice assistant for crews, built on OpenAI. It expanded to the US and Canada at Procore Groundbreak in October 2025. Crews create punch-list items, submit RFIs and log progress by voice. — [TechIntelPro](https://techintelpro.com/news/benetics-ai-voice-assistant-expands-to-us-canada-at-groundbreak); [Construction Management UK](https://constructionmanagement.co.uk/benetics-launches-ai-based-voice-assist-for-construction-workers); [dBusiness](https://www.dbusiness.com/hustle-and-muscle-articles/benetics-in-ann-arbor-launches-ai-voice-assistant-for-construction-trades/)
- [V] **Raken** lists "Type or dictate your notes" as a feature and publishes no official price. [P] Third-party price figures conflict:
  - $15/$37/$46 per user/month for Basic, Professional and Performance;
  - "starts at $23" with a $59 Performance tier;
  - App Store tiers of $64.99 (Professional) and $79.99 (Performance) per user/month, per a May 2026 comparison page. — [Raken help](https://help.rakenapp.com/articles/2525024-what-is-raken); [ERP Research](https://erpresearch.com/erp-add-ons/construction/raken/pricing); [LibreCam comparison](https://librecam.pages.dev/compare/best-daily-report-apps)
- [F] **Fieldwire** (Hilti) pricing, fetched 2026-11-05: Basic $0, Pro $39, Business $64 and Business Plus $89 per user/month billed annually, plus custom contracts. The pricing page does not mention voice, offline or on-prem. — [Fieldwire pricing](https://www.fieldwire.com/pricing/)
- [V] **Fulcrum Audio FastFill** turns spoken input into several structured form fields, not just a transcript. [P] Price figures conflict: about $43/user/month for Professional per ToolRadar and GetApp. — [Fulcrum newsroom](https://www.fulcrumapp.com/newsroom/fulcrum-launches-audio-fastfill/); [ToolRadar](https://toolradar.com/tools/fulcrum/pricing)
- [V] **Sitemate** AI Form Fill turns voice notes and photos into draft inspection or JSA reports for an officer to approve. — [Sitemate](https://sitemate.com/use-cases/safety-inspection)
- [P] **Highwire** "AI Findings for Inspections" turns spoken observations into structured findings with categories and risk ratings. — [ForConstructionPros](https://www.forconstructionpros.com/construction-technology/construction-safety-technology/product/22969044/highwire-highwire-launches-ai-tool-for-faster-construction-safety-inspections)
- [P] Long-tail voice daily-report apps:
  - SuperReports: free starter tier, then $29 per superintendent per month;
  - ConstruTrack: $19/month flat with unlimited users;
  - NoteVault: foremen record audio and human transcribers convert it, an older model;
  - GoSafety.AI: voice daily reports and safety checks synced to a web console;
  - SiteReport, ConstructLog, FoxBuild and VociApp: new app-store listings. — [GetApp SuperReports](https://www.getapp.com/all-software/a/superreports/); [GetApp ConstruTrack](https://www.getapp.com/all-software/a/construtrack/); [ForConstructionPros NoteVault](https://www.forconstructionpros.com/profit-matters/video/20867863/notevault-gives-tdindustries-foremen-more-managing-time); [WebCatalog GoSafety.AI](https://webcatalog.io/ko/apps/gosafety-ai)

**Manufacturing connected-worker platforms**
- [P] **Tulip** (manufacturing frontline apps): Essentials about $100 per interface per month (10-interface minimum in one source, 5 in another) and Professional about $250. Enterprise and Regulated tiers are sales-led. — [PricingSaaS](https://pricingsaas.com/companies/tulip); [TrustRadius](https://www.trustradius.com/products/tulip-interfaces/pricing)
- [P] **Augmentir** (connected worker with an AI assistant) publishes no list price. Directory figures are $30/user/month, or $10 for a Remote Assist package. A RealWear HMT-1 plus Augmentir bundle is listed at $140/user/month on a 36-month subscription. — [eLearning Industry](https://elearningindustry.com/directory/elearning-software/augmentir/pricing); [rfp.wiki RealWear vs Augmentir](https://www.rfp.wiki/specialty-industries/augmented-reality-industrial-operations/realwear/augmentir); [G2](https://www.g2.com/products/augmentir/pricing)

**Market size**
- [E] Connected-worker market estimates differ by about 4x depending on scope:
  - MarketsandMarkets (including hardware): $8.62B in 2025 rising to $20.18B by 2030, an 18.5% CAGR;
  - platform-only estimates: Mordor $1.44B (2025) to $2.72B (2031); TechSci $1.43B (2025); Virtue $5.89B (2025). — [MarketsandMarkets press release](https://www.marketsandmarkets.com/PressReleases/connected-worker.asp); [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/connected-worker-platforms-market); [TechSci](https://www.techsciresearch.com/report/global-connected-worker-platforms-market/31013.html); [Virtue Market Research](https://www.virtuemarketresearch.com/report/connected-worker-platforms-market)

### Inferences
- [H] "Voice note → structured form" no longer differentiates in US/EU construction. Procore's free-in-package voice app and OpenAI-based entrants such as Benetics will commoditize it within 12–18 months. A product built on "speak and it fills the form" alone will compete with incumbents' bundled features.
- [H] No incumbent publicly offers self-hosted or air-gapped deployment with no external AI. All rely on hyperscaler or OpenAI back ends (Benetics explicitly). The "no external cloud" constraint is therefore a real gap in the incumbents' offer. But demand for it sits mainly in regulated or large accounts (see Q8), which do not buy self-serve.
- [H] Pricing band: generic inspection/checklist $24–29/seat (Mitti), construction PM $39–89/seat (Fieldwire), vertical voice-report tools $29–99/seat (SuperReports, Raken, Hive). A self-serve voice logger priced at $15–40/seat/month fits under incumbent budgets.

### Gaps
- GoCanvas, Fluix, Parsable, Poka (reportedly acquired by IFS; not verified this session) and Hammer Missions were not researched for voice features and pricing.
- Official Raken pricing (contradictory third-party data) and Procore AI Go pricing are unknown.
- Which ASR and LLM providers sit behind Mitti, Fulcrum and Raken voice is not disclosed.
- Mitti offline voice behaviour is undocumented on public pages.

---

## Q2. Hands-free hardware, body cameras and wearable recorders

### Takeaway
Hands-free hardware is expensive ($2.7–3.75K per RealWear unit), and offline speech covers few languages (no offline Korean on RealWear). Body-camera AI reporting is mature in policing: Axon Draft One is bundled at roughly $199–570 per officer per year, and Motorola Assist is moving radio, bodycam and AI into one device. These systems are cloud-based, and no on-prem option was found. In Korea, bodycam and video recording of construction work exists through Seoul city contract conditions, and a confined-space mandate is under review. It is not national law, and workers have pushed back. Consumer wearables (Plaud, Limitless, Bee, Omi) are cloud and consumer-oriented, and two were absorbed by Big Tech in 2025.

### Cited Findings
**Hands-free hardware**
- [F] **RealWear**: offline dictation supports only US English, German and Mandarin. Other languages must be enabled and sent to the device through RealWear Cloud. — [RealWear developer docs: Language support](https://developer.realwear.com/docs/hardware/languages); [RealWear support](https://support.realwear.com/knowledge/what-languages-are-supported-on-realwear-devices)
- [V] Korean appears among the 12 UI languages of the older HMT-1/HMT-1Z1. Offline support for Korean is not stated. — [RealWear legacy FAQ](https://legacy.realwear.com/question-answer/what-languages-does-hmt-1-or-hmt-1z1-support/)
- [F/V] RealWear Navigator 520 prices:
  - RealWear shop: $3,750 on the product page (bundle with Workband 2 and battery) and $3,300 on the collection page;
  - 2023 launch list price: $2,700. — [RealWear shop product](https://shop.realwear.com/products/realwear-navigator-520); [RealWear shop collection](https://shop.realwear.com/collections/hmt); [Business Wire 2023-01-03](https://www.businesswire.com/news/home/20230103005033/en/)

**Axon (police bodycam AI reports)**
- [P] Axon **Draft One** uses OpenAI GPT-4o on Microsoft Azure (Axon's cloud provider) to draft police reports from bodycam audio transcripts. Officers must review the draft, which includes placeholders to edit, and agencies set eligibility policy. One report says the initial AI draft is not retained. Source is from August 2024, so treat as older. — [Fortune/AP, 2024-08-26](https://fortune.com/2024/08/26/police-ai-chatbot-incident-reports-axon-emergency-call-response/); [Technology Record, Summer 2025](https://www.technologyrecord.com/digital/magazine/issue37/140)
- [P] Draft One pricing is bundled, not listed, and the sources conflict:
  - "AI Era Plan" bundle at $199 per officer (Q1 2025 summary);
  - Officer Safety Plan raised from $350 to $550 per officer per year with AI (Q4 2024 analysis);
  - CFO: top bundle plus AI Era Plan about $570 per officer (March 2026);
  - Axon says per-officer revenue rose from the mid-$200s to over $600;
  - AI bookings reported at $750M (March 2026). — [Fintool Q1 2025](https://fintool.com/app/research/companies/AXON/earnings/Q1%202025); [Substack Q4 2024 analysis](https://sergeycyw.substack.com/p/axon-enterprise-q4-2024-earnings); [MarketBeat, 2026-03-05](https://www.marketbeat.com/instant-alerts/axon-enterprise-flags-broad-2025-momentum-as-ai-bookings-hit-750m-at-morgan-stanley-conference-2026-03-05/); [G2 Draft One](https://www.g2.com/products/axon-draft-one/pricing)

**Motorola Solutions**
- [V] Motorola **Assist "Assisted Narrative"** (2025-10-16):
  - the officer writes or dictates their own account first;
  - Assist then cross-references up to 10 sources (radio transcripts, 911 audio, bodycam footage) and flags discrepancies, with "transparency notations";
  - it ships in CommandCentral DEMS and Records;
  - design rationale: AI-first drafts contaminated officers' memory. — [Motorola press release](https://www.motorolasolutions.com/newsroom/press-releases/motorola-solutions-advances-ai-assisted-policing.html); [Police1](https://www.police1.com/video-recording-and-analysis/motorola-solutions-launches-role-based-ai-suites-aimed-at-speeding-response-reducing-administrative-burden)
- [V/P] **Motorola SVX** (around June 2025) is a video remote speaker microphone for APX NEXT radios.
  - Hardware: 1080p body camera with record-after-the-fact and dual audio tracks (radio plus ambient) linked to video.
  - Assist features: real-time 911 transcription and AI report drafting.
  - Vendor accuracy claim: "well over 90%", up from "70% to 80%". — [Urgent Comms](https://urgentcomm.com/devices/motorola-solutions-unveils-combo-rsm-and-body-cam-with-multiple-ai-capabilities); [SecurityWorldMarket](https://www.securityworldmarket.com/na/News/Product-News/body-worn-device-combines-radio-video-and-ai); [SVX brochure](https://aem-cloud-prod-cdn.motorolasolutions.com/content/dam/msi/docs/products/SVX/svx-brochure.pdf)

**Korea: police, construction and confined-space video**
- [P] Korea police: the National Police Agency will issue 14,000 bodycams over five years for 19.5B KRW. This is the first formal procurement after the Police Duties Act amendment recognized bodycams as official equipment. KT won the police bodycam project with AI features (July 2025). — [Herald, 2025-07-22](https://www.heraldk.com/article/2025072217300089921); [Asiae, 2025-07-23](https://www.asiae.co.kr/en/article/2025072309012389195)
- [P] Seoul has required video recording of the whole construction process on public works of 10B KRW or more since July 2022, through special contract conditions (74 sites). Close-range recording uses bodycams and mobile CCTV and runs only during work hours, for privacy. Extension to private sites was considered via permit conditions, because the law does not compel private projects. Source date is March 2023, so treat as older. — [Dailian](https://www.dailian.co.kr/news/view/1214859/)
- [P] Seoul is reviewing mandatory CCTV, bodycam or helmet-camera recording for confined-space (manhole) work after fatal accidents, partly as evidence (2025-07-29, review stage). — [Money Today, 2025-07-29](https://www.mt.co.kr/policy/2025/07/29/2025072916481054412)
- [P] Reports of worker pushback ("human-rights infringement") and prime/subcontractor conflict over wearing bodycams, and of contractors bearing the equipment cost. — [Bizhankook](https://www.bizhankook.com/bk/article/26035); [Smart Today](https://www.smarttoday.co.kr/ko-kr/articles/28264)

**Korea: smart safety equipment subsidy**
- [P] The MOEL/KOSHA smart safety equipment subsidy covers equipment using AI, ICT, IoT or sensors. It pays up to 80% of cost for sites with fewer than 50 workers and up to 90% for fewer than 10, capped at 30M KRW. NIPA runs the item-registration calls; the 2026 second call ran 2026-10-01 to 2026-10-30. — [Kyungbuk Maeil, 2026-08-31](https://www.kbmaeil.com/article/20260831500493); [TheVC grant listing (NIPA notice)](https://thevc.kr/grants/30f310fff5cb354c0667b3d0)

**Consumer wearable recorders**
- [V] **Plaud Team** (May 2026, North America) adds centralized billing, device management and workspace controls. Plaud claims ISO 27001/27701, SOC 2, HIPAA, GDPR and EN 18031 compliance. No on-prem option was found. The business line came from Plaud's acquisition of StarJar. — [Technobezz](https://www.technobezz.com/news/plaud-team-launch-enterprise-governance); [Business Wire, 2026-01-04](https://www.businesswire.com/news/home/20260104068247/en); [TechEdgeAI](https://techedgeai.com/plaud-ai-acquires-starjar-to-launch-enterprise-ai-note-taking-platform/)
- [P] Meta acquired **Limitless** (December 2025), and Pendant sales stopped. Amazon acquired **Bee** (July 2025). **Omi** (Based Hardware) is open source (hardware, firmware, app) with an option to self-host data, though it showed as pre-order or out of stock in September 2026. — [BetaNews, 2025-12-08](https://betanews.com/2025/12/08/meta-has-acquired-limitless-a-startup-that-produces-ai-powered-wearables/); [Engadget](https://www.engadget.com/ai/metas-latest-acquisition-suggests-hardware-plans-beyond-glasses-and-headsets-212930339.html); [Layer3Labs comparison](https://www.layer3labs.io/comparisons/limitless-vs-bee-vs-omi)
- [V] The only "wearable AI recorder for construction site logs" material found is a vendor blog (Umevo). — [Umevo blog](https://www.umevo.ai/blogs/ume-all-posts/streamlining-construction-site-logs-with-wearable-ai-recorders)

### Inferences
- [H] Policing proves people will pay for "audio → draft report". Axon's AI attach roughly doubles per-officer revenue. Motorola's "officer speaks first, AI verifies" design is a useful trust pattern for industrial incident reports and TBM records.
- [H] Industrial buyers in Korea are unlikely to buy dedicated bodycams for logging alone. Seoul's video mandates are contract-driven and contested by workers. A phone plus earbud default, with optional bodycam or neckband integration, is the lighter path. The 80–90% subsidy could fund a bundled device kit if the product registers as a NIPA "smart safety equipment" item; whether software-only voice loggers qualify was not verified.
- [H] Consumer wearables are not an industrial channel. Big Tech acquisitions removed two of them, and none is self-hostable except Omi (open source, immature supply). That is a weak competitor set, but also a sign that wearable hardware is risky to build.

### Gaps
- Bodycam programmes at 한국전력 (KEPCO), LH and other utilities: no source found. The search returned no KEPCO material.
- Whether MOLIT's February 2025 Construction Technology Promotion Act amendment notice (입법예고) includes construction video recording: unverified.
- Vuzix, Zebra voice and Hytera industrial bodycams: not researched.
- Axon or Motorola on-prem or air-gapped options: none found. Both appear cloud-only (Evidence.com / CommandCentral), but this was not confirmed on primary pages.
- Industrial (non-police) bodycam vendors in Korea and their prices: not found.

---

## Q3. Communication records: radio/PTT recording and transcription

### Takeaway
Transcribing push-to-talk traffic is a shipping, cheap feature. Zello charges $12.75/user/month and offers an on-prem server on Enterprise. Buddycom in Japan charges ¥1,200/user/month with 10 hours of transcription a month and has added generative-AI work-record extraction with Ricoh. Motorola turns radio transcripts into evidence for AI reports. In Korea only one niche on-device STT radio product surfaced.

### Cited Findings
**Zello**
- [F] Zello pricing (fetched 2026-11-05):
  - **Core:** $6.80/user/month yearly ($8 monthly), no transcription;
  - **Plus:** $12.75 yearly ($15 monthly), includes transcription, AI Digests and storage of "all network communication";
  - **Enterprise:** custom, with "on-premise server options". — [Zello pricing](https://zello.com/pricing/)
- [V] Zello launched automatic transcription in January 2024. It described AI Digests that summarize frontline conversations for managers in February 2025, and positions itself as "frontline AI powered by real conversations". — [Newswire, Zello transcription](https://www.newswire.com/news/push-to-talk-app-zello-launches-instant-transcriptions-for-faster-22217952); [Newswire, Zello 2025 vision](https://www.newswire.com/news/zello-s-vision-for-2025-empowering-frontline-workers-with-ai-driven-22520681)

**Buddycom (Science Arts, Japan)**
- [F] Buddycom pricing, per user per month, excluding tax:
  - **Talk Lite:** ¥600 annual / ¥1,000 monthly;
  - **Talk Enterprise:** ¥1,200 / ¥1,800, including voice-to-text capped at 10 hours a month, translation capped at 180,000 characters a month, and call-history playback and download with 1-month retention;
  - **Livecast Enterprise:** ¥2,600 / ¥3,900;
  - "Safety support" add-on ¥500 per ID;
  - 100 or more users: contact sales. — [Buddycom price page](https://buddycom.net/price/)
- [V] SoftBank resells Buddycom and markets group PTT, automatic voice-to-text and simultaneous multilingual "transceiver translation". — [SoftBank Buddycom](https://www.softbank.jp/biz/services/mobile/partner/buddycom/)
- [P] **Buddycom for RICOH** (July 2026) converts field voice to text, and generative AI extracts and organizes work content and outcomes. Price not found. — [Digital PR Japan](https://digitalpr.jp/r/138507)
- [P] In 2023 Buddycom AI (ChatGPT-linked) was free in a restricted mode, or ¥1,500/user for a relaxed-limit option. This is from 2023; the attribution comes from a search synthesis and the article was not fetched. — [Aviation Wire, 2023-07-05](https://www.aviationwire.jp/archives/280118)

**Motorola and Korea**
- [V] Motorola Assist uses radio transcripts as one of up to 10 cross-referenced sources for report drafting, and SVX records radio plus ambient audio. See Q2. — [Motorola press release](https://www.motorolasolutions.com/newsroom/press-releases/motorola-solutions-advances-ai-assisted-policing.html)
- [V] Korea: Cybertel Bridge markets an "On Device STT" solution that shows group radio conversation as real-time text for field missions, plus AI keyword search over recorded audio. Price, radio models and accuracy are unspecified. — [LinkOnBiz product page](https://linkonbiz.com/product/iframe-detail/11001)

### Inferences
- [H] Transcription of field speech is already priced at $8–15 per user per month inside PTT apps. A voice logger cannot charge a premium for transcription alone. Value must come from structure (TBM minutes, attendance, hazard items, signatures), evidence integrity and the self-hosted option.
- [H] Zello's Enterprise "on-premise server" option and Buddycom's Japan traction show the comms-record niche already takes for granted that recordings are stored and searchable. Integrating with PTT, or acting as a lightweight PTT channel, may be a cheaper route into "communication records" than competing with Motorola.

### Gaps
- Orion Labs' current status and pricing: not researched.
- Transcription of Korean PS-LTE (재난안전통신망) or LTE-R railway radio: no products or tenders found.
- Buddycom's user and customer counts were not captured, and neither was Zello's on-prem pricing.

---

## Q4. Enterprise and Korean speech vendors with on-prem/self-hosted offerings (pricing benchmarks)

### Takeaway
Every major global speech vendor sells self-hosted or disconnected deployment, but only through enterprise contracts with non-public pricing. Aggregators estimate $15K–50K+ per year, and NVIDIA lists $4,500 per GPU per year. Korean vendors sell installed and server versions into the public sector through procurement channels, and Korean speech AI is consolidating: Ubase agreed to buy RTZR. A small self-serve product would struggle to resell these licences profitably. Open models on its own server are the realistic cost floor (another researcher covers models).

### Cited Findings
**Global vendors**
- [F] **Deepgram**: self-hosting requires a Deepgram Enterprise plan. It runs in your cloud or on-prem, and "no audio, transcripts, or other identifying markers of the request content are sent to Deepgram". Enterprise deals can go through the AWS and GCP marketplaces. [E] One aggregator puts Enterprise at $15,000+ per year (unverified). — [Deepgram docs: on-prem](https://developers.deepgram.com/on-prem); [Deepgram self-hosted](https://deepgram.com/self-hosted); [ToolRadar Deepgram](https://toolradar.com/tools/deepgram/pricing)
- [F] **Speechmatics** on-prem containers: licensing needs no internet connection (license file or token). After expiry the container keeps running but stops transcribing. [E] Aggregator estimate: $25K–50K+ per year for enterprise (unverified). — [Speechmatics licensing docs](https://docs.speechmatics.com/on-prem/containers/licensing); [CostBench Speechmatics](https://costbench.com/software/ai-transcription-apis/speechmatics/)
- [F] **NVIDIA AI Enterprise**, the suite Riva is typically sold under: $4,500 per GPU for a 1-year subscription, $18,000 for 5 years, or $22,500 perpetual with 5 years of support. Cloud is $1 per GPU-hour plus the instance cost. [P] In October 2026 Jensen Huang floated about $2,000 per GPU per year for agent software; its relation to AI Enterprise pricing is unclear. — [NVIDIA licensing guide: pricing](https://docs.nvidia.com/ai-enterprise/planning-resource/licensing-guide/latest/pricing.html); [Mixed News](https://mixed-news.com/en/?p=38457)
- [F] **Azure AI Speech disconnected containers** (STT, custom STT, neural TTS):
  - customers submit a request form, and Microsoft decides within 10 business days;
  - the commitment-tier purchase option appears only after approval;
  - plans run by calendar year and are charged in full up front. — [Microsoft Learn: disconnected containers](https://learn.microsoft.com/azure/ai-services/containers/disconnected-containers); [Disconnected container FAQ](https://learn.microsoft.com/da-dk/azure/ai-services/containers/disconnected-container-faq)
- [F] **Google** documents Speech-to-Text On-Prem for customers who need control of infrastructure and voice data. — [Google Cloud STT On-Prem docs](https://docs.cloud.google.com/speech-to-text/priv/docs)
- [V, competitor] Deepgram's own comparison says "deployment flexibility doesn't equal air-gap support" and that only one compared vendor publicly documents air-gap suitability. — [Deepgram: on-prem STT comparison](https://deepgram.com/learn/on-premise-stt-comparison)

**Korean vendors**
- [P] **Selvas AI** registered "셀비 노트 3.0 서버형" (local server edition) on the Public Procurement Service Digital Service Mall in February 2025. Public bodies can choose an installed PC edition or a local server edition to fit their security requirements. — [VentureSquare](https://www.venturesquare.net/956911/)
- [P] **Konan Technology** delivered Konan STT to the National Health Insurance Service for meeting minutes on its cloud standard platform (August 2025). — [Asiae (EN), 2025-08-11](https://cm.asiae.co.kr/en/article/2025081108310374509)
- [P] **RTZR (리턴제로, VITO)** supplied STT for Shinhan Financial Group's AI contact centre (2024). Ubase Group, Korea's largest AICC company, "has agreed to acquire Return Zero" to bring STT in-house. The deal date was not confirmed; context points to around 2026. — [Asiae, 2024-08-06](https://www.asiae.co.kr/en/article/2024080609545166868); [Outsource Accelerator](https://news.outsourceaccelerator.com/?p=83938)
- [F] **Daglo** API supports async long-form STT in Korean, English, Japanese and Korean-English code-switching. Real-time streaming is available only to customers with extra permission. — [Daglo developer FAQ](https://developers.daglo.ai/guide/en/FAQ.html)
- [P] **CLOVA Note for business** is sold through NAVER WORKS and priced per company domain, not per seat. Plans run from Lite at ₩20,000/month (1,000 shared minutes) to Business Plus at ₩1,920,000/month (120,000 minutes plus API). One guide instead reads Lite as ₩20,000 per person, so the billing unit conflicts. One blog says the individual paid plan was discontinued. — [Subanana, citing NAVER WORKS, March 2026](https://subanana.com/ko/blog/clovanote-unlimited-alternatives); [Vexascribe](https://vexascribe.com/ko/%ED%81%B4%EB%A1%9C%EB%B0%94%EB%85%B8%ED%8A%B8-%EB%8C%80%EC%95%88)
- [P] PersonaAI launched a Korean speech AI that understands dialects, framed as "Korean speech sovereignty" (January 2026). — [Asiae, 2026-01-15](https://www.asiae.co.kr/en/article/2026011515473523659)

**Japan**
- [V] Price reference for an on-prem voice-input solution in Japanese manufacturing: about ¥140,000 per PC for a licence plus microphone set, and ¥0.5M–3M for application development. — [IPROS product listing](https://mono.ipros.com/product/detail/2000529941)

### Inferences
- [E] Licensed self-hosted ASR alone costs a mid-size customer roughly $5K–50K per year (NVIDIA per-GPU plus vendor licences), before integration. For SMEs that is far above a $15–40/seat SaaS budget. For large Korean accounts and public bodies the comparison is procurement-listed server editions (Selvas) and SI projects.
- [H] Korean public buyers already have a procurement route for "server-type" voice recording (Selvas on the Digital Service Mall). A self-hosted voice-logging appliance for field records would follow the same route, which needs CSAP or a successor certification for SaaS, or a "구축형" (installed) listing.
- [H] Consolidation (Ubase–RTZR; Meta–Limitless; Amazon–Bee) suggests standalone transcription is a feature market. Vertical workflow ownership is where margin stays.

### Gaps
- On-prem offerings and prices from MINDsLab (maum.ai), Saltlux, NAVER CLOVA Speech (Neurocloud) and Kakao were not verified.
- RTZR's on-prem offering and per-minute API price: not found.
- Rev and Verbit on-prem: not researched.

---

## Q5. Korean safety-management apps and large-contractor in-house tools: is voice used?

### Takeaway
Korean safety SaaS is crowded with risk-assessment, TBM, permit-to-work and e-signature apps. Most are free to download with B2B contracts and publish no prices. Large contractors use voice mainly for **real-time TBM translation for foreign workers**: GS E&C Xi Voice, Daewoo E&C with Lotte Innovate, and HJ Heavy Industries with Hi-Worker. Hanwha added voice input to its safety-reporting channel in October 2026. Generative risk-assessment tools are now given to SMEs for free (GS AIR) or built in-house by public corporations (Korea Rural Community Corporation's AI TBM app). No Korean product was found that does voice-first TBM or inspection logging with on-prem storage.

### Cited Findings
**SME safety apps**
- [V] App Store listings with no prices shown:
  - **세이프로 (Novusmay):** risk assessment, permit-to-work, TBM, facility inspection and in-app e-signature;
  - **스마트위험성평가V2 (Cloud Lab):** risk assessment, daily safety meeting and TBM sharing, "used after contract" (B2B);
  - **Plan2Do (Asiana IDT):** QR-based TBM without sign-up;
  - **오늘의작업장:** permit-to-work, JSA, TBM log and checklists;
  - **세이프디 (SAFED):** mobile and web risk assessment and TBM. — [App Store 세이프로](https://apps.apple.com/kr/app/id6739903483); [App Store 스마트위험성평가V2](https://apps.apple.com/us/app/-/id6499140833); [App Store Plan2Do](https://apps.apple.com/kh/app/plan2do/id6473452985); [App Store 오늘의작업장](https://apps.apple.com/us/app/id1672928638)
- [V/P] **AI안전함** (Korea Smart Safety and Health Association) supports risk assessment under the Serious Accidents Act and OSH Act, with multilingual interpretation. It claims about 3,000 sites and 200,000 workers (January 2025). — [CEO Score Daily, 2025-01-24](https://www.ceoscoredaily.com/page/view/2025012420124529856)
- [P] **GS AIR** (AI Risk Assessment) was built by GS Power staff on GS's no-code MISO AX platform. Generative AI turns a task name into process steps, hazards, risk ratings and countermeasures in about 3 minutes. It is offered free to SMEs (2026-01-19). No voice or TBM features are mentioned. — [Korea Times, 2026-01-19](https://www.koreatimes.co.kr/business/companies/20260119/gs-to-offer-self-developed-ai-safety-agent-free-of-charge-to-smes)
- [P] **Korea Rural Community Corporation** built an in-house "AI TBM APP" (announced 2026-03-31).
  - The manager enters the work, headcount and equipment, and AI generates hazards and safety rules.
  - Workers scan a QR code to read them, with multilingual translation and voice support.
  - The app "automatically creates and saves the meeting log".
  - It also announced AI CCTV hazard detection. — [Herald, 2026-03-30](https://www.heraldk.com/article/2026033021363241545)

**Large contractors: voice used for TBM translation**
- [P] **GS E&C Xi Voice**: a foreman's TBM announcements are interpreted live into Chinese, Vietnamese, Myanmar and other languages on site monitors. It covers 120 languages and handles construction slang (동바리, 아시바), with keyboard input as a fallback when recognition fails. Per-language voice output finished a PoC (January–July 2026). — [Herald, 2026-01-03](https://www.heraldk.com/article/2026010318000000821); [Money Today, 2026-07-09](https://www.mt.co.kr/estate/2026/07/09/2026070815522130992)
- [P] **Lotte Innovate** built an AI voice-translation agent with a construction-specific ASR model "to convert speech to text even on noisy sites" and 180+ languages. It was first used at Lotte E&C in July 2025 and adopted by **Daewoo E&C** for morning assemblies, TBM and safety training (May–June 2026), with a construction terminology dictionary. — [Daum/News, 2026-06-04](https://v.daum.net/v/20260604103702457); [Herald, 2026-05-31](https://www.heraldk.com/article/2026053121011269483); [Hankyung, 2026-06-01](https://www.hankyung.com/article/202606010044i)
- [P] **DL E&C** added AI translation of safety notices to its 어깨동무M app, based on ChatGPT (an external cloud LLM). The attribution comes from a search synthesis of 2026 articles on construction AI translation. — [Herald, 2026-01-11](https://www.heraldk.com/article/2026011118141404446)
- [P] **HJ Heavy Industries** is rolling out Hi-Worker (하이로컬) real-time AI interpretation for TBM and work instructions nationwide (September 2026). — [Hankyung Money, 2026-09](https://magazine.hankyung.com/money/article/202609043973c)
- [P] **Hwangryong E&C** showed TBM document auto-drafting in Google Sheets, with translation and TTS in 18 languages, at the KISS 2025 expo. — [KIDD](https://kidd.co.kr/news/242354)
- [P] **Hanwha E&C** added voice recognition (auto-filling the report from speech) and AI photo hazard analysis to its 안전신문고 safety-reporting channel (2026-10-15). — [Herald Biz (EN)](https://biz.heraldcorp.com/article/10903816)

### Inferences
- [H] In Korean construction, voice is entering through the **foreign-worker communication** pain (TBM interpretation), not through record-keeping. A voice logger that also produces the multilingual TBM briefing and the signed TBM minutes as one artefact would ride an established budget line.
- [H] Free or in-house generative risk-assessment tools (GS AIR, KRC) push the price of "AI writes the risk assessment" toward zero in Korea. Willingness to pay will attach to evidence quality (timestamped voice, attendance, photos and GPS that hold up after an accident) and to time saved for the 안전관리자 (site safety manager), not to text generation.
- [P→H] DL E&C's ChatGPT-based translation shows some Korean contractors do accept external cloud AI for safety notices. "No external cloud" is a buyer-specific requirement, not a universal one.

### Gaps
- Whether any listed Korean SME app (세이프로, 스마트위험성평가, Plan2Do, 오늘의작업장, 세이프디, AI안전함) has voice input: not verified.
- Their prices: not published.
- 세이프티온, Innogrid, Angelswing, HyperCLOVA-based safety solutions, and Hyundai E&C, Samsung C&T and POSCO E&C in-house voice tools: no specific sources found.
- Deployment model (cloud vs on-prem) of the large-contractor translation systems: not disclosed.

---

## Q6. Pricing benchmarks (consolidated)

### Takeaway
Seat prices cluster in three bands:
- comms or transcription **$7–15 per user per month** (Zello, Buddycom);
- checklist and inspection platforms **$24–29** (Mitti);
- construction PM and vertical voice-report tools **$29–99** (SuperReports, Fieldwire, Raken, Hive).

Police AI reporting carries **$199–570 per officer per year** bundles. Self-hosted ASR licences are enterprise-only at an estimated **$5K–50K+ per year**. Hardware is **$2.7–3.75K** per smart-glasses unit.

### Cited Findings
| Product (category) | Price | Label / date | Source |
|---|---|---|---|
| Zello Plus (PTT + transcription + AI Digests) | $12.75/user/mo yearly; Core $6.80; Enterprise custom with on-prem server option | [F] fetched 2026-11-05 | [Zello pricing](https://zello.com/pricing/) |
| Buddycom Talk Enterprise (PTT + 10 h/mo transcription + translation) | ¥1,200/user/mo annual (≈$8 [E]); ¥1,800 monthly | [F] fetched 2026-11-05 | [Buddycom price](https://buddycom.net/price/) |
| Mitti (ex-SafetyCulture) Premium | $24/seat/mo annual, $29 monthly; Free up to 10 users; location-based flat price per site | [F] fetched 2026-11-05 | [Mitti pricing](https://mitti.com/pricing/) |
| Fieldwire | $0 / $39 / $64 / $89 per user/mo annual | [F] fetched 2026-11-05 | [Fieldwire pricing](https://www.fieldwire.com/pricing/) |
| Raken (daily reports, dictation) | $15–46 or $64.99–79.99 per user/mo (conflicting third-party data) | [P] | [ERP Research](https://erpresearch.com/erp-add-ons/construction/raken/pricing); [LibreCam](https://librecam.pages.dev/compare/best-daily-report-apps) |
| SuperReports (voice daily logs) | Free starter; $29 per superintendent/mo | [P] | [GetApp](https://www.getapp.com/all-software/a/superreports/) |
| Fulcrum (Audio FastFill) | about $43/user/mo (conflicting) | [P] | [ToolRadar](https://toolradar.com/tools/fulcrum/pricing) |
| Hive Inspect / Spectora (home inspection, AI voice-to-report) | $99 / $109 per inspector/mo | [V] (prior repo note) | [Spectora vs Hive](https://www.spectora.com/spectora-and-hive-inspect-comparison) |
| Tulip | about $100 (Essentials) / $250 (Professional) per interface/mo | [P] | [PricingSaaS](https://pricingsaas.com/companies/tulip) |
| Augmentir + RealWear bundle | $140/user/mo on a 36-month subscription; software about $30/user/mo | [P] | [rfp.wiki](https://www.rfp.wiki/specialty-industries/augmented-reality-industrial-operations/realwear/augmentir); [eLearning Industry](https://elearningindustry.com/directory/elearning-software/augmentir/pricing) |
| Axon AI Era Plan (Draft One) | about $199 per officer (AI bundle); top bundle about $570 per officer | [P] 2025 – March 2026 | [Fintool](https://fintool.com/app/research/companies/AXON/earnings/Q1%202025); [MarketBeat](https://www.marketbeat.com/instant-alerts/axon-enterprise-flags-broad-2025-momentum-as-ai-bookings-hit-750m-at-morgan-stanley-conference-2026-03-05/) |
| CLOVA Note for business (KR) | ₩20,000/mo (1,000 min) to ₩1,920,000/mo (120,000 min), per domain | [P] March 2026 | [Subanana](https://subanana.com/ko/blog/clovanote-unlimited-alternatives) |
| NVIDIA AI Enterprise (Riva) | $4,500/GPU/yr; $22,500 perpetual with 5 years of support | [F] | [NVIDIA docs](https://docs.nvidia.com/ai-enterprise/planning-resource/licensing-guide/latest/pricing.html) |
| Deepgram self-hosted | Enterprise only; about $15K+/yr (aggregator) | [F] terms; [E] price | [Deepgram docs](https://developers.deepgram.com/on-prem); [ToolRadar](https://toolradar.com/tools/deepgram/pricing) |
| Speechmatics on-prem | Licence file, offline; about $25–50K+/yr (aggregator) | [F] terms; [E] price | [Speechmatics docs](https://docs.speechmatics.com/on-prem/containers/licensing); [CostBench](https://costbench.com/software/ai-transcription-apis/speechmatics/) |
| RealWear Navigator 520 | $3,300–3,750 (RealWear shop); $2,700 launch list price (2023) | [F]/[V] | [RealWear shop](https://shop.realwear.com/products/realwear-navigator-520) |
| JP on-prem voice-input kit (manufacturing) | about ¥140K per PC licence + mic; ¥0.5–3M app development | [V] | [IPROS](https://mono.ipros.com/product/detail/2000529941) |

### Inferences
- [E] Business-target arithmetic, assuming roughly 70% contribution margin before overheads:
  - $300K profit in year 1 needs about $430K or more in revenue.
  - At $30/seat/month ($360/year) that is about 1,200 paid seats.
  - At $15/seat it is about 2,400 seats.
  - Alternatively, about 10–15 self-hosted B2B deals at $30–40K/year.
  - The $0.5–1M year-2 target roughly doubles or triples these numbers.
- [H] A pure self-serve seat model at Korean SME prices (₩10–30K/seat) would need thousands of seats. A hybrid is more plausible: self-serve for small contractors and inspectors (global), plus a small number of on-prem or private-cloud B2B licences (Korea's large and regulated buyers).

### Gaps
- No Korean safety-app list prices were found, which leaves the Korean self-serve price point unanchored.
- Official Raken and Procore AI Go pricing, Zello on-prem pricing and Axon's per-officer price excluding bundles are all unknown.

---

## Q7. Korea regulatory drivers: Serious Accidents Punishment Act, OSH Act TBM and risk-assessment records, and how records are kept

### Takeaway
Two legal duties create the paper trail:
- **Serious Accidents Punishment Act** (중대재해처벌법, SAPA) Enforcement Decree Art. 4(3) requires a hazard identification-and-improvement procedure, checked **at least every half year**. Courts have penalized copied or generic risk assessments.
- **MOEL risk-assessment guideline (고시 제2023-19호, 2023-05-22)** created a "상시평가" (continuous assessment) option. It runs on monthly site walks, weekly joint meetings and **daily TBM**, and results must be **recorded and kept for 3 years**.

SAPA has covered sites with 5–49 workers (about 830,000 of them) since 2024-01-27. The September 2025 National Labor Safety Plan and the follow-on OSH Act amendments add heavier fines and penalties, but the reported effective dates conflict. Records are kept today as paper, photos and app forms. Practitioners and researchers describe a heavy paperwork load, and the TBM is often a 15-minute substitute for real assessment.

### Cited Findings
**Serious Accidents Punishment Act**
- [P quoting statute] SAPA Enforcement Decree Art. 4(3): "사업(장)의 특성에 따른 유해·위험요인을 확인해 개선하는 업무절차의 마련 및 해당 업무절차에 따른 유해·위험요인의 확인 및 개선에 대한 반기 1회 이상의 점검과 필요한 조치". In English: a procedure to identify and improve hazards specific to the site, with checks at least every half year on whether it is followed, and the necessary measures.
  - Establishing and running a risk-assessment procedure under OSH Act Art. 36 is treated as meeting this duty.
  - The duty is "one of the most frequently contested" in about 20 SAPA court rulings so far.
  - Courts found it unmet where assessments copied other sites or listed generic hazards that did not reflect the actual work. — [Yulchon newsletter no. 7, 2024-11-27](https://www.yulchon.com/ko/resources/publications/legal-update-view/38691/page.do)
- [P] Art. 4(7), on hearing workers' opinions and checking that improvements are carried out, is also structured as a half-yearly check. Having a procedure document is not by itself proof of compliance; actual identification and improvement must be shown. — [Nepla wiki](https://www.nepla.ai/wiki/%EA%B7%BC%EB%A1%9C-%EC%A7%81%EC%97%85%EA%B3%BC-%EC%9E%90%EA%B2%A9/%EC%82%B0%EC%97%85%EC%95%88%EC%A0%84-%EC%A4%91%EB%8C%80%EC%9E%AC%ED%95%B4/%EC%9D%B4%EB%AF%B8-%EB%93%9C%EB%9F%AC%EB%82%9C-%EC%9C%84%ED%97%98%EC%9A%94%EC%9D%B8%EA%B3%BC-%EC%9C%84%ED%97%98%EC%84%B1%ED%8F%89%EA%B0%80-%EC%A0%88%EC%B0%A8-%EC%A4%91%EB%8C%80%EC%9E%AC%ED%95%B4%EC%B2%98%EB%B2%8C%EB%B2%95-%EC%8B%9C%ED%96%89%EB%A0%B9-%EC%A0%9C4%EC%A1%B0-%EC%A0%9C3%ED%98%B8%C2%B7%EC%A0%9C7%ED%98%B8%EC%9D%98-%EC%A0%90%EA%B2%80-%EC%9D%98%EB%AC%B4-ov59rpm10n06)
- [P] SAPA has applied to firms with 50 or more workers since 2022-01-27 and to firms with 5–49 workers since 2024-01-27. A law-firm column counts about 830,000 sites with 5–49 workers. Headcount is counted per enterprise, and the construction contract-value threshold was removed. — [Lawwin](https://www.lawwin.co.kr/busan/newsdetail?index=2545); [Shin & Kim newsletter](https://shinkim.com/kor/media/newsletter/pdf/2309)

**MOEL risk-assessment guideline and record-keeping**
- [F] The MOEL guide "2023 새로운 위험성평가 안내서" (2023-05; registration no. 11-1492000-000993-01) explains 고시 제2023-19호 (2023-05-22). Its revisions:
  - risk assessment is redefined around identification, participation and sharing;
  - the burden of periodic assessment is reduced;
  - a new **상시평가** option runs monthly (joint labour-management site walks, near-miss analysis, suggestion schemes), weekly (prime/subcontractor joint safety meetings) and **daily (pre-work TBM)**, and replaces periodic and ad hoc assessments;
  - worker participation is guaranteed at every stage;
  - results must be shared with all workers, including through TBM.
  - The summary chart says "기록 및 보존: 실시 결과를 기록, **3년간 보존**". The model site rule keeps records "3 years after construction ends".
  - The model rule also shares monthly results on the site board "with SNS sharing in parallel" ("SNS 공유 병행"). — [MOEL guide PDF via Korea Chamber of Commerce (Chungbuk)](https://cbcci.korcham.net/file/dext5uploaddata/2023/2023%20%EC%83%88%EB%A1%9C%EC%9A%B4%20%EC%9C%84%ED%97%98%EC%84%B1%ED%8F%89%EA%B0%80%20%EC%95%88%EB%82%B4%EC%84%9C%202023_05%20(1).pdf)
- [P] The legal bases for risk assessment are OSH Act Art. 36, Enforcement Rule Art. 37 and the MOEL guideline. Records must cover the hazards, the risk determination and the measures taken; a fine of up to 5M KRW has been cited for failing to record. — [KoreaScience paper](https://koreascience.kr/article/JAKO202421274551793.pdf); [KOCCA internal rule PDF](https://www.kocca.kr/about/laws/rule/safety_20240401_01.pdf)
- [P] Press account of the 2023 guideline amendment: worker participation guaranteed, results shared, and TBM to keep workers aware of risks at all times. — [Kyeonggi Ilbo, 2023-05-23](https://www.kyeonggi.com/article/20230523580011)

**2025–2026 policy and amendments**
- [P] The government announced the **National Labor Safety Comprehensive Plan** (노동안전 종합대책) on 2025-09-15, covering 12 laws. The follow-on OSH Act amendment includes:
  - a **penalty surcharge of up to 5% of operating profit** (in the November 2025 ruling-party taskforce proposal, for employers with 3 or more worker deaths a year) and grounds for deregistration;
  - a fine of up to **10M KRW for not conducting risk assessment**, and up to 5M KRW for violating worker-representative participation;
  - safety and health status disclosure starting 2026-08-01 for larger sites (thresholds reported as 500+ or 300+ workers).
  - The reported dates conflict: the Assembly passage is given as 2026-10-01 by BKL, but another source cites promulgated Act No. 21374 of 2026-02-19. The risk-assessment fine takes effect 2026-06-01 per one blog, or January (50+ workers) and 2028-01 (under 50) per a forum post. Recheck on law.go.kr. — [MOEL press release](https://moel.go.kr/news/enews/report/enewsView.do?news_seq=19675); [BKL Legal Update](https://www.bkl.co.kr/law/insight/newsletter/6782); [eToday, 2025-11](https://www.etoday.co.kr/news/view/2526431); [Sankun blog](https://www.sankun.com/blog/detail/1800_industrial-safety-health-act-amendment-operating-profit-penalty); [Daum café post](https://m.cafe.daum.net/dbgodnlgja/svD7/39)
- [P] MOEL is deploying AI for accident prevention, reporting a 52% improvement in prediction performance (March 2026). KOSHA's president pledged AI-driven fatality reduction (February 2026). — [Asiae, 2026-03-13](https://www.asiae.co.kr/en/article/2026031307490415767); [Asiae, 2026-02-24](https://www.asiae.co.kr/en/article/2026022414001186662)
- [P] MOLIT cut the construction safety-management plan from about 4,000 pages to about 500, with a main volume of up to 80 pages (February 2026). This is an official acknowledgment of document bloat. — [News Seoul](https://www.newsseoul.co.kr/news/view/1065583217449376)

**How records are kept today**
- [P, union survey] A KCTU survey found that 83.9% of construction sites replace periodic and ad hoc assessments with a TBM of about 15 minutes. Only 17.2% collect and reflect workers' opinions, and only 61.6% carried out periodic assessment. A researcher proposed mandatory ad hoc assessment and longer TBMs. — [Nocut News](https://www.nocutnews.co.kr/news/6232836); [Newsis, 2024-10-23](https://www.newsis.com/view/NISX20241023_0002931272)
- [P, academic] Research on site safety managers' document workload quotes field comments that "taking photos for documents eats all the time". It proposes mobile apps for training logs and RPA reminders. — [KoreaScience: 건설현장 안전관리자의 과중한 서류업무 해소방안 연구](https://koreascience.kr/article/JAKO202318172438693.page?lang=ko)
- [A] A blog estimates about 180 OSH Act document types and says SAPA greatly increased document burden. A Comento answer from a working construction safety manager says paperwork and head-office requests leave no time to go out on site. — [Doaz blog](https://inblog.ai/doazofficial/%EC%82%B0%EC%97%85%EC%95%88%EC%A0%84%EA%B4%80%EB%A6%AC%EC%9E%90%EB%8A%94-%EC%B0%A8%EA%B0%91%EB%8B%A4feat-%EC%84%B8%EC%9D%B4%ED%94%BC-16530); [Comento Q&A](https://comento.kr/job-questions/모든회사/건설안전/현직_건설_안전관리자_분들_분위기가_어떤지_궁금_합니다-296581)

### Inferences
- [H] The **daily TBM under 상시평가** is the highest-frequency legally relevant record: one per crew per workday, kept 3 years. After an accident it is the first thing that gets scrutinized, because courts reject generic or copied content. A voice-first TBM capture would fit this record exactly: who attended, what hazards were actually discussed, timestamp, GPS, photo, translation and signatures. Courts and the KCTU both criticize the "15-minute paper TBM", so site-specific spoken content would carry evidential value.
- [H] Higher fines and penalty surcharges (2026) and the 2024 extension to 830,000 small sites widen the buyer pool. But small sites will default to free government and chaebol tools unless the product saves the 안전관리자 or 현장소장 visible time.

### Gaps
- The statutory text of OSH Enforcement Rule Art. 37 and SAPA Decree Art. 4 could not be fetched from law.go.kr. The 3-year retention comes from the MOEL guide, and the Art. 4(3) text from Yulchon.
- Final effective dates of the 2026 OSH amendments (surcharge, risk-assessment fines) need checking on law.go.kr.
- No survey quantifies how many sites use KakaoTalk group chats for TBM or photo records. MOEL's model rule mentions "SNS sharing", but KakaoTalk use is unquantified.

---

## Q8. Why no external cloud? Evidence of security-driven demand and the deployment options buyers want

### Takeaway
The evidence is mixed and changing fast.

Restrictions are loosening at the top. Samsung's 2023 ban on generative AI has given way to official ChatGPT, Gemini and Claude use in its DX division from June 2026. Korea's financial and public sectors are relaxing 망분리 (network separation) through the N2SF C/S/O data grades and security-AI exemptions, and CSAP is being folded into a single NIS-run verification. Even so, every relaxation is **tiered by data sensitivity**: confidential or sensitive data stays inside the network, and access depends on training and controls. US defence contractors face CMMC Phase 2 from 2026-11-10, and vendor-specific political risk is visible (reported Pentagon blacklisting of Anthropic). Sponsored surveys say about 91% of enterprises prefer on-prem, private or hybrid infrastructure for sensitive AI.

Net: demand for "no external AI" is real for **sensitive production, defence, semiconductor, public and critical-infrastructure data**. It is weakening for generic office text. Buyers want a choice of on-prem, private cloud or hybrid, with private cloud and hybrid more common than fully air-gapped.

### Cited Findings
**Samsung**
- [P] In May 2023 Samsung banned generative AI on company devices and internal networks, after engineers uploaded source code to ChatGPT in April 2023. Violations could lead to dismissal. The memo called the restriction temporary while in-house tools were built. — [NBC News](https://www.nbcnews.com/tech/tech-news/samsung-bans-use-chatgpt-employees-misuse-chatbot-rcna82407); [Android Central](https://www.androidcentral.com/apps-software/samsung-bans-generative-ai-use)
- [P] On 2026-05-26 Samsung announced official adoption of **ChatGPT, Gemini and Claude** for the **DX division** from June 2026.
  - It followed a PoC with about 2,500 employees in April and May.
  - Access is only for employees who complete security training.
  - Internal data and job-specific tasks remain on in-house **Samsung Gauss**.
  - The article does not mention the DS (semiconductor) division. — [Herald, 2026-05-25](https://www.heraldk.com/article/2026052520140966904); [Future Chosun](https://futurechosun.com/?p=149533)
- [P] In July 2026 Google Cloud provided Gemini Enterprise to DX employees worldwide. OpenAI said Samsung is adopting ChatGPT Enterprise and Codex for all domestic employees and DX overseas staff. — [Hankyung, 2026-07-13](https://www.hankyung.com/article/2026071324721); [Herald, 2026-06-21](https://www.heraldk.com/article/2026062118254478341)

**Korean financial-sector network separation (망분리)**
- [P] In 2024 the FSC took its first step to relax network separation. — [MTN, 2024-08-01](https://news.mtn.co.kr/news-detail/2024080116400247415)
- [P] In May 2026 the FSC temporarily relaxed network separation for **security-purpose** generative AI (AI vulnerability testing, security SaaS). Results must be shared with the government, and full removal for some firms is under review.
  - First batch, with no-action letters (June 2026): Shinhan, Hana, Woori and KakaoBank. KB Kookmin and NH were excluded.
  - Concerns remain about new attack surfaces when external AI connects to internal networks. — [Daum/News, 2026-05-24](https://v.daum.net/v/20260524120202416); [Daum/News, 2026-05-07](https://v.daum.net/v/20260507111714792); [MTN, 2026-06-18](https://news.mtn.co.kr/news-detail/2026061813415179539)

**Korean public sector: N2SF and CSAP**
- [P] **N2SF (국가망보안체계)**: the NIS classifies work information as Confidential (C), Sensitive (S) or Open (O) and applies grade-specific controls; generative AI is broadly allowed for O.
  - The NIS issued N2SF guidelines in 2025, and KISA ran 2025 pilots with 6 institutions.
  - The 2026 public call (March) and a support programme with 6 consortia (June 2026) followed.
  - S-grade data sent to external AI requires controls.
  - From 2026, public-institution management evaluations reflect AI adoption, and adopting N2SF earns credit in NIS security evaluations. — [Newsis, 2026-03-13](https://www.newsis.com/view/NISX20260313_0003547805); [Digital Daily, 2026-03-06](https://www.ddaily.co.kr/page/view/2026030609563895169); [Byline Network, 2026-04](https://byline.network/2026/04/13-653/); [Digital Daily, 2026-06-17](https://www.ddaily.co.kr/page/view/2026061713025567655)
- [P] **CSAP**: the NIS and MSIT announced that public-cloud security verification will be unified into a single NIS-run system, and the future of MSIT's CSAP is in question (April 2026). CSAP SaaS certifications were still being issued in June–August 2026 (e.g. LG U+ Alphakey, standard grade). Startups had called CSAP a "cloud barrier" (May 2025). — [Digital Daily, 2026-04-19](https://www.ddaily.co.kr/page/view/2026041901574681336); [SBS Biz](https://biz.sbs.co.kr/amp/article/20000327127); [Byline Network, 2025-05](https://byline.network/2025/05/19-487/)

**Korean defence and national core technology**
- [P] Korean academic work says legal responses to industrial-technology leakage through generative AI are "absent". It proposes per-user differentiated access control and closed-network local RAG for defence. No specific DAPA (방위사업청) rule on generative AI was found. — [eArticle](https://www.earticle.net/Article/A460123); [KoreaScience](https://koreascience.kr/article/JAKO202422243219358.pdf)

**United States**
- [F/P] **CMMC**: the DFARS CMMC rule took effect 2025-11-10. Phase 1 (mainly Level 1 and 2 self-assessments) runs to 2026-11-09, and **Phase 2 (C3PAO Level 2 certification) starts 2026-11-10**. DFARS 252.204-7012 requires cloud providers that handle CUI to meet FedRAMP Moderate or an equivalent, and encryption does not remove this requirement. — [DoD CIO: About CMMC](https://dodcio.defense.gov/cmmc/About); [Arnold & Porter, 2025-09](https://arnoldporter.com/en/perspectives/advisories/2025/09/cmmc-final-rule-key-takeaways-for-defense-contractors); [Deltek: FedRAMP and CMMC](https://www.deltek.com/resources/articles/fedramp-impacts-cmmc/)
- [V, from prior repo note] ITAR-sensitive manufacturing tools advertise ITAR registration and AWS GovCloud or FedRAMP environments (GroundControl, 1factory). — [GroundControl](https://gndctl.com/solutions/first-article-inspection-software/)
- [P] Defence-tech companies reportedly told staff to stop using Claude after the Pentagon blacklisted Anthropic. The date was not verified. This shows **vendor-specific political risk** for cloud-AI-dependent tools. — [Capital Brief](https://www.capitalbrief.com/briefing/defence-tech-companies-drop-claude-after-pentagon-blacklists-anthropic-d5368958-2be4-4e26-a92c-e98e727e3d31/)

**European Union**
- [P] **NIS2**: 23 of 27 EU member states had adopted national implementing acts by May 2026, and Germany's law entered into force in December 2025. Supply-chain obligations require entities to evaluate and document the security of the SaaS, cloud and contractors they use. — [Webinar slides, 2026-05-20](https://assets.contentstack.io/v3/assets/blt3de4d56151f717f2/blt0038be10d716b437/Webinar%20-%20EU%20Cybersecurity%20Laws%2020.05.26.pdf); [Jacar](https://jacar.es/en/nis2-transposition-status-across-member-states/)
- [H, not re-verified this session] NIS2 Annex II ("other critical sectors") lists manufacturing sub-sectors: medical devices, computer/electronic, electrical equipment, machinery, motor vehicles and other transport. One aggregator wrongly implied that manufacturing is not listed. The EUR-Lex fetch failed this session, so check the directive text. — [EUR-Lex Directive (EU) 2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng)

**Surveys (cross-industry, vendor-sponsored)**
- [V-sponsored survey] **Cloudian** (February 2026, n of about 203):
  - 91% would choose on-prem, private cloud or hybrid for AI involving sensitive data (20% on-prem, 33% private cloud, 38% hybrid with sensitive processing on site);
  - 58% had declined, delayed or scaled back an AI initiative over concerns about data leaving their premises or jurisdiction. — [Cloudian press release](https://cloudian.com/press/enterprise-repatriating-ai-workloads/); [Cloudian report PDF](https://www.storagenewsletter.com/wp-content/uploads/2026/03/Cloudian-AI-Infrastructure-Survey_Report.pdf)
- [V-sponsored survey] Freeform Dynamics for Scality: 504 IT and data leaders at firms with over 1,000 employees that already run private AI in production. 81% say private AI infrastructure they control is critical. EDB "Sovereignty Matters" (2,050 interviews) frames sovereignty as "the defining factor". — [Digital IT News](https://digitalitnews.com/?p=18737); [EDB report](https://www.enterprisedb.com/sites/default/files/pdf/sovereignty_matters_research_report.pdf)

**Japan**
- [P] A Stockmark survey (August 2026) of 384 practitioners at large manufacturers found 73% have tasks they "want to give to generative AI but can't"; the reason was not confirmed as data controls. MONOist (2025) reported 65% of manufacturers had adopted generative AI. — [MONOist, 2026-09-09](https://monoist.itmedia.co.jp/mn/articles/2609/09/news047.html); [MONOist, 2025-06-10](https://monoist.itmedia.co.jp/mn/articles/2506/10/news024.html)

**Deployment options vendors offer**
- [F] What vendors actually expose:
  - Zello: Enterprise "on-premise server options";
  - Deepgram: self-host "in the cloud or on-premises";
  - Azure: disconnected containers;
  - Speechmatics: offline-licensed containers;
  - Selvas: installed or local-server editions for Korean public buyers. — [Zello pricing](https://zello.com/pricing/); [Deepgram self-hosted](https://deepgram.com/self-hosted); [Microsoft Learn](https://learn.microsoft.com/azure/ai-services/containers/disconnected-containers); [VentureSquare](https://www.venturesquare.net/956911/)

### Inferences
- [H] The "external AI is banned" story is **weaker for 2026** than it was in 2023: Samsung DX, the Korean banks and the public sector are opening up under controls. The durable requirement is **data-grade-based control**: keep C and S data (production parameters, defect details, fab layouts, defence programmes, accident evidence) inside. For a field logger the sensitive content is audio, photos and GPS of plants and sites, which most security teams will class as S or C.
- [H] The deployment buyers will ask for first is **private cloud or hybrid** (Cloudian: 33% + 38%). They want the processing for sensitive audio on-site or in-country, with model-agnostic switching. **Fully air-gapped** is a niche (defence, fabs, some public bodies) that brings long sales cycles.
- [H] Model-vendor neutrality is a selling point in its own right. The reported Pentagon–Anthropic dispute and Samsung's three-vendor approach show buyers do not want lock-in to one external LLM.

### Gaps
- Current generative-AI policy for Samsung's DS (semiconductor) division and for SK hynix: not found.
- Concrete DAPA or defence-industry rules on cloud AI and speech data: not found.
- Policies on cloud AI at Korean utilities (KEPCO, K-water): not found.
- No manufacturing-specific survey on deployment preference was found.
- How 국가핵심기술 (national core technology) designations under the Industrial Technology Protection Act specifically restrict cloud processing: not researched.

---

## Q9. Segments and self-serve reachability

### Takeaway
Self-serve is plausible for **owner-operators and small crews who own their own paperwork**: US and EU small trade contractors and foremen, independent inspectors, field-service technicians, and in Korea the 현장소장 or 안전관리자 at small subcontractors and small factories (5–49 workers) now under SAPA. The latter segment is under heavy price pressure from free government and chaebol tools and subsidies. Buyers who need no-external-cloud deployment (large contractors, utilities, public bodies, semiconductor, defence) are B2B by nature: procurement listings, SI, on-prem pilots and security reviews. Several large Korean contractors build their own tools.

### Cited Findings
**Evidence for self-serve demand**
- [F] Mitti's free tier (up to 10 users) and $24/seat Premium serve 80,000 organizations, which shows bottom-up adoption of frontline checklists. — [Mitti pricing](https://mitti.com/pricing/); [Business Wire via Cadillac News](https://www.cadillacnews.com/ap/business/safetyculture-becomes-mitti-unveiling-a-platform-built-for-the-future-of-frontline-work/article_4f035e24-a056-51d2-8b87-2a42ce236a7c.html)
- [F] Fieldwire has a free Basic tier and self-serve paid tiers at $39–89. Zello sells Core and Plus online at $6.80–12.75. Buddycom publishes per-user prices up to 99 users and is sales-led above that. — [Fieldwire](https://www.fieldwire.com/pricing/); [Zello](https://zello.com/pricing/); [Buddycom](https://buddycom.net/price/)
- [P] Long-tail voice report apps (SuperReports $29, ConstruTrack $19 flat, app-store voice loggers) target individual superintendents and foremen. — [GetApp SuperReports](https://www.getapp.com/all-software/a/superreports/); [GetApp ConstruTrack](https://www.getapp.com/all-software/a/construtrack/)

**Korea**
- [P] SAPA covers about 830,000 sites with 5–49 workers since 2024-01-27. — [Lawwin](https://www.lawwin.co.kr/busan/newsdetail?index=2545)
- [P] Sites under 50 workers can get 80–90% of smart safety equipment cost subsidized, capped at 30M KRW. GS gives its AI risk-assessment tool free to SMEs. — [Kyungbuk Maeil](https://www.kbmaeil.com/article/20260831500493); [Korea Times](https://www.koreatimes.co.kr/business/companies/20260119/gs-to-offer-self-developed-ai-safety-agent-free-of-charge-to-smes)
- [P] Large contractors and public corporations build their own: GS Xi Voice, Daewoo with Lotte Innovate, DL 어깨동무M, Hanwha 안전신문고 and Korea Rural Community Corporation's AI TBM app. — see Q5 sources, e.g. [Herald, 2026-03-30](https://www.heraldk.com/article/2026033021363241545)
- [P] Korean public buyers purchase "server-type" voice-recording software through the PPS Digital Service Mall (Selvas). — [VentureSquare](https://www.venturesquare.net/956911/)

### Inferences
| Segment | Self-serve? | Why / evidence | Plausible price | No-external-cloud need |
|---|---|---|---|---|
| US/EU small trade contractors, foremen, superintendents | **Yes** | Free and low-cost tiers are the norm (Fieldwire, Mitti, SuperReports). But Procore AI Go and Benetics are moving in. [H] | $15–40/seat/mo [E] | Low |
| Independent inspectors (home, insurance, building, EICR) | **Yes** | Hive and Spectora at $99–109 (prior repo note); crowded. [H] | $30–100/mo [E] | Low |
| Field-service and maintenance technicians (HVAC, elevator, utilities contractors) | **Yes, partly** | Jobber's 400k pros (prior repo note) show self-serve buying. Voice notes plus photos plus GPS fit work orders. [H] | $15–40/seat/mo [E] | Low to medium |
| Korean 전문건설 subcontractors and small-site 안전관리자 / 현장소장 | **Possible but hard** | Legal pressure is high (SAPA, 3-year TBM records), but free tools and subsidies compress price; the buyer is often the prime contractor. [H] | ₩10–30K/seat/mo [E] or per-site flat | Low to medium |
| Korean small factories (5–49 workers) | **Possible** | Newly under SAPA; paper or photo records; subsidy channel if registered as a NIPA item. [H] | Per-site ₩50–200K/mo [E] | Medium (customer and IP data) |
| Mid-size manufacturers (100–999 workers) with IT security policies | **Hybrid** (self-serve trial, then a sales-assisted small appliance or private cloud) [H] | Have security rules but no SI budget. A "box on-prem" could be a wedge. [H] | $5–30K/yr per site [E] | **High** |
| Large contractors (GS, Daewoo, DL, Hanwha, Samsung C&T, Hyundai E&C) | **No** (B2B, often build in-house) | In-house voice and translation tools already deployed. [P] | Enterprise licence / SI | Medium to high |
| Utilities and public corporations (KEPCO, K-water, LH, KRC) | **No** (procurement, N2SF/CSAP) | Procurement listings and security evaluations; some build in-house (KRC). [P] | Tender | **High** |
| Semiconductor, display, defence (Samsung DS, SK hynix, Hanwha Aerospace, LIG Nex1) | **No** | National-core-technology and defence security; CMMC equivalents abroad. [H] | Enterprise on-prem | **Very high** (air-gap) |
| Robot/AV data-collection teams | Probably self-serve (another researcher covers this) | — | — | — |

- [H] For the $300K year-1 target, the most realistic mix is:
  - a global self-serve SKU for foremen, inspectors and techs (English first), using convenience and evidence quality as the wedge against free features;
  - plus 5–15 Korean mid-size or regulated B2B deployments (private cloud or on-prem box), sold on "TBM and risk-assessment evidence that stays in your network".
- Korean SME self-serve alone looks too price-compressed to reach the target in year 1.

### Gaps
- No direct willingness-to-pay data for Korean SMEs on safety SaaS (no published prices).
- The share of Korean construction safety spend that is subcontractor-paid versus prime-paid is unknown.
- Whether NIPA smart-safety-item registration accepts a software-plus-earbud or bodycam voice logger: unverified.

---

## Q10. User pain points and anecdotes

### Takeaway
The pains repeated across sources are consistent: typing with gloves and dust, noise that defeats dictation, superintendents too busy to log in real time, AI getting names and quantities wrong, paperwork crowding out time on site, and resistance to being filmed. Almost all English-language anecdotes come from vendor blogs, not Reddit, because no Reddit threads surfaced. Korean evidence comes from a union survey, an academic paper and a Q&A site.

### Cited Findings
**Field documentation pain (English sources)**
- [V/A] "Typing detailed notes on a phone with work gloves is painful". "Gloves and dust make phone screens unusable". Loud equipment drowns out ordinary dictation, so noise-cancelling earbuds or mics are recommended. A standard phone still forces you to remove gloves, unlock it and navigate software. — [Zack Proser: voice AI for foremen](https://zackproser.com/blog/voice-ai-for-construction-foremen); [Zack Proser: WisprFlow for construction](https://zackproser.com/blog/wisprflow-construction-workers); [InspectMind guide](https://www.inspectmind.ai/guides/construction-field-reporting)
- [V/A] "Most superintendents are too busy to document stuff in real time." Workaround seen in the field: dictate on the drive home and paste into a general chatbot. AI voice workflows need superintendent review because "AI gets names and quantities wrong". — [Dan Cumberland Labs](https://dancumberlandlabs.com/blog/commercial-construction-superintendent/); [BuildTools blog, 2026-06-01](https://www.buildtools.com/blog/2026-06-01-your-superintendent-shouldnt-have-to-type); [Product Hunt: FieldLog](https://www.producthunt.com/products/fieldlog-voice-daily-reports)
- [A/P] RiskTalk trials (mining, AusIMM conference abstract) started from worker feedback that frustration with growing paperwork was a recurring complaint. Voice tools also help with language and literacy barriers. — [AusIMM abstract](https://airdrive.eventsair.com/eventsairseasiaprod/production-ausimm-public/b0933519580248d0878efe52780a3f30)
- [A, 2011, older] A safety practitioner argued that a digital OHS app "may be no better than a paper system" and that corporate-friendly processes can impede safe work. — [SafetyAtWorkBlog, 2011-11-22](https://safetyatworkblog.com/2011/11/22/ohs-app-is-attractive-but-may-be-no-better-than-a-paper-system/)
- [P] A 2026 JSA-app buyer guide says the real question is whether crews will use the app in the field. It advises checking record locking and approval traceability at the form level. — [Safety Evolution](https://www.safetyevolution.com/blog/best-jsa-apps-field-crews)
- [V] JSA-OnTheGo stresses producing a signed, timestamped PDF offline for an inspector on demand, which shows offline evidence matters. — [App Store: JSA-OnTheGo](https://apps.apple.com/us/app/jsa-onthego/id1369505754)

**Korean sources**
- [P, union survey] 83.9% of Korean construction sites substitute a TBM of about 15 minutes for assessments, and only 17.2% reflect workers' opinions. — [Nocut News](https://www.nocutnews.co.kr/news/6232836)
- [A] Korean safety manager (Comento): document work and head-office requests leave "no time to come out of the office", so sites hire watchers instead. — [Comento Q&A](https://comento.kr/job-questions/모든회사/건설안전/현직_건설_안전관리자_분들_분위기가_어떤지_궁금_합니다-296581)
- [P, academic] Korean safety managers lose time taking photos for documents. — [KoreaScience](https://koreascience.kr/article/JAKO202318172438693.page?lang=ko)
- [P] Korean workers have resisted bodycams as a human-rights issue, which caused prime/subcontractor conflict. — [Bizhankook](https://www.bizhankook.com/bk/article/26035)
- [P] Foreign-worker language barriers are a primary driver of voice and translation adoption at Korean sites. GS Xi Voice includes keyboard fallback "when voice recognition does not work well". — [Herald, 2026-01-03](https://www.heraldk.com/article/2026010318000000821); [Smart Today](https://www.smarttoday.co.kr/ko-kr/articles/107971)

### Inferences
- [H] Product implications for the user's constraints:
  - push-to-talk or earbud-button capture, so nobody unlocks a phone with gloves on;
  - a noise-robust capture path with the transcript checked against audio;
  - explicit review of names and quantities before sign-off;
  - offline capture with tamper-evident timestamps, GPS and photos;
  - recording only during work hours or tasks, and audio-only by default, to avoid bodycam-style worker pushback;
  - multilingual playback of TBM content for foreign workers.
- [H] "Trustworthy" in this market means **evidence that holds up after an accident**: record locking, approval trail and site-specific content. That matters more than a polished summary, and the Yulchon court analysis and the 2026 JSA guide both point the same way.

### Gaps
- No Reddit (r/Construction, r/SafetyProfessionals, r/maintenance) threads surfaced in any query, so first-hand English anecdotes are missing.
- No first-hand Korean community posts (e.g. 안전관리자 cafés, Blind) on KakaoTalk-based TBM records were found.
- Maintenance-technician anecdotes (CMMS work-order notes) were not found.
