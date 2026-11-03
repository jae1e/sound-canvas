# Simulation Software and Physics-AI M&A, Strategic Priorities, and Startup Landscape (2019 to Nov 2026)

*Research notes, compiled 2026-11-03. Method note: this session's shared web-search budget ran out after 2 searches. Everything below therefore comes from direct fetches of primary pages (press releases, SEC filings, company newsrooms, product pages), Wikipedia acquisition tables (secondary, but they cite primaries), and the NASA CFD Vision 2030 report. Many well-known deals could not be re-verified this session. They are listed under "Gaps" as unverified leads, clearly marked as coming from prior knowledge, and should not be cited as fact without checking. "n/d" means not disclosed or not found. All dates are announcement or close dates as stated by the source.*

---

## 1. Small/early acquisitions by simulation incumbents (meshing/geometry, solvers/GPU, physics-AI/ROM, optimization, digital twins, sensor/scenario sim, data management)

### Takeaway
Simulation incumbents have done two kinds of deals. The first is a few very large platform consolidations: Ansys to Synopsys (~$35B), Altair to Siemens ($10.6B), BETA CAE to Cadence ($1.24B), Hexagon D&E/MSC to Cadence (EUR 2.7B), and ESI to Keysight (~$1B). The second is a long tail of undisclosed-price tuck-ins, most of them domain solvers or niche tools. Cadence's 2026 filings show this tail continuing: three unnamed 2026 deals totaling $83.8M in cash, with goodwill "mainly attributed to assembled workforce."

The *pure physics-AI* startups that have sold so far (Monolith, Emmi AI) went to horizontal AI players (CoreWeave, Mistral), not to CAE incumbents. CAE incumbents instead built their own AI products (e.g., Ansys SimAI) and made minority investments (Siemens in PhysicsX).

### Cited Findings

