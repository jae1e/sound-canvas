# Aerospace small shops and First Article Inspection (AS9102) practice, as of November 2026

Research date: 2026-11-03. Every bullet has a source tag:
- **[FACT]**: primary document (prime supplier requirement, standards body, official association data)
- **[3P-DATA]**: third party repeating official data
- **[PRESS]**: news report
- **[VENDOR]**: claim by a software or service vendor
- **[ANECDOTE]**: practitioner quote, verbatim, with poster and date
- **[ESTIMATE]**: illustrative model, or an estimate with no measured basis

Method note: the session's web-search budget ran out near the end. Reddit (r/machinists, r/QualityAssurance), Modern Machine Shop, Aviation Week and the Airbus AP2633 / AirSupply pages were therefore never searched. Elsmar Cove and one Practical Machinist thread are the only forums covered.

---

## Q1. Who are they? Supply-chain structure, AS9100-certified population, size, customers

### Takeaway
About 31,300 sites worldwide hold AS9100, AS9110 or AS9120 (May 2026). Roughly 40% (about 11,300) are in the US. The FAI work sits mostly with the many small Tier 2/3 build-to-print shops (machining, sheet metal, special processes), often 10 to 50 people with single-digit-million USD revenue. AS9102 reaches them through purchase orders that start at the OEMs and Tier 1s and are passed down. I found no clean breakdown of the certified population by employee size or revenue.

