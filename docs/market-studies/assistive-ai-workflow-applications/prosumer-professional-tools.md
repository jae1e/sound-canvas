# Prosumer Professional Tools: Individual Practitioners Who Buy Their Own Software (as of November 2026)

Scope: individual practitioners, often 1099 contractors or sole proprietors, who pay for their own tools at consumer-level prices and whose income depends on a tedious, documentation-heavy or infrequent task. Every candidate is scored against the founder's four criteria:
- **C1 Assist:** AI assists and a human reviews or edits the output.
- **C2 Money:** the tool helps the user earn more (more jobs per day, faster payment, fewer rejections, more bids won).
- **C3 Non-fluency:** the task stays tedious, or the person or the rules keep changing, or the task is infrequent enough that expertise never builds up.
- **C4 Consumer buyer:** the individual decides and pays, roughly $10–50/month or small per-use fees.

Constraints carried over: small Korean software company, self-service SaaS, editable outputs, LLM/VLM plus domain logic, no foundation-model training. Phone-based 3D capture or measurement is a plus, and so is relevance to Korea.

Research date: 2026-11-03. Each finding is tagged: **[Fact]** (regulator, statute, official statistics or primary document), **[Press]** (news report), **[Vendor claim]** (a company's own statement or pricing page), **[Anecdote]** (forum, blog or practitioner opinion), **[Estimate]** (modelled figure), **[Aggregator/unverified]** (secondary listing or search-engine synthesis I could not check against the primary source).

**Method note:** All agents in this session draw on one shared web-search budget, and it ran out after about 15 searches in this thread. Most evidence after that came from direct fetches of primary or vendor pages that earlier searches had surfaced. Some pages blocked fetching (Fannie Mae, CubiCasa, InterNACHI, Gas Safe Register and EUR-Lex returned 403/404 or empty pages). For those I rely on search-result syntheses and tag them **[Aggregator/unverified]**. Thinly sourced areas: UK trade counts, home-inspector headcount, Naver/Coupang seller counts, AI entrants for adjusters, Hover/CubiCasa funding and user counts. Each section's Gaps list shows where.

**Overlap note:** Sibling notes in this folder cover manufacturing FAI (aerospace-fai-automation/) and Korean 정부지원사업 grant workflows (non-manufacturing-applications.md, Q5). I reuse a few of their findings here and cite the original URLs they cite.

---

## Q1. Independent and catastrophe (CAT) insurance adjusters (US 1099)

### Takeaway
Independent adjusters (IAs) match the money criterion closely. They are paid per claim from a fee schedule, so closing more claims per day is income. They already pay for a costly tool themselves (Xactimate, which aggregators list at about $350/month). CAT work comes in deployments: each storm brings new entrants, different carrier guidelines and report templates, and long, tedious photo reports and estimates. The obstacles are Verisk's control of the estimating system of record (it launched XactAI built into Xactimate in September 2025) and the policyholder data handled on a personal tool. Phone 3D capture is a natural fit: roof and interior sketches feed the estimate.

### Cited Findings
**Population and labor market**
- [Fact, BLS OOH, 2025 data] Claims adjusters, examiners and investigators: **376,100 jobs (2025)**, projected to fall 5% (−20,600) by 2035. Auto damage appraisers: 13,500. Median pay, combined occupation: $78,020 (May 2025). Roughly 21,600 openings a year, all from replacement. Largest employers of adjusters/examiners/investigators: direct insurance carriers 35%, agencies/brokerages and other insurance-related activities 29% (which includes IA firms), federal government 13%. **The OOH gives no self-employed share for this group** (auto appraisers: 2% self-employed). — [BLS OOH: Claims adjusters, appraisers, examiners, and investigators](https://www.bls.gov/ooh/business-and-financial/claims-adjusters-appraisers-examiners-and-investigators.htm)
- [Fact, BLS OOH] BLS notes that "Computer software can evaluate photographs of damaged property and calculate an estimated claim amount." It also notes that disasters drive demand for field adjusters and that licensing varies by state. — [BLS OOH](https://www.bls.gov/ooh/business-and-financial/claims-adjusters-appraisers-examiners-and-investigators.htm)
- [Press/aggregator, date uncertain] 34 states require independent adjusters to be licensed (Claims Journal topic page). Iowa added an IA licensing requirement effective July 1, 2025. — [Claims Journal NARAB topic](https://claimsjournal.com/topics/narab); [SuretyBonds blog on Iowa](https://www.suretybonds.com/blog/iowa-introduces-new-insurance-adjuster-regulations/?amp=1)
- [Gap-flag] I found no 2025 NIPR count of licensed independent adjusters. NIPR holds about 9.2M producer and entity records but does not break out adjusters. — [FinTech Global on NIPR data, 2026-04-17](https://fintech.global/2026/04/17/what-the-latest-data-reveals-about-the-us-insurance-producer-landscape/)

**Money link (pay per claim)**
- [Aggregator/unverified; training-school and forum sources] IAs are mostly paid a share of a per-claim fee. One example schedule pays a flat $415 for claims under $14,500 and $640 above. Adjusters keep about 50–70% of the fee (sources vary: 55–70%, 60–70% on CAT). "A good adjuster should be closing 2 to 4 claims per day; a superb adjuster 4 to 7." One forum poster estimated net pay of about $600/day over 10 days, or $429/day over 14, assuming $200 gross per claim after taxes and expenses. Fee schedules are negotiable, change suddenly when a catastrophe hits, and NFIP flood claims have their own schedule. Most IAs are 1099 contractors, though some firms offer W-2. — [AdjusterPro fee schedules](https://adjusterpro.com/fee-schedules/); [AdjusterPro "Just how are adjusters paid?"](https://adjusterpro.com/?p=5256); [CGAA on IA fee schedules](https://www.cgaa.org/article/independent-claims-adjuster-fee-schedule); [catadjuster.org forum](https://catadjuster.org/Forums/tabid/60/aft/3202/Default.aspx); [NFIP bulletin W-22001](https://agents.floodsmart.gov/sites/default/files/bulletins/W-22001/w-22001.pdf). (The AdjusterPro page returned 403 when fetched directly, so these figures come from a search synthesis that does not tie each number to one page.)

**Tools and prices**
- [Aggregator] Xactimate: Capterra and Software Advice list one plan "starting at $350 flat rate per month". A non-US Capterra listing shows $760 for 3 months, $1,280 for 6 months and $1,910 for 12 months. Verisk publishes no official price. — [Capterra Xactimate pricing](https://www.capterra.com/p/214125/Xactimate/pricing/); [Software Advice UK](https://www.softwareadvice.co.uk/software/12420/xactimate)
- [Vendor claim, 2025-09-30] Verisk launched **XactAI**, a suite inside Xactimate and its claims products. Features include capturing or uploading photos with auto-generated descriptions, and an AI Estimator that builds a structured estimate from a plain-language job description. The press-release PDF metadata dates it September 30, 2025. The newsroom page body did not load. — [Verisk newsroom](https://www.verisk.com/company/newsroom/verisk-introduces-new-ai-tools-to-streamline-the-property-claims-experience/); [Verisk press release PDF](https://s29.q4cdn.com/767340216/files/doc_news/Verisk-Introduces-New-AI-Tools-to-Streamline-the-Property-Claims-Experience-2025.pdf)
- [Vendor claim] Hover's pricing page has an insurance (adjusters and carriers) section with the same plan structure as for contractors. Hover exports ESX (Xactimate) files on every plan and integrates with Verisk and Cotality. — [Hover pricing](https://hover.to/pricing)
- [Vendor claim] magicplan (restoration and adjuster sketching): plans start at 10 projects/month, extra projects cost $40 each, LiDAR scanning works on iOS Pro devices, users are unlimited, and the site says "Join 10,000+ Restoration Professionals". The page did not render the plan prices. — [magicplan pricing](https://www.magicplan.app/pricing)
- [Vendor claim] Roofr sells ESX files at $10–12 per report on top of roof measurements ($31 for Report+ESX on its free Starter plan). Contractors and adjusters both need Xactimate-compatible output. — [Roofr pricing](https://roofr.com/pricing)
- [Press, older] Carrier-side AI already exists: Tractable (photo estimating; Series E of $65M in 2023 per an aggregator, about $184M total) and Yembo (video to 3D interior models viewable by desk adjusters, integrated with Xactimate in 2022). — [Seedtable on Tractable](https://dev.seedtable.com/startups/tractable-ai); [Verisk/Yembo integration via Nasdaq](https://www.nasdaq.com/press-release/verisk-continues-to-expand-its-property-estimating-ecosystem-with-integration-of)

### Inferences
- **Scores:**
  - **C1 Assist: High.** The adjuster signs the estimate, carriers audit files, and Verisk positions XactAI as assistance.
  - **C2 Money: High.** Pay is per claim. Going from 2 to 3 closed claims a day is a 50% raise during a deployment, and avoiding re-inspections or file returns brings payment forward.
  - **C3 Non-fluency: Medium–High.** CAT deployments bring new entrants every season. Each carrier and IA firm has its own report template, photo-labeling and guideline rules, and these change from one deployment to the next. Xactimate itself does become fluent with use.
  - **C4 Consumer buyer: Medium.** IAs already buy their own tools (Xactimate at roughly $350/month shows willingness to pay well above $50). But the system of record is Verisk's, carriers or IA firms often dictate tools, and policyholder PII sits in the files.
- **Wedge for a small team:** a "deployment kit" for IAs that does not compete with Xactimate. It would (a) digest carrier and IA-firm guidelines into checklists, (b) turn photos into captioned, labeled photo reports and narrative drafts the adjuster edits, and (c) turn a phone LiDAR or photo scan into a roof or interior sketch exported as ESX. Verisk's XactAI is the main threat to (b). Hover and magicplan already occupy (c), at $29–139 per project and roughly $40 per project respectively.
- **3D link: High.** Roof pitch, area and room sketches are measurement deliverables that go straight into the estimate.
- **Data and regulatory obstacles:** Claim files contain policyholder PII and carrier-confidential guidelines. Some carriers forbid uploading to unapproved tools. ESX is a proprietary Verisk format. Hover, Roofr and magicplan produce ESX, so some import/export path exists, but I could not verify the partnership terms.

### Gaps
- No count of licensed or active independent and CAT adjusters (NIPR or state data), and no self-employed share in BLS for this group.
- No verified 2025–2026 funding rounds for AI tools aimed at individual IAs. Searches returned only carrier-side vendors and Verisk's own XactAI.
- Whether IAs mostly use carrier-provided Xactimate licenses or buy their own, and the share of each: not verified.
- Reddit r/InsuranceAdjusters anecdotes on time per estimate or report and on file rejections: not retrieved (search budget exhausted).

---

## Q2. Residential real estate appraisers (US): the UAD 3.6 / redesigned URAR transition

### Takeaway
This is the most time-boxed opportunity in this study. UAD 3.6 became mandatory for new GSE appraisal submissions on **November 2, 2026**, the day before this research date. An Oklahoma regulator's alert says the GSEs allowed legacy submissions until May 19, 2027 because of "widespread industry readiness concerns". Only about 6% of legacy UAD field data carries over, the form relies on pick-lists, and software-generated sketches and floor plans are required. Every appraiser has to relearn the report at once. Appraisers are largely independent, buy their own form software and per-scan floor-plan tools, and earn a fixed fee per report, so time per report is income. The form-software layer is already crowded with GSE-verified AI entrants. The floor-plan/GLA layer (ANSI Z765, per-level) is where phone 3D capture fits.

### Cited Findings
**Population**
- [Fact, BLS OOH, 2025 data] Property appraisers and assessors: **68,400 jobs**, of which **15% self-employed**. Local government (assessors) 41%, real estate 21%, finance and insurance 9%. Median pay is $67,960, and the pay data exclude the self-employed. Growth is projected at 3% from 2025 to 2035, with about 5,200 openings a year. BLS expects productivity gains from mobile technology and AVMs. — [BLS OOH: Appraisers and assessors of real estate](https://www.bls.gov/ooh/business-and-financial/appraisers-and-assessors-of-real-estate.htm)
- [Aggregator/unverified] Appraisal Subcommittee (ASC) National Registry credentials fell from 121,407 in 2007 to 89,618 at the end of 2025. Another figure gives 91,036 at the end of 2024 and 87,439 on October 8, 2026. These count credentials, not people. A forum post counts about **65,900 individuals**, down about 1,200 during 2025. The Appraisal Institute's 2023 fact sheet estimated about 70,000 appraisers, 8,000 fewer than its previous survey. — [AppraisersForum ASC numbers thread](https://appraisersforum.com/forums/threads/asc-numbers.242927/post-3628886); [AppraisersForum post](https://appraisersforum.com/forums/posts/3628932/); [Valuation Review](https://www.valuationreview.com/vr/articlesvr/certified-appraisers-at-alltime-high-opportunities-57700.aspx)
- [Anecdote, article updated 2026-08-16] An appraiser-blog author estimates "approximately 75,000 to 80,000 INDIVIDUAL appraisers" (undated estimate). He notes that Certified credentials have risen while Licensed credentials fell, which he attributes partly to FHA no longer using Licensed appraisers. — [AppraisersBlogs credential trend](https://appraisersblogs.com/appraiser-count-n-credentials-trend)

**Form change, timeline and workload**
- [Fact, GSE] UAD 3.6 is mandatory for all new appraisal reports submitted to UCDP on or after **November 2, 2026**. Revisions of UAD 2.6 reports are allowed until the legacy retirement date, **May 3, 2027**. Broad production began **January 26, 2026**. — [Freddie Mac UAD & Forms Redesign FAQ](https://sf.freddiemac.com//faqs/uad-and-forms-redesign); [Freddie Mac January 2026 announcement (PDF)](https://sf.freddiemac.com/docs/pdf/announcement_uad_january-2026.pdf); [a la mode: What we know about UAD 3.6](https://blogs.alamode.com/what-we-know-about-uad-3.6)
- [Fact, state regulator alert, created 2026-10-14] Oklahoma's OREC/OREAB says Fannie Mae and Freddie Mac announced a **temporary policy exception on September 30, 2026**, citing "widespread industry readiness concerns". Approved lenders may keep submitting new legacy (UAD 2.6) reports until **May 19, 2027**, with a final resubmission cutoff of **June 27, 2027**. FHA, USDA and VA will adopt the URAR but have announced no timeline. I could not confirm the exception on a GSE page. — [OREC industry alert (PDF)](https://www.oklahoma.gov/content/dam/ok/en/orec/documents/resources/OREC_OREAB-20261014-Industry%20Alert_Mortgage%20Appraisal%20Reports_V1.pdf)
- [Fact via search synthesis; Fannie Mae page returned 403] Fannie Mae's April 2025 appraiser update: a footprint sketch must be software-generated, not hand-drawn, and must include exterior wall dimensions, all levels and square-footage calculations. A floor plan (exterior footprint plus interior layout, software-generated) is required for property data collections, hybrid appraisals and desktop appraisals, and for traditional appraisals when the layout is atypical or functionally obsolete. — [Fannie Mae Appraiser Update April 2025](https://singlefamily.fanniemae.com/originating-underwriting/appraisers/appraiser-update-april-2025)
- [Press/vendor blog, 2026-07-10] UAD 3.6 "relies heavily on predefined pick-lists instead of free-form text", and **only about 6% of legacy UAD field data carries over**, according to a la mode's FAQ. TOTAL users should "plan for a genuine learning curve rather than a simple update". TOTAL Sketch needed manual square-footage input while it was being reconfigured for UAD 3.6. — [Class Valuation blog](https://www.classvaluation.com/blog/uad-3-6-appraisal-software/)
- [Anecdote] One appraiser on AppraisersForum predicted UAD 3.6 would add "20% to 60% more time" per report. That is an expectation, not a measurement. — [AppraisersForum post](https://appraisersforum.com/forums/goto/post?id=3549868); [thread "Nobody is ready yet"](https://appraisersforum.com/forums/threads/nobody-is-ready-yet-for-the-uad-crap.242087/latest)
- [Vendor claim, unverified] SketchGLA's marketing says per-level ANSI finished area becomes mandatory on Nov 2, 2026. Not confirmed in GSE documents. — [Nexasphere SketchGLA](https://nexasphere.io/products/iphone/sketchgla)

**Money link**
- [Press/consumer cost guides] The consumer-paid conventional single-family appraisal averages about $358 nationally (range $314–423) per HomeAdvisor/Angi. The Appraisal Foundation compared a typical fee of about $400 in 2011 with about $425 in 2025. — [HomeAdvisor](https://www.homeadvisor.com/cost/inspectors-and-appraisers/home-appraisal-cost); [National Mortgage Professional](https://nationalmortgageprofessional.com/news/appraisal-fees-under-fire)
- [Press/anecdote] AMCs often keep a cut "roughly matching or exceeding" the appraiser's pay (Business Insider). One forum post quotes an AMC targeting $100–125 retained per appraisal. — [Business Insider](https://www.businessinsider.nl/the-hidden-middlemen-who-cost-homebuyers-12-billion-and-counting/); [AppraisersForum post](https://appraisersforum.com/forums/goto/post?id=3455972)

**Tools, prices and AI entrants**
- [Press/vendor blog, 2026-07-10] UAD 3.6 readiness by vendor. ACI Sky Workbench: GSE-verified in June 2026. **Aivre**: first GSE-verified UAD 3.6 vendor, free through December 31, with Core/Vision/Ultra tiers (Vision auto-labels photos, recommends condition and quality ratings and drafts commentary; Ultra adds MLS and public-record autofill). SFREP Appraise-It Pro: public beta, free six-month trial. Bradford NightHawk: beta, free through 2026 for ClickFORMS members. a la mode TOTAL 3.6 Launch Edition: no extra charge. — [Class Valuation blog](https://www.classvaluation.com/blog/uad-3-6-appraisal-software/)
- [Vendor claim, 2025-10-29] Aivre says it was the first in the US to complete UAD 3.6 verification with Fannie Mae and Freddie Mac. — [BusinessWire](https://www.businesswire.com/news/home/20251029713997/en/Aivre-Launches-Industrys-First-AI-Powered-Platform-Verified-to-Support-New-Uniform-Appraisal-Dataset-3.6-Standards)
- [Aggregator/unverified] apprAIz (valurAIz) says it is GSE-approved for UAD 3.6, "among first five vendors", and can cut report completion time by "up to 70 percent". With Restb.ai it says it can populate "up to 90%" of a UAD 3.6 report, while "the appraiser retains responsibility". ValueMate calls itself "the first AI-driven approach to producing a UAD 3.6 report". — [citybiz](https://www.citybiz.co/?p=887765); [Restb.ai blog](https://blog.restb.ai/from-photos-to-a-nearly-complete-appraisal-how-ai-is-transforming-uad-3.6-workflows)
- [Vendor claim, 2026-07-28] Restb.ai says AI can populate "much of the property information" for UAD 3.6 and "the final ratings always remain the appraiser's responsibility". The appraiser must inspect, verify AI-generated data, reconcile comps and apply judgment. — [Restb.ai blog](https://blog.restb.ai/from-photos-to-a-nearly-complete-appraisal-how-ai-is-transforming-uad-3.6-workflows)
- [Press, 2026-05-14] **Clear Capital**, which bought **CubiCasa** in 2021, is acquiring Restb.ai (computer vision). Clear Capital took a GTCR strategic investment in 2025. ProxyPics is the first verified provider of the GSEs' Uniform Property Data Report (UPDR) and uses AI and CV to fill UPDR fields from images. Veros and Class Valuation added AI review tools. — [National Mortgage News](https://www.nationalmortgagenews.com/news/ai-disruption-uad-3-6-rules-bring-upgrades-to-appraisal-tech)
- [Aggregator] CubiCasa: free phone scans, with paid upgrades including ANSI-aligned GLA outputs. Software Advice lists the GLA report at $15 in the US. Pricing is per scan, not monthly. The Doorify MLS page says CubiCasa is ANSI Z765-compliant and that the GLA report accounts for ceiling heights and wall thickness. — [Software Advice CubiCasa](https://www.softwareadvice.com/3d-architecture/cubicasa-profile); [AccessNewswire on free product](https://www.accessnewswire.com/newsroom/en/banking-and-financial-services/cubicasa-announces-new-free-product-designed-to-make-floor-plans-stan-710724); [Doorify MLS support](https://support.doorifymls.com/hc/en-us/articles/46650456355603-CubiCasa)
- [Vendor claim, dated 2013-12-05] a la mode set TOTAL at "$349" per year "guaranteed for 10 years". This shows the historical consumer-level price point of form software. Current 2026 prices were not found. — [a la mode blog](https://blogs.alamode.com/new-349-pricing-10-year-guarantee)

### Inferences
- **Scores:**
  - **C1 Assist: High.** USPAP and GSE rules make the appraiser responsible, and vendors themselves say the AI only pre-fills.
  - **C2 Money: Medium–High.** A fixed fee per report (about $350–425 consumer price, minus the AMC cut) means time saved per report is income. Fewer revision requests ("stips") also speed payment.
  - **C3 Non-fluency: High now, decaying.** The form change hits all ~65–80k individuals at once, and 6% field carryover means real relearning. FHA/VA adoption will be a second wave (no timeline). Fluency will build within roughly 6–12 months, and the population is shrinking, so there are few new entrants.
  - **C4 Consumer buyer: Medium–High.** Independent fee appraisers buy their own form software and per-scan sketch/GLA products ($15 class). AI form vendors are pricing at zero through 2026 to grab share.
- **Where a small team could fit:** not as a new form vendor, since GSE verification is a barrier and five or more vendors are already verified or in beta. It could fit as an **upstream assistant that exports into TOTAL/ACI/Aivre**:
  - phone LiDAR or photo scan to a software-generated, per-level ANSI Z765 footprint sketch or floor plan with GLA calculations;
  - photo-to-UAD-pick-list suggestions (condition, quality, features) with citations to the photo;
  - a "UAD 3.6 field checker" that flags likely revision requests before UCDP submission.
- **Competitive warning:** Clear Capital now owns both CubiCasa (floor plans) and Restb.ai (CV), so the floor-plan-plus-CV layer has a well-funded consolidator.
- **3D link: High.** GLA measurement and floor plans are core, required, and ANSI-specified.
- **Data and regulatory obstacles:** Low–moderate. Appraisers own their workfiles under USPAP. Borrower PII is present but lower risk than medical data. Any tool that produces the final XML must be GSE-verified, which upstream tools avoid.

### Gaps
- Whether UAD 3.6 strictly requires per-level ANSI GLA in every traditional appraisal: not confirmed in a GSE primary document (fetch blocked).
- Measured (not predicted) time per report under UAD 3.6, and revision-request rates after go-live: none yet.
- Current 2026 prices of a la mode TOTAL, ACI, Bradford and Aivre after the free period; CubiCasa user counts and appraiser share.
- Effect of GSE appraisal waivers and value acceptance on appraisal volume: not researched.

---

## Q3. Home inspectors (US)

### Takeaway
Home inspection is the clearest example of bottom-up, self-serve buying of professional software. Spectora claims 12,000+ inspectors at $109/month per inspector. Inspections are paid per job ($300–450), and the report is the product. But the AI report-writing layer is already crowded. Spectora has built-in AI comment matching and drafting, Hive Inspect sells "AI report writing" at $99/month, and Binsr raised a pre-seed round in November 2025. Experienced inspectors also become fluent with comment libraries. The fit with the founder's 3D skills is weak.

### Cited Findings
- [Fact, BLS OOH via search synthesis, 2024 data] BLS does not track home inspectors separately. Construction and building inspectors held about **147,600 jobs (2024)**, of which **5% self-employed**. Local government is 36% and engineering services 19%. A 2012 BLS article put self-employment at about 11% and said "many home inspectors are self-employed". — [BLS OOH: Construction and building inspectors](https://www.bls.gov/ooh/construction-and-extraction/construction-and-building-inspectors.htm); [BLS Career Outlook 2012 (PDF)](https://www.bls.gov/careeroutlook/2012/winter/art03.pdf)
- [Vendor claim] Spectora costs **$109/month or $1,090/year** (about $91/month), plus $99/month per additional inspector. Support and admin staff are free. Spectora claims "12,000+ working inspectors" on its comparison page and "over 10,000 inspectors" on its pricing page. AI features: **Match** (links spoken findings to pre-approved template comments), **AI Comment Assist** (drafts comments when no match exists), an AI Scheduling Agent (early access) and an MCP "AI Connector" (early access). — [Spectora vs Hive Inspect comparison](https://www.spectora.com/spectora-and-hive-inspect-comparison); [Spectora pricing](https://spectora.com/pricing) (pricing page 404 on direct fetch; figure via search); [Capterra UK Spectora](https://www.capterra.co.uk/reviews/157144/spectora)
- [Vendor claim, by a competitor] Hive Inspect costs $99/month per inspector. Features: AI report writing from voice notes, voice-to-report, photo analysis and repair cost estimates. Its inspector count is stated inconsistently ("1,000+" or "less than 2,500"). — [Spectora vs Hive Inspect comparison](https://www.spectora.com/spectora-and-hive-inspect-comparison)
- [Press, November 2025] **Binsr Inspect** (Phoenix, founded 2023) raised a **$1.1M pre-seed** led by New Stack Ventures and Silence VC, with Lofty and its founder Joe Chen. The product is an AI inspection platform (AI voice, AI video, automated pricing estimates) covering booking, reporting and payment. — [The SaaS News](https://www.thesaasnews.com/news/binsr-inspect-raises-1-1m-in-funding); [InBusiness Phoenix](https://inbusinessphx.com/?p=188777)
- [Aggregator/unverified] Other entrants: InspectionX (turns on-site photos and voice notes into reports in real time), Repair Pricer (turns inspection reports into repair estimates), and InspectionGo ($5.5M raised; date not verified). — [Latitud on InspectionX](https://reveal.latitud.com/companies/inspectionx); [Pulse 2.0 on InspectionGo](https://pulse2.com/inspectiongo-5-5-million-funding/amp/); [AZ Big Media](https://azbigmedia.com/business/technology/ai-technology-eases-home-inspectors-process/)
- [Vendor claim/aggregator] City averages for a home inspection range from $300 (Miami) to $450 (New York), per a 2026 Spectora pricing guide. — [Spectora pricing guide](https://www.spectora.com/r/how-to-price-your-home-inspection-business-without-guessing); [InterNACHI fee guidance](https://www.nachi.org/home-inspector-business-pricing-billing.htm)

### Inferences
- **Scores:**
  - **C1 Assist: High.** The inspector is licensed or liable and signs the report.
  - **C2 Money: Medium.** Faster reports allow a second inspection per day, and realtor referrals reward speed and clarity. But the fee is fixed and the market is cyclical with home sales.
  - **C3 Non-fluency: Medium.** Narrative writing is tedious and there are many new entrants (not quantified here). Comment libraries make veterans fluent.
  - **C4 Consumer buyer: High.** This market proved that a $100/month self-serve tool works.
- **Competitive reality:** The incumbent (Spectora) ships AI inside the tool inspectors already pay for, and at least three funded or listed AI-native entrants exist. A new entrant would need a sharp niche, such as ancillary inspections (radon, mold, sewer scope, 4-point/wind-mitigation insurance forms in Florida) or a Korean analogue.
- **3D link: Low–Medium.** Measurements are not a core deliverable. Roof-condition capture and moisture or thermal mapping are adjacent.
- **Obstacles:** Low. Client data is modest and state standards of practice are public.

### Gaps
- No reliable headcount of US home inspectors. InterNACHI and ASHI membership pages blocked fetching, and searches ran out.
- Turnover and new-entrant rates in home inspection: not found.
- Spectora's ownership and funding history: not verified this session.

---

## Q4. Tradespeople and small contractors: roof/exterior measurement, quotes and compliance certificates (US, UK)

### Takeaway
This is the most proven bottom-up category: pay-per-use measurement reports (Roofr at $19 per report with no subscription, Hover from $29 per roof) and job-management software (Jobber, 400k+ service pros). The money link is direct, since faster and more accurate quotes win bids. But the measurement layer is saturated and contractors measure often enough to become fluent, which fails criterion 3. UK electrical certificates (EICR) fit criteria 1, 2 and 4 well. They are a legally required, signed document, landlords must renew them every 5 years, and the rules expanded to social housing in 2025. But apps at about £12–18/month already exist, and at least one (Tradecert) already has AI extraction from photos of the consumer unit.

### Cited Findings
**Roofing and exterior measurement (US)**
- [Vendor claim] **Hover**: Starter has no subscription, with the first 3 projects free and no credit card. Pro is $999/year ("pays for itself at ~4 projects a month"); Business is $2,999/year. Per project on Starter: roof $29/$49/$69 (simple/average/complex), full exterior 3D model $59/$99/$139, interior $29–89, blueprint exterior $99–299. Users are unlimited, and ESX/PDF export is included on Starter. — [Hover pricing](https://hover.to/pricing)
- [Vendor claim via search synthesis] Hover says it delivers 285 measurements per property on average, within 2–5% accuracy. Trussi (roof estimating) bills Hover reports to the contractor's own Hover account with no markup. — [Hover for roofing contractors](https://hover.to/for/roofing-contractors); [MarketScale on Trussi](https://www.marketscale.com/industries/engineering-and-construction/hover-3d-roof-measurements-now-flow-straight-into-trussi-roofing-estimates)
- [Vendor claim] **Roofr**: Starter is $0/month with pay-as-you-go measurement reports at **$19** (24-hour delivery). Measure+ is $109/month (6-hour) or $169/month (2-hour) at $13 per report. Essentials is $249/month and Scale $349/month, both at $13 per report with 2-hour delivery. Seats are unlimited, there are "no bulk packages", and the site says "thousands of roofers". Add-ons include an AI Receptionist ($99/month, beta) and AI-built websites. — [Roofr pricing](https://roofr.com/pricing); [Capterra Roofr pricing](https://www.capterra.com/p/208102/Roofr/pricing/)
- [Aggregator/unverified] One blog says that if you trace the roof yourself in Roofr's tool, the report is free on paid plans, or $2–3.50 with premium imagery. — [contractortoolstack](https://contractortoolstack.com/software/roofr/pricing/)

**Job management (validation)**
- [Vendor claim] **Jobber** (founded 2011): "400k+" service pros served, "$100B+ invoiced", 60+ countries, 50+ industries, 1,000+ employees. Customers range from solo operators to firms with hundreds of employees. — [Jobber About](https://www.getjobber.com/about/)

**UK electrical certificates (EICR)**
- [Fact, statute] The Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020 (SI 2020/312) require private landlords to have installations inspected and tested **at least every 5 years** by a qualified person. Landlords must give the report to tenants within 28 days and complete remedial work within 28 days. The rules applied to new tenancies from 1 July 2020 and existing tenancies from 1 April 2021. Maximum penalty: **£30,000**. — [legislation.gov.uk SI 2020/312](https://www.legislation.gov.uk/uksi/2020/312/contents/made)
- [Fact, gov.uk] The regulations were extended in 2025 to the social rented sector by the Electrical Safety Standards in the Private Rented Sector (England) (Amendment) (Extension to the Social Rented Sector) Regulations 2025. — [GOV.UK guide for landlords](https://www.gov.uk/government/publications/electrical-safety-standards-in-the-private-rented-sector-guidance-for-landlords-tenants-and-local-authorities/guide-for-landlords-electrical-safety-standards-in-the-private-rented-sector)
- [Vendor claim] **Tradecert**: "Only £18 month", no contract, +£7 per additional user, unlimited certificates. Covers EICR, EIC, Minor Works, EV, solar PV, emergency lighting, fire and PAT. AI features: **extracts circuit and board data from a photo of the consumer unit**, reads photos or PDFs of existing certificates, turns typed notes into certificate fields, generates observation wording referenced to BS 7671, and runs a "Validate" step for missed fields and impossible values. The site calls it the "No.1 downloaded app by UK electricians". The free tier watermarks PDFs. — [Tradecert](https://www.tradecert.app)
- [Aggregator] Other certificate apps (price units not always clear): RhinoCert (14.99 GBP listing; free editing, subscription needed to issue), SparkCerts ("12"), Certly (14.99), iCertifi (12.9), Elec-Mate. — [GetApp RhinoCert](https://www.getapp.co.uk/software/2111763/rhinocert); [GetApp SparkCerts](https://www.getapp.co.uk/software/2100741/sparkcerts); [Capterra Certly](https://www.capterra.co.uk/software/1238206/Certly-Ltd); [iCertifi listing](https://mwm.ai/apps/icertifi/490104124); [Elec-Mate listing](https://mwm.ai/apps/elec-mate/6758948665)

### Inferences
- **Scores, roofing/exterior measurement and quotes:** C1 High. C2 **High** (a faster quote wins the bid). C3 **Low** (contractors measure every day; fluency builds). C4 **High** ($0 plans plus $19–29 per job). **Saturated:** Hover (phone photogrammetry), EagleView and Roofr (aerial) dominate, and Jobber, JobNimbus and others own quoting.
- **Scores, UK EICR and certificates:** C1 High (the electrician signs, and scheme assessors audit). C2 Medium–High (landlord EICR volume is mandated; faster certificates mean more jobs per day and fewer scheme-audit failures). C3 Medium (the work is tedious but frequent; BS 7671 amendments reset some knowledge). C4 High (£12–18/month). **Crowded, with AI already shipped.**
- **3D link:** High for roofing and exterior (Hover is literally phone photogrammetry), but that is the most crowded slot. Low for certificates.
- **Obstacles:** Low. Certificates contain only landlord and tenant addresses.

### Gaps
- UK counts of electricians, NICEIC/NAPIT-registered contractors and Gas Safe engineers, and EICR prices to landlords: not retrieved (Gas Safe Register returned 403, and searches ran out).
- Gas safety (CP12) certificate apps and prices, and BS 7671 Amendment 3 or later changes: not researched.
- US permit-document workflows for small contractors: not researched.
- Hover and EagleView funding or user counts for 2024–2026: not verified.

---

## Q5. Freelance and contract quality inspectors, FAI and quality consultants (aerospace/automotive)

### Takeaway
The task fits criteria 1 and 3 well: every customer's drawings and specs differ, and ballooning plus AS9102 forms are tedious. Self-serve prices already exist (BalloonPlot at about ₹3,000/month, or US$35). But the consumer-buyer model breaks on data control. A contractor uploading a customer's ITAR- or CUI-controlled drawings to a personal cloud tool is a compliance problem. Competitors sell GovCloud or local-first processing to answer it. The freelancer population could not be measured.

### Cited Findings
- [Vendor claim; reported in sibling note aerospace-fai-automation/fai-software-competitors-gaps.md] BalloonPlot: Standard **₹3,000/month**, Professional ₹30,000/year, Enterprise custom. It claims "Trusted by 1,200+ quality professionals globally", a "Local-First" design with offline desktop mode, AI auto-ballooning, GD&T recognition and AS9102 Excel/PDF export. Testimonial: "What used to take 3-4 hours now takes us 15 minutes." — [BalloonPlot](https://balloonplot.com/)
- [Vendor claim, from the same sibling note] ITAR and CUI handling is a gating requirement. GroundControl advertises ITAR registration and FedRAMP Moderate Equivalency in AWS GovCloud, 1factory advertises AWS GovCloud with a FedRAMP and CMMC environment, and InspectionXpert advertises ITAR registration. — [GroundControl](https://gndctl.com/solutions/first-article-inspection-software/); [1factory](https://www.1factory.com/); [InspectionXpert](https://www.inspectionxpert.com/); [GroundControl comparison 2026](https://gndctl.com/resources/top-4-itar-compliant-as9102-first-article-inspection-fai-software-2026/)
- [Vendor estimate, cited in sibling note aerospace-small-shops-fai-practice.md] A manual FAI takes about 4–6.5 hours per report, with "paperwork" at 70–80% of the effort. Scenarios run 10–30 reports a month. — [MetricMech: Real cost of manual FAI](https://metricmech.com/articles/cost-of-manual-fai-inspection)

### Inferences
- **Scores:**
  - **C1 Assist: High.**
  - **C2 Money: Medium.** Contractors are paid per report, per day or per hour. Faster packages mean more parts or customers per week, and fewer rejected FAIRs avoid unpaid rework.
  - **C3 Non-fluency: High.** Customers, drawing standards and spec flow-downs change with every engagement.
  - **C4 Consumer buyer: Low–Medium.** The price point exists (about $35/month), but data-control rules push buying back to the manufacturer or prime. For ITAR/CUI work, contractors often must work inside the customer's systems.
- **Obstacles: High.** ITAR, EAR, CUI and DFARS 7012 clauses, plus customer NDAs. A credible personal-card product would need on-device processing (local VLM) or a US-hosted, no-retention option. That raises cost for a small Korean team, and a Korea-hosted service may itself be a deemed-export concern for ITAR data (not legally verified).
- **3D link: Medium.** Scan-based inspection reports are Geomagic Control X territory, but phone capture is far too inaccurate for engineering tolerances, so the 3D asset helps only desktop or metrology workflows.

### Gaps
- No headcount of freelance or 1099 quality inspectors or FAI consultants (US, EU or Korea) and no reliable day rates. The search for contract source-inspector rates failed when the budget ran out.
- Whether primes allow contractors to use self-purchased tools on ITAR/CUI data, and under which conditions: not verified.

---

## Q6. Small marketplace sellers: compliance documents that gate listings (CPSC CPC/eFiling, EU GPSR, Korea KC)

### Takeaway
This fits criteria 2 and 3 strongly. A missing or bad compliance document suppresses a listing or stops an import, which is a direct revenue gate. Sellers face the task only when they launch a new product category or when rules change, and rules changed in quick succession: EU GPSR applied from 13 December 2024, CPSC certificate eFiling became mandatory for most imports on 8 July 2026, and Korea fought over KC rules for direct purchases from abroad in May 2024. The AI's role must stay assistive. It can map rules, draft certificates, technical files and labels, and check listing fields. It cannot replace lab testing, and AI-fabricated certificates would be fraud. Paid help exists today mostly as services: EU responsible-person providers, Fiverr GPSR document gigs, and Kmong KC certification consultants.

### Cited Findings
**US: CPSC certificates and eFiling**
- [Fact, Federal Register] The CPSC final rule "Certificates of Compliance" (published 2025-01-08, doc 2024-30826, 90 FR 1800) revises the certificate rule and **adds electronic filing (eFiling) of certificates with CBP for imports**. A 2025-09-24 correction (doc 2025-18521) replaced the two "effective dates" with one effective date and two applicability dates. A July 2025 notice says the requirement to eFile most certificates "does not begin until **July 8, 2026**". Before that, CPSC expanded the eFiling pilot by up to 2,000 importers (2024). — [FR 2024-30826](https://www.federalregister.gov/documents/2025/01/08/2024-30826/certificates-of-compliance); [FR 2025-18521 correction](https://www.federalregister.gov/documents/2025/09/24/2025-18521/certificates-of-compliance-correction); [FR 2025-12979 notice](https://www.federalregister.gov/documents/2025/07/11/2025-12979/agency-information-collection-activities-proposed-collection-comment-request-third-party-testing-of); [FR 2024-20367 pilot expansion](https://www.federalregister.gov/documents/2024/09/10/2024-20367/electronic-filing-of-certificate-of-compliance-data-announcement-of-expansion-of-partner-government)
- [Fact] CPSC's eFiling hub offers a Product Registry account and role-based guidance (importers, brokers, software developers, "Does eFiling apply to me?"). — [CPSC eFiling](https://www.cpsc.gov/eFiling)

**EU: GPSR**
- [Vendor blogs, consistent with Regulation (EU) 2023/988; EUR-Lex text did not load] GPSR has applied since **13 December 2024**. Amazon EU has required GPSR data (an EU-established responsible person's name and address, product identifiers, safety information) for all listings since then. Its automated checks flag ASINs that lack a valid EU responsible person, and it has sent enforcement notifications. Amazon itself does not act as responsible person. — [Carbon6](https://www.carbon6.io/blog/gpsr-what-eu-sellers-need-to-know-and-implement); [ComplianceGate](https://www.compliancegate.com/?p=23907); [ZonWizard](https://www.zonwizard.com/blog/product-safety-what-is-gpsr-and-how-will-it-affect-amazons-sales); [Regulation (EU) 2023/988 on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/988/oj/eng)
- [Anecdote, Amazon Seller Forum] A UK seller says "the only option for UK sellers into the EU and EU sellers into the EU on Amazon is to just close all their EU sites". — [Amazon Seller Central EU forum "GPSR Exit from EU Selling"](https://sellercentral-europe.amazon.com/seller-forums/discussions/t/ef772626-6707-481f-8ab4-7863a338affe)
- [Vendor listing] Fiverr sellers offer "EU GPSR technical documentation and compliance safety report" gigs, which shows paid demand for document preparation. — [Fiverr gig](https://fiverr.com/corlooijengaa/prepare-eu-gpsr-technical-documentation-and-compliance-safety-report)

**Korea: KC certification**
- [Press, 2024-05-17 and 2024-05-19] Korea announced a ban on overseas direct purchases of 80 product types (including children's products) without KC certification, then **scrapped the ban two days later** after backlash. — [KED Global, ban](https://amp.kedglobal.com/newsAmp/ked202405170006); [KED Global, retraction](https://amp.kedglobal.com/newsAmp/ked202405190002); [Metro Seoul](https://www.metroseoul.co.kr/article/20240516500009)
- [Press/vendor blogs] Children's products fall into three tiers: 안전인증 (safety certification), 안전확인 (safety confirmation) and 공급자적합성확인 (supplier's declaration of conformity). Mis-judging which tier applies can mean "무인증 판매" (selling uncertified goods). One consultancy says fines of up to ₩10M (과태료) apply. A 구매대행 (purchasing-agent) industry source says KC certification for children's products costs "수십에서 수백만원" (tens of thousands to millions of won). A consultancy blog says sellers often learn certification is required only when Smart Store rejects a listing. — [Byline Network 2021](https://byline.network/2021/09/9-100/); [Element Korea](https://elementkorea.kr/?p=5852); [Element Korea](https://elementkorea.kr/magazine-kc%EC%95%88%EC%A0%84%EC%9D%B8%EC%A6%9D/); [SellerNow post](https://sellernow.co.kr/post/502073)
- [Vendor listings] Kmong sells KC certification consulting gigs. — [Kmong gig 749785](https://kmong.com/gig/749785); [Kmong gig 230446](https://kmong.com/gig/230446)

### Inferences
- **Scores:**
  - **C1 Assist: Medium–High.** The seller (or importer of record) certifies, and lab reports are the evidence. AI drafts and checks but cannot test.
  - **C2 Money: High.** A listing or import is blocked until documents exist.
  - **C3 Non-fluency: High.** Sellers face it once per product category, and rules keep changing (GPSR in 2024, CPSC eFiling in 2026, KC disputes).
  - **C4 Consumer buyer: High.** Small sellers pay out of pocket, and paid gigs show willingness to pay.
- **Product shape:** "Compliance pack builder" per product. Input: product photos, materials, age grade, supplier documents and lab reports. Output: an applicable-rules checklist (CPSC/CPSIA, GPSR, KC tier), a draft CPC/GCC, a GPSR risk assessment and technical-file skeleton, marketplace field values and label or warning text. All of it is editable, with gaps flagged ("needs a test report from a CPSC-accepted lab").
- **Korea angle:** strong. Korean sellers export to the US and EU through Amazon/Etsy and sell domestically on Smart Store and Coupang, and Korean SMEs are a reachable channel.
- **3D link: Low.** At most, product dimensions and photo capture for listings.
- **Obstacles:** Liability. The product must never imply that a certificate exists without tests, so clear disclaimers and "evidence required" gating are needed. Marketplace policies change often and need ongoing rule maintenance, which is the domain-logic moat but also an operating cost.

### Gaps
- Number of active sellers: Naver Smart Store, Coupang marketplace, Amazon EU/US and Etsy (by country). Not retrieved; searches ran out.
- Self-serve AI tools for GPSR, CPC or KC documentation and their prices or funding: not found this session.
- Exact CPSC applicability dates by product (manufactured vs imported, FTZ) from the final rule text: not extracted.
- Current KC enforcement on overseas sellers and 구매대행 after the 2024 retraction: not verified.

---

## Q7. Korea-specific prosumers: 1인 창업자/소상공인 support programs, freelancer tax (삼쩜삼), 공인중개사

### Takeaway
Korea has about 4.2M self-employed people with no employees (2024). 삼쩜삼 shows that a consumer-priced service tied to the user's money can scale to more than 20M sign-ups. But it is an automation and replacement play, with regulatory friction (the tax-accountant lobby, a privacy fine, a free government service from March 2025), and it is already taken. Government support and policy-fund applications for 1인 창업자/소상공인 fit criteria 1 and 3 best. Formats change every program cycle, and owners must defend the plan themselves. Willingness to pay is low except on success fees. 공인중개사 (licensed real estate brokers) are many (about 109k operating) and individually paying, but the market is shrinking and their paperwork is a liability task, not a revenue lever.

### Cited Findings
**Self-employed base**
- [Press, 2025-02-05] Self-employed people with no employees (고용원 없는 자영업자) numbered **4,225,000 in 2024**, down 44,000, the first decline since 2018. — [Daum/press](https://v.daum.net/v/20250205113341979)
- [Aggregator/unverified] Self-employed people with no employees fell 117,000 year on year in October 2025, per the Economically Active Population Survey. — [Korea Business Review](https://www.koreabizreview.com/articles/kbr-legacy-7271)

**삼쩜삼 (Jobis & Villains) as validation**
- [Fact, Wikipedia] 자비스앤빌런즈 was founded on 2015-08-12 by 김범섭 and trades on K-OTC (452580). The Korea Federation of Tax Accountants (한국세무사회) filed a complaint in 2023 alleging unlicensed tax-agency work, which ended in a decision not to prosecute (불기소). The Personal Information Protection Commission fined the company ₩854.1M (surcharge) plus ₩12M for unlawfully collecting resident registration numbers (reported June 2023). A January 2026 Maeil Business article (cited title) says it is pursuing ₩150bn in new investment. — [Korean Wikipedia: 자비스앤빌런즈](https://ko.wikipedia.org/wiki/자비스앤빌런즈)
- [Press, 2025-04-10] Cumulative sign-ups passed **23M**. Cumulative refund claims total **₩1.67tn** across **12.19M** refund filings (as of March). — [Money Today/Unicorn Factory](https://www.mt.co.kr/future/2025/04/10/2025041014263463666); [Byline Network](https://byline.network/2025/04/10-460/)
- [Press, 2025-02-16] Revenue: ₩3.5bn (2020, launch year), ₩31.1bn (2021), ₩49.6bn (2022), ₩50.7bn (2023), **₩77.7bn in 1H 2024** alone. Sign-ups: 10M (April 2022), 16M (May 2023), 21M (May 2024). The headline cites a 20% fee on refunds. The National Tax Service was checking improper or excessive refund claims filed through tax platforms (over 650,000 correction claims in 1H 2024) and planned a free refund service on Hometax from March 2025. An earlier special-track IPO failed preliminary review over doubts about business continuity. — [Hankyung](https://www.hankyung.com/article/2025021686011)
- [Press headline, 2023-08] 1H 2023 revenue was ₩39bn, with a 10% operating margin. — [Hankyung Magazine](https://magazine.hankyung.com/business/article/202308100404b)
- [Vendor blog, 2023-10-13] More than **2M sole proprietors (개인사업자)** had joined 삼쩜삼, and a "쎄오 멤버십" (CEO membership) for them launched in July 2023 with free VAT filing. Over 60% of those customers had annual revenue of ₩40M or less. — [3o3 blog](https://blog.3o3.co.kr/231013-news/)
- [Wiki/anecdote] Re-filing through 삼쩜삼 after self-filing charges the fee on the whole refund. Example: on a ₩2.05M refund, the fee is "close to ₩200k". — [Namu Wiki: 삼쩜삼](https://namu.wiki/w/삼쩜삼)

**Government support and policy funds (from sibling note Q5)**
- [Anecdote/consultancy] Proposal agencies charge fixed fees, success fees (a percentage of the grant) or both. Post-selection duties (reports, settlement or 정산) carry clawback and exclusion risk. CEOs must present and defend plans, so a ghostwritten plan is risky. Kmong lists many paid business-plan gigs for government programs. — [Alchera blog](https://www.alchera.ai/resource/blog/ac-ai-government-project-proposal-writing-support-company); [EO Planet 42257](https://eopla.net/magazines/42257); [Kmong gig 781735](https://kmong.com/gig/781735); [NextUnicorn insight](https://www.nextunicorn.kr/insight/06c7f8c116d82283)

**공인중개사 (licensed real estate brokers)**
- [Press, 2026-01-21, citing 한국공인중개사협회] In 2025 there were **9,150 new openings** (the lowest since 1998), **11,297 closures** and 1,198 suspensions. **109,320 brokers were operating** in December 2025, down 2,474 since January and below 110k for the first time in about five years. Closures and suspensions have exceeded openings every month since February 2023. The association blames falling openings and lower profitability under stricter regulation. — [YTN](https://www.ytn.co.kr/_ln/0102_202601211615125456)
- [Press, 2025] Monthly new openings fell below 700 for the first time (699 in June 2025) and to 577 in November 2025, the lowest since monthly counts began in 2015. More than **550,000** people hold the license, so roughly one in five operates an office (attribution across the result set uncertain). In 2024, 14,721 offices closed or suspended against 10,308 openings. — [Segye 2025-07-24](https://www.segye.com/newsView/20250724504561); [Segye 2025-12-22](https://www.segye.com/newsView/20251222512516); [BizWatch 2025-02-28](https://news.bizwatch.co.kr/article/real_estate/2025/02/28/0027); [SBS Biz](https://biz.sbs.co.kr/amp/article/20000248832)

### Inferences
- **Scores, 1인 창업자/소상공인 support applications and settlement:** C1 High (the owner must pitch and defend the plan). C2 Medium–High (non-dilutive cash; settlement errors lead to clawback). C3 **High** (every program has its own forms, cycles run yearly, and first-time applicants dominate). C4 Medium (low willingness to pay; free government help and ChatGPT compete; success-fee consultants show demand when money is at stake). Korea-relevant: **High**. 3D: none.
- **Lessons from 삼쩜삼:**
  1. Fees tied to the user's money (a share of the refund) beat subscriptions for infrequent tasks.
  2. Consumer-scale funnels (free lookup, then a paid result) work in Korea.
  3. Regulatory incumbents will push back (세무사법, privacy), and the state can launch a free version (Hometax, March 2025).
  It is mostly automation, so it fails C1, and the niche is taken.
- **Scores, 공인중개사:** C1 High (the broker is liable for 중개대상물 확인·설명서, the property disclosure statement). C2 **Low–Medium** (documents reduce liability more than they win deals; listing content and floor plans could help win listings). C3 Medium (roughly 440k license holders not operating, an estimate from 550k+ holders minus about 109k operating; about 9k new openings a year; rule changes not quantified here). C4 Medium–High (individual offices pay, and the market is shrinking). 3D: Medium (listing floor plans and measured areas).

### Gaps
- Number of Naver Smart Store or Coupang sellers, and how many are one-person businesses: not retrieved.
- 소상공인 policy-fund (정책자금) application volumes and rejection rates: not retrieved.
- Software 공인중개사 use today (for example the association's own software) and its prices: not verified.
- Other Korea prosumer ideas not researched this session: 사전점검 대행 (new-apartment defect pre-inspection agents, which use laser and thermal measurement), 손해사정사 (Korean loss adjusters), 1인 출판/스마트스토어 상세페이지 제작 (one-person publishing and Smart Store product-page production).

---

## Q8. Validation examples: consumer-level tools for professionals that grew bottom-up

### Takeaway
The successful examples share four traits:
1. The entry price is below the margin on a single job: Roofr $0 plus $19 per report, Hover's first 3 projects free, Spectora about $109/month against $300–450 per inspection, 삼쩜삼's fee taken from the refund.
2. The output is the deliverable the practitioner's client sees: the report, the certificate, the estimate.
3. The tool exports into the system of record the practitioner is judged by: ESX for Xactimate, UCDP-ready data for appraisals, BS 7671 certificates.
4. Prices ignore seat counts (unlimited users at Hover, Roofr and magicplan), which removes the approval step.

### Cited Findings
- [Vendor claim] Spectora: 10,000–12,000+ inspectors at $109/month, with AI built in. — [Spectora comparison](https://www.spectora.com/spectora-and-hive-inspect-comparison)
- [Vendor claim] Jobber: 400k+ service pros and $100B+ invoiced since 2011. — [Jobber About](https://www.getjobber.com/about/)
- [Press] 삼쩜삼: 23M sign-ups (April 2025), revenue rising from ₩3.5bn (2020) to ₩77.7bn (1H 2024). — [Money Today](https://www.mt.co.kr/future/2025/04/10/2025041014263463666); [Hankyung](https://www.hankyung.com/article/2025021686011)
- [Vendor claim/press] CubiCasa: free phone floor-plan scans with paid ANSI GLA add-ons (about $15 per report per an aggregator). Clear Capital acquired it in 2021, so the free-scan funnel ended in a strategic acquisition by an appraisal-technology firm. — [Software Advice](https://www.softwareadvice.com/3d-architecture/cubicasa-profile); [National Mortgage News](https://www.nationalmortgagenews.com/news/ai-disruption-uad-3-6-rules-bring-upgrades-to-appraisal-tech)
- [Vendor claim] Hover: phone-photo 3D exterior models with no subscription required, $29–139 per project, unlimited users, ESX export. — [Hover pricing](https://hover.to/pricing)
- [Vendor claim] Roofr: "the only roofing software that have a no-monthly cost option"; pay-per-report; no per-seat charge. — [Roofr pricing](https://roofr.com/pricing)
- [Vendor claim] Tradecert: £18/month, unlimited certificates, AI extraction from photos. — [Tradecert](https://www.tradecert.app)

### Inferences
- The founder's $10–50/month or per-use pricing is well inside the proven range, and per-use pricing (per scan, per report, per claim pack) suits criterion 3's infrequent tasks better than subscriptions.
- In every crowded category the incumbent added AI inside the tool users already pay for (Spectora, Verisk XactAI, Tradecert, a la mode/Aivre). A newcomer therefore wins either on a **new mandatory deliverable** (a form change) or on a **capture modality** the incumbent lacks, such as phone 3D producing a standards-compliant sketch.

### Gaps
- User counts and funding for Hover, CubiCasa, Roofr and EagleView (2024–2026): not verified.
- Churn and retention for pay-per-use tools vs subscriptions: not found.

---

## Q9. Scorecard, ranked top 5, and 3D-capture connections

### Takeaway
Combining all four criteria with the founder's assets (3D capture, Korea, small self-serve team), the ranking is:
1. **US residential appraisers' UAD 3.6 floor-plan and data-entry assistant.**
2. **Independent/CAT adjusters' deployment kit** (photo reports, guideline checklists, LiDAR sketch to ESX).
3. **Marketplace-seller compliance-pack builder** (GPSR/CPSC/KC).
4. **Korean 1인 창업자/소상공인 support-program application and settlement assistant.**
5. **Home inspectors** (fit is strong, but the market is crowded). UK EICR certificates are the near-equal alternative.

Appraisers and adjusters are the two candidates where phone 3D capture produces a required, money-linked deliverable.

### Cited Findings
- See Q1–Q8 for all sources. The key facts behind the ranking:
  - UAD 3.6 mandate on 2026-11-02, with legacy submissions allowed to 2027-05-19 per OREC, and only 6% field carryover. — [Freddie Mac FAQ](https://sf.freddiemac.com//faqs/uad-and-forms-redesign); [OREC alert](https://www.oklahoma.gov/content/dam/ok/en/orec/documents/resources/OREC_OREAB-20261014-Industry%20Alert_Mortgage%20Appraisal%20Reports_V1.pdf); [Class Valuation](https://www.classvaluation.com/blog/uad-3-6-appraisal-software/)
  - IA per-claim pay and 2–4 claims/day. — [AdjusterPro](https://adjusterpro.com/?p=5256)
  - CPSC eFiling from 2026-07-08 and Amazon GPSR enforcement. — [FR 2025-12979](https://www.federalregister.gov/documents/2025/07/11/2025-12979/agency-information-collection-activities-proposed-collection-comment-request-third-party-testing-of); [Carbon6](https://www.carbon6.io/blog/gpsr-what-eu-sellers-need-to-know-and-implement)
  - Spectora, Hive and Binsr AI crowding. — [Spectora comparison](https://www.spectora.com/spectora-and-hive-inspect-comparison); [The SaaS News](https://www.thesaasnews.com/news/binsr-inspect-raises-1-1m-in-funding)
  - Tradecert AI. — [Tradecert](https://www.tradecert.app)

### Inferences

**Scorecard (H = high, M = medium, L = low; reasons in each section above)**

| Candidate | C1 Assist | C2 Money | C3 Non-fluency | C4 Consumer buyer | Competition | 3D fit | Korea fit |
|---|---|---|---|---|---|---|---|
| US appraisers: UAD 3.6 sketch/GLA and field assistant | H | M–H | H (time-boxed, decays over 6–12 mo) | M–H | High at form layer; medium at sketch layer (CubiCasa/Clear Capital) | **High** | Low |
| US independent/CAT adjusters | H | **H** | M–H | M | Verisk XactAI, Hover, magicplan | **High** | Low |
| Marketplace-seller compliance packs (GPSR/CPSC/KC) | M–H | **H** | **H** | **H** | Services and consultants; few self-serve AI tools found | Low | **High** |
| Korea 1인 창업자/소상공인 support and policy funds | H | M–H | **H** | M (low WTP) | ChatGPT, consultants, free gov help | None | **High** |
| US home inspectors | H | M | M | **H** | Crowded (Spectora AI, Hive, Binsr) | L–M | Low |
| UK EICR and trade certificates | H | M–H | M | **H** | Crowded (Tradecert AI, 5+ apps) | Low | Low |
| Roofing/exterior measurement and quotes | H | **H** | **L** | **H** | Saturated (Hover, EagleView, Roofr) | **High** | Low |
| Freelance FAI and quality inspectors | H | M | **H** | L–M (ITAR/CUI) | Ballooning AI crowded | Medium (desktop, not phone) | Medium |
| Korea 공인중개사 | H | L–M | M | M–H | Not verified | Medium | **High** (shrinking) |
| Freelancer tax (삼쩜삼 model) | L–M (automation) | H | M | H | Taken; free NTS service | None | High (taken) |
| Added: property data collectors (PDC/UPDR) for hybrid appraisals | H | M–H | H (new UPDR template, gig churn) | M (vendor apps often mandated) | ProxyPics (first UPDR-verified) | **High** | Low |

**Ranked top 5 (combined fit across all four criteria, then founder assets)**
1. **US residential appraisers: UAD 3.6 floor-plan/GLA plus field-mapping assistant that exports into existing form software.** All four criteria score Medium–High or better, and the form change is happening now. The deliverable (a software-generated sketch or floor plan with GLA) is mandatory and measurement-based, so phone LiDAR or photogrammetry plus ANSI Z765 logic is the founder's home turf. Risks: the window decays after mid-2027, the population is shrinking, and Clear Capital/CubiCasa and free AI form vendors are already present.
2. **US independent/CAT adjusters: deployment kit.** It has the strongest money link (per-claim pay, claims per day) and a constant supply of new entrants every storm season. Phone 3D capture produces roof and interior sketches exported as ESX. Risks: Verisk controls the system of record and ships XactAI, Hover and magicplan occupy sketching, and policyholder PII sits in the files.
3. **Marketplace-seller compliance-pack builder (GPSR / CPSC CPC + eFiling / KC).** It has the best C3 and C4 scores and a hard revenue gate. It is Korea-relevant for both cross-border and domestic sellers, and fits LLM-plus-rules with no 3D needed. Risks: legal liability (never fabricate certificates), ongoing maintenance of rule corpora, and no seller-count data gathered here.
4. **Korea 1인 창업자/소상공인 government support and policy-fund application plus settlement assistant.** It has the strongest C1 and C3 scores and a home-market advantage. Willingness to pay is weak, so price per application or on success. It overlaps with the sibling note's grant analysis.
5. **US home inspectors** (alternative: UK EICR certificates). Both pass all four criteria and prove the consumer-buyer model, but incumbents already ship AI. Pursue only with a sharp niche (for example insurance 4-point/wind-mitigation forms or ancillary inspections) or as a channel for a 3D-capture feature.

**Which candidates connect to 3D capture and measurement**
- **Strong:** Appraisers (ANSI Z765 GLA, software-generated per-level sketches and floor plans; CubiCasa and SketchGLA prove phone capture is accepted). Property data collectors (Fannie Mae requires a floor plan for property data collections; ProxyPics and UPDR). Adjusters (roof pitch and area, interior room sketches to Xactimate ESX; Hover, magicplan LiDAR, Yembo). Roofing and exterior contractors (Hover phone photogrammetry, but saturated).
- **Moderate:** 공인중개사 (listing floor plans and areas). Home inspectors (roof and condition capture, not measurement-driven). FAI and quality inspectors (scan-based inspection is Geomagic heritage, but phone accuracy is insufficient; desktop or metrology only).
- **None or weak:** Marketplace compliance documents, Korean grant applications, freelancer tax, UK EICR certificates.

### Gaps
- Seller counts, IA counts and home-inspector counts would sharpen market sizing but could not be retrieved before the search budget ran out.
- Two promising additional candidates, both with floor-area measurement and frequent methodology changes, were not researched: UK domestic energy assessors (EPC/RdSAP methodology updates) and French *diagnostiqueurs immobiliers* (DPE reforms; Carrez/Boutin surface measurement). They are worth a follow-up as 3D-plus-form-change fits.
- Willingness to pay for an upstream appraisal sketch/field assistant once AI form vendors' free periods end (2027 pricing) is unknown.
