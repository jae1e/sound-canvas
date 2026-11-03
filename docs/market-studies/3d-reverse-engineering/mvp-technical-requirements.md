# MVP Technical and Product Requirements: Browser-Based, AI-Assisted Scan-to-CAD (as of Nov 3, 2026)

*Scope: concrete MVP requirements and feasibility. Research state of the art, funding and market sizing are in the sibling notes (`ai-rendering-plugins-opportunities.md`, `competitors-pricing-market-size.md`, `demand-channels-painpoints.md`) and are not repeated here. All facts were accessed Nov 3, 2026 unless another date is given. "Company claim" marks vendor marketing. **LICENSE RISK** marks licensing hazards. Inferences are the researcher's opinions, not sourced facts.*

---

## 1. User acceptance criteria: what accuracy do users expect, what do scanners deliver, and what output is "editable enough"?

### Takeaway
The acceptance bar depends on the downstream process. Desktop FDM replacement parts tolerate about ±0.25–0.5 mm, because the printer's own tolerance is in that range. CNC and molding work is judged against roughly ±0.1–0.13 mm general tolerances, with tighter fits on critical features. Inspection needs measurement error well below the part tolerance. Low-cost scanners (Revopoint, Creality, Einstar) advertise 0.02–0.1 mm single-frame accuracy, while metrology scanners (Creaform HandySCAN BLACK|Elite) certify 0.025 mm under VDI/VDE 2634-3. A large part of the error is added in the CAD rebuild, so the MVP has to report deviation explicitly and snap critical features to nominal (design-intent) values instead of copying the scan.

