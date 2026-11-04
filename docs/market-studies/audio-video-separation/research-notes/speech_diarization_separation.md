# Speaker Diarization and Speech Separation Market (research date 2026-11-04)

Labels: [VF] verified fact (primary source), [VC] vendor claim, [EST] estimate (analyst or aggregator), [HYP] hypothesis. Several figures come from search-engine summaries of third-party pages; those are flagged. Search coverage was about 25 tool calls, so many segments are thin and listed under Gaps.

## 1. Use cases, buyers, willingness to pay

### Takeaway
Real budgets are in meeting notetakers, conversation intelligence (sales and contact centers) and healthcare scribing. In all of them diarization is a feature inside a larger product, not the thing buyers pay for. Direct per-hour pricing of diarization is tiny ($0.00 to $0.12 per hour), so the money is in the application layer. Overlapping speech and speaker-count errors are the common pain points. For legal, forensic, broadcast and hearing aids I found no usable pricing or error data.

### Cited Findings
- Meetings and notetakers: Otter.ai said it passed $100M ARR in March 2025, with under 200 employees and more than 35M users by December 2025 [VF, company press release] — [BusinessWire Dec 2025](https://www.businesswire.com/news/home/20251222704206/en/Otter.ai-Caps-Transformational-2025-with-100M-ARR-Milestone-Industry-first-AI-Meeting-Agents-and-Global-Enterprise-Expansion/); [BusinessWire Mar 2025](https://www.businesswire.com/news/home/20250325249430/en/Otter.ai-Breaks-$100M-ARR-Barrier-and-Transforms-Business-Meetings-Launching-Industry-First-AI-Meeting-Agent-Suite)
- Otter also raised $320M in non-dilutive capital from General Catalyst's Customer Value Fund [secondary report] — [AI Weekly](https://aiweekly.co/alerts/otterai-raises-320m-in-non-dilutive-capital-from-general-catalysts-customer)
- Fireflies.ai: valuation above $1B from a secondary tender offer, June 2025 [VC, company press release]; about $19M total funding per a tear sheet [EST]. No ARR figure found. — [Yahoo/PR](https://finance.yahoo.com/news/fireflies-reaches-1-billion-valuation-150000434.html); [tear sheet](https://siliconvalleyinvestclub.com/vi/companies/fireflies/tear-sheet.pdf)
- Granola: $125M Series C at a $1.5B valuation, March 2026, about $192M total raised [press reports; lead investor differs between sources] — [TNW](https://thenextweb.com/news/granola-series-c-meeting-ai-enterprise-context)
- Contact center and conversation intelligence: Gong reported ARR above $300M in March 2025 (TechCrunch via Sacra) and above $500M with over 55% growth in May 2026 (aggregator reports of a company announcement); about 5,000 customers [VC/press] — [Sacra](https://sacra.com/research/gong-at-300m-arr); [SalesTechStar](https://salestechstar.com/?p=261992)
- Healthcare ambient scribing: Abridge raised a $300M Series E at a $5.3B valuation (June 2025); Sacra estimates about $100M ARR in May 2025 (up from $60M at end of 2024) [EST]. Ambience about $30M ARR (May 2025) [EST]. Microsoft/Nuance DAX is the incumbent, and Epic announced its own scribe in 2024. — [Sacra Abridge](https://sacra.com/research/abridge); [Maginative](https://www.maginative.com/article/abridge-raises-300m-series-e-at-5-3b-valuation/)
- Legal and court: vendors (Speechmatics, Sonix, DraftTheRecord) market AI as a draft generator for human review and claim they handle overlapping speech. They claim 95 to 98.5% draft accuracy with 99%+ after human review [VC, no independent benchmark]. A practitioner tutorial admits AI "often struggles" when speakers overlap. — [Speechmatics legal](https://speechmatics.com/use-cases/legal-transcription); [Sonix](https://sonix.ai/ai/ai-for-court-reporters/); [Neurl tutorial](https://neurlcreators.substack.com/p/generating-court-transcriptions-with)
- Krisp: product lines are Voice AI for Call Centers, Developers (SDK; VIVA voice isolation model for voice agents) and Meetings. It reported 1B monthly minutes of voice AI processing (2026) [VC]. — [BusinessWire 2026-05](https://www.businesswire.com/news/home/20260506612131/en/); [BusinessWire 2025-08 via MammothTimes](https://business.mammothtimes.com/mammothtimes/article/bizwire-2025-8-19-krisp-launches-ai-voice-translation-v20-to-power-real-time-multilingual-communication-and-enhance-customer-experience-in-call-centers)
- Krisp funding is about $17.5M total across 4 rounds per aggregators (conflicting round labels) [EST]. An unverified profile gives ARR of $37.7M [EST, low quality]; another gives $18.7M [EST, low quality]. — [Coverager](https://coverager.com/company/krisp/); [YesPress](https://yespress.io/krisp); [ToolJunction](https://www.tooljunction.io/ai-tools/krisp/company)
- Hearing: Apple's AirPods Pro 2/3 "Conversation Boost" focuses on the person facing the wearer and works best one-on-one [VF for the feature, user guide]. Retail explainers say it may struggle with loud places or overlapping conversations. — [Apple Support](https://support.apple.com/en-ae/guide/airpods/devd9aac5b42/26/web/26); [ShopSavvy](https://shopsavvy.com/answers/what-is-conversation-boost-on-airpods-pro-3.md)
- Target-speech hearing research (University of Washington, Gollakota lab): "Look Once to Hear" (2024) does target-speaker extraction using noisy binaural enrollments, in real time on an embedded CPU. TF-MLPNet (arXiv, Aug 2025) processes 6 ms chunks in real time on the GAP9 low-power chip [VF, papers]. — [arXiv 2405.06289](https://arxiv.org/html/2405.06289v3); [arXiv 2508.03047](https://arxiv.org/abs/2508.03047?context=cs)

### Inferences
- Diarization is an input cost, not a product. Its API price is $0 to $0.12 per hour while notetaker ARPU is far higher, so willingness to pay for diarization alone is low. It is a buying criterion only where errors break workflows: attributing statements in legal and clinical settings, and agent versus customer attribution in call centers (although stereo channel split already solves most call-center cases [HYP]).
- Healthcare scribing has the highest per-user budgets and compliance requirements, which favors on-premises or on-device components [HYP].

### Gaps
- No primary data on forensic or law-enforcement audio budgets or the tools used.
- No broadcast, subtitling or sports-commentary pricing found.
- No podcast editing vendor figures (Descript, Riverside, Adobe) found.
- Granola and Fireflies ARR not found.
- The AirPods and Pixel target-speaker technology is not publicly documented. I found nothing showing Apple or Google use neural target-speaker extraction.
- No data on clinician-patient diarization error rates.

## 2. Vendors and pricing (diarization add-on per audio hour)

### Takeaway
Diarization is nearly commoditized: bundled free (Speechmatics, AWS and Azure per third-party sources) or a small add-on (AssemblyAI $0.02 per hour async, $0.12 per hour streaming). pyannoteAI is the specialist: €0.035 to €0.112 per hour. The one-vendor-per-segment picture for Korea is thinner than for the US.

### Cited Findings
- AssemblyAI [VF, pricing file marked "last updated 2026-10-27"]: diarization async +$0.02/hr, "experimental" mode +$0.065/hr (better for many speakers and hard audio), streaming +$0.12/hr. Base: Universal-3.5 Pro $0.21/hr, Universal-2 $0.15/hr. — [AssemblyAI pricing](https://www.assemblyai.com/pricing.md)
- pyannoteAI [VF, pricing page]: Developer plan €19/month, Starter €99/month, Enterprise custom with on-premises option. Per hour (Developer / Starter): Precision-3 €0.112 / €0.096; Community-1 hosted €0.035; Live-1 streaming €0.198 / €0.170; STT orchestration €0.168 / €0.144. — [pyannote pricing](https://www.pyannote.ai/pricing)
- pyannote open-source licensing [VF, model cards]: pyannote 3.1 pipeline is MIT; Community-1 is CC-BY-4.0 (commercial use allowed); both are gated on Hugging Face (accept terms). Precision-2/3 is hosted only. — [Community-1 card](https://huggingface.co/pyannote/speaker-diarization-community-1/blob/main/README.md); [3.1 card](https://www.github.com/pyannote/hf-speaker-diarization-3.1)
- Deepgram: sources conflict (about $0.07 to $0.26 per hour, most often about $0.12 per hour for diarization on Nova-3 streaming). I could not confirm this on Deepgram's own page [EST, third-party]. — [Soniox comparison](https://soniox.com/pricing/stt/soniox-vs-deepgram); [HappyRobot](https://www.happyrobot.ai/hub/deepgram-pricing)
- Speechmatics: from $0.12/hr (Melia batch), with diarization stated as included; real-time diarization supported [VC, Speechmatics' own comparison page]. — [Speechmatics vs ElevenLabs](https://www.speechmatics.com/how-we-compare/elevenlabs-scribe-alternative.md)
- ElevenLabs Scribe v2: $0.22/hr batch with diarization in batch; Realtime $0.39/hr without diarization [VC, Speechmatics' page; competitor-sourced]. Same source.
- AWS Transcribe: diarization said to be included in standard price; about $0.36/hr (aggregator) [EST]. Azure batch $0.18/hr with diarization included, real-time about $1/hr [EST, developer guide]. Google: no clear diarization price found. Rev.ai: about $0.20/hr AI-only [EST]. — [Soniox comparison](https://soniox.com/compare/stt/pricing); [Dasha](https://dasha.ai/blog/speech-to-text-pricing); [CostBench Rev vs AWS](https://www.costbench.com/compare/aws-transcribe-vs-rev-ai/)
- Picovoice Falcon (on-device): vendor-reported DER close to pyannote.audio, better JER, 221x less compute and 15x less memory than pyannote.audio. No real-time out of the box. Pricing not found. An independent SDBench paper frames it as trading accuracy for efficiency. — [Picovoice benchmark](https://picovoice.ai/docs/benchmark/speaker-diarization/); [arXiv 2507.16136](https://arxiv.org/pdf/2507.16136)
- NVIDIA NeMo Sortformer: open model (`diar_sortformer_4spk-v1`) supports at most 4 speakers; model card DER on DIHARD III eval is 16.28 (14.76 with tuned post-processing) [VF, model card]. — [HF card](https://huggingface.co/nvidia/diar_sortformer_4spk-v1)
- Korea, Daglo (ActionPower, RTZR is a separate firm): ActionPower closed a 6B KRW Series B (March 5, 2026; Hana Ventures lead, KDB), total over 20B KRW. Daglo sales roughly quadrupled year on year, cumulative processing over 13M hours, B2B up about 40%; clients include DB Life, Hancom, Seoul National University Hospital, KT Skylife [VF, news report]. — [Asia Economy](https://www.asiae.co.kr/en/article/2026030511041441879)
- Naver CLOVA Note: as of a July 2026 blog, no paid personal plan; 300 free minutes (600 with data-use consent) [EST, blog]. — [VexaScribe](https://vexascribe.com/ko/%ED%81%B4%EB%A1%9C%EB%B0%94%EB%85%B8%ED%8A%B8-%EB%8C%80%EC%95%88)
- Samsung Galaxy AI Transcribe assist: official page describes transcription with variable quality; a reviewer says it labels "Speaker 1/2" [anecdote]. — [Samsung support](https://www.samsung.com/au/support/mobile-devices/how-to-use-transcribe-assist-on-the-galaxy-s24/); [Adam Lobo review](https://adamlobo.tv/?p=19702)

### Inferences
- Because incumbents bundle diarization at near-zero marginal price, a standalone diarization API cannot charge much outside accuracy-critical or on-premises niches. pyannoteAI's €0.10 per hour is the high end of the market [HYP].
- Rough check: at $0.02 to $0.12 per hour, 1M hours per year of diarization is only $20K to $120K of revenue [calculation from cited prices].

### Gaps
- Official Deepgram, Google, AWS, Azure and Rev.ai pricing pages were not read directly.
- RTZR VITO (Return Zero) features, diarization support, pricing and funding: searches returned nothing relevant.
- Daglo's diarization accuracy and pricing not found. Samsung's maximum speaker count not found.
- Picovoice pricing not found.

## 3. State of the art and accuracy

### Takeaway
On clean, English, well-mixed meeting audio, best-in-class DER is roughly 5 to 15 percent. It degrades to 15 to 25 percent or more on hard domains, and numbers across papers are not comparable (collar, overlap handling, tuning). Separation is excellent on synthetic benchmarks (SI-SDRi about 17 to 22 dB) but I found no reliable real-world numbers. Korean-specific diarization benchmarks were not found.

### Cited Findings
- Benchmarking Diarization Models (arXiv 2509.26177, Sep 30, 2025, 196.6 h, five languages including Japanese and Mandarin): pyannoteAI 11.2% DER (best), DiariZen 13.3% (best open source). Sortformer shows increased speaker confusion on VoxConverse because of its 4-speaker limit. Main error source is missed speech, then speaker confusion; errors worsen with many speakers [VF, peer-submitted paper, authors independent of pyannoteAI]. — [arXiv](https://arxiv.org/abs/2509.26177)
- pyannote 3.1 vs Community-1 vs Precision-2 (vendor-reported on model cards): AMI-IHM about 18.8 / 17.0 / 12.9; DIHARD 3 full about 21.4 to 21.7 / 20.2 / 14.7; VoxConverse 11.2 / 11.2 / about 8.5 (VoxConverse Precision-2 from a third-party PyPI package). Column mapping was inferred from search snippets [VC/EST]. — [Community-1 card](https://huggingface.co/pyannote/speaker-diarization-community-1/blob/main/README.md); [diarize on PyPI](https://pypi.org/project/diarize/)
- pyannoteAI's own benchmark (published Oct 30, 2026): about 67 h, 259 recordings, 10 DIHARD-derived domains, 9.3% overlapping speech, no speaker count given, comparing Precision-3, Community-1, AssemblyAI Universal-Pro-3.5, Deepgram Nova-3, ElevenLabs Scribe-v2, Soniox, Speechmatics. The numbers were in a chart I could not read. pyannoteAI states it kept test data out of training and that other vendors do not disclose this [VC]. — [pyannote benchmark](https://www.pyannote.ai/benchmark)
- Other published numbers: EEND-M2F DIHARD-III 16.07, AMI-Mix 12.62, AliMeeting 13.20 (VoxConverse result possibly biased by tuning) [VF, 2024]; EEND-TA DIHARD III 14.49 (2025) [VF]. — [arXiv 2401.12600](https://arxiv.org/html/2401.12600v1)
- Separation (HyperAI aggregator, not checked against papers): WHAMR! SI-SDRi — TF-Locoformer (M) 18.5 dB, SepReformer-L+DM 17.1, MossFormer2 17.0. Libri2Mix — TF-Locoformer (M) 22.1, MossFormer2 21.7 to 22.2 [EST]. — [HyperAI WHAMR!](https://hyper.ai/en/sota/tasks/speech-separation/benchmark/speech-separation-on-whamr); [Libri2Mix](https://vercel.hyper.ai/en/sota/tasks/speech-separation/benchmark/speech-separation-on-libri2mix)
- Distant conversational speech: CHiME-7/8 DASR review (arXiv 2507.18161, 2025) reports low participation (3 teams) and that speaker counting errors significantly hurt transcription; scoring uses tcpWER. NTT's system (self-reported) reached a 63% relative macro tcpWER improvement over baseline using EEND-VC, TS-VAD and multichannel speaker counting. — [arXiv 2507.18161](https://arxiv.org/pdf/2507.18161); [arXiv 2502.09859](https://arxiv.org/html/2502.09859v2)
- Overlap statistics: the SDBench paper covers 13 datasets; AliMeeting has the highest overlap ratio (0.19). — [arXiv 2507.16136](https://arxiv.org/pdf/2507.16136)
- Failure modes confirmed by sources: overlap, many speakers (Sortformer cap of 4), short turns and speaker count estimation (CHiME), efficient on-device models trading accuracy (Picovoice).

### Inferences
- Reading the sources together, headline DER from 2025 to 2026 on easy sets looks nearly saturated, and remaining value is in hard domains, unknown speaker count and long-form consistency [HYP].
- Separation benchmarks are mixtures of clean read speech. The gap to real far-field, reverberant, 3+ speaker conversation is probably large [HYP; supported only by absence of real-world results].
- Korean-specific weaknesses (honorific and short backchannels, agglutinative short utterances, small public corpora) are plausible but unverified [HYP].

### Gaps
- No Korean diarization or separation benchmark or DER figure found, so Korean failure modes are unsupported.
- Official DIHARD III / AMI / VoxConverse leaderboards for the best 2025 to 2026 systems not obtained; the numbers above are model cards and papers with differing protocols.
- Real-world separation performance not found; SepReformer/TF-Locoformer primary papers not read.
- No numbers for ElevenLabs, Deepgram, Speechmatics or AssemblyAI diarization accuracy from independent sources.

## 4. Market sizes

### Takeaway
Analyst estimates vary 20x depending on scope. Treat all as low-quality paid-report press releases. Company-reported ARR is the better signal.

### Cited Findings
- Speech analytics: $4.1B (2025) to $20.7B (2035), 17.6% CAGR (OMR) [EST]; $4.94B in 2025 to $15.31B in 2034 (Fortune Business Insights) [EST]; $3.1B (2024) to $13.4B (2033) (IMARC) [EST]. — [OMR](https://www.omrglobal.com/press-release/speech-analytics-market-size); [IMARC](https://www.imarcgroup.com/global-speech-analytics-market)
- Conversation intelligence: $21.9B (2025) to $80.1B (2034) (Market Research Future) [EST]; about $1.0B (2025), 26.4% CAGR for the "platform" segment (Market Research Forecast) [EST]. — [MRFR](https://www.marketresearchfuture.com/reports/conversation-intelligence-software-market-26683); [MRForecast](https://www.marketresearchforecast.com/reports/conversation-intelligence-platform-44532)
- Traction signals are in Section 1: Otter $100M+ ARR, Gong $500M+ ARR, Abridge about $100M+ ARR, Granola $1.5B valuation, Fireflies $1B valuation, Krisp about $17.5M raised.
- AI medical scribe VC funding was reported at $800M in 2024 vs $390M in 2023 [EST, secondary]. — [Neuronfeed](https://neuronfeed.com/category/ai-healthcare?page=6)

### Inferences
- Trustworthy revenue pools (Gong, Otter, Abridge) sum to a few hundred million to low billions of dollars of ARR, consistent with the lower analyst figures. The $20B+ conversation-intelligence figure appears to define the market far broadly [HYP].

### Gaps
- No AI meeting-assistant market-size estimate found.
- No sizing for diarization or separation as a standalone component.
- Hearing-aid and hearables market sizes not researched.

## 5. Gaps and unmet needs (opportunities for a small team)

### Takeaway
Supportable by the evidence: (a) generic diarization is crowded and priced near zero; (b) accuracy gaps persist for overlap, unknown or large speaker counts and far-field audio; (c) on-device efficiency is a known trade-off area. Everything about a winnable niche below is hypothesis.

### Cited Findings
- Open-source baselines are good and free (pyannote Community-1 under CC-BY-4.0, DiariZen, Sortformer), and AssemblyAI charges $0.02 per hour async (see Section 2).
- Sortformer is capped at 4 speakers, Falcon trades accuracy for efficiency, ElevenLabs realtime lacks diarization (see Sections 2 and 3).
- Real-time target-speech hearing already runs on low-power chips in research (see Section 1), with no commercial equivalent found outside Apple and Google features.
- Daglo (Korea) is growing fast with B2B and on-premises customers in insurance, hospitals and public sector [VF, news]. — [Asia Economy](https://www.asiae.co.kr/en/article/2026030511041441879)

### Inferences (all hypotheses)
- Korean on-premises or on-device diarization plus ASR for regulated sectors (hospitals, courts, finance, public sector) is plausible, since Korean buyers already pay for on-premises (Daglo B2B). Competitors are strong domestically (Naver, ActionPower, RTZR), so a small team would need to supply a component to them or beat them on a measurable Korean overlap benchmark. No such benchmark exists in the sources, which is both an opening (build and publish one) and a risk (no evidence buyers care).
- Overlap-robust separation plus diarization for meetings and call recordings with 3+ speakers: technically open but the revenue evidence is for whole products, not the component.
- On-device low-power target-speaker extraction for hearables is technically feasible per UW research; the buyers are a few OEMs (Apple, Google, Samsung, hearing-aid makers) with in-house teams, so it is a licensing sale with long cycles.
- Broadcast and legal are plausible but unevidenced: customers there pay for human-verified results, and I found no data on spend.

### Gaps
- No customer interviews, RFP or buyer-level evidence of unmet demand.
- No evidence on whether better diarization measurably changes retention or price in notetakers.
- No pricing for any separation-as-a-service product (Krisp's SDK pricing, Gaudio Lab, etc.).
