# Customer counts and willingness-to-pay by segment for an AI-assisted, browser-based scan-to-CAD product (as of Nov 3, 2026)

Method and access notes. US counts come straight from the Census Bureau flat files, downloaded on 2026-11-03: CBP 2023, SUSB 2022 and Nonemployer 2024. The Census API now requires a key, so the bulk files were used instead. CBP 2024 was not posted as of 2026-11-03: the dataset directory stops at 2023 and the expected `cbp24us.zip` path returns 404. EU counts come straight from the Eurostat SBS API (`sbs_ovw_act`, `sbs_sc_ovw`). Korea counts come from the full 2025 Root Industry Survey PDF (뿌리산업 실태조사), and Japan from the Japan Die & Mould Industry Association (JDMIA) statistics PDF, which cites METI. FreeCAD downloads come from the GitHub API. Autodesk, Dassault investor and Thomasnet category pages partly returned HTTP 403. Where a figure comes from a search-engine summary and not from a fetched page, it is marked "(via search summary)". Every number is labelled as **disclosed** (a primary or official figure) or **estimate** (my arithmetic or assumption).

---

## 1. How many establishments are in the relevant manufacturing and design segments (US, EU, Korea, Japan, China), and how big are they?

### Takeaway
The core Stage 2 segments (machine shops, die/tool/mold makers, industrial design firms, scanning bureaus) hold about **22.7k US establishments (CBP 2023)**. Add **~152k EU enterprises (2024)**, **~29.7k Korean root-industry firms** in mold, precision machining, injection/press, engineering design and AM (end-2024), **4,077 Japanese mold establishments (2024)** and **~30k Chinese mold makers** (low-confidence aggregator figure). The total is about **238k worldwide**. The segments are overwhelmingly small. In the US, **83% of machine shops have 1–19 employees**. In the EU, **85% of C25.6 enterprises (machining plus coating) have 0–9 persons**. In Japan, **62% of mold establishments have 9 or fewer employees**. Korean mold firms average **7.8 workers**. Counts are flat to slowly falling in manufacturing and rising in engineering and design services.

### Cited Findings

