# FAI / AS9102 / Ballooning / Inspection-Planning Software: Competitive Landscape, Technology State, and Gaps (as of 2026-11-03)

Notes for the report writer. All pages were accessed 2026-11-03 unless noted. Each bullet is tagged with its evidence type:
- **[Fact]**: verifiable fact (deal terms, funding, published price, release dates)
- **[Vendor claim]**: vendor marketing, not independently verified
- **[Third-party]**: aggregator, review site, or reseller data. Often stale or inconsistent.
- **[User anecdote]**: verbatim forum or review quote
- **[Estimate]**: my own arithmetic or estimate, labeled as such

Method caveat: the shared web-search budget ran out partway through this research. Some items (PC-DMIS/Hexagon, ZEISS, PolyWorks report modules, Siemens/PTC/Autodesk MBD inspection tools, Plex/ETQ/Uniphi, Qualio/ComplianceQuest AI, Xometry/Protolabs quoting, Werk24 funding, Ideagen's current owner) could not be verified and are listed under Gaps. G2, Capterra, GetApp, TrustRadius, and Practical Machinist pages returned HTTP 403, so there are few independent user reviews here.

---

## 1. Incumbent FAI / ballooning tools: features, deployment, pricing, target customer, ownership, reviews

### Takeaway
OCR-based auto-ballooning, AS9102 Forms 1/2/3 export, CMM-result import, revision comparison, AQL sampling tables, and Net-Inspect export are now **table stakes**. Every serious incumbent offers them: Ideagen Quality Control (InspectionXpert), DISCUS, High QA, Net-Inspect, 1factory, SOLIDWORKS Inspection, and Verisurf (which sells High QA's Inspection Manager). Incumbents are mostly desktop or quote-based enterprise SaaS. Published prices cluster around **US$1,400–2,500 per seat perpetual, or about $125–235 per seat per month**. None of the established incumbents publicly markets LLM/VLM-based drawing understanding or automated measurement-method selection as of Nov 2026.

### Cited Findings

**Ideagen Quality Control (formerly InspectionXpert; Ideagen also owns QualityXpert)**
- [Fact] Ideagen acquired InspectionXpert (Raleigh, NC) on 11 Sep 2018 for **$7 million**. InspectionXpert then generated **$2.8 million in revenue** and had **more than 1,000 clients, including Boeing, Kohler and Pratt & Whitney**. Products: InspectionXpert and QualityXpert. — [Ideagen press release](https://www.ideagen.com/company/news/ideagen-acquires-us-company-inspectionxpert)
- [Vendor claim] The current site calls it "ballooning software". It reads native CAD and PDF drawings and places sequential balloons. It imports data from "a CMM, Faro arm, or optical scanner" matched to balloon numbers, generates AS9102 Forms 1, 2 and 3 plus PPAP PSW, exports to Excel or uploads to Net-Inspect, and claims ITAR registration, RBAC, and encryption. A **free 14-day trial** is offered. The site mentions no AI and no prices. Testimonial: a full FAI went from "a day to 10 minutes". — [inspectionxpert.com](https://www.inspectionxpert.com/)
- [Third-party] Pricing: Standard **$125/month** (PDF/TIFF import, custom export templates, Excel/XML/PDF export, 2D PDF revision management). Advanced **$235/month** (adds DWG/DXF import, CMM measurement import, export measurements to inspection reports). Listing last updated 23 Sep 2026. — [SoftwareSuggest](https://www.softwaresuggest.com/inspectionxpert)
- [Third-party] An older Latka figure is "Pricing begins at $1,500 per year, per seat". — [Latka blog](https://blog.getlatka.com/?p=1387) (undated; consistent with $125/mo)
- [Third-party] A GroundControl-authored comparison calls it "Desktop-first", says it is "not a full package management platform", and says seat pricing is quote-based. Case examples cut package creation from "~30-40 minutes" to "well under 10 minutes". — [GroundControl comparison, 17 Feb 2026](https://gndctl.com/resources/top-4-itar-compliant-as9102-first-article-inspection-fai-software-2026/) (competitor-authored)
- [Third-party] G2 shows the Ideagen InspectionXpert listing at 4.6/5 from **a single review**. There is little independent review volume. — [G2 discussion page](https://www.g2.com/products/ideagen-inspectionxpert/discuss) (via search summary)
- [Fact] A 2026 search turned up no Ideagen announcement of AI features for Quality Control. — search result set incl. [Ideagen community](https://community.ideagen.com/ideagen-quality-control-essentials-formerly-inpectionxpert-3-0-95)

**DISCUS Software**
- [Vendor claim] Modular desktop suite: DISCUS Desktop, IDA (drawing analysis/auto-ballooning), Results, Planner, CMM, 3D, and Connect (supplier collaboration). Bundles: 2D FAI Suite, 2D FAI Tool (1-year node-locked subscription), 3D FAI Suite, 2D Inspection Planning, 2D Complete Suite, and Supplier Management Suite. Most bundles are a "one-time fee, floating" license. Bundles are "15% or more" cheaper than buying modules individually. Pricing is "value-based", so contact sales. — [DISCUS pricing page](https://www.discussoftware.com/?p=410)
- [Third-party, unverified] A search summary of DISCUS's purchase-configuration page cited example prices: a desktop license at **$1,500 one-time (node-locked)**, a subscription at **$720/license/year**, and support & maintenance at **$390/unit/year**. I could not open the page to confirm these are actual list prices rather than illustrative examples. — [DISCUS configure page](https://discussoftware.com/?p=417)
- [Fact] DISCUS 2026 was released **10 Mar 2026**. Release notes cover UI/UX refresh, auto-ballooning fixes, NX 2506/Parasolid 38 support, separate 2D and 3D balloon settings, a Verisurf CMM default template, and Net-Inspect export improvements (bonus tolerance export, one login per session). **No AI/ML features are mentioned.** — [DISCUS 2026 announcement](https://www.discussoftware.com/general/announcing-major-update-discus-2026-is-released/)
- [Fact] DISCUS has offered "2D Auto Ballooning" since DISCUS 9.1 (2017 news item). — [DISCUS pricing page](https://www.discussoftware.com/?p=410)
- [Third-party] The CMM module "maps PC-DMIS/Calypso outputs to balloons". Cons listed: "Heavier UI, steeper learning curve, and file-based collaboration unless DISCUS Connect is added." — [GroundControl comparison](https://gndctl.com/resources/top-4-itar-compliant-as9102-first-article-inspection-fai-software-2026/) (competitor-authored)
- [Fact] DISCUS is presenting "From Ballooning to Results" (3D PMI extraction and CMM output for FAI) at AutomaTech Expo on 12 Nov 2026. — [MMS Online event listing](https://www.mmsonline.com/events/details/from-ballooning-to-results-streamline-your-fai-process) (via search summary)

**High QA (Inspection Manager / 360 CORE)**
- [Vendor claim] Brochure (created June 2023, hosted in a 2025 uploads folder) lists 2D PDF and 3D MBD ballooning "from major CAD systems", "Automatically extract GD&T and PMI data", one-click auto-ballooning, a bill of characteristics, "In-depth AQL based sample planning", revision control, import from "any measurement machine", gage and tool management, shop-floor apps, SPC, FAI, NCR, and an API. Claims: "Balloon and create a bill of characteristics in 5 minutes instead of 2 hours" and "Complete a quality inspection project in 1 day instead of 2 weeks." The executive team "includes the founders of Cimatron and Enovia by Dassault Systems." — [High QA brochure PDF](https://www.highqa.com/wp-content/uploads/2025/06/HQA-IM-Brochure-Draft-Design-NEW-DESIGN-JUN-3-V1.pdf)
- [Vendor claim] It is compatible with SolidWorks, Siemens NX, CATIA, Creo, Autodesk, and Windchill, and it imports results from CMMs, VMMs and other automated inspection equipment. — [highqa.com search results](https://highqa.com/360core/)
- [Third-party] Pricing is "Contact vendor for pricing". — [Capterra](https://www.capterra.com/p/248001/High-QA-Inspection-Manager) (via search summary)
- [Third-party] High QA is based in Hazlet, NJ, and was founded 2008 or 2009 (sources differ). Aggregators list a 2018 Series A of **$2.0M** (Rittenhouse Ventures, Activate Venture Partners) and a **$1.05M** raise in Feb 2023. No acquisition was found. — [High QA about](https://highqa.com/about-us/); [CB Insights comparison](https://www.cbinsights.com/compare/high-qa-vs-unipoint-software) (via search summary)
- [Vendor claim] I found no High QA product-specific AI feature. Its blog ran a Mar 2026 post on data quality for AI and a 1 Jun 2026 post on auto-ballooning. — [High QA blog](https://highqa.com/category/blog-posts/) (via search summary)

**Verisurf**
- [Vendor claim] Verisurf's "Quality Planning & Process Control" page markets **"High QA Inspection Manager"**. Features: OCR ballooning with one-click GD&T extraction, GD&T/PMI extraction from native 3D MBD, STEP/3D PDF export, one-button import from CMMs, VMMs, arms and manual gages, FAI/PPAP/SPC/NCR reports, and AQL sample plans (MIL-STD-105, Z1.4). No AI claims. Quote only. — [Verisurf page](https://www.verisurf.com/?p=25347)

**Net-Inspect**
- [Vendor claim] Net-Inspect is a cloud supplier-quality and FAI platform with "over 100,000 users around the globe". It offers integrated auto-ballooning of 2D PDFs with OCR for dimensions, GD&T frames and callouts, and "single click" auto-population of AS9102 Forms 1–3. It also has an e-signature module, CMM import from "more than 30" third-party systems, and FAIR analytics tied to POs. Integration logos: Ideagen QC Pro (InspectionXpert), SOLIDWORKS, CATIA, DISCUS, Q-Pulse, Capvidia. The ballooning tool is "included with the FAI Module for new customers only". — [Net-Inspect FAI page](https://www.net-inspect.com/solutions/first-article-inspection-software/)
- [Vendor claim] Manual ballooning takes "2 to 8 hours" for complex parts. With Auto-Balloon, the engineer's review takes "20-45 minutes". The tool has validation warnings and company-level balloon templates. The 5 Jun 2026 page refers to "AS9102 Rev D Form 3" — see conflict note below. — [Net-Inspect blog, 5 Jun 2026](https://www.net-inspect.com/blog/how-automated-ballooning-accelerates-first-article-inspection/)
- [Fact/conflict] I could not verify that an AS9102 Rev D exists. A standards-store listing shows **SAE AS9102C dated 2023-06-28** as current. — [AENOR SAE listing](https://tienda.aenor.com/normas/sae?delta=60) (via search summary). Net-Inspect's "Rev D" reference may be an error, or may refer to a revision I could not confirm.
- [Third-party] Pricing: GetApp shows "Starting from 500 Per month". It is unclear what that covers. G2 says "Pricing provided by Net-Inspect". — [GetApp](https://www.getapp.com/operations-management-software/a/quality-improvement-software/) (via search summary)
- [User anecdote, 2011] "We have to use net inspect to post our fairs to the customer. (what a pain this is)" and "Visual fair will populate the net inspect templates. Saved us hours already" — AQPS guru. "InspectionXpert is the only ballooning tool currently recommended by Net-Inspect" — jncope, who appears affiliated with InspectionXpert. — [Elsmar Cove thread p.2](https://elsmar.com/elsmarqualityforum/threads/fair-software-comparison-discus-inspectionxpert-visual-fair.46661/page-2)

**1factory**
- [Vendor claim] Cloud QMS (hosted on AWS GovCloud) with "PDF Auto Ballooning", "First Article Inspection, AS9102", "Automated CMM Data Import", gage calibration, and Gage R&R. It offers General, Validated (21 CFR Part 11), and Gov (FedRAMP & CMMC) environments, and claims SOC 2 Type 2 and NIST 800-171. Customer claims conflict on the same page: "600+ Customers. 35+ Countries" vs "over 500 manufacturers in 35 countries". 1factory, Inc. is in Milpitas, CA, © 2011. Targets A&D, med device, precision machining, and others. — [1factory.com](https://www.1factory.com/)
- [Third-party] Pricing "starts at $60 per user/month" with a 5-user minimum, and an estimated range of $60–200/user/month. The aggregator contradicts itself on whether a free version exists. — [ITQlick](https://www.itqlick.com/1factory/pricing) (via search summary)

**SOLIDWORKS Inspection (Dassault Systèmes)**
- [Fact] Reseller price: **SOLIDWORKS Inspection Standard (Standalone), part SNX0028, $2,410.00**. It is a standalone app plus a SOLIDWORKS add-in that works with SOLIDWORKS files, PDFs or TIFFs. — [CATI store](https://store.cati.com/Catalog/Software/Detail/609-snx0028-solidworks-inspection)
- [Third-party] TriMech lists a Standard 3-month term license at **$386.40**. Professional term licenses are also sold. — [TriMech store](https://store.trimech.com/products/solidworks-inspection-standard-3-month-term-license) (via search summary)
- [Vendor claim, reseller] Feature list includes "Optical Character Recognition" (PDF/TIFF), "Automatic Ballooning", "PDF Drawing Comparison and 2D/3D Revision Management", "Quality Sampling Plans", and "Enter and Import Measurements". Professional adds CMM/digital-device input and pass/marginal/fail colouring. AS9102, ANSI B4.1, ISO 2768 and PPAP templates ship by default. No AI is mentioned. — [GoEngineer](https://www.goengineer.com/en-us/solidworks/technical-communication/solidworks-inspection)
- [Vendor claim] It can publish to Net-Inspect. — [SOLIDWORKS help: Publishing to Net-Inspect](https://help.solidworks.com/2021/English/SWInspectionAddIn/t_publishing_net_inspect.htm) (title from search result)

**Capvidia (MBDVidia), MBD/QIF route**
- [Vendor claim] Workflow: load an annotated MBD model, auto-generate the Bill of Characteristics with ballooning, export a "Smart Excel report" linked to the model, or publish the FAIR to Net-Inspect. Claims FAIR creation time can drop "up to 80%" (citing NIST). Argues that 2D methods are "dependent on a human process" and that different suppliers return "different GD&T interpretations" of the same drawing. No pricing. Article dated 16 Nov 2020. — [Capvidia blog](https://www.capvidia.com/blog/automated-as9102-fai-report-with-model-based-definition)
- [Vendor claim] The 2026 R1 release improved Bill of Characteristics and 2D ballooning and added STEP AP242 Ed. 3 read/write. — [BusinessWire, 6 Jul 2026](https://www.businesswire.com/news/home/20260706257595/en) (via search summary)

**Other established and low-cost desktop tools**
- [Vendor claim] IQM Digiverse / QA-CAD (IQM Solutions, Noida, India): desktop auto-ballooning for PDF, image and DWG/DXF. Offers **multilingual OCR (English, German, French, Japanese, Chinese, Korean…)**, AS9102/EN 9102/SJAC 9102 exports, and revision updates without re-ballooning. It is internally inconsistent: GD&T symbol pickup is planned "in near future", and CMM import is "support soon". Price: **INR 1,25,500 per user, perpetual**. — [IQM Digiverse](https://www.iqmsolutions.co.in/digiverse-auto-ballooning)
- [Estimate] INR 125,500 ≈ US$1,400–1,500 at roughly ₹85–88/USD.
- [User anecdote, 2010-era] "Discus basic w/OCR is ~$1500 and InspectionXpert (OCR is included in the base package) is $1395". The poster disclosed working for a competitor, so treat with caution. These are old prices. — [Elsmar thread](https://elsmar.com/elsmarqualityforum/threads/46661) (via search summary)

### Inferences
- Price anchors for a self-serve product: incumbent per-seat cost is about $1,400–2,500 perpetual (plus maintenance) or about $125–235/month. Enterprise-style platforms (Net-Inspect, 1factory, High QA) are quote-based at roughly $500+/month per org or $60+/user/month. A small-shop SaaS at $100–300/month per seat would be priced in line with the market, not below it.
- The incumbents' moat is integrations and compliance, not recognition quality: Net-Inspect export, CMM parsers (PC-DMIS, Calypso, Verisurf), ITAR/GovCloud, and templates. Every incumbent added Net-Inspect export, which suggests customer portals drive purchasing.
- Incumbents publish no recognition-accuracy numbers. Their claims are time-based ("5 minutes instead of 2 hours", "2–8 hours → 20–45 minutes review").
- I found no sign that DISCUS, Ideagen, or High QA shipped LLM/VLM features by Nov 2026. That leaves a window, but these vendors could add a VLM layer quickly.

### Gaps
- Could not verify (search budget exhausted): PC-DMIS/Hexagon, ZEISS (CALYPSO/PiWeb), PolyWorks, and Verisurf native report modules beyond the High QA page. Also unverified: Siemens (NX/Teamcenter Quality), PTC (Creo MBD), Autodesk Inventor/Fusion inspection tools, Plex/Rockwell, ETQ, Uniphi, and QualityXpert's current status.
- Ideagen's current ownership and valuation (Wikipedia returned 404). DISCUS and Net-Inspect ownership and revenue.
- Independent user reviews with cons for InspectionXpert, DISCUS, High QA and Net-Inspect: G2, Capterra, GetApp and TrustRadius returned 403, and Practical Machinist returned 403.
- Real auto-ballooning accuracy for any incumbent. None publishes it.

---

## 2. New AI entrants (2023–2026): AI ballooning, drawing-to-inspection-plan, AI quoting, drawing APIs, automated factories

### Takeaway
At least five newer tools now sell "AI ballooning → AS9102" directly, several self-serve: GroundControl (YC, about $2M seed, 70+ facilities), Werk24 Studio (from €149/mo), BalloonPlot (about $30/mo, India), Balloonist (browser-based), and V5 Ultimate. So "AI ballooning plus a Forms 1/2/3 draft" is already crowded. Large capital is going to adjacent drawing intelligence: CADDi $114M Series D at $1.2B (Sep 2026), Hadrian $1.37B at $7.87B (Aug 2026), Paperless Parts Wingman AI quoting, and Toolpath and CloudNC for AI CAM. No funded startup was found that specifically sells automated **inspection planning** (method/gauge selection, sampling rationale) for AS9102.

### Cited Findings

**GroundControl (gndctl.com / rungroundcontrol.com), the closest direct competitor**
- [Vendor claim] YC launch: "First Article Inspection Reports (AS9102s) were creating a bottleneck in quality. Our core product automates first article inspection reporting for regulated manufacturing." Claims **70+ manufacturing facilities onboarded** and "almost 1,000 reports per month". Founders: Mehul Shah (about a decade in his family's PCB business building boards for rockets, satellites and fighter jets), plus Nick Warren and Matthew Noseworthy, who previously co-founded InspectAR, acquired by Cadence. Pain cited: facilities producing about 15 reports a day at roughly 8 hours each, and a single customer-found typo causing rejection and delayed payment. — [YC Launch](https://www.ycombinator.com/launches/NWA-groundcontrol-vertical-ai-for-highly-regulated-manufacturing)
- [Third-party] GroundControl (San Francisco) is listed as YC X25, founded 2024, with a **$2.0M seed (June 2025)** and Y Combinator as the only listed investor. — [Seedtable](https://seedtable.com/companies/groundcontrol/funding-rounds/seed-2025-06) (via search summary). Another listing says P25, with inconsistent details.
- [Vendor claim] "GroundControl was the first company to offer AI auto-ballooning for manufacturing drawings" and "the strongest OCR accuracy in the category". It detects dimensions, GD&T frames, notes and callouts on 2D PDFs, auto-populates AS9102 Rev C Forms 1 and 2 and flows into Form 3, and imports CMM data via CSV/Excel (Hexagon, Zeiss, Mitutoyo, PC-DMIS, Calypso, Verisurf, PolyWorks). Exports include Net-Inspect-ready formats and customer templates. Its government-cloud deployment "achieved FedRAMP Moderate Equivalency following an independent 3PAO assessment" on AWS GovCloud. Ground Control Software, Inc. is ITAR registered. The site makes no claims about cert handling or delta FAI. — [GroundControl FAI page](https://gndctl.com/solutions/first-article-inspection-software/)
- [Contradiction] The "first AI auto-ballooning" claim conflicts with older automated ballooning. DISCUS had 2D auto-ballooning in 2017 ([DISCUS](https://www.discussoftware.com/?p=410)), and Werk24's auto-ballooning AS9102 page is about 5 years old (search result age about 1,997 days) ([Werk24](https://werk24.io/)).
- [Vendor claim] It sells "per organization, not per seat" with unlimited support. Pricing is "Contact sales". — [GroundControl comparison](https://gndctl.com/resources/top-4-itar-compliant-as9102-first-article-inspection-fai-software-2026/)
- [Vendor claim / customer testimonial] AdvancedPCB: "156% increase in FAI throughput". Lake County Tool Works: FAI times cut "50–70%". Mass Precision: "more than doubled FAIR output". — [GroundControl buyer's guide, 14 Aug 2026](https://gndctl.com/resources/automated-ballooning-software-fai-buyers-guide-2026)
- [Inference] The YC page and the gndctl.com site describe the same product, so they appear to be the same company. Many testimonials are from PCB and electronics firms (Summit Interconnect, US Circuits, AdvancedPCB), which suggests its early base is PCB/electronics suppliers rather than machined-parts shops.

**Werk24 (Munich): drawing-reading API plus "Studio" self-serve app**
- [Vendor claim] The API returns typed JSON for dimensions, tolerances, GD&T and materials, and "every field links back to its source in the drawing". It claims "GD&T understanding across ISO and ASME / ANSI". **Studio** auto-balloons and computes pass/fail, supports second-person approval, and exports AS9102 (Rev C Form 3 sample), EMPB, PPAP, Excel and QIF. Accuracy: **"95%" extraction on standard annotations, "up to 99% with a custom quality gate"**. Named customers: Laserhub ("1,000+ files a month"), DiManEx, Saphirion, Precision Components. Legal entity is W24 Service GmbH. — [werk24.io](https://werk24.io/)
- [Fact, published price list] API: Pay-as-you-go **€1.25/page**. Production **€590/month** for 500 pages, then €0.95/page. Contract **from €18,000/year**. Studio: Starter **€149/mo (40 pages)**, Professional **€490/mo (200 pages)**, Business **€1,490/mo (800 pages)**, Enterprise **from €3,900/mo (2,500 pages)**. Add-ons include data residency pinning (Frankfurt or N. Virginia, €299/mo). Free browser demo of 10 drawings/day. — [Werk24 pricing](https://it.werk24.io/pricing)
- [Third-party] Werk24's llms.txt reportedly mentions a remote MCP server for use with Claude. The homepage fetch did not confirm this. — [werk24.io/llms.txt](https://werk24.io/llms.txt) (via search summary)
- [Estimate] Werk24 Studio Starter works out to about €3.73/page. An FAI shop doing about 20 drawings/month would pay €149/mo, so Werk24 already offers self-serve "AI ballooning → AS9102" at small-shop prices.

**BalloonPlot (India; Dodo Payments)**
- [Vendor claim] "AI auto-ballooning" and "GD&T Auto-Recognition V2" (parallelism, flatness, true position, "40+ other control frame types"). One-click Excel/PDF AS9102 export, PDF/PNG/JPG import, PLM/ERP API, and a "Local-First" design with Offline Desktop Mode. No CMM import or MBD support mentioned. Pricing: Standard **₹3,000/month**, Professional **₹30,000/year (₹2,500/mo)**, Enterprise custom. "Trusted by 1,200+ quality professionals globally." Testimonial: "What used to take 3-4 hours now takes us 15 minutes." No accuracy percentage given. — [balloonplot.com](https://balloonplot.com/)
- [Estimate] ₹30,000/yr ≈ US$340–355/yr, roughly a fifth of an InspectionXpert seat.

**Balloonist (balloonist.io)**
- [Vendor claim] Runs "entirely in your web browser", uses "advanced OCR and AI models", and processes drawings client-side with AI features "utilizing secure cloud services". Users drag a rectangle to auto-capture. It explicitly says **"Auto-capture does not extract GD&T symbols"**. Exports an AS9102 Excel workbook with F1/F2/F3 sheets. No prices published. — [Balloonist docs](https://balloonist.io/docs.html)

**V5 Ultimate (S.G. Systems, LLC)**
- [Vendor claim] "PDF ballooning is on-screen with AI-assist suggestions the inspector confirms". "STEP ballooning reads the PMI/GD&T annotations directly". Forms 1–3 are auto-populated "from the item master and routing", and "Rev C forms generated with validation". **Delta FAI:** keeps the last full FAIR as a baseline and computes delta scope "per AS9102 Rev C §5.4". Triggers include drawing revision, process, sub-tier supplier, material lot, tooling, and a 2-year lapse. CMM parsing: "PC-DMIS, Calypso, Modus, PolyWorks, Verisurf". Includes a supplier/customer FAI portal. No accuracy figures. — [V5 Ultimate FAI](https://v5ultimate.com/solutions/first-article-inspection-software)

**Leo AI (getleo.ai): engineering copilot drifting into FAI content**
- [Vendor claim] Positions itself as "an intelligence layer that sits on top of your existing PDM and PLM", integrating with SolidWorks PDM, Vault, Windchill, Teamcenter and Arena. It cites an unnamed "published head to head test" in which an AI ballooning system captured 89 of 95 characteristics (about 94%) in roughly 19 minutes, versus 6+ hours manually. Claims "#1 New AI Software Globally - G2 2026". — [Leo AI blog](https://www.getleo.ai/blog/ai-first-article-inspection) (byline 27 Jun 2026). The source of the 89/95 test is not identified ([second Leo post](https://www.getleo.ai/blog/ai-first-article-inspection-fai)).

**CADDi (Japan/US): drawing data platform**
- [Fact] **$114M Series D at $1.2B valuation**, Sep 2026. That is more than double the $470M valuation of Mar 2025. Total raised: $234M. New investors: Moore Strategic Ventures, Coreline Ventures, Woven Capital (Toyota), Salesforce Ventures, HR Tech Fund (Recruit). Existing: Atomico, Globis, JPS Growth. About 900 staff, up from 600 in early 2025, with 100+ in customer success. Customers in 22 countries, and "more than half of Japan's 100 largest manufacturers" use CADDi. Sales are "more than doubling year over year". CADDi Drawer has been renamed **CADDi Explorer**. New products include CADDi Agent and CADDi Design Review. — [Fortune, 15 Sep 2026](https://fortune.com/2026/09/15/caddi-manufacturing-startup-valuation-funding-round-series-d-exclusive/)
- [Vendor quote] CEO Yushiro Kato says CADDi uses a proprietary model for drawings and CAD, and general LLMs only for documents: "I've never seen anybody who uses LLMs to do design reviews because it doesn't understand drawings or CAD." — [Fortune](https://fortune.com/2026/09/15/caddi-manufacturing-startup-valuation-funding-round-series-d-exclusive/)
- [Third-party] The Series D was ¥17.7B. The Mar 2025 round was about $38M; CB Insights labels it debt (about $33.9M). — [The Bridge](https://thebridge.jp/2026/09/caddi-raises-17-7-billion-yen-series-d); [CB Insights](https://www.cbinsights.com/company/caddi/financials) (via search summary)

**Paperless Parts (Boston): AI quoting from prints**
- [Fact] Last confirmed equity round: **$30M Series B, 13 Sep 2021, led by OpenView**. — [Paperless Parts press](https://www.paperlessparts.com/press/paperless-parts-announces-30m-series-b-funding-led-by-openview-partners/). Aggregators conflict on later rounds (an undated "$45.5M Series C" and a "$5M Dec 2023"), both unverified. — [search summary](https://dealroom.co/companies/paperless-parts/)
- [Fact] Wingman AI (print-reading for quoting) launched Apr 2025 (per search summary). Then: "AI features that surface critical requirements" on 8 Sep 2025, **Wingman 2.0 "deeper print intelligence"** on 6 May 2026, a TIGHITCO partnership on 22 Jul 2026, and DXF quoting on 21 Oct 2026. — [Paperless Parts newsroom](https://www.paperlessparts.com/press/)

**Hadrian (automated aerospace/defense factories)**
- [Fact] **$1.37B Series D on 6 Aug 2026 at $7.87B post-money**, co-led by WCM, Washington Harbour, Valor, 137 Ventures and Baillie Gifford. This followed a Jan 2026 round at $1.6B. — [TechCrunch](https://techcrunch.com/2026/08/06/defense-tech-hadrian-raises-1-37b-at-8b-valuation/) (via search summary)

**Toolpath and CloudNC (AI CAM, adjacent)**
- [Fact] Toolpath: **$10M seed (Sep 2024, Leaders Fund)**. A Kennametal-led round in May 2025 brought the total to about $20M. Autodesk made a corporate investment in Aug 2025 (CB Insights shows $16.95M total, which conflicts). — [Hypepotamus](https://hypepotamus.com/news/toolpath-secures-strategic-investment-cam-ai/); [CB Insights](https://www.cbinsights.com/company/toolpath/financials) (via search summary)
- [Fact] CloudNC raised a $20M Series B (Sep 2026). — [tech.eu](https://tech.eu/2026/09/09/cloudnc-lands-20m-to-expand-its-ai-software-for-precision-manufacturing/) (via search summary)

### Inferences
- "Upload a PDF → AI balloons → AS9102 draft" is now offered by funded and bootstrapped players at prices from about $30/mo (BalloonPlot) to €149/mo (Werk24 Studio), alongside quote-based GroundControl. The founder's product cannot differentiate on ballooning or Form 3 generation alone.
- Nobody among these entrants claims automated **inspection planning**: recommending a measurement method or gauge per characteristic, gauge resolution versus tolerance (10:1 / 4:1 rules), CMM-vs-hand-tool routing, and sampling rationale. Incumbents offer only table-driven AQL sampling (High QA, Verisurf, SOLIDWORKS "Quality Sampling Plans"). The founder's metrology background is most defensible here.
- GroundControl's YC framing (8 hours per report; rejections over typos) validates the pain. Its early base appears skewed to PCB/electronics, which may leave machined-parts and small aerospace machine shops less contested.
- Large rounds (CADDi, Hadrian) show investor appetite for drawing intelligence. CADDi's CEO publicly doubts general LLMs on drawings, which supports a hybrid (specialized detector plus VLM) architecture.

### Gaps
- Werk24 funding, headcount and customer count were not found.
- Xometry/Protolabs instant-quoting drawing capabilities were not verified (search budget).
- Qualio and ComplianceQuest AI features, and whether any AI QMS addresses FAI, were not verified. They appear to be document/CAPA-centric (unverified inference).
- Leo AI funding, and the source of the "89 of 95" test, were not found.
- Other possible FAI-specific startups (e.g., in YC W26/S26 batches or EU/Japan) may exist undetected. A Crunchbase sweep is recommended.

---

## 3. What remains unsolved or painful

### Takeaway
Vendors themselves admit the following remain hard:
- low-quality scans, rotated or stacked callouts, and handwritten notes
- composite GD&T frames and modifiers
- characteristics hidden in general notes and title-block default tolerances
- silent failures

No vendor found claims to (a) parse PO/spec flow-downs into requirements, (b) read material/special-process certificates and map them to Form 2, or (c) recommend measurement methods and gauges. Delta-FAI logic is claimed by only one smaller vendor (V5). ITAR/CUI handling is a gating requirement for any cloud/LLM product.

### Cited Findings
- [Vendor admission] OCR-based tools degrade on "low-DPI scans, rotated views, hand annotations, and stacked tolerance callouts". Many tools balloon only views, so characteristics in the **notes block and title-block default tolerances are often missed**. Tools that fail on poor scans do not announce it, so gaps surface later as source rejections. The right method is "machine extraction plus human approval". — [GroundControl buyer's guide, 14 Aug 2026](https://gndctl.com/resources/automated-ballooning-software-fai-buyers-guide-2026)
- [Vendor admission] "The realistic posture is assisted, not autonomous." Misses include handwritten notes, composite GD&T frames with ambiguous layout, and callouts in cluttered detail views. Naive symbol detection "can drop modifiers, producing reports that look complete but are wrong". — [Leo AI blog](https://www.getleo.ai/blog/ai-first-article-inspection)
- [Vendor admission] "Auto-capture does not extract GD&T symbols"; reference locations are not auto-extracted. — [Balloonist docs](https://balloonist.io/docs.html). IQM says GD&T symbol pickup is planned "in near future" and CMM import is "support soon". — [IQM Digiverse](https://www.iqmsolutions.co.in/digiverse-auto-ballooning)
- [Vendor claim] Customers receive inconsistent GD&T interpretations from different suppliers working off the same 2D drawing. — [Capvidia](https://www.capvidia.com/blog/automated-as9102-fai-report-with-model-based-definition)
- [Vendor claim] Paperwork pain: about 15 reports/day at about 8 hours each, and "a single typo found by a customer could cause rejection and delayed payment". — [GroundControl YC Launch](https://www.ycombinator.com/launches/NWA-groundcontrol-vertical-ai-for-highly-regulated-manufacturing)
- [Vendor claim] Revision handling exists in some form: InspectionXpert "2D PDF revision management" ([SoftwareSuggest](https://www.softwaresuggest.com/inspectionxpert)), SOLIDWORKS "PDF Drawing Comparison and 2D/3D Revision Management" ([GoEngineer](https://www.goengineer.com/en-us/solidworks/technical-communication/solidworks-inspection)), IQM "revision updates without re-ballooning", and BalloonPlot "delta FAI ballooning" (per search summary, [balloonplot.com](https://balloonplot.com/)). Only V5 claims automated **delta-FAI scope determination** per AS9102 §5.4 with triggers such as process change, sub-tier supplier change, material lot, tooling, and 2-year lapse. — [V5 Ultimate](https://v5ultimate.com/solutions/first-article-inspection-software)
- [Vendor claim] Form 2 (materials, special processes, functional tests) is described generically by Capvidia. V5 auto-populates Forms 1–3 from "item master and routing", and GroundControl says characteristics "auto-populate AS9102 Forms 1 and 2". **No vendor found claims to ingest certificates of conformance or material test reports and map them to Form 2.** — [Capvidia](https://www.capvidia.com/blog/automated-as9102-fai-report-with-model-based-definition); [V5](https://v5ultimate.com/solutions/first-article-inspection-software); [GroundControl](https://gndctl.com/solutions/first-article-inspection-software/)
- [Vendor claim] PO and spec requirement extraction is addressed only in the quoting context: Paperless Parts "AI features that surface critical requirements" (8 Sep 2025). — [Paperless Parts newsroom](https://www.paperlessparts.com/press/)
- [Vendor claim] CMM import is broadly solved for structured outputs. Net-Inspect handles "more than 30" systems ([Net-Inspect](https://www.net-inspect.com/solutions/first-article-inspection-software/)). DISCUS maps PC-DMIS/Calypso and added a Verisurf template in 2026 ([DISCUS 2026](https://www.discussoftware.com/general/announcing-major-update-discus-2026-is-released/)). GroundControl uses CSV/Excel, and V5 parses PC-DMIS, Calypso, Modus, PolyWorks and Verisurf. Hand tools (calipers, height gauges) are covered only via "wireless and wired tools, and manual gages" (Verisurf/High QA) and "digital devices" (SOLIDWORKS Professional). — [Verisurf](https://www.verisurf.com/?p=25347)
- [Vendor claim] Customer portals and templates: Net-Inspect export is offered by InspectionXpert, DISCUS, SOLIDWORKS Inspection, Capvidia, and GroundControl (sources above). The 2011 user complaint about Net-Inspect being "a pain" is old, and I have no newer verbatim complaint. — [Elsmar](https://elsmar.com/elsmarqualityforum/threads/fair-software-comparison-discus-inspectionxpert-visual-fair.46661/page-2)
- [Vendor claim] Multi-language drawings: only IQM claims multilingual OCR (incl. Japanese, Chinese, Korean). Werk24's site UI is in 5 European languages, and its drawing languages are unverified. — [IQM](https://www.iqmsolutions.co.in/digiverse-auto-ballooning); [Werk24](https://werk24.io/)
- [Vendor claim] ITAR/CUI: GroundControl (ITAR registered; FedRAMP Moderate Equivalency in AWS GovCloud), 1factory (AWS GovCloud; FedRAMP & CMMC environment), and InspectionXpert (ITAR registration). BalloonPlot markets "Local-First" with no mandatory cloud upload. A competitor comparison notes desktop tools "support controlled data locality". — [GroundControl](https://gndctl.com/solutions/first-article-inspection-software/); [1factory](https://www.1factory.com/); [inspectionxpert.com](https://www.inspectionxpert.com/); [BalloonPlot](https://balloonplot.com/); [GroundControl comparison](https://gndctl.com/resources/top-4-itar-compliant-as9102-first-article-inspection-fai-software-2026/)

### Inferences
- **Genuinely open problems (ranked by apparent white space):**
  1. **Inspection planning intelligence.** No one claims it. This covers per-characteristic method and gauge recommendation that respects tolerance-to-resolution ratios, shop gauge inventory, CMM-vs-manual routing, and sampling justification.
  2. **Requirements outside the dimensions.** This covers general notes, spec callouts (e.g., AMS/MIL process specs), PO quality clauses, and customer flow-downs converted into Form 2/Form 3 line items. Vendors admit notes and title-block tolerances are often missed.
  3. **Form 2 evidence assembly.** This means parsing material certs and special-process certs and checking them against drawing and spec requirements.
  4. **Reliability signalling.** Per-characteristic confidence and "what we might have missed" warnings, which address the admitted silent-failure problem.
  5. **Delta FAI decision logic** tied to revision diffs, where only V5 claims coverage.
  6. Multi-language and legacy/hand-drawn prints.
- Ballooning, Form 3 export, Net-Inspect export, and structured CMM import are table stakes, not differentiators.
- ITAR/CUI (ITAR-controlled technical data, CUI, and DFARS 7012 for defense flow-downs) is a gating issue for a self-serve SaaS that sends drawings to third-party LLM APIs. Competitors already advertise GovCloud/FedRAMP-equivalency or local-first processing, so the founder needs an answer from day one (e.g., US-only hosting, no third-party model training, an on-device or GovCloud option).

### Gaps
- No independent study quantifies how often FAIRs are rejected for missed notes, flow-downs, or Form 2 errors versus dimensional issues. The parallel researcher on shop operations may cover this.
- I found no verbatim recent (2024–2026) user complaints from Practical Machinist, Reddit or Elsmar (blocked, or search budget exhausted).
- Whether incumbents' "auto-populate Form 2" goes beyond copying item-master fields is unclear.

---

## 4. Accuracy of current AI on engineering drawings: benchmarks and claims

### Takeaway
Zero-shot frontier models are **not reliable** for strict, per-characteristic extraction. In a small Aug 2025 test with strict all-field matching, Gemini 2.5 Pro reached about 80%, and Claude Opus 4, o4-mini, and o3 reached about 20–40%, with phantom tolerances and misassigned views. Fine-tuned small VLMs paired with oriented-box detectors reach F1 of about 0.93–0.96 on numeric annotations in academic datasets, but only about 0.67 on text and categorical content. The ICML 2026 MechVQA benchmark concludes MLLMs "remain brittle" on mechanical drawings. Vendor accuracy claims (Werk24 95–99%) are not independently verified.

### Cited Findings
- [Third-party test, Aug 2025] BusinessWare tested 10 mechanical drawings with 17–58 dimensions each. A dimension counted as correct only if **all** fields matched: view, type, nominal, tolerances, feature count, geometric tolerance, surface finish, and reference flag. Models ran zero-shot. Results: **Gemini 2.5 Pro 79.96%, Gemini 2.5 Flash 77.34%, Claude Opus 4 40.49%, GPT-o4-mini 39.59%, GPT-o3 20.38%, Qwen VL Plus ~8%**. Failure modes: Flash "sometimes inserted phantom tolerance values that didn't exist in the source"; o3 "frequently misassigned dimensions and tolerances"; Claude "sometimes misassigned dimensions across views". All models "struggled with geometric tolerances like perpendicularity, flatness or parallelism". — [BusinessWare blog](https://www.businesswaretech.com/blog/benchmarking-ai-on-tables-and-engineering-drawings-results-findings) (small n, vendor blog, older model generation)
- [Academic, Nov 2024] Khan et al. fine-tuned **Florence-2 (0.23B)** on 400 expert-annotated drawings for GD&T extraction. It beat zero-shot GPT-4o and Claude-3.5-Sonnet by +29.95% precision, +37.75% recall, and +52.40% F1, and cut hallucination rate by 43.15% (relative figures). Performance declines as GD&T entries per drawing increase. — [arXiv 2411.03707](https://arxiv.org/abs/2411.03707)
- [Academic, Jun/Sep 2025] YOLOv11-OBB detection plus fine-tuned Donut on **1,367 drawings**, 9 categories: **precision 88.5%, recall 99.2%, F1 93.5%, hallucination 11.5%**. — [arXiv 2506.17374](https://arxiv.org/abs/2506.17374)
- [Academic, Oct 2025/Jan 2026] Multi-view hybrid pipeline (YOLOv11 layout plus OBB plus two Donut VLMs) on 1,000/1,406 drawings: **Numerical VLM F1 0.963** (measures, GD&T, surface roughness) vs **Alphabetical VLM F1 0.672** (text/categorical, e.g., notes and title block). — [arXiv 2510.21862](https://arxiv.org/abs/2510.21862)
- [Academic, ICML 2026] **MechVQA**: 3.3k high-density images and 21K QA pairs across 10 tasks (recognition, reasoning, judging). MLLMs "remain brittle on mechanical engineering drawings" due to "high annotation density and weak domain knowledge" and "unreliable spatial relation reasoning under strict projection rules". The authors' MechVL beats the strongest closed-source baseline by 7.57 pp. — [arXiv 2605.30794](https://arxiv.org/abs/2605.30794)
- [Academic, 2026] Enginuity (engineering diagrams from U.S. military manuals): frontier models locate components reasonably well but describe them poorly. Not GD&T-specific. — [arXiv 2606.03410](https://arxiv.org/abs/2606.03410) (via search summary)
- [Academic] DesignQA (ASME JCISE 2025) is a multimodal benchmark of engineering documentation with a dimension subset. The figures I found could not be attributed to specific models. — [ASME DesignQA](https://asmedigitalcollection.asme.org/computingengineering/article/25/2/021009/1210215/DesignQA-A-Multimodal-Benchmark-for-Evaluating) (via search summary)
- [Academic] A Procedia CIRP 2025 paper describes a DNN pipeline (view detection → dimension detection → OCR → info-block processing → inspection sheet). — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S221282712500023X) (via search summary)
- [Vendor claim] Werk24: "95%" on standard annotations and "up to 99% with a custom quality gate". — [werk24.io](https://werk24.io/). Leo AI cites an 89/95 (about 94%) characteristic capture from an unnamed test. — [Leo AI](https://www.getleo.ai/blog/ai-first-article-inspection). CADDi publishes no accuracy figures, and its CEO says general LLMs do not understand drawings. — [Fortune](https://fortune.com/2026/09/15/caddi-manufacturing-startup-valuation-funding-round-series-d-exclusive/)

### Inferences
- The most-cited academic results (Khan et al., Seung Ki Moon's group, three papers) consistently favour **detector plus small fine-tuned VLM** over zero-shot frontier models. A defensible product likely needs a hybrid: specialized detection/OCR for symbols and numbers, an LLM for notes, specs and reasoning, and explicit confidence and coverage checks. A pure frontier-LLM wrapper is unlikely to be reliable.
- Even 94–96% per-characteristic recall means a 60-characteristic drawing has about 2–4 misses or errors. Human review remains mandatory, and UX for fast verification ("diff" views, confidence flags) is a differentiator.
- Text and notes extraction (F1 about 0.67 in 2510.21862) is notably weaker than numeric extraction. That matches the vendor admissions on notes in Question 3 and points to where unsolved value lies.
- Benchmarks were mostly run on 2024–2025 model generations. Newer models (late 2025–2026) may be better, but no public, rigorous GD&T-extraction leaderboard exists as of Nov 2026.

### Gaps
- No public, standardized benchmark specifically for GD&T feature-control-frame parsing (including modifiers, composite frames, and datums) was found.
- Per-model numbers inside MechVQA and DesignQA were not retrieved.
- No independent test of commercial auto-ballooning tools (InspectionXpert, DISCUS, GroundControl, Werk24) on a common drawing set was found.

---

## 5. Market size indicators and M&A

### Takeaway
The FAI and ballooning niche is small in revenue terms. InspectionXpert had **$2.8M revenue and 1,000+ clients when acquired for $7M in 2018** (about 2.5x revenue). Customer-count signals: 1factory 600+ customers, GroundControl 70+ facilities, BalloonPlot "1,200+ quality professionals", Net-Inspect "100,000+ users". Broad "QMS software" market figures (e.g., Grand View: $12.3B in 2025) are much larger than the addressable FAI niche and should not be used as a TAM without heavy discounting. Capital is flowing to adjacent drawing intelligence (CADDi $1.2B valuation; Hadrian $7.87B).

### Cited Findings
- [Fact] Ideagen bought InspectionXpert for $7M (11 Sep 2018). InspectionXpert had $2.8M revenue and 1,000+ clients incl. Boeing, Kohler, Pratt & Whitney. — [Ideagen](https://www.ideagen.com/company/news/ideagen-acquires-us-company-inspectionxpert)
- [Vendor claim] 1factory: "600+ Customers. 35+ Countries" (also "over 500 manufacturers"). — [1factory](https://www.1factory.com/)
- [Vendor claim] Net-Inspect: "over 100,000 users around the globe". — [Net-Inspect](https://www.net-inspect.com/solutions/first-article-inspection-software/)
- [Vendor claim] GroundControl: 70+ facilities, about 1,000 reports/month. — [YC Launch](https://www.ycombinator.com/launches/NWA-groundcontrol-vertical-ai-for-highly-regulated-manufacturing)
- [Vendor claim] BalloonPlot: "Trusted by 1,200+ quality professionals globally". — [BalloonPlot](https://balloonplot.com/)
- [Third-party, low credibility] QMS software market: **USD 12.3B (2025)**, 13.4B (2026E), and 28.8B (2033F), 11.5% CAGR. North America is 41.1%. Manufacturing is the largest end-use, with no percentage given. Methodology is opaque (paid report; "Published: June 2026, Last Updated: September 2026"). — [Grand View Research](https://www.grandviewresearch.com/industry-analysis/quality-management-software-market)
- [Fact] Adjacent capital: CADDi $114M Series D at $1.2B (Sep 2026, total $234M). — [Fortune](https://fortune.com/2026/09/15/caddi-manufacturing-startup-valuation-funding-round-series-d-exclusive/). Hadrian $1.37B at $7.87B (Aug 2026). — [TechCrunch](https://techcrunch.com/2026/08/06/defense-tech-hadrian-raises-1-37b-at-8b-valuation/). GroundControl about $2M seed (2025). — [Seedtable](https://seedtable.com/companies/groundcontrol/funding-rounds/seed-2025-06). High QA about $3M total disclosed. — [CB Insights compare](https://www.cbinsights.com/compare/high-qa-vs-unipoint-software)

### Inferences / Estimates
- [Estimate] InspectionXpert's 2018 revenue per client was about $2,800/year ($2.8M / 1,000+). This is consistent with 1–2 seats at about $1,400–1,500 each and supports a low-ACV, high-volume model.
- [Estimate] GroundControl's numbers imply about 14 reports per facility per month (1,000 / 70). If priced per organization at, say, $500–1,500/month (my assumption, not published), that is roughly $0.4–1.3M ARR. This is illustrative only.
- [Inference] The standalone FAI/ballooning software niche is likely in the tens of millions of dollars of annual revenue globally, not billions. It is spread across InspectionXpert, DISCUS, High QA, Net-Inspect, 1factory, SOLIDWORKS Inspection, and the new entrants. This is an inference from the revenue and customer data points above, not a sourced figure. A larger outcome likely requires expanding from FAI into inspection planning, in-process inspection, supplier quality, or the CADDi-style drawing-data platform.
- [Inference] M&A precedent: niche FAI tools have sold at modest multiples to QMS consolidators (Ideagen at about 2.5x revenue in 2018). Strategic acquirers could include QMS consolidators, CAD/PLM vendors (Dassault already owns SOLIDWORKS Inspection), metrology vendors (Hexagon, ZEISS, Verisurf partnering with High QA), and portals (Net-Inspect).

### Gaps
- No credible, sourced market-size figure specifically for FAI/ballooning or "quality inspection software for manufacturing" was found. Analyst QMS figures are low-credibility and too broad.
- I did not find DISCUS, High QA, Net-Inspect, or 1factory revenue.
- Ideagen's current owner and valuation, and any 2023–2026 M&A in the FAI niche, were not verified because the search budget ran out.
- The number of AS9100-certified suppliers (the denominator for TAM) is not covered here and is presumably handled by the parallel researcher.