### Cited Findings
**Manufacturing tolerance references (what parts are judged against)**
- CNC (Protolabs): the standard machining tolerance at Protolabs' automated factory is ±0.005 in (0.13 mm), and its precision tier is ±0.002 in (0.051 mm). A French Protolabs page lists ±0.1 mm as standard. — [Protolabs: Fine-tuning tolerances for CNC](https://protolabs.com/resources/design-tips/fine-tuning-tolerances-for-cnc-machined-parts)
- Injection molding (Protolabs Network/Hubs): molds are CNC machined to ±0.125 mm (±0.005") after adjusting for shrinkage. Protolabs says it can hold about ±0.003 in machining accuracy on molds. Resin shrink ranges from 0.002 in/in (ABS, PC) to 0.025 in/in (TPE), and undimensioned features follow DIN ISO 20457:2020 TG5. — [Hubs injection-molding tolerances](https://www.hubs.com/injection-molding/tolerances-dimensional-accuracy/); [Protolabs basic design guidelines](https://protolabs.com/help-center/basic-design-guidelines)
- FDM 3D printing (Protolabs Network standard): industrial FDM ±0.25% with a ±0.25 mm lower limit; desktop FDM ±0.5% with a ±0.5 mm lower limit. — [Protolabs Network manufacturing standards](https://www.hubs.com/manufacturing-standards/)
- A German OE spare-parts maker (febi) reports that its Nikon laser scanner works within a 0.05–0.08 mm tolerance range in its new-part creation process. — [febi blog](https://blog.febi.com/en/?p=4517)

**Scanner accuracy: low-cost vs metrology (vendor specs unless noted)**
- Creaform HandySCAN BLACK|Elite: accuracy 0.025 mm; volumetric accuracy 0.020 mm + 0.040 mm/m (0.020 + 0.015 mm/m with MaxSHOT Next|Elite). Accuracy is per VDI/VDE 2634 part 3, and the Elite is ISO 17025 accredited. The standard BLACK is 0.020 + 0.060 mm/m. — [Creaform spec page](https://www.creaform3d.com/en/node/9903); [GoEngineer spec table](https://www.goengineer.com/3d-scanners/creaform/handyscan-black); [Aniwaa](https://www.aniwaa.com/insight/3d-scanners/handyscan-black-the-ultimate-reference-in-portable-metrology/)
- Creaform HandySCAN BLACK|Elite Limited (Jan 2023): 0.012 mm accuracy. — [Creaform press release](https://www.creaform3d.com/en/about-us/press-releases/inventor-first-ever-handheld-self-positioning-3d-laser-scanner-achieves-other-breakthrough-its)
- Revopoint MIRACO: marketed as "up to 0.02 mm precision, 0.05 mm accuracy" (single-frame), with 0.05 mm fused point distance. One article says precision falls to 0.2 mm at 600 mm working distance. These are retailer and sponsored figures; Revopoint's official spec page returned HTTP 403, so they are unverified. — [MatterHackers listing](https://www.matterhackers.com/store/l/revopoint-miraco-3d-scanner/sk/MU3058EX); [All3DP (sponsored)](https://all3dp.com/4/revopoint-miraco-3d-scanner-delivers-with-versatility-and-precision-ad/)
- Revopoint POP 3: one retailer says 0.05 mm accuracy, while Revopoint's own blog comparison table appears to list 0.1 mm single-frame accuracy. **Conflict.** — [3DJake POP3](https://www.3djake.com/revopoint/pop3); [Revopoint blog](https://revopoint3d.com/blogs/news/tagged/pop-3)
- Revopoint Trackit (vendor-run test with a CMM ball bar): stayed "well within" 0.025 mm + 0.04 mm × L(m). Not independent. — [Revopoint forum](https://forum.revopoint3d.com/t/revopoint-trackit-volumetric-accuracy-test-with-cmm-ball-bar/38450)
- Creality Otter and CR-Scan Raptor: "up to 0.02 mm" accuracy. For the Raptor (or Raptor Pro; sources disagree), one source gives 0.02 mm + 0.08 mm/m volumetric in laser mode and another gives about 0.075 mm + 0.1 mm/m in NIR mode. **Conflicting and unverified.** — [3Printr](https://www.3printr.com/cr-scan-raptor-creality-presents-new-portable-3d-scanner-4570536/); [Filamino comparison](https://filamino.com/blog/creality-3d-scanners-otter-raptor-and-ferret-compared); [All3DP on Creality metrology-grade scanner](https://all3dp.com/4/creality-also-announced-a-metrology-grade-3d-scanner-this-week/)
- Shining 3D Einstar VEGA: 0.05 mm accuracy per a single retailer listing, not confirmed by a manufacturer spec. Point distance is 0.05–3 mm (HD) and 0.5–10 mm (Fast). — [Galaxus](https://www.galaxus.be/en/s1/product/shining-3d-einstar-vega-3d-scanner-47581634); [Dynamism](https://www.dynamism.com/shining-3d/einstar-vega-3d-scanner.html)
- Error added by the rebuild step: a reverse-engineering patent notes "a substantial danger of losing the original scan data accuracy" when building CAD from scan geometry. A 2025 academic RE study reports dimensional differences "not exceeding 0.4 mm and 2°" (part and conditions not verified). — [Patent RE48498](https://patents.justia.com/patent/RE48498); [MSPE 2025 paper](https://reference-global.com/2/v2/download/article/10.2478/mspe-2025-0055.pdf)

**What "editable enough" means (benchmarks from vendors)**
- Backflip markets its output as a "Sensible Feature Tree", "Native Parametric 3D Models" and "Logical Sketch Constraints". The text reads: "fully parametric 3D models built with a familiar feature tree, sketch constraints, and external references that just make sense." Operations named: Extrude, Revolve, Pattern, Chamfer, Fillet. (Company claim.) — [backflip.ai](https://www.backflip.ai/)
- Backflip's v1 model was not shipped because its output was "unnatural" and hard to edit ("The first model wasn't good, so we didn't ship it" — Greg Mark). Gen-2 was rebuilt to model "the way a human would." — [Engineering.com, Aug 2026](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- QUICKSURFACE, the semi-automatic benchmark, reconstructs planes, cylinders, cones and spheres and lets the user set relations between them such as perpendicularity and parallelism. It shows real-time deviation analysis throughout. — [Polyga QUICKSURFACE page](https://www.polyga.com/quicksurface); [QUICKSURFACE 2026 brochure](https://dirdim.com/wp-content/uploads/2026/07/QS2026_WEBbrochure.pdf)
- Fusion's API exposes the constraint vocabulary needed to encode design intent: addSymmetry, addConcentric, addEqual, addParallel, addPerpendicular, addTangent, addMidPoint, addCollinear, addHorizontal/addVertical, addCircularPattern, addRectangularPattern and more. It also exposes holeFeatures and threadFeatures for standard holes and threads. — [Fusion API GeometricConstraints](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_GeometricConstraints.htm); [Fusion API Features](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_Features.htm)

### Inferences
- Suggested acceptance tiers for the MVP (opinion, derived from the tolerances above):
  - **(a) 3D-print replacement parts:** ≥95% of surface area within ±0.2–0.3 mm of the scan, with mating features (holes, bosses, slots) snapped to plausible nominal sizes. Desktop FDM itself is only ±0.5 mm, so these users care more about fit and editability than microns.
  - **(b) CNC/molding:** ±0.1 mm on functional faces, with every critical dimension rounded to design-intent values (standard metric/imperial hole and thread sizes, round numbers, symmetric features). A deviation map should show where the "intent" model departs from the scan.
  - **(c) Inspection-grade:** out of scope for low-cost scanner input. With 0.05–0.1 mm scanner accuracy, the reconstruction cannot honestly verify ±0.05 mm tolerances. The common metrology rule of thumb that measurement uncertainty should be a small fraction (about 1/4 to 1/10) of the tolerance was not sourced this session.
- "Editable enough" means:
  - fully constrained or near-fully constrained sketches;
  - named features in a sensible order (base extrude/revolve, then cuts, holes, patterns, fillets/chamfers last);
  - explicit symmetry, concentricity and pattern relations;
  - standard hole features (not cut-extrudes of circles);
  - parameters exposed as named user parameters.
  This is exactly where Backflip v1 failed, so it is a recognized bar.
- The deviation/tolerance report is the product's trust mechanism. Low-cost scanner users cannot verify AI output by eye (Engineering.com's reviewer judged Backflip "by eye"), so a per-feature deviation table plus a color map is a credible differentiator.

### Gaps
- No independent, third-party accuracy tests (gauge blocks, CMM) of Revopoint, Creality or Einstar scanners were found. All low-cost figures are vendor or retailer claims, and Revopoint's official spec page could not be fetched (403).
- No user survey or forum thread with quantified tolerance expectations for scan-to-CAD replacement parts was found (Reddit content was not indexed).
- Backflip publishes no accuracy or deviation metric for its output.

---

## 2. Input requirements: formats, sizes, noise and holes, mesh repair

### Takeaway
The MVP must accept STL, OBJ, PLY and 3MF; GLB/glTF are needed to match Backflip. Point clouds (ASC/PLY) are worth supporting; E57 matters mainly for terrestrial and metrology workflows (no low-cost-scanner evidence found). Raw low-cost scans can run to millions or tens of millions of triangles (about 48–50 MB per million triangles as binary STL), so an upload limit around 200–500 MB plus client-side decimation is needed. Scan artifacts (noise, smoothed edges, holes, protrusions) are the norm, so mesh repair is a mandatory pre-step. Learned models see only a heavily downsampled input (CAD-Recode/cadrille use 256 points), so classical fitting on the full-resolution mesh is needed for accuracy.

### Cited Findings
- Backflip inputs: "STL, OBJ, GLB, GLTF, or PLY mesh files." — [backflip.ai](https://www.backflip.ai/)
- Paramesh AI inputs are STL, OBJ, PLY and 3MF. Upload limits by plan: Free 5 MB, Pay-as-you-go 50 MB, Pro 200 MB, Team 500 MB. The drop zone separately says "Max 10 MB" (**inconsistent**). — [parameshai.com](https://parameshai.com/)
- Shining 3D Einstar VEGA exports PLY, STL, OBJ and ASC. — [3DWithUs Einstar Vega review](https://3dwithus.com/einstar-vega-review-3d-scanner-testing-tips-settings); [Dynamism](https://www.dynamism.com/shining-3d/einstar-vega-3d-scanner.html)
- Revopoint users report meshes of millions of triangles, up to "15 millions poly meshes" in Revo Scan. Fusion users recommend decimating to about 250–500K triangles because very large meshes load slowly or crash Fusion. PLY is recommended over STL for point data in CloudCompare. (User forum posts; the search summary did not reliably attribute each claim to a specific thread.) — [Revopoint forum: Revo Scan 5 feedback](https://forum.revopoint3d.com/t/leave-your-feedback-suggestions-on-the-revo-scan-5/20226?page=20); [Revopoint forum: CloudCompare import](https://forum.revopoint3d.com/t/too-many-point-clouds-when-importing-to-cloudcompare/29835)
- Binary STL uses about 48 bytes per triangle per one source, so 1M triangles ≈ 48 MB and 250K ≈ 12 MB. The format's 2-byte attribute field makes it 50 bytes, which is an inference. — [UCSF Chimera list](https://plato.cgl.ucsf.edu/pipermail/chimera-users/2013-September/009166.html)
- Typical scan artifacts in the CC3D scan dataset: "missing parts or protrusions", "smoothed surfaces and edges", and missing regions. — [SHARP 2023 paper (arXiv 2308.15966)](https://ar5iv.labs.arxiv.org/html/2308.15966). CAD-Recode describes CC3D inputs as having "surface noise, smoothed edges and missing parts." — [CAD-Recode paper](https://arxiv.org/html/2412.14042)
- Learned-model input budget: CAD-Recode downsamples to 256 points with furthest point sampling and trains with Gaussian noise (std 0.01) applied with probability 0.5. Invalid outputs occur when features are "smaller than the resolution induced by quantization." — [CAD-Recode paper](https://arxiv.org/html/2412.14042). cadrille uses "256 unordered 3D points without normals." — [cadrille paper](https://arxiv.org/html/2505.22914). CADReasoner-PC uses 128 points per direction. — [HF model card](https://huggingface.co/kulibinai/cadreasoner-pc)
- Fusion's mesh-convert API includes an `isPreprocessHoles` option that "smooths the boundaries of open holes in the mesh body". This shows that hole handling is a known prerequisite for mesh→B-rep conversion. — [Fusion API MeshConvertFeatureInput](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_MeshConvertFeatureInput.htm)
- Paramesh's pipeline starts with "mesh ingestion and cleanup", where the repair step "fixes normals" and "removes degenerate faces". It offers the mesh cleaner free as a funnel. — [parameshai.com](https://parameshai.com/)
- Onshape can import meshes (formats listed include GLTF, 3MF, STL, OBJ) into a Part Studio as reference for "mixed modeling". Onshape staff have said meshes are reference-only and are not converted to B-rep. — [Onshape help: mixed modeling](https://cad.onshape.com/help/Content/PartStudio/mixed_modeling.htm); [Onshape forum](https://forum.onshape.com/discussion/10974/use-3d-scan-in-onshape)

### Inferences
- MVP input spec (opinion):
  - **Formats:** STL (ASCII and binary), OBJ, PLY (mesh and point cloud), 3MF, GLB/glTF; E57/ASC as a later item.
  - **Size limits:** accept up to about 20–30M triangles on upload, but decimate in the browser (meshoptimizer, MIT) to about 0.5–2M for display and segmentation. Keep the full-resolution mesh server-side for final fitting and deviation.
  - **Unit handling:** STL has no units, so ask for or detect units. A common failure mode with low-cost scanners is that scale is right but the user does not know it.
- A free "mesh repair + decimate + measure" tool in the browser is low-cost to build and is a proven funnel (Paramesh does this).
- Because the AI models see only 128–256 points, small holes, chamfers and fillets will be lost or hallucinated. The architecture should use AI for global structure (feature-tree skeleton) and classical fitting on the dense mesh for dimensions.

### Gaps
- No official Revopoint, Creality or Shining documentation of typical exported triangle counts or file sizes was found. No evidence was found on whether low-cost scanner software exports E57.
- No quantitative noise model (e.g., RMS noise vs distance) for low-cost scanners was found.

---

## 3. Output requirements: STEP/Parasolid, native features in Fusion, Onshape and SOLIDWORKS, partner terms, cloud and data-residency limits

### Takeaway
All three target CAD platforms can technically receive a native, constrained feature tree:
- **Fusion:** a desktop add-in (Python/C++) can create sketches with geometric constraints and dimensions, extrudes, revolves, fillets, chamfers, holes, threads and patterns. Its mesh-conversion and face-group APIs are still "preview" and Autodesk says not to ship them.
- **Onshape:** features can be created via REST (`/features`) or custom FeatureScript. App Store apps must use OAuth2, are exempt from the per-plan annual API quotas, and can bill through Onshape's billing API.
- **SOLIDWORKS:** requires the Solution Partner Program (partner license key, ISwPEManager). Dassault reportedly refused Backflip's plugin, which is a gatekeeping risk.

STEP export via OpenCASCADE is solid for AP203/AP214, with only partial AP242 support. Parasolid export would need a commercial kernel license (not researched).

### Cited Findings
**Autodesk Fusion**
- The Fusion API `Features` collection includes extrudeFeatures, revolveFeatures, filletFeatures, chamferFeatures, holeFeatures, threadFeatures, rectangular/circular/path pattern features, mirrorFeatures, loftFeatures, sweepFeatures, shellFeatures, draftFeatures, ribFeatures, webFeatures, customFeatures and baseFeatures ("A base feature represents a body that is non-parametric"). It also includes mesh features: meshConvertFeatures, meshGenerateFaceGroupsFeatures, meshRepairFeatures, meshReduceFeatures and meshRemeshFeatures. — [Fusion API Features object](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_Features.htm)
- Sketch constraints available via API: addCoincident, addCoincidentToSurface (Sep 2023), addCollinear, addConcentric, addEqual, addHorizontal, addVertical, addMidPoint, addParallel, addPerpendicular, addSymmetry, addTangent, addSmooth, addOffset, addPolygon, addCircularPattern, addRectangularPattern and others. A SketchDimensions collection also exists. — [GeometricConstraints](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_GeometricConstraints.htm); [SketchDimensions](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_SketchDimensions.htm); [addCoincident sample](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/GeometricConstraints_addCoincident_Sample.htm)
- **Platform risk:** MeshConvertFeatures, MeshConvertFeatureInput and MeshGenerateFaceGroupsFeatures are marked "a preview of intended future API capabilities… you should never deliver any programs that use any preview capabilities." — [MeshConvertFeatures](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_MeshConvertFeatures.htm); [MeshGenerateFaceGroupsFeatures](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/fusion_MeshGenerateFaceGroupsFeatures.htm)
- Personal-use (free) Fusion keeps access to the API and App Store add-ins but is limited to 10 active documents (2020 FAQ). The API exposes a `personalUseLimits` property. Personal use is restricted to users earning under $1,000/yr from it. — [Autodesk blog, Sep 2020](https://www.autodesk.com/products/fusion-360/blog/changes-to-fusion-360-for-personal-use/); [Data.personalUseLimits](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Data_personalUseLimits.htm); [Autodesk personal-use page (ES)](https://www.autodesk.com/es/products/fusion-360/personal)
- Backflip's Fusion add-in is distributed as its own Windows/macOS installer from backflip.ai, not only via the App Store; the macOS .pkg is not yet Apple-notarized. Users sign in through a browser and access a "part library and AI tools" in the add-in. — [Backflip downloads](https://www.backflip.ai/downloads); Autodesk promoted it on its blog — [Autodesk Fusion blog](https://www.autodesk.com/products/fusion-360/blog/backflip-add-in-autodesk-fusion/)

**Onshape (PTC)**
- Features are created through the Part Studio features endpoints. The add-feature body wraps a single `feature:{}` object (not a `features:[]` array). The documented approach is to build a feature by hand, read its JSON via GET features, and reuse that JSON as input. Custom FeatureScript features are added the same way with a `namespace` field. Docs reference API v9 and v10 inconsistently. — [Onshape docs: feature access](https://onshape-public.github.io/docs/api-adv/featureaccess/); [Onshape docs: Part Studios](https://onshape-public.github.io/docs/api-adv/partstudios); [Onshape forum](https://forum.onshape.com/discussion/18560/how-do-i-add-a-custom-feature-i-wrote-in-featurescript-to-my-partstudio-using-the-api)
- Annual API call quotas:

  | Plan | Annual quota |
  |---|---|
  | Enterprise / Enterprise GOV | 10,000 per full user |
  | Professional | 5,000 per user |
  | Free / Standard / EDU Student | 2,500 per user |
  | EDU Enterprise | 10,000 per enterprise |
  | EDU Educator / Pro Discovery | 2,500 per company |

  - **Exempt:** calls made with OAuth2 through apps publicly listed in the Onshape App Store. Private apps count against the owner's limit.
  - **Errors:** an exhausted quota returns HTTP 402; per-endpoint burst limits return 429.
  - **Extra calls:** purchasable on request.

  — [Onshape API Limits](https://onshape-public.github.io/docs/auth/limits)
- App Store requirements:
  - Public apps must use OAuth2 and complete the "Launch Checklist".
  - Developer licenses are free on request.
  - "Commercial listing details are provided during the onboarding process with the Onshape partnerships team."
  - Admins can assign internal users for testing before submission.

  — [Onshape App Store FAQ](https://www.onshape.com/en/app-integrations/faq); [Onshape help: App Store FAQs](https://cad.onshape.com/help/Content/Home/app_store_faqs.htm); [Onshape help: developer settings](https://cad.onshape.com/help/Content/Plans/enterprise_settings_developer.htm)
- Billing API: plans are defined in the Developer Portal, and every App Store app must have a Free monthly plan by default. A purchases endpoint lists user purchases, and apps with the Purchase scope can start in-app purchases. Consumables (`/consume`) are "not fully implemented at this time", which matters for per-part pricing. Revenue split: in 2015 Onshape said it "varies between partner, some are on a zero revenue split"; no current figure was found. — [Onshape billing docs](https://onshape-public.github.io/docs/api-adv/billing); [Develop3D 2015](https://develop3d.com/develop3d-blog/onshape-heads-out-of-beta-launches-app-store/)
- Onshape Government runs as a separate instance exclusively on AWS GovCloud, for ITAR/EAR work. Its controls include US-person access and FIPS 140-3 cryptography. It is not yet FedRAMP authorized (working with a 3PAO toward Moderate). Data moves between environments only by export and import. — [Onshape Government](https://onshape.com/en/features/onshape-government); [Onshape blog: ITAR/EAR](https://onshape.com/en/blog/real-time-cad-collaboration-meets-itar-ear-compliance)
- Backflip's Onshape add-in was promised "in a handful of weeks" in Aug 2026. As of Nov 3, 2026, Backflip's downloads page lists only Fusion ("More plugins coming soon…"). — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/); [Backflip downloads](https://www.backflip.ai/downloads)

**SOLIDWORKS (Dassault)**
- The Solution Partner Program is for organizations using the SOLIDWORKS API or Document Manager API. Applicants start as Research Associate (a prerequisite for Certified Solution Partner and Gold Product) and receive four SOLIDWORKS licenses. The current questionnaire is dated Jan 2026. — [SPP Application Questionnaire Jan 2026 (PDF)](https://www.solidworks.com/sites/default/filesd10/26docs01/SPP_APPLICATION_QUESTIONNAIRE_Jan2026.pdf); [Partner program levels](https://www.solidworks.com/partners/solution-partner-product-program-levels)
- Partner add-ins must use the partner's license key to verify entitlement at load time, or SOLIDWORKS lists them as unregistered; they must implement ISwPEManager. Solution Partner products need two customer references and Gold products five (older FAQ). The only fee found is an old $100 per extra license shipped. — [SOLIDWORKS API help: Partner Program](https://help.solidworks.com/2024/English/api/sldworksapiprogguide/GettingStarted/SolidWorks_Partner_Program_2.htm); [SOLIDWORKS partner FAQ](https://www.solidworks.com/sw/partners/faq.htm)
- Dassault reportedly declined Backflip's original SOLIDWORKS plugin and is building its own mesh-to-CAD AI. — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)

**Neutral formats**
- OpenCASCADE STEP translator:
  - **Reading:** AP214 as core, plus AP203 and "some parts of AP242".
  - **Writing:** AP203 or AP214 by default, with an "AP242DIS" schema option.
  - **GD&T/PMI:** through XDE.
  - **Tessellation:** written only for entities without a B-rep by default.

  — [OCCT STEP user guide](https://occt3d.com/dev/doc/overview/html/occt_user_guides__step.html)
- Backflip exports "Parametric native feature tree or .STEP". — [backflip.ai](https://www.backflip.ai/). Paramesh exports STEP and STL, with "Onshape integration" ("Push to Onshape") and a REST API on Team. — [parameshai.com](https://parameshai.com/)

**Data residency**
- Autodesk offers EU primary storage (UK, Germany, Ireland) for "select products". Its regional FAQ names ACC, Forma and Tandem; Fusion coverage was not confirmed. — [Autodesk EU data privacy, Sep 2025](https://www.autodesk.com/design-make/articles/commitment-to-data-privacy-eu); [Autodesk Regional Offerings FAQ](https://help.autodesk.com/cloudhelp/ENU/Docs-About-ACC/files/Regional_Data_Storage.html)
- Autodesk forum users have repeatedly asked for ITAR-certified or local-only storage in Fusion. — [Autodesk forum: Fusion 360 ITAR compliant](https://forums.autodesk.com/t5/fusion-manufacture-forum/fusion-360-itar-compliant/td-p/9802057/page/3)

### Inferences
- Output strategy for the MVP (opinion):
  - **Canonical internal representation:** a CadQuery/build123d-like feature program on OCCT. It runs server-side and in the browser, and exports STEP AP214 (AP242 later).
  - **Translators:** write thin translators from that representation to Fusion API calls (add-in) and Onshape feature JSON (App Store app). This keeps one source of truth and lets the web app be the full editor.
  - **Fusion add-in:** should not depend on the preview mesh APIs. Do segmentation and fitting in your own service, and send only sketches, features and constraints through stable APIs.
- **Onshape-first is attractive.** It is browser-native like the MVP, App Store calls are exempt from API quotas, there is a billing API, and Backflip has not shipped there yet as of Nov 3, 2026. The missing consumables billing suggests selling credits through your own site and using Onshape billing only for subscriptions.
- **SOLIDWORKS:** treat as phase 2+ with STEP import as the fallback. Partner gatekeeping plus Dassault's own mesh-to-CAD work make it the highest-risk host.
- **Parasolid:** probably unnecessary for the MVP. All three hosts import STEP, and native features matter more than kernel format.

### Gaps
- Autodesk App Store publisher requirements and revenue terms (2026) were not retrieved. The sibling note records a 0% commission figure.
- Current Onshape App Store revenue share; the Launch Checklist content; any data-residency options for commercial Onshape (beyond GovCloud).
- Parasolid licensing cost and terms (Siemens PLM Components) were not researched.
- Fusion EU or local data-residency status for 2026 could not be confirmed (Autodesk blog returned 403).
- Whether Fusion's mesh APIs left "preview" after the doc snapshot fetched is unknown.

---

## 4. Web technology feasibility: client-side mesh processing and rendering, WASM CAD kernels, size limits, server GPU needs

### Takeaway
A browser-first MVP is feasible in late 2026:
- **Rendering:** WebGPU ships by default in Chrome/Edge, Safari 26 and Firefox (Windows, ARM Mac). WebGL2 is the fallback.
- **CAD kernel:** OpenCASCADE runs in WASM (opencascade.js/replicad), about 2.4–9 MB compressed.
- **Mesh tools:** manifold, three.js, three-mesh-bvh and meshoptimizer are permissively licensed.

The hard limits are the 4 GiB wasm32 memory ceiling (Memory64 is not in Safari) and OCCT robustness. Server GPU needs for model inference are modest: about 2 s per sample on an H100 for current 1.5–2B-parameter point-to-CadQuery models.

### Cited Findings
- WebGPU: Chrome since 113 (Android since 121 on supported GPUs); Safari 26 (Sep 2025) on macOS, iOS, iPadOS and visionOS; Firefox 141 on Windows and 145 on ARM64 macOS, with Linux and Android in progress. — [web.dev: WebGPU supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers); [gpuweb implementation status](https://github.com/gpuweb/gpuweb/wiki/implementation-status); [Wikipedia: WebGPU](https://en.wikipedia.org/wiki/WebGPU)
- wasm32 linear memory is capped at 2^32 bytes (4 GiB). Memory64 shipped in Chrome 133 and Firefox 134 (early 2025) but not in Safari. Memory64 is slower because of bounds checks, so it is worth using only when you need more than 4 GB. — [Memory64 overview](https://github.com/WebAssembly/memory64/blob/main/proposals/memory64/Overview.md); [web-features: wasm-memory64](https://web-platform-dx.github.io/web-features-explorer/features/wasm-memory64); [SpiderMonkey blog, Jan 2025](https://spidermonkey.dev/blog/2025/01/15/is-memory64-actually-worth-using.html)
- opencascade.js sizes:
  - Full npm package: "almost 50MB"; the full build ships about 9.1 MB with brotli.
  - Custom build: 7.1 MB, or 2.4 MB compressed.
  - Emscripten exception support adds about 45% to file size, with a performance penalty.
  - The project claims "near-native speeds" and multi-threading.

  — [ocjs.org: file size](https://ocjs.org/docs/getting-started/file-size); [ocjs.org](https://ocjs.org)
- Library licenses and maintenance (checked via GitHub API, Nov 3, 2026):

  | Library | License | Last push |
  |---|---|---|
  | opencascade.js (donalffons) | LGPL-2.1 | Aug 2023 (stale) |
  | opencascade.js fork (taucad) | LGPL-2.1 | Oct 2026 |
  | replicad | MIT | Oct 2026 |
  | CascadeStudio | MIT | Oct 2026 |
  | manifold | Apache-2.0 | Nov 2026 |
  | three.js | MIT | — |
  | three-mesh-bvh | MIT | — |
  | meshoptimizer | MIT | — |
  | geometry-central | MIT | — |
  | OCCT | LGPL-2.1 | Oct 2026 |

  — [donalffons/opencascade.js](https://github.com/donalffons/opencascade.js); [taucad/opencascade.js](https://github.com/taucad/opencascade.js); [replicad](https://github.com/sgenoud/replicad); [CascadeStudio](https://github.com/zalo/CascadeStudio); [manifold](https://github.com/elalish/manifold); [three.js](https://github.com/mrdoob/three.js); [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh); [meshoptimizer](https://github.com/zeux/meshoptimizer); [geometry-central](https://github.com/nmwsharp/geometry-central); [OCCT](https://github.com/Open-Cascade-SAS/OCCT)
- OCCT's license is LGPL-2.1 plus an exception for header-included object code, with no runtime royalties (see sibling note). — [OCCT FAQ](https://dev.opencascade.org/resources/faq)
- Model inference time: CAD-Recode (Qwen2-1.5B) takes 1.8 s and cadrille (Qwen2-VL-2B) 2.0 s per point-cloud sample on a single H100 at batch size 1. — [cadrille paper, Table 9](https://arxiv.org/html/2505.22914)
- GPU rental prices (late 2026, third-party comparisons; figures conflict):
  - H100 on-demand at neoclouds: about $2.00–$4.50 per GPU-hour. Lambda's 8×H100 SXM is listed at $3.99/GPU-h, and Nebius is $4.50 from Oct 1, 2026.
  - Hyperscaler H100: up to $12.29/GPU-h (Azure).
  - L4: $0.44–0.80/h.

  — [IntuitionLabs H100 comparison](https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison); [Jarvislabs H100 price guide](https://jarvislabs.ai/blog/h100-price); [Spheron](https://www.spheron.network/blog/h100-price-per-hour-2026/); [GetDeploying H100 vs L4](https://getdeploying.com/gpus/nvidia-h100-vs-nvidia-l4)
- Paramesh claims it "runs entirely in your browser" but describes a server-style six-stage pipeline (**inconsistent claim**). — [parameshai.com](https://parameshai.com/)

### Inferences
- Recommended split (opinion):
  - **Browser:** rendering (three.js with WebGPU, WebGL2 fallback), decimation, region painting and selection, interactive primitive fitting on decimated meshes, live deviation heatmaps (BVH distance queries), and an OCCT-WASM preview of the edited feature tree.
  - **Server:** full-resolution segmentation and fitting, AI feature-tree drafting, robust B-rep booleans, fillets and STEP export, and deviation reports on the full mesh.
- Practical browser budget (inference, not measured): about 1–5M triangles displayed interactively. Keep full-res meshes over about 5–10M on the server, or stream LOD, because of the 4 GiB wasm32 ceiling and Safari's lack of Memory64. OCCT objects also add heavy memory overhead in WASM.
- **License note:** shipping LGPL OCCT as WASM to browsers counts as distribution. Keep it as a separately loadable, replaceable module and publish any OCCT modifications to satisfy LGPL relinking terms. Get counsel to confirm; this is a **LICENSE RISK**, though manageable.
- GPU cost per AI draft is cents, not dollars. Example: 2 s × 10 candidates × $3/h ≈ $0.017. Even a 50-iteration generate-check loop is about $0.08. Per-part pricing of $1–5 leaves large gross margin, and Backflip's $1.52–$10 per job (section 6) is not cost-constrained.

### Gaps
- No published benchmark of the maximum mesh size for three.js/WebGPU or for OCCT-WASM boolean and fillet performance was found.
- Serverless GPU per-second pricing (e.g., L4 on Modal or RunPod) was not verified.
- The robustness of OCCT for filleting and sewing on reverse-engineered geometry compared with Parasolid has no quantitative source.

---

## 5. AI and algorithm building blocks: which have usable weights and commercial-friendly licenses; inference cost

### Takeaway
**LICENSE RISK:** the leading open point-cloud→CAD-code models cannot be used commercially as released:
- CAD-Recode code, weights and dataset are all CC BY-NC 4.0.
- cadrille code is Apache-2.0, but its released weights are CC BY-NC 4.0.
- Point2CAD's repo is internally inconsistent (Apache-2.0 LICENSE file vs a CC BY-NC 4.0 statement in the README), and its ParSeNet/HPNet segmentation dependencies have no license at all.

The only commercially licensed checkpoint found is CADReasoner-PC (Apache-2.0, Aug 2026), but its training data is undisclosed. The safe stack is:
- Apache/MIT/BSD geometry: Open3D, PCL, pyRANSAC-3D, CadQuery, build123d, OCCT (LGPL).
- Apache-2.0 base LLMs (Qwen2/Qwen2-VL/Qwen3-VL).
- Your own fine-tune on self-generated procedural data. The CAD-Recode recipe (about 12 h on one H100) shows this is cheap.

### Cited Findings
**AI models (point cloud → CAD program)**

| Model | Code license | Weights license | Base model | Notes |
|---|---|---|---|---|
| CAD-Recode | CC BY-NC 4.0 | CC BY-NC 4.0 | Qwen2-1.5B (Apache-2.0) | Dataset also CC BY-NC 4.0 |
| cadrille | Apache-2.0 | CC BY-NC 4.0 | Qwen2-VL-2B (Apache-2.0) | Point cloud + image + text input |
| CADReasoner-PC | — | Apache-2.0 | cadrille architecture on Qwen2-VL-2B | Training data undisclosed |

- **CAD-Recode** — LICENSE.md is "Attribution-NonCommercial 4.0 International". HF weights `filapro/cad-recode` and `filapro/cad-recode-v1.5` and HF datasets `filapro/cad-recode(-v1.5)` are tagged cc-by-nc-4.0. — [GitHub: filaPro/cad-recode](https://github.com/filaPro/cad-recode); [HF: cad-recode-v1.5](https://huggingface.co/filapro/cad-recode-v1.5); [HF dataset](https://huggingface.co/datasets/filapro/cad-recode-v1.5); [Qwen2-1.5B (Apache-2.0)](https://huggingface.co/Qwen/Qwen2-1.5B)
  - Output is CadQuery Python. It supports only sketch-extrude with line, arc and circle (plus box, rectangle and cylinder abstractions). There is no revolve, fillet or B-spline; the paper says it "lacks the expressiveness to model complex shapes that contain operations beyond the extrusion operation such as revolution and fillet."
  - Training data is procedurally generated, with no human-designed models (1M in the abstract, "11M" in Table 1; the paper does not reconcile these). Training takes about 12 h on one H100.
  - Source: [CAD-Recode paper](https://arxiv.org/html/2412.14042)
- **cadrille** — GitHub license Apache-2.0. HF weights `maksimko123/cadrille` and `maksimko123/cadrille-rl` are cc-by-nc-4.0. — [GitHub: col14m/cadrille](https://github.com/col14m/cadrille); [HF: cadrille](https://huggingface.co/maksimko123/cadrille); [HF: cadrille-rl](https://huggingface.co/maksimko123/cadrille-rl)
  - Built on Qwen2-VL-2B, which is Apache-2.0. — [Qwen2-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct)
  - Training: SFT on procedural data, then RL (DPO and Dr. CPPO/GRPO-style) with programmatic geometric rewards. — [cadrille paper](https://arxiv.org/html/2505.22914)
- **Community re-trains:** many HF checkpoints (e.g., `Hula0401/cadrille-qwen3vl-2b-*`) carry no license tag. Several CAD-Recode-derived datasets are relabeled Apache-2.0 or MIT (e.g., `shalunov/mentis-cad-recode-rendered`, `jereminuer/mentis-cadrecode-labeled`) even though the upstream data is CC BY-NC. — [HF model search: cadrille](https://huggingface.co/models?search=cadrille); [HF dataset: mentis-cad-recode-rendered](https://huggingface.co/datasets/shalunov/mentis-cad-recode-rendered)
- **CADReasoner-PC** — HF license apache-2.0 (created Aug 13, 2026).
  - Iterative "program editing" VLM: cadrille architecture (Qwen2-VL-2B plus a Fourier point-cloud encoder).
  - Takes 128 points per direction and outputs CadQuery plus a compiled STL.
  - Training datasets are not named on the card.
  - Paper arXiv 2603.29847 (CVPR 2026 Findings); code at github.com/zhemdi/CADReasoner (license not checked).

  — [HF: kulibinai/cadreasoner-pc](https://huggingface.co/kulibinai/cadreasoner-pc)

**Segmentation and primitive fitting**
- **Point2CAD** (fits analytic and freeform surfaces plus topology to pre-segmented clouds): the GitHub API detects an Apache-2.0 LICENSE file, but the README says "This software is released under a CC-BY-NC 4.0 license, which allows personal and research use only. For a commercial license, please contact the authors." **Conflict, so treat as non-commercial.** It needs a segmentation step from ParSeNet or HPNet. — [GitHub: prs-eth/point2cad](https://github.com/prs-eth/point2cad)
- **ParSeNet** (segmentation plus parametric surface fitting): no license detected (GitHub API returns none), which means all rights reserved by default. Last push Sep 2020. **HPNet:** no license; last push Apr 2023. — [parsenet-codebase](https://github.com/Hippogriff/parsenet-codebase); [HPNet](https://github.com/SimingYan/HPNet)
- Classical libraries:

  | Library | License | Notes |
  |---|---|---|
  | pyRANSAC-3D | Apache-2.0 | Planes, cylinders, spheres etc.; active Aug 2026 |
  | Open3D | MIT | |
  | PCL | BSD | Sample-consensus models |
  | libigl | Dual MPL-2.0 / GPL-3.0 | Has both LICENSE.MPL2 and LICENSE.GPL; GitHub API reports GPL-3.0, so check which modules you use |
  | MeshLab | GPL-3.0 | |
  | DeepCAD code | MIT | |
  | CadQuery | Apache-2.0 | |
  | build123d | Apache-2.0 | |

  — [pyRANSAC-3D](https://github.com/leomariga/pyRANSAC-3D); [Open3D](https://github.com/isl-org/Open3D); [PCL](https://github.com/PointCloudLibrary/pcl); [libigl](https://github.com/libigl/libigl); [MeshLab](https://github.com/cnr-isti-vclab/meshlab); [DeepCAD](https://github.com/rundiwu/DeepCAD); [CadQuery LICENSE](https://github.com/CadQuery/cadquery); [build123d](https://github.com/gumyr/build123d)
- **CGAL:** kernel and support libraries are LGPL, but most algorithms are GPL, including Shape Detection/Efficient RANSAC (per the sibling note). A commercial license from GeometryFactory is needed for closed distribution. — [CGAL license](https://www.cgal.org/license.html)
- **meshToParametric** (the repo linked from Paramesh AI's site) is MIT, with 4 stars and an Oct 2026 push. It shows that an indie competitor is building on permissive classical code. — [GitHub: TrentIndeed/meshToParametric](https://github.com/TrentIndeed/meshToParametric)

**Quality and cost of current models**
- CAD-Recode on CC3D scans (10-candidate test-time sampling, CD ×10³ in normalized units): mean CD 0.76, median CD 0.31, IoU 74.2%, IR 0.3%. Without sampling, CC3D IR jumps to 16.8%. — [CAD-Recode paper](https://arxiv.org/html/2412.14042)
- cadrille Dr. CPPO (RL) with one sample on CC3D: median CD 0.47, IoU 67.9%, IR 0.2%. With 10 samples: IoU 74.7%, IR 0.1%. — [cadrille paper](https://arxiv.org/html/2505.22914)
- Inference is 1.8–2.0 s per sample on an H100 (see section 4). Test-time sampling uses ten candidates, keeping the one with the lowest CD. — [cadrille paper](https://arxiv.org/html/2505.22914); [CAD-Recode paper](https://arxiv.org/html/2412.14042)

### Inferences
- MVP algorithm stack (opinion; all commercially usable):
  1. **Mesh repair and decimation:** Open3D, meshoptimizer, own code.
  2. **Region segmentation:** curvature and normal region-growing, plus RANSAC for planes, cylinders, cones, spheres and tori via pyRANSAC-3D, PCL or own code. User correction happens in the browser (QUICKSURFACE-style brush/magic wand).
  3. **Freeform patches:** B-spline surface fitting with OCCT's GeomAPI approximation (LGPL).
  4. **Feature-tree drafting:** a fine-tuned Apache-2.0 VLM/LLM (Qwen2-VL-2B or Qwen3-VL-2B class). It is conditioned on the segmented primitives (types, axes, radii, adjacency) rather than raw 256-point clouds, and outputs CadQuery/build123d code.
  5. **Verify-and-correct loop:** execute the code, measure deviation against the dense mesh, and re-prompt or adjust parameters.
  6. **Snap to intent:** standard hole and thread tables, symmetry and concentricity detection, and rounding.
- Conditioning the LLM on fitted primitives turns the hard perception problem into a structured planning problem. This plays to classical-geometry strengths and to the founder's Design X expertise, and avoids training a foundation model. It is also hybrid-part friendly: freeform regions become "fit surface" or "patch" features in the tree.
- **Training data (LICENSE RISK):** do not train on the CAD-Recode dataset, Fusion 360 Gallery or DeepCAD data for a commercial model without legal review (see section 8). Generate your own procedural dataset; CAD-Recode's generator approach is described in the paper but its code is CC BY-NC, so re-implement it clean-room.
- CADReasoner-PC is the only Apache-2.0 checkpoint found. Its undisclosed training data could include NC datasets, so it is usable for prototyping but carries provenance risk for production. Ask the authors.
- Unit cost of AI inference is not a constraint (cents per part). Engineering effort and data are the constraints.

### Gaps
- The license of CADReasoner's GitHub code and its training data provenance were not checked.
- No inference-time data for Point2CAD, ParSeNet or HPNet.
- No public model handles revolve, fillet and freeform together in one open, commercially licensed checkpoint (none found).
- Cost of a frontier-LLM-API approach (e.g., an LLM writing CadQuery from a primitive list) was not benchmarked.

---

## 6. Baseline to match or beat: Backflip AI exact features, limits, workflow, pricing; Paramesh AI; QUICKSURFACE semi-automatic workflow

### Takeaway
Backflip (Nov 2026):
- **Product:** a web app plus a Fusion add-in (Windows/macOS). Onshape and SOLIDWORKS are still "coming soon". Inputs are STL/OBJ/GLB/glTF/PLY; outputs are a native feature tree or STEP.
- **Modes:** Fast (4 options, 10 credits) and Thinking (1 option, 50 credits). "Optimized for 3-axis CNC and turned parts"; sheet metal and injection molding are "coming soon".
- **Pricing:** $20/$50/$380 per month for 100/300/2,500 credits, so about $1.52–$2 per Fast job and $7.60–$10 per Thinking job.
- **Other products:** Drawing-to-CAD and Photo-to-CAD.
- **Gaps an MVP can exploit:** no published accuracy or deviation report, no interactive region editing, and default ToS rights to train on user content.

Paramesh is a $2/part indie prismatic converter. QUICKSURFACE is the human-in-the-loop benchmark: primitives plus relations, user-driven segmentation, auto-surfacing, hybrid modeling and real-time deviation.

### Cited Findings
**Backflip AI**
- Product scope:
  - Scan-to-CAD, Drawing-to-CAD ("inspects the geometry and dimensions in an engineering drawing") and Photo-to-CAD ("from just a few photos. One known dimension and Backflip scales everything").
  - Inputs: "STL, OBJ, GLB, GLTF, or PLY". Outputs: "Parametric native feature tree or .STEP".
  - Modes: "Adjustable effort: fast or agentic thinking modes".
  - Strengths: "Optimized for 3-axis CNC and turned parts. Sheet metal, injection molding, and more coming soon."
  - Operations: "Extrude, Revolve, Pattern, Chamfer, Fillet, and more."

  (Company claims.) — [backflip.ai](https://www.backflip.ai/)
- Pricing (Nov 3, 2026):
  - Free trial: 50 credits, no card.
  - Builder: $20/mo, 100 credits.
  - Pro: $50/mo, 300 credits.
  - Business: $380/mo, 2,500 credits.
  - Enterprise: custom.
  - Credit packs: 100/$20, 300/$50, 2,500/$380, expiring after 12 months. Monthly credits do not roll over.
  - Job costs: "Fast Mode jobs cost 10 credits each and Thinking Mode jobs cost 50 credits each."

  — [Backflip pricing](https://www.backflip.ai/pricing)
  - Derived per-job cost: Builder $2 (Fast) / $10 (Thinking); Business $1.52 / $7.60. Engineering.com cites "roughly $1.52 to $10". — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Workflow: upload a mesh, the AI returns a parametric model with a feature tree, then export STEP or open directly in Fusion.
  - Fast Mode generates four options built differently (e.g., extrude-based vs revolve-based); "results can vary widely."
  - Thinking Mode generates one option and takes longer.
- Independent test (Engineering.com, Aug 2026):
  - **Knob:** none of the four Fast options was error-free, and most missed a small notch. Thinking captured a thin inner wall but still not the whole knob.
  - **Adaptor Ring:** Fast failed on all four attempts; Thinking looked "flawless" by eye.
  - No numeric deviation reporting. Engineering.com does not say whether sketches are constrained or dimensioned.

  — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Fusion add-in: Windows and macOS installers with browser sign-in. It exposes a "part library and AI tools", and multimodal part-library search is reported elsewhere. — [Backflip downloads](https://www.backflip.ai/downloads); [VoxelMatters, Aug 2026](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)
- Security posture (homepage): "We encrypt customer data in transit and at rest, separate access by organization, and never use enterprise data to train our models. Backflip is actively working towards completing a SOC2 Type II audit later this year." It has a Vanta trust center. — [backflip.ai](https://www.backflip.ai/)
- **Terms of Service (updated Aug 4, 2026), §2.3(a):**
  - Users grant Backflip a "worldwide, fully-paid, royalty-free" license, "both during and after the term," to "use, create derivative works of and otherwise exploit your Content to train, develop, enhance and improve the Service and the underlying artificial intelligence models."
  - Users also license their Output, "including by maintaining a 3D model database that may contain Outputs from you and other users, to be shared or sublicensed with other users or otherwise made available to third parties."
  - Exceptions: "Privacy Mode" (no training) and "Private Library Mode" (no sharing), but only if "your Subscription Tier… expressly makes you eligible." The pricing page does not say which tiers are eligible.
  - Content is stored for 30 days after account termination. Backflip may set file-size limits "in its sole discretion."

  — [Backflip Terms of Service](https://www.backflip.ai/legal/terms-of-service)
- History: the v1 SOLIDWORKS plugin was withdrawn. Gen-2 went GA on Aug 4, 2026. Backflip promised an Onshape add-in "in a handful of weeks" (Aug 2026), but none was listed as of Nov 3, 2026. — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/); [Backflip downloads](https://www.backflip.ai/downloads)

**Paramesh AI**
- Status: "Now in private beta" alongside "Coming soon. Join the waitlist."
- Inputs: STL/OBJ/PLY/3MF. Outputs: STEP and STL, a "Full parametric feature tree" viewer, and Onshape push.
- Scope: "Prismatic mechanical parts" (brackets, mounts, plates, housings). It segments planes, cylinders, cones and spheres and detects extrusions, through and blind holes, chamfers and fillets ("8 features types detected"). An AI chatbot can modify dimensions.
- Pricing:
  - Free: cleaning plus STL export.
  - Pay-as-you-go: $2/part.
  - Pro: $29/mo for 30 conversions.
  - Team: $79/mo for 100 conversions plus $1.50/part overage, with REST API and batch.
  - A comparison table says "From $0.33" (**inconsistent**).
- Accuracy claims: "93% cross-section accuracy" and "typically under 3% volume error" (no methodology).

— [parameshai.com](https://parameshai.com/)

**QUICKSURFACE (KVS Ltd), the human-in-the-loop benchmark**
- Workflow: "Parametric model using standard primitives", then "Hybrid modelling using standard primitives & automatic free form modelling", then manual free-form (roll/unroll, 2D sketching, loft, revolve, patterning, trimming).
- Features include alignment (by features, scan-to-scan, scan-to-CAD), 3D sketching on scan data, surface fitting, flattening, and "Real-Time Deviation Control".
- The 2026 brochure advertises "AI powered tools for fast product design" without specifics. A 30-day free trial is available.

— [QUICKSURFACE 2026 brochure (DirDim)](https://dirdim.com/wp-content/uploads/2026/07/QS2026_WEBbrochure.pdf)
- Primitives are planes, cylinders, cones and spheres, with relations (perpendicularity, parallelism). Pro adds "advanced segmentation algorithms for extracting primitives" and a better auto-surfacing fit. Selection is user-driven (magic wand, brush, freeform). — [Polyga](https://www.polyga.com/quicksurface); [TriMech comparison video](https://video.trimech.com/quicksurface-software-comparison)
- Hybrid workflow example (Oct 30, 2026 workshop): an automotive vent duct combining surface reconstruction, parametric primitives and freeform refinement. — [Novedge workshop](https://novedge.com/blogs/design-news/workshop-reverse-engineering-automotive-vent-duct-from-3d-scan-using-hybrid-modeling-quicksurface)
- QUICKSURFACE Lite is sold as a 1-year license through Creality's store, a scanner-bundle channel. QUICKSURFACE for SOLIDWORKS is about €3,300 net (sibling note). — [Creality store: QUICKSURFACE Lite](https://store.creality.com/eu/products/quicksurface-lite-pro)

### Inferences
- **Must-match baseline (opinion):**
  - Upload STL/OBJ/PLY/3MF/GLB.
  - AI draft in ≤ a few minutes with multiple alternative drafts.
  - Feature tree with extrude, revolve, pattern, fillet, chamfer, hole.
  - STEP export plus a Fusion add-in.
  - Per-job price ≤ about $2 for simple parts; a free trial of ≥3 parts.
- **Beat-on items (opinion):**
  1. Interactive region and primitive correction before and after the AI draft. Backflip offers regenerate or pick-among-4, not guided editing; QUICKSURFACE shows users value this control.
  2. A per-feature deviation and tolerance report (PDF/HTML) with pass/fail against user-set tolerance bands. Neither Backflip nor Paramesh publishes deviation.
  3. Hybrid parts: freeform patches as surface-fit features inside the parametric tree. Backflip is explicitly CNC/turned-only; QUICKSURFACE does hybrid but manually.
  4. Privacy by default: no training on customer data unless opted in, at all tiers. Backflip's default ToS trains on and may share user content, with privacy modes only on some tiers.
  5. Ship an Onshape app before Backflip does.
- Paramesh's $2/part and "From $0.33" signal that simple prismatic conversion is commoditizing. The MVP's value should be priced on accuracy evidence and editing time saved, not on conversion alone.

### Gaps
- No Backflip documentation found on file-size limits, maximum triangle counts, or whether sketches are fully constrained or dimensioned. Which tiers include Privacy Mode or Private Library Mode is also unknown.
- No independent benchmark of Backflip across a part set; only Engineering.com's two-part test.
- QUICKSURFACE 2026 "AI powered tools" are unspecified. Current QUICKSURFACE Lite and Pro list prices were not captured this session.
- Paramesh's company identity and real availability are unclear.

---

## 7. Security and IP requirements: cloud upload concerns, on-prem/local processing, ITAR/EAR, training-data consent

### Takeaway
IP and export control are real buying criteria:
- Defense and aerospace buyers still procure offline-dongle Geomagic licenses.
- Autodesk users ask for ITAR or local-only storage.
- PTC built a separate GovCloud instance (Onshape Government) for ITAR/EAR.

The ITAR end-to-end-encryption carve-out (effective Mar 25, 2020) covers storage and transit only when the provider cannot decrypt. AI inference needs plaintext on the server, so the carve-out does not make a normal cloud AI service ITAR-safe. ITAR customers need US-only hosting with US-person access, or local/on-prem inference. Backflip's default ToS licenses user content for training, which leaves room for a "privacy-first by default" position.

### Cited Findings
- ITAR carve-out (DDTC interim final rule, effective Mar 25, 2020): sending, taking or storing unclassified technical data is not an export if it is end-to-end encrypted. The data must be encrypted before leaving the sender's facilities and stay encrypted until the intended recipient or the sender decrypts it.
  - **Encryption bar:** sources variously describe FIPS 140-2 modules or ≥128-bit (e.g., AES-128). **Sources differ.**
  - **Keys:** the cloud provider must not hold the keys or be able to access plaintext.
  - **Geography:** storage in §126.1 countries remains prohibited, and deemed-export rules still apply.

  — [Akin Gump alert](https://www.akingump.com/en/insights/alerts/ddtc-publishes-itar-carve-out-for-encrypted-technical-data-and); [Baker McKenzie](https://sanctionsnews.bakermckenzie.com/ddtc-issues-itar-rule-affecting-technology-transfers-encryption-and-cloud-computing/); [Virtru explainer (vendor)](https://www.virtru.com/blog/itar-data-sharing)
- Onshape Government (PTC): a separate instance on AWS GovCloud with US-person access controls and FIPS 140-3 cryptography, aligned to NIST 800-171 (CMMC L2 pending). FedRAMP Moderate is in progress, not authorized. "It is ultimately the customer's responsibility to ensure compliance." — [Onshape Government](https://onshape.com/en/features/onshape-government); [Onshape blog](https://onshape.com/en/blog/real-time-cad-collaboration-meets-itar-ear-compliance)
- Autodesk Fusion users have asked for ITAR-certified or local storage. No Fusion ITAR certification was found (the Autodesk "Your Fusion data where you need it" post returned 403). — [Autodesk forum thread](https://forums.autodesk.com/t5/fusion-manufacture-forum/fusion-360-itar-compliant/td-p/9802057/page/3)
- Government buyers procure Geomagic "offline dongles" as line items; a USB dongle costs $550 (sibling note). — [GovTribe: Design X renewal](https://govtribe.com/opportunity/federal-contract-opportunity/geomagic-design-x-renewal-c24030)
- Backflip:
  - Homepage: "never use enterprise data to train our models"; SOC2 Type II "later this year".
  - ToS: default license to train on Your Content "during and after the term" and to share Outputs in a 3D model database. Privacy and Private Library modes apply only on eligible tiers.
  - Export control clause: the Service may not be exported except as US law authorizes.

  — [backflip.ai](https://www.backflip.ai/); [Backflip ToS](https://www.backflip.ai/legal/terms-of-service)
- Paramesh claims processing "runs entirely in your browser", which suggests local processing is already used as a selling point, though its own pipeline description conflicts with this. — [parameshai.com](https://parameshai.com/)
- Autodesk offers EU primary-storage options for select products, which shows EU customers expect residency choices. — [Autodesk EU data privacy](https://www.autodesk.com/design-make/articles/commitment-to-data-privacy-eu)

### Inferences
- MVP security requirements (opinion):
  1. **Default no-training:** contractually and in the UI. Use explicit opt-in (e.g., a credit discount) for contributing scans to training.
  2. **Retention:** per-org isolation, encryption at rest and in transit, and configurable auto-delete of uploads after processing (e.g., 24 h–30 days).
  3. **Local mode:** browser-side preprocessing (decimation, segmentation preview) so users can upload only a simplified or segmented representation. A full "local mode" (desktop or container with an on-prem GPU) is a paid tier for regulated customers.
  4. **ITAR/EAR:** state clearly that the standard cloud is not for ITAR data. Offer a US-hosted, US-person-operated deployment, or self-hosted inference, later.
  5. **SOC 2:** start a SOC 2 Type I/II path early, since Backflip is marketing it.
- Small Apache-2.0 2B-parameter models plus classical geometry are feasible to run on-prem on a single consumer or workstation GPU (inference from the 2 s/H100 figures). That makes "local AI scan-to-CAD" a realistic differentiator that foundation-model competitors find harder to offer.

### Gaps
- No survey quantifying how many SMB or job-shop buyers refuse cloud upload of scans was found.
- Whether DDTC's encryption carve-out has been amended since 2020 was not verified against the eCFR.
- Backflip's Enterprise terms and self-hosting options are not public.

---

## 8. Evaluation: public benchmarks and datasets for real-scan → CAD, and metrics to measure MVP quality

### Takeaway
Standard academic metrics are Chamfer distance (mean and median, in normalized units), IoU and invalidity ratio, plus command/parameter accuracy for sequences. The standard sets are DeepCAD, Fusion 360 Gallery and CC3D. None measures editability or design intent, and most data is non-commercially licensed:
- Fusion 360 Gallery is explicitly non-commercial.
- CAD-Recode data is CC BY-NC.
- A2Z (2026) is CC BY-NC-SA.
- CC3D requires a signed license.
- ABC is MIT for the compilation, but model copyrights stay with their creators under Onshape terms.

CC3D's "scans" are virtual Artec-simulated scans, not physical captures. The MVP needs its own physical-scan benchmark with engineering metrics: deviation percentiles in mm, feature recall, standard-size snap accuracy, and edit time.

### Cited Findings
**Benchmarks and datasets**
- **CC3D:** more than 50k scan/CAD pairs derived from 3D ContentCentral.
  - The scans were "obtained by virtually scanning the corresponding CAD models" with a proprietary Artec3D pipeline. Artifacts include missing parts, protrusions and smoothed edges.
  - The SHARP 2023 subset has 31,185 samples (25,612 train / 5,573 test).
  - Variants: CC3D-BRep (face annotations) and CC3D-Ops (operation labels such as extrusion, revolution, chamfer).
  - Access requires signed license agreements (contact Shapify3D@uni.lu).

  — [SHARP 2023 paper (arXiv 2308.15966)](https://ar5iv.labs.arxiv.org/html/2308.15966); [SHARP 2023 challenge](https://cvi2.uni.lu/sharp2023-challenge/); [CVI2 project page](https://cvi2.uni.lu/?p=2850)
  - **Conflict:** CAD-Recode describes CC3D as "actual 3D scans of CAD models", while the dataset creators say "virtually scanning". — [CAD-Recode paper](https://arxiv.org/html/2412.14042)
- **Fusion 360 Gallery license:** "only for non-commercial research purposes". Modified sets must also be NC. "If you are employed by a for-profit, commercial entity, your employer shall also be bound." Autodesk may terminate at any time (updated 11/2021). — [Fusion 360 Gallery LICENSE.md](https://github.com/AutodeskAILab/Fusion360GalleryDataset/blob/master/LICENSE.md)
- **ABC:** the dataset is released under MIT, but "the copyright of these CAD models is owned by their creators", per Onshape Terms of Use §1.g.ii. — [NYU archive: ABC](https://archive.nyu.edu/handle/2451/43778); [Onshape Terms of Use](https://www.onshape.com/legal/terms-of-use)
- **A2Z-10M+** (arXiv 2603.12605, Mar 2026): 10M+ B-rep annotations for 1M ABC models. Meshes are upscaled to 16× and given simulated scan artifacts (dents, missing parts, roughness). The arXiv page license is CC BY-NC-SA 4.0. Its predecessor (arXiv 2409.14087) annotated about 50K CC3D scans and about 45K ABC meshes with B-rep edge, face and junction labels. — [arXiv 2603.12605](https://arxiv.org/abs/2603.12605); [arXiv 2409.14087](https://arxiv.org/html/2409.14087v1)
- **CAD-Recode dataset:** CC BY-NC 4.0 (see section 5). DeepCAD code is MIT, but its data derives from ABC/Onshape. — [HF dataset](https://huggingface.co/datasets/filapro/cad-recode-v1.5); [DeepCAD](https://github.com/rundiwu/DeepCAD)

**Metrics and reference numbers**
- **Chamfer distance:** reported as mean and median ×10³ on normalized shapes. The CAD-Recode authors note mean CD "is a metric that is very sensitive to outlier predictions."
- **IoU:** volumetric, in %.
- **Invalidity ratio (IR):** the share of generated programs that fail to produce a valid solid.

— [CAD-Recode paper](https://arxiv.org/html/2412.14042); [CADReview (IR definition)](https://arxiv.org/pdf/2505.22304)
- Reference results:

  | Model | DeepCAD | Fusion360 | CC3D |
  |---|---|---|---|
  | CAD-Recode, 10 samples (mean CD / med CD / IoU / IR) | 0.30 / 0.16 / 92.0% / 0.4% | 0.35 / 0.15 / 87.8% / 0.5% | 0.76 / 0.31 / 74.2% / 0.3% |
  | cadrille RL, 1 sample (med CD / IoU / IR) | 0.17 / 90.2% / 0.0% | 0.17 / 85.0% / 0.2% | 0.47 / 67.9% / 0.2% |

  — [CAD-Recode paper](https://arxiv.org/html/2412.14042); [cadrille paper](https://arxiv.org/html/2505.22914)
- **Sequence metrics** (DeepCAD): Command Accuracy (ACC_cmd) and Parameter Accuracy (ACC_param, scored only where the command type is correct, within a tolerance). Tolerances differ between papers: Point2Primitive uses ε = 0.01 and Drawing2CAD η = 3 on quantized values. RealCAD (2026) shows "a considerable portion of parameter accuracy can be obtained from dataset priors." — [DeepCAD paper](https://arxiv.org/pdf/2105.09492); [Drawing2CAD](https://arxiv.org/pdf/2508.18733); [Point2Primitive](https://arxiv.org/pdf/2505.02043); [RealCAD](https://arxiv.org/pdf/2608.30617)
- QUICKSURFACE and Geomagic-style tools use real-time deviation color maps as the user-facing quality metric. — [QUICKSURFACE 2026 brochure](https://dirdim.com/wp-content/uploads/2026/07/QS2026_WEBbrochure.pdf)

### Inferences
- Proposed MVP evaluation suite (opinion):
  1. **Geometric fidelity in physical units:** signed deviation from the dense scan to the CAD surface, reported as RMS, P95 and max in mm, plus the % of area within ±0.1/±0.2/±0.5 mm. This replaces normalized CD, which is not interpretable by engineers.
  2. **Validity:** % producing a watertight solid, % exporting a valid STEP, % rebuilding without errors in Fusion and in Onshape.
  3. **Design-intent fidelity:**
     - hole/boss recall and precision;
     - % of holes snapped to the correct standard size;
     - detection of symmetry, concentricity and pattern counts;
     - sketch constraint status (fully vs under-constrained %).
  4. **Editability:** feature count against an expert-built reference, tree edit distance against the expert tree (no standard exists; define an operation-level edit distance), and a "change test" in which editing key dimensions such as hole diameter or wall thickness must rebuild without failure.
  5. **Human efficiency:** minutes of engineer editing to reach acceptance against manual RE time in Design X or QUICKSURFACE. This is the business metric.
- **Benchmark data:** build a private set of about 50–200 physical parts with known CAD (purchasable standard parts, own CNC prints and scanned 3D prints), scanned with 2–3 low-cost scanners plus one metrology scanner. This gives the only honest "real scan" test, since CC3D scans are simulated. Use CC3D, Fusion 360 Gallery and DeepCAD only for internal research comparison, and check their licenses before any commercial training.
- Publishing a transparent benchmark (Backflip publishes none) could itself be a marketing asset for the "trust and deviation report" positioning.

### Gaps
- No established "feature-tree edit distance" metric for CAD reconstruction was found in the literature searched.
- No public dataset of physically scanned parts from low-cost scanners paired with ground-truth CAD under a commercial-friendly license was found.
- CC3D's exact license terms and whether commercial evaluation use is allowed were not retrieved.
- ABC's Onshape §1.g.ii terms were not read directly, so commercial training rights for ABC-derived data remain unclear.
