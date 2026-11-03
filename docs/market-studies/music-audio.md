# Music and Audio Market Study: Agent-Assisted, Human-Editable Workflows

Documented: November 3, 2026  
Underlying research: conversation and research conducted through October 30, 2026  
Status: research handoff; no market, product, or business model has been selected

Subsequent product decision, November 3, 2026: the user selected a personal-use **Voice Life Companion** prototype with three simultaneous modes. Read the [current product brief](../products/voice-life-companion/README.md) before implementation. The status and commercial conclusions below describe the earlier research stage.

## 1. Purpose and Evidence Status

This document preserves the music and audio portion of the research so another agent can continue studying markets without reconstructing the conversation. It records the user's objectives, product concepts, competitors, cost considerations, evidence, and unresolved questions.

This is a synthesis of prior work, not a fresh verification of every linked product. Treat prices, model capabilities, APIs, licenses, and integrations as time-sensitive. The original conversation contained confident statements that were not adequately sourced; the corrections and verification backlog below are part of the handoff.

The repository supports research across multiple markets. Music and audio were the starting point, not a permanent scope restriction. Local headphone configuration and equalizer setup are intentionally excluded.

## 2. User Context and Persistent Constraints

- The user has hobby-level knowledge of major/minor keys, instrumentation, basic harmony, and timeline-based video editing.
- The company is a small software company with a limited budget. Development effort, ongoing maintenance, and inference costs matter.
- The preferred entry model is self-service SaaS. An individual should be able to discover, try, and pay for the product without an enterprise sales process.
- Organization-level adoption may follow individual adoption: a user introduces a useful workflow, colleagues reuse its projects or templates, and the organization later adopts it.
- The user is interested in agents acting like engineers: interpreting intent, operating tools, producing work, and revising it with human direction.
- Results must remain directly editable by humans as well as through the agent.
- Projects should preserve useful structure, decisions, and settings for subsequent work.
- Convenience is the first product principle. Start with a broadly shared task and reduce effort substantially; refine differentiation through observed usage.
- A broad customer pool does not imply implementing every workflow in the first release. Different industries can share a narrowly scoped task.
- No foundation-model training program is assumed or required.

## 3. Core Product Thesis

The desired workflow is:

1. A person provides an objective, references, and existing assets.
2. The agent proposes a workable plan and operates appropriate tools.
3. The tools produce an editable project, not only a flattened output file.
4. The person can audition the result and edit it directly.
5. Further agent edits preserve the person's intentional changes.
6. The project retains enough context to make the next similar job substantially easier.

For audio, this could mean asking for a cohesive set of game sounds, auditioning candidates, adjusting individual layers or parameters, and exporting named assets. For music, it could mean generating MIDI parts and revising notes, instruments, and arrangement. For spoken content, it could mean editing a script and correcting selected speech segments while retaining timing and approved audio.

The key convenience measure is total effort to reach an acceptable deliverable: briefing, waiting, auditioning, revising, checking, exporting, and repeating the job. Chat turn count and generation speed alone are insufficient.

## 4. Essential Domain Model

### DAWs and Editable Projects

A Digital Audio Workstation, or DAW, combines recording, MIDI sequencing, arrangement, editing, effects, automation, mixing, and export. Cubase was the initial reference product.

Useful editable structures include:

- MIDI notes, velocities, controller events, and instrument assignments.
- Audio clips with timing, trims, fades, and take selections.
- Separate tracks, routing, effects, and automation.
- Articulation instructions for virtual instruments.
- Project-level tempo, time signature, markers, and arrangement sections.

An audio file does not necessarily contain these structures. A typical finished stereo MP3 or WAV contains a mix, not the original instrument tracks. This limitation comes from flattening the project into a mix, not specifically from MP3 compression. WAV can also contain a finished mix; channel count and musical source separation are different concepts.

### Formats and Interchange

- WAV and AIFF commonly carry uncompressed PCM audio used in production.
- MP3 and AAC use lossy compression.
- FLAC and ALAC provide lossless compression.
- MIDI stores performance instructions rather than the rendered sound of an instrument.
- DAW project files preserve application-specific editing state and usually depend on external media, instruments, and plugins.
- Stems generally mean grouped submixes, such as drums or backing vocals. Individual exported tracks are often called multitracks. Requesting "stems" alone can be ambiguous.
- Source separation can estimate components of a finished mix, but it does not reliably recover the original project or original recordings.

