# Technology & Startup Landscape for 3D Reverse Engineering (Scan-to-CAD): AI Models, Lightweight Rendering/Processing, Plugin Ecosystems (as of Nov 3, 2026)

Scope note: Research done 2026-11-03 through web search and fetches. Facts dated before 2024 are marked **[pre-2024]**. Vendor and company claims are marked **(company claim)**. Some items come from weak aggregators or SEO sites; they are flagged. I found no data on Geomagic financials, competitor pricing or market size, which are out of scope and covered by other researchers.

---

## 1. AI scan-to-CAD research: state of the art, datasets, and distance to production on real noisy scans

### Takeaway
Research has split into three families: (a) segmentation plus primitive fitting (ParSeNet → SED-Net → Point2CAD → NVDNet/Split-and-Fit), (b) direct B-rep generation (SolidGen, BRepGen, DTGBrepGen, HoLa, DualBrep, ParaCAD), and (c) CAD program or sequence inference (DeepCAD → CAD-SIGNet → CAD-Recode → cadrille → CADENA). The 2025–2026 frontier is LLM/VLM-based code generation (CadQuery/Python) with RL fine-tuning and stepwise "agentic" reconstruction. Nearly all of it is trained on synthetic data from ABC, DeepCAD and Fusion 360, is limited to sketch-and-extrude or simple-primitive parts, and is benchmarked by Chamfer distance rather than engineering tolerances. Real-scan evaluation still mostly means CC3D. Nothing published shows metrology-grade, tolerance-aware, freeform-capable reconstruction on real noisy scans.

### Cited Findings