**United States: Census County Business Patterns 2023** (establishments; reference year 2023; file dated 2025-05-29; the size bands sum to the total, so "<5" includes zero-employee establishments). Disclosed. Source: [Census CBP 2023 US file](https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23us.zip); [CBP datasets index](https://www2.census.gov/programs-surveys/cbp/datasets/)

| NAICS | Industry | Establishments | Employees | 1–19 emp (<5 / 5–9 / 10–19) | 20–99 | 100+ |
|---|---|---|---|---|---|---|
| 332710 | Machine shops | 17,156 | 223,313 | 14,284 (7,877 / 3,632 / 2,775) | 2,606 | 266 |
| 333514 | Special die & tool, die set, jig & fixture | 1,976 | 40,467 | 1,467 (648 / 432 / 387) | 441 | 68 |
| 333511 | Industrial mold | 1,252 | 30,855 | 849 (370 / 263 / 216) | 349 | 54 |
| 3363 | Motor vehicle parts | 4,659 | 587,237 | 2,154 (1,125 / 523 / 506) | 1,183 | 1,322 |
| 3364 | Aerospace product & parts (total) | 1,907 | 428,728 | 877 | 530 | 500 |
| 336411 | Aircraft | 358 | 172,941 | 220 | 57 | 81 |
| 336412 | Aircraft engine & engine parts | 440 | 75,499 | 176 | 136 | 128 |
| 336413 | Other aircraft parts & auxiliary equipment | 966 | 104,573 | 441 | 303 | 222 |
| 541330 | Engineering services | 63,233 | 1,260,577 | 51,304 (33,565 / 9,459 / 8,280) | 9,786 | 2,143 |
| 541420 | Industrial design services | 1,591 | 14,360 | 1,480 (1,223 / 177 / 80) | 85 | 23 |
| 541380 | Testing laboratories (incl. metrology) | 7,463 | 158,265 | 5,865 | 1,338 | 260 |
| 811310 | Commercial & industrial machinery repair | 22,907 | 219,835 | 20,707 | 1,989 | 211 |
| 326199 | All other plastics products | 5,546 | 392,611 | 2,636 | 1,827 | 1,083 |
| 339113 | Surgical appliance & supplies (orthotics/prosthetics) | 1,804 | 93,937 | 1,267 | 349 | 188 |
| 332 / 333 / 336 | Fabricated metal / machinery / transport equipment (context) | 53,790 / 21,668 / 11,691 | — | 38,017 / 13,237 / 5,968 | — | — |

- Year-over-year (CBP 2022 → 2023): machine shops 17,433 → 17,156 (−1.6%); 333514 2,006 → 1,976; 333511 1,286 → 1,252; 541330 62,590 → 63,233 (+1.0%); 541420 1,631 → 1,591; aerospace 3364 1,840 → 1,907. — [Census CBP 2022 US file](https://www2.census.gov/programs-surveys/cbp/datasets/2022/cbp22us.zip)

**United States: Statistics of US Businesses 2022 (firms, by enterprise size)**. Disclosed. — [Census SUSB 2022 6-digit NAICS file](https://www2.census.gov/programs-surveys/susb/tables/2022/us_state_6digitnaics_2022.txt)
- 332710 machine shops: **17,130 firms** (17,433 establishments). 14,254 firms have fewer than 20 employees, 2,368 have 20–99, 369 have 100–499 and 139 have 500+.
- 333514 die/tool/jig/fixture: **1,950 firms**. 1,439 have fewer than 20 employees, 371 have 20–99, 86 have 100–499 and 54 have 500+.
- 3363 motor vehicle parts: **3,616 firms**. 1,975 have fewer than 20 employees. The **352 firms with 500+ employees** own 1,168 establishments and 428,122 of the 572,859 employees (75%).
- 336411 / 336412 / 336413: 310 / 296 / 726 firms. Firms with 500+ employees number 29 / 41 / 68, and they hold 169,124 of 177,544 aircraft (336411) employees.
- 541330 engineering services: **45,692 firms**. 38,870 have fewer than 20 employees; 685 have 500+ (12,001 establishments).
- 541420 industrial design: **1,610 firms**, of which 1,479 have fewer than 20 employees.
- 811310 machinery repair: 20,481 firms, of which 18,703 have fewer than 20 employees.

**United States: Nonemployer Statistics 2024 (sole proprietors and other businesses with no payroll)**. Disclosed; national file goes only to 3–5 digit NAICS. — [Census Nonemployer 2024 US file](https://www2.census.gov/programs-surveys/nonemployer-statistics/datasets/2024/historical-datasets/nonemp24us.zip)
- Manufacturing (31–33): 421,812. Fabricated metal (332): 42,702. Machinery (333): 17,043. Transportation equipment (336): 16,820.
- Engineering services (54133): **89,254**. Specialized design services (5414, which also covers graphic, interior and fashion design): 284,294. Machinery repair (8113): 37,462.

**European Union (EU27): Eurostat Structural Business Statistics, number of enterprises**. Disclosed. EU aggregates ending in 000/500 are Eurostat-rounded estimates. — [Eurostat `sbs_ovw_act` API query](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?format=JSON&lang=en&geo=EU27_2020&indic_sbs=ENT_NR&nace_r2=C2562&nace_r2=C2573&nace_r2=C293&nace_r2=C303&nace_r2=M7112&nace_r2=M741&nace_r2=C2229&nace_r2=C3317); [Eurostat data browser sbs_ovw_act](https://ec.europa.eu/eurostat/databrowser/view/sbs_ovw_act/default/table)

| NACE | Activity | 2021 | 2022 | 2023 | 2024 |
|---|---|---|---|---|---|
| C25.62 | Machining | 130,994 | 134,171 | n/p | **137,428** |
| C25.73 | Manufacture of tools (incl. moulds) | 16,000 | 15,000 | 15,000 | **14,500** |
| C29.3 | Parts & accessories for motor vehicles | — | 9,509 | 9,500 | **9,400** |
| C30.3 | Air & spacecraft & related machinery | 1,469 | 1,532 | 1,600 | **1,650** |
| C33.17 | Repair & maintenance of other transport equipment | 4,000 | 4,204 | 4,500 | **4,804** |
| C22.29 | Other plastic products | 23,000 | 24,000 | 23,690 | **24,669** |
| M71.12 | Engineering activities & technical consultancy | 646,701 | 668,194 | 682,423 | **698,228** |
| M74.1 | Specialised design (incl. industrial, graphic, fashion) | 244,918 | 272,469 | 300,000 | **299,527** |

- Context, 2023: all manufacturing (C) 2,168,169 enterprises; C25 fabricated metal 412,708; C28 machinery 77,999; C29 motor vehicles 19,000. — [Eurostat API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?format=JSON&lang=en&geo=EU27_2020&indic_sbs=ENT_NR&nace_r2=C25&nace_r2=C28&nace_r2=C29&nace_r2=C&time=2023)
- Size classes, 2023 (persons employed). Disclosed. — [Eurostat `sbs_sc_ovw` API query](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_sc_ovw?format=JSON&lang=en&geo=EU27_2020&indic_sbs=ENT_NR&nace_r2=C256&nace_r2=C257&nace_r2=M711&nace_r2=C25&nace_r2=C28&time=2023)
  - C25.6 (treatment/coating plus machining): 163,092 in total. 0–9 persons: 139,000 (85%). 10–19: 11,000. 20–49: 8,540. 50–249: 3,773. 250+: 253.
  - C25.7 (cutlery, tools, general hardware): 46,000 in total. 0–9: 41,000. 10–19: 2,504. 20–49: 1,827. 50–249: 982. 250+: 189.
  - C29.3 auto parts: 9,500 in total. 0–9: 5,838. 20–49: 850. 50–249: 1,210. **250+: 900**. The 10–19 band was not published for 2023; it was 800 in 2022.
  - C30.3 aerospace: 1,600 in total. 0–9: 966. 10–19: 169. 20–49: 172. 50–249: 186. **250+: 110**.
  - M71.1 (architecture plus engineering): 1,013,810 in total. **0–1 persons: 801,242**. 2–9: 179,115. 10–19: 19,282. 20–49: 9,740. 50–249: 3,800. 250+: 620.
  - M74.1 specialised design: 300,000 in total, of which 260,334 have 0–1 persons.
- By country, 2023. C25.62 machining: Poland 26,729, Italy 17,774, Germany 16,286, France 6,305, Spain 4,751. C25.73 tools/moulds: Italy 2,954, Germany 2,765, France 891, Spain 868, Poland 555. — [Eurostat API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?format=JSON&lang=en&geo=DE&geo=IT&geo=FR&geo=ES&geo=PL&indic_sbs=ENT_NR&nace_r2=C2562&nace_r2=C2573&time=2023)

**Korea: 2025 Root Industry Survey (2025 뿌리산업 실태조사), as of 2024-12-31**. Published by KITECH's National Root Industry Promotion Center (국가뿌리산업진흥센터); fieldwork Aug–Nov 2025. Firms qualify if at least 1% of their revenue comes from root technologies. Disclosed. — [MOTIR/KITECH report PDF](https://www.motir.go.kr/attach/down/c145c495367b58bbf1f424cc84b36df0/6b3c899927c5ea44c464ce4572e8a081/9a9db098b587ee18b321c826f3707a49)
- All root-industry firms: **65,101**, with 744,543 workers.
- **Mold (금형): 9,209 firms** (14.1%) with **72,217 workers**: 65,404 regular, 191 non-regular and 6,622 self-employed. That is about **7.8 workers per firm** (my division).
- Precision machining (정밀가공): **12,937 firms**, 65,453 workers. Injection/press (사출·프레스): 4,403. Plastic working (소성가공): 6,065. Welding: 11,118. Surface treatment: 8,995. Casting: 1,886. Heat treatment: 1,322.
- Additive manufacturing (적층제조): **628**. Engineering design (엔지니어링 설계): **2,490**. Industrial intelligent SW: 3,006.
- Mold firms average 19.9 years old, and only 1.4% are under 5 years old.
- Mold workforce by age: 50s 22,186; 40s 20,016; 30s 14,734; 60+ 9,350; under 30 only 5,932 (8.2%). The workforce is aging and short of skilled labour.
- Method warning: the scope widened from 6 to 14 industries in Dec 2021, so pre-2021 figures are not comparable. Older figures include 30,553 firms at end-2020 and "~87,000 mold workers" in the 2019 white paper. — same report; [fnnews 2022](https://www.fnnews.com/news/202208151802335487)

**Japan: METI Manufacturing Establishment Survey (製造業事業所調査, formerly 工業統計), 2024, as compiled by JDMIA**. Disclosed. — [JDMIA "一目でわかる日本の金型産業" PDF (created 2026-09-16)](https://www.jdmia.or.jp/toukei/about_toukei_2026.pdf)
- **4,077 mold and die establishments**, with production of **¥1,454.8 billion** and about 70,000 workers.
- By employee size: **≤9: 2,545 (62.4%; 9.4% of output)**. 10–19: 679 (16.7%). 20–29: 347 (8.5%). 30–99: 417 (10.2%; 27.9% of output). 100–299: 82 (2.0%; with 300+, 41.7% of output). 300+: 7.
- At the 1991 peak there were about 13,000 establishments, 120,000 workers and about ¥2 trillion of output.
- 2023: 4,321 establishments, of which 2,640 (61.1%) had 9 or fewer employees (via search summary). — [JDMIA 2025 PDF](https://www.jdmia.or.jp/toukei/about_toukei_2025.pdf)
- World mold production table in the same JDMIA deck: China (2024) ¥7.04T (53.6%), US (2021) ¥2.30T (17.5%), Japan (2023) ¥0.98T (7.4%), Korea (2019) ¥0.96T (7.3%), Germany (2024) ¥0.64T (4.9%). The Japan figure here (¥0.98T) uses a different basis from the ¥1.45T establishment-survey figure.

**China (low confidence)**
- "About 30,000 mold enterprises", with annual output of about ¥220B and exports near $5B (industry research firm, Oct 2023; not a China Die & Mould Industry Association (CDMIA) primary release). — [ChinaBaogao](https://www.chinabaogao.com/baogao/202310/671454.html)
- Mold-manufacturing market of about ¥242.4B in 2023. — [Chyxx/智研咨询](https://www.chyxx.com/industry/1202298.html)

### Inferences
- **US core Stage 2 pool (estimate):** 332710 (17,156) + 333514 (1,976) + 333511 (1,252) + 541420 (1,591) + scanning bureaus (~725, Section 2) = **~22,700 establishments**. Of these, about 18,080 have 1–19 employees and about **7,350 have 10+ employees**.
- **US extended pool (estimate):**
  - Add auto parts plants under 100 employees (3,337), aerospace parts plants under 100 (744) and machinery repair shops (22,907). Repair shops are a real replacement-part RE use case.
  - Add 10–20% of 541330 engineering services, about 6,300–12,600 establishments. This share is my assumption, because 541330 is dominated by civil and building engineering.
  - Result: **~56k–62k US establishments**.
- **EU core pool (estimate):** C25.62 (137,428) + C25.73 (14,500) = **~152k enterprises**, or about 163k with auto and aero parts. A conservative cut keeps only enterprises with 10+ persons in C25.6 and C25.7 (2023). That gives 23,566 + 5,502 = **~29,100**, comparable to the US 10+ figure of about 7,350.
- **Korea pool (estimate):** mold (9,209) + precision machining (12,937) + injection/press (4,403) + engineering design (2,490) + AM (628) = **~29,700 firms**.
- **Global core (estimate):** US 22.7k + EU 151.9k + Korea 29.7k + Japan 4.1k + China ~30k ≈ **238k**. The definitions differ: US establishments, EU enterprises, Korean firms with at least 1% root-tech revenue, and a China aggregator count. Treat the total as ±25%.
- Most of the pool consists of micro firms (1–9 people). That fits self-serve, per-part or low-cost pricing (Stage 1 to 2), and argues against seat-based selling. The large-firm tail is small, at about 2.8k auto and aero sites in the US and EU (Section 8).
- Korea and Japan are aging, shrinking mold industries. Japan has fallen from about 13,000 to 4,077 establishments since 1991, and only 8.2% of Korean mold workers are under 30. That supports an "automate the skilled modeller" pitch there.

### Gaps
- Korean figures by employee-size band, and a KOSIS Mining & Manufacturing Survey count for KSIC 29294 (mold), were not retrieved. KOSIS tables need interactive or API-key access.
- Japan counts outside molds (job-shop machining 2499/2929, auto parts 3113) were not retrieved from METI/e-Stat. The JDMIA PDF also does not state the survey's minimum employee threshold.
- China: no CDMIA or National Bureau of Statistics primary count for 规模以上 mold firms (those above the statistical size threshold) was found. "~30,000" is an aggregator figure.
- The EU 2023 figure for C25.62 was not published in the API response (2021, 2022 and 2024 were). EU size bands are available only at the 3-digit level (C25.6 combines coating and machining).
- No data shows what share of each segment actually reverse-engineers parts.

---

## 2. How many reverse-engineering and 3D scanning service bureaus are there?

### Takeaway
Directory counts swing by 20x depending on category definition. On Thomasnet, **13,929 US suppliers tag "Reverse Engineering Services"**, mostly machine shops and custom manufacturers listing RE as a side capability. Only **725 list "3D Digitizing & Scanning Services"** and **158 list "Laser Digitizing Services"**. So the US has an estimated **~700–1,000 specialist scan/RE bureaus** inside a pool of **~14k shops that sell RE occasionally**.

### Cited Findings
- Thomasnet "Reverse Engineering Services" category, USA: **13,929 suppliers** (fetched 2026-11-03). Of the 25 suppliers on page 1, 12 are "Custom Manufacturer", 5 "Manufacturer", 6 "Service Company", 1 distributor and 1 integrator. — [Thomasnet](https://www.thomasnet.com/suppliers/usa/reverse-engineering-services-26221259)
- Thomasnet's own article says "more than 13,090 suppliers of reverse engineering services in the US" (undated). — [Thomasnet article](https://www.thomasnet.com/articles/top-suppliers/reverse-engineering-service-suppliers/)
- Thomasnet "3D Digitizing & Scanning Services": **725 suppliers** (fetched 2026-11-03). — [Thomasnet](https://www.thomasnet.com/suppliers/usa/3d-digitizing-services-85450906)
- Thomasnet "Laser Digitizing Services": **158 suppliers**. — [Thomasnet](https://www.thomasnet.com/suppliers/usa/laser-digitizing-services-43277458)
- Thomasnet "scanning services": "more than 540 suppliers" (article reviewed 2026-04-16; via search summary). — [Thomasnet article](https://www.thomasnet.com/articles/top-suppliers/scanning-services-manufacturers-suppliers/)
- Thomasnet "3D Scanning, Digitizing & Reverse Engineering Lasers": 15,107 suppliers. This is clearly over-matched and not usable as a bureau count. — [Thomasnet](https://www.thomasnet.com/suppliers/usa/3d-scanning-digitizing-reverse-engineering-lasers-96158597)
- US DoD: DLA identified **124 contractors** that ran reverse-engineering projects in FY2015–2018, of which **103 were small businesses** (GAO-19-586, 2019-07-31). — [GAO](https://www.gao.gov/products/gao-19-586)
- Xometry marketplace, at 2025-12-31: **4,996 active suppliers** (any manufacturing process), **81,821 active buyers** (+20% YoY) and **1,760 enterprise buyers spending ≥$50k** in the trailing twelve months (via search summary of the 10-K and the release). The 10-K's "over 500,000 North American suppliers" refers to the Thomasnet directory. — [Xometry FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1657573/000119312526066959/xmtr-20251231.htm); [CIMdata reprint of Q4 2025 release](https://www.cimdata.com/en/industry-summary-articles/item/29521-xometry-reports-record-fourth-quarter-and-strong-full-year-2025-results)
- Rail: Deutsche Bahn's "Mobility goes Additive" network (founded 2016) has **140+ member organisations** (Dec 2025). — [Voxelmatters](https://www.voxelmatters.com/deutsche-bahn-celebrates-10-years-of-3d-printing/)

### Inferences
- **Specialist US bureaus (estimate): ~700–1,000.** This takes the 725 "3D Digitizing & Scanning" listings, adds part of the 158 laser-digitizing listings (overlapping) and allows for firms not on Thomasnet.
- **Global specialist bureaus (estimate): ~2,000–3,500.** This assumes the US holds about 25–35% of global specialist bureaus, roughly its share of high-value manufacturing. It is an assumption, not data.
- The ~13.9k US RE listings fit the "occasional RE" behaviour of machine shops: 13.9k is about 60% of the ~22.7k US core pool. This is an upper bound on the share of shops that claim any RE capability.
- The DLA contractor base (124 firms, mostly small) is a ready list of defense-qualified RE service providers who are natural early Stage 2/3 users.

### Gaps
- No Aniwaa, Xometry-partner or association directory count specific to scan-to-CAD bureaus was found.
- No EU or Asian directory counts were found. IndiaMART has many listings but gives no total.
- Thomasnet counts include duplicates and multi-location listings, and they cannot be filtered without registration.

---

## 3. How large are the CAD platform user bases that a plugin or browser product could reach?

### Takeaway
The vendors' own counts are: **SOLIDWORKS ~8M users and 1.4M+ commercial seats** (Dassault, June 2025), **Fusion "4.6M+ professionals"** plus about 5M education users (Autodesk, undated), and **Onshape "2M+ users"** (Onshape, about 2021–22; no newer official number). **FreeCAD stable releases logged ~13.3M GitHub downloads between Nov 2024 and Nov 2026.** Adjacent maker platforms are larger still: **Bambu MakerWorld ~10M monthly active users and ~280k designers** (2025). None of the vendors disclose free and hobby license counts.

### Cited Findings
**SOLIDWORKS (Dassault Systèmes)**
- June 2025 investor presentation: **8,000,000 users, 1,400,000+ commercial seats, 285,000+ commercial clients** (via search summary; the deck returned 403 to direct fetch). — [Dassault investor deck](https://investor.3ds.com/static-files/244bcb42-1a84-4dff-9f65-a577cd67916b)
- Wikipedia: "as of 2024, an estimated 7.5 million users". — [Wikipedia](https://en.wikipedia.org/wiki/SolidWorks)
- Older official figure: 2.3M active users at 234,800 companies (dated blog post). — [SOLIDWORKS blog](https://blogs.solidworks.com/products/solidworks/growing-solidworks-nation/)
- SOLIDWORKS 2026 launch (2025-11-18) is pitched at "millions of users", with no new number. — [Dassault press release](https://www.3ds.com/newsroom/media-alerts/dassault-systemes-announces-solidworks-2026-ai-powered-design-and-collaboration-generative-economy)

**Autodesk Fusion**
- Fusion overview page: "trusted by over **4.6 million** professionals" (undated marketing claim; via search summary, since the page returns 403). — [Autodesk Fusion overview](https://www.autodesk.com/products/fusion-360/overview); [Autodesk "5 reasons" campaign](https://www.autodesk.com/campaigns/fusion-360/5-reasons-why)
- Older counts: 1.2M users (campaign) and "a community of 1.3 million users" (Fusion 10-year anniversary post, around 2023). — [Autodesk blog](https://www.autodesk.com/products/fusion-360/blog/autodesk-fusion-10-year-anniversary-celebration/)
- Education: about **5M Fusion education users** and 100M Tinkercad users. Autodesk-wide, 150M+ students and educators have been served free (2025-11-19). — [Autodesk News](https://adsknews.autodesk.com/en/news/150m-students-educators/)
- Blog title: "Autodesk – The First to Pioneer Cloud-CAD With Over 55 Million Users Today". This is an Autodesk-wide cloud figure, not Fusion-only; the body was not retrievable. — [Autodesk blog](https://www.autodesk.com/products/fusion-360/blog/autodesk-the-first-to-pioneer-cloud-cad-with-over-55-million-users-today/)
- Free "Fusion for personal use": non-commercial, home-based use only; limited features; renewable (term reported as 3 years on Autodesk pages, 1 year by All3DP). **No count disclosed.** — [Autodesk personal use](https://autodesk.com/products/fusion-360/personal); [Autodesk eligibility FAQ](https://autodesk.com/support/technical/article/Do-I-qualify-for-free-use-of-Fusion-360); [All3DP](https://all3dp.com/2/fusion-360-free-download-is-there-a-free-version/)
- "152,000 Fusion 360 subscribers": undated third-party claim of **low reliability**. — [citybiz](https://www.citybiz.co/article/76407/autodesk-an-unstoppable-growth-stock/)
- AI willingness-to-pay signal: in a US receipt panel (Aug 2025–Aug 2026), **29.8% of Autodesk Fusion/manufacturing subscribers paid for AI**, versus 16.6% of AEC subscribers (YipitData; via search summary). — [YipitData](https://ask.yipitdata.com/insights/autodesk-make-design-paid-ai-overlap)

**Onshape (PTC)**
- "Onshape is the top CAD software for 2M users" (Onshape blog, around 2021–22). — [Onshape blog](https://www.onshape.com/en/blog/onshape-is-the-top-cad-software-for-2m-users)
- A Tech-Clarity page says Onshape's GM cited "3 million users" (undated; weak). — [Tech-Clarity](https://tech-clarity.com/author/mboucher/page/8)
- An Onshape forum moderator said the company does not publish total or paid user counts (via search summary). — [Onshape forum](https://forum.onshape.com/discussion/comment/7432)
- PTC's 2025 Onshape press releases (AI Advisor, Apr 15 and Oct 14, 2025) disclose no user count. — [PTC press release](https://www.ptc.com/en/news/2025/ptc-announces-latest-onshape-ai-advisor-release)
- Free plan: non-commercial, all documents public; education free. — [Onshape pricing](https://www.onshape.com/en/pricing)

**FreeCAD (open source)**
- GitHub release asset downloads, fetched via the GitHub API on 2026-11-03. Disclosed raw counts; downloads are not users.
  - 1.0.0 (2024-11-19): 2,694,581.
  - 1.0.1: 1,246,970.
  - 1.0.2 (2025-08-06): 3,620,573.
  - 1.1.0 (2026-03-25): 570,924.
  - 1.1.1: 2,272,797.
  - 1.1.2: 71,241.
  - 1.1.3 (2026-07-25): 1,729,873.
  - 1.1.4 (2026-09-28): 1,050,763 in about 5 weeks.
  - **Total for 1.x stable: 13,257,722** over about 2 years. For comparison, the 0.21.x series (2023) logged 4,829,004.
  — [GitHub API: FreeCAD releases](https://api.github.com/repos/FreeCAD/FreeCAD/releases); [FreeCAD releases page](https://github.com/FreeCAD/FreeCAD/releases)

**Rhino, Shapr3D**
- Rhino: "well over 150,000" users worldwide (CEO interview, Rhino 4 era, about 15 years old). A reseller claims "270,000+ clients worldwide" (undefined). — [Novedge interview](https://novedge.com/blogs/news/an-interview-with-robert-mcneel-ceo-of-mcneel-and-associates-rhino-3d); [Graitec](https://graitec.com/us/software/mcneel/)
- Shapr3D: no current user count found (see Gaps).

**Maker ecosystem (Stage 1 context)**
- Bambu Lab MakerWorld (2025 results, published around Feb 2026):
  - About **10M monthly active users**, 2.6M models and about **280k designers**.
  - About 2M Bambu Handy app downloads in 2025; printer unit sales roughly tripled from 2024 to 2025 (analyst estimate).
  — [3DPrint.com](https://3dprint.com/324181/bambu-lab-says-2025-was-a-breakout-year-10-million-monthly-users-and-real-business-growth/amp/)
- CONTEXT:
  - Entry-level 3D printers (<$2,500): **over 1M units shipped in Q1 2025**. Full-year 2025 shipments were **+26%**, and Q4 2025 was +47%.
  - Bambu Lab held a 37% share, and Chinese vendors over 90%.
  - Professional ($2.5k–$20k) shipments fell 15% in 2025.
  — [CONTEXT, 2026-04-15](https://www.contextworld.com/quarterly-industrial-3d-printer-shipments-rebound-amid-continued-record-breaking-entry-level-growth); [TCT Magazine, Q1 2025](https://www.tctmagazine.com/additive-manufacturing-3d-printing-news/tariffs-fears-push-entry-level-3d-printer-shipments-in-q1-to-1-million/)
- Bambu Lab revenue of about RMB 10B in 2025. — [KrASIA](https://kr-asia.com/pulses/161999)
- Creality sold 720k printers in 2025, per its Hong Kong IPO filing as cited in a forum post (low reliability). — [Bambu forum](https://forum.bambulab.com/t/creality-ipo-their-sales-figures-and-their-estimates-of-bambus/256409)

### Inferences
- **Plugin reach (estimate):** Fusion (4.6M claimed) plus Onshape (2–3M) gives about **6.6–7.6M registered users** across the two launch plugin platforms. This counts free, hobby and education users. The commercial paying share is likely a small fraction, since even an unverified "152k subscribers" would be about 3%.
- SOLIDWORKS's **1.4M commercial seats at 285k clients** is the best published proxy for professional mechanical CAD seats. The 285k client count roughly matches the global core pool from Section 1 (238k), and it suggests the average SOLIDWORKS client has about 5 seats.
- FreeCAD logs roughly **6–7M stable downloads a year**, showing a large zero-WTP open-source population. Downloads overstate users (repeat downloads, multiple installers per release) and miss Linux distro installs.
- MakerWorld's 280k active designers is a reasonable ceiling for "makers who model their own parts" on the largest consumer 3D-printing platform.

### Gaps
- Autodesk does not disclose Fusion paid subscribers, free personal-use licenses or startup licenses in its 10-K. The Fusion overview page (403) could not be read directly to date the 4.6M claim.
- No official Onshape figure since about 2022. No Shapr3D user count; only an old "1M+ downloads since 2016" claim surfaced, without a verifiable URL. No current Rhino license count.
- No full-year 2025 absolute unit count for entry-level printers was found. CONTEXT published only growth rates.

---

## 4. What is the installed base of existing reverse-engineering software (Design X, QUICKSURFACE, Mesh2Surface, Artec Studio, VXmodel)?

### Takeaway
**No vendor discloses seat or customer counts.** The only hard anchor is Geomagic's **~$30M revenue (2023, ~100 staff)**, together with its **$7.2M deferred revenue** at end-2024. That pair implies an estimated **~1,800–4,800 Geomagic seats on active maintenance or subscription**. Low-cost scanner campaign data (Revopoint Kickstarters at about 3–5.5k backers each) show the prosumer hardware base growing in the tens of thousands of units a year. Software attach rates are unknown.

### Cited Findings
- Geomagic business (Design X, Control X, Freeform, Wrap, Geomagic for SOLIDWORKS): **~$30M revenue and ~100 employees in 2023**; sold to Hexagon for $123M (announced 2024-12-12, closed 2025-04-01). — [Hexagon press release](https://hexagon.com/company/newsroom/press-releases/2024/hexagon-acquires-inspection-and-3d-modelling-software-capabilities-from-3d-systems)
- Geomagic held-for-sale group at 2024-12-31: **deferred revenue $7,197k**; total assets $3,176k. — [3D Systems 10-Q Q1 2025](https://www.sec.gov/Archives/edgar/data/910638/000091063825000010/ddd-20250331.htm)
- 3D Systems' CEO said Geomagic contributed about $7M of revenue in Q1 2025 (third-party transcript). — [VectorShift transcript](https://vectorshift.ai/research/companies/3d-systems/earnings/2025-q2.html)
- Design X has about 17 reviews on Capterra/GetApp, too few to indicate scale. One example deployment: LRZ (a German university computing centre) has 5 floating Geomagic licenses. — [Capterra](https://www.capterra.com/p/276905/Geomagic-Design-X/); [LRZ](https://doku.lrz.de/geomagic-design-x-10333347.html)
- KVS (QUICKSURFACE, Mesh2Surface): aggregator lists <25 employees and <$5M revenue (low reliability). — [NeverBounce listing](https://www.neverbounce.com/company/quicksurface/481192405)
- Artec 3D: scanners sold through 100+ resellers; "93% of our scanners purchased 10 years ago are still used today" (company claim). — [3DAdept interview](https://3dadept.com/andrei-vakulenko-unveils-his-point-of-view-of-the-3d-scanning-market/)
- Artec FY2025 revenue of €25.4M reported by Craft.co (unverified). — [Craft.co](https://craft.co/artec-3d)
- Revopoint Kickstarter campaigns (company-reported; via search summary):
  - MINI: $3,086,095 from **5,557 backers**. — [Revopoint forum](https://forum.revopoint3d.com/t/revopoint-mini-3d-scanner-is-successfully-funded-with-3-086-095-on-kickstarter/16774)
  - MIRACO: $2,986,325 from **2,923 backers**. — [Revopoint forum](https://forum.revopoint3d.com/t/gratitude-and-success-revopoint-miraco-raises-2-986-32-with-2-923-backers-pre-order-now/23125)
  - POP 4: "3,300+ backers, $2.6M+". — [Revopoint blog](https://global.revopoint3d.com/blogs/news?page=8)
  - MetroX: "nearly 3,000 backers". — [Revopoint press](https://www.revopoint3d.com/blogs/news/revopoint-metrox-now-in-the-online-store-check-out-our-black-friday-sale)
  - POP, POP 2 and MINI "in total raised more than $8 million" (2022). — [3D Printing Industry](https://3dprintingindustry.com/news/revopoint-launches-its-new-revopoint-range-3d-scanner-technical-specifications-and-pricing-220812/)
- Creaform VXmodel, Mesh2Surface and Artec Studio: no installed-base figures found in any source searched.

### Inferences
- **Geomagic seats on active maintenance or subscription (estimate):**
  - Assume the $7.2M deferred balance is 6–12 months of maintenance and subscription billings. Annual recurring billings are then about $7.2–14.4M.
  - Assume average annual maintenance of about $3–4k per seat (15–20% of a $15–21k list price; list prices from the companion pricing notes).
  - Result: **~1,800–4,800 seats** across all Geomagic products. The cumulative installed base, including lapsed perpetual seats, is probably several times larger, but no data supports a specific figure.
- **Revopoint campaign units (estimate):** the four campaigns above total about 14.8k backers. At about $500 per unit, the >$8M from POP, POP 2 and MINI implies about 16k units. Retail and Amazon sales come on top and are unknown. Several Chinese vendors (Revopoint, Creality, Shining 3D, 3DMakerpro) therefore plausibly add tens of thousands of prosumer scanners a year. This is the "mesh-producing" population that drives Stage 1.
- Dedicated professional RE software is a small niche (low thousands of active paid seats per major vendor). The growth is in scanner owners who lack RE software, which supports pricing below the incumbents.

### Gaps
- No disclosed seat, customer or user counts for Design X, QUICKSURFACE, Mesh2Surface, Artec Studio or VXmodel.
- No unit-shipment data for prosumer scanners (Shining 3D's annual report unit tables were not retrieved), and no data on the share of scanner buyers who buy scan-to-CAD software.

---

## 5. What indicates enterprise and regulated demand (Stage 3): legacy-part digitization programs, MRO spend, parts lacking CAD, budgets?

### Takeaway
The demand is large in part counts but poorly quantified in software dollars.
- Deutsche Bahn has **200,000+ printed parts** across **1,000+ applications** and has saved **>€20M since 2015**.
- DLA ran **~1,600 reverse-engineering projects in FY2015–18** (about 400 a year).
- The Army's CECOM screened about a third of a **98,000-part inventory** for additive manufacturing.
- Porsche Classic carries **~52,000 classic parts** (2018).
- Global commercial aviation MRO was **$136B in 2025** (Oliver Wyman).

Backflip's "**<1% of factory parts have digital models**" is an unverified company claim. No public figure was found for software budgets per program.

### Cited Findings
**Defense (US)**
- DLA started **over 1,600 reverse-engineering projects for spare parts in FY2015–2018**: about 1,000 DLA-funded and 600 contractor-funded, with nearly two-thirds in five part categories. It used 124 contractors, 103 of them small (GAO-19-586, 2019-07-31). — [GAO](https://www.gao.gov/products/gao-19-586)
- DLA Aviation's "Replenishment Parts Purchase or Borrow" program covers almost 200 items, and DoD owns technical data for about half of them. Its Reverse Engineering Technical Data Initiative (RETDI) keeps government data rights (via search summary). — [DLA Aviation Reverse Engineering](https://www.dla.mil/Aviation/Offers/Engineering/Reverse-Engineering/)
- The Air Force Rapid Sustainment Office (est. 2017) was set up to apply 3D printing and reverse engineering to parts "they may not have the designs for anymore". Then-acquisition chief Will Roper called for a "digital representation of every part in the Air Force inventory" (via search summary). — [Air & Space Forces](https://www.airandspaceforces.com/USAF-to-Stand-Up-New-Rapid-Sustainment-Office); [Air & Space Forces](https://www.airandspaceforces.com/air-force-searching-for-savvier-sustainment/)
- RSO solicitation for an "automated 3D scanning system" to reverse-engineer parts (date not confirmed). — [Air & Space Forces](https://www.airandspaceforces.com/?p=95540)
- B-2: the Air Force sought industry help to reverse-engineer Load Heat Exchanger parts. — [The War Zone](https://twz.com/39537/the-air-force-needs-to-reverse-engineer-parts-of-its-own-stealth-bomber)
- B-1: 76 interior panels were reverse-engineered (via search summary). — [Federal News Network](https://federalnewsnetwork.com/?p=1997090)
- Army:
  - Wichita State's National Institute for Aviation Research (NIAR) disassembles and 3D-scans every structural part of a UH-60 Black Hawk for a digital twin (2020). — [Wichita State NIAR](https://wichita.edu/research/NIAR/MediaCenter/2020-05.19.php)
  - CECOM evaluated about **one third of its 98,000-item inventory** and found **237 parts suitable for AM**. — [3D Printing Industry](https://3dprintingindustry.com/news/u-s-army-extends-digital-twin-project-to-aircraft-tanks-and-vr-training-177842/)
  - Oct 2026: Army combat-vehicle depots (Abrams) "have already demonstrated the ability to reverse engineer unavailable components". — [Fabbaloo](https://www.fabbaloo.com/?p=239268)
- Navy: the RESTORE lab took about **6 months from scan to printed prototype** to replace an obsolete antenna cover. — [AFCEA Signal](https://www.afcea.org/signal-media/us-navy-replaces-obsolete-part-3d-printing)
- Navy: an earlier ONR–GE contract of $9M over 4 years funded a digital-model-to-printed-part process. — [DE247](https://www.digitalengineering247.com/article/navy-to-develop-printed-repair-parts/3d-printing)

**Rail**
- Deutsche Bahn: **200,000+ parts** produced by 3D printing in 10 years; **1,000+ applications**; a digital warehouse of **1,000+ virtual models**; **>€20M saved since 2015** (Dec 2025). — [Voxelmatters](https://www.voxelmatters.com/deutsche-bahn-celebrates-10-years-of-3d-printing/); [RailwayPro](https://www.railwaypro.com/wp/db-marks-ten-years-of-3d-printing/); [heise](https://heise.de/-11091693); [Techbook (Nov 2025)](https://www.techbook.de/mobile-lifestyle/deutsche-bahn-druckt-ersatzteile)

**Automotive classic and spare parts**
- Porsche Classic's range "currently includes some **52,000 parts**". Porsche says "a 3D scan of the component is a sufficient basis to commence production" (press release, 2018-02-12). — [Porsche Newsroom](https://newsroom.porsche.com/en/company/porsche-classic-3d-printer-spare-parts-sls-printer-production-cars-innovative-14816.html)
- No current figures were found for Mercedes-Benz Classic or BMW Classic (see Gaps).

**MRO market (aviation)**
- Oliver Wyman 2026–2036 forecast: **2025 global MRO demand $136B** (+8% from $126B in 2024), rising to about $193B by 2030. The ARSA executive summary lists $139.6B and 3.3% CAGR for 2026–2036. — [Oliver Wyman](https://oliverwyman.com/our-expertise/insights/2026/feb/global-fleet-and-mro-market-forecast-2026-2036.html); [ARSA exec summary](https://arsa.org/wp-content/uploads/2026/03/ARSA-OW-2026FleetMROMarketReport-ExecSum-2026.pdf)
- The prior edition (Feb 2025) estimated $119B for 2025, so the series was revised upward. — [Oliver Wyman](https://www.oliverwyman.com/media-center/2025/feb/oliver-wyman-fleet-forecast-shows-aircraft-order-backlog-breaks-record-at-17000.html)
- GlobalData puts aerospace MRO at $115.1B in 2025. — [GlobalData](https://www.globaldata.com/store/report/aerospace-mro-overview-market-analysis/)

**Parts lacking CAD**
- Backflip CEO Greg Mark: "most factories have digital models for **less than one percent** of their parts". This is a company statement, not a survey. — [The Decoder](https://the-decoder.com/backflip-ai-turns-3d-scans-into-editable-cad-models-in-minutes-instead-of-hours/)
- Backflip raised $30M (NEA and a16z, Dec 2024). — [Business Wire](https://www.businesswire.com/news/home/20241218887310/en)

**Enterprise purchasing proxies**
- Xometry has 1,760 accounts spending at least $50k a year on custom parts (2025). — [CIMdata](https://www.cimdata.com/en/industry-summary-articles/item/29521-xometry-reports-record-fourth-quarter-and-strong-full-year-2025-results)
- Large-site counts: US aerospace product and parts plants with 100+ employees, 500; US auto-parts plants with 100+, 1,322 (CBP 2023). EU auto parts enterprises with 250+ persons, 900; EU aerospace with 250+, 110 (Eurostat 2023). — [Census CBP 2023](https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23us.zip); [Eurostat sbs_sc_ovw](https://ec.europa.eu/eurostat/databrowser/view/sbs_sc_ovw/default/table)

### Inferences
- **DB value per printed part (estimate):** €20M / 200k parts ≈ **€100 saved per part on average**. Value concentrates in a smaller set of high-value applications (1,000+), roughly €20k per application. Software priced at $10–$100 per digitized part is therefore well inside the value envelope.
- **DLA run-rate (estimate):** about 1,600 / 4 ≈ **400 RE projects a year**, spread over about 124 contractors. That is about 3 projects per contractor per year. RE projects in defense are slow, qualification-heavy engagements; CAD reconstruction is one step among several.
- Even if the "<1%" claim is overstated by 10x, the legacy-part backlog is effectively unbounded relative to current RE capacity. Examples: DB 200k parts, Porsche 52k, CECOM 98k items. The binding constraints are qualification, data rights and certification, not CAD-modelling cost alone.
- **Stage 3 logo pool (estimate):** about **2,800 large auto and aero sites in the US and EU**, plus defense depots, rail operators and energy utilities (not counted). This is consistent with the 1,760 Xometry enterprise accounts as a sanity check on how many large buyers procure custom parts.

### Gaps
- No public software budgets for RSO, DLA, Navy or DB programs; GAO-19-586 gives project counts but no cost per project in the retrieved pages.
- No 2025–2026 RSO-specific RE contract figures. No Mercedes-Benz Classic, BMW Classic or energy and utility legacy-part counts.
- No independent survey of the share of in-service parts lacking CAD.

---

## 6. What are the willingness-to-pay benchmarks?

### Takeaway
WTP falls into three bands that map to the stages:
- **Stage 1 (makers):** $0 to about $250 a year. Polycam Pro is about **$200 a year**, not $100. Revo Design Personal is about $225, and users balk at about A$850 a year.
- **Stage 2 (SMB):** about $700–$2,500 per seat per year. The anchors are Fusion $680, Onshape $1,500–2,500, Artec Studio Pro $1,700 and Design X Go $1,900.
- **Per part:** about **$2–$10 software cost** (Backflip), against **$300–$1,500 outsourced CAD plus $200–$400 scanning**.

The price gap between a $2–$10 software job and a $500–$1,900 outsourced job is about 100x. That gap is the core of the value proposition.

### Cited Findings
| Benchmark | Price | Date | Source |
|---|---|---|---|
| Backflip Builder / Pro / Business | $20 / $50 / $380 per month (100 / 300 / 2,500 credits); Fast job 10 credits, Thinking job 50 credits; credit packs at the same rates; Enterprise custom | page dated 2026-10-30 | [Backflip pricing](https://www.backflip.ai/pricing) |
| Backflip claim | A reconstruction "costing roughly $1,500 and taking two to three days" done "in five to 30 minutes for $10 or less" | 2026 | [The Decoder](https://the-decoder.com/backflip-ai-turns-3d-scans-into-editable-cad-models-in-minutes-instead-of-hours/) |
| Outsourced scan-to-CAD | $300–$800 per part (prismatic, print-bound); $800–$1,500 (toleranced or organic, for molding or CNC); scanning from $260; 8–10 business days | 2026-07-28 | [CADmore](https://cadmore.com/blog/reverse-engineering-cost-to-cad) |
| Outsourced 3D scanning | ~$200–$400 per part (via search summary) | 2026 | [3DPrintingServices.com](https://3dprintingservices.com/scanning-services) |
| Polycam Pro | $199.99/yr (App Store in-app purchase); $26.99/mo (July 2026). Older listings of $8–$17.99/mo are likely stale | 2026 | [AppPricingLab](https://apppricinglab.com/iap/apple/1532482376); [aipicks.jp](https://aipicks.jp/mag/polycam-guide-2026) |
| Autodesk Fusion (commercial) | $680/yr or $85/mo (US SRP, third-party summary of Autodesk 2026 pricing) | 2026 | [Vagon](https://vagon.io/blog/fusion-360-pricing) |
| Onshape | Free (non-commercial, public docs); Standard $1,500/user/yr; Professional $2,500/user/yr; Enterprise custom | fetched 2026-11-03 | [Onshape pricing](https://www.onshape.com/en/pricing) |
| Geomagic Design X Go | subscription "from $1,900" per year | 2026 | [Hexagon Design X plans](https://hexagon.com/products/geomagic-design-x/geomagic-design-x-plans) |
| Artec Studio 20 Pro | $1,700/yr term or $4,300 lifetime (v20 only) | 2026 | [MatterHackers](https://www.matterhackers.com/store/l/artec-studio-19-software-license) |
| Shining 3D EXModel | $495 retail, €580.8/yr incl. VAT; promo €/$149 for one year (Nov 2024) | 2024–26 | [Top3DShop](https://top3dshop.com/product/shining-3d-exmodel-reverse-engineering-software); [MakerPoint](https://www.makerpoint.nl/en-gb/software/shining3d-exmodel-1-year-210000002994); [Shining 3D promo](https://www.shining3d.com/exclusive-promotion-for-exmodel-transforming-3d-modeling-like-never-before?hsLang=en) |
| Revo Design Personal (Revopoint) | ~$225, non-commercial, no STEP export | June 2026 | [3DPrinting.com](https://3dprinting.com/scanners/3d-scanner-software/); [Revopoint](https://www.revopoint3d.com/pages/revo-design-personal) |
| Hobbyist sentiment | "$850 AUD" a year too much for occasional personal use. Would pay "~$500 once, but not every year". Wants "pay as you go" | 2025 | [Revopoint forum](https://forum.revopoint3d.com/t/revo-design-is-here/34701) |
| SMB setup cost | "For $2,000 to $5,000, a shop can now assemble a capable hardware-and-software setup"; scanners "as little as $300" | Apr 2026 | [Hexagon MI blog](https://blog.manufacturing.hexagon.com/digital-transformation-in-manufacturing/reverse-engineering/reverse-engineering-goes-mainstream/) |
| AI attach | 29.8% of Fusion/manufacturing subscribers paid for AI features (US receipt panel) | Aug 2025–Aug 2026 | [YipitData](https://ask.yipitdata.com/insights/autodesk-make-design-paid-ai-overlap) |

### Inferences
- **Backflip effective per-job price (estimate):**
  - Builder: Fast $2.00, Thinking $10.00.
  - Pro: $1.67 / $8.33.
  - Business: $1.52 / $7.60.
  - This sets the market's reference price for AI scan-to-CAD at about **$2–$10 per part**.
- **Stage 1 WTP (estimate): about $60–$240 a year.** Makers anchor on Polycam (~$200/yr), Revo Design Personal (~$225) and Backflip Builder ($240/yr). Many expect free (FreeCAD, free personal Fusion, Onshape Free). Per-part credits suit them better than subscriptions, as forum users ask for "pay as you go".
- **Stage 2 WTP (estimate): about $750–$2,500 per seat per year**, bounded by Fusion, Onshape and Design X Go. Alternatively, per-part pricing of $5–$50 is still a 95%+ saving against a $500–$1,900 outsourced job.
  - A shop that outsources 10 parts a year at about $1,000 each spends about $10k. Capturing 10–25% of that gives **$1k–$2.5k a year**, consistent with seat benchmarks.
- **Service bureau WTP (estimate): about $3k–$6k a year** (multi-seat, or Backflip Business at $4,560/yr). Alternatively, per-part pricing at 1–5% of the $300–$1,500 they bill clients.

### Gaps
- No survey of SMB manufacturers' total software or CAD spend as a share of revenue was found.
- No public enterprise ACV benchmarks for RE software. Backflip Enterprise and Design X Pro are quote-only.

---

## 7. How many parts does a typical small shop or service bureau reverse-engineer per year?

### Takeaway
**No published data was found.** The only signals are indirect: DLA ran about **400 RE projects a year** across about 124 contractors (about 3 per contractor), and one Indian bureau lists capacity of "30 per month". A labour-based derivation suggests **~100–500 parts a year per full-time RE engineer**. Small shops likely do **single to low double digits** a year (an assumption).

### Cited Findings
- DLA: about 1,600 RE projects in FY2015–2018 across 124 contractors. — [GAO-19-586](https://www.gao.gov/products/gao-19-586)
- An IndiaMART RE provider lists "Product Capacity: 30 per month" (unit undefined; directory listing). — [IndiaMART Pune RE listings](https://m.indiamart.com/pune/reverse-engineering-services.html)
- DB has 1,000+ printed-part applications over about 10 years. — [Voxelmatters](https://www.voxelmatters.com/deutsche-bahn-celebrates-10-years-of-3d-printing/)
- US reverse engineers charge $50–$145/hr; CADmore cites typical 8–10 business-day turnaround per part. — [CAD Crowd](https://www.cadcrowd.com/blog/wp-json/wp/v2/posts/26008); [CADmore](https://cadmore.com/blog/reverse-engineering-cost-to-cad)

### Inferences
- **Hours per part (estimate):** $300–$1,500 per part at $50–$145/hr implies about **3–15 skilled hours per part**.
- **Bureau throughput (estimate):** at about 1,500 billable hours a year, one RE engineer handles **~100–500 parts a year**. A 3–5 engineer bureau would handle about 300–2,500 parts a year.
- **Small shop volume (assumption): about 5–50 parts a year.** This bounds the shop as an occasional user and argues for per-part or credit pricing.
- **DB application rate (estimate):** about 100 new part applications a year, a lower bound on enterprise-scale RE volume per operator.

### Gaps
- No survey or company disclosure gives parts reverse-engineered per year for shops or bureaus. This is a key primary-research item: interview 10–20 bureaus and shops.

---

## 8. Synthesis: customer counts × WTP by stage (inputs for TAM/SAM/SOM)

### Takeaway
On disclosed counts and benchmark prices, the annual software TAM ranges are estimated at:
- **Stage 1 (makers):** ~$6–72M.
- **Stage 2 (SMB and bureaus):** ~$40–165M.
- **Stage 3 (enterprise and OEM):** ~$7–57M, plus OEM licensing.

Stage 2 is the largest and best-evidenced pool, at **~238k core establishments** worldwide. Stage 1 headcounts are large (millions of CAD and maker users) but carry very low WTP. Stage 3 is a small logo count (**~2.8k large US/EU auto and aero sites**) with unknown ACVs. All dollar figures below are **estimates** built from the cited counts and explicit assumptions.

### Cited Findings
- Counts used:
  - US core pool of 22,700 establishments and EU core of 151,928 enterprises (Section 1; [Census CBP 2023](https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23us.zip); [Eurostat](https://ec.europa.eu/eurostat/databrowser/view/sbs_ovw_act/default/table)).
  - Korean pool of 29,667 firms ([2025 Root Industry Survey](https://www.motir.go.kr/attach/down/c145c495367b58bbf1f424cc84b36df0/6b3c899927c5ea44c464ce4572e8a081/9a9db098b587ee18b321c826f3707a49)).
  - Japanese molds 4,077 ([JDMIA](https://www.jdmia.or.jp/toukei/about_toukei_2026.pdf)) and Chinese molds ~30,000 ([ChinaBaogao](https://www.chinabaogao.com/baogao/202310/671454.html)).
  - Thomasnet scanning bureaus 725 ([Thomasnet](https://www.thomasnet.com/suppliers/usa/3d-digitizing-services-85450906)).
  - MakerWorld 10M MAU ([3DPrint.com](https://3dprint.com/324181/bambu-lab-says-2025-was-a-breakout-year-10-million-monthly-users-and-real-business-growth/amp/)).
  - Large-site counts of 500 + 1,322 (US) and 900 + 110 (EU) (Section 5).
- Prices used: Backflip, Polycam, Fusion, Onshape and Design X Go (Section 6).

### Inferences
**Stage 1: makers, prosumers and very small shops (estimate)**
- Population with a scanner and an RE need: **100k–300k worldwide**. This assumes 1–3% of MakerWorld's 10M MAU own a low-cost scanner and need CAD from meshes. Cross-check: Revopoint campaigns alone delivered about 15k+ units, and a handful of Chinese vendors sell tens of thousands of units a year.
- Reachable CAD audience for plugins: Fusion 4.6M + Onshape 2–3M registered users (includes free and education).
- ARPU: $60–$240 a year.
- **TAM ≈ 100k–300k × $60–$240 ≈ $6M–$72M a year.**
- SOM (3 years): 2–5% of the population = 2,000–15,000 payers, giving **~$0.1M–$3.6M ARR**.

**Stage 2: SMB manufacturers and service bureaus (estimate)**
- Global core establishments: US 22.7k + EU 151.9k + Korea 29.7k + Japan 4.1k + China ~30k = **~238k**.
- Share that reverse-engineers parts at least occasionally: 20–40% (assumption). Thomasnet shows about 60% of US core shops claiming RE, an upper bound.
- ARPU: $750–$1,500 per account per year.
- **SMB TAM ≈ 238k × 20–40% × $750–$1,500 ≈ $36M–$143M a year.**
- Bureaus: about 2,000–3,500 worldwide × $3k–$6k = **~$6M–$21M a year**.
- Stage 2 total: **~$42M–$164M**.
- Conservative variant: count only firms with 10+ employees (US core 10+ about 7.35k; EU C25.6 plus C25.7 10+ about 29.1k; Japan molds 10+ about 1.5k; China and Korea not separable). That gives about 38k+ establishments outside China and Korea, at about $30M–$60M if 50–100% are RE-active at $1.5k.
- US-only SAM: 22.7k core establishments (bureaus included) × 30% × $1,000–$1,500 ≈ **$6.8M–$10.2M**. The extended US pool (56k–62k incl. machinery repair and engineering services) would roughly 2.5x that.

**Stage 3: enterprise, regulated and OEM/API (estimate)**
- Logos: about **2,832 large auto and aero sites (US+EU)**, plus defense depots, rail and energy (uncounted).
- Adoption 10–20% × ACV $25k–$100k (assumption; Backflip Business is $4.6k a year; legacy-part programs process 100s to 1,000s of parts a year) → **~$7M–$57M a year**.
- OEM/API licensing: the candidate scanner vendors already bundling RE software (Revopoint, Creality, Shining 3D, Artec, and others per the companion channel notes) number roughly 10–20 firms. Licence value per OEM is unknown (gap).
- Value cross-check: DB saves about €100 per printed part, and outsourced RE costs $500–$1,900 per part. Pricing of $20–$100 per digitized part leaves 80–99% of the value with the customer.

**Overall**
- **Combined TAM (estimate): about $55M–$290M a year.** This sits between the low-quality "RE software" market reports and the very large "RE services" figures in the companion notes. Most of the dollar upside is in converting outsourced service spend (about $500–$1,900 per part) into software, not in incumbent seat replacement.

### Gaps
- The adoption shares (20–40% SMB; 10–20% enterprise), the Stage 1 scanner-owner population, and enterprise ACVs are assumptions. Each needs primary validation through surveys, design-partner pricing tests and scanner-vendor sell-through data.
- Exchange-rate and definitional differences (establishment vs enterprise vs firm) were not normalised. Chinese and Korean size distributions are missing.