### Cited Findings
**Certified-site counts (IAQG OASIS-derived)**
- [3P-DATA] 31,299 AS9100/AS9110/AS9120 certified sites worldwide as of May 18, 2026, citing the IAQG OASIS Certified Supplier Directory (page updated Aug 17, 2026). US: "11,268 certified sites across all three standards", about 40% of the total. Regional figures exist only in an infographic image; the text gives none per country besides the US. — [simpleQuE 2026](https://www.simpleque.com/as9100-as9110-and-as9120-certifications-worldwide-aerospace-certification-by-region-2026/)
- [3P-DATA] 27,599 certified sites as of April 16, 2024. US 11,268, "41 percent of the total". Certifications "increased over the last year by 10 percent". — [simpleQuE 2024](https://www.simpleque.com/as9100-as9110-and-as9120-aerospace-certifications-worldwide-as-of-april-2024/). **Conflict:** the US count (11,268) is identical in the 2024 and 2026 releases while the world total rose about 13%. The US figure was probably not refreshed, so treat it as approximate.
- [3P-DATA] The Korean Aerospace Quality Group (KAQG) cites "IAQG OASIS v.3 DB (2024)" for country counts: US 10,169; France 1,918; UK 1,431; China 1,749; Japan 1,395; India 1,049; Italy 867; Korea 640; Israel 465. The page layout makes the number-to-country pairing partly ambiguous. The same page states "전세계 약 80개국 18,100개사 인증('17년 5월)" (about 18,100 companies in about 80 countries, May 2017). — [KAQG KS Q 9100 scheme page](https://kaqg.or.kr/kaqg/newpage/newpage.php?f_id=scheme)
- [FACT] OASIS is IAQG's online list of suppliers certified or registered under IAQG rules. It can be filtered by country and standard, so exact current per-country counts need a direct query. — [IAQG OASIS](https://iaqg.org/tools/oasis/)
- [3P-DATA] Mexico: FEMIA data put the sector at 386 aerospace companies in 19 states, more than 50,000 direct jobs and about 190,000 indirect (other sources say about 60,000 jobs; counting methods differ). Another FEMIA-based summary says 368 manufacturers. Aerospace exports were about US$11B in 2025 per FEMIA. "Most" Mexican suppliers are said to hold AS9100, with no count given. — [American Industries hub](https://hub.americanindustriesgroup.com/insights/mexico-aerospace-manufacturing-base-clusters-track-record/); [American Industries: 368 manufacturers](https://americanindustriesgroup.com/?p=57775); [Mexico Business News / FEMIA](https://mexicobusiness.news/aerospace/news/mexico-aerospace-adapts-usmca-review-tariffs-femia)

**Structure and size**
- [3P-DATA] The supply chain is a pyramid: OEMs (Boeing, Airbus) at the top, Tier 1 for major systems, Tier 2 for subassemblies, Tier 3/4 for raw materials, fasteners and detail parts. Tier 3 firms "tend to be smaller businesses with limited design capacity". An aircraft has roughly 2 to 6 million parts from thousands of suppliers. — [RCF Technologies, Aerospace Supply Chain 101](https://www.rcftechnologies.com/aerospace-supply-chain-101/); [Umbrex, How civil aerospace manufacturing works](https://umbrex.com/resources/how-industries-work/aerospace-defense/how-the-civil-aerospace-manufacturing-industry-works/)
- [3P-DATA] Boeing "has contracts with 26,500 suppliers" (undated union/ITF document, probably old). — [ITF SCALOP aeronautical supply chains](https://www.itfglobal.org/sites/default/files/resources-files/scalop_aeronautical_supply_chains_english.pdf). GAO cites Boeing saying about 700 suppliers support maintenance and repair parts, which measures a different thing. — [GAO-24-106493](https://www.gao.gov/assets/d24106493.pdf)
- [ESTIMATE] Airbus outsourced about 60% of value on the A380, rising to about 80% on the A350 XWB (consultant post). — [Kevin Michaels, LinkedIn](https://www.linkedin.com/pulse/post-tier-1-next-era-supply-chain-evolution-kevin-michaels)
- [PRESS] Small AS9100 shop examples:
  - Thompson Precision (Montana), AS9100 machining and fabrication, "a highly experienced team of 25 employees". — [Montana MEP case study](https://www.montana.edu/mmec/impact/case_studies/2018Qrt3ThompsonPrecision.html)
  - An AS9100 CNC shop in El Cajon, CA listed for sale with "Reported Sales USD 2.1 million", 10 to 50 employees. — [SMERGERS listing](https://www.smergers.com/business/machine-shop-for-sale-in-el-cajon-united-states/ahhtv/)
  - "Tiny" Datum Technologies gained AS9100C. — [North Bay Business Journal](https://www.northbaybusinessjournal.com/74298/tiny-datum-receives-key-quality-certification/)
- [FACT] BSI sells a dedicated "AS9100 for SMEs" offering, which suggests SMEs are a large share of applicants. — [BSI AS9100 for SMEs](https://bsigroup.com/en-AU/AS9100-Series/AS910091109120-for-SMEs)

**Typical customers and how AS9102 reaches small shops**
- [FACT] Boeing has adopted AS9102 as its FAI requirement for purchased hardware "as flowed by the purchase document". — [Boeing Suppliers FAI](https://www.boeingsuppliers.com/fai.html)
- [ANECDOTE] Practical Machinist small-shop thread (per search snippet; the page returned 403 on fetch): AS9100 does not by itself require AS9102 paperwork; it usually comes from a customer such as Boeing. One shop says it doesn't do AS9102 reports because they don't fit its work. One poster spends about 3 days a year on audits and paperwork. — [Practical Machinist "Starting a small shop" p.3](https://www.practicalmachinist.com/forum/threads/starting-a-small-shop.367548/page-3)
- [ANECDOTE] "AS9102, when contractual specified, must verify conformance to all requirements stated in the PO" (Jeff Frost, Elsmar, May 19, 2011). He also says he has "received numerous phone calls over the years from 2nd tier customers" asking for a free AS9102 after they forgot to pass the requirement down. — [Elsmar thread 48306](https://elsmar.com/elsmarqualityforum/threads/charged-for-an-as9102-fai-report-when-requested-as-part-of-a-purchase-order.48306/)

### Inferences
- About 31k certified sites is the ceiling for "shops that might need AS9102". The real target is a subset: build-to-print manufacturers (mainly AS9100, not AS9110 MRO or AS9120 distributors) whose customers invoke AS9102. My estimate, with no source: roughly half to two-thirds of the population, so on the order of 15k to 20k sites worldwide and 6k to 8k in the US.
- The most likely buyer is a 10 to 50 person, US$2M to 20M build-to-print shop with several aerospace customers (Tier 1s, engine OEMs, defense primes), each with its own flowdowns. The US$2M figure is one data point.
- AS9100D clause 8.5.1.3 (production process verification) names FAI as an example and points to 9102. My knowledge of the standard text, not fetched. In practice AS9102 format is triggered by the PO. One vendor page claims AS9100 "explicitly requires" AS9102, which overstates it.

### Gaps
- No official per-country OASIS counts for 2025/2026 for the EU, UK, Japan, Korea, India or Mexico. The KAQG 2024 table is the best available, and its pairing is ambiguous.
- No distribution of AS9100 sites by employee size or revenue. The US Census County Business Patterns (NAICS 336413 / 332710) data was not searched.
- No small-business share of Boeing/Airbus/Lockheed supplier bases, and no counts of RTX, GE Aerospace, Safran or Spirit suppliers.

---

## Q2. FAI requirements in practice: triggers, forms, characteristic counts, time, volume, rejection cost, portals, related standards

### Takeaway
AS9102 Rev C (June 2023) is current and EN 9102:2024 is its European twin. A full FAI is triggered by a new part, and by changes to design, process, source, tooling or location. A production lapse of more than 2 years also triggers one. Each FAIR needs Form 1 (part number accountability), Form 2 (materials, special processes, functional tests with certificates) and Form 3 (every ballooned characteristic with results). Primes gate shipment or part approval on an accepted FAI. Boeing requires Net-Inspect for listed part numbers, and engine OEMs (GE, P&W, RR, Safran) roll FAI into AS9145/AS13100 PPAP. All published hours-per-FAI figures come from vendors: about 4 to 6.5 hours of manual paperwork for a 60 to 100 characteristic part, and up to a full day or more for complex parts.

### Cited Findings
**Standard revisions**
- [FACT] AS9102 Revision C was released June 23, 2023. Form changes:
  - Form 1 field 14 is now "Reason for Full / Partial FAI" and is mandatory on all FAIs.
  - Field 17 changed from serial number to "Part Type".
  - "All BOM parts (e.g., detail parts, sub-assemblies, COTS)" must be listed.
  - The Field 22 approver "should not" be the same person as the Field 20 reviewer.
  - Signature fields were removed from Forms 2 and 3; the Form 1 signature covers all forms.
  - "The AS9102 Standard now explicitly applies to suppliers performing special process(es)."
  — [Net-Inspect blog, Rev B vs Rev C, Jun 30, 2023](https://www.net-inspect.com/blog/as9102-rev-b-vs-rev-c/) (vendor blog summarizing the standard)
- [FACT] EN 9102:2024 supersedes EN 9102:2015 and strengthens FAI planning, evaluation and re-accomplishment. — [EVS EN 9102:2024](https://evs.ee/en/evs-en-9102-2024)
- [FACT] An explainer document from General Dynamics Land Systems (Dec 2025) shows primes still issuing AS9102C guidance to suppliers in late 2025. — [GDLS AS9102C Numbered Explanation](https://www.gdls.com/wp-content/uploads/2025/12/AS9102C-Numbered-Explanation-Dec-2025-FINAL.pdf)

**Triggers**
- [VENDOR] Ideagen (InspectionXpert) lists "More than 2 years have passed since the part was last produced" among FAI triggers. — [Ideagen/InspectionXpert AS9102](https://www.inspectionxpert.com/fai/as9102)
- [ANECDOTE] An Elsmar thread title, "AS9102 Rev C - 4.6.-f.6. 2-year lapse" (TinGent, Jun 10, 2025), points to clause 4.6 f.6 as the lapse trigger in Rev C. Another title, "Customer requesting AS9102 Rev C inspection for lots previously accepted at Rev B" (Nov 13, 2024), shows confusion at the revision changeover. — [Elsmar thread 56925 p.2](https://elsmar.com/elsmarqualityforum/threads/how-often-can-as9102-fai-be-invoked.56925/page-2)
- [FACT] Boeing's FAI planning requirements (14 QMS elements) include: "Evaluate the need to perform a full FAI or a partial FAI in the event of changes that invalidate the original results". Engineering, production process and tooling changes are examples (AS9102 4.6). The elements also cover resources and competency, QMS health measures, and timely corrective action. — [Boeing FAI planning requirements](https://www.boeingsuppliers.com/become/quality/fai)
- [VENDOR] Some primes require a full FAI after a long production lapse where the standard allows a partial. — [iFactory](https://ifactoryapp.com/quality-control-management/first-article-inspection-report-as9102-process-software)
- [ANECDOTE] Elsmar practitioners on re-triggers:
  - "For machine center or programming changes a delta is appropriate." (Darrell B, Feb 4, 2013)
  - "I would do a full FAI for a part number change." (Darrell B, Feb 4, 2013)
  - "If there have been no changes, send the customer the existing FAI, it is still valid ... their request on every order is a nonsense." (kiwisfly, Feb 4, 2013)
  — [Elsmar thread 56925 p.2](https://elsmar.com/elsmarqualityforum/threads/how-often-can-as9102-fai-be-invoked.56925/page-2)

**Prime requirements and portals**
- [FACT] Boeing D6-87282 (Rev G):
  - "Required use of Net-Inspect for PNs identified in attachment 1 of the procurement". Suppliers name Boeing Commercial Airplanes as the customer.
  - "where Supplier is required to document FAIs in the Net-Inspect software, FAIs of the Supplier's Supply Chain shall also be documented in Net-Inspect".
  - Forms 1, 2 and 3 are completed in Net-Inspect.
  - Suppliers hold shipment until FAI requirements are met.
  — [Boeing D6-87282 Rev G](https://www.boeingsuppliers.com/content/dam/boeing/boeingsuppliers/boeing-suppliers/becoming/quality/D6-87282_Rev_G.pdf)
- [FACT] Boeing form X31764 (Rev 01 Jan 2024) requires FAI per AS/EN/SJAC 9102. Boeing "reserves the right to conduct surveillance of the Seller's FAI" (Boeing First Article Inspection, BFAI). — [Boeing X31764](https://www.boeingsuppliers.com/content/dam/boeing/boeingsuppliers/boeing-suppliers/becoming/quality/FORM_X31764_Quality_Purchasing_Data_Requirements_BCA_BGS.pdf)
- [FACT] Boeing: "existing hardware FAI records created prior to an AS9102 flowdown are not required to be updated". — [Boeing Suppliers FAI](https://www.boeingsuppliers.com/fai.html)
- [ANECDOTE] "Honeywell, Spirit (Sikorsky), and on some programs Boeing all require Net-Inspect." (MedDevMFG2020, Elsmar, Dec 31, 2020). Rolls-Royce is also mentioned as a Net-Inspect user (JAltmann, Jun 8, 2011). — [Elsmar "NET-INSPECT is it worth it?"](https://elsmar.com/elsmarqualityforum/threads/net-inspect-is-it-worth-it-small-machine-shop-doing-as9100.48674/)
- [FACT] A supplier's Net-Inspect V5 standard-work document shows "PRATT AND WHITNEY – HARTFORD" as a customer selection in the FAI workflow. This shows P&W FAIs flow through Net-Inspect, not that P&W mandates it. — [FAI by Numbers for NI V5 Rev F](https://pwrze.com/storage/file/core_files/2021/8/3/38c781d7cff14baa30fe4e64aa6f8753/FAI%20by%20Numbers%20for%20NI%20V5%20-%20Rev.%20F.pdf)
- [FACT] GE Aerospace S-1007 (Sep 2023) incorporates the AS13100 part-qualification requirements together with AS9102 and AS9145. "The FAI shall be submitted as part of the PPAP package." Coverage includes items generated by sub-tier suppliers. — [GE S-1007 Part Qualification and Approval Process](https://www.unisonindustries.com/sites/default/files/s-1007-part-qualification-and-approval-process-sep-2023_0.pdf)
- [3P-DATA] AS13100 (engine-sector supplement) is being rolled out by GE, Rolls-Royce, Pratt & Whitney and Safran in contracts. Its chapters cover AS9100 add-ons, AS9145 APQP/PPAP, and "Core Defect Prevention Tools" (Chapter C). AS13100A was current as of Apr 14, 2025. The reference manuals are free from AESQ; only AS13100 and AS9145 must be purchased. — [simpleQuE: AS13100 & AS9145 apply to you](https://www.simpleque.com/aerospace-engine-supply-chain-as13100-and-as9145-apply-to-you/); [simpleQuE AS13100](https://www.simpleque.com/standards/as13100-compliance/)
- [FACT] Hanwha's supplier quality requirement (SQAR Q2000, 2017) requires FAI results on AS9102 FAIR Forms 1, 2 and 3 at the latest revision. Later lots cannot be delivered before FAI approval. — [Hanwha SQAR (Korean PDF)](https://m.hanwhacorp.co.kr/upload/machine/standard/20170901/9d1eb84b-3d8d-4b31-8892-52ab17e71576.pdf)
- [FACT] Other primes flow down their own FAI documents, e.g., Textron Systems QASP52 Supplier FAI Rev D. Customers may accept their own format if it holds "equivalent information as shown in AS9102 Rev C". — [Textron QASP52](https://www.textronsystems.com/sites/default/files/_documents/QASP52_Supplier%20FAI_RevD.pdf); [LMI Aerospace FAI_STD-001](https://www.lmiaerospace.com/application/files/9816/9928/4663/FAI_STD-001.pdf)

**Characteristic counts and time per FAI**
- [ESTIMATE] MetricMech (founder-authored, Jul 3, 2026, Indian precision shop example) models 60 to 100 characteristics per part. Manual hours:
  - ballooning 1.5 to 2.5 h
  - transcribing nominals and tolerances 1.0 to 1.5 h
  - formatting AS9102/PPAP forms 1.0 to 1.5 h
  - recording measurements 0.5 to 1.0 h
  - **total 4 to 6.5 h per report**

  At 700 INR/h loaded, that is 2,800 to 4,550 INR per report. "Paperwork" is "70 to 80 percent of the effort". Its scenarios run 10 to 30 reports a month. — [MetricMech, Real cost of manual FAI](https://metricmech.com/articles/cost-of-manual-fai-inspection)
- [VENDOR] Ideagen: "an AS9102 FAIR can take a full day per part" manually; with software, "as little as 10 minutes". Data is otherwise "retyped from a spreadsheet". — [Ideagen/InspectionXpert AS9102](https://www.inspectionxpert.com/fai/as9102)
- [VENDOR] Net-Inspect: "What once took 2–8 hours per drawing now takes minutes" (ballooning) and "populating 90% of the FAIR". — [Net-Inspect FAI software](https://www.net-inspect.com/solutions/first-article-inspection-software/)
- [VENDOR] 1factory:
  - "Reduced FAIR reporting time from ~60 minutes per form to just a few minutes" (Next Intent)
  - "reducing FAI and PPAP creation time by up to 65%"
  - Able Tool "delivered 54 FAIs" in week one and "over 200 FAIs" in month one
  - Kalman Manufacturing had "over 60 parts needing First Articles" in one spike
  — [1factory FAI ballooning software](https://www.1factory.com/fai-ballooning-software.html)
- [VENDOR/PRESS] Quality Magazine (search snippet only; fetch blocked with 403): a shop said what "used to take four to five hours now takes less than two hours". — [Quality Magazine, Simplify your AS9102 FAI](https://www.qualitymag.com/articles/96602-how-to-simplify-your-as9102-first-article-inspection-process)
- [ESTIMATE] CMM measurement time, separate from paperwork: 1 to 2 h for 20 to 30 simple features; 3 to 5 h for 50 to 70; 6 to 10+ h for 100+ complex aerospace features. — [Rapid-Protos FAI guide](https://www.rapid-protos.com/first-article-inspection/)
- [VENDOR, unverifiable] mavlon.co pages in search snippets gave manual ballooning tiers (1 to 2 h simple single-sheet; 2 to 4 h medium; 4 to 8 h complex 5 to 7 sheets; 8 to 16 h very complex with heavy GD&T). Another snippet cited "a 7-sheet bracket with 95 characteristics that takes 5-6 hours". **When fetched in Nov 2026, mavlon.co URLs served an unrelated "AI Quoting Engine" page**, so this content cannot be verified and the company may have pivoted. — [Mavlon ballooned drawing requirements (snippet)](https://mavlon.co/post/ballooned-drawing-requirements-as9102-fai)

**Price and cost per FAI**
- [ANECDOTE] "Yes! Many companies do charge from 75.00 to 300.00+ per FAIR." (dsanabria, Elsmar, May 18, 2011). "A nice round number seems to be about 4 hours at your shop rate." (Jeff Frost, May 18, 2011). — [Elsmar thread 48306](https://elsmar.com/elsmarqualityforum/threads/charged-for-an-as9102-fai-report-when-requested-as-part-of-a-purchase-order.48306/)
- [VENDOR, unverified] One vendor snippet gave 8 to 40 h of engineering time per report at $45 to $95/h loaded QA engineer. Another gave about $800 to $1,000 labor for a 95-characteristic bracket. The originating pages (lastrev.com / mavlon.co) were not confirmed. — [Last Rev FAI report generation](https://lastrev.com/workflows/fai-report-generation)

**Rejections**
- [VENDOR] Vendor guides say FAI packages are mostly rejected for paperwork, not measurement. Typical reasons: incomplete Form 1, missing ballooned drawing, incomplete traceability, special processes from a non-Nadcap sub-supplier (automatic rejection), undocumented process changes. — [Olympus Machining, Top 10 AS9102 rejection reasons](https://www.olympusmachining.com/blog/as9102-fai-rejection-reasons); [connect981 FAI rejection glossary](https://connect981.com/glossary/fai-rejection)
- [ESTIMATE, unverifiable] A mavlon.co snippet modeled a hypothetical supplier with 5% rejection on 200 FAIs a year (10 rejections) at "$47,000 per rejection in hidden cost". The page now serves unrelated content and the figure is not measured. — [Mavlon hidden cost of FAI rejection (snippet)](https://mavlon.co/post/hidden-cost-of-fai-rejection-lead-time-customer-trust-reputation)

### Inferences
- A defensible planning range for a small shop's manual FAIR paperwork (ballooning + Form 3 build + Forms 1/2 + data transcription), excluding measurement: about 3 to 8 hours for a typical 30 to 150 characteristic part, and 1 to 2+ days for multi-sheet, GD&T-heavy drawings. Every source for this is a vendor, so treat it as an upper-biased estimate.
- Ballooning plus characteristic extraction plus Form 3 build is the step most often called the bulk of the effort (MetricMech's split puts about 40 to 60% of manual time there). That is where an AI-assist product fits. Form 2 (material and special-process certificate traceability) is a frequent rejection cause and a second opportunity: certificate parsing and cross-checking against approved-source lists such as Nadcap.
- Portal lock-in matters. Where Boeing, Honeywell, Spirit or some engine OEMs require Net-Inspect, the shop must end up in Net-Inspect. A standalone tool has to export into Net-Inspect, as 1factory does, or it duplicates work.
- Under engine OEMs (AS13100/AS9145), FAI is one element of a PPAP package (PFMEA, control plan, MSA, etc.). A tool for engine-supply shops would eventually need to handle PPAP, not just AS9102.

### Gaps
- No primary measurements (time studies, surveys) of hours per FAIR at small shops. Every number is vendor-sourced or illustrative.
- No published distribution of characteristics per drawing. Vendors cite 30 to 40 (typical), 60 to 100, 95 and 200 to 800 (the last could not be traced to a page).
- No data on FAIs per year at a small shop. The only volume signals are 10 to 30 a month (MetricMech model) and 1factory customers doing 54 to 200+ in a month during spikes.
- No published FAI first-pass acceptance or rejection rates from any prime.
- I could not confirm a widely repeated claim that Boeing requires all FAIs completed after Jan 1, 2024 to go through Net-Inspect. The primary D6-87282 text limits it to part numbers in Attachment 1.
- Airbus requirements (AP2633, AirSupply, Airbus FAI tooling), Lockheed (the RMS FAI PDF returned 404), Collins/RTX, Safran and Spirit FAI documents were not retrieved.
- AS9138 (sampling) and AS9103 (key characteristics) were not researched.

---

## Q3. Who does the work, and how small shops staff it

### Takeaway
In small shops, FAI is done by a quality manager or inspector who also runs the QMS, audits and inspection. Roles overlap, and the owner or a part-time or consultant quality manager often fills gaps. Labor data shows experienced CMM and aerospace inspectors are in demand at modest wages (about $20 to $32/h median). The only evidence I found that the responsible person keeps changing and skills don't build up is anecdotal. Shops charge customers for FAIs, and staff "relearn" FAI software several times a year.

### Cited Findings
- [ANECDOTE] "my staff has to relearn the use of the program a few times a year." and "It took literally months to get the information formatted and entered." (amueller, Elsmar, Dec 17, 2020, about an online FAI/FAIR system). "We have learned to charge for any FAI, written or online." (same poster). — [Elsmar "NET-INSPECT is it worth it?"](https://elsmar.com/elsmarqualityforum/threads/net-inspect-is-it-worth-it-small-machine-shop-doing-as9100.48674/)
- [ANECDOTE] A real burden for smaller companies is "The amount of time that it takes someone to complete all required documents". When AS9102 is invoked, "it is more than dimensional attributes." (dsanabria, Elsmar, May 18–19, 2011). Suppliers "will freak out whenever they hear there is a FAIR required." (Coury Ferguson, May 19, 2011). — [Elsmar thread 48306](https://elsmar.com/elsmarqualityforum/threads/charged-for-an-as9102-fai-report-when-requested-as-part-of-a-purchase-order.48306/)
- [ANECDOTE] A poster at a six-person aerospace OEM was handed the whole quality system a month before an AS9100 audit and said the team all "wear more than one hat" (search-snippet paraphrase; not fetched verbatim). — [Elsmar "Quality under Manufacturing or separate entity"](https://elsmar.com/elsmarqualityforum/threads/quality-under-manufacturing-or-separate-entity.5685/)
- [PRESS] Small-company quality manager job ads bundle AS9100 maintenance, inspection support, FAIR sign-off and audit leadership ("maintain AS9100, support inspection activity, sign off FAIRs, lead audits"), in "a small team where roles may overlap". Part-time quality managers are offered at about 1 to 4 days a month to firms chasing a first AS9100 certificate. Search-snippet summary; individual postings not fetched. — [Holt Engineering QM posting](https://holtengineering.co.uk/job/quality-manager-19/); [Part-time quality managers (LinkedIn)](https://cy.linkedin.com/in/dionysis-kefalas)
- [3P-DATA] Pay (ZipRecruiter):
  - Aerospace quality inspector: average $20.39/h as of Sep 1, 2026; most earn $16.11 to $23.08/h. — [ZipRecruiter aerospace quality inspector](https://www.ziprecruiter.com/Jobs/Aerospace-Quality-Inspector)
  - Aerospace CMM programmer: average $31.92/h as of Sep 24, 2026. — [ZipRecruiter aerospace CMM programmer](https://www.ziprecruiter.com/Jobs/Aerospace-Cmm-Programmer)
  - "First Article Inspection AS9102" roles: also $20.39/h. — [ZipRecruiter FAI AS9102 jobs](https://www.ziprecruiter.com/Jobs/First-Article-Inspection-As9102)
- [PRESS] Postings ask for "minimum of 3–5 years of quality inspection experience in an aerospace manufacturing environment", at $58,000 to $71,000 (Melville, NY). LA-area staffing posts list CMM programmer/inspector at $40 to $55/h. — [Randstad Melville posting](https://www.randstadusa.com/jobs/309/ab_4986723/aerospace-quality-inspector-w-cmm_melville/); [Indeed LA aerospace inspector](https://www.indeed.com/q-aerospace-inspector-l-los-angeles,-ca-jobs.html)
- [3P-DATA] Deloitte and The Manufacturing Institute (2024): US manufacturing could need as many as 3.8M new employees in 2024–2033, and about 1.9M "could remain unfilled". Based on a survey of 200+ manufacturers; no aerospace breakdown. — [Deloitte press release](https://www2.deloitte.com/us/en/pages/about-deloitte/articles/press-releases/us-manufacturing-could-need-new-employees-by-2033.html)
- [PRESS] Korea: KAI says smaller suppliers face labor shortages and productivity challenges (Oct 2026; detail in Q6). — [Sidae, Oct 29, 2026](https://www.sidae.com/article/2026102912412148792)
- [ANECDOTE] Who may complete an FAI: "anyone in the chain from the organization that makes the product". (Jeff Frost, Elsmar, May 19, 2011). — [Elsmar thread 48306](https://elsmar.com/elsmarqualityforum/threads/charged-for-an-as9102-fai-report-when-requested-as-part-of-a-purchase-order.48306/)
- [FACT] Boeing's FAI planning requirements require suppliers to define "responsible organizations" and provide "adequate resources and personnel competency" for FAI. Competency is therefore auditable. — [Boeing FAI planning requirements](https://www.boeingsuppliers.com/become/quality/fai)

### Inferences
- The "responsible person keeps changing / infrequent task" criterion fits two cases. First, shops where FAIs come in bursts (new programs, re-sourcing waves, 2-year-lapse reactivations). Second, shops where the one QA person leaves and the new hire must relearn each customer's flowdowns and portal. The "relearn a few times a year" quote is the clearest direct evidence. Customer-specific rules (Boeing D6-87282, GE S-1007, Hanwha SQAR...) make it worse, because they change by customer more than by part.
- At about $20 to $32/h wages (about $35 to 60/h loaded, my estimate), 4 to 8 hours of FAI paperwork costs a small shop about $150 to $500 per FAI. That matches the 2011 Elsmar "$75–$300+ per FAIR" charge range. A self-service SaaS priced at a few hundred dollars a month would need to save only a handful of FAI-hours a month.

### Gaps
- No quantitative data on quality-staff turnover, tenure or retirement for aerospace inspectors (no BLS, AIA or SAE workforce data was retrieved).
- No data on what share of small shops outsource FAIs to consultants or third-party labs, and no reliable consultant hourly rates for FAI preparation.
- No r/QualityAssurance or r/machinists threads retrieved; the search budget ran out.

---

## Q4. Pain points and the money link

### Takeaway
FAI is a gate on revenue. Boeing and Hanwha bar shipping or later lots until the FAI is accepted, and GE treats the FAI as part of the PPAP part approval. Rejected or late FAIs delay first shipment and invoicing. Shops report pushback and charge for FAIs, which shows the effort is significant and partly billable. I found no measured data on approval delays, scorecard effects, SCARs or AS9100 audit findings.

### Cited Findings
- [FACT] Boeing D6-87282: suppliers must not ship until FAI requirements are met, and FAIs (Forms 1 to 3) are submitted in Net-Inspect for listed part numbers. — [Boeing D6-87282 Rev G](https://www.boeingsuppliers.com/content/dam/boeing/boeingsuppliers/boeing-suppliers/becoming/quality/D6-87282_Rev_G.pdf)
- [FACT] Hanwha SQAR: later lots cannot be delivered before FAI results are approved. — [Hanwha SQAR](https://m.hanwhacorp.co.kr/upload/machine/standard/20170901/9d1eb84b-3d8d-4b31-8892-52ab17e71576.pdf)
- [FACT] GE S-1007: "The FAI shall be submitted as part of the PPAP package," so FAI is inside the part-qualification gate. — [GE S-1007](https://www.unisonindustries.com/sites/default/files/s-1007-part-qualification-and-approval-process-sep-2023_0.pdf)
- [FACT] Boeing's FAI planning requirements include QMS health measures, "timely corrective actions", and Boeing surveillance of supplier FAIs (BFAI). — [Boeing FAI planning](https://www.boeingsuppliers.com/become/quality/fai); [Boeing X31764](https://www.boeingsuppliers.com/content/dam/boeing/boeingsuppliers/boeing-suppliers/becoming/quality/FORM_X31764_Quality_Purchasing_Data_Requirements_BCA_BGS.pdf)
- [VENDOR] "Net-Inspect FAI has provided us and our customer with the quickest FAI approval and buy-off we have ever seen." (Reid E., EADS testimonial). Net-Inspect claims a "Common process/form for all FAIRs that significantly reduces FAI rejections". — [Net-Inspect FAI](https://www.net-inspect.com/solutions/first-article-inspection-software/)
- [ANECDOTE] Billing and pushback:
  - "We worked out an agreement that they would cover the cost of the time invested" and "They would not pay for any inspection of any sort." (silentrunning, Elsmar, Oct 18, 2012)
  - "Can he force me to perform a FAIR just because their P.O. is 'cut-and-pasted'" (Johnny Bollocks, 2012, quoted Feb 4, 2013)
  — [Elsmar thread 56925 p.2](https://elsmar.com/elsmarqualityforum/threads/how-often-can-as9102-fai-be-invoked.56925/page-2)
- [ANECDOTE] "It does bother me when we are charged for a copy of the FAI which is required by the AS9100 standard" (andygr, Elsmar, May 19, 2011): buyers complain when charged. — [Elsmar thread 48306](https://elsmar.com/elsmarqualityforum/threads/charged-for-an-as9102-fai-report-when-requested-as-part-of-a-purchase-order.48306/)
- [ESTIMATE] MetricMech: "one rejection can cost more than ten clean reports" (qualitative, not quantified). — [MetricMech](https://metricmech.com/articles/cost-of-manual-fai-inspection)
- [VENDOR] 1factory case studies describe surges of 54 to 200+ FAIs in a month (Able Tool) and "over 60 parts needing First Articles" (Kalman). FAI capacity can bottleneck new-work ramp-up. — [1factory](https://www.1factory.com/fai-ballooning-software.html)

### Inferences
- The money link the product can claim: (a) faster time-to-first-shipment and invoice on new part numbers, since FAI acceptance is the gate; (b) fewer rejection or resubmission loops, which are mostly paperwork errors; (c) capacity to accept surges of new part numbers (re-sourcing, rate ramps) without hiring. (b) and (c) are plausible but unmeasured.
- Some shops already bill FAIs as a line item ($75 to $300+, or about 4 h at shop rate). So FAI time is partly revenue, and faster FAIs raise margin on that line rather than cutting a pure cost.

### Gaps
- No data on average FAI approval cycle time at Boeing, Airbus, GE or RTX, or on how FAI performance enters supplier scorecards.
- No statistics on FAI-related SCARs or escapes, or on AS9100 audit nonconformities tied to FAI or documentation. IAQG/OASIS audit-finding data and certification-body reports were not found.
- No measured cost of an FAI rejection. The $47k figure is an unverifiable vendor model.

---

## Q5. Tools small shops use today

### Takeaway
The tool stack runs from Excel/Word and PDF markup to dedicated FAI software. The main names are Net-Inspect (portal plus FAI module, often mandated), DISCUS, Ideagen Quality Control (formerly InspectionXpert), 1factory and High QA. CMM report output (PC-DMIS, Calypso) and SOLIDWORKS Inspection also appear. Since 2025–2026 a crowd of small AI/OCR auto-ballooning entrants has appeared. I found no usage-share data. Complaints are about learning curve, portal friction ("NI is a pain") and retyping data between spreadsheets and forms.

### Cited Findings
- [VENDOR] Net-Inspect:
  - "over 100,000 users around the globe"
  - integrated auto-ballooning of 2D PDFs with OCR of dimensions and GD&T
  - auto-population of Forms 1 to 3 with e-signature
  - CMM/third-party data import from "more than 30" systems
  - the Ballooning Tool is "included with the FAI Module for new customers only"
  — [Net-Inspect FAI](https://www.net-inspect.com/solutions/first-article-inspection-software/)
- [VENDOR] Ideagen Quality Control (InspectionXpert): branded "Copyright 2026 Ideagen", 14-day free trial, claims manual FAIR "full day per part" cut to "as little as 10 minutes". — [Ideagen/InspectionXpert](https://www.inspectionxpert.com/fai/as9102)
- [VENDOR] 1factory: "600+ Customers. 35+ Countries", "most teams achieve full deployment in under two hours". A customer contrasted a competitor's "implementation time ... was nine months" with 1factory live "within the first day". — [1factory](https://www.1factory.com/fai-ballooning-software.html)
- [VENDOR] DISCUS and High QA publish AS9102 Rev C aerospace FAI pages. — [DISCUS aerospace](https://www.discussoftware.com/fai-optimization/industries/aerospace/); [DISCUS on Rev C](https://www.discussoftware.com/news/as9102-rev-c-what-you-need-to-know/); [High QA Rev C](https://highqa.com/?p=13583)
- [ANECDOTE] Elsmar comments on Net-Inspect and Discus:
  - "Net-Inspect is fairly simple, intuitive, and once you learn its 'language' tis very quick." (MedDevMFG2020, Dec 31, 2020)
  - "Discus takes a long time to be efficient as it has a lot of features." (MedDevMFG2020, Dec 31, 2020)
  - "I thought Discus was much more comprehensive." (Jan 4, 2021)
  - "NI is a pain." (CNC123, Jan 20, 2023)
  - 1factory is the easiest option and "you can output AS9102s right into NetInspect, in case your customers require that." (CNC123, Jan 20, 2023)
  - "Dive down into the reasons why your thinking of getting the S/W and do they make fiscal sense." (JAltmann, Jun 8, 2011)
  — [Elsmar "NET-INSPECT is it worth it?"](https://elsmar.com/elsmarqualityforum/threads/net-inspect-is-it-worth-it-small-machine-shop-doing-as9100.48674/)
- [ANECDOTE] In an older Elsmar FAI-software thread, Discus and "Inspection Expert" are named alongside Net-Inspect, "They all have positives & negatives". — [Elsmar FAI software recommendations](https://elsmar.com/elsmarqualityforum/threads/fai-first-article-inspection-software-recommendations-and-help.48559/)
- [ANECDOTE] General small-company QMS advice (not FAI-specific, about 2013–2015): "simple spreadsheets and templated word-docs will often suffice". — [Elsmar QMS software for small company](https://elsmar.com/elsmarqualityforum/threads/qms-software-recommendations-for-a-small-company.61940/)
- [VENDOR] 1factory: "A First Article Inspection record is much more than just an Excel report", which implies Excel is the incumbent being displaced. Ideagen: data is otherwise "retyped from a spreadsheet". — [1factory](https://www.1factory.com/fai-ballooning-software.html); [Ideagen](https://www.inspectionxpert.com/fai/as9102)
- [PRESS/VENDOR] AI/auto-ballooning and AS9102 entrants seen in 2026 search results (listed, not evaluated): FAI2CAM, BalloonPlot, CADNexa, GND CTL, MetricMech, Last Rev (workflow), Mavlon (FAI automation page; site now shows an AI quoting product), Verisurf (FAI content), iFactory. — [FAI2CAM](https://fai2cam.com/); [BalloonPlot AS9102 guide](https://www.balloonplot.com/as9102-fai-complete-guide.html); [CADNexa](https://cadnexa.com/blog-as9102-forms-explained.html); [GND CTL](https://gndctl.com/industries/aerospace); [MetricMech](https://metricmech.com/articles/first-article-inspection-report); [Last Rev](https://lastrev.com/workflows/fai-report-generation); [Mavlon FAI automation](https://mavlon.co/fai-automation); [Verisurf](https://www.verisurf.com/blog/article/first-article-inspection/)

### Inferences
- The incumbent at the smallest shops is probably Excel/Word templates plus PDF markup, with re-keying of CMM output. Larger or portal-mandated shops use Net-Inspect, DISCUS or Ideagen. This is inferred from vendor framing and forum advice, not survey data.
- The crowded 2025–2026 field of AI auto-ballooning entrants means "upload drawing → balloons + Form 3" is becoming table stakes. Differentiation for an ex-Geomagic founder could come from (a) 3D model/PMI-aware extraction and linking CMM/3D-scan results (Control X-style) into Form 3, (b) Form 2 certificate parsing and verification, (c) built-in customer-flowdown knowledge (Boeing/GE/Hanwha rules) that covers for staff turnover. These are inferences, not validated.

### Gaps
- No usage-share data (what % of small shops use Excel, paper, Net-Inspect, DISCUS, Ideagen, 1factory, High QA, SOLIDWORKS Inspection, or CMM-native reports from PC-DMIS or Calypso).
- No pricing for any FAI tool; pages linked to pricing pages that were not fetched.
- No Reddit or G2/Capterra review complaints gathered (search budget exhausted).

---

## Q6. Korea specifically

### Takeaway
Korea's aerospace parts base is concentrated in Sacheon/Jinju (Gyeongnam) around KAI, with 300+ suppliers in the area. Korean Air Aerospace Division (KAL-ASD), Hanwha Aerospace, and smaller exporters such as ASTK serve Boeing, Airbus, Spirit and engine OEMs. Korea had about 640 AS9100/KS Q 9100 certifications in 2024, up from 190 in 2014. Domestic primes (e.g., Hanwha) flow AS9102 Forms 1 to 3 down to suppliers, and KAIA runs AS9102 FAIR-writing courses. In October 2026 KAI started an AI-transformation program for its suppliers, citing labor shortages, which is a timely opening.

### Cited Findings
**Certification counts and cost**
- [FACT] Korea AS9100/KS Q 9100 certification counts (KAQG; column split between AS9100 and KS Q 9100 unclear): 2014: 190; 2016: 266; 2018: 374 (KS Q 9100 officially recognized); 2020: 472; 2022: 537; 2024: 640. Korean firms historically certified through foreign bodies ("BSI, 로이드, DNV"). "연간 비용 : 1,500만원 ~ 5,000만원" (annual cost about KRW 15M to 50M). — [KAQG scheme page](https://kaqg.or.kr/kaqg/newpage/newpage.php?f_id=scheme)

**Sacheon and Gyeongnam cluster**
- [PRESS] "KAI뿐만 아니라 관련 협력사 300여개도 이 지역에 있다" (besides KAI, about 300 related suppliers are in the area). Per KDI data, Sacheon accounts for 80% of domestic aircraft-manufacturing production value, 70% of workers and 67% of establishments ("국내 항공기 제조 분야 생산액의 80%, 관련 종사자의 70%, 사업체 67%가 KAI를 중심으로 한 사천에 기반한다"). — [Sisajournal-e, Mar 10, 2023](https://www.sisajournal-e.com/news/articleView.html?idxno=297758)
- [PRESS] Search summaries of other counts:
  - Sacheon city counts about 50 aerospace companies (Sept 2025), while parts firms in Sacheon and Jinju number "in the hundreds". The gap depends on scope. — [Daum/KNN, Sep 21, 2025](https://v.daum.net/v/20250921191347898)
  - 120+ aerospace firms in Busan-Ulsan-Gyeongnam (2023). — [Daum, Sep 2, 2025](https://v.daum.net/v/20250902191026795)
  - In 2005, 51 of 83 domestic aviation firms were in Sacheon, with 83% of national sales. — [Hankook Ilbo 2005](https://www.hankookilbo.com/news/article/200505230057000099)

  Exact attribution to each article came from a search summary and was not fetched.
- [PRESS] Gyeongnam firms at trade shows:
  - Paris Air Show 2025: 13 firms, 145 export consultations, about US$900M (some reports say US$800M), with about 100 meetings with Boeing, Airbus, Collins, Northrop Grumman and Embraer. — [Gyeongnam Domin Ilbo](https://www.idomin.com/news/curationView.html?idxno=940113); [Herald Economy](https://biz.heraldcorp.com/article/10515517)
  - Farnborough 2026 (July): 8 firms, over US$300M in consultations (6x 2024), counterparts incl. Pratt & Whitney and Airbus UK. — [Nate News, Jul 26, 2026](https://m.news.nate.com/view/20260726n03591)

**Primes, exporters and FAI flowdown**
- [FACT] Boeing Korea materials name KAL-ASD as a key Boeing parts supplier; Korean suppliers support 737 through 787 programs. — [Boeing Korea backgrounder (KR)](https://www.boeing.com/content/dam/boeing/boeingdotcom/company/key_orgs/boeing-international/pdf/koreabackgrounder_KR.pdf)
- [PRESS] Per search summaries (not fetched):
  - KAI and Korean Air take Airbus orders and spread the work across about 50 SME suppliers; Airbus planned to raise Korean sourcing from about KRW 700B to over KRW 1T (2022 article).
  - KAI and KAL-ASD are Airbus's main Korean Tier 1s, supplying wing structures, fuselage assemblies and composite parts (2025).
  - ASTK (아스트) B737 MAX Section 48 revenue rose from KRW 45.7B (2024) to KRW 84.9B (2025).
  — [The Fact](https://news.tf.co.kr/read/economy/2252710.htm); [eToday](https://www.etoday.co.kr/news/view/2515322); [Newstomato](https://newstomato.com/ReadNews.aspx?no=1160588); [Dealsite](https://dealsite.co.kr/articles/168864)
- [FACT] Hanwha SQAR Q2000 requires suppliers to record FAI on AS9102 FAIR Forms 1, 2, 3 per the latest AS9102 revision, and bars later lots before FAI approval. — [Hanwha SQAR](https://m.hanwhacorp.co.kr/upload/machine/standard/20170901/9d1eb84b-3d8d-4b31-8892-52ab17e71576.pdf)
- [FACT] KAIA (한국우주항공산업협회) runs a "항공우주방위산업 초도품 성적서 작성(AS9102)" (FAIR writing) training course. It has also subsidized KS Q 9100 and NADCAP consulting and certification for Jinju/Sacheon firms at about 50% of cost under the national innovation cluster program. — [KAIA course listing](https://aerospace.or.kr/m/mn04/mn04_12_view.php?id=60); [KAIA KS Q 9100/NADCAP support notice](http://aerospace.or.kr/m/mn04/mn04_11_view.php?id=948)

**Labor shortage and the AI push**
- [PRESS] KAI, Yonam College of Technology and KTL held an "Aerospace Strong SME CEO AX·DX Special Lecture" on Oct 28, 2026 with **42 supplier companies** (about 60 attendees). KAI cited labor shortages and productivity challenges at smaller suppliers. AI training for supplier practitioners starts in Nov 2026, and from 2027 customized AI practical training becomes a regular course. KAI executive Yang Hong-seok: "지속적인 교육과 실질적인 AI 제조 인프라 구축 지원을 통해 협력사의 경쟁력을 높이겠다" (we will raise supplier competitiveness through continuous training and support for practical AI manufacturing infrastructure). The article does not mention FAI or quality documentation. — [Sidae, Oct 29, 2026](https://www.sidae.com/article/2026102912412148792)
- [PRESS] Gyeongnam column: "대부분의 기업들이 항공전문인력 수급문제와 각종 인증문제 등에 직면하고 있는 것이 현실이다" (most firms face aerospace specialist staffing and certification problems), addressed by a KRW 10B/yr national innovation cluster program. — [Gyeongnam Ilbo column](https://www.gnnews.co.kr/news/articleView.html?idxno=515515)
- [PRESS] Sacheon city says SMEs struggle with "고가 장비와 전문 인력 부족" (expensive equipment and lack of specialists). It is pushing a "스마트 자율제조 AI 팩토리 구축 사업" (smart autonomous-manufacturing AI factory project) with real-time quality judgment. A Gyeongnam workforce program trained 179 people since 2021, 115 of them employed (attribution to this article from search summary). — [Gyeongnam Ilbo, Sacheon SMEs](https://www.gnnews.co.kr/news/articleView.html?idxno=633428)
- [PRESS] Incheon survey (Kyeongin Ilbo, May 10, 2026): of 150 SMEs, 115 (76.7%) are interested in entering aerospace, but "준비·검토 경험이 있는 기업은 절반 수준에 그쳤고" (only about half have prepared or reviewed entry). They struggle to understand "항공용 부품에 요구되는 기술·품질 기준과 인증 절차" (the technical and quality standards and certification procedures for aerospace parts). — [Kyeongin Ilbo, May 10, 2026](https://www.kyeongin.com/article/1763300)
- [PRESS] New entrants are still certifying in 2026: QRT, which calls itself the first Korean private test lab with AS/EN9100 (Oct 22, 2026), and drone maker Preneu. — [Newspim, Oct 22, 2026](https://www.newspim.com/news/view/20261022000498); [Robot Newspaper](https://www.irobotnews.com/news/articleView.html?idxno=45112)

### Inferences
- Korean Tier 2/3 shops working for KAI, KAL-ASD and Hanwha get AS9102 Forms 1 to 3 flowed down by domestic primes. Those exporting directly or via Tier 1s to Boeing, Spirit, Airbus or engine OEMs inherit those primes' FAI and portal rules, possibly Net-Inspect for Boeing-listed part numbers. The KAIA course is evidence the skill is scarce and must be trained.
- KAI's Oct 2026 supplier AX program (42 suppliers, training from Nov 2026, formalized in 2027) is a concrete channel for a Korean-language, AI-assisted FAI pilot. It would be pitched as a supplier productivity tool, and it fits the founder's "assist, not replace" and labor-shortage framing.
- The Korean market is small: about 640 certifications, around 300 KAI suppliers in Sacheon, and perhaps 50 SMEs on Airbus work. It is a reasonable beachhead or reference market, not a scale market. Self-service SaaS may need local partners (KAIA, KTL, Yonam, Sacheon city) for adoption.

### Gaps
- No exact current count of Korean aerospace parts suppliers by tier or size, and no split of AS9100 vs KS Q 9100 holders.
- I did not confirm which Korean suppliers submit FAIs via Net-Inspect, or whether KAI and KAL-ASD use a digital FAI portal for their sub-tiers.
- No Korean-language evidence of FAI-specific workload, turnover or tool usage (Excel vs software) at Sacheon shops. etnews and KAIA statistical yearbooks were not searched.
