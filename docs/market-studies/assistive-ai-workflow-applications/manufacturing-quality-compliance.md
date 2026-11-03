# Manufacturing, Engineering & Industrial Quality/Compliance: Assistive-AI Application Areas Beyond Aerospace FAI (as of 3 Nov 2026)

Notes by: research sub-agent. Scope: manufacturing-specific quality and compliance work only. Trade/customs, ESG/CBAM, government contracting, grants, insurance and healthcare admin belong to another researcher.

Evidence tags used in every bullet:
- **[Fact]**: primary source, regulator/standards body, or reputable press reporting a verifiable event.
- **[Vendor claim]**: a company's own marketing about its product or results.
- **[Anecdote]**: a practitioner forum post or a testimonial.
- **[Estimate]**: a third-party aggregator, market-research or blog figure that I could not check against primary data.

Thesis criteria used in every verdict: **C1** the AI assists and a human reviews/edits the output. **C2** the work is tied to making money (shipping, getting paid, winning or keeping customers, passing audits that gate revenue, saving billable expert time). **C3** the task stays tedious even for experts, or expertise never builds up (turnover, rotation, infrequent but mandatory, one person wearing many hats).

Method note: the session's web-search budget ran out partway through. Calibration/GR&R/SPC, building-product submittals (manufacturer side), and some welding and pricing details got less coverage than other areas, and the Gaps sections say so.

---

## Q1. Cross-cutting context: labor scarcity, turnover, and the 2026–2029 standards calendar

### Takeaway
There is solid evidence of a persistent quality-workforce shortage, but it comes from large-firm surveys. I found no direct data on quality-staff turnover at small firms. Several regulatory and standards events from 2025–2027 create bursts of infrequent but mandatory work, which is a good fit for C3: ISO 9001:2026, FDA QMSR, TSCA PFAS reporting, Minnesota PFAS reporting, and yearly CMRT template updates.

