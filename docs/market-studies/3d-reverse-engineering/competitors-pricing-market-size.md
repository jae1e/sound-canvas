# Competitive landscape, pricing and market size: scan-to-CAD (reverse engineering) and scan-based inspection software (as of Nov 2026)

Research date: 2026-11-03. Older facts carry their dates. Prices from third-party storefronts are often undated and may be stale; each one is flagged. "Fact" means the figure was stated by the cited source. It does not mean the figure is audited.

---

## 1. Reverse engineering (scan-to-CAD / mesh-to-CAD) competitors to Geomagic Design X: who they are and who is gaining

### Takeaway
Design X is squeezed from three directions. Below it are cheap standalone tools and CAD plug-ins (QUICKSURFACE and Mesh2Surface, both from KVS, plus Creaform Scan-to-CAD). Many of these are bundled with low-cost Chinese scanners from Revopoint, Creality and Shining 3D. Beside it, CAD vendors have built mesh handling into their own products: SOLIDWORKS ScanTo3D, Siemens NX Convergent Modeling, Fusion and Rhino. In 2025–2026 a new class of AI mesh-to-parametric-CAD tools appeared, led by Backflip AI, which starts at $20/month. No source gives market shares. The visible momentum is in low-cost bundles and AI entrants. Hexagon cut Design X's entry price to $1,900/yr (Go tier), which looks like a response to that pressure.

