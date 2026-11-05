# Industrial Voice Logging ("Field Voice Log", working name)

## Background

- Physical AI (robots, autonomous vehicles, VLA models) and industrial operations increasingly depend on language: intent, corrections, shift handovers, safety briefings and incident reports.
- Field workers have busy, often gloved hands, so they speak rather than type.
- Sites are noisy and security-sensitive, and many cannot use external cloud AI.
- Speech-to-text is becoming a commodity (Procore, Mitti, push-to-talk apps), but none of the frontline platforms we reviewed offers on-prem or no-external-AI deployment.
- Korean safety law requires daily TBM and risk-assessment records, kept for 3 years.

## Goals

- Voice-first logging: speech, optional audio, photos, timestamps and GPS from a phone, earbuds or a bodycam.
- Offline-first, syncing to a self-hosted server or private cloud with open models; records stay in the customer's network.
- Light, fast and reliable; every entry visibly shows recording, saved and synced.
- MVP: a general voice memo app for noisy places such as the subway, transcribed on our own GPU server.
- Next: a first commercial vertical (likely Korean manufacturing safety and context records) and exports for robot and AV data.
- Business: $300K profit in year 1 and $0.5–1M in year 2; self-serve on a vendor-run private cloud, with on-prem as the B2B upsell.

## Documents

- Basic research, competitors, technology, legal notes, draft requirements and open decisions: [industrial-voice-logging-research.md](../../market-studies/industrial-voice-logging/industrial-voice-logging-research.md).
- Agreed MVP scope and decisions (2026-11-05): [mvp-requirements.md](mvp-requirements.md).
