# Audio separation: where the technology can differ

**Status: 2026-11-05, hypotheses to test in `tools/separation-lab`.** The user asked what our technical differentiator could be beyond cost and speed, specifically in quality, algorithm and model.

## The base models will not be the moat

- **SAM Audio is available to everyone.** Meta's SAM Audio is gated but free to use commercially under the SAM License, and anyone can wrap it. Meta also runs its own playground.
- **Incumbents have years of model training.** LALAL.AI, Moises/Music.ai, AudioShake and Gaudio all run proprietary separation models. Community RoFormer models lead the open music-stem leaderboards (see [separation_tech_sota.md](../../market-studies/audio-video-separation/research-notes/separation_tech_sota.md)).
- **A general prompt model is not automatically the best stem separator.**
  - One 2026 live-music paper reports that SAM Audio reached only about **3.72 dB on clean vocals, against 10.05 dB** for the authors' specialist baseline. Listeners also preferred the specialist in A/B tests.
  - The authors warn that SAM Audio's diffusion design may cause sample misalignment, which depresses SDR. One paper, one domain, so this is weak evidence ([CrowdioSet, arXiv 2607.27828](https://arxiv.org/pdf/2607.27828)).
- **Our own spike agrees.** SAM Audio's `target + residual` is only about 7–9 dB SI-SDR against the input. Its output is generated, not cut out of the recording ([sam-audio-first-run.md](../../../tools/separation-lab/spike-results/sam-audio-first-run.md)).

**So the differentiator has to be the system around the models.** That means working out who or what each source is across a whole file, keeping the recording faithful, and using cues the base models ignore.

## Quality: candidate differentiators

The first two are the core proposal. The rest supply them or extend them.

1. **Identity-consistent long-form separation ("tracking and re-identification for sound").**
   - SAM Audio works window by window and has no notion of identity, so a text prompt can drift to another voice between 30 s chunks.
   - The pipeline:
     1. Build global identities first: speaker and timbre embeddings clustered over the whole file, plus face and instrument tracks when video exists.
     2. Generate the prompts for each chunk (spans, descriptions) from those identities.
     3. Verify each output chunk against its identity, for example with speaker-verification similarity. If it fails, retry with different anchors or candidates.
     4. Stitch the chunks into one consistent track per identity.
   - This is the computer-vision multi-object tracking and re-ID problem applied to audio, which is where the team's background is strongest.
2. **Faithful, exactly-summing output ("generative-guided masking").**
   - Use the generative estimate as a guide only. Derive a time-frequency mask from it and apply that mask to the **original mixture's** spectrogram, keeping the mixture's phase.
   - Expected benefits [hypothesis]:
     - the output keeps the original recording's detail;
     - no content is invented;
     - nothing is misaligned;
     - targets plus others sum back exactly to the mix.
   - Professional personas (wedding, podcast, VOD editors) care about "never invent sound" more than about SDR.
3. **A router and ensemble, not one model.**
   - Specialist separators where they are best: vocals, drums and bass; dialogue, music and effects.
   - SAM Audio for open-vocabulary and long-tail prompts: "tambourine", "the camera holder", "crowd cheering".
   - SAM's output can act as guidance for the specialist's mask.
   - Constraint: most community specialist weights are trained on non-commercial data, so a licence-clean specialist needs our own training data. That cost becomes a moat once it has been paid (see 8).
4. **Spatial cues.**
   - SAM Audio's processor averages channels to mono, which throws away panning and inter-channel phase.
   - Studio mixes often pan the two guitars left and right. Phone videos are usually stereo, and the camera holder's near-field voice has a distinct inter-channel signature.
   - Cheap pre-steps (mid/side, per-channel separation, inter-channel features) may separate same-type sources that text prompts cannot [hypothesis].
5. **Visual cues** (the team's computer-vision strength):
   - active-speaker detection, which gives timing anchors;
   - instrument and player localisation (SAM 3 open-vocabulary), for "the guitarist on the left";
   - shot boundaries;
   - lip activity, used to gate a voice.

   These feed differentiator 1 as extra evidence of identity.
6. **Enrolment prompts ("find this voice").**
   - SAM Audio cannot take an audio example as a prompt.
   - Speaker-embedding conditioning would allow extraction across files: the same speaker across multiple wedding cameras, a podcast's recurring host, or a commentator across matches. It could be an adapter on SAM Audio or a separate target-speaker model trained on licensed data.
7. **Confidence and honesty.**
   - Score each region with the judge model, speaker verification or CLAP similarity.
   - Show low-confidence regions on the timeline. Label overlap and group-singing sections "not separable".
   - Spend extra compute (reranking, the large model) only where confidence is low.
8. **Domain data loop.**
   - Fine-tune for the domains general models handle badly:
     - Korean broadcast commentary over a crowd;
     - phone recordings of events, with a near-field camera holder;
     - live concerts (PA plus crowd; CrowdioSet treats this as a distinct domain);
     - K-pop vocal layering.
   - Data comes from the lab's synthetic mixing pipeline, which gives ground truth, plus user corrections (merge and split, keep and remove) as weak labels. Corrections are used only with opt-in (requirement R11).
   - Licence-clean training data is also what B2B buyers will ask for later.

## Cost and speed: supporting advantages, not moats

- **Self-hosted cost.** SAM Audio large runs at a real-time factor of about 0.1 on an RTX 4090, roughly 6 GPU-minutes per audio hour per target.
  - At an assumed $0.40–0.70 per GPU-hour, that is about $0.04–0.07 per audio hour, or roughly **$0.001 per minute** [estimate].
  - API list prices from the earlier study are $0.05/min (Music.ai stems), $0.12/min (ElevenLabs Voice Isolator) and $0.24/min (Gaudio DME).
  - This pays for generous free previews and lower prices. Competitors can self-host too, so it is not a moat.
- **Analysis first, separation second.**
  - Clustering and tagging are cheap; pyannote runs at RTF 0.006.
  - Separation runs only on the sources the user selected, and only on chunks where that source is active. The demo already produces silence for chunks where a speaker never talks.
  - Commentary that is active 60% of the time saves about 40% of the compute for that track [estimate].
- **Two-tier speed.** Use the small model and the first chunk for an instant preview, and the large model for the export.
- **Progressive results.** Stream chunks to the UI as they finish.
- **Later: on-device.** Distilled specialist models for privacy and no upload. HTDemucs CoreML and ONNX ports already exist.

## Lab experiments that would test these claims

| # | Claim | Experiment | Metric |
|---|---|---|---|
| E1 | Identity consistency (1) | Compare SAM with text only, SAM with spans from pyannote, and the full identity pipeline with verify-and-retry, on US-3.1, US-1.x and the commentary clips | Speaker-swap rate per chunk, SI-SDRi per speaker |
| E2 | Faithful masking (2) | Raw SAM output against a mask applied to the mixture STFT | SI-SDR, exact-sum error, blind listening for artifacts |
| E3 | Spatial cues (4) | Two-guitar mixes with panning (US-7.1 variants): mono SAM against mid/side or per-channel pre-steps | SI-SDRi on the target guitar |
| E4 | Router (3) | SAM against a licence-clean specialist on standard stems. This needs our own training data first, so it comes later. | SDR, preference |
| E5 | Confidence (7) | Correlation of judge or verification scores with ground-truth error | Spearman correlation, precision of "not separable" flags |

**Recommended first experiments:** E1 and E2. They test the core proposal, use only data and models the lab already has, and both affect the demo directly.