### Cited Findings
- [Fact, survey] ETQ's annual "Pulse of Quality in Manufacturing" 2025 survey reported a widespread labor shortage that continues into 2025, with growing use of automation, AI and predictive analytics to offset it. — [ETQ press release](https://www.etq.com/press-releases/annual-etq-pulse-of-quality-in-manufacturing-survey-reveals-widespread-labor-shortage-continues-in-2025-growing-use-of-automation-ai-to-address-it)
- [Fact, survey] A newer ETQ survey of 2,263 quality professionals at manufacturers with 1,000+ employees in the US, UK and Germany found that 74% are still dealing with a workforce shortage or skills gap. The sample is large firms only. — [Modern Casting](https://www.moderncasting.com/node/2999)
- [Estimate] Average annual turnover in US manufacturing is about 26–28% (2025 data, per an HR-software vendor blog, not verified). — [FirstHR](https://firsthr.app/blog/onboarding/manufacturing-industry-turnover-rate)
- [Fact] Calendar of mandatory documentation events (details and sources in the sections below):
  - ISO 9001:2026 was published 16 Sep 2026, with roughly a 36-month transition to about Sep 2029.
  - FDA QMSR took effect 2 Feb 2026.
  - The TSCA 8(a)(7) PFAS reporting window now starts by 31 Jan 2027 at the latest.
  - Minnesota PFAS-in-products initial reports were due 15 Sep 2026, with extensions to 14 Dec 2026.
  - RMI moved from CMRT 6.5 (Apr 2025) to CMRT 6.6 for 2026 reporting cycles.
  - FSMA 204 compliance was pushed to 20 Jul 2028.

### Inferences
- Turnover of the single quality person at small suppliers is plausible and widely assumed, but I did not find a direct source. The stronger C3 argument, which the sources do support, is infrequency plus constant template and regulation churn. Even an experienced person meets each new template (CMRT 6.6, a new state PFAS law, ISO 9001:2026) for the first time.
- A second strong C3 argument is that some tasks stay tedious even for experts. Cross-checking consistency across 10+ linked documents (PPAP), line-by-line spec comparison (MTRs, submittals), and re-keying data into customer portals (IMDS, CMRT) all stay slow after the person is fluent.

### Gaps
- No primary data on quality-manager tenure or turnover at firms with fewer than 100 employees. ASQ or industry-association workforce data would be needed. A StealthAgents page cites an "ASQ survey" tenure figure, but I could not verify it, so I excluded it.
- No data on the share of small manufacturers whose quality, compliance, EHS and purchasing are run by one person.

---

## Q2. Automotive PPAP/APQP and IATF 16949 for small Tier 2/3 suppliers

### Takeaway
PPAP is the clearest case where documentation gates revenue: production shipments cannot start until the customer approves the PSW. Each Level 3 package needs 10+ documents that must agree with each other. AI so far sits mostly on the reviewer (OEM/Tier 1) side (Omnex PPAPValidator.AI). I found no self-serve AI tool that helps a small supplier build and self-check its own package, so that looks like a gap.

### Cited Findings
**Who does the work, how often, how long**
- [Anecdote] On Elsmar Cove, a relatively new quality tech at a small Tier 1 said that "every possible supplier is coming out of the woodwork asking for level 3's." I could not confirm which thread this excerpt comes from. — [Elsmar thread A](https://elsmar.com/elsmarqualityforum/threads/ppap-vs-annual-layout-confusion-customer-emergency-ppap-request.15157/); [Elsmar thread B](https://elsmar.com/elsmarqualityforum/threads/6230/)
- [Anecdote] Newcomers to PPAP on Elsmar get pointed to checklists. A "PPAP virgin to PPAP coordinator" thread shows people being assigned PPAP duty with no prior experience. — [Elsmar](https://elsmar.com/elsmarqualityforum/threads/from-ppap-virgin-to-ppap-coordinator-suggestions-on-jump-starting.24560/page-2)
- [Vendor claim] Resubmission is triggered by a tooling move, a process change, or 12 months of inactivity, so PPAP work recurs and does not happen only once. — [Empower QLM](https://www.empowerqlm.com/common-ppap-pain-points/)
- [Vendor claim] Omnex says a manual PPAP review takes about 6–8 hours and 3–4 engineers. Its AI cuts this to 15–20 minutes and 1 engineer, and the error rate drops from 10–15% to under 1%. — [Omnex PPAPValidator.AI](https://www.omnexsystems.com/ai/ppapvalidator-ai)
- [Anecdote] Level 3 cost estimates on Elsmar:
  - $1,400–$4,400 (2003)
  - a $2,500 baseline plus $25–50/hr for capability studies (2003)
  - "$4K–$5K per item" (2010)
  - Cost depends on submission level, part complexity, and unplanned customer-specific requirements.
  - Source: [Elsmar "Cost of PPAP"](https://elsmar.com/elsmarqualityforum/threads/cost-of-ppap-what-is-the-average-cost-is-there-a-yearly-cost.6411/)
- [Vendor claim] Level 3 costs the supplier "$3,000–8,000 in labor, measurement, and sample production." — [Boxu Mold comparison page](https://www.boxumold.com/en/comparisons/ppap-level-3-vs-level-5)
- [Anecdote] One shop rolls a $250–$500 "paperwork preparation" charge into the per-piece price. This is a search excerpt and the thread attribution is unverified. — [Elsmar "Who charges for PPAPs"](https://elsmar.com/elsmarqualityforum/threads/who-charges-for-ppaps-is-it-common-to-charge-customers-for-ppaps.259/)

**Money link**
- [Fact, supplier-facing documents] Production quantities may not ship before customer PPAP approval. Interim approval allows only limited-time or limited-quantity shipments. Sending parts before PPAP usually needs a temporary deviation. Customers require written approval of deviations before first shipment. — [Littelfuse supplier PPAP doc](https://www.littelfuse.com/~/media/15259A6205AC414A9C1EDBC0A72624E4.pdf); [Appareo supplier PPAP procedure](https://appareo.com/wp-content/uploads/2018/10/PPAP-for-Suppliers-procedure.pdf); [Wikipedia: PPAP](https://en.wikipedia.org/wiki/Production_part_approval_process)
- [Fact, secondary] Under the 4th edition, "the organization shall submit for PPAP approval prior to the first production shipment." I could not confirm the current AIAG edition or its wording. — [Wikipedia: PPAP](https://en.wikipedia.org/wiki/Production_part_approval_process)

**Number of firms**
- [Fact] IATF 16949 certified sites worldwide were 93,713 as of 23 Apr 2026 (VDA QMC):

  | Country | Certified sites |
  |---|---|
  | China | 63,293 |
  | India | 7,820 |
  | South Korea | 5,349 |
  | USA | 3,699 |
  | Germany | 2,681 |
  | Mexico | 2,369 |
  | Japan | 1,921 |

  Source: [VDA QMC IATF statistics](https://vda-qmc.de/en/iatf/zertifikate-weltweit/)
- [Estimate, conflicting] An Alibaba seller blog claims 105,397 sites as of Jan 2026, and Quality Magazine says the total passed 100,000 in 2024–25. Both conflict with VDA QMC's 93,713, which I treat as more authoritative. — [Alibaba blog](https://seller.alibaba.com/blogs/2026/southeast-asia/automotive/iatf-16949-certification-guide-alibaba-b2b); [Quality Magazine](https://www.qualitymag.com/articles/99007-the-iatf-16949-rules-6th-editions-impact-on-certification-compliance-auditing)
- [Fact] Korea: 690 Tier 1 and Tier 2 suppliers of Hyundai Motor Group operate abroad (2023 data). Direct suppliers to Hyundai/Kia reached ₩90 trillion in combined sales. — [Korea Times, Jan 2025](https://www.koreatimes.co.kr/amp/business/companies/20250121/direct-suppliers-to-hyundai-motor-kia-achieve-w90-tril-in-combined-sales-for-1st-time)
- [Fact] KAICA data show the number of Korean auto-parts makers has steadily declined from 2013 to 2023 (exact figures paywalled). — [Statista](https://www.statista.com/statistics/1135491)
- [Fact, credit insurer] Korean Tier 2 and Tier 3 firms often lack financial strength and technological skills. — [Atradius](https://atradius.us/knowledge-and-research/reports/automotive-industry-trends-south-korea---2021)
- [Fact, press] Hyundai/Kia have not built supportive relationships with lower-tier suppliers. — [JoongAng Daily](https://www.koreajoongangdaily.com/business/hyundai-kia-broaden-support-for-suppliers/11100608)

**Competitors and AI entrants**
- [Vendor claim] Omnex PPAPValidator.AI:
  - Built on its "O-BOT" engine.
  - Links drawing dimensions and key characteristics to the dimensional report.
  - Checks consistency across the process flow, PFMEA and Control Plan.
  - Evaluates MSA and Cp/Cpk against AIAG rules.
  - Applies 300+ configurable rules and uses OpenAI GPT and Google Gemini.
  - Targets OEMs, Tier 1s and Tier 2s, with a supplier portal for pre-submission checks.
  - Claims $250K–$500K a year in savings for suppliers handling 500+ PPAPs a year.
  - The quality team reviews and finalizes the output.
  - No public pricing.
  - Source: [Omnex](https://www.omnexsystems.com/ai/ppapvalidator-ai)
- [Vendor claim] Omnex "Plantech" pairs AI automation with outsourced supplier-quality experts. — [Omnex webinar](https://www.omnexsystems.com/webinar/breaking-the-drudgery-of-ppap-with-plantech-ai)
- [Vendor claim] Omnex is also pitching AI PPAP review to medical-device supplier quality teams, which suggests PPAP is spreading beyond automotive. — [Omnex whitepaper](https://www.omnexsystems.com/whitepaper/ai-powered-ppap-reviews-medical-device-supplier-quality)
- [Vendor claim] Other entrants:
  - Empower QLM's PPAP module moves execution ownership to suppliers. — [Empower QLM](https://www.empowerqlm.com/common-ppap-pain-points/)
  - iFactory markets "AI-assisted PPAP documentation." — [iFactory](https://ifactoryapp.com/industries/automotive-manufacturing/automotive-ppap-production-part-approval-process-ai)
- [Estimate, low confidence] A Chinese stock-news article (6 Aug 2026, apparently AI-generated) describes a "rules engine plus large model" PPAP pre-review tool from 金现代. — [10jqka](https://stock.10jqka.com.cn/20260806/c678730615.shtml)
- [Fact] Capterra's "PPAP Software" listing targets small businesses, but its only review dates from 2017, which suggests a stagnant small-supplier tool market. — [Capterra](https://www.capterra.com/p/163856/PPAP-Software/)

### Inferences
- Verdict:
  - **C1 High.** The supplier signs the PSW, the customer approves it, and the PFMEA and Control Plan must be owned by the cross-functional team. AI can only draft and check.
  - **C2 High.** There is a hard ship gate. Rejected packages delay start of production and therefore invoicing. Anecdotal Level 3 cost is $1.4K–$8K per part number, so the money link is concrete.
  - **C3 Medium-High.** High-volume Tier 1s become fluent, but small Tier 2/3s submit irregularly as programs launch or change. Cross-checking consistency (PFD, PFMEA, CP, ballooned drawing, dimensional results, MSA, Cpk) stays tedious even for experts.
- The gap: Omnex is aimed at the reviewer/OEM side and enterprise budgets. A self-serve supplier-side "PPAP builder and pre-flight checker" could be sold to small Tier 2/3s, and also to medtech, heavy-truck, agricultural and industrial suppliers whose customers now ask for PPAP. Inputs would be the customer drawing, the CMM report and existing FMEA templates. Outputs would be an editable PSW, PFD, PFMEA and CP drafts, plus a ballooned drawing with a dimensional-results table and an inconsistency report.
- Korea (5,349 IATF sites, a weak lower-tier ecosystem) and the US (3,699) are the most interesting non-China markets. Japan's low IATF count (1,921) suggests Japanese OEMs rely on their own supplier-quality systems, so PPAP-specific demand there may be weaker. This is inference only.
- The sources were mostly unsorted search excerpts, so I avoided naming the 18 AIAG elements individually.

### Gaps
- Current AIAG PPAP edition and its exact shipment clause, and whether a 5th edition exists. I found only an unreliable forum mention.
- How many non-IATF Tier 2/3 suppliers still receive PPAP requests (US, EU, KR, JP). No source.
- Pricing for Omnex and Empower PPAP modules. Not public.
- Hours to prepare a package, as opposed to review it. No sourced figure; the forum cost figures are 13–23 years old.

---

## Q3. Supplier quality: SCAR / 8D corrective-action responses and supplier onboarding

### Takeaway
SCAR/8D responses are deadline-driven, infrequent for any one small supplier, and come in customer-specific formats. The AI tools found so far (Omnex Problem Solver.AI, iFactory) mostly serve the customer that issues and scores SCARs. A supplier-side 8D drafting assistant would bundle naturally with a PPAP tool.

### Cited Findings
- [Fact, guide] A SCAR requires containment, root-cause analysis, and proof that a permanent fix works. Example deadlines are root cause and corrective-action plan within 10 business days, and full response within 30 calendar days. — [QMS2GO SCAR guide](https://qms2go.com/learn/articles/scar-management-guide)
- [Fact] Customers prescribe the format. Graco, for example, requires a complete 8D by the due date. — [Graco supplier SCAR page](https://graco.com/us/en/suppliers/corrective-action-request.html)
- [Vendor claim] iFactory's portal has AI score supplier 8D quality. It flags restated defects, missing escape causes, "retrain the operator" actions and missing evidence, and feeds the result into supplier scorecards. — [iFactory](https://ifactoryapp.com/quality-control-management/supplier-corrective-action-request-process-portal)
- [Vendor claim] Omnex Problem Solver.AI offers "automated 8D generation, root cause analysis." — [SoftwareOne listing](https://platform.softwareone.com/product/problem-solverai/PCP-4939-8683)
- [Vendor claim] An open "skill" drafts an OEM-ready 8D from an NCR or SCAR, and the quality engineer of record signs off before it is sent. — [ClawHub skill](https://clawhub.ai/archlab-space/eight-d-corrective-action-report)
- [Vendor claim] A document-AI vendor extracts data from incoming 8D and NCR reports for supplier-quality teams. — [Algoscale DocumentIQ](https://documentiq.algoscale.com/blog/automating-8d-corrective-action-ncr-report-extraction-manufacturing-supplier-quality)
- [Anecdote/expert critique] SCARs are often misused, with "operator retraining" given as the action whatever the actual root cause. This explains why customer-side AI now scores root-cause quality. — [QMS2GO](https://qms2go.com/learn/articles/scar-management-guide)

### Inferences
- Verdict:
  - **C1 High.** A named engineer owns and signs the response, and AI drafts the containment and root-cause structure.
  - **C2 Medium-High.** Late or weak 8Ds feed supplier scorecards, which affect new-business awards and retention. That link is inferred from the scorecard mechanism; I found no direct statistic.
  - **C3 High.** A small supplier may get only a few SCARs a year, each in a different customer format, with a 10-day clock.
- As customer-side AI starts scoring 8D quality (iFactory), suppliers will need their own AI to pre-check responses. That is a good assistive wedge, especially paired with PPAP (shared data: PFMEA, Control Plan, process flow).
- Supplier onboarding questionnaires (quality, cyber, ESG, conflict minerals) overlap with Q5. The ESG and cyber parts belong to the other researcher.

### Gaps
- Number of SCARs a typical small supplier receives per year. No source.
- Pricing of Omnex Problem Solver.AI and iFactory. Not found.

---

## Q4. Material certificate (MTR) verification against spec and PO, and Certificate of Conformance generation

### Takeaway
Checking MTRs against ASTM/ASME/API specs and PO flowdowns is high-volume, rule-heavy and tedious, and for distributors it directly gates quoting and shipping. AI entrants have appeared by mid-2026 (Apolo's MTR CrossCheck and MTR.AI, L&T's AiKno), but they are early, and the self-serve end for small fabricators and machine shops looks thin.

### Cited Findings
- [Vendor claim] Apolo MTR CrossCheck:
  - Validates MTRs "document-against-spec" for ASTM, ASME and API 5L/5CT/5B, plus internal specs and customer acceptance rules.
  - Runs on-premises with open-weight models and is integrated by a forward-deployed engineer.
  - Targets mid-market distributors and service centers "where MTR clearance gates quotes."
  - Comparison dated June 2026.
  - Source: [Apolo comparison page](https://www.apolo.us/mtr-vs-mtr-ai)
- [Vendor claim] MTR.AI:
  - Hosted and self-serve, with batch upload.
  - Built-in rules for API 5L/5CT, ASTM A106/A516/A312 and ASME SA-series.
  - Calculates carbon equivalent and converts units.
  - Accepts degraded scans and mixed languages.
  - Offers GPS-verified photo evidence linking the cert to the physical material.
  - Developer not named on Apolo's page; no pricing.
  - Source: [Apolo comparison page](https://www.apolo.us/mtr-vs-mtr-ai)
- [Vendor claim] Apolo's oil and gas page says the tool extracts chemistry, mechanicals, dimensions and tolerances and compares each parameter with internal specs. — [Apolo oil and gas](https://apolo.us/oil-and-gas)
- [Vendor claim] L&T Technology Services offers an "AiKno-based MTR Validation Tool" to save inspectors time. — [L&T slide deck (Microsoft CMS)](https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RW1hy33)
- [Vendor claim] WeldStack (Product Hunt launch) uses an AI scanner to read certificates and material datasheets so nobody retypes them. — [Product Hunt](https://www.producthunt.com/p/weldstack)
- [Fact, press] Axiomatic AI raised an $18M seed (Mar 2026) for "verification" of engineering-focused AI. It is not MTR-specific but shows investor interest in engineering verification. — [Axios Pro](https://www.axios.com/pro/all-deals/2026/03/09/axiomatic-engineering-verification-seed-round)
- [Estimate] There are about 17,100 US machine shops (NAICS 332710), 32% of them in CA, TX, OH and MI. — [Vertical IQ](https://verticaliq.com/?p=3669)
- [Fact] BLS OES put 2016 employment in NAICS 332710 at 276,240. — [BLS OES](https://www.bls.gov/oes/2016/may/naics5_332710.htm)
- [Fact] Machine-shop employment index was 95.4 in 2024, down from 98.5 in 2023 (2017=100). — [FRED](https://fred.stlouisfed.org/series/IPUEN332710W010000000)

### Inferences
- Verdict:
  - **C1 High.** A receiving inspector or quality manager accepts or rejects the cert, and AI pre-fills a pass/fail matrix with cited values.
  - **C2 High.** For distributors, MTR clearance gates quotes (per Apolo). For fabricators and job shops, a wrong or nonconforming cert means rejected shipments, NCRs and withheld payment in regulated chains (ASME, API, aerospace, defense). The CoC is often a required shipping document.
  - **C3 Medium.** Receiving inspectors handle certs daily and become fluent, but the work stays tedious at every skill level: hundreds of spec and grade variants, PO-specific flowdowns (DFARS specialty metals, melt country, heat-treat condition), unit conversions and carbon-equivalent maths. Small shops where the owner or a buyer checks certs occasionally fit C3 fully.
- There is strong synergy with the prior aerospace-FAI study: AS9102 Form 2 needs material and special-process cert traceability. One "certs + CoC + FAI" product could serve aerospace, defense, oil and gas and ASME shops.
- Apolo's split (on-prem with an FDE for mid-market, self-serve for others) suggests the self-serve SMB tier is not well served yet.

### Gaps
- Pricing of MTR.AI and Apolo. Not published.
- Number of US/EU steel service centers and distributors. Not searched before the budget ran out.
- No sources gathered on CoC-generation tools specifically, or on how often PO flowdowns are missed.

---

## Q5. Chemical and material compliance declarations (PFAS under TSCA 8(a)(7) and state laws, RoHS/REACH, CMRT/EMRT, IMDS, chemSHERPA)

### Takeaway
This is the area with the most infrequent, changing, mandatory work. Templates change yearly, deadlines keep moving, and Japan's regulated-substance list is expanding fast. Small multi-customer suppliers bear the cost. The main threat is Assent, which offers suppliers a free platform with an AI "Request Manager," along with iPoint, Z2Data and Certivo. A differentiated tool would extract data from the supplier's own BOM and sub-supplier SDS and CoCs and pre-fill customer-specific templates.

### Cited Findings
**US PFAS (TSCA 8(a)(7))**
- [Fact] EPA's final rule of 8 Apr 2026 moved the reporting start to 31 Jan 2027, or 60 days after the effective date of a forthcoming substantive revision, whichever is earlier. The window is 6 months for most reporters. Small manufacturers reporting only as article importers get 12 months. — [Faegre Drinker, Apr 2026](https://www.faegredrinker.com/en/insights/publications/2026/4/epa-extends-pfas-reporting-start-date-under-tsca-section-8a7)
- [Fact] Anyone who manufactured or imported PFAS or PFAS-containing articles in any year since 1 Jan 2011 must report. EPA proposed narrowing the scope on 13 Nov 2025 (comments closed 29 Dec 2025), and a final scope rule is expected later in 2026. — [Faegre Drinker](https://www.faegredrinker.com/en/insights/publications/2026/4/epa-extends-pfas-reporting-start-date-under-tsca-section-8a7); [EPA TSCA 8(a)(7) page](https://www.epa.gov/node/293395)

**US state PFAS (Minnesota Amara's Law)**
- [Fact] Initial PFAS-in-products reports were due 1 Jan 2026, then moved to 1 Jul 2026, then to 15 Sep 2026. A one-time extension to 14 Dec 2026 was available on request by 16 Aug 2026. Reports are filed in the PRISM system. Manufacturers that submit all available data and keep records of their efforts to get supply-chain data are considered compliant. — [Beveridge & Diamond](https://www.bdlaw.com/publications/minnesota-extends-pfas-in-products-reporting-deadline-to-september-15-2026/); [Faegre Drinker](https://www.faegredrinker.com/en/insights/publications/2026/4/minnesota-pfas-reporting-deadline-extension-and-enhanced-support); [Pillsbury](https://www.pillsburylaw.com/en/news-and-insights/minnesota-extends-initial-pfas-deadline-september-15-2026.html)

**Conflict minerals (CMRT/EMRT)**
- [Fact] RMI released CMRT 6.5 and EMRT 2.0 on 25 Apr 2025, replacing CMRT 6.4 (Apr 2024). The main change was updated smelter lists. — [iPoint](https://www.ipoint-systems.com/news/details/rmi-releases-cmrt-65/)
- [Fact, secondary, Aug 2026] Companies starting a new reporting cycle in 2026 should use CMRT 6.6. I found no detail on what changed. — [IntegrityNext](https://integritynext.com/resources/blog/article/cmrt-a-practical-guide-to-the-conflict-minerals-reporting-template)

**Assent**
- [Vendor claim] Assent's supplier platform is free, with unlimited users. — [Assent](https://www.assent.com/?p=84282)
- [Vendor claim] One customer saw a 500% year-over-year rise in data requests. — [Assent](https://www.assent.com/?p=105279)
- [Vendor claim] Suppliers answer requests 13x faster (92% time saving). — [BusinessWire, Mar 2025](https://www.businesswire.com/news/home/20250304258091/en/)
- [Vendor claim] Assent launched an AI-native "Request Manager" in Dec 2025, where suppliers forward customer emails for handling. — [Food Logistics](https://www.foodlogistics.com/home/news/22956907/assent-assents-ainative-solution-to-address-gaps-in-sustainability-response-management-processes)
- [Vendor claim] A distributor product followed in Aug 2026. — [BusinessWire, Aug 2026](https://www.businesswire.com/news/home/20260811293701/en/)

**IMDS (automotive)**
- [Fact] IMDS is free for suppliers to use. — [IMDS guideline (Iveco, 26 Mar 2026)](https://public.mdsystem.com/documents/d/imds-public-pages/imds-guideline-26-03-2026-_-iveco-group-pdf)
- [Fact, press] The real costs are labor, training and consultants. Weeklong training can be cost-prohibitive for small firms, and outsourcing cost grows with part count. — [WardsAuto](https://www.wardsauto.com/ideaxchange/customers-demanding-imds-you-have-options); [Plastics Today](https://www.plasticstoday.com/automotive/my-customer-wants-me-submit-imds-what-do-i-do-now)
- [Fact] Some OEMs require the supplier to bear IMDS cost (Iveco, for service-only parts). — [Iveco IMDS guideline](https://public.mdsystem.com/documents/d/imds-public-pages/imds-guideline-26-03-2026-_-iveco-group-pdf)

**Japan (chemSHERPA)**
- [Fact, think-tank column] Japan's chemical-management compliance costs fall on SMEs as fixed costs. The number of regulated substances (SDS/labeling obligations) was 896 in Apr 2024 and about 1,600 in Apr 2025, with about 2,900 more being added in stages from Apr 2026. — [ISVD column](https://isvd.or.jp/en/columns/sds-chemical-management-sme-burden)
- [Fact] chemSHERPA, METI's supply-chain chemical information scheme (IEC 62474-based XML), is required by Japanese customers such as Epson. Its data-entry tool V2R1.03.0 was released 24 Apr 2026. — [METI overview](https://www.meti.go.jp/policy/chemical_management/other/douga_gaiyou_EN.pdf); [CMP Consortium](https://cmp-consortium.com/english); [Epson supplier page](https://global.epson.com/supplier/en/green-purchasing/chemical-substances.html)
- [Vendor claim, undated] Upstream and mid-stream makers face "excessive burden" from supporting a different scheme for each customer. — [Fujitsu press release](https://www.acnnewswire.com/press-release/english/33381/fujitsu-launches-green-procurement-solutions-supporting-new-chemsherpa-information-transmission-scheme)

### Inferences
- Verdict:
  - **C1 High.** The supplier attests to its declaration. AI extracts data from BOMs, sub-supplier SDS, RoHS/REACH certs and CMRTs, and a human confirms before submitting.
  - **C2 Medium.** Failing to respond blocks supplier qualification or risks delisting, and legal deadlines apply (TSCA, MN). The money link is "keep the customer and avoid penalties," not new revenue.
  - **C3 High.** The work is annual or one-time, template versions churn (CMRT 6.4, 6.5, 6.6), new jurisdictions keep appearing, and the job rotates among quality, purchasing and engineering.
- Competitive risk is high. Assent gives suppliers a free AI tool, paid for by its large-OEM customers. A paid self-serve product would need to win where Assent's network doesn't reach: suppliers serving many small or mid-sized customers with their own Excel templates, Japanese customers using chemSHERPA, Korean or Japanese localization, and pulling evidence from the supplier's own document pile.
- Overlap: PFAS and conflict minerals sit next to ESG reporting, which is the other researcher's scope. The manufacturing-specific core here is product-level material declarations (IMDS, chemSHERPA, RoHS/REACH SCIP, PFAS).

### Gaps
- Pricing for iPoint, Z2Data, Certivo and Source Intelligence. Not retrieved.
- Number of firms affected by TSCA 8(a)(7) (EPA's economic analysis would hold this). Not retrieved.
- EU REACH SCIP and the EU PFAS restriction timeline. Not searched before the budget ran out.
- Korea's K-REACH supply-chain declaration burden. Not searched.

---

## Q6. Medical device documentation for small contract manufacturers (ISO 13485, FDA QMSR, DHF/DMR/DHR)

### Takeaway
QMSR took effect on 2 Feb 2026, and FDA refused to give small firms extra time. US-only small manufacturers with no ISO 13485 history are expected to struggle. But eQMS is a crowded, well-funded market: Greenlight Guru, Qualio, Ketryx ($39M Series B in 2025) and others. Validation expectations also raise the cost of entry for a small software company.

### Cited Findings
- [Fact, press] QMSR took effect 2 Feb 2026, replacing the QSR and aligning with ISO 13485:2016.
  - FDA inspections now follow Compliance Program 7382.850, published 30 Jan 2026, instead of QSIT.
  - Expected strugglers are small US-focused companies with little international experience, and combination-product makers.
  - FDA has lost specialized inspectors, and a "growing-in period" is expected.
  - Source: [RAPS, 2 Feb 2026](https://www.raps.org/resource/qmsr-is-live-expert-says-new-rule-may-be-challengi.html)
- [Fact, law-firm summary] FDA set a 2-year transition but declined to give small or mid-size firms additional time. — [Ropes & Gray](https://ropesgray.com/en/insights/alerts/2024/02/top-10-takeaways-from-fdas-revised-quality-system-requirements-for-medical-devices)
- [Estimate] An analysis of the FDA dataset counts 24,795 unique FDA-registered device establishments, nearly 3 in 5 of them outside the US. — [MedDeviceGuide](https://meddeviceguide.com/blog/fda-device-establishment-registration-global-manufacturing-footprint-analysis-2026)
- [Fact, 2020 data] There were 1,186 US contract-manufacturing sites, 41% of FDA-registered establishments in the dataset presented. — [National Academies slide](https://www.nationalacademies.org/event/06-09-2021/docs/DB6F2CDC533CA1D124041CD0358287B3BEB958672D75?noSaveAs=1)
- [Estimate] Greenlight Guru pricing:
  - starts around $15K/yr, rising to $50–60K/yr for mid-size [OpenRegulatory](https://openregulatory.com/articles/greenlight-guru-price)
  - Vendr median about $44K/yr [rfp.wiki](https://www.rfp.wiki/specialty-industries/manufacturing/quality-management-system-software/greenlight-guru/qualio)
  - Capterra lists $25,000 starting [Capterra](https://capterra.com/p/140578/greenlight-guru/)
- [Estimate] Qualio pricing: about $12K/yr per SelectHub, about $18K/yr license for 10 users and about $36K first year with onboarding per ITQlick. — [SelectHub](https://www.selecthub.com/quality-management-software/qualio-vs-greenlight-guru/); [ITQlick](https://www.itqlick.com/qualio/pricing)
- [Fact, press] Ketryx raised a $39M Series B (4 Sep 2025, led by Transformation Capital), bringing total funding to more than $55M. Its AI agents automate validation, traceability and FDA/EU MDR documentation, and it claims 3 of the top 5 device makers as customers. — [SiliconANGLE](https://siliconangle.com/2025/09/04/ketryx-raises-39m-help-medical-device-makers-ship-safer-products-faster/); [Tech.eu](https://tech.eu/2025/09/04/ketryx-raises-39m-to-advance-ai-compliance-in-life-sciences/)
- [Vendor claim] Omnex is extending AI PPAP review into medtech supplier quality, so medtech OEMs are pushing PPAP-style packages onto their contract manufacturers. — [Omnex whitepaper](https://www.omnexsystems.com/whitepaper/ai-powered-ppap-reviews-medical-device-supplier-quality)

### Inferences
- Verdict:
  - **C1 High.** Design-control and DHR records must be reviewed and approved by humans.
  - **C2 Medium-High.** OEM audits and ISO 13485 certificates gate CM contracts, and FDA findings threaten them. Much documentation, though (design history files), is cost-of-compliance and not tied directly to revenue.
  - **C3 Medium.** The QMSR transition is a one-time burst that is largely over by Nov 2026. Ongoing DHR, CAPA and complaint work becomes routine for a dedicated QA person.
- Market crowding and regulated-software validation expectations (customers must validate QMS software under ISO 13485 §4.1.6) make this a poor first target for a small budget-constrained SaaS. A narrower wedge, such as supplier PPAP-style packages for medtech CMs or DHR review, could be added later as an extension of Q2/Q4.

### Gaps
- Exact text of QMSR changes (DHF/DMR/DHR terminology, whether internal audit and management review records are now inspectable). Not verified from FDA primary text this session.
- Count of small (fewer than 50 employees) US device CMs. Only 2020 data found.
- ISO 13485 consultant rates. Not found.

---

## Q7. Welding procedure documentation (WPS/PQR/WPQ under AWS D1.1 and ASME IX), NDT reports, pressure equipment

### Takeaway
There is a mature but non-AI niche of welding-documentation software (CEI ProWrite, Weldnote/InduSuite, weldXpert, WeldOffice, TWI Welding Qualifier). I found no tool that uses AI to draft or check WPS documents; the only AI is cert scanning (WeldStack). The market is small and specialized: about 6,800 ASME BPVC certificate holders, a secondary figure.

### Cited Findings
- [Vendor claim] Weldnote creates a WPS from an existing PQR and generates PQRs. It is "now part of InduSuite." — [Weldnote PQR](https://www.weldnote.com/en/pqr-management.html); [Weldnote WPS](https://weldnote.com/en/wps-management.html)
- [Vendor claim] weldXpert generates WPS documents for ISO, ASME IX and AWS D1.1. — [Capterra weldXpert](https://www.capterra.com/p/10047360/weldXpert/)
- [Fact/vendor] CEI ProWrite:
  - Pricing is not published (per-feature model, 14-day free trial).
  - Base packages are ASME IX or AWS D1.1, with add-on code packages.
  - The 2025 Section IX code year was added in release 2025.9.
  - Cloud and on-prem versions exist, and Capterra lists target firms of 11–500 employees.
  - Sources: [G2](https://www.g2.com/products/prowrite/pricing); [CEI release notes](https://info.thinkcei.com/software-updates/prowrite-2025.9.0.6532-release-notes); [CEI site](https://weldingfabrication.thinkcei.com/); [Capterra](https://www.capterra.ca/software/204027/prowrite)
- [Vendor claim] Other tools:
  - TWI sells Welding Qualifier software. — [TWI](https://www.twi-global.com/locations/middle-east/technical-services/twi-software/twi-software-welding/welding-qualifier)
  - Rishabh built a custom cloud tool that automates WPS-from-PQR creation under ASME. — [Rishabh case study](https://www.rishabhsoft.com/case-studies/automation-in-welding-process)
- [Vendor claim] WeldStack's AI scanner reads certificates and material datasheets. — [Product Hunt](https://www.producthunt.com/p/weldstack)
- [Anecdote, 2007] Eng-Tips engineers said software "won't write a WPS for you" and that procedures should be written and reviewed by hand, with software useful for organization. — [Eng-Tips](https://eng-tips.com/threads/pqr-and-wps-software.337935)
- [Estimate] There are more than 6,800 certificate holders in the ASME BPVC certification program (all stamps, not just U). — [Wermac](https://wermac.org/societies/asme_certification.html)
- [Fact] A Sandia study of N-stamps (1989–2020) found US vendors hold the most and China ranks second in recent years. — [Sandia](https://www.sandia.gov/research/publications/details/global-trends-of-asme-n-stamp-certifications-for-nuclear-component-vendors-2021-08-17/)

### Inferences
- Verdict:
  - **C1 High.** A WPS must be supported by a qualified PQR, which is a physical test, and signed by the manufacturer. AI can only draft a WPS from a PQR, check essential and supplementary variables against ASME IX or AWS D1.1 tables, and flag WPQ continuity lapses.
  - **C2 Medium.** Qualified procedures are required to bid on and perform code work and to keep ASME stamps. But a shop's WPS library is reused for years, so day-to-day work isn't revenue-gating.
  - **C3 Medium.** Welding engineers and CWIs become fluent. Small fab shops often lack one and use consultants. Welder turnover makes WPQ continuity tracking (the 6-month rule) a recurring chore.
- There is no AI incumbent, which is an opportunity, but the market is small, practitioners are skeptical, and incumbents are entrenched. It works better as an add-on to an MTR or cert verification product for fabricators (Q4) than as a standalone.

### Gaps
- Cost of PQR qualification testing and consultant fees for WPS development. The search budget ran out before I could look.
- Number of AWS D1.1 structural fabricators and AISC-certified shops. Not searched.
- NDT report automation and EU PED/EN ISO 15614 tools. Not covered.

---

## Q8. Job-shop RFQ quoting from drawings

### Takeaway
This has the strongest money link of any candidate (quotes are revenue), but by late 2026 it is the most crowded and best-funded area. Paperless Parts has AI requirements review, and 2026 seed rounds went to Uptool, Forgepoint and Toolpath, with CloudNC's Quote Agent on top. C3 is weak because a shop's estimator becomes fluent.

### Cited Findings
- [Fact] Paperless Parts raised a $30M Series B in Sep 2021 led by OpenView. I found no later round. — [BusinessWire](https://www.businesswire.com/news/home/20210913005163/en/Paperless-Parts-Announces-30M-Series-B-Funding-Led-by-OpenView-Partners)
- [Vendor claim] Paperless Parts AI:
  - "Wingman" launched in Apr 2025.
  - "Requirements Review" (announced 8 Sep 2025, general availability planned for Oct 2025) highlights GD&T, tolerances, notes and specs that drive cost, and builds rules from senior estimators' know-how.
  - Estimators resolve flagged items, with an audit history.
  - The company processes 10M drawing pages a year.
  - Source: [Paperless Parts press release](https://www.paperlessparts.com/press/paperless-parts-new-ai-features-surface-critical-requirements-helping-shops-quote-faster-with-confidence/)
- [Fact/vendor] Paperless Parts pricing is custom and not seat-based, with Growth, Professional and Enterprise tiers. Old 2019 list prices were $300/mo and $750/mo. — [Paperless Parts llms.txt](https://www.paperlessparts.com/llms.txt); [FitGap](https://us.fitgap.com/products/paperless-parts)
- [Fact, press] Uptool raised a $6M seed (10 Feb 2026; Khosla, Eclipse, Bessemer, Kleiner Perkins).
  - It ingests RFQ emails, CAD files, drawings and BOMs for small, high-mix shops.
  - Setup takes about an hour with no upfront cost.
  - A customer says it cut quoting time 10x [Anecdote/testimonial].
  - Source: [Pulse 2.0](https://pulse2.com/uptool-6-million-seed-funding-closed-for-helping-u-s-shops-quote-10x-faster)
- [Fact, press] Forgepoint raised a $9.8M seed (Primary Venture Partners, a16z speedrun) for "Frank," an AI inside-sales agent that reads RFQ drawings and applies rates and margins. Staff edit the draft before it goes out. A HackerNoon headline says "$98m," which is likely a typo. — [Signalbase](https://www.trysignalbase.com/news/funding/forgepoint-raises-9-8m-seed); [Sovereign Magazine](https://sovereignmagazine.com/article/ai-quoting-software-forgepoint); [HackerNoon](https://hackernoon.com/forgepoint-raises-$98m-from-primary-and-a16z-speedrun-to-give-factories-an-ai-sales-team)
- [Fact, press] Toolpath raised a $10M seed for job selection and cost estimation (date unconfirmed). — [Hypepotamus](https://hypepotamus.com/startup-news/with-10-million-seed-round-ai-startup-with-atl-roots-is-ready-to-update-the-machining-industry/)
- [Fact, press] CloudNC raised $20M (Sep 2026, at IMTS) and is launching "Quote Agent." Its CAM Assist is used by 1,000+ machine shops. — [The Next Web](https://thenextweb.com/news/cloudnc-20m-cam-assist-quote-agent); [Robotics 24/7](https://www.robotics247.com/article/imts-2026-cloudnc-raises-20m-to-expand-ai-tools-for-precision-machining)

### Inferences
- Verdict:
  - **C1 High.** The estimator edits and approves the quote.
  - **C2 Very High.** Quotes are revenue, and quote speed affects win rate.
  - **C3 Low-Medium.** A shop's estimator becomes fluent in its own cost model. The real pain is throughput and the retirement of senior estimators, not lack of expertise.
- At least five funded AI entrants appeared in 2025–2026 alongside the incumbent, so this is not a good fit for a small, budget-limited company unless it targets an underserved niche, such as non-English markets (Korea) or sheet-metal and fabrication-specific quoting. Paperless Parts' "requirements review" (spec and flowdown extraction from prints) overlaps with the FAI and MTR theses and confirms there is demand for print-to-requirements extraction.

### Gaps
- Japan's CADDi and other Asian quoting/drawing-AI players. Not searched this session.
- Win-rate data tied to quote speed. Not found.

---

## Q9. ISO 9001/14001/45001 internal audits, document control and the ISO 9001:2026 transition for SMEs

### Takeaway
ISO 9001:2026 was published on 16 Sep 2026, and about 36 months of transition follow, to roughly Sep 2029. That creates a bounded, once-a-decade, mandatory burst of gap analysis, document rewrites and internal audits for a very large population of certified SMEs. Expertise does not build up for once-a-decade work, so C3 is a near-perfect fit. C2 is real but indirect (certificates gate customer eligibility). Differentiation against consultants and generic QMS tools is the challenge.

### Cited Findings
- [Fact, certification bodies] ISO 9001:2026 was published 16 Sep 2026, with a 36-month transition ending about 15 Sep 2029. — [TÜV SÜD](https://www.tuvsud.com/en/knowledge-hub/articles/iso-9001-2026-everything-you-need-to-know-about-the-new-revision); [NSF](https://www.nsf.org/in/en/knowledge-library/iso-90012026-published-on-september-16-2026-what-quality-leaders-need-to-know); [LRQA](https://www.lrqa.com/en-us/latest-news/iso-9001-revision-update-publication-date-confirmed/)
- [Fact, conflicting] Some pages still described the standard as unpublished. They are likely out of date, but I did not confirm on ISO's own catalogue. — [qualityinconstruction.com](https://qualityinconstruction.com/iso-9001-2026-revision/)
- [Fact] The IAF sets transition rules, which were not yet published at the time of the cited article. 2015-edition certificates stay valid during the transition. — [Effivity](https://www.effivity.com/blog/iso-9001-2026-transition-timeline); [Amtivo](https://amtivo.com/us/resources/technical/iso-9001-revision/)
- [Estimate] The 2024 ISO Survey lists 1,474,118 ISO 9001 certificates, against 837,978 in 2023. The jump is attributed to a reporting change to IAF CertSearch, not real growth. Breakdowns are behind an IAF login. — [Manufacturing Lead Generation (secondary)](https://manufacturingleadgeneration.com/iso-certification-statistics-manufacturing/); [ISO Survey page](https://www.iso.org/the-iso-survey.html)
- [Vendor claim] Competitors are already marketing transition help to manufacturers, for example QMS2GO's "ISO 9001:2026 Transition Center for Manufacturers." — [QMS2GO](https://qms2go.com/iso-9001-2026)

### Inferences
- Verdict:
  - **C1 High.** The organization's own people approve gap analyses, revised procedures and audit reports, and the certification body audits them.
  - **C2 Medium.** Losing ISO 9001 certification shuts a supplier out of many customers' approved-vendor lists. But the transition is a cost-avoidance task, not a revenue driver, and AI-generated "ISO in a box" content is commoditized.
  - **C3 Very High.** It happens once a decade, small firms don't keep the expertise, and internal audits are done yearly, often by rotating staff.
- Best positioned as a feature of a broader "small-manufacturer quality copilot": the same document-understanding engine reads existing procedures, maps them to 2026 clauses, drafts redlines and generates internal-audit checklists. IATF 16949 and AS9100 internal audits are higher-value follow-ons, and IATF's own rules (Quality Magazine on the 6th edition) suggest those audit requirements are changing too.

### Gaps
- Country-level ISO 9001 counts for US, EU, KR and JP. They sit behind the IAF login and were not obtained.
- Consultant rates for transition projects. Not found.
- ISO 14001 and 45001 revision timing. Not searched.

---

## Q10. Construction/MEP submittals, RFIs, O&M manuals and building-product data sheets (manufacturer-adjacent)

### Takeaway
AI submittal tools have multiplied, but they mostly serve the reviewer side (GC, architect, engineer), with Nomic, Datagrid (a Procore company) and Ichi among them. The manufacturer and rep side, where packages get assembled from product data, has fewer visible tools (Parspec, Spec-ID), but coverage is thin because the search budget ran out.

### Cited Findings
- [Vendor claim] Nomic's AI cross-checks each submittal against drawings and specs. It claims manual line-by-line review takes 20–30 minutes per submittal and a flagged-item review takes 3–5 minutes. Pricing starts at $40/user/month with a 25-seat minimum (from Nomic's own comparison page). — [Nomic glossary](https://www.nomic.ai/glossary/how-to-automate-submittal-review); [Nomic comparison](https://www.nomic.ai/compare/best-ai-for-submittal-review)
- [Vendor claim] Datagrid notes that submitting series-level product data without naming the specific model and its configuration gets packages returned. This is the manufacturer-side pain. — [Datagrid guide](https://datagrid.com/guides/product-data-submittal-examples)
- [Fact, press] Investors favored AI for scheduling, permitting and preconstruction in Q4 2025. Buildcheck raised $5.9M for automated design review; it appears in roundups whose exact source attribution I did not verify. — [Construction Dive Q4 2025](https://www.constructiondive.com/news/construction-tech-funding-Q4-2025/808986/); [Yahoo/Construction Dive roundup](https://finance.yahoo.com/news/6-contech-startups-net-124-122142333.html)
- [Estimate, low quality] Parspec is listed as an AI tool for submittals. Details and funding are unverified. — [callin.io](https://callin.io/ai-tools/parspec)

### Inferences
- Verdict:
  - **C1 High.** Engineers approve submittals.
  - **C2 Medium-High.** For manufacturers and reps, submittal approval releases the order. Returned submittals delay revenue.
  - **C3 Medium-High.** Inside-sales and rep staff turn over, and every project spec differs.
- This is adjacent to manufacturing but is a construction-tech go-to-market (Procore and Autodesk ecosystems, with the reviewer side dominated by platforms). A manufacturer-side "submittal package builder" for small HVAC, electrical or plumbing product makers could fit the thesis, but I lack the data to rank it with confidence.

### Gaps
- Parspec and other manufacturer-side tools' funding and pricing. The search budget ran out.
- Number of building-product manufacturers and reps. Not searched.
- O&M manual generation tools. Not covered.

---

## Q11. Export-control self-classification (ECCN/ITAR jurisdiction) for manufacturers

### Takeaway
Self-classification is allowed, but the exporter carries the liability. AI classifiers exist, including a free one aimed at small manufacturers (ExChek). This overlaps with the trade/customs researcher's scope and is not a strong standalone wedge.

### Cited Findings
- [Fact, law-firm blog] Self-classification is permitted, but the burden of getting it right is on the exporter. BIS's CCATS route returns an official ECCN in about 4–6 weeks (practitioner estimate). — [Promise Legal](https://blog.promise.legal/startup-central/export-control-compliance-ai-hardware-startups/)
- [Vendor claim] ExChek is a free tool that proposes ECCNs from live eCFR data, with a human approving every classification. It targets small manufacturers. — [Product Hunt](https://www.producthunt.com/products/exchek-export-compliance-engine)
- [Vendor claim] Zonos (API-only AI export classification), GingerControl (ECCN plus HTS and Schedule B), and a UiPath "ECCN Manufacturing Classifier Agent." — [Zonos](https://zonos.com/docs/supply-chain/export-classification); [GingerControl](https://gingercontrol.com/blog/eccn-classification-export-controls); [UiPath Marketplace](https://marketplace.uipath.com/listings/eccn-manufacturing-classifier-agent)

### Inferences
- Verdict:
  - **C1 High.** The export control officer decides.
  - **C2 Medium.** Classification gates export shipments, but most small domestic manufacturers rarely export controlled items.
  - **C3 High.** Infrequent, and the rules change.
- Free tools already exist and the other researcher covers trade, so this is not ranked. It could be a feature in an RFQ or drawing-intake tool (flag ITAR or EAR markings on incoming prints).

### Gaps
- Number of small manufacturers that self-classify. No source.

---

## Q12. Food manufacturing HACCP/FSMA documentation

### Takeaway
AI HACCP plan builders already exist and are cheap (about $199/month), and FSMA 204's legal deadline moved to Jul 2028. That lowers urgency and leaves little room for a new entrant, although retailer contracts may enforce traceability earlier.

### Cited Findings
- [Fact] FDA will not enforce the FSMA 204 Food Traceability Rule before 20 Jul 2028, moved from 20 Jan 2026 under appropriations legislation. The substantive requirements are unchanged. — [FDA](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods?stream=top); [NC State Extension](https://foodbusiness.ces.ncsu.edu/news/fda-fsma-204-food-traceability-rule-july-20-2028/)
- [Fact, secondary] Major retailers and foodservice distributors have written FSMA 204 requirements into supplier contracts, often with earlier timelines. — [ReliaMag](https://reliamag.com/topics/guides/fsma-rule-204-compliance)
- [Vendor claim] AI HACCP tools:
  - FoodReady launched an AI HACCP Builder in Feb 2026, claiming 70% less plan-creation time, and offers access to certified consultants. — [Food Industry Executive](https://foodindustryexecutive.com/2026/02/foodready-launches-ai-haccp-builder-to-cut-plan-creation-time-by-70/)
  - IONI costs $199/month per facility. — [IONI](https://ioni.ai/haccp-builder-v2)
  - FoodDocs promises a HACCP plan "in 1 hour." — [FoodDocs](https://www.fooddocs.com/haccp-plan/haccp-plan-example)
  - CaseMark targets FDA- and USDA-regulated facilities. — [CaseMark](https://casemark.com/workflows/haccp-plan)

### Inferences
- Verdict:
  - **C1 High.** A PCQI or HACCP coordinator must sign.
  - **C2 Medium.** GFSI audits (SQF, BRCGS) gate retail shelf access.
  - **C3 High.** Small producers write plans rarely.
- Already AI-native, crowded and cheap, so it is not recommended.

### Gaps
- Number of small US food manufacturers needing PCQI plans. Not searched.

---

## Q13. Calibration records, gauge R&R and SPC reporting

### Takeaway
I gathered almost no direct evidence because the search budget ran out. Gauge R&R, Cp/Cpk and calibration intervals are deterministic calculations already handled by mature software and spreadsheets, so LLM/VLM assistance adds little except in ingesting supplier calibration certificates and checking MSA/Cpk for PPAP.

### Cited Findings
- [Vendor claim] Omnex's PPAP validator already "evaluates MSA and process capability (Cp, Cpk) against AIAG standards," so MSA and SPC checking is being absorbed into PPAP-review tools. — [Omnex](https://www.omnexsystems.com/ai/ppapvalidator-ai)

### Inferences
- Verdict:
  - **C1 Medium.** Outputs are mostly computed, not drafted.
  - **C2 Low-Medium.** It is audit hygiene.
  - **C3 Low.** Once set up, it is routine, and existing tools already automate it.
- Best treated as a component (read calibration certs, sanity-check MSA studies) inside a PPAP or receiving-inspection product, not a standalone target.

### Gaps
- Calibration-management software pricing and market (GAGEtrak, Qualer, etc.) and any AI entrants. Not researched because the search budget ran out.

---

## Q14. Ranked shortlist: top 5 candidates against the thesis

### Takeaway
The best fits are document-heavy, cross-checking tasks on the supplier side that sit right at a revenue gate and that small firms do irregularly:

1. Supplier-side PPAP/APQP package builder and pre-flight checker, with SCAR/8D drafting as a module.
2. Material-cert (MTR) and CoC verification against spec and PO, building on the aerospace-FAI work.
3. Multi-customer compliance-declaration responder (IMDS, CMRT/EMRT, RoHS/REACH, PFAS, chemSHERPA).
4. ISO 9001:2026 transition and internal-audit assistant.
5. Welding procedure and qualification documentation assistant.

RFQ quoting has the best money link but is too crowded, and medical-device eQMS is crowded and validation-heavy.

### Cited Findings
Scorecard (C1 = assistive / human-in-the-loop, C2 = money link, C3 = tedium or non-accumulating expertise), using the evidence above:

| Rank | Candidate | C1 | C2 | C3 | Competition (as of Nov 2026) | Key evidence |
|---|---|---|---|---|---|---|
| 1 | Supplier-side PPAP/APQP builder and consistency checker, plus SCAR/8D drafting module (small Tier 2/3 auto; also medtech, heavy-truck and industrial suppliers asked for PPAP) | High | High | Med-High | Omnex AI is aimed at reviewers and enterprise; Empower QLM; no self-serve supplier-side AI found | Ship gate before PSW approval ([Littelfuse](https://www.littelfuse.com/~/media/15259A6205AC414A9C1EDBC0A72624E4.pdf)); 6–8 h manual review [vendor] ([Omnex](https://www.omnexsystems.com/ai/ppapvalidator-ai)); IATF sites US 3,699 / KR 5,349 / DE 2,681 / JP 1,921 ([VDA QMC](https://vda-qmc.de/en/iatf/zertifikate-weltweit/)); 8D deadlines of 10 business / 30 calendar days ([QMS2GO](https://qms2go.com/learn/articles/scar-management-guide)) |
| 2 | MTR verification against spec and PO flowdowns, plus CoC generation (distributors, fabricators, machine shops; extends the aerospace-FAI work) | High | High | Medium (tedious even when fluent) | Apolo CrossCheck (on-prem, FDE) and MTR.AI; L&T AiKno; early market | "MTR clearance gates quotes" [vendor] ([Apolo](https://www.apolo.us/mtr-vs-mtr-ai)); about 17,100 US machine shops [estimate] ([Vertical IQ](https://verticaliq.com/?p=3669)) |
| 3 | Multi-customer material and compliance declaration responder (IMDS, CMRT/EMRT, RoHS/REACH, PFAS TSCA and state, chemSHERPA) | High | Medium | High | Assent (free supplier AI tool), iPoint, Z2Data, Certivo | TSCA window starts by 31 Jan 2027 ([Faegre](https://www.faegredrinker.com/en/insights/publications/2026/4/epa-extends-pfas-reporting-start-date-under-tsca-section-8a7)); CMRT 6.5 to 6.6 churn ([IntegrityNext](https://integritynext.com/resources/blog/article/cmrt-a-practical-guide-to-the-conflict-minerals-reporting-template)); Japan SDS-substance list rising from 896 to about 1,600 plus about 2,900 more ([ISVD](https://isvd.or.jp/en/columns/sds-chemical-management-sme-burden)); IMDS cost is labor and training ([WardsAuto](https://www.wardsauto.com/ideaxchange/customers-demanding-imds-you-have-options)) |
| 4 | ISO 9001:2026 transition gap analysis, procedure redlines and internal-audit assistant (later IATF and AS9100 audits) | High | Medium | Very High | Consultants; generic QMS tools (QMS2GO etc.) | Published 16 Sep 2026, transition to about Sep 2029 ([TÜV SÜD](https://www.tuvsud.com/en/knowledge-hub/articles/iso-9001-2026-everything-you-need-to-know-about-the-new-revision)); about 1.47M certificates [estimate] ([MLG](https://manufacturingleadgeneration.com/iso-certification-statistics-manufacturing/)) |
| 5 | Welding documentation assistant (WPS-from-PQR drafting, essential-variable checks, WPQ continuity, cert scanning) | High | Medium | Medium | CEI ProWrite, Weldnote/InduSuite, weldXpert, WeldOffice, TWI (all non-AI) | No AI drafting tool found; about 6,800 ASME certificate holders [estimate] ([Wermac](https://wermac.org/societies/asme_certification.html)) |
| Not top 5 | Job-shop RFQ quoting | High | Very High | Low-Med | Paperless Parts plus 2026 seeds: Uptool $6M, Forgepoint $9.8M, Toolpath $10M; CloudNC $20M Quote Agent | [Pulse 2.0](https://pulse2.com/uptool-6-million-seed-funding-closed-for-helping-u-s-shops-quote-10x-faster); [The Next Web](https://thenextweb.com/news/cloudnc-20m-cam-assist-quote-agent) |
| Not top 5 | Medical-device CM documentation (QMSR) | High | Med-High | Medium | Greenlight Guru (about $15–60K/yr), Qualio (about $12–36K), Ketryx ($39M Series B) | [RAPS](https://www.raps.org/resource/qmsr-is-live-expert-says-new-rule-may-be-challengi.html); [SiliconANGLE](https://siliconangle.com/2025/09/04/ketryx-raises-39m-help-medical-device-makers-ship-safer-products-faster/) |
| Not top 5 | Building-product submittals (manufacturer side) | High | Med-High | Med-High | Nomic, Datagrid/Procore (reviewer side); Parspec | [Datagrid](https://datagrid.com/guides/product-data-submittal-examples) (data thin) |
| Not top 5 | HACCP/FSMA | High | Medium | High | FoodReady, IONI ($199/mo), FoodDocs | [FDA](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods?stream=top) |
| Not top 5 | ECCN self-classification | High | Medium | High | ExChek (free), Zonos, GingerControl | [Product Hunt ExChek](https://www.producthunt.com/products/exchek-export-compliance-engine) |
| Not top 5 | Calibration, GR&R, SPC | Medium | Low-Med | Low | Mature deterministic tools | Little evidence gathered |

### Inferences
- **Why #1 (PPAP and 8D, supplier side):** It is the only candidate where all three criteria score Medium-High or better and an explicit contractual ship gate exists. The incumbent AI (Omnex) is built for the reviewing customer, so a self-serve supplier-side "pre-flight" tool doesn't compete head-on and can even be positioned as "pass the customer's AI review the first time." The core technology is a VLM/LLM that reads drawings, CMM reports and FMEA/CP spreadsheets plus rule-based cross-checks, with no model training. Markets: Korea (5,349 IATF sites, weak lower tier), US (3,699), Germany (2,681), and Mexico (2,369, for US-bound supply). Japan is weaker for PPAP itself.
- **Why #2 (MTR and CoC):** The money link is direct, the work is tedious even for experts, and it extends the existing aerospace-FAI investigation (material and special-process certs on AS9102 Form 2), giving one engine for "documents that travel with the part." Competition is early-stage and leans to on-prem or enterprise.
- **Why #3 (declarations):** It is the best fit for C3 (infrequent, churning templates, rotating owners), but C2 is weaker and Assent's free supplier tool is a serious threat. The defensible angles are multi-customer suppliers outside Assent's network, chemSHERPA/Japan and Korea localization, and evidence extraction from sub-supplier documents.
- **Why #4 (ISO 9001:2026):** The timing tailwind (2026–2029) and the very large certified base make it good for customer acquisition, but it is a weak standalone business because C2 is indirect and the offering is easy to commoditize. Better as an entry feature that brings SMEs onto a broader quality copilot that then upsells #1–#3.
- **Why #5 (welding):** There is no AI incumbent and the documents are highly structured (essential-variable tables), but the market is small and conservative. It works best as an add-on for fabricators already using #2.
- **A possible combined product:** a "small-supplier quality and compliance copilot" built on one document-understanding core: drawings (balloons, GD&T), certs (MTR, CoC, calibration), spreadsheets (FMEA, CP) and customer templates (PSW, 8D, CMRT, IMDS). It would add per-workflow rule packs and editable outputs, which fits all three thesis criteria and the self-serve SaaS constraint.

### Gaps
- No pricing data was found for supplier-side PPAP tools, MTR AI tools, or compliance-declaration tools other than Assent's free tier, so willingness to pay for #1–#3 rests on consultant and anecdotal cost figures ($1.4K–$8K per Level 3 PPAP; IMDS consultant and training costs) and needs customer interviews.
- Supplier counts by tier for the US, EU, Korea and Japan beyond IATF-certified sites are missing. Many Tier 2/3s aren't IATF-certified yet still get PPAP requests.
- The web-search budget ran out before I could cover: Parspec/CADDi funding, welding qualification costs, REACH SCIP and the EU PFAS timeline, calibration-software market, and ISO 14001/45001 revision timing.