There is no universal requirement to use 24-bit/48 kHz or higher for every project. Recording and delivery settings depend on the workflow.

### Editing, Mixing, and Mastering

| Stage | Typical objective | Representative operations |
| --- | --- | --- |
| Editing | Shape and repair performances or clips | Comping, cuts, fades, timing adjustments, pitch correction, noise cleanup |
| Mixing | Make multiple sources work together | Levels, panning, EQ, dynamics, routing, ambience, automation |
| Mastering | Prepare a mix or collection for delivery | Final tonal/dynamic decisions, sequencing, quality checks, delivery formats |

These stages overlap. Mastering is not simply increasing loudness, and a platform's playback normalization target is not automatically a mandatory mastering specification. Audio meters describe useful properties but do not establish artistic quality by themselves.

## 5. Incumbent Landscape

The following are workflow-oriented comparisons, not verified market-share rankings or restrictions on what each product can do.

| Product or category | Relevant position | Implication for an agent product |
| --- | --- | --- |
| Cubase | Detailed MIDI, arrangement, recording, mixing, orchestral workflows | Existing project structure is rich; reliable external control must be investigated |
| Logic Pro | Integrated music production and assisted session-player workflows | Assisted creation within an editable DAW already exists |
| Ableton Live | Clip-based composition, arrangement, performance, audio manipulation | Remote-control integrations are a relevant research path |
| FL Studio | Pattern-based composition and piano-roll workflows | Strong existing creation tools; test actual handoff convenience |
| Studio One | Integrated production and project workflows | Recheck current branding, editions, and integrations before comparison |
| Pro Tools | Established professional recording, editing, mixing, and post-production workflows | Installed workflows, hardware, interoperability, and operator familiarity matter |
| REAPER | Customization and scripting are relevant to automation | Investigate official control surfaces and scripting interfaces rather than assuming capabilities |
| Suno and Udio | Generation of rendered music and associated editing workflows | Useful generation inputs or substitutes; editable structure and current export capabilities need verification |
| AIVA and harmonic/MIDI assistants | Composition or harmony assistance with editable musical material | Potential competitors or upstream tools for structured composition |
| Synthesizer V and ACE Studio | Note/lyric-driven singing synthesis and vocal editing | Illustrate a model-assisted workflow with explicit human control |
| iZotope assistants | Assisted audio-processing decisions with exposed parameters | Parameter suggestions plus manual refinement are an established interaction pattern |

Pro Tools' professional position was discussed in terms of historical hardware investment, established session workflows, skilled operators, and compatibility. Earlier claims of literally zero latency or perfectly identical session transfer were too strong. Media, plugin availability, versions, and hardware still affect results.

Avoid repeating unsupported claims that one DAW dominates a region or that two products divide an entire genre market. Reliable market-share evidence was not established.

## 6. Generation, Structured Editing, and Agent Access

### Three Useful Approaches

| Approach | What remains editable | Main limitation |
| --- | --- | --- |
| Structured generation | MIDI, notes, arrangement, parameters, lyrics | Requires rendering tools and may not directly reproduce the desired final timbre |
| Audio generation with project assembly | Clips, separate generated layers, timing, effects, routing | A generated waveform still lacks its original synthesis decisions and note structure |
| Analysis and processing of existing audio | Processing chain, cuts, gain, fades, candidate selections | Analysis and source separation are imperfect; quality requires auditioning |

These approaches can be combined. Generating audio does not make all subsequent editing impossible. The practical question is which dimensions remain controllable and how reliably an agent can change one dimension without disturbing others.

### APIs and MCP

MCP is an integration mechanism, not proof of musical competence or a durable commercial advantage. An API or MCP wrapper still needs a useful underlying tool, observable state, meaningful feedback, and a dependable human editing experience.

Candidate integration paths discussed:

- Official audio-generation APIs for speech, music, and sound effects.
- MIDI generation through code, followed by import or rendering.
- DAW scripting, remote-control APIs, MIDI, OSC, or supported control protocols.
- Headless DSP and file processing exposed as agent tools.
- Analysis tools returning measurements and useful annotations.

The earlier blanket claim that commercial creative tools do not provide official MCP support should not be reused. The broader research found official agent integrations in adjacent products. DAW-specific support must be verified product by product. Likewise, do not assume a DAW's complete project state can be controlled through MIDI or OSC.

### Capabilities Verified in the Prior Research

