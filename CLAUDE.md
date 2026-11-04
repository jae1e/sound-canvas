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
- For this product, the user explicitly selected simultaneous delivery of GPS walking/navigation, conversational activity assistance, and vocal/voice practice, with shared journaling. Do not revert to the earlier assistant recommendation of a vocal-only first release.
- Read the linked implementation, earbud-compatibility, and technical-decisions documents before implementing this product. The user selected Android-first development (iPhone later), Expo/React Native with TypeScript, Korean and English, on-device-first processing with cloud fallback, and strong latency/cost priorities. Other market studies remain independent.

## Code

- Write code, comments, and identifiers in English.
- pnpm workspace layout and commands: [README.md](README.md).
- Implemented work is pushed to https://github.com/jae1e/sound-canvas.
