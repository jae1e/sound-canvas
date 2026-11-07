# Repository Instructions

## Purpose

This repository is a workspace for studying multiple markets and product opportunities. Its name does not limit research to music or audio. Do not assume that a market or product direction has been selected unless the user explicitly selects it.

## Language

- Conversations may use different languages. Respond in the language appropriate to the user's request.
- Write all repository documentation in English, including market studies, research notes, summaries, plans, and handoff documents.

## Research

- Distinguish verified facts, vendor claims, user anecdotes, estimates, and hypotheses.
- Include source links and relevant research dates. Recheck time-sensitive claims before presenting them as current.
- Preserve the user's constraints and decisions so another agent can continue the work without repeating the initial discovery.

## Existing Research

- Music and audio market study: [docs/market-studies/music-audio.md](docs/market-studies/music-audio.md).
- Gaudio Lab and the AI audio/video separation market (DME separation, music replacement, dubbing, consumer stem apps, diarization, virtual ad replacement, 블러미/BlurMe): [docs/market-studies/audio-video-separation/gaudio-lab-and-ai-separation-market.md](docs/market-studies/audio-video-separation/gaudio-lab-and-ai-separation-market.md). Research notes are in the `research-notes/` folder next to it.
- AI media self-serve SaaS idea screening against the user's targets ($300K profit in year 1, $0.5–1M in year 2, salaries excluded; self-serve first; convenience counts even when a feature is free elsewhere): [docs/market-studies/ai-media-saas-screening/ai-media-saas-idea-screening.md](docs/market-studies/ai-media-saas-screening/ai-media-saas-idea-screening.md).

## Product Handoffs

- Voice Life Companion: [docs/products/voice-life-companion/README.md](docs/products/voice-life-companion/README.md).
- 2026-11-07 user decision: the app now focuses on Voice Coach (song and speech coaches). Travel Guide and Work Partner are hidden, not deleted. This supersedes the 2026-11-03 decision to ship all three modes together. Renovation plan, pending the user's answers to its open questions: [docs/products/voice-life-companion/voice-coach-renovation-plan.md](docs/products/voice-life-companion/voice-coach-renovation-plan.md). Research notes are in `docs/products/voice-life-companion/research/`.
- Read the linked implementation, earbud-compatibility, and technical-decisions documents before implementing this product. The user selected Android-first development (iPhone later), Expo/React Native with TypeScript, Korean and English, on-device-first processing with cloud fallback, and strong latency/cost priorities. Other market studies remain independent.

- Industrial voice logging (selected by the user on 2026-11-05; MVP scope agreed, commercial segment open): voice-first field and industrial logging (speech to text, optional audio, photos, timestamps, GPS) synced to a self-hosted server or private cloud, with no external cloud AI. Uses: manufacturing context logs, field safety records (TBM, risk assessment), communication records, robot/AV language data. Basic research, draft requirements and open decisions: [docs/market-studies/industrial-voice-logging/industrial-voice-logging-research.md](docs/market-studies/industrial-voice-logging/industrial-voice-logging-research.md). Agreed MVP scope and decisions (2026-11-05: general noisy-environment voice memo app for the user, PTT plus wearer-armed session, phone records and the server transcribes, audio kept with retention classes, Tailscale with ACLs plus app auth, app plus a 127.0.0.1 web view): [docs/products/industrial-voice-logging/mvp-requirements.md](docs/products/industrial-voice-logging/mvp-requirements.md). This is a separate product from Voice Life Companion and audio separation. Implementation (slice 1, started 2026-11-06): the app–server contract is [docs/products/industrial-voice-logging/api-v0.md](docs/products/industrial-voice-logging/api-v0.md), the app is `apps/field-log` and the server is `services/field-log-server`. Change the contract first, then both sides. Record every issue found in testing (symptom, root cause, fix with commit, status, lesson) in [docs/products/industrial-voice-logging/field-test-log.md](docs/products/industrial-voice-logging/field-test-log.md).

- Audio separation SaaS (exploration, MVP not committed): [docs/products/audio-separation/personas-and-user-stories.md](docs/products/audio-separation/personas-and-user-stories.md). The user chose the sound-separation topic (voices, individual voices, instruments, individual singers who take turns; audio and video input) and excluded harmony groups and unison choruses as too difficult.

## Learning Material

- Audio and AI curriculum for the user (a mechanical engineer new to audio): lectures 01–09 run from acoustics to SAM Audio and an industry map; Part 2 (lectures 10–13) covers the capture chain, hardware and software noise reduction, speech-to-text, and single-speaker transcription for the industrial voice logging app: [docs/learning/audio-ai/README.md](docs/learning/audio-ai/README.md).

## Code

- Write code, comments, and identifiers in English.
- pnpm workspace layout and commands: [README.md](README.md).
- Implemented work is pushed to https://github.com/jae1e/sound-canvas.