**Segmentation and primitive-fitting family**
- ComplexGen (SIGGRAPH 2022 **[pre-2024]**) reconstructs a B-rep as a chain complex. Its paper stress-tests noisy and missing data and drops normals to simulate a "more practical and challenging setting." — [arXiv 2205.14573](https://arxiv.org/pdf/2205.14573)
- Point2CAD (arXiv Dec 2023, CVPR 2024) beats ComplexGen on most surface, edge and corner metrics (e.g., surface Chamfer 0.018 vs 0.042 for HPNet-based runs). These numbers are from clean ABC-style data, not a noisy-scan benchmark. — [arXiv 2312.04962](https://arxiv.org/pdf/2312.04962)
- Split-and-Fit / NVDNet (arXiv Jun 2024) reports that "inaccuracies in primitive identification and topology typically lead to Point2CAD generating CAD models with fragmented and disconnected components." — [arXiv 2406.05261](https://arxiv.org/pdf/2406.05261)
- In CAD-MLLM's point-based reconstruction table, NVDNet is the strongest baseline; the CAD-MLLM authors say their method trails only NVDNet. — [arXiv 2411.04954](https://arxiv.org/pdf/2411.04954)
- HoLa (arXiv Apr 2025) states that "the high topological errors observed in HPNet+Point2CAD and SEDNet+Point2CAD often result in invalid B-Rep models that cannot be imported into CAD software." It also evaluates robustness on noisy, incomplete point clouds. — [arXiv 2504.14257](https://arxiv.org/pdf/2504.14257)
- View2CAD (CVPR 2025) reconstructs view-centric B-reps from a single RGB-D scan, handling partial visibility. It fits primitives to the depth point cloud and extracts a wireframe with visibility and intersection edge types. — [arXiv 2504.04000](https://arxiv.org/html/2504.04000)

**Direct B-rep generation family**
- DTGBrepGen (CVPR 2025) generates topology first, using two separate adjacency stages, then uses transformer diffusion to produce vertex, edge and face geometry, with B-spline faces. Code is released. — [arXiv 2503.13110](https://arxiv.org/pdf/2503.13110); [CVF open access](https://openaccess.thecvf.com/content/CVPR2025/html/Li_DTGBrepGen_A_Novel_B-rep_Generative_Model_through_Decoupling_Topology_and_CVPR_2025_paper.html)
- DualBrep (SIGGRAPH 2026, arXiv 2606.31579) uses a dual-field continuous B-rep representation. It has a deterministic reconstruction variant (DualBrep_recon), benchmarked against HoLa, NVDNet and SEDNet+Point2CAD, and a latent flow-matching generator conditioned on point clouds or images. — [arXiv 2606.31579](https://arxiv.org/pdf/2606.31579). I could not fetch the full PDF (file too large), so I have no quantitative results.
- ParaCAD (arXiv 2607.17093, 19 Jul 2026) is an autoregressive, point-cloud-conditioned B-rep generator that works with native parametric surfaces with constrained UV domains. It recovers edges and vertices by intersecting the surfaces globally. The authors report better precision and watertightness than point-based baselines. — [arXiv 2607.17093](https://arxiv.org/abs/2607.17093)
- "Flatten the Complex: Joint B-Rep Generation via Compositional k-Cell Particles" (arXiv Jan 2026) is another 2026 B-rep generative paper. — [arXiv 2601.17733](https://arxiv.org/pdf/2601.17733). I have only the title; contents not reviewed.
- BrepGaussian (arXiv 2602.21105, Feb 2026) reconstructs B-rep CAD from multi-view images via Gaussian Splatting with no point-cloud supervision. It converts the Gaussians into a point cloud, then fits parametric surfaces. — [arXiv 2602.21105](https://arxiv.org/html/2602.21105v3)

**CAD program / sequence inference family**
- CAD-SIGNet (arXiv Feb 2024) is an auto-regressive model that recovers sketch-and-extrude design history from a point cloud. It reports a Chamfer Distance of 14.8 on the CC3D real-scan benchmark. — [arXiv 2402.17678](https://vercel.hyper.ai/en/papers/2402.17678)
- CAD-Recode (ICCV 2025): point cloud → CadQuery Python code. It uses Qwen2-1.5B plus one linear layer, trained on 1M procedurally generated synthetic CadQuery programs, and reports state of the art on DeepCAD, Fusion360 and the real-scan CC3D benchmark. The supplement describes CC3D inputs as "sampled from actual 3D scans of CAD models" and says CAD-SIGNet "can generate predictions that greatly differ from the input." — [ICCV 2025 paper](https://openaccess.thecvf.com/content/ICCV2025/papers/Rukhovich_CAD-Recode_Reverse_Engineering_CAD_Code_from_Point_Clouds_ICCV_2025_paper.pdf); [supplement](https://openaccess.thecvf.com/content/ICCV2025/supplemental/Rukhovich_CAD-Recode_Reverse_Engineering_ICCV_2025_supplemental.pdf); [arXiv 2412.14042](https://arxiv.org/pdf/2412.14042)
- cadrille (ICLR 2026 oral; arXiv 2505.22914, revised 17 Feb 2026) is a multimodal model (point cloud, image or text → executable Python CAD code). It is trained with SFT on procedural data, then online RL (GRPO). The authors report "new state-of-the-art on as many as 10 benchmarks across three modalities and four datasets, including a real-world one," and find online RL more effective than DPO. — [arXiv 2505.22914](https://arxiv.org/abs/2505.22914); [ICLR 2026 oral](https://www.iclr.cc/virtual/2026/oral/10006760)
- CADENA (arXiv 2608.00799, 1 Aug 2026) does stepwise CAD reverse engineering: it adds one operation at a time and compares the target mesh with the current predicted geometry at each step. It introduces CADENA-Bench (mechanical parts by category) and reports outperforming prior methods on CADENA-Bench, DeepCAD, Fusion 360 and MCB. The abstract does not mention real scans. — [arXiv 2608.00799](https://arxiv.org/abs/2608.00799)
- CADCrafter (CVPR 2025) maps unconstrained images to parametric CAD. It trains on synthetic, textureless CAD renders, using depth and normal maps as features, and uses DPO with feedback from an automatic code checker to reduce invalid outputs. — [CVF open access](https://openaccess.thecvf.com/content/CVPR2025/html/Chen_CADCrafter_Generating_Computer-Aided_Design_Models_from_Unconstrained_Images_CVPR_2025_paper.html); [arXiv 2504.04753](https://arxiv.org/pdf/2504.04753)
- Text2CAD (NeurIPS 2024, Khan et al.) generates parametric CAD from text prompts. A different paper also called "Text2CAD" (arXiv 2411.06206) uses isometric drawings and Stable Diffusion; the two should not be conflated. — [arXiv 2409.17106](https://arxiv.org/html/2409.17106v1); [arXiv 2411.06206](https://arxiv.org/pdf/2411.06206)

**Datasets (2025–2026 additions)**
- ABC remains the common base: 1M CAD models, without multimodal inputs per model. — [via CMT, arXiv 2504.20830](https://arxiv.org/pdf/2504.20830)
- A2Z-10M+ (CVPR 2026; arXiv 2603.12605, 13 Mar 2026) adds about 10M multimodal annotations for the 1M ABC models: high-resolution meshes with "salient 3D scanning features," 3D sketches, B-rep co-edge, corner and surface labels, and captions. It also adds 25K electronic-enclosure models. The authors benchmark a foundation model trained on 150K models for detecting co-edges and corners "from 3D scans." The dataset needs ~5 TB. As of the abstract, it "will be publicly released" (not yet out), and it does not say whether the scans are real or synthetic. Authors: Jena, …, Sk Aziz Ali. — [arXiv 2603.12605](https://arxiv.org/abs/2603.12605)
- mmABC has over 1.3M B-rep models with point clouds, text and multi-view images; release promised. — [CMT, arXiv 2504.20830](https://arxiv.org/pdf/2504.20830)
- SldprtNet (arXiv 2603.13098, Mar 2026) has 242,000+ industrial parts in both .step and .sldprt formats. — [arXiv 2603.13098](https://arxiv.org/html/2603.13098v1)
- Brep2Text (arXiv 2512.16413) is a B-rep instruction-tuning benchmark: 134,722 B-rep models and 269,444 QA pairs, built on Text2CAD. — [arXiv 2512.16413](https://arxiv.org/pdf/2512.16413)
- CC3D is the de facto real-scan benchmark, used by CAD-SIGNet, CAD-Recode and cadrille. — [CAD-Recode supplement](https://openaccess.thecvf.com/content/ICCV2025/supplemental/Rukhovich_CAD-Recode_Reverse_Engineering_ICCV_2025_supplemental.pdf)

### Inferences
- **Production readiness:** The best academic systems (CAD-Recode, cadrille, CADENA) output editable CadQuery or feature sequences, but only for sketch-extrude-style parts drawn from synthetic distributions. The metric is Chamfer distance or IoU, not GD&T tolerance, deviation maps or design-intent constraints (concentricity, symmetry, standard hole sizes). That falls short of what a Geomagic Design X user expects.
- Direct B-rep generation (DTGBrepGen, HoLa, DualBrep, ParaCAD) is mainly a *generation* research line. Reconstruction variants exist, but output validity (watertight, importable B-rep) is still a headline problem: HoLa explicitly calls out invalid B-reps from Point2CAD pipelines.
- The trend is clearly toward (i) LLM/VLM code generation, (ii) RL with geometric-verifier rewards, and (iii) stepwise generate-compare-correct loops. That is the same architecture Backflip markets ("agent loop… checks its own output," see section 2).
- A hybrid that uses classical segmentation and fitting for accuracy plus an LLM or RL planner for feature-tree structure and design intent looks under-explored in the literature I found. It also matches incumbent RE software's strengths (deterministic fitting, deviation analysis).
- The most valuable proprietary asset is probably a dataset of **real scan ↔ ground-truth native CAD pairs with feature trees**. Public data is synthetic (ABC, DeepCAD-derived) or small. A former Geomagic employee may know customers or partners with such pairs (scanner OEMs, service bureaus).

### Gaps
- No quantitative DualBrep, ParaCAD or CADENA results were retrieved (abstract-level only).
- I found no independent 2025–2026 benchmark comparing all methods on real noisy handheld or structured-light scans. CC3D's scan-collection details were not retrieved.
- ParSeNet, SED-Net, SolidGen, BRepGen and DeepCAD were not re-fetched this session. They appear only as baselines in the papers above.
- I found no paper evaluating tolerance-level accuracy (e.g., ±0.05 mm) of AI reconstruction against metrology references.

---

## 2. AI/CAD startups relevant to scan-to-CAD: products, funding, pricing, traction (as of Nov 2026)

### Takeaway
Backflip AI ($30M Series A from a16z and NEA, founded late 2024 by Markforged co-founders) is the only well-funded startup shipping mesh/scan → parametric feature-tree CAD. Its Gen-2 model went GA on Aug 4, 2026 as a Fusion add-in and web app, from $20/month. Independent testing found it "real" but inconsistent, even on simple parts. Most other well-funded AI-CAD startups target text/sketch-to-CAD or copilots, not scan-to-CAD: Zoo, Adam, Leo AI, Spectral Labs, Vizcom. Mach9 ($34M Series A, Oct 2026) shows that LiDAR-scan-to-CAD is fundable in civil/AEC. Small or indie entrants (e.g., Paramesh AI) are appearing at $2/part.

### Cited Findings

**Backflip AI (scan/mesh → parametric CAD)**
- Founded late 2024 by Greg Mark (CEO) and David Benhaim (CTO), Markforged co-founders. They raised a $30M Series A led by a16z and NEA; angels include Kevin Scott (Microsoft CTO), Rich Miner (Android) and Ashish Vaswani. — [3D Printing Industry, Mar 6 2025](https://3dprintingindustry.com/news/new-ai-model-from-backflip-accelerates-3d-scan-to-cad-237055/); [VoxelMatters, Aug 4 2026](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)
- Mar 2025 v1: a foundation model trained on a synthetic dataset of "over 100 million unique 3D geometries" (company claim), announced with a SOLIDWORKS plugin and a web app (waitlist). It also claimed "60x more efficient training, 10x faster inference and 100x the spatial resolution" (company claim). — [3D Printing Industry](https://3dprintingindustry.com/news/new-ai-model-from-backflip-accelerates-3d-scan-to-cad-237055/)
- v1 never shipped. Greg Mark: "The first model wasn't good." Its CAD output was "unnatural" and hard to edit, and the SOLIDWORKS plugin was removed. Dassault reportedly declined the original SOLIDWORKS plugin; Mark says Backflip is "working with them" on a SOLIDWORKS add-in, and Engineering.com links Dassault's refusal to Dassault's own mesh-to-CAD AI work. — [Engineering.com, ~Aug 4 2026](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Gen-2 went GA Aug 4, 2026 as an Autodesk Fusion add-in and a standalone web app (STEP export). It produces feature trees (extrude, revolve, pattern chained) through an agent loop that reconstructs, checks and iterates. Fast mode takes "a couple of minutes"; Thinking mode is for complex parts. It also offers multimodal (text/photo) part-library search. — [Develop3D, Aug 4 2026](https://develop3d.com/ai/backflip-ai-reverse-engineering/); [VoxelMatters](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)
- Develop3D says it is strongest on "moderate-complexity 3-axis CNC milled and turned parts"; no accuracy benchmarks are published. — [Develop3D](https://develop3d.com/ai/backflip-ai-reverse-engineering/)
- Pricing: from $20/month (Builder, Pro, Business and Enterprise tiers). Credits: Fast = 10 credits, Thinking = 50 credits, about $1.52–$10 per job. The company frames this as ~$10 per part vs ~$1,500 for manual RE (company claim). Free trial is 3 or 4 reconstructions (sources conflict). — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/); [Develop3D](https://develop3d.com/ai/backflip-ai-reverse-engineering/); [VoxelMatters](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)
- Independent test (Engineering.com, Michael Alba) on a toaster-oven knob and an adaptor ring: Fast mode "can vary wildly" and failed all 4 attempts on the adaptor ring; Thinking mode was "flawless" by eye on the ring but did not fully recreate the knob's notch. The verdict: "an editable starting point," and Backflip is "real," but its "true potential remains to be seen." An Onshape add-in was expected "in a handful of weeks." — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Traction (company claim): a large automotive manufacturer runs an automated scanning system that digitizes ~half its parts, expected to approach full coverage by year-end 2026. — [VoxelMatters](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)
- Sep 17, 2026: Backflip launched AI drawing-to-CAD (2D drawings/photos → 3D CAD). — [Yahoo Finance / press](https://finance.yahoo.com/technology/ai/articles/backflip-ai-converts-2d-engineering-130000356.html)

**Other mesh-to-CAD entrants**
- Paramesh AI is a browser-based mesh (STL/OBJ/PLY/3MF) → STEP converter with a feature tree, in private beta with a waitlist. Supported: planes, cylinders, cones, spheres, extrusions, holes, chamfers, fillets; aimed at prismatic brackets, plates and housings. Pricing: free mesh cleaner; $2/part pay-as-you-go; Pro $29/month for 30 conversions; Team $79/month for 100 conversions plus API. Claims "93% cross-section accuracy," "<3% volume error" (no methodology). No company or team info is published; it links a GitHub repo, TrentIndeed/meshToParametric, which suggests an indie or small developer. — [parameshai.com](https://parameshai.com/)
- Creaform's Scan-to-CAD Pro was described in 2025 as an RE module that "helps with modeling but is not doing the modeling for you." — [Engineering.com, "AI can now use Solidworks"](https://www.engineering.com/ai-can-now-use-solidworks/)

**Scan-to-CAD in AEC / civil (adjacent, well-funded)**
- Mach9 raised a $34M Series A on Oct 21, 2026, co-led by First Round Capital and Bessemer, with Prudence and Quiet Capital; total funding is $49M. It converts LiDAR/reality-capture data into editable civil-engineering CAD (curbs, lane markings, poles). It pivoted from Mach9 Robotics. It claims up to 10x faster at one-fifth the cost and 2,500+ projects (company claims). — [TechCrunch, Oct 21 2026](https://techcrunch.com/2026/10/21/mach9-raises-34m-after-pivoting-to-ai-cad-software/); [WOWTALE](https://en.wowtale.net/2026/10/24/235707/)

**Text/sketch-to-CAD, copilots and foundation-model startups (not primarily scan-to-CAD)**
- Zoo (formerly KittyCAD; co-founders Jessie Frazelle, Jordan Noone, Jenna Bryant) launched Zookeeper, a conversational CAD agent in Zoo Design Studio, around Jan 26, 2026. Its CAD tools are exposed through a Zoo-MCP server. Funding figures conflict: $5M seed (Simplify) vs $11M total with an Oct 2023 seed (Caplight); unverified. — [Zoo press](https://zoo.dev/press/zoo-introduces-zookeeper); [Caplight](https://www.caplight.com/company/zoo); [Simplify](https://simplify.jobs/c/Zoo)
- Adam (AdamCAD, YC W25; Zach Dive, Aaron Li) raised a $4.1M seed led by TQ Ventures (~Oct 31, 2025). It is pivoting from viral text-to-3D to a professional CAD copilot and has open-sourced its "CADAM" text-to-CAD project. — [TechCrunch](https://techcrunch.com/?p=3063885); [Rutab](https://rutab.net/b/hardware/2025/10/31/startap-adam-privlek-41-mln-na-prevraschenie-virusnogo-tekstovogo-3d-redaktora-v-ai-pomoschnika-dlya-inzhenerov.html)
- Leo AI (getleo.ai; founded 2023; Cambridge MA / London) builds a mechanical-engineering copilot. It raised a $9.7M seed led by Flint Capital (Sep 2025); sources conflict on whether $9.7M is the round or the total. Preqin lists an undisclosed Feb 2026 angel round. — [Pulse2](https://pulse2.com/leo-ai-9-7-million-raised-for-transforming-mechanical-engineering); [Unite.ai](https://www.unite.ai/leo-ai-raises-9-7m-to-power-a-new-era-of-mechanical-engineering); [Preqin](https://www.preqin.com/data/profile/asset/leo-ai/765259). Do not confuse it with "LEO," Dassault's own SOLIDWORKS virtual companion (section 3).
- Spectral Labs (founded 2022; CEO Rahul Iyer; Pebblebed portfolio) released SGS-1 (~Sep 2025), described as "the first generative model for structured CAD" outputting parametric B-rep/STEP. By Oct 2026 it had SGS-Mk2 ("foundation model for physical engineering": geometry, topology, kinematics) plus the Quartz CAD execution environment. Its agent passed the SOLIDWORKS CSWP exam in under 3 hours (company claim, internal 45-problem eval at 0.1% tolerance). Funding: "$26.4M seed" appears only on a jobs aggregator (unverified). No scan input is mentioned. — [Develop3D, Oct 14 2026](https://develop3d.com/cad/spectral-labs-turing-test-ai-cad/); [Pebblebed](https://pebblebed.com/portfolio/spectral); [standout.work](https://standout.work/companies/1f409482-bfa2-4468-8cd9-82bfcdec00bd)
- Vizcom (AI industrial-design rendering/sketch) raised a $27M Series B led by Radical Ventures (Oct 29, 2025); total ≈$52M; claims 700,000+ designers; customers include Ford and New Balance. — [Vizcom blog](https://www.vizcom.com/blog/announcing-our-series-b); [Radical](https://radical.vc/building-the-future-of-industrial-design/)
- nTop (nTopology) has ~$132M total raised per CB Insights, with its latest listed round Sep 2024; no 2025–2026 round found. — [CB Insights](https://www.cbinsights.com/company/ntopology/financials)
- Shapr3D: funding data conflict (CB Insights $21.8M over 7 rounds vs VCBacked $14.5M); no clearly dated 2025–2026 round. — [CB Insights](https://www.cbinsights.com/company/shapr3d/financials); [VCBacked](https://www.vcbacked.co/company/shapr3d)
- Physna (Thangs; geometric search): ~32 employees as of Mar 2026, down 43.6% from 56 in 2023, per Revelio Labs workforce data (internally inconsistent). — [Revelio Labs](https://www.reveliolabs.com/companies/physna/employees)

### Inferences
- **Direct competition for direction (1):** Backflip is the funded incumbent-in-waiting for prismatic mechanical parts and is building plugins across Fusion, Onshape and SOLIDWORKS. Competing head-on with a general-purpose mesh-to-CAD foundation model means competing with $30M and a 100M-geometry synthetic dataset. A smaller team would need a niche Backflip is weak in: freeform/Class-A surfacing, sheet metal, castings with draft, tolerance-verified output with deviation reports, or industry-specific parts (turbine blades, dental/medical, automotive aftermarket).
- Backflip's sweet spot ("moderate-complexity 3-axis CNC milled and turned parts") is the easiest RE segment. Hybrid parts (prismatic plus freeform), which Geomagic Design X handles, remain uncovered by any AI startup I found.
- Investor appetite for "reality capture → editable CAD" is proven in both mechanical (Backflip) and civil (Mach9), so seed funding is plausible for a credible team with domain expertise.
- Paramesh-style indie tools at $2/part suggest commoditization pressure on simple prismatic conversion.

### Gaps
- No Backflip ARR, user counts or customer names. No Zoo/Adam/Leo revenue or pricing verified.
- CADY was not researched (no results retrieved). Thangs product status in 2026 is unknown.
- I found no other startup doing AI-based scan inspection or AI mesh segmentation for RE in mechanical metrology.

---

## 3. What incumbents are doing with AI (Nov 2026)

### Takeaway
Incumbent AI is mostly assistants, help/knowledge copilots and inspection-side ML (defect segmentation, point-cloud classification). None of the major RE/metrology vendors has publicly shipped an AI "mesh → parametric feature tree" feature. Autodesk's neural CAD (announced at AU, Sep 2025) is the most ambitious generative-geometry effort but was reportedly not publicly available as of spring 2026. Dassault reportedly has internal mesh-to-CAD AI work and blocked Backflip's SOLIDWORKS plugin, a platform-risk signal for plugin builders.

### Cited Findings
- **Hexagon / Geomagic:**
  - Hexagon completed the acquisition of the Geomagic suite from 3D Systems in April 2025, and Geomagic Design X 2026.1 shipped in March 2026. Hexagon's release notes highlight scanner support (latest Scantech software, DefinSight, upgraded RDS hardware) and expanded mesh-splitting such as projecting 3D curves onto meshes. A third-party listing adds Shrink Wrap (watertight mesh) and LiveTransfer for SOLIDWORKS 2026, Creo 12 and Inventor 2026. No AI features are listed on Hexagon's pages. — [Hexagon What's New](https://hexagon.com/products/geomagic-design-x/whats-new); [Quality Digest (2025.1)](https://www.qualitydigest.com/inside/innovation-news/hexagon-releases-geomagic-design-x-20251-121025.html)
  - Geomagic Freeform 2026 (Mar 2026) added automation features and lower entry pricing. — [EuropaWire, Mar 16 2026](https://news.europawire.eu/hexagon-introduces-geomagic-freeform-2026-with-automation-features-and-lower-entry-pricing-for-advanced-3d-sculpting/eu-press-release/2026/03/16/16/01/26/171688/)
  - HxDR Reality Cloud Studio was renamed Hexagon GeoCloud. It adds AI point-cloud classification (filter non-essential elements for Scan-to-BIM, stream to CloudWorx/Cyclone 3DR) and AI processing for BLK2GO/BLK ARC data. At its June 2023 launch **[pre-2024]**, pricing was $20–$431/month across three tiers. — [Hexagon GeoCloud newsletter](https://geocloud.hexagon.com/resource/newsletter/unlock-next-level-productivity-with-all-new-capabilities); [Geo Week News](https://www.geoweeknews.com/articles/hexagon-reality-cloud-studio-capture-data-point-cloud-registration-meshing/)
- **Autodesk:**
  - Autodesk announced "neural CAD" 3D generative foundation models for Fusion and Forma at AU (Sep 16, 2025): language, sketch or image → "first-class CAD geometry," with a claimed automation of "80 to 90%" of routine design tasks (company claim). The models are trained on synthetic plus customer data (Mike Haley); per-customer fine-tuning is "future." No release date, and scan/mesh input was not mentioned. — [Develop3D](https://develop3d.com/cad/autodesk-unleashes-neural-cad-3d-generative-ai-foundation-models/); [Autodesk neural tech page](https://www.autodesk.com/solutions/autodesk-ai/neural-technology)
  - A third-party blog (Apr 2026) says neural CAD was "not publicly available in Fusion" with no shipping date. Weak source. — [texocad blog](https://blog.texocad.ai/posts/fusion-360-ai-features)
  - Autodesk Research authored SolidGen/BRepGen-era B-rep work (not re-verified this session).
- **Dassault Systèmes (SOLIDWORKS):**
  - SOLIDWORKS 2026 FD01 adds AURA and LEO "AI-powered Virtual Companions" in a SOLIDWORKS Labs (Beta) tab, plus AI-assisted model-issue diagnosis. AURA is mainly a knowledge assistant (docs, training, community); generative assembly features remain beta, and users report "limited functionality compared to demo promises." Design Assistant is cloud-only. — [CADimensions](https://resources.cadimensions.com/cadimensions-resources/aura-your-new-personal-design-assistant-in-solidworks-0); [SOLIDWORKS Live](https://live.solidworks.com/demand/solidworks-ai-explained-leo-aura-solidworks-2026-solidworks-labs-demo?page=21); [OhMyCAD](https://ohmycad.com/en/?p=61577)
  - 3DEXPERIENCE World 2026 (Houston, Feb 1–4) was AI-focused; no public mesh-to-CAD announcement was found. — [BusinessWire](https://www.businesswire.com/news/home/20260129890971/en/AI-at-the-Forefront-of-Creation-and-Innovation-Exploring-the-Future-of-Design-and-Manufacturing-at-Dassault-Systmes-3DEXPERIENCE-World-2026)
  - Dassault reportedly declined Backflip's SOLIDWORKS plugin and has its own mesh-to-CAD AI work (Engineering.com reporting). — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- **Siemens:** Design Copilot NX (mid-2025) is a natural-language learning/help assistant, not geometry generation. No RE/mesh AI was found. — [Digital Engineering 24/7](https://www.digitalengineering247.com/article/siemens-brings-ai-copilot-immersive-design-to-nx); [CIMdata](https://www.cimdata.com/en/industry-summary-articles/item/27978-siemens-brings-ai-copilot-immersive-design-and-integrated-fluid-and-thermal-simulation-to-nx)
- **PTC / Onshape:**
  - Onshape AI Advisor is a documentation-grounded assistant embedded in the design environment, updated every three weeks. PTC says it plans automatic geometry creation (no date). — [Onshape blog](https://www.onshape.com/en/blog/ai-advisor-artificial-intelligence-cad-engineering-software); [Monoist](https://monoist.itmedia.co.jp/mn/spv/2510/22/news021.html)
  - A single secondary source says Onshape Labs opened Jul 2026 and a FeatureScript MCP Server went GA in Aug 2026 (unverified). — [Leo AI blog](https://www.getleo.ai/blog/onshape-built-in-ai)
- **ZEISS INSPECT 2026:** AI report translation via the user's chosen GenAI engine; ZADD AI segmentation for automated defect detection in INSPECT X-Ray; "assisted defect inspection" in Optical 3D. — [ZEISS press release](https://www.zeiss.com/metrology/en/about-us/newsroom/2025/software-release.html); [ZEISS INSPECT X-Ray 2026](https://www.zeiss.com/metrology/en/software/zeiss-inspect/zeiss-inspect-x-ray/zeiss-inspect-x-ray-release.html); [Inspenet on ZADD](https://inspenet.com/en/news/zadd-from-zeiss-redefines-ai-inspection-in-precision-industry/)
- **Artec 3D:** Artec Studio 20 headline AI is "AI Photogrammetry" (photos/video → 3D, multi-camera). Mesh-to-CAD alignment is automatic, and marketing mentions "complete automatic scan-to-CAD conversions," but no AI feature-tree reconstruction is documented. — [Artec Studio page](https://www.artec3d.com/software/artec-studio); [Artec What's New](https://support.artec3d.com/hc/en-us/articles/28014243654930-Artec-Studio-20-What-s-New); [Manufacturing.net](https://www.manufacturing.net/automation/news/22949198/artec-3d-launches-artec-studio-20-a-3d-data-capture-and-processing-software)

### Inferences
- Incumbents are leaving a window open for AI-native RE, but it is narrowing. Hexagon now owns Geomagic, Dassault reportedly has internal mesh-to-CAD AI, and Autodesk's neural CAD could eventually accept mesh input. A startup's advantage is speed and willingness to ship imperfect output with a human-in-the-loop UI.
- Incumbents' AI on the inspection side (ZEISS ZADD, Hexagon classification) is segmentation and classification, an easier ML task than parametric reconstruction. That is a sign that "AI-assisted segmentation and auto-region-detection inside the RE workflow" is the near-term production-grade capability.
- Platform-gatekeeper risk is real. Dassault's reported refusal of Backflip's plugin means a plugin-first strategy on a platform whose owner builds a competing feature can be blocked or sherlocked.

### Gaps
- PolyWorks (InnovMetric) and Creaform AI features for 2026 were not found. QUICKSURFACE 2026 release notes were not indexed.
- Hexagon Nexus AI plans for Geomagic are unknown; I found no public AI roadmap for Design X.
- Autodesk Project Bernini status in 2026 is unknown (not covered by retrieved sources).

---

## 4. Lightweight rendering and processing: web/cloud/mobile, Gaussian splatting, compression/streaming

### Takeaway
Web viewing of massive point clouds is solved for visualization (Potree, WebGL, hundreds of billions of points), and Potree 2.0 is planned as a WebGPU rewrite. Cloud reality-capture platforms are funded and AEC-centric (Cintoo €37M Series B; Hexagon GeoCloud). Mobile capture is consumer/prosumer and increasingly Gaussian-splat-based: Polycam ($18M Series A, ~100K paying users in 2024), KIRI Engine (3DGS-to-Mesh 3.0, Apr 2026), Scaniverse (free, Niantic Spatial). Gaussian splatting is not engineering-grade and is not a direct CAD input. The gap is browser-native *engineering* processing (mesh repair, segmentation, primitive fitting, deviation analysis) for mechanical RE. Incumbent RE tools remain Windows desktop apps.

### Cited Findings
- Potree is WebGL-based with auto-generated LOD and displays "billions of points in real-time." The sponsor page says "Potree 2.0 will be a WebGPU based rewrite" enabling compute-shader rendering and processing (forward-looking, no release found). — [Potree GitHub Sponsors](https://github.com/sponsors/potree)
- The Potree thesis reports rendering up to 597 billion points (~1.6 TB compressed) in a browser **[pre-2024]**; a later presentation claims 640 billion. — [TU Wien, Schütz 2016](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/); [FOSSGIS slides](https://www.fossgis.de/mediawiki/images/e/e4/Potree.pdf)
- Cintoo (cloud point-cloud/mesh streaming for BIM and digital twins) raised a €37M Series B led by Partech (Nov 2024); totals of $46M–$54M per aggregators. Its "patent-pending point cloud-to-mesh engine" is its core technology. It released Cintoo 360 Edition for Ricoh 360 data in Feb 2026. — [Tech.eu, Nov 4 2024](https://tech.eu/2024/11/04/cintoo-raises-eur37m-for-cloud-based-reality-data-solutions/); [Geo Week News](https://www.geoweeknews.com/news/cintoo-secures-37-million-in-series-b-funding-round-led-by-partech)
- Hexagon GeoCloud (formerly Reality Cloud Studio) offers cloud registration, meshing and AI classification, streaming to Cyclone 3DR/CloudWorx (see section 3). — [Hexagon GeoCloud](https://geocloud.hexagon.com/resource/newsletter/unlock-next-level-productivity-with-all-new-capabilities)
- Polycam raised an $18M Series A on Feb 7, 2024, led by Left Lane Capital (with Adobe and Chad Hurley). At that time it was cash-flow positive for months in 2023, had ~100,000 paying customers and a ~$100/year Pro tier, and earmarked funds to train AI 3D-reconstruction models. No 2025–2026 round was found. — [TechCrunch, Feb 7 2024](https://techcrunch.com/2024/02/07/3d-scanning-app-polycam-gets-backing-from-youtube-co-founder)
- KIRI Engine 4.2 (Apr 2026) ships "3DGS to Mesh 3.0," producing a Gaussian splat plus mesh from one capture. It claims to be the "only mobile scanning app" offering this (company claim). Free-tier terms conflict between KIRI pages. — [RenderHub, Apr 2026](https://www.renderhub.com/3d/news-260416); [Radiance Fields](https://radiancefields.com/kiri-engine-4.2-ships-3dgs-to-mesh-3.0); [KIRI blog](https://www.kiriengine.app/blog/kiri-engine-4.2-release)
- Scaniverse is published by Niantic Spatial, Inc.; it is free with unlimited scans and exports and does reconstruction on-device (per a KIRI comparison, a competitor source). — [KIRI vs Scaniverse](https://www.kiriengine.app/blog/comparison/kiri-engine-vs-scaniverse)
- **Gaussian splatting and engineering accuracy:**
  - Splats "do not provide explicit geometric surfaces" and are of "limited suitability for engineering applications that require precise geometric models." — [INTERGEO/DVW session abstract](https://programm.dvw.de/intergeo-agenda-en/gaussian-splats-mehr-als-nur-eine-sch%C3%B6ne-visualisierung)
  - A 2026 ISPRS Annals study found the spatial accuracy of building splats "heavily dependent" on capture factors, and that visual similarity metrics "do not fully capture spatial accuracy." — [ISPRS Annals XI-M-1-2026](https://isprs-annals.copernicus.org/articles/XI-M-1-2026/31/2026/isprs-annals-XI-M-1-2026-31-2026.pdf)
  - CADSplat (arXiv 2609.18473, Sep 2026) uses CAD models as priors for sparse-view digital-twin GS and lists "metrology-grade measurement" as future work. — [arXiv 2609.18473](https://arxiv.org/pdf/2609.18473)
  - In AEC, GS adoption is as a rapid change-documentation method, not a survey instrument. — [AEC Magazine](https://aecmag.com/reality-capture-modelling/introducing-gaussian-splats-for-aec/)
  - A vendor blog cites ~7.82 cm mean geometric error for standalone splats (unverified secondary citation). — [thefuture3d.com](https://www.thefuture3d.com/answers/gaussian-splatting-accuracy-engineering)
- Research bridging GS to CAD is emerging: BrepGaussian (multi-view images → GS → point cloud → parametric surfaces → B-rep). — [arXiv 2602.21105](https://arxiv.org/html/2602.21105v3)
- Paramesh AI and the Backflip web app show that browser-based upload-and-convert UX is now the default for AI mesh-to-CAD entrants. — [parameshai.com](https://parameshai.com/); [Develop3D](https://develop3d.com/ai/backflip-ai-reverse-engineering/)

### Inferences
- **For direction (2):** the "viewer" layer is commoditized (open-source Potree/three.js, funded AEC platforms). The open niche is a browser or cloud **mechanical RE workbench**: scan cleanup, region segmentation, primitive and freeform fitting, deviation colormaps, cross-sections, STEP export. It would run on WebGPU/WASM with heavy jobs in the cloud and could target Chromebook or Mac users and collaboration, all poorly served by Windows-only desktop RE tools. This is plausibly where a former Geomagic engineer has the clearest technical edge.
- Mobile LiDAR and splat capture is good enough for visualization and rough sizing but not for tolerance-critical RE. A product that takes phone captures and snaps them to standard features (hole sizes, plane orthogonality) could serve maker, aftermarket and repair segments that do not own $10K+ scanners.
- Combining GS appearance with mesh/CAD geometry (e.g., KIRI's dual output) is a product trend, but CAD-grade value will still come from LiDAR, structured-light or photogrammetry meshes.

### Gaps
- No sourced data on other WebGPU point-cloud/mesh engines (e.g., commercial three.js-based RE viewers), on mesh compression/streaming stacks (Draco, meshoptimizer, 3D Tiles), or on their adoption in RE tools.
- RealityScan (Epic) 2025–2026 version, pricing and features were not found in searches.
- Polycam 2025–2026 revenue or funding was not found. No data on browser-based RE tools from incumbents (Geomagic, QUICKSURFACE web versions).

---

## 5. Plugin ecosystems: existing scan-to-CAD plugins, business size, app-store economics

### Takeaway
Scan-to-CAD plugins are an established but small, high-ASP niche. Mesh2Surface (Rhino and SOLIDWORKS), QUICKSURFACE for SOLIDWORKS (~€3,300 ex-VAT at one reseller) and Geomagic for SOLIDWORKS (price not found) are sold mostly through resellers. Store economics are favorable on paper: Autodesk App Store charges a 0.0% commission, and Onshape's split varies by partner, some at zero (2015 info). The constraint is platform-owner competition and gatekeeping (the reported Dassault/Backflip case). Backflip is executing a multi-host plugin strategy (Fusion now, Onshape imminent, SOLIDWORKS pending).

### Cited Findings
- Mesh2Surface for SOLIDWORKS was priced at ¥363,000 pre-tax in Japan (launch Apr 25, 2022 **[pre-2024]**), supporting SOLIDWORKS 2017+. The Rhino edition is listed on Food4Rhino (Rhino 5/6/7) and Novedge (Premium 6.0, "get a quote"). — [Monoist, 2022](https://monoist.itmedia.co.jp/mn/articles/2205/10/news017.html); [Food4Rhino](https://www.food4rhino.com/app/mesh2surface-rhino-5-rhino-6-and-rhino-7-compatible); [Novedge](https://novedge.com/products/buy-mesh2surface-for-rhinoceros)
- QUICKSURFACE for SOLIDWORKS is listed at €3,960 incl. €660 VAT (≈€3,300 net) at PolyFab3D; DIRDIM lists "Contact Us" with a 30-day trial. It is a SOLIDWORKS Solution Partner product. — [PolyFab3D](https://www.polyfab3d.com/logiciels/5055-quicksurface-for-solidworks.html); [DIRDIM](https://dirdim.com/dimensions_products/quicksurface-for-solidworks/); [SOLIDWORKS partner page](https://www.solidworks.com/partner-product/quicksurface-solidworks)
- Mesh2Surface also has a SOLIDWORKS partner listing. — [SOLIDWORKS partner page](https://www.solidworks.com/partner-product/media/mesh2surface-solidworks)
- Geomagic Design X LiveTransfer supports SOLIDWORKS 2026, Creo 12 and Inventor 2026 (third-party listing), showing the incumbent's "bridge" approach rather than in-host modeling. — [Hexagon What's New](https://hexagon.com/products/geomagic-design-x/whats-new)
- Autodesk App Store Publisher Agreement: "Autodesk currently sets the commission rate at 0.0%," revisable. Launch-era FAQ said it could charge up to 30% in future **[pre-2024]**. — [Autodesk Publisher Agreement PDF](https://apps.autodesk.com/Content/pdf/Publisher.pdf); [3DVF](https://3dvf.com/actualite-7511-autodesk-exchange-apps-autodesk-remunere-application-html/)
- Onshape App Store: billing is consolidated by Onshape; the revenue split "varies between partner, some are on a zero revenue split" (2015 **[pre-2024]**). Developer licenses are free on request; commercial listing terms are set during onboarding with the partnerships team. — [Develop3D, 2015](https://develop3d.com/develop3d-blog/onshape-heads-out-of-beta-launches-app-store/); [Onshape App Store FAQ](https://www.onshape.com/en/app-integrations/faq)
- Backflip's plugin path: SOLIDWORKS plugin (2025, withdrawn; reportedly declined by Dassault) → Fusion add-in (GA Aug 2026) → Onshape add-in "in a handful of weeks" → SOLIDWORKS add-in being worked on with Dassault. — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Paramesh AI offers Onshape integration on paid plans plus REST API, with no desktop plugins. — [parameshai.com](https://parameshai.com/)

### Inferences
- Plugin RE businesses have historically been small vendors (ADA 3D/Mesh2Surface, KVS/QUICKSURFACE), with perpetual licenses in the low-thousands of euros and reseller channels. This suggests lifestyle-to-small-company scale, not venture scale, unless AI changes the value per seat.
- Useful plugin ideas with low platform-collision risk (inference):
  - scan-data hygiene inside CAD (decimation, hole fill, alignment to CAD datums);
  - "fit standard feature" assistants (snap fitted cylinders to ISO hole or thread sizes);
  - scan-vs-CAD deviation overlays inside Fusion/Onshape (inspection-lite);
  - Onshape/Fusion connectors for the founder's own cloud RE engine;
  - Blender/Rhino SubD-from-scan helpers for industrial designers.
- Onshape (cloud-native, API-first, browser) and Fusion (0% store commission, large hobbyist/SMB base) are the friendliest hosts. SOLIDWORKS has the largest professional RE audience but the highest gatekeeper risk.

### Gaps
- No user counts or revenues were found for any RE plugin (Mesh2Surface, QUICKSURFACE, Xtract3D, Geomagic for SOLIDWORKS).
- Geomagic for SOLIDWORKS and Xtract3D pricing were not found. No current Inventor, NX or Blender scan-to-CAD plugin inventory was retrieved.
- SOLIDWORKS Solution Partner program fees and terms were not found. I have no Food4Rhino download statistics and no current (post-2024) Onshape revenue-split figure.

---

## 6. Open-source building blocks and licensing implications

### Takeaway
A commercial closed-source RE product can use OpenCASCADE: LGPL-2.1 plus an exception permitting header-included object code, with no royalties. CGAL's most useful algorithms are GPL and need a paid GeometryFactory license for closed distribution. Permissive libraries (Open3D, PCL, libigl) are generally safe. GPL tools (MeshLab) are for reference or offline use only unless the product is open source. For a web/cloud SaaS, GPL obligations are triggered by *distribution*, so server-side use is less constrained, but WASM shipped to browsers counts as distribution.

### Cited Findings
- OpenCASCADE Technology moved to LGPL 2.1 with an additional exception at v6.7.0, letting object code include material from header files. The FAQ says commercial apps can use it with no development license fees, run-time fees or royalties, and source disclosure of the app is the developer's choice; a commercial license is available to avoid LGPL requirements (price not public). — [OCCT FAQ](https://dev.opencascade.org/resources/faq); [OCCT LGPL announcement](https://dev.opencascade.org/content/open-cascade-technology-changes-its-license-gnu-lgpl); [OCCT exception text](https://scancode-licensedb.aboutcode.org/occt-exception-1.0.LICENSE)
- CGAL is dual-licensed. The foundation (kernel, support libraries) is LGPL, while most geometric algorithms are GPL; distributing a program using GPL components triggers source disclosure. GeometryFactory sells commercial licenses (prices not public). — [CGAL License](https://www.cgal.org/license.html); [CGAL 6.1 manual](https://doc.cgal.org/6.1/Manual/license.html)
- The following licenses were not re-verified this session and come from the projects' own repositories; check before relying on them: Open3D (MIT) — [GitHub](https://github.com/isl-org/Open3D); PCL (BSD-3-Clause) — [GitHub](https://github.com/PointCloudLibrary/pcl); libigl (MPL-2.0) — [GitHub](https://github.com/libigl/libigl); MeshLab/VCGlib (GPL-3.0) — [GitHub](https://github.com/cnr-isti-vclab/meshlab); FreeCAD (LGPL-2.1+) — [GitHub](https://github.com/FreeCAD/FreeCAD).
- Academic code bases are increasingly released: DTGBrepGen code is on GitHub, CAD-Recode has a repo, and Adam open-sourced CADAM. — [DTGBrepGen arXiv](https://arxiv.org/html/2503.13110v1); [cad-recode repo](https://github.com/jofcodeusal/cad-recode); [Rutab on Adam/CADAM](https://rutab.net/b/hardware/2025/10/31/startap-adam-privlek-41-mln-na-prevraschenie-virusnogo-tekstovogo-3d-redaktora-v-ai-pomoschnika-dlya-inzhenerov.html)
- CAD-Recode builds on Qwen2-1.5B and outputs CadQuery code. CadQuery itself sits on OCCT, which provides a fully open B-rep kernel path from AI output to STEP. — [cad-recode repo](https://github.com/jofcodeusal/cad-recode)
- New datasets carry restrictive licenses. For example, one 2026 dataset paper's arXiv HTML is marked CC BY-NC-SA 4.0 (license of the paper page; the dataset license itself needs checking). — [arXiv 2603.12605 HTML](https://arxiv.org/html/2603.12605v1)

### Inferences
- A practical OSS stack for a commercial MVP: OCCT (B-rep/STEP), Open3D/PCL (point-cloud processing, RANSAC), libigl (mesh ops), CadQuery (programmatic CAD), and CAD-Recode/cadrille-style models as research baselines. CGAL's GPL algorithms (e.g., advanced surface reconstruction, shape detection) need either a commercial license or substitution.
- Dataset licensing (ABC is derived from Onshape public models; many new datasets are NC-licensed) is a real legal risk for commercial model training. This argues for synthetic procedural data, which CAD-Recode and Backflip both use, plus customer-licensed real scans.
- Parasolid and ACIS (commercial kernels) are what incumbents use for robust B-rep. OCCT robustness on complex freeform sewing/filleting is a known weak point (inference, not sourced here) and a potential reason to license a commercial kernel later.

### Gaps
- Licenses for Open3D, PCL, libigl, MeshLab and FreeCAD were not re-verified this session. CGAL and OCCT commercial license prices are not public.
- ABC dataset license terms for commercial model training were not reviewed. Licenses of the CAD-Recode/cadrille weights and code were not checked.

---

## 7. Where are the biggest gaps a small team could exploit?

### Takeaway
The best-evidenced gaps:
- (a) AI for the hard 60% of RE that Backflip and academic models skip: hybrid prismatic/freeform parts, design-intent constraints, and tolerance-verified output with deviation reports;
- (b) a browser/cloud-native mechanical RE workbench, since incumbents are Windows-desktop and web tools are AEC- or visualization-focused;
- (c) narrow, host-agnostic plugins and connectors (Onshape/Fusion first) that bring scan data and AI-assisted fitting into CAD without competing head-on with the platform owner;
- (d) real scan ↔ CAD paired data as a moat.

Head-on general-purpose "mesh → feature tree" foundation-model work now faces a $30M funded leader and incumbents' internal efforts.

### Cited Findings
- Backflip's coverage is "moderate-complexity 3-axis CNC milled and turned parts," with no published accuracy benchmarks, and even simple parts showed failures in independent testing. — [Develop3D](https://develop3d.com/ai/backflip-ai-reverse-engineering/); [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Academic SOTA (CAD-Recode, cadrille) is trained on synthetic procedural data and evaluated with geometric-similarity metrics, with CC3D as the main real-scan test. — [CAD-Recode ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/papers/Rukhovich_CAD-Recode_Reverse_Engineering_CAD_Code_from_Point_Clouds_ICCV_2025_paper.pdf); [cadrille](https://arxiv.org/abs/2505.22914)
- Topological validity remains a core failure: Point2CAD-based pipelines often yield B-reps that "cannot be imported into CAD software." — [HoLa](https://arxiv.org/pdf/2504.14257)
- A2Z (CVPR 2026) targets co-edge and corner detection "from 3D scans" as "a key downstream task in CAD reverse engineering," evidence that research is only now producing scan-centric RE training data, and it is not yet released. — [arXiv 2603.12605](https://arxiv.org/abs/2603.12605)
- Incumbent AI is mostly assistants (AURA/LEO, Design Copilot NX, Onshape AI Advisor) and inspection ML (ZEISS ZADD, Hexagon classification); no RE vendor documents an AI feature-tree reconstruction. — [CADimensions](https://resources.cadimensions.com/cadimensions-resources/aura-your-new-personal-design-assistant-in-solidworks-0); [Digital Engineering 24/7](https://www.digitalengineering247.com/article/siemens-brings-ai-copilot-immersive-design-to-nx); [Onshape blog](https://www.onshape.com/en/blog/ai-advisor-artificial-intelligence-cad-engineering-software); [ZEISS](https://www.zeiss.com/metrology/en/about-us/newsroom/2025/software-release.html); [Hexagon What's New](https://hexagon.com/products/geomagic-design-x/whats-new)
- Gaussian splatting is not metrology-grade (ISPRS 2026; CADSplat lists metrology-grade measurement as future work). — [ISPRS](https://isprs-annals.copernicus.org/articles/XI-M-1-2026/31/2026/isprs-annals-XI-M-1-2026-31-2026.pdf); [CADSplat](https://arxiv.org/pdf/2609.18473)
- Plugin gatekeeping risk: Dassault reportedly declined Backflip's SOLIDWORKS plugin. — [Engineering.com](https://www.engineering.com/backflips-back-is-the-mesh-to-cad-ai-real-this-time/)
- Low-price indie AI mesh-to-STEP exists at $2/part for prismatic parts, signaling commoditization of the simplest segment. — [parameshai.com](https://parameshai.com/)
- Reality-capture-to-CAD AI is fundable at Series A scale in AEC ($34M, Mach9) and mechanical ($30M, Backflip). — [TechCrunch](https://techcrunch.com/2026/10/21/mach9-raises-34m-after-pivoting-to-ai-cad-software/); [VoxelMatters](https://www.voxelmatters.com/backflip-ai-launches-cad-copilot-that-turns-3d-scans-into-editable-models/)

### Inferences (opinion / strategy, not fact)
- **Direction 1 (AI models), best wedge:** "AI-assisted RE" rather than "AI-automatic RE." Candidates:
  - ML auto-segmentation of scan meshes into regions (plane, cylinder, freeform, fillet) with confidence;
  - design-intent inference (symmetry, coaxiality, standard sizes, draft);
  - a verifier that outputs deviation maps and tolerance pass/fail;
  - a feature-tree planner on top of deterministic fitting.

  This builds on Geomagic-style domain knowledge and is closer to production quality now than end-to-end generation. A vertical focus (sheet metal, castings, automotive aftermarket, legacy spare parts for MRO/defense, dental/medical) avoids Backflip's general prismatic-CNC lane.
- **Direction 2 (lightweight rendering/processing):** Clearest technical white space, with a WebGPU/WASM mechanical RE workbench as the candidate. Risks: incumbents (Hexagon) could port, and AEC platforms (Cintoo, GeoCloud) show web tech works but have shown no interest in mechanical RE. Monetization could be seat SaaS or per-job credits (Backflip-style $1.5–$10/job is a reference price point).
- **Direction 3 (plugins):** Lowest capital need and fastest revenue, but small TAM per plugin and platform risk. It is best used as distribution for directions 1 or 2: an Onshape/Fusion connector to a cloud RE engine, following Backflip's host-agnostic playbook.
- **Moat:** Proprietary real-scan ↔ native-CAD pairs (with feature trees), gathered through scanner OEM, service bureau or customer partnerships, plus evaluation benchmarks in engineering tolerances. Public datasets are synthetic, NC-licensed or unreleased.

### Gaps
- No customer-demand or willingness-to-pay data (out of scope; other researchers cover it).
- No evidence on how often real RE jobs are prismatic vs freeform vs hybrid, which is needed to size the "hard 60%" (the percentage is an illustrative inference, not a sourced figure).
- No data on whether Hexagon plans browser-based Geomagic or AI features; no data on Backflip's roadmap for freeform/surfacing.