**Mega/platform deals (context for valuation ceilings)**
- **Synopsys to Ansys:** definitive agreement announced Jan 16, 2024, at "approximately $35 billion," closed Jul 17, 2025. The FTC required divestiture of Synopsys optical/photonic tools and Ansys PowerArtist. Synopsys also sold ARC/ARC-V processor IP to GlobalFoundries (Jan 2026). — [Wikipedia: Synopsys](https://en.wikipedia.org/wiki/Synopsys); [Wikipedia: Ansys](https://en.wikipedia.org/wiki/Ansys)
- **Siemens to Altair:** agreement announced Oct 30, 2024, at $10.6B, finalized March 2025. — [Wikipedia: Altair Engineering](https://en.wikipedia.org/wiki/Altair_Engineering); [Wikipedia: Siemens DISW](https://en.wikipedia.org/wiki/Siemens_Digital_Industries_Software)
- **Cadence to BETA CAE Systems** (ANSA/META pre/post-processing): $1.24B, closed June 2024. — [Wikipedia: Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems)
- **Cadence to Hexagon Design & Engineering (MSC Software: Nastran, Adams)**
  - Announced Sep 4, 2025, at EUR 2.7B, 70% cash / 30% stock. Closed Feb 23, 2026. — [Wikipedia: Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems); [Cadence 10-Q Q3 FY2026](https://www.sec.gov/Archives/edgar/data/0000813672/000081367226000121/cdns-20260930.htm)
  - Total purchase consideration $3,123.9M: $2.2B cash plus 3.2M Cadence shares valued at $902.2M. Goodwill $2,170.2M. Acquired intangibles $1,248.0M, of which existing technology is $723.0M (7.9-yr life) and agreements/relationships $507.0M. — [Cadence 10-Q Q3 FY2026](https://www.sec.gov/Archives/edgar/data/0000813672/000081367226000121/cdns-20260930.htm)
  - Cadence expects the business to add ~$160M to 2026 revenue, with ~$0.28 non-GAAP EPS dilution in 2026 and accretion in 2027. — [Digital Engineering 24/7, Feb 24, 2026](https://www.digitalengineering247.com/article/cadence-finalizes-purchase-of-hexagons-design-and-engineering-business/hexagon)
- **Keysight to ESI Group (France)** for about $1B (2023). Keysight also bought Synopsys Optical Solutions Group (2025), PowerArtist from Ansys (2025), and Scalable Network Technologies (2021, network simulation and digital twin). — [Wikipedia: Keysight](https://en.wikipedia.org/wiki/Keysight)

**Mid-size and small tuck-ins by acquirer (prices mostly undisclosed; team size and revenue mostly n/d)**

| Date | Acquirer | Target (country) | Category | Disclosed terms | Notes / post-deal fate | Source |
|---|---|---|---|---|---|---|
| 2019 | Ansys | Dynardo | Optimization / PIDO / ROM (optiSLang) | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2019 | Ansys | LSTC (LS-DYNA) | Explicit FEA solver | $775M | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2019 | Ansys | Granta Design, Helic, DfR Solutions | Materials data, EM crosstalk, electronics reliability | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2020 | Ansys | Lumerical; Nuhertz | Photonic sim; filter synthesis | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2020 | Ansys | Analytical Graphics (AGI) | Mission/aerospace sim, digital mission engineering | $700M | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2021 | Ansys | Phoenix Integration | MBSE / ModelCenter | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2021 | Ansys | Zemax | Optical design | $411M in the table; prose says undisclosed (conflict) | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2022 | Ansys | OnScale | Cloud simulation | n/d | Described as "web-based UI for access to Ansys' simulation technologies" | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2022 | Ansys | Motor Design Ltd (UK); C&R Technologies | E-machine design; orbital thermal | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2023 | Ansys | DYNAmore (Germany); Diakopto | LS-DYNA distributor/services; IC parasitics | n/d | | [Wiki Ansys](https://en.wikipedia.org/wiki/Ansys) |
| 2018 | Altair | SimSolid (Canada) | Meshless structural analysis (removes geometry-prep/meshing step) | n/d | Became a core Altair product, now owned by Siemens | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2018 | Altair | FluiDyna | GPU-based CFD | n/d | Wikipedia lists the location as "Madrid, Spain," which looks doubtful (prior knowledge: German company); verify | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2018 | Altair | TES International (US) | CFD | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2019 | Altair | **Polliwog Co. (Seoul, Korea)** | EDA / EM | n/d | Korean precedent | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2019 | Altair | DEM Solutions (UK); newFASANT (Spain); SEAM (US) | DEM particle sim; high-frequency EM; NVH | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2020 | Altair | **S&Wise Co. (Seoul, Korea)** | Polyurethane foam process sim | n/d | Second Korean precedent | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2020 | Altair | Univa, Ellexus, M-Base, WRAP | HPC workload, I/O, materials DB, spectrum | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2021 | Altair | GE Aviation Flow Simulator; S-FRAME (Canada); World Programming (UK) | Flow network sim; structural; analytics | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2022 | Altair | Powersim; Gen3D (UK); Concept Engineering (DE); RapidMiner (DE); Cassini (IN) | Power electronics sim; AM design; visualization; data science/AI | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2023 | Altair | OmniV (UK); OmniQuest (US, Oct 2023) | Digital engineering; optimization (GENESIS) | n/d | | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2024 | Altair | Research in Flight (US); Cambridge Semantics (US); Metrics Design Automation (CA); KSK Analytics (JP) | Fast CFD (FlightStream); knowledge graph; semiconductor sim-as-a-service; AI consulting | n/d | Last pre-Siemens tuck-ins | [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering) |
| 2019 | Cadence | AWR Corp | RF/microwave design | $160M | | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2020 | Cadence | Integrand Software | Method-of-moments EM solver | n/d | | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2021 | Cadence | **Pointwise (US)** | CFD mesh generation | n/d | Rebranded "Fidelity Pointwise" | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2021 | Cadence | NUMECA (Belgium) | CFD, meshing, multiphysics, optimization | n/d | Became the core of the Fidelity CFD line | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2022 | Cadence | Future Facilities (UK) | Electronics cooling / data-center digital twin CFD | n/d | | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2022 | Cadence | OpenEye Scientific (US) | Molecular modeling | $500M (closed Sep 2022) | | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| n/d | Cadence | Cascade Technologies | LES CFD | n/d | Named in Wikipedia without date or price | [Wiki Cadence](https://en.wikipedia.org/wiki/Cadence_Design_Systems) |
| 2026 (Q1–Q3) | Cadence | **3 unnamed businesses** | n/d | **$83.8M aggregate cash** (net of cash acquired); intangibles $42.4M; goodwill $48.6M "mainly attributed to assembled workforce"; escrow to former shareholders through Q1 2030 expensed as compensation | Average ~$28M per deal (estimate). The workforce-heavy goodwill points to acqui-hires/tech tuck-ins | [Cadence 10-Q Q3 FY2026](https://www.sec.gov/Archives/edgar/data/0000813672/000081367226000121/cdns-20260930.htm) |
| 2017 | Hexagon | MSC Software (US) | CAE | $834M | Sold to Cadence 2026 as part of D&E | [Wiki Hexagon](https://en.wikipedia.org/wiki/Hexagon_AB) |
| 2017 | Hexagon | VIRES (Germany) | Driving simulation (VTD) | n/d | Post-2026 home (Cadence or Hexagon) not confirmed | [Wiki Hexagon](https://en.wikipedia.org/wiki/Hexagon_AB) |
| 2019 | Hexagon | Volume Graphics (Germany) | CT data analysis (relevant to as-built sim) | n/d | | [Wiki Hexagon](https://en.wikipedia.org/wiki/Hexagon_AB) |
| 2020 | Hexagon | Romax (UK); CAEfatigue (UK) | Drivetrain sim; fatigue | n/d | | [Wiki Hexagon](https://en.wikipedia.org/wiki/Hexagon_AB) |
| 2021 | Hexagon | CADLM (France) | ML / reduced-order models (ODYSSEE) | n/d | Wikipedia says 2021; check against the Hexagon release | [Wiki Hexagon](https://en.wikipedia.org/wiki/Hexagon_AB) |
| 2019 | Dassault | Argosim | n/d in source | n/d | | [Wiki Dassault](https://en.wikipedia.org/wiki/Dassault_Syst%C3%A8mes) |
| 2020 | Dassault | Proxem; NuoDB | NLP; distributed DB | n/d | | [Wiki Dassault](https://en.wikipedia.org/wiki/Dassault_Syst%C3%A8mes) |
| 2022 | Dassault | Diota | n/d in source | n/d | | [Wiki Dassault](https://en.wikipedia.org/wiki/Dassault_Syst%C3%A8mes) |
| 2022 | Siemens DISW | Avery Design Systems | Verification IP | n/d | | [Wiki Siemens DISW](https://en.wikipedia.org/wiki/Siemens_Digital_Industries_Software) |
| 2020 | dSPACE | Intempora (France) | Sensor data management (IVS) | n/d | | [Wiki dSPACE](https://en.wikipedia.org/wiki/DSPACE_GmbH) |
| Mar 2022 | Applied Intuition | Mechanical Simulation Corp. (US, founded 1996) | Vehicle dynamics (CarSim, TruckSim, BikeSim, SuspensionSim) | n/d | Product line still shipping; "All-New VehicleSim" released Jul 10, 2026 | [carsim.com](https://www.carsim.com/) |
| Feb 6, 2025 | Applied Intuition | EpiSci (US, founded 2012) | Defense tactical autonomy AI | n/d | Whole team joined; now a wholly owned subsidiary. Rationale: add tactical AI to Applied's "simulation, validation, and data management products" | [Applied Intuition](https://www.appliedintuition.com/news/applied-intuition-acquires-episci) |
| Oct 6, 2025 (announced) | CoreWeave | Monolith AI (UK) | Physics-AI from test data (anomaly detection, test-plan optimization, next-test recommendation) | n/d (Rothschild and Davis Polk advised CoreWeave) | Customers named: Nissan, BMW, Honeywell. Closing not confirmed in sources found | [CoreWeave PR](https://coreweave.com/news/coreweave-to-acquire-monolith-expanding-ai-cloud-platform-into-industrial-innovation) |
| May 19, 2026 | Mistral AI | **Emmi AI (Linz, Austria)** | Physics-AI neural surrogates (AB-UPT scaled to 100M+ mesh cells; NeuralDEM; NeuralMould; Noether framework) | n/d | >30 researchers/engineers (AT, DE, LT). Team joins Mistral Science & Applied AI; Linz becomes a Mistral office. Prior funding: EUR 15M seed (Apr 2025) | [Emmi AI](https://www.emmi.ai/news/mistral-ai-acquires-emmi-ai); [Emmi news](https://www.emmi.ai/news) |

**Other relevant ownership facts**
- Simpleware (CT/micro-CT image to segmentation to FEA/CFD volume mesh and NURBS CAD) now redirects from synopsys.com to ansys.synopsys.com and is branded "Ansys Simpleware." — [Ansys Simpleware page](https://ansys.synopsys.com/products/structures/ansys-simpleware)
- CADfix (CAD translation, repair, healing, defeaturing for CAE; includes a meshing variant) is sold by "ITI, a Wipro Company." — [ITI CADfix](https://www.iti-global.com/cadfix)
- BETA CAE's ANSA site states "BETA is now part of Cadence." — [BETA CAE ANSA](https://www.beta-cae.com/ansa.htm)
- After selling D&E, Hexagon is focusing on precision measurement, positioning, and robotics. The Octave software spinout (including Bricsys) is planned for H1 2026. — [Schnitger Corp, Feb 23, 2026](https://schnitgercorp.com/2026/02/23/hexagon-and-cadence-complete-transfer-of-design-engineering-business/)

### Inferences
- **Price bands (estimates from disclosed data points):**
  - Tech or acqui-hire tuck-ins: ~$10–50M (Cadence 2026 average ~$28M).
  - Established niche products with revenue: ~$160–800M (AWR $160M, Zemax $411M, OpenEye $500M, AGI $700M, LSTC $775M).
  - Category-defining pre/post or solver franchises: $1B+ (BETA CAE $1.24B, ESI ~$1B, Hexagon D&E ~$3.1B).
- **Hexagon D&E multiple (rough estimate):** the ~$160M 2026 contribution covers ~10 months post-close, which annualizes to ~$190M and implies ~16x revenue. Purchase-accounting and deferred-revenue effects may depress the post-close revenue, so treat this only as a rough ceiling indicator.
- **Meshing/geometry precedents:** Pointwise (2021) and BETA CAE (2024) to Cadence; SimSolid (2018) to Altair; SpaceClaim (pre-window) to Ansys. Every major incumbent now owns a geometry/meshing franchise. The open question is *AI automation* of these tools, not ownership of a mesher.
- **Korea precedent:** Altair bought two small Seoul companies (Polliwog 2019, S&Wise 2020). Both are now inside Siemens, which shows that global CAE vendors do buy small Korean simulation teams.
- **New buyer class:** horizontal AI and cloud companies (CoreWeave, Mistral) are buying physics-AI teams to get an "industrial AI" story. Physics-AI teams therefore have buyers beyond CAE incumbents. CAE incumbents tend to build in-house (SimAI, Altair's physicsAI) or invest.

### Gaps
- Team size, revenue, founding year, funding, and price for almost all tuck-ins are not disclosed or were not retrievable. The three 2026 Cadence deals are unnamed in the 10-Q.
- Whether CoreWeave–Monolith has closed was not confirmed.
- Whether VIRES/VTD and Volume Graphics went to Cadence with D&E or stayed with Hexagon was not confirmed. My inference is that Volume Graphics stayed with Hexagon's measurement business, but this is unverified.
- **Unverified leads from prior knowledge** (not verified this session; check before use):
  - Siemens: Dotmatics (~$5.1B, 2025), Excellicon (2025), Canopus AI (2025), and ZONA Technology (aeroelastic).
  - NVIDIA: DeepMap (2021, HD maps for AV) and Gretel (synthetic data, ~Mar 2025, reported nine-figure price).
  - Dassault: Distene/MeshGems meshing (~2017), now part of Spatial.
  - Tech Soft 3D: Ceetron (simulation visualization/components, ~2021).
  - Simpleware: originally bought by Synopsys in 2016.
  - Cadence: Cascade Technologies (~2023).
  - Hexagon/MSC: Software Cradle (pre-2019).
  - Applied Intuition: SceneBox (ML data management, ~2022) and Embark Trucks' technology (~2023, reported ~$71M).
  - MathWorks: VectorZero/RoadRunner (~2020).
  - AB Dynamics: rFpro (~2019) and Ansible Motion (~2023).
  - Stellantis: aiMotive (Dec 2022).
  - Bosch: Five AI (2022).
  - Waymo: Latent Logic (2019).
  - DeepMind: MuJoCo (Oct 2021).
  - Intrinsic: Open Source Robotics Corp. (2022).
  - Meta: AI.Reverie (2021).
  - Ford: Quantum Signal (2019).

---

## 2. Physics-AI and simulation-AI startups 2022–2026

### Takeaway
Physics-AI has become a well-funded category with clear leaders:
- PhysicsX: $300M Series C at ~$2.4B (Jun 2026), >300 staff
- Neural Concept: $100M (Jan 2026)
- Luminary: $72M Series B (Sep 2025)

Incumbents and NVIDIA are strategic investors and partners in this category. Siemens, NVIDIA, and Applied Materials hold stakes in PhysicsX. The smaller, research-heavy teams (Emmi AI, ~30 people; Monolith) are the ones that have been acquired.

### Cited Findings
- **PhysicsX (London; founders ex-Renault/Alpine F1 and Mercedes F1, and QuantumBlack)**
  - Funding: $32M (Nov 27, 2023); $135M Series B led by Atomico (Jun 22, 2025), bringing the total to "nearly $170M", with Temasek, Siemens, Applied Materials, July Fund, General Catalyst, NGP and others; Series B extension (Nov 19, 2025). — [PhysicsX Series B](https://www.physicsx.ai/newsroom/physicsx-raises-135m-series-b-to-usher-in-a-new-era-of-ai-native-engineering-and-manufacturing); [PhysicsX newsroom](https://www.physicsx.ai/newsroom)
  - Series B traction: >150 staff; revenue "more than quadrupled over the last two years." — [PhysicsX Series B](https://www.physicsx.ai/newsroom/physicsx-raises-135m-series-b-to-usher-in-a-new-era-of-ai-native-engineering-and-manufacturing)
  - **Series C (Jun 8, 2026):** $300M at ~$2.4B, led by Temasek. Existing investors include Applied Materials, NVIDIA, and Siemens. Recognized revenue 2x YoY, booked revenue 3x, customer count more than doubled, headcount >300. Use of funds includes larger pre-trained "Large Physics Models." — [PhysicsX Series C](https://www.physicsx.ai/newsroom/physicsx-announces-300m-series-c-to-accelerate-physics-ai-for-industrial-engineering)
  - Partnerships: Siemens (AI deep physics, Dec 2024; Simcenter X integration, Jul 23, 2025; data-center power with NVIDIA, Mar 2026); Microsoft Discovery (May 2025); Deutsche Telekom (Nov 2025); CoreWeave (Mar 2026); NVIDIA open standards for physics AI (Mar 16, 2026).
  - Products and expansion: LGM-Aero and Ai.rplane (Dec 2024); PX-Car-Aero-v1 (Aug 7, 2026); Singapore APAC hub (Oct 8, 2026). — [PhysicsX newsroom](https://www.physicsx.ai/newsroom)
- **Neural Concept (Switzerland)**
  - Funding: $9.1M Series A (Jun 2022); $27M Series B (Jun 2024); $100M round led by Goldman Sachs Alternatives (Jan 2026).
  - Partnerships: Siemens collaboration (Jul 2024); NVIDIA accelerated computing (Jun 2024) and Omniverse Blueprint (Nov 2024); Rescale (Mar 2024); Japan distribution via Cybernet and SCSK.
  - Customers: Airbus, Plastic Omnium/OPmobility, General Motors (Jun 2025). "10 U.S. OEMs adopted the platform" (Nov 2024). No acquisitions found. — [Neural Concept press releases](https://www.neuralconcept.com/press-releases)
- **Luminary Cloud** (site now luminary.ai)
  - Funding: $72M Series B (Sep 15, 2025).
  - Partnerships and products: NVIDIA Omniverse Blueprint for real-time CAE digital twins (Nov 18, 2024); open-source SUV aero model with Honda and NVIDIA (Apr 2025); SHIFT-Wing with Otto Aviation (Jul 2025); Northrop Grumman physics-AI model (Oct 2025); defense-focused models (Jan 2026); Luminary Private Cloud for air-gapped defense (Feb 2026); SHIFT-Crash full-vehicle crash prediction (Apr 14, 2026); adoption of NVIDIA GeoTransolver (Mar 2026).
  - Customers: Northrop Grumman, Joby, Otto, Rune Aero. — [Luminary news](https://luminary.ai/news)
- **Emmi AI (Linz)**
  - EUR 15M seed (Apr 25, 2025) from 3VC, Speedinvest, Serena, and PUSH, described as the largest Austrian seed round.
  - Technology: AB-UPT neural surrogates scaled to 100M+ mesh cells (Jun 2025), benchmarked on Luminary's SHIFT datasets (Oct 2025); NeuralDEM open source (Sep 2025); Noether framework open source (Jan 2026); NeuralMould (Feb 2026).
  - Acquired by Mistral AI (May 19, 2026). — [Emmi AI news](https://www.emmi.ai/news); [Emmi homepage](https://www.emmi.ai/)
- **Monolith AI (UK):** test-data-driven ML for engineering; customers Nissan, BMW, Honeywell; Gartner Cool Vendor. CoreWeave agreed to acquire it on Oct 6, 2025. — [CoreWeave PR](https://coreweave.com/news/coreweave-to-acquire-monolith-expanding-ai-cloud-platform-into-industrial-innovation)
- **Rescale (founded 2011):** >$200M raised and >$1B valuation by 2022. Investors include NVIDIA, M12, Hitachi, and Samsung. — [Wikipedia: Rescale](https://en.wikipedia.org/wiki/Rescale)
- **SimScale (founded 2012, Munich/TU Munich founders):** positions itself as "engineering AI & simulation," with GNN-based physics-AI surrogates; 600,000 registered users (Sep 2024). — [Wikipedia: SimScale](https://en.wikipedia.org/wiki/SimScale). It released a PhysicsNeMo-based foundation model for centrifugal pumps. — [NVIDIA PhysicsNeMo](https://developer.nvidia.com/physicsnemo)
- **Incumbent in-house physics-AI:** Ansys SimAI trains on legacy simulation data from "any simulation vendor." It claims 10–100x design-cycle reduction and "mesh independent results," and says it "does not require simulation expertise." Geometry "too far from the training data may require retraining." SimAI Pro and Premium launched in 2026 R1 (Mar 2026). — [Ansys SimAI](https://ansys.synopsys.com/products/simai)
- **NVIDIA PhysicsNeMo** (open source, Apache 2.0; FNO, GNN, point-cloud, diffusion, PINN models; DoMINO powers an External Aerodynamics NIM)
  - Adopters named: Ansys (SeaScape, Nov 2024), Luminary, nTop, Siemens Energy (claims a 10,000x speedup), and SimScale.
  - Ansys, Altair, Cadence, Siemens, and Synopsys are named as adopting Blackwell for CAE. — [NVIDIA PhysicsNeMo](https://developer.nvidia.com/physicsnemo)

### Inferences
- **Do not compete as another general physics-AI platform.** The scale leaders are already capitalized at a $1–2.4B tier, and the incumbents have shipped their own surrogates. An acquirable small company is more likely a *component* those platforms lack.
- **The likely missing component is the data/geometry layer.** Physics-AI products consume geometry as meshes, point clouds, or SDFs, and they degrade out of distribution (SimAI's own retraining caveat). Emmi's value was partly scaling surrogates to 100M+ cell meshes, which shows that mesh/geometry handling is the hard part.
- **Strategic investors are the likely acquirers.** Siemens, NVIDIA, and Applied Materials sit on the PhysicsX cap table, and the partnerships (Siemens–PhysicsX, Siemens–Neural Concept, NVIDIA–Luminary) are the typical pre-acquisition relationship pattern.

### Gaps
- Not covered due to search budget: Navier AI, Beyond Math, Inductiva, Vizcom, Flexcompute, nTop, Synera, and Rescale/SimScale 2023–2026 rounds and ownership. No funding figures are given here for these.
- Neural Concept and Luminary valuations were not disclosed in the pages retrieved.

---

## 3. Stated strategic priorities of acquirers (2024–2026)

### Takeaway
Across Cadence, Synopsys/Ansys, Siemens, and NVIDIA, the stated priorities converge on four things:
1. "Physical AI" and AI-accelerated simulation.
2. GPU acceleration (CUDA, Blackwell).
3. Digital twins via Omniverse/Cosmos.
4. Democratization: AI usable by non-specialists.

Cadence explicitly says it wants simulation to "generate physics-based data … to train and validate AI models." No primary statements on "simulation-ready geometry" or as-built simulation were found this session.

### Cited Findings
- **Cadence (Feb 2026)**
  - CEO Anirudh Devgan called the MSC deal "a major milestone in advancing our vision for intelligent system design," aimed at autonomous systems, robotics, and transportation.
  - Plans: one end-to-end multiphysics platform (electronics, CFD, BETA CAE pre/post, MSC structural/multibody), and generating "physics-based data that customers can use to train and validate AI models." The deal is framed as positioning for the "physical AI era." — [Digital Engineering 24/7](https://www.digitalengineering247.com/article/cadence-finalizes-purchase-of-hexagons-design-and-engineering-business/hexagon)
  - The SD&A (system design & analysis) segment rose to 16% of revenue in Q3 FY2026 from 15% a year earlier. — [Cadence 10-Q Q3 FY2026](https://www.sec.gov/Archives/edgar/data/0000813672/000081367226000121/cdns-20260930.htm)
- **Synopsys + NVIDIA (Dec 1, 2025)**
  - NVIDIA invested $2B in Synopsys common stock at $414.79/share.
  - Scope: CUDA-X and "AI physics" acceleration of simulation, including EM, optical, and molecular; Synopsys AgentEngineer agentic AI integrated with NVIDIA NIM, NeMo, and Nemotron; virtual design and test with Omniverse and Cosmos across semis, robotics, aerospace, and automotive; and an existing agreement to embed Omniverse in Synopsys simulation products.
  - Sassine Ghazi: "AI-powered, holistic system design." — [NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-and-synopsys-announce-strategic-partnership-to-revolutionize-engineering-and-design)
- **Siemens**
  - CTO/CSO Peter Koerte on investing in PhysicsX: "aligns perfectly with Siemens' vision of trustworthy, industrial-grade AI." — [PhysicsX Series B](https://www.physicsx.ai/newsroom/physicsx-raises-135m-series-b-to-usher-in-a-new-era-of-ai-native-engineering-and-manufacturing)
  - Siemens integrated PhysicsX into Simcenter X (Jul 2025). — [PhysicsX newsroom](https://www.physicsx.ai/newsroom)
- **Ansys (Synopsys):** SimAI is positioned for design engineers and project managers to "evaluate designs without relying on simulation experts", i.e., democratization. — [Ansys SimAI](https://ansys.synopsys.com/products/simai)
- **NVIDIA:** Omniverse Blueprint for real-time CAE digital twins; major CAE ISVs adopting Blackwell. — [NVIDIA PhysicsNeMo](https://developer.nvidia.com/physicsnemo). NVIDIA also promotes the Newton physics engine (with DeepMind and Disney Research, GTC 2025) and Cosmos world models. — [Wikipedia: Nvidia](https://en.wikipedia.org/wiki/Nvidia)
- **Hexagon:** exited design and engineering software to focus on measurement, positioning, and robotics. — [Schnitger Corp](https://schnitgercorp.com/2026/02/23/hexagon-and-cadence-complete-transfer-of-design-engineering-business/)
- **Horizontal AI entrants**
  - Mistral says Emmi "cements Mistral AI's leadership in industrial AI." The target is an AI stack for "real-time simulation, digital twins and faster R&D." — [Emmi AI](https://www.emmi.ai/news/mistral-ai-acquires-emmi-ai)
  - CoreWeave says Monolith "has closed that gap" in industrial innovation. — [CoreWeave PR](https://coreweave.com/news/coreweave-to-acquire-monolith-expanding-ai-cloud-platform-into-industrial-innovation)
- **As-built / as-manufactured signals:** Ansys Simpleware markets "High-Value Part Inspection" (defect inspection plus simulation-driven assessment), automated CT inspection of turbine blades, fiber orientation from micro-CT of manufactured parts, and FE meshes of additively manufactured grain structures. The page does not use the term "as-built simulation" and makes no AI-segmentation claim. — [Ansys Simpleware](https://ansys.synopsys.com/products/structures/ansys-simpleware)

### Inferences
- **"Generate physics-based data to train AI"** (Cadence) and **"AI physics"** (Synopsys/NVIDIA) imply strong demand for automated, high-throughput *simulation set-up*: geometry to mesh to run. Training-data generation multiplies the number of simulations per program, so the manual geometry/mesh bottleneck becomes the scaling limit.
- **As-built simulation exists as a niche feature** (Simpleware, and Hexagon's Volume Graphics, which was not checked this session) but is not a headline strategic theme. That fits an "acquire a capability" opportunity rather than a "compete with a platform" one.

### Gaps
- Dassault Systèmes 2025–2026 statements (3D UNIV+RSES, generative/virtual twins, SIMULIA AI), Siemens Capital Markets Day / Altair integration remarks, Synopsys post-close Ansys revenue and integration statements, Keysight's ESI strategy, and Autodesk simulation were not retrieved. No primary quotes on "simulation-ready geometry automation" or OpenUSD from CAE executives were obtained.

---

## 4. Publicly acknowledged pain points in the simulation workflow

### Takeaway
The best primary source retrieved is NASA's CFD Vision 2030 report (2014). It identifies geometry preprocessing and mesh generation as the "principal bottleneck" and "dominant cost in terms of human intervention." It also names the specific causes: CAD that is not watertight or is overly detailed, which requires shrink-wrapping and defeaturing. Vendors still market reductions in exactly these steps. The commonly cited "~70–80% of analyst time on geometry/meshing" figure was **not** verified this session.

### Cited Findings
- **NASA CFD Vision 2030 (NASA/CR-2014-218178, Mar 2014)** — [NASA NTRS](https://ntrs.nasa.gov/citations/20140003093); [PDF](https://ntrs.nasa.gov/api/citations/20140003093/downloads/20140003093.pdf)
  - "Mesh generation and adaptivity continue to be significant bottlenecks in the CFD workflow"
  - "Current CFD workflows are often paced by the geometry preprocessing and grid generation phases, which are significant bottlenecks."
  - "Today, the generation of suitable meshes for CFD simulations about complex configurations constitutes a principal bottleneck in the simulation workflow process. Often the mesh generation phase constitutes the dominant cost in terms of human intervention…"
  - "Significant human intervention is often required in the mesh generation process due to lack of robustness … inability of current mesh generation software to consistently produce valid high-quality meshes … on the first attempt."
  - "many existing CAD geometry definitions are poorly suited for CFD analyses, either due to insufficient accuracy (non water-tight geometries often adequate for manufacturing purposes), or due to excessive detail … This results in the need to incorporate specialized post-processing tools such as shrink-wrapping … and/or de-featuring techniques"
  - The vision: "the mesh generation process should be invisible to the CFD user or engineer."
- **Ansys SpaceClaim** claims to reduce model pre-processing "from weeks or days to hours or minutes" and simplification to "minutes instead of hours." Features include defeaturing, fluid-domain extraction, STL-to-CAD conversion "regardless of scan integrity," Skin Surface autosurfacing of scans, and repair of gaps and holes. — [Ansys SpaceClaim](https://ansys.synopsys.com/products/3d-design/ansys-spaceclaim)
- **BETA CAE ANSA** markets "significant modeling time reduction," geometry healing, "one-step mesh generation on automatically extracted middle surface," and Batch Meshing. The page mentions no ML/AI features. — [BETA CAE ANSA](https://www.beta-cae.com/ansa.htm)
- **CADfix (ITI/Wipro)** exists as a standalone product for repair, healing, defeaturing, and simplification of CAD for CAE, "to reduce downstream rework." — [ITI CADfix](https://www.iti-global.com/cadfix)
- **The expertise bottleneck is acknowledged in AI positioning.**
  - PhysicsX CEO Jacomo Corbo calls the limited number of design evaluations "the binding constraint on hardware innovation." — [PhysicsX Series C](https://www.physicsx.ai/newsroom/physicsx-announces-300m-series-c-to-accelerate-physics-ai-for-industrial-engineering)
  - Ansys pitches SimAI as not requiring "simulation expertise." — [Ansys SimAI](https://ansys.synopsys.com/products/simai)

### Inferences
- **The NASA-listed impediments are still unsolved product gaps in 2026:** watertightness, defeaturing, CAD-to-mesh linkage, and robustness on the first attempt. Evidence: incumbents still sell rule- or tool-based healing/defeaturing (SpaceClaim, ANSA, CADfix), and ANSA's product page cites no AI.
- **A founder with mesh-processing and scan-to-CAD background addresses this exact bottleneck.** Mesh repair, watertighting, shrink-wrap, and reverse engineering from faceted data are the techniques NASA names.

### Gaps
- No primary, dated source was retrieved for quantitative time-share claims (e.g., the Sandia-attributed ~73% of analyst time on geometry/meshing, or vendor "up to 80%" claims). NAFEMS survey data was not retrieved. Treat these figures as unverified until sourced.

---

## 5. AV/robotics simulation: acquired capabilities, prices, current gaps

### Takeaway
Applied Intuition, now valued at $15B, has assembled its stack partly through acquisitions: vehicle dynamics (Mechanical Simulation, Mar 2022) and defense autonomy (EpiSci, Feb 2025), with undisclosed prices. The industry frontier has moved to **neural reconstruction (Gaussian-based real-to-sim) plus world foundation models**. NVIDIA's own tool list for this frontier exposes the remaining gaps:
- asset extraction from sparse video
- artifact cleanup in novel views
- lighting/appearance harmonization
- controllable scenario variation

### Cited Findings
- **Applied Intuition**
  - Funding: $40M (2019); Series E $250M at $6B (Mar 2024); Series F $600M at $15B (Jun 2025, co-led by BlackRock funds and Kleiner Perkins). — [Wikipedia: Applied Intuition](https://en.wikipedia.org/wiki/Applied_Intuition)
  - Acquisitions: Mechanical Simulation (Mar 2022) — [carsim.com](https://www.carsim.com/); EpiSci (Feb 6, 2025) — [Applied Intuition](https://www.appliedintuition.com/news/applied-intuition-acquires-episci)
  - Product page cites "neural reconstruction and rendering for high-fidelity simulation," world foundation models, and ML behavior agents for "controllable scenario variation." — [Applied Intuition product page](https://www.appliedintuition.com/products/neural-sim)
  - 2026 news: Dana agentic physical-AI platform (Jul 21, 2026); Honda and Nissan partnerships (Oct 6, 2026); U.S. Navy perception deployment (Oct 22, 2026). — [Applied Intuition press](https://www.appliedintuition.com/press)
- **NVIDIA AV simulation stack (2026 page)**
  - Omniverse NuRec "builds 3D Gaussian-based environments from recorded sensor data."
  - Supporting tools: Asset Harvester (extracts 3D assets from sparse video), Fixer (cleans novel-view artifacts), Harmonizer (lighting/appearance).
  - Generation and evaluation: Cosmos world models (open-loop and closed-loop; Cosmos 3 Nano for weather, lighting, and time of day); AlpaSim (agent and trajectory variation); Alpamayo VLA driving models; AlpaGym (closed-loop RL).
  - Stated need: "Physical test drives cannot cover every edge case or rare weather condition." — [NVIDIA AV simulation](https://www.nvidia.com/en-us/use-cases/autonomous-vehicle-simulation/)
- **Parallel Domain:** PD Replica (photorealistic neural reconstructions from drive or flight logs; lidar optional) and PD Sim (deterministic camera, lidar, and radar sim). Partner logos: Zenseact, Toyota, Woven. New CEO Zack Novak. Ownership/acquisition status not stated. — [Parallel Domain](https://paralleldomain.com/)
- **Waabi (Toronto, founded Jan 2021)**
  - Waabi World closed-loop simulator launched 2022.
  - Funding: $83.5M Series A (Jun 2021); $200M Series B (Jun 2024); $1B Series C (Jan 2026: $750M led by Khosla and G2VP, plus $250M from Uber tied to robotaxi deployment).
  - Volvo VNL Autonomous truck with the Waabi Driver (Oct 2025). — [Wikipedia: Waabi](https://en.wikipedia.org/wiki/Waabi)
- **dSPACE:** acquired Intempora (2020, sensor data management); revenue EUR 460M (2024); ~2,900 employees (2025). — [Wikipedia: dSPACE](https://en.wikipedia.org/wiki/DSPACE_GmbH)
- **Cadence** frames MSC/Adams (multibody dynamics) as serving "autonomous systems, robotics, and transportation." — [Digital Engineering 24/7](https://www.digitalengineering247.com/article/cadence-finalizes-purchase-of-hexagons-design-and-engineering-business/hexagon)
- **Synopsys/NVIDIA** plan Omniverse- and Cosmos-based virtual testing for robotics and automotive. — [NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-and-synopsys-announce-strategic-partnership-to-revolutionize-engineering-and-design)

### Inferences
- **Gaussian scenes are not simulation-ready assets.** NVIDIA had to build Asset Harvester, Fixer, and Harmonizer, which suggests that converting reconstructions into editable, physically valid assets is still the bottleneck. Such assets need watertight meshes, collision geometry, materials for sensor models, and relightable appearance.
- **The founder's skills map onto that conversion problem.** Mesh processing and scan-to-CAD (surface extraction, repair, segmentation, parametric fitting) apply directly. A plausible acquirable product is "reconstruction-to-sim-asset": converting splats or point clouds into clean meshes with semantic parts and materials. Potential buyers include Applied Intuition, NVIDIA, dSPACE, AB Dynamics/rFpro, Foretellix, and Cadence (now owning MSC Adams and possibly VTD).
- **AV-sim tuck-in prices are almost never disclosed.** The one data point recalled (Embark tech to Applied, ~$71M) is unverified.

### Gaps
- Not retrieved: Foretellix funding and acquisitions, Cognata status, IPG Automotive ownership changes, AB Dynamics/rFpro deal terms, Ansys AVxcelerate's status under Synopsys, and NVIDIA's AV-related acquisitions (DeepMap 2021 is a prior-knowledge lead). The Wikipedia NVIDIA M&A list page returned 404.
- Robotics-sim startups (Genesis AI, Lightwheel, Duality, Bifrost, Scaled Foundations) were not covered.

---

## 6. Acquirable target profile for simulation acquirers (INFERENCE, not sourced fact)

### Takeaway
*(Inference.)* The most acquirable profile for this founder is a small (roughly 8–40 person) team owning a hard, defensible **geometry/data layer** that incumbents and physics-AI platforms both need. The best-fit product is **automatic "simulation-ready" geometry from CAD and scan/reconstruction data**, with a secondary **as-built (scan/CT-based) simulation** angle. The founder should prove it inside one or two incumbent ecosystems via partnerships and target a tuck-in price band of ~$10–60M rather than a platform play.

### Cited Findings
(Supporting evidence, all cited above.)
- Tuck-in price evidence: Cadence's 2026 small acquisitions total $83.8M for 3 deals, with workforce-driven goodwill — [Cadence 10-Q](https://www.sec.gov/Archives/edgar/data/0000813672/000081367226000121/cdns-20260930.htm).
- Bottleneck evidence: NASA names geometry preprocessing and meshing as the principal human-cost bottleneck, citing watertightness and defeaturing — [NASA CFD 2030](https://ntrs.nasa.gov/citations/20140003093).
- Data-generation demand: Cadence wants physics-based data to train AI — [DE247](https://www.digitalengineering247.com/article/cadence-finalizes-purchase-of-hexagons-design-and-engineering-business/hexagon).
- Out-of-distribution weakness: SimAI notes that geometry far from the training data needs retraining — [Ansys SimAI](https://ansys.synopsys.com/products/simai).
- Exit timeline: Emmi went from seed to acquisition in ~13 months at ~30 people — [Emmi AI](https://www.emmi.ai/news/mistral-ai-acquires-emmi-ai).
- Korea precedent: Altair's Korean tuck-ins — [Wiki Altair](https://en.wikipedia.org/wiki/Altair_Engineering).
- NVIDIA's real-to-sim tooling gaps — [NVIDIA AV](https://www.nvidia.com/en-us/use-cases/autonomous-vehicle-simulation/).

### Inferences
1. **What to build (ranked by fit with the founder's background and acquirer pull)**
   - **(a) AI-driven simulation-ready geometry engine.**
     - Scope: automatic watertighting/shrink-wrap, defeaturing, mid-surfacing, and gap/overlap repair from messy CAD *and* faceted/scan meshes. Output: consistently meshable geometry plus metadata.
     - Ship it as an SDK or plugin for ANSA/Fidelity, Simcenter, Ansys, and PhysicsNeMo pipelines.
     - Buyers: Cadence (BETA+MSC+Pointwise integration), Siemens (Simcenter + Altair), Synopsys/Ansys (SpaceClaim/Discovery), Dassault/Spatial, and component vendors (Tech Soft 3D, ITI/Wipro).
   - **(b) Geometry-to-AI-surrogate data layer.**
     - Scope: canonical geometry/mesh representations, automated design-of-experiments geometry variants, and out-of-distribution detection for surrogates.
     - Buyers: PhysicsX, Neural Concept, Luminary, NVIDIA (PhysicsNeMo/Omniverse), and the new horizontal AI buyers (Mistral, CoreWeave). This directly serves the "generate training data" priority.
   - **(c) As-built/as-manufactured simulation.**
     - Scope: from a scan or CT, register the part to nominal CAD, transfer deviations, and build an analysis-ready mesh, so FEA/CFD runs on the actual part (porosity, warp, wear).
     - Precedents: Simpleware (Synopsys/Ansys) and Volume Graphics (Hexagon).
     - Buyers: Synopsys/Ansys, Hexagon (measurement focus), Cadence/MSC, Siemens, and the metrology players covered by the other researcher.
   - **(d) If the founder's AV reconstruction experience is confirmed: reconstruction-to-sim-asset conversion.**
     - Scope: Gaussian/NeRF/lidar scans to clean, segmented, physically and sensor-valid mesh assets with materials and collision; plus scenario-variation hooks.
     - Buyers: Applied Intuition, NVIDIA, dSPACE, AB Dynamics/rFpro, Foretellix, Cadence (Adams/VTD), and robotics simulation vendors.
2. **Stage and size at exit**
   - Team: 8–40 engineers with deep geometry/numerics talent. The goodwill in Cadence's small deals was "assembled workforce."
   - Proof: 2–5 paying industrial design partners (automotive, aerospace, semis; Korean OEMs and suppliers are natural first customers).
   - Integration: demonstrated inside at least one incumbent's platform or marketplace.
   - Revenue: modest is fine; strategic tuck-ins are bought for technology and team.
3. **Path:** partner, then strategic investment, then acquisition. This mirrors PhysicsX and Neural Concept with Siemens, and Luminary with NVIDIA. Joining the NVIDIA Inception/PhysicsNeMo/OpenUSD ecosystems and the Siemens Xcelerator, Ansys, and Cadence partner programs increases visibility.
4. **Defensibility that matters to acquirers**
   - Robustness on ugly real-world inputs: the NASA "first attempt" problem.
   - Scale to 100M+ cell problems: the bar Emmi set for surrogates.
   - Vendor-neutral I/O: STEP, Parasolid, STL/OBJ, USD, and CGNS/Exodus.
   - Benchmarks on public datasets such as Luminary's SHIFT sets and DrivAerML.
5. **Price expectation:** ~$10–60M for a tech/team tuck-in. More is possible if bid competitively by a horizontal AI buyer or if revenue exists. $100M+ typically requires an established product with recurring revenue (AWR $160M, Zemax $411M).
6. **Avoid:** building a general CFD/FEA solver or a general physics foundation model to compete with platforms funded at $1–2.4B, unless it is a narrow GPU solver for a niche physics that incumbents lack.

### Gaps
- No direct data was found on what incumbents paid for geometry-prep or meshing startups specifically. Pointwise's price is undisclosed, and SimSolid's too.
- Whether Korean-founded CAE startups have been acquired since 2021 is unknown beyond the Altair precedents.
- Recommend verifying the unverified leads listed in Section 1 Gaps before relying on them.