### Cited Findings
**Standalone and plug-in scan-to-CAD tools**
- QUICKSURFACE comes in Lite and Pro editions with a 30-day free trial. One account can be signed in on only one device at a time. Revopoint resells it. — [Revopoint QUICKSURFACE support](https://global.revopoint3d.com/pages/support-quicksurface); [Revopoint product page (DE)](https://global.revopoint3d.com/en-de/products/quicksurface)
- Creality bundles QUICKSURFACE with its scanners and gives 20% off QUICKSURFACE when bought with a scanner. The license key is emailed within 3 working days. — [Creality store (AU) scanner + QUICKSURFACE combo](https://store.creality.com/au/products/scanner-quicksurface-combo)
- Mesh2Surface for Rhinoceros (Rhino 5/6/7/8) is sold as a perpetual license with "no maintenance fee". Mesh2Surface for SOLIDWORKS and QUICKSURFACE Pro are listed on the same vendor site, so they come from the same developer family. — [Mesh2Surface pricing page](https://www.mesh2surface.com/pricing/)
- Mesh2Surface for SOLIDWORKS launched in Japan on 25 April 2022 through reseller Diplos. It supports SOLIDWORKS 2017+. — [MONOist, May 2022](https://monoist.itmedia.co.jp/mn/articles/2205/10/news017.html); [newscast.jp](https://newscast.jp/smart/news/0986012)
- Novedge markets Mesh2Surface Premium for Rhino as costing "less than 10%" of a high-end reverse engineering package. This is a vendor marketing claim. — [Novedge](https://novedge.com/products/15558)
- Shining 3D partnered with Rhino and Mesh2Surface on a scan-plus-modeling offer (headline-level fact; date not checked). — [VoxelMatters](https://www.voxelmatters.com/shining-3d-partners-rhino-mesh2surface-offer-solutions-3d-modeling-3d-scanning.md); [TCT Magazine](https://www.tctmagazine.com/shining-3d-rhinoceros-mesh2software-software/)
- Creaform's VXmodel has been succeeded by a product called "Scan-to-CAD", described as "the evolution of the former VXmodel software package". — [3DNatives](https://www.3dnatives.com/en/creaform-makes-scan-to-cad-seamless-for-additive-manufacturing-140420254/amp/)
- In 2017 Creaform sold Go!SCAN 3D plus VXmodel as a bundle "for under 20K USD". This shows its RE software has long been sold attached to its hardware. — [Creaform press release (2017)](https://www.creaform3d.com/en/about-us/press-releases/creaform-launches-its-new-goscan-3d-vxmodel-solution-under-20k-usd)
- Revopoint resells Hexagon/Geomagic products in its web store, including a "Design X Go" permanent license with one year of updates. Scanner makers are now channels for Design X itself. — [Revopoint Geomagic page](https://global.revopoint3d.com/products/geomagic); [Revopoint store (FR)](https://store.revopoint3d.com/fr/products/geomagic)

**CAD-embedded reverse engineering (the "good enough" threat)**
- SOLIDWORKS ScanTo3D is an add-in for occasional reverse engineering inside SOLIDWORKS. It imports mesh and point-cloud data and fits analytic and freeform surfaces. It is not a complete RE tool and is reported to be included only in the higher SOLIDWORKS tiers. A PTC forum user reported crashes when using it on point clouds. — [Hawk Ridge Systems ScanTo3D overview](https://hawkridgesys.com/blog/overview-scanto3d); [PTC community thread](https://www.ptcusercommunity.com/t5/3D-Part-Assembly-Design/Solidworks-ScanTo3D-vs-Reverse-Engineering-Extension/m-p/171256/highlight/true)
- Siemens NX handles scan facets natively through Convergent Modeling, with mesh, surface and solid in one model. A Korean reseller says NX was rebranded "Designcenter" from the June 2026 release; this was not verified with Siemens. — [Siemens NX Design blog](https://blogs.sw.siemens.com/nx-design/?p=1661); [yellowit.co.kr reseller](https://yellowit.co.kr/ug-nx-catia-solidwork-3d-cad/nx-%ec%97%ad%ec%84%a4%ea%b3%84-reverse-engineering-%ec%86%94%eb%a3%a8%ec%85%98-%ea%b2%ac%ec%a0%81-%ea%b5%ac%ec%9e%85-%eb%ac%b8%ec%9d%98/)
- Scantech's own buyer guide describes Design X as the dedicated tool that carries an editable feature tree into SOLIDWORKS, NX or Creo. It says PolyWorks|Modeler also transfers parametric sketches into several CAD systems. — [3d-scantech.com "Best Scan-to-CAD Software"](https://www.3d-scantech.com/best-scan-to-cad-software/)
- PTC Creo Reverse Engineering Extension: I found no substantive current comparison (see Gaps). — [PTC community thread](https://www.ptcusercommunity.com/t5/3D-Part-Assembly-Design/Solidworks-ScanTo3D-vs-Reverse-Engineering-Extension/m-p/171256/highlight/true)

**AI-native newcomers (2024–2026)**
- Backflip AI was founded in 2022 by Markforged co-founders Greg Mark (CEO) and David Benhaim (CTO). It raised a $30M Series A co-led by NEA and a16z. — [3DNatives](https://www.3dnatives.com/en/backflip-an-ai-model-generator-earns-30-mil-in-series-a-231220245/amp/); [Metal AM](https://www.metal-am.com/?p=105869)
- On 4 Aug 2026 Backflip released an updated foundation model that converts scans, STLs and meshes into editable parametric CAD with a feature tree. It ships as an Autodesk Fusion add-in and a web app, with plug-ins for other CADs "expected later this year". Plans (Builder/Pro/Business/Enterprise) start at $20/month. Backflip claims about $10 per part versus $1,500+ for manual RE, in 1–5 minutes. It "excels at moderate-complexity 3-axis CNC milled and turned parts". — [DEVELOP3D, 4–5 Aug 2026](https://develop3d.com/ai/backflip-ai-reverse-engineering/)
- Engineering.com quoted Mark saying the first model "wasn't good" and was never shipped. His pitch is that most factories have digital models for under 1% of their parts. — [Backflip coverage summarised via The Decoder](https://the-decoder.com/backflip-ai-turns-3d-scans-into-editable-cad-models-in-minutes-instead-of-hours/); [Fabbaloo](https://www.fabbaloo.com/news/backflips-3d-scan-to-cad-could-disrupt-almost-everything)

**Chinese scanner ecosystem (channel for RE software)**
- Scantech (思看科技, STAR 688583) and Bambu Lab signed a framework agreement in Jan 2026 to co-develop a consumer 3D scanner, made by Scantech and supplied to Bambu. This is another sign of consumer and prosumer scanning growth that will pull low-cost RE software with it. — [CLS](https://www.cls.cn/detail/2359197); [Gelonghui / Shenwan Hongyuan note](https://m.gelonghui.com/news/5230494)

### Inferences
- The low end is commoditising. QUICKSURFACE Pro sells for about $3.8–5.9k perpetual, Mesh2Surface for Rhino for €1,245 perpetual, Design X Go from $1,900/yr, and Backflip from $20/month. Full Design X costs about $21k (see section 3).
- The channel has moved toward scanner OEMs. Revopoint and Creality web stores sell QUICKSURFACE and even Design X Go. Creaform bundles its own Scan-to-CAD. The likely share gainers by unit volume are QUICKSURFACE (through Chinese OEM bundles), CAD-embedded tools, and AI tools. Share by revenue is unknown.
- Backflip's stated limit (moderate-complexity prismatic parts) suggests that, for now, AI tools threaten the large volume of simple prismatic-part work more than freeform or Class-A surfacing.

### Gaps
- No market-share data (units or revenue) exists in public sources for Design X versus QUICKSURFACE, Mesh2Surface, Creaform Scan-to-CAD or CAD-embedded tools.
- I found no reliable information on Korean newcomers. Design X's own Korean (Rapidform) heritage is covered by the other researcher.
- Exact Metrology appears to be a US services and reseller firm, not a software developer. I found no data on it.
- I did not verify current Autodesk Fusion mesh-to-BRep capabilities or packaging, Rhino 8 native tools, or PTC Creo REX status in 2026.
- I did not verify any current Artec Studio scan-to-CAD feature set.

---

## 2. Inspection and metrology competitors to Geomagic Control X: who leads

### Takeaway
No public market-share data exists. The evidence points to three leaders in scan-based inspection: InnovMetric's hardware-neutral PolyWorks|Inspector, ZEISS INSPECT (formerly GOM), which has a free tier and is tied to ZEISS/GOM hardware, and Hexagon's PC-DMIS/Inspire stack. Control X now sits inside Hexagon too. In 2026 PolyWorks's reseller network widened: AMETEK's merged "Faro Creaform" and Artec 3D (since Jan 2026) both resell it. Sandvik has assembled a second-tier, hardware-agnostic portfolio from Metrologic (2018) and Verisurf (2025). Creaform VXinspect is positioned as the budget entry tool.

### Cited Findings
- InnovMetric (Québec City, founded 1994) has about 650 employees in 18 countries and more than 23,000 clients in 100 countries. It claims relationships with "each of the world's 100 largest manufacturers". It is also the FIA partner for pre-race inspection of Formula 1 cars. — [Newswire, FTQ investment, 13 Jun 2024](https://www.newswire.ca/news-releases/the-fonds-de-solidarite-ftq-network-invests-45-million-in-quebec-city-based-innovmetric-893220847.html)
- AMETEK's "Faro Creaform" calls itself "a worldwide reseller of PolyWorks solutions". Its auto-referencing multi-line scanners are now "fully integrated into PolyWorks|Inspector", including real-time acquisition and hybrid CMM/scanner inspection. The release is dated "05/03/2026" (format ambiguous). — [Airframer / AMETEK Faro Creaform Deutschland release](https://www.airframer.com/news/release/faro-creaform-and-innovmetric-strengthen-partnership-with-new-and-complete)
- On 19 Jan 2026 InnovMetric signed a global partnership under which Artec 3D became a "bundled reseller" of PolyWorks with its professional scanners. — [CIMdata summary](https://www.cimdata.com/en/industry-summary-articles/item/29206-innovmetric-announces-global-partnership-with-artec-3d)
- Hexagon has historically distributed PolyWorks with its portable and stationary CMMs in North America, Europe (Sigma arm, G-Scan/R-Scan) and China, so PolyWorks has run on competitors' hardware for a long time. These are older agreements and their current status was not verified. — [Aerospace Manufacturing & Design](https://www.aerospacemanufacturinganddesign.com/article/hexagon-metrology-to-bundle-polyworks-software-suite-with-portable-and-stationary-cmm-sales-in-north-america); [DE247](https://www.digitalengineering247.com/article/hexagon-metrology-sas-to-offer-polyworks); [InnovMetric archive (Qingdao)](https://c-7022-20160615-www-innovmetric-com.i.icims.com/fr/about/nouvelles/hexagon-metrology-qingdao-offrira-le-logiciel-polyworksr-avec-sa-gamme-de-mmt-mobiles-et)
- Siemens lists PolyWorks|Inspector on its Xcelerator/ecosystem pages. — [Siemens product page](https://www.siemens.com/ko-kr/products/innovmetric-software-polyworks-inspector/)
- GoEngineer, a reseller (Jul 2023), rated cost as VXinspect "$", Control X "$$", PolyWorks Inspector "$$$$". It rated advanced capabilities 1/3/5 and ease of use 5/3/4. It called VXinspect "ideal for those new to QC" and Control X "ideal for anyone serious about metrology". PolyWorks was the most capable (automation, scripting, real-time) with the steepest learning curve. — [GoEngineer blog, 24 Jul 2023](https://www.goengineer.com/blog/choosing-analysis-and-inspection-software)
- ZEISS INSPECT (formerly GOM Inspect) has a free version that stays usable after the Pro trial expires. ZEISS has said some free features will move to Pro, such as parametric workflows, scripting, digital assembly and trend analysis. GOM Inspect Pro was renamed ZEISS INSPECT Optical 3D Pro. — [ZEISS metrology software](https://www.zeiss.com/metrology/us/software/metrology-software.html); [ZEISS Quality Forum: free vs Pro](https://qualityforum.zeiss.com/topic/27116-inspect-optical-3d-free-version-vs-pro-version/); [handsonmetrology.com](https://www.handsonmetrology.com/products/software/zeiss-inspect/); [GOM rename FAQ](https://www.gom.com/goto/azxx)
- Free ZEISS INSPECT seats are delivered through the Windows-only ZEISS Quality Suite. The ZEISS applications helpdesk is reserved for paying SMA customers. — [TriMech install guide](https://mfg.trimech.com/installing-free-zeiss-inspect/); [ZEISS Quality Suite](https://www.zeiss.com/metrology/us/software/zeiss-quality-suite.html)
- Hexagon's metrology software lineage is PC-DMIS (Wilcox Associates) plus Xygent and others from 2001–02. New River Kinematics (SpatialAnalyzer) followed in 2012–13. In 2018 Hexagon added External Array Software (China) to cover entry-level CMMs. — [Hexagon PR 2018](https://hexagon.com/company/newsroom/press-releases/2018/hexagon-acquisition-external-array-software); [Quality Magazine (NRK)](https://qualitymag.com/articles/90930-hexagon-acquires-portable-metrology-software-provider-new-river-kinematics)
- Hexagon bought the Geomagic suite (Design X, Control X, Freeform, Wrap) from 3D Systems for $123M, which put Control X next to PC-DMIS/Inspire. — [Metal AM](https://www.metal-am.com/hexagon-acquires-geomagic-modelling-software-from-3d-systems-in-123-million-deal/)
- Metrologic (France, now Sandvik) sells a "hardware-agnostic metrology software suite". — [Sandvik news, Apr 2018](https://home.sandvik/en/news-and-media/news/2018/04/sandvik-to-acquire-metrology-software-company-metrologic-group)
- Verisurf (now Sandvik) sells modular inspection, assembly-guidance and reverse-engineering software built on the Mastercam Design CAD platform. It has about 1,500 customers, mostly in North America. — [Metal Powder Tech](https://www.metal-powder.tech/?p=281491)

### Inferences
- Leadership in hardware-neutral, high-end scan inspection probably belongs to PolyWorks, given 23k clients, the claim of all top-100 manufacturers, and resale by AMETEK Faro Creaform, Artec and historically Hexagon. ZEISS INSPECT probably leads in optical/fringe-projection installed base because of its free tier and GOM hardware. This is an inference; there is no share data.
- Control X has a structural problem inside Hexagon. Hexagon already owns PC-DMIS/Inspire and resells PolyWorks, so Control X's mid-tier "$$" position competes with Hexagon's own products and its channel partners.
- Consolidation keeps cutting the number of independent inspection-software vendors. The remaining sizeable independents are InnovMetric and a few smaller ones.

### Gaps
- No primary-source market-share figures for PolyWorks, ZEISS INSPECT, PC-DMIS, Control X, VXinspect, Metrologic or Verisurf.
- No ZEISS INSPECT user or installed-base count was found.
- I found no reliable details on the "PolyWorks free viewer" (PolyWorks|Viewer/Reviewer) in this pass.

---

## 3. Pricing (list and street prices, maintenance, subscription moves)

### Takeaway
Full-featured, dedicated tools cost about $15–21k perpetual: Design X ~$21k, Control X ~$16.7k, ZEISS INSPECT Optical 3D Pro ~$14.6k, PolyWorks "$$$$" (quote-only). Low-end tools cost about $1.3–6k perpetual. Subscriptions are spreading: Design X Go from $1,900/yr, Artec Studio Pro $1,700/yr, QUICKSURFACE subscriptions, Geomagic Freeform subscription (2026.1), Verisurf subscription, and Backflip from $20/month. Most vendors still sell perpetual licenses plus annual maintenance.

### Cited Findings
**Geomagic (Hexagon), for comparison**
- Hexagon's Design X plans page lists Go "subscribe from $1,900" and Pro "contact for pricing". Its Korean page says "Annual Subscription starting at USD 1,900". Hexagon says perpetual and subscription plans exist for Go, Plus and Pro. — [Hexagon Design X plans](https://hexagon.com/products/geomagic-design-x/geomagic-design-x-plans); [Korean page](https://hexagon.com/ko/products/geomagic-design-x/geomagic-design-x-plans)
- TriMech (reseller) listed Geomagic Control X at $16,727.00 and Geomagic Design X at $21,002.00. The listing date is unknown and these are presumably perpetual. — [TriMech store](https://store.trimech.com/product-tag/software?sf_paged=2)
- Revopoint lists Geomagic products (including a "Design X Go" permanent license with 1 year of updates) at a regular price of $4,990, with sale prices around $3,742–$4,242 on different regional pages. The pages are inconsistent. — [Revopoint Geomagic (FR)](https://global.revopoint3d.com/en-fr/products/geomagic); [Revopoint Geomagic (global)](https://global.revopoint3d.com/products/geomagic)
- Geomagic Freeform 2026.1 added subscription alongside perpetual and cut the entry cost by 66% (reported March 2026). — [3D Printing Industry](https://3dprintingindustry.com/news/hexagon-cuts-geomagic-freeform-entry-cost-with-subscription-model-and-new-workflow-tools-250222/); [DE247](https://www.digitalengineering247.com/article/freeform-3d-design-accessible-via-hexagon/hexagon-ab)
- A lower-priced "Control X Essentials" edition exists. No price was found. — [Subscribed.fyi](https://subscribed.fyi/geomagic-control-x//deals)
- Aggregator listings (GetApp "$250/user/month", Subscribed.fyi "$159/month" for Design X) conflict with Hexagon's figures and are unreliable. — [GetApp](https://www.getapp.com/industries-software/a/geomagic-design-x/); [Subscribed.fyi](https://subscribed.fyi/geomagic-design-x/reviews/)

**QUICKSURFACE (KVS)**
- Creality US store: QUICKSURFACE Pro permanent license at $5,880. A note said buyers could get QUICKSURFACE 2026 at 2025 pricing until end of December 2025, which implies a 2026 price increase. — [Creality US store](https://us.store.creality.com/products/quicksurface-lite-pro.oembed)
- Revopoint: QUICKSURFACE Pro permanent, software-only, at a regular price of $4,751 and a sale price of $3,801. — [Revopoint store](https://store.revopoint3d.com/fr/products/quicksurface); [Revopoint QUICKSURFACE](https://global.revopoint3d.com/QuickSurface)
- Another reseller lists QUICKSURFACE Pro at $4,300 (undated). — [3DChimera via reach.dog](https://m.reach.dog/shop/3dchimera/products/quicksurface)
- Novedge carries separate SKUs for QUICKSURFACE Pro subscription, Lite subscription, Pro maintenance and Pro upgrade. Both subscription and perpetual-plus-maintenance models therefore exist; prices could not be retrieved. — [Novedge Pro subscription](https://novedge.com/products/buy-quicksurface-pro-subscription); [Lite subscription](https://novedge.com/products/buy-quicksurface-lite-subscription); [Pro maintenance](https://novedge.com/products/buy-quicksurface-pro-maintenance)
- The official QUICKSURFACE pricing page returned HTTP 429 and could not be read. — (quicksurface.com/pricing; not retrieved)

**Mesh2Surface (KVS)**
- Mesh2Surface for Rhino costs €1,245 ex-tax, perpetual, with "no maintenance fee". — [Mesh2Surface pricing](https://www.mesh2surface.com/pricing/)
- Mesh2Surface for SOLIDWORKS cost ¥363,000 ex-tax (¥399,300 incl. tax) at its Japan launch in April 2022. — [MONOist (2022)](https://monoist.itmedia.co.jp/mn/articles/2205/10/news017.html)
- A European 3D-printing service lists "QuickSurface for SolidWorks" at €3,960 incl. VAT. The product naming is ambiguous (possibly Mesh2Surface for SOLIDWORKS). — [PolyFab3D](https://www.polyfab3d.com/3d-printing-quote-create-your-free-online-quote-polyfab3d?action=add&id=5055)

**Artec Studio**
- Artec Studio 20 Pro costs $1,700 for a 1-year term license, or $4,300 lifetime. The lifetime license covers v20 only and excludes later versions. Artec Studio Lite is sold on monthly or annual plans and does not support scanning. — [MatterHackers](https://www.matterhackers.com/store/l/artec-studio-19-software-license); [TriMech Artec Studio Pro 1-yr](https://store.trimech.com/?p=80014); [Artec Studio page](https://www.artec3d.com/software/artec-studio)

**ZEISS INSPECT**
- ZEISS INSPECT Optical 3D Pro, standalone, is listed at $14,630.00 by TriMech (undated). The free version costs nothing. A CAD Micro listing at "$123,456 CAD" is clearly a placeholder. — [TriMech](https://store.trimech.com/?p=80028); [CAD Micro](https://shop.cadmicro.com/fr/products/gom-inspect-professional)

**PolyWorks (InnovMetric)**
- Every new PolyWorks license includes a one-year support/maintenance plan, which is renewable annually after that (archived InnovMetric page, undated). — [InnovMetric support/maintenance plan (archive)](https://c-7022-20160308-www-innovmetric-com.i.icims.com/services/support-maintenance-plan)
- The only published PolyWorks price found is historical. In 2006–07 the PolyWorks|Inspector Probing yearly license cost €3,200/yr (Europe) or $4,000/yr (Americas), including support and updates. — [DE247](https://www.digitalengineering247.com/article/innovmetric-announces-new-probing-package/Additive-Manufacturing); [InnovMetric archive](https://c-7022-20160615-www-innovmetric-com.i.icims.com/fr/about/nouvelles/innovmetric-logiciels-annonce-le-lancement-du-nouveau-logiciel-polyworksinspector-probing)
- Current PolyWorks pricing is quote-only. GoEngineer (2023) rates it the most expensive tier ("$$$$"). — [GoEngineer](https://www.goengineer.com/blog/choosing-analysis-and-inspection-software)

**Creaform VXinspect / Scan-to-CAD, Verisurf, AI tools**
- No current Creaform software list price was found. The 2017 Go!SCAN 3D plus VXmodel bundle was under $20k. — [Creaform PR (2017)](https://www.creaform3d.com/en/about-us/press-releases/creaform-launches-its-new-goscan-3d-vxmodel-solution-under-20k-usd)
- Verisurf prices by module. It offers subscription, perpetual, standalone and network licenses plus license borrowing (2024). There is no public price list. — [Verisurf "What does Verisurf cost?"](https://www.verisurf.com/?p=26499); [DE247 2024](https://www.digitalengineering247.com/article/verisurf-2025-software-on-market/verisurf-software)
- Backflip AI plans start at $20/month. — [DEVELOP3D](https://develop3d.com/ai/backflip-ai-reverse-engineering/)

### Inferences
- Rough tiers in street prices (USD, perpetual unless noted):
  - Free: ZEISS INSPECT free tier.
  - Entry: about $1.3k–6k. Covers Mesh2Surface for Rhino (€1,245), QUICKSURFACE Pro (about $3.8–5.9k), Revopoint's Design X Go bundle (about $3.7–5k), Artec Studio Pro ($4.3k lifetime or $1.7k/yr), and Design X Go ($1.9k/yr).
  - Professional: about $14–21k. Covers ZEISS INSPECT Pro (~$14.6k), Control X (~$16.7k) and Design X (~$21k).
  - Enterprise: PolyWorks, quote-only and the highest tier.
- Annual maintenance or renewal is common across vendors. Typical rates were not published. The industry norm of roughly 15–20% of list is my assumption and is not sourced.
- Subscription has spread from creative and low-end products (Artec Lite, QUICKSURFACE, Freeform) to Hexagon's Design X entry tier. Metrology-grade inspection (PolyWorks, ZEISS Pro) still appears to be perpetual plus maintenance.

### Gaps
- No current official list prices were found for PolyWorks|Inspector or Modeler, Creaform Scan-to-CAD or VXinspect, QUICKSURFACE Lite, Design X Plus or Pro, Control X Essentials, or Verisurf.
- TriMech prices are undated and could not be re-verified (HTTP 403 on fetch).

---

## 4. Company scale (revenue, headcount)

### Takeaway
The space has one sizeable listed pure play, Shining 3D: about ¥1.5–1.6bn (~$221M) revenue in 2025, +31%. Most of its growth comes from dental, and it is pursuing a Beijing Stock Exchange IPO. Scantech is smaller (¥371M in 2025) and slowing. InnovMetric (~650 staff) is the largest independent metrology-software company; its revenue is private, and a ZoomInfo estimate puts it at about $136M. Creaform (AMETEK) was a roughly C$150–200M business by 2021–22 and now sits inside "Faro Creaform". Artec 3D is about €25M. KVS (QUICKSURFACE/Mesh2Surface) discloses nothing. The software-only businesses that changed hands were all small: Geomagic about $30M, Metrologic €43M and Verisurf about $12M.

### Cited Findings
**Shining 3D (先临三维, Hangzhou)**
- 2024 revenue ¥1.202bn, +18.07% YoY (company statement). — [Shining 3D 2024 results](https://www.shining3d.com/shining-3d-reports-robust-growth-and-breakthrough-innovations-in-2024)
- 2024 net profit ¥159.2M. 2025 guidance (issued early 2026): revenue ¥1.5–1.6bn (+24.8–33.1%) and net profit ¥390–430M. 9M 2025 revenue was ¥1.088bn (+36.3%). Full-year 2025 revenue was reported as $221M, +31%, with international +46% and R&D above 20% of revenue. — [VoxelMatters, 8 May 2026](https://www.voxelmatters.com/shining-3d-files-for-beijing-stock-exchange-listing-to-raise-550-million-yuan/)
- Craft.co lists FY2025 revenue at ¥1.6bn. Chinese recruitment posts say 2025 revenue was "over ¥1.5bn" and 2024 "over ¥1.2bn". — [Craft.co](https://craft.co/shining-3d); [campus.niuqizp.com](https://campus.niuqizp.com/schedule-78l85aaLn.html)
- Overseas share of revenue rose from 63.17% (2022) to 73.56% (2025). Sales are mostly through distributors. A new high-end intraoral (dental) scanner contributed ¥417M of 2025 revenue. The BSE listing filing was submitted 26 Dec 2025, and the second-round inquiry response was completed by 4 Aug 2026. — [10jqka, 5 Aug 2026](https://stock.10jqka.com.cn/20260805/c678701297.shtml); [Time Weekly via 163.com](https://www.163.com/dy/article/L3JJ5QMA0519APGA.html)
- IPO target raise: ¥550M. ¥160M goes to dental implant technology, the rest to industrial 3D vision measurement and algorithms. A 2019 STAR Market attempt was abandoned. — [VoxelMatters](https://www.voxelmatters.com/shining-3d-files-for-beijing-stock-exchange-listing-to-raise-550-million-yuan/)
- H1 2026 revenue was reported as ¥998M, +45.04% YoY. This surfaced in Chinese-press search results; I could not open the specific article, so treat it as unverified. — [search lead: ifeng](https://finance.ifeng.com/c/8x2Vpj35Qr1)
- Software revenue is not broken out in any source found.

**Scantech (思看科技, STAR 688583, Hangzhou)**
- 2025 revenue ¥371M (+11.65%) and attributable net profit ¥95.89M (−20.44%). R&D was ¥92.43M (+56.49%). Q1 2026 revenue was ¥87.24M (+0.15%) and net profit ¥7.28M (−73.02%). The slowdown is attributed partly to a large overseas ODM customer, FARO, cutting purchases after agreeing in May 2025 to be acquired by AMETEK. — [CLS](https://www.cls.cn/detail/2359197); [Gelonghui](https://m.gelonghui.com/news/5230494)

**InnovMetric (PolyWorks)**
- About 650 employees, 18 countries, more than 23,000 clients (June 2024). In June 2024 it received a C$45M investment from Fonds de solidarité FTQ. — [Newswire, 13 Jun 2024](https://www.newswire.ca/news-releases/the-fonds-de-solidarite-ftq-network-invests-45-million-in-quebec-city-based-innovmetric-893220847.html)
- Historical: in FY2017 it reported record sales of 3,400 PolyWorks licenses, with CAD revenue +6.5% and Europe +13%. In 2015 it had more than 200 employees in 7 countries. — [FinanzNachrichten, May 2018](https://www.finanznachrichten.de/nachrichten-2018-05/43748828-innovmetric-software-inc-innovmetric-reports-record-sales-of-3400-polyworks-licenses-for-fiscal-year-2017-399.htm); [jgvogel (2015)](https://auto.jgvogel.cn/c/2015-05-14/624087.shtml)
- ZoomInfo estimates revenue at $136.5M. This is a third-party estimate, not a disclosure. — [ZoomInfo](https://www.zoominfo.com/c/innovmetric-software-inc/48564190)
- InnovMetric acquired Prefixa Vision Systems (Mexico); the date was not verified. — [Generation-NT](https://www.generation-nt.com/communiques-presse/innovmetric-acquires-prefixa-vision-systems-1951166)

**Creaform (AMETEK)**
- AMETEK acquired Creaform for $120M in 2012, when its sales were about $52M. — [Manufacturing.net](https://www.manufacturing.net/industry40/news/13094055/ametek-acquires-creaform-for-120-million)
- June 2022: foreign sales exceeded $135M in 2021 (presumably CAD). There was a sales target of $200M for its 20th anniversary and a goal of $500M within 10 years. It had 14 offices, more than 125 distributors and customers in more than 85 countries. — [Creaform PR, 17 Jun 2022](https://www.creaform3d.com/en/about-us/press-releases/its-20-years-innovation-creaform-looks-future-after-record-year)
- Headcount estimates are roughly 540–570, from third-party profiles (unreliable). — [a-leads](https://a-leads.co/company/1418529_96f2c271); [Owler](https://www.owler.com/company/creaform3d)
- By 2026 it operates as "Faro Creaform, a business of AMETEK". — [Airframer](https://www.airframer.com/news/release/faro-creaform-and-innovmetric-strengthen-partnership-with-new-and-complete)

**FARO (now AMETEK)**
- About $340M annual sales at the time AMETEK acquired it in July 2025. — [Pulse 2.0](https://pulse2.com/ametek-920-million-acquisition-of-faro-technologies-completed); [DE247](https://www.digitalengineering247.com/article/ametek-finalizes-faro-technologies-acquisition)

**Artec 3D (Luxembourg)**
- Craft.co reports FY2025 revenue of €25.4M and a net loss of about €3.3M; this is likely drawn from filed accounts but was not verified. Other estimates: Datanyze $18.6M, Prospeo about $15M. Headcount estimates range from about 100 (company, 2023, Luxembourg) to 257 (Datanyze). — [Craft.co](https://craft.co/artec-3d); [Datanyze](https://www.datanyze.com/companies/artec-3d/368680763); [Chamber of Commerce Luxembourg (2023)](https://www.cc.lu/fileadmin/user_upload/tx_ccnews/Merkur_01_2023-Artec3D.pdf)
- The European Investment Bank backed Artec 3D's R&D in 2025 (amount not retrieved). Caplight records a debt round on 17 Jun 2025, with total funding of about $17.35M. — [EIB press 2025-243](https://www.eib.org/de/press/all/2025-243-eib-backs-artec-3d-s-cutting-edge-rdi-in-3d-scanning-technologies?lang=lb); [Caplight](https://www.caplight.com/company/artec3d)

**ZEISS (GOM) and Hexagon (segment level only)**
- ZEISS Industrial Quality & Research segment: €2.334bn in FY2024/25 versus €2.369bn the year before (−1%, flat at constant currency). Group revenue was €11.896bn. — [ZEISS end-of-year PR, Dec 2025](https://www.zeiss.com/corporate/en/about-zeiss/present/newsroom/press-releases/2025/end-of-year.html); [Presseportal](https://www.presseportal.de/en/pm/69120/6182140)
- Hexagon group net sales were about €5.4bn in 2025, with about 2% organic growth. Manufacturing Intelligence was about €1.85bn in 2025 (vs ~€1.88bn in 2024), per a third-party table (approximate, not verified against the report). — [Hexagon Year-End Report 2025](https://hexagon.com/company/newsroom/press-releases/2026/hexagon-year-end-report-1-january---31-december-2025); [StockAnalysis](https://stockanalysis.com/quote/sto/HEXA.B/financials/metrics/)

**Smaller software-only businesses (from deal disclosures)**
- Geomagic software business: about $30M revenue and about 100 employees in 2023. — [Metal AM](https://www.metal-am.com/hexagon-acquires-geomagic-modelling-software-from-3d-systems-in-123-million-deal/)
- Metrologic: €43.3M FY2017 revenue. — [Sandvik completion news, Jul 2018](https://www.home.sandvik/en/news-and-media/news/2018/07/sandvik-completes-the-acquisition-of-metrologic-group)
- Verisurf: about SEK 130M (about $12M) in 2024 revenue. — [Metal Powder Tech](https://www.metal-powder.tech/?p=281491)

**Creality (QUICKSURFACE channel)**
- A 10jqka item reports Creality (创想三维) 2025 revenue of ¥3.13bn and a Hong Kong listing in May 2026. I saw this only in a search summary and did not open the article. — [10jqka](https://news.10jqka.com.cn/field/sr/20260601/58350701.shtml)

### Inferences
- Pure scan-to-CAD and scan-inspection software vendors are small. Only InnovMetric (estimated ~$100–200M, based on 650 staff and the ZoomInfo estimate) is likely above $50M in software alone. Geomagic (~$30M across four products), Metrologic (~€43M in 2017) and Verisurf (~$12M) set the scale for everyone else.
- At Shining 3D, industrial and professional scanning plus software is the slower part of the business. Dental intraoral scanners drive much of the +31% (2025) and +45% (H1 2026) growth.
- Scantech's FARO problem shows how the AMETEK consolidation is reshuffling hardware supply chains. FARO is presumably moving toward in-house or Creaform hardware.

### Gaps
- KVS (QUICKSURFACE/Mesh2Surface, Bulgaria): no revenue, headcount or user numbers found.
- InnovMetric: no audited or company-disclosed revenue.
- Creaform: no AMETEK disclosure after 2022.
- Shining 3D: no software revenue breakdown. The full 2025 audited figures (prospectus) were not opened.
- ZEISS: no GOM/ZEISS INSPECT software revenue split within IQR.

---

## 5. Market size (reverse engineering software, 3D scanning software, metrology software, 3D scanners)

### Takeaway
Published estimates are inconsistent and mostly from low-credibility SEO-style publishers. The only scan-to-CAD-specific estimates cluster at about $340M: QYResearch, "reverse engineering tools", $342M in 2024, 9.3% CAGR; and Future Market Insights, "3D reverse engineering software", $339M in 2025, ~5.4% CAGR. Figures of $1.4–2.5bn for "reverse engineering software" almost certainly mix in other categories, such as software and binary reverse engineering or services. The broad 3D metrology market is about $11–12bn, with software at about $2–3.4bn depending on definition. 3D scanner and scanning hardware-plus-software estimates range from $1.3bn to $7.2bn. A bottom-up check gives a realistic dedicated scan-to-CAD software market of roughly $150–350M.

### Cited Findings
**Reverse engineering software or tools**
- QYResearch (via Valuates): "Reverse Engineering Tools" valued at $342M in 2024, rising to $639M by 2031 at 9.3% CAGR. A variant release gives $693M by 2032. — [Valuates/QYResearch](https://reports.valuates.com/market-reports/QYRE-Auto-11T19327/global-reverse-engineering-tools)
- Future Market Insights: "3D Reverse Engineering Software" at $338.7M (2025), rising to $573.2M (2035), about 5.4–5.5% CAGR. — [FMI](https://www.futuremarketinsights.com/reports/3d-reverse-engineering-software-market)
- Verified Market Research: "Reverse engineering software" at $1.36bn (2025), rising to $2.83bn (2033), 9.6% CAGR. — [VMR](https://www.verifiedmarketresearch.com/product/reverse-engineering-software-market/)
- Business Research Insights: $1.84bn (2025) or $2.04bn (2026), rising to $5.18bn (2035), 10.9% CAGR. — [BRI](https://www.businessresearchinsights.com/market-reports/reverse-engineering-software-market-112729)
- Reports and Data: "Reverse engineering tools" at $2.5bn (2024), rising to $6.1bn (2034), 9.2% CAGR. — [Reports and Data](https://reportsanddata.com/report-detail/reverse-engineering-tools-market)
- Reverse engineering services, which are not software: MarketIntelo values these at $12.4bn (2025), 8.3% CAGR. — [MarketIntelo](https://marketintelo.com/report/reverse-engineering-services-market)

**3D metrology (hardware, software and services) and its software segment**
- MarketsandMarkets: 3D metrology at $11.13bn (2024), rising to $15.01bn (2029), 6.2% CAGR. An earlier edition gave $11.2bn (2023), rising to $16.4bn (2028), 8.0%. — [MarketsandMarkets](https://www.marketsandmarkets.com/ResearchInsight/3d-metrology-market-size.asp)
- MarketsandMarkets software segment: about $3,438.5M (2024), rising to about $4,577.2M (2029), 5.9% CAGR. It appeared on a "Rest of World" page, so it is unclear whether the figure is global or regional. — [MarketsandMarkets RoW page](https://www.marketsandmarkets.com/Market-Reports/geography/3d-metrology-market/Rest-of-World)
- Global Market Insights: 3D metrology software segment "crossed $2 billion in 2022"; total market more than $25bn by 2032. — [GMI](https://www.gminsights.com/pressrelease/3d-metrology-market)
- IMARC: 3D metrology at about $11.9bn (2025). — [IMARC](https://www.imarcgroup.com/3d-metrology-market)

**3D scanning market (hardware plus software)**
- Grand View Research: $4.28bn (2024), 10.1% CAGR 2025–30. IMARC: $7.2bn (2024), 7.32%. GMI: $5.1bn (2024), 11.4%. Fortune Business Insights: $5.74bn (2025), 12.56%. The Insight Partners: $5.23bn (2025), 7.82%. Market Data Forecast: $6.74bn (2025), 16%. — [GVR](https://www.grandviewresearch.com/industry-analysis/3d-scanning-industry); [IMARC](https://www.imarcgroup.com/3d-scanning-market); [GMI](https://www.gminsights.com/pressrelease/3d-scanning-market-report); [Insight Partners](https://www.theinsightpartners.com/reports/3d-scanning-market); [MDF](https://www.marketdataforecast.com/market-reports/3d-scanning-market)
- "3D scanning software" alone: MarketIntelo gives $5.2bn (2025), rising to $10.8bn (2034), 8.7% CAGR. This is larger than most whole-market estimates and is not credible. — [MarketIntelo](https://marketintelo.com/report/3d-scanning-software-market)

**3D scanner market**
- Coherent MI: $2.26bn (2025), rising to $4.87bn (2032), 13.9%. Knowledge Sourcing: $2.342bn (2025), rising to $3.82bn (2030), 10.28%. The Insight Partners: $4.95bn (2025), rising to $11.21bn (2034). Emergen: $4.68bn (2025). Report Prime: $1.33bn (2025). Technavio: +$5.65bn over 2024–29 at 12.6%. — [Coherent MI](https://www.coherentmi.com/industry-reports/3d-scanner-market); [KSI](https://www.knowledge-sourcing.com/resources/press-releases/global-3d-scanner-market-size-worth-us3-019-billion-by-2027/); [Insight Partners](https://www.theinsightpartners.com/reports/3d-scanner-market); [Emergen](https://www.emergenresearch.com/industry-report/3d-scanner-market/market-news); [Report Prime](https://www.reportprime.com/3d-scanner-r7117); [Technavio](https://labs.technavio.com/report/3d-scanner-market-industry-analysis)

**Bottom-up anchors (facts from sections 4 and 6)**
- Geomagic, the most-cited dedicated suite (Design X, Control X, Freeform, Wrap), had about $30M revenue in 2023. — [Metal AM](https://www.metal-am.com/hexagon-acquires-geomagic-modelling-software-from-3d-systems-in-123-million-deal/)
- Verisurf: about $12M (2024). Metrologic: €43.3M (2017). Artec 3D (hardware plus software): about €25M (2025). Shining 3D (mostly hardware, much of it dental): about $221M (2025). — sources in section 4

### Inferences
- Credibility: Verified Market Research, Business Research Insights, Reports and Data, MarketIntelo, Report Prime, Market Data Forecast and Coherent are low-credibility SEO-style publishers. They give no vendor-level methodology, their figures conflict with each other, and their definitions are vague; the "reverse engineering software" label often includes software and binary reverse engineering. MarketsandMarkets, Grand View and GMI are mid-credibility, but the totals still disagree by up to 1.7x. QYResearch and FMI are the only ones scoped to 3D or mechanical reverse engineering.
- Scan-to-CAD triangulation (estimate):
  - Design X is probably under half of Geomagic's ~$30M, so roughly $10–15M.
  - KVS (QUICKSURFACE/Mesh2Surface) is probably a single-digit to low-double-digit $M business.
  - Creaform Scan-to-CAD, PolyWorks|Modeler, Verisurf RE, Artec's scan-to-CAD-adjacent revenue, Chinese bundled tools, CAD-embedded add-ons (NX, Creo REX, SOLIDWORKS) and AI entrants each add tens of millions at most.
  - Total: dedicated scan-to-CAD software of roughly $150–350M worldwide in 2025–26. This is consistent with QYResearch and FMI at about $340M and inconsistent with the $1.4–2.5bn claims.
- Scan-based inspection software (estimate): InnovMetric is probably about $100–200M. ZEISS INSPECT Pro revenue is unknown but likely of similar order, and much of it is bundled with ZEISS/GOM hardware. Add Control X, VXinspect, Hexagon Inspire/PC-DMIS scan modules, Metrologic and Verisurf. That puts scan-based (non-CMM-only) inspection software at roughly $0.5–1bn, within a broader metrology software market of about $2–3.4bn (GMI and MarketsandMarkets), which includes CMM software. This is low-confidence.
- Growth: unit growth is driven by cheap scanners from Shining 3D, Revopoint, Creality and Scantech/Bambu. Revenue growth per seat is held back by price compression and subscription. Software revenue growth in the mid-to-high single digits is plausible, consistent with FMI's 5.4% and MarketsandMarkets' 5.9% software CAGR, more so than the double-digit SEO figures.

### Gaps
- No credible primary or analyst (e.g., CIMdata, Jon Peddie) figure for scan-to-CAD software specifically was found.
- The MarketsandMarkets software-segment figure's geographic scope is unclear.
- Full report methodologies are paywalled. All figures are press-release or summary-level.

---

## 6. M&A and investment activity, 2018–2026

### Takeaway
Consolidation has been heavy. AMETEK merged FARO into Creaform ($920M, 2025). Hexagon took Geomagic ($123M, 2025). Sandvik built a metrology-software unit from Metrologic (€360M, 2018) and Verisurf (2025, undisclosed). ZEISS took GOM (2019, undisclosed) and its US distributor Capture 3D (2021). Software-only targets were valued at about 4x revenue (Geomagic) to about 8x (Metrologic). The few remaining independents (InnovMetric, KVS, Artec) are taking minority or debt capital, not selling, and are forming reseller alliances instead.

### Cited Findings
| Date | Deal | Value | Target scale | Source |
|---|---|---|---|---|
| Apr 2018 (closed 4 Jul 2018) | Sandvik acquires Metrologic Group (France) from Astorg | €360M cash/debt-free (~$435M) | FY2017 revenue €43.3M (~8.3x) | [Sandvik Apr 2018](https://home.sandvik/en/news-and-media/news/2018/04/sandvik-to-acquire-metrology-software-company-metrologic-group); [Sandvik Jul 2018](https://www.home.sandvik/en/news-and-media/news/2018/07/sandvik-completes-the-acquisition-of-metrologic-group); [Mining.com/Reuters](https://www.mining.com/web/swedens-sandvik-buy-metrologic-digital-manufacturing-push/) |
| Aug 2018 | Hexagon acquires External Array Software (China, CMM metrology software) | Undisclosed | Entry-level CMM software | [Hexagon PR](https://hexagon.com/company/newsroom/press-releases/2018/hexagon-acquisition-external-array-software) |
| Apr 2019 (closed Jun 2019) | ZEISS acquires GOM (Braunschweig) | Undisclosed; the parties agreed not to disclose | n/a | [ZEISS PR](https://www.zeiss.com/corporate/en/about-zeiss/present/newsroom/press-releases/2019/acquisition-of-gom.html); [IMVE](https://www.imveurope.com/news/zeiss-acquires-metrology-firm-gom); [ZEISS closing](https://www.zeiss.com/metrology/en/about-us/newsroom/2019/gom.html) |
| May 2021 | ZEISS acquires Capture 3D (US GOM distributor) | Undisclosed | n/a | [BusinessWire](https://www.businesswire.com/news/home/20210510005921/en/ZEISS-to-Acquire-Capture-3D-to-Extend-Its-Industry-Expertise-in-3D-Measurement-and-Inspection-Solutions) |
| 13 Jun 2024 | Fonds de solidarité FTQ invests in InnovMetric (minority) | C$45M | ~650 employees | [Newswire](https://www.newswire.ca/news-releases/the-fonds-de-solidarite-ftq-network-invests-45-million-in-quebec-city-based-innovmetric-893220847.html) |
| Announced ~Jan 2025, closed 2025 | Hexagon acquires Geomagic suite from 3D Systems | $123M cash/debt-free (~$100M net proceeds to 3D Systems) | ~$30M revenue, ~100 staff in 2023 (~4x) | [Metal AM](https://www.metal-am.com/hexagon-acquires-geomagic-modelling-software-from-3d-systems-in-123-million-deal/); [Metal AM completion](https://www.metal-am.com/3d-systems-completes-sale-of-geomagic-software-portfolio-to-hexagon-for-123-million/) |
| 10 Mar 2025 (expected close Q2 2025) | Sandvik acquires Verisurf (US) | Undisclosed | ~SEK 130M (~$12M) 2024 revenue, ~1,500 customers | [Verisurf](https://www.verisurf.com/blog/article/verisurf-signs-agreement-to-be-acquired-by-sandvik); [Metal Powder Tech](https://www.metal-powder.tech/?p=281491) |
| May 2025 (closed 21 Jul 2025) | AMETEK acquires FARO Technologies | ~$920M EV; $44/share (~40% premium) | ~$340M sales (~2.7x) | [Pulse 2.0](https://pulse2.com/ametek-920-million-acquisition-of-faro-technologies-completed); [DE247](https://www.digitalengineering247.com/article/ametek-finalizes-faro-technologies-acquisition); [TCT](https://www.tctmagazine.com/ametek-acquires-faro-technologies/) |
| 2025 | EIB financing for Artec 3D R&D; Caplight records a debt round on 17 Jun 2025 | Amount not retrieved | ~€25M revenue | [EIB](https://www.eib.org/de/press/all/2025-243-eib-backs-artec-3d-s-cutting-edge-rdi-in-3d-scanning-technologies?lang=lb); [Caplight](https://www.caplight.com/company/artec3d) |
| Series A (date not verified; 2024–25) | Backflip AI Series A (NEA, a16z) | $30M | Startup | [3DNatives](https://www.3dnatives.com/en/backflip-an-ai-model-generator-earns-30-mil-in-series-a-231220245/amp/) |
| Dec 2025 to 2026 (pending) | Shining 3D Beijing Stock Exchange IPO | ¥550M target raise | ~$221M revenue (2025) | [VoxelMatters](https://www.voxelmatters.com/shining-3d-files-for-beijing-stock-exchange-listing-to-raise-550-million-yuan/); [10jqka](https://stock.10jqka.com.cn/20260805/c678701297.shtml) |
| Context, pre-2018 | AMETEK acquires Creaform (2012) | $120M | ~$52M sales | [Manufacturing.net](https://www.manufacturing.net/industry40/news/13094055/ametek-acquires-creaform-for-120-million) |

**Alliances, not M&A, that reshape the channel**
- Jan 2026: Artec 3D becomes a global bundled reseller of PolyWorks. — [CIMdata](https://www.cimdata.com/en/industry-summary-articles/item/29206-innovmetric-announces-global-partnership-with-artec-3d)
- 2026: Faro Creaform (AMETEK) is a worldwide PolyWorks reseller with native scanner integration in PolyWorks|Inspector. — [Airframer](https://www.airframer.com/news/release/faro-creaform-and-innovmetric-strengthen-partnership-with-new-and-complete)
- Jan 2026: Scantech and Bambu Lab sign a consumer-scanner framework agreement. — [CLS](https://www.cls.cn/detail/2359197)

### Inferences
- Software-only metrology and RE assets have sold at roughly 4–8x revenue: Geomagic about 4.1x (on 2023 revenue) and Metrologic about 8.3x (on 2017 revenue). Hardware-heavy FARO went for about 2.7x.
- The strategic buyers are now Hexagon, ZEISS, AMETEK and Sandvik. Each owns both hardware and inspection software. This puts hardware-neutral independents (InnovMetric, KVS) in the position of neutral "Switzerland" suppliers. The 2026 PolyWorks reseller deals with Faro Creaform and Artec support that reading.

### Gaps
- The ZEISS–GOM price was never disclosed. No reliable estimate was found.
- I found no 2024–2026 Hexagon metrology-software acquisitions other than Geomagic.
- Nikon Metrology was not researched (no relevant 2018–2026 metrology-software deal surfaced).
- The date of InnovMetric's acquisition of Prefixa was not verified.
- Whether the Verisurf deal closed on schedule was not confirmed.