- ElevenLabs documents APIs for speech, music, sound effects, transcription, dubbing, and Studio-related operations: [API overview](https://elevenlabs.io/api).
- Its sound-effects documentation describes prompt-based creation with controls such as duration and looping: [capabilities](https://elevenlabs.io/docs/overview/capabilities/sound-effects), [API reference](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert).
- Krotos Studio describes sound performance, editable sound layers synchronized to video, and importing sounds to build reusable presets or chains: [product overview](https://krotos.studio/products-krotos-studio-overview).
- Auphonic offers automatic post-production functions and processing-time-based plans: [pricing and feature comparison](https://us.auphonic.com/pricing).

These establish that meaningful parts of the proposed workflow already have competitors. They do not establish the availability of a complete, convenient game-audio workspace.

## 7. Commercial Opportunities Considered

All opportunities below are hypotheses. No customer interviews, paid conversions, retention measurements, or hands-on competitive benchmarks were completed.

### A. Game and App Sound Workspace

**Potential users:** indie game developers, small game teams, app developers, technical artists, and creators who need coordinated UI or interaction sounds.

**Job:** turn an event list and a style reference into an organized set of production-ready sounds.

Example workflow:

1. Import an event list: click, confirm, cancel, warning, reward, impact, ambience.
2. Establish a shared sound direction and technical requirements.
3. Search existing assets and/or generate candidates.
4. Audition shortlists in the relevant interaction context.
5. Edit duration, layers, fades, pitch, dynamics, and variations.
6. Apply consistent output settings and naming.
7. Export an asset package; retain the project for further revisions.

**Value to test:** fewer auditions, less file organization, consistent asset sets, rapid individual corrections, and reuse across related events.

**Alternatives:** sound libraries, existing DAWs and editors, ElevenLabs, Krotos Studio, and custom scripts. Engine and middleware integrations may also matter, but compatibility was not validated.

**Adoption path:** an individual tries a small sound set, shares the editable project with a collaborator, and the team standardizes its naming, presets, and assets.

**Risks:** project-based rather than continuous demand; free asset alternatives; subjective auditioning; integration maintenance; unclear subscription willingness. Seamless loops and consistent sound style are engineering/quality requirements, not proven defensible advantages.

**Position at handoff:** the strongest audio-specific candidate discussed, but not selected as the overall business direction.

### B. Spoken-Content Editing and Post-Production

**Potential users:** podcasters, instructors, narrators, freelance editors, and small content teams.

**Job:** produce clean, correctly timed speech content with editable cuts, processing, music, and delivery settings.

**Possible workflow:** upload recordings and a script; identify issues; propose cuts and processing; audition changes; revise individual regions; export and retain the project.

**Value to test:** repeatable processing, selective corrections, predictable revisions, and less movement between transcription, editing, sound cleanup, and delivery tools.

**Competition:** Auphonic, Descript, voice-generation platforms, and conventional editors. Basic leveling and noise reduction alone are already served.

**Risks:** repair artifacts, altered wording or timing, long-file processing, and unreliable recognition. Background ducking usually attenuates the music beneath speech; a previous description incorrectly referred to lowering the voice.

### C. MIDI and Arrangement Assistant

**Potential users:** hobbyist producers, composers, and creators who want editable musical sketches.

**Job:** create and revise parts while preserving explicit notes, harmony, rhythm, articulation, and arrangement.

**Implementation options:** code-generated MIDI, existing composition/harmony tools, instrument rendering, and DAW import or integrations.

**Value to test:** instructions such as changing one chord, simplifying a bass line, or varying a drum pattern without rebuilding other parts.

**Risks:** generic results, strong incumbent tools, inexpensive substitutes, plugin complexity, and subjective quality. Producing valid MIDI is much easier than producing music customers repeatedly prefer.

### D. Audio Analysis, Quality Checks, and Delivery

**Potential users:** creators, editors, game developers, and small production teams delivering many audio files.

**Job:** check loudness, peaks, clipping, silence, channel layout, file format, duration, and naming; propose or apply understandable corrections.

**Value to test:** consistent delivery packages with clear reports and reversible processing.

**Economics:** potentially lighter than generative audio because many checks are deterministic DSP operations.

**Risks:** basic measurements are commoditized. BPM and key estimates can be uncertain. Measurements alone cannot determine whether a mix sounds good. This may work better as a workspace feature or agent tool than a standalone subscription.

### E. DAW Connector or Engineering Agent

**Potential users:** existing DAW users who want to delegate repetitive operations.

**Job:** inspect a session, carry out bounded edits, report changes, and allow direct human review and undo.

**Value to test:** setup, organization, batch edits, exports, or other repetitive tasks with clear success criteria.

**Risks:** heterogeneous DAWs and plugins, incomplete external APIs, version changes, state synchronization, undo semantics, and weak feedback on perceptual quality. A universal connector could become a high-maintenance product before willingness to pay is established.

**Practical direction:** evaluate a supported, narrow workflow in one host before considering multiple DAWs. This is a scope recommendation, not a decision to build.

### F. Functional Music and Background Catalogs

Concentration, ambience, sleep, and background music were considered as possible outputs or licensing businesses.

This is a different business from an editable workspace: distribution, audience acquisition, catalog differentiation, and licensing are central. The conversation did not establish passive-income economics, reliable demand, or a repeatable acquisition channel. Claims about special frequencies or health effects were not substantiated and should not be used as product evidence.

## 8. Development and Operating Economics

### Low-Capital Architecture Direction

- Use existing models and tools before considering model training.
- Store a structured project with original assets, edits, parameters, approved decisions, and exports.
- Use deterministic operations for tasks such as trims, fades, gain changes, and format conversion.
- Generate or render only what changed where practical.
- Keep preview and final export behavior consistent.
- Preserve manual edits and provide recoverable revisions.
- Expose the same useful operations to the UI and agent, avoiding separate incompatible project representations.

### Costs to Measure

| Cost category | Typical driver |
| --- | --- |
| Agent reasoning | Context size, tool calls, retries, and revision loops |
| Audio generation | Duration, number of candidates, model, and regeneration rate |
| Transcription and analysis | Recording duration, channels, and analysis stages |
| Processing and rendering | Effects, concurrency, file length, and final export frequency |
| Storage and delivery | Original files, versions, previews, exports, and retention |
| Product engineering | Timeline/waveform behavior, playback, undo, persistence, and import/export |
| Support and maintenance | Device/browser issues, plugin or host changes, failed jobs, and confusing results |

The conversation's limited game/app sound beta estimate was **5–10 person-months**. It assumed short sound effects, a simple layer/processing model, existing generation services, and limited exports. It excluded a full DAW, extensive engine integrations, native applications for every platform, and real-time collaboration. This was a rough planning estimate, not a quote or measured implementation result.

Cheap reasoning or storage does not imply a cheap finished product. Candidate generation, repeated audition/revision, editing reliability, and support can dominate costs.

### Pricing Hypotheses

- Monthly subscriptions fit recurring production.
- Project or usage bundles may fit game jams, launches, and intermittent projects better.
- Shared projects, asset libraries, and editor seats provide possible team expansion paths.
- High generation usage may need explicit additional allowances.
- Technical failures and unpredictable regeneration charges can undermine perceived convenience.

Use contribution economics that include generation, processing, free-user usage, infrastructure, payment costs, and support. No audio-workspace price, gross margin, acquisition cost, or customer lifetime value was validated.

## 9. Customer Evidence and Reddit Reading

The user specifically values recent Reddit discussions with substantial comments because replies can reveal practical workflows and objections. Read the comments, distinguish vendor promotion from customer experience, and do not confuse upvotes with comment counts.

### Directly Relevant Thread

[How I stopped manually searching through 17,000 sound effects for about 100 game events](https://www.reddit.com/r/gamedev/comments/1vkj21g/how_i_stopped_manually_searching_through_17000/) — August 10, 2026.

- The author described using semantic audio search over an existing local library.
- The problem was selecting suitable sounds, not a lack of available files.
- Comments discussed library sources, duration-based filtering, and recombining imperfect matches.
- The author introduced their own tool; treat the post as a concrete workflow example, not independent proof of demand.
- The implication to test is whether search, auditioning, recombination, and export save more effort than generation alone.

### Adjacent Community Context

[r/gamedev Policy on AI Use](https://www.reddit.com/r/gamedev/comments/1vrnqyt/rgamedev_policy_on_ai_use/) — August 18, 2026.

This was identified as a large discussion about AI in game development. It is useful context for audience attitudes and community participation, not direct evidence of willingness to pay for an audio product. Do not describe all its comments as reviewed in this study.

The research did not establish a representative customer sample or a complete set of high-comment audio-specific threads. Additional independent customer discussions and behavioral validation are still needed.

## 10. Claims to Correct or Verify Before Reuse

| Earlier claim or assumption | Handoff guidance |
| --- | --- |
| Suno can replace every production stage completely and output perfect pitch/finished engineering | Overstated. Evaluate output quality, control, revision effort, and deliverables for a specific task |
| Suno only outputs a stereo file and cannot offer stems or selective editing | Do not treat as current fact. Check present product, plan, export, and editing capabilities |
| Suno's exact proprietary architecture uses a specific combination of transformers, codecs, and diffusion | Not established by the research. Avoid asserting unpublished internals |
| Official Suno/Udio APIs or third-party wrappers are interchangeable | Verify official support, product terms, reliability, and the identity of the provider |
| A generated audio file is effectively uneditable | Too broad. Distinguish clip/processing edits from note-level or source-level control |
| Source separation recovers the original tracks | Incorrect as a general claim. It estimates components and may introduce artifacts |
| Open model weights imply unrestricted commercial use | Check code, weights, datasets, outputs, and asset licenses separately |
| A specific singing tool supports all requested languages in every voice/version | Check the engine, voice database, language, and integration individually |
| Traditional DAWs lack official agent/control interfaces | Verify each product and distinguish official APIs, control protocols, and community bridges |
| A generic metrics tool can judge whether a mix is artistically better | Measurements support evaluation; they do not settle the perceptual or artistic decision |
| Functional music provides passive revenue or special-frequency health benefits | Not established; requires separate distribution, economics, and evidence research |

### Unverified Artist Case Study

The original conversation included a purported case study of **MEOMURU (머무르)**, the song **“꿈꾸던 어른이 되었나요?”**, a production team called **Glorywave**, and its use of Suno.

The claimed identities, interview, chart history, chronology, and exact production steps were not adequately verified in the retained research. Treat the earlier workflow as a hypothetical reconstruction, not a documented account. Before using this example, locate the artist or producer's original statements and distinguish confirmed steps from inference. Do not infer a DAW, number of generations, overdubs, or mastering process without evidence.

## 11. Validation Plan

Start with actual recent tasks and assets rather than general enthusiasm for AI.

For a sound workspace, compare:

1. First task: create or assemble a small cohesive set of sounds.
2. Revision: change one sound or processing choice while preserving the rest.
3. Repeat task: extend the same project with new events or assets.

Measure:

- Active user time, including briefing, auditioning, checking, and exporting.
- Acceptance of the final deliverable against the user's own quality threshold.
- Number and cost of generated candidates and failed attempts.
- Whether manual edits survive agent revisions.
- Time saved on the second task.
- Actual reuse, payment, and collaboration behavior.

A possible initial target is a 50% reduction in active effort versus the user's existing workflow, followed by an additional improvement on repeated work. This is a proposed test criterion, not an observed result.

Potential acquisition experiments include game-jam workflows, concrete before/after production examples, developer or creator communities, and reusable project links. No acquisition channel has been validated. Team expansion should follow useful individual work and editable sharing rather than require organizational procurement at the start.

## 12. Position Relative to Other Markets

The research expanded from music/audio into recurring reports and charts, technical diagrams, product/demo videos, retail promotional content, education materials, presentations, and forms. General job-seeker video resumes were explicitly excluded from the video/portfolio direction.

The latest comparative recommendation was to test **product/promotional visuals** and **recurring reports** before committing to a larger video product. They appeared to offer broad audiences and smaller initial editing scope. This was a provisional judgment under the low-budget constraint, not a user decision or proof that those markets outperform audio.

Carry the same principle into subsequent studies: find a broadly shared job where the agent and human can work on the same editable project, minimize total effort, and establish repeat usage before expanding the product.

## 13. Next Research Questions

1. Which audio task recurs frequently enough for an individual to pay continuously?
2. Is the largest burden generation, search, auditioning, editing, organization, or delivery?
3. How much value can be delivered through deterministic processing and existing assets?
4. What project representation gives useful human editing without building a full DAW?
5. Which official APIs and host integrations provide reliable read/write state and reversible actions?
6. Can the agent make a localized change without undoing approved work?
7. How many candidates and revisions does an accepted asset actually require?
8. Which licenses and provider terms permit the intended commercial workflow?
9. What is the cheapest credible self-service acquisition path?
10. Does audio outperform the other market candidates when tested with the same convenience and retention measures?

No customer outreach, paid experiment, product deployment, or final market selection is recorded as completed.
