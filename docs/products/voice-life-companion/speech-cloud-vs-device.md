# Speech: Cloud APIs vs On-Device (STT and TTS), Cost and Latency

Status: analysis, 2026-11-04. Question: the LLM is a cloud API (Claude Haiku 5.5, only when the deterministic parser fails). Should STT and TTS also be cloud APIs, or stay on-device?

Short answer: **keep STT on-device; keep TTS on-device (cached Supertonic clips plus sentence-by-sentence Supertonic, Google platform TTS where a reply must start at once).** Cloud speech does not win on latency for STT, and cloud TTS wins by only about 0.3-0.6 s of first-audio time at about $0.02-0.11 per session. Details, numbers and switching conditions are below.

## 0. Labels and Sources

- **[V]** verified on a primary source (checked 2026-11-04 unless noted). **[MC]** vendor claim. **[3P]** third-party site, not verified against the vendor. **[M]** measured here on 2026-11-04. **[E]** estimate. **[H]** hypothesis. **[U]** unverified.
- Prices are USD. KRW converted at an assumed 1,450 KRW/USD [E].
- Several vendor pages were not readable by the fetch tool (Google and Azure price tables rendered as empty or "$-"). Those prices are [3P] and must be rechecked in the vendor console before a purchase decision.
- Existing on-device facts come from [technical-decisions.md](technical-decisions.md) sections 4-5 and [apps/mobile/SPIKE.md](../../../apps/mobile/SPIKE.md). The STT timing fields there (`endToFinalMs`, `lastPartialToFinalMs`) do **not** include the recognizer's own trailing-silence wait, and SODA reports end-of-speech together with the final, so end-of-real-speech to final is **[E] 600-900 ms** until measured.

## 1. Usage Model (all [E], adjustable)

Edit the parameters, re-run the formulas in section 3.

| Parameter | Work Partner | Travel Guide | Voice Coach |
| --- | --- | --- | --- |
| User speech per 30-min session (min) | 3.0 | 4.5 | 3.5 |
| App speech (characters) | 4,000 | 2,500 | 1,500 |
| Share that is cacheable (counts, cues, fixed acks) | 85% | 15% | 60% |
| LLM calls (Tier 2 only) | 10 | 15 | 8 |
| Notes | many counts, mostly pre-synthesized clips | 3-5 narrations of 30-60 s (about 1,800 chars) plus short cues | pitch analysis is on-device DSP, not STT; speech is commands and notes |

Global parameters: 30 sessions per month for a daily user; blended mode mix = one third each; 1,000 MAU each using the app daily (linear: halve it for 15 sessions a month). Korean app speech is about 330 characters per minute of audio [E]. Session length 30 min.

**Cloud STT billing models.**
- *Continuous*: the mic streams for the whole 30 minutes (hands-free listening). Billed minutes = 30.
- *VAD-gated*: only speech segments are sent. Billed minutes = user speech x 1.5 (pre-roll and trailing padding) [E]. Needs a socket per segment or a socket that bills only for audio sent. **AssemblyAI bills the socket duration, so gating only helps if it closes the socket** [V, see section 2.1].

**LLM cost** is the same in every row: 2,000 input + 150 output tokens at $0.10 / $0.50 per MTok = $0.000275 per call [E, price from technical-decisions.md section 5.2, Anthropic table cached 2026-10-06]. That is $0.002-0.004 per session. It is included in all rows below.

## 2. Price and Capability Research (checked 2026-11-04)

### 2.1 Cloud STT

| Provider | Price | Billing | Streaming | Korean / ko-en | Free tier | Published latency | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Cloud STT v2, Chirp 3 | $0.016/min up to 500k min/month [3P: Google pricing snippet and routers; Google page unreadable here] | per second, per channel [3P] | `StreamingRecognize` supported on v2 in some doc versions, batch-only in others [U] | Language list not confirmed [U]. **Seoul `asia-northeast3` is not in the Chirp 3 region list**; GA regions are us/eu multi-region, `asia-northeast1` (Tokyo), `asia-southeast1`; use the locations API to confirm [3P: [docs](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)] | none stated | none published | [pricing](https://cloud.google.com/speech-to-text/pricing) |
| Azure Speech, koreacentral | $1.00/hour real-time (= $0.0167/min) [3P: [developersdigest](https://www.developersdigest.tech/models/speech/azure), dated 2026-10-18]; official page shows "$-" | per second [V: official page text] | yes | ko-KR yes [E from product knowledge]; code-switching needs multi-language continuous ID, ko-en not verified [U] | **5 hours/month** [V: official page text] | none published | [pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) |
| Naver CLOVA Speech (and CSR short API) | about 1,200 KRW/h (= $0.83/h = $0.0138/min) [MC via Soniox comparison page, as recorded in technical-decisions.md; not rechecked, portal price table not retrievable] | usage time | CSR short-command API is per call, 60 s cap [V: [ncloud docs](https://api.ncloud-docs.com/docs/ai-naver-clovaspeechrecognition)]; CLOVA Speech is long-form | Korean best-in-class claimed [MC] | unknown | none | [ncloud](https://www.ncloud.com/product/aiService/clovaSpeech) |
| RTZR / Return Zero VITO | about 1,000 KRW/h (= $0.69/h = $0.0115/min) [MC via Soniox page; official price not found] | unknown | yes, websocket; concurrency capped by plan [3P: [Pipecat docs](https://docs.pipecat.ai/api-reference/server/services/stt/rtzr)] | Korean-native; `sommers_ko` tuned for telephony | unknown | none | [docs](https://developers.rtzr.ai/docs/en/stt-streaming/websocket/) |
| Soniox | **$0.12/h real-time ($0.002/min)** [V: [pricing](https://soniox.com/pricing)] | token-based, "duration of audio or streaming session"; granularity not stated | yes, WebSocket | ko supported, automatic ko-en code-switching claimed [MC: [soniox.com/korea](https://soniox.com/korea)] | none stated | "built for low latency", no numbers [MC] | [pricing](https://soniox.com/pricing) |
| Deepgram Nova-3 | $0.0077/min monolingual, $0.0092/min multilingual (pay as you go) [V: [pricing](https://deepgram.com/pricing)] | per second [3P] | yes | Korean `ko` added to Nova-3 monolingual, streaming improved [V: [changelog](https://developers.deepgram.com/changelog/2025/11/4.md)] | $200 credit, no expiry [V] | none stated | [pricing](https://deepgram.com/pricing) |
| ElevenLabs Scribe v2 Realtime | $0.39/h ($0.0065/min) [V: [pricing](https://elevenlabs.io/pricing/api)] | per hour of audio | yes | Korean yes [E]; code-switching [U] | free plan, allowance not stated | ~150 ms claimed [MC, recalled from vendor material, not rechecked] | [pricing](https://elevenlabs.io/pricing/api) |
| OpenAI `gpt-4o-mini-transcribe` | token-based; about $0.003/min estimate [V: [OpenAI pricing](https://developers.openai.com/api/docs/pricing)]; `gpt-transcribe` $0.0045/min | tokens | realtime transcription sessions exist; per-utterance upload is the cheap path | Korean yes; ko-en mixed handled by one model [E] | none | none published | [pricing](https://developers.openai.com/api/docs/pricing) |
| AssemblyAI | Universal-Streaming $0.15/h ($0.0025/min) [V: [pricing](https://www.assemblyai.com/pricing)] | **session duration, idle socket time billed** [V] | yes | Korean in streaming **not confirmed** [U] | $50 credit [V] | none | [pricing](https://www.assemblyai.com/pricing) |

### 2.2 Cloud TTS

| Provider | Price per 1M chars | Streaming | Published TTFB | Korean voices | Caching of output | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Google Cloud TTS Chirp 3 HD | $30 [3P], 1M chars/month free [3P: costbench] | yes | about 240 ms in one US-East leaderboard [3P: [fast.io](https://www.fast.io/resources/best-ai-text-to-speech-tools-2026.md)] | yes; `asia-northeast3` endpoint listed for TTS [3P: [Google endpoints](https://docs.cloud.google.com/text-to-speech/docs/endpoints)] | storage and replay terms not checked [U] | [pricing](https://cloud.google.com/text-to-speech/pricing) |
| Google Neural2 | $16 [3P] | yes | not published | yes | [U] | same |
| Azure Neural (koreacentral) | $15 [3P: [beri.net](https://www.beri.net/article/elevenlabs-vs-cartesia-vs-azure-tts-latency-pricing-voice-cloning-2026)]; Neural HD about $22 [3P]; two sites list $16 | yes | Azure Neural HD about 200 ms in the same US-East leaderboard [3P] | yes (SunHi, InJoon etc. [E]) | [U] | [pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) |
| Azure free tier | 0.5M chars/month free [V: official page text] | | | | | same |
| ElevenLabs Flash/Turbo | **$40** ($0.04 per 1,000 chars) [V: [pricing](https://elevenlabs.io/pricing/api)] | yes | 75 ms [MC], 296 ms p50 in a larger May 2026 benchmark [3P: [Gradium](https://gradium.ai/content/tts-latency-benchmark-2026)] | Korean supported [E] | paid-plan outputs generally usable; check ToS [U] | [pricing](https://elevenlabs.io/pricing/api) |
| OpenAI `gpt-4o-mini-tts` | $0.60/M text-in tokens + $12/M audio-out tokens; about $0.015/min of audio [V: pricing page / [Neowin](https://www.neowin.net/news/openai-announces-next-generation-audio-models-to-power-voice-agents/)]; about $45/M chars for Korean at 330 chars/min [E] | yes | about 380-400 ms [3P] | Korean works [E], not a native-quality list | [U] | [pricing](https://developers.openai.com/api/docs/pricing) |
| Naver CLOVA Voice | Premium plan has a **base fee plus 1,000,000 chars/month included**, then per-1,000-char blocks; amounts not retrievable [3P: ncloud docs summary] | unknown | none published | native Korean | [U] | [ncloud](https://www.ncloud.com/product/aiService/clovaVoice) |
| Supertone API | custom, volume-based; no public rate card [V: [supertone.ai/api](https://www.supertone.ai/en/api)]; consumer plan $2.99/month for about 30 min [3P] | unknown | none published | Korean/English/Japanese from one voice | [U] | [supertone.ai](https://www.supertone.ai/en/api) |
| Typecast | not researched (out of the cost range of interest) | | | | | |

Note: technical-decisions.md section 4.4 still says "Supertonic ... repository archived" under "Not adopted", while section 4.5 records the user's later selection of Supertonic 3. Section 4.5 is current; this analysis follows it.

### 2.3 Realtime speech-to-speech (reference only)

- `gpt-realtime-mini`: audio in $10/M tokens, audio out $20/M, cached audio in $0.30/M [V: [OpenAI pricing](https://developers.openai.com/api/docs/pricing)]. Assumed token rates: about 600 audio tokens per minute in, 1,200 per minute out [E].
- Gemini Live: earlier estimate of up to $1.5-2 per session if kept open [3P, carried from technical-decisions.md section 5.3; **not rechecked today**].

## 3. Cost Tables

Formulas (all rows add the LLM cost):
- B1 (continuous cloud STT) = 30 min x STT price.
- B2 (VAD-gated) = user min x 1.5 x STT price.
- C1 (cloud TTS, no cache) = app chars x price. C2 (cached) = app chars x (1 - cacheable share) x price. The one-time cache fill (about 400 phrases x 15 chars = 6,000 chars, about $0.09 at $15/M, per voice) is ignored.
- D combines one STT row and one TTS row. E: `gpt-realtime-mini`, turn-gated = 600 tokens/min x user min x $10/M + (app chars / 330) x 1,200 tokens/min x $20/M + $0.02 context overhead [E]; open mic bills 30 min of input and +$0.05 overhead.
- Free tiers are **ignored** (they are per account; a single personal user would sit inside Azure's 5 h STT and 0.5M chars, Google's 1M chars, which would make several rows $0).

### 3.1 Cost per session, per month and per 1,000 MAU

"Month" = 30 sessions at the blended mix. "1,000 MAU" = 1,000 users x 30 sessions.

| Combination | Work | Travel | Coach | Blend / session | Month (1 user, daily) | 1,000 MAU / month |
| --- | --- | --- | --- | --- | --- | --- |
| **A. on-device STT + on-device TTS + cloud LLM (current plan)** | $0.0027 | $0.0041 | $0.0022 | **$0.0030** | **$0.09** | **$91** |
| B1 continuous cloud STT, Soniox ($0.002/min) | $0.063 | $0.064 | $0.062 | $0.063 | $1.89 | $1,891 |
| B1 continuous, Deepgram ($0.0077/min) | $0.234 | $0.235 | $0.233 | $0.234 | $7.02 | $7,021 |
| B1 continuous, Google Chirp 3 ($0.016/min) | $0.483 | $0.484 | $0.482 | $0.483 | $14.49 | $14,491 |
| B2 VAD-gated, Soniox | $0.012 | $0.018 | $0.013 | $0.014 | $0.42 | $421 |
| B2 VAD-gated, Deepgram | $0.037 | $0.056 | $0.043 | $0.045 | $1.36 | $1,361 |
| B2 VAD-gated, Google Chirp 3 | $0.075 | $0.112 | $0.086 | $0.091 | $2.73 | $2,731 |
| C1 cloud TTS, no cache, Azure ($15/M) | $0.063 | $0.042 | $0.025 | $0.043 | $1.29 | $1,291 |
| C2 cloud TTS, cached, Azure | $0.012 | $0.036 | $0.011 | $0.020 | $0.59 | $590 |
| C1 no cache, Google Chirp 3 HD ($30/M) | $0.123 | $0.079 | $0.047 | $0.083 | $2.49 | $2,491 |
| C2 cached, Google Chirp 3 HD | $0.021 | $0.068 | $0.020 | $0.036 | $1.09 | $1,088 |
| C1 no cache, ElevenLabs Flash ($40/M) | $0.163 | $0.104 | $0.062 | $0.110 | $3.29 | $3,291 |
| C2 cached, ElevenLabs Flash | $0.027 | $0.089 | $0.026 | $0.047 | $1.42 | $1,421 |
| D-low: gated Soniox STT + cached Azure TTS | $0.021 | $0.050 | $0.022 | $0.031 | $0.92 | $920 |
| D-mid: gated Deepgram STT + uncached Azure TTS | $0.097 | $0.094 | $0.065 | $0.085 | $2.56 | $2,561 |
| D-high: continuous Google STT + uncached ElevenLabs | $0.643 | $0.584 | $0.542 | $0.590 | $17.69 | $17,691 |
| E1 `gpt-realtime-mini`, turn-gated | $0.329 | $0.229 | $0.150 | $0.236 | $7.08 | $7,078 |
| E2 `gpt-realtime-mini`, open mic | $0.521 | $0.412 | $0.339 | $0.424 | $12.72 | $12,718 |

Reading the table:
- On-device speech costs **$0** and the whole product is **about $0.003 per session** (LLM only).
- **Continuous cloud STT is 4-17x worse than VAD-gated** (Soniox $0.063 vs $0.014 per session; Google $0.48 vs $0.09). Gating is mandatory if cloud STT is used at all. The cheapest cloud STT (Soniox, gated) is still **about 4.7x** the whole current-plan cost.
- Cloud TTS adds $0.011-0.16 per session. Caching removes 40-85% in Work Partner and Voice Coach, but only about 14% in Travel Guide because narrations are unique.
- Voice quality is the only reason to pay for cloud TTS; no row buys a latency win for STT.
- Realtime speech-to-speech is the most expensive and also weakens the "LLM proposes, engine commits" rule (technical-decisions.md section 5.3). Reference only.
- **A cheap targeted cloud STT fallback** (per utterance, only low-confidence finals, journal re-transcription): about 10 utterances x 5 s = 0.83 min at $0.003/min (`gpt-4o-mini-transcribe`) = **$0.0025 per session**, or at most +$0.07/month. This is the sensible cloud-STT use.

## 4. Latency Budget for One Voice Turn

### 4.1 Measured network (this PC in Korea, wired, 2026-11-04, 10 samples each)

Method: `curl -w` to `https://<host>/`, unauthenticated, so a 404/421 reply is expected; no paid or authenticated request was sent. TCP = time to connect, which includes DNS (small). TLS = handshake only. TTFB = time to first byte after the handshake (an unauthenticated 404; an edge or origin dummy reply, so it is only a rough floor for a real API). Median / p90, ms.

| Host | Resolved to | DNS | TCP connect | TLS | TTFB after TLS | Reading |
| --- | --- | --- | --- | --- | --- | --- |
| `api.anthropic.com` | 160.79.104.10 | 1 / 1 | 3 / 3 | 9 / 10 | 4 / 5 | ICMP RTT 1.7 ms: terminates at a very near edge. The reply is edge-served, so the real RTT to the US origin is not shown |
| `api.openai.com` | 162.159.140.245 (Cloudflare) | 0 / 1 | 2 / 3 | 8 / 9 | 4 / 5 | ICMP RTT 1.8 ms; edge only, same caveat |
| `generativelanguage.googleapis.com` | 172.217.119.4 | 1 / 2 | 32 / 34 | 41 / 43 | 72 / 107 | |
| `speech.googleapis.com` | 172.217.209.95 | 1 / 1 | 35 / 36 | 49 / 50 | 81 / 83 | ICMP RTT 34 ms |
| `texttospeech.googleapis.com` | 172.217.114.4 | 1 / 2 | 34 / 35 | 41 / 42 | 72 / 74 | |
| `koreacentral.tts.speech.microsoft.com` | 20.194.74.79 | 10 / 14 | 13 / 25 | 7 / 9 | 7 / 9 | Seoul-region; the lowest real latency of the speech vendors |
| `koreacentral.stt.speech.microsoft.com` | 20.41.65.201 | 4 / 12 | 7 / 15 | 7 / 8 | 3 / 8 | Seoul-region |
| `api.elevenlabs.io` | 34.8.184.191 | 3 / 4 | 5 / 6 | 44 / 46 | 178 / 313 | near edge, slower origin dummy reply; ICMP RTT 2.2 ms |
| `api.deepgram.com` | 66.103.225.58 | 6 / 7 | 149 / 154 | 149 / 153 | 144 / 147 | about 150 ms RTT: US host, no near edge |
| `stt-rt.soniox.com` | 104.18.23.191 (Cloudflare) | 1 / 1 | 2 / 3 | 7 / 10 | 208 / 520 | edge TCP is near; the 208 ms reply suggests a US origin behind it |
| `api.soniox.com` | 3.229.145.243 (AWS us-east) | 5 / 13 | 202 / 210 | 201 / 203 | 195 / 200 | about 200 ms RTT |
| `api.assemblyai.com` | 44.238.196.108 (AWS us-west) | 5 / 19 | 144 / 168 | 139 / 162 | 136 / 158 | about 140 ms RTT |
| `clovaspeech-gw.ncloud.com` | 115.85.176.21 | 5 / 14 | 9 / 18 | 7 / 10 | 1004 / 1005 | Korean network, near; the exact 1.0 s reply looks like a gateway timeout rule for unauthenticated calls, not a latency |
| `naveropenapi.apigw.ntruss.com` | 110.234.4.8 | 4 / 6 | 138 / 151 | 138 / 145 | 134 / 140 | 138 ms: this gateway is not Seoul-near from this network |
| `openapi.vito.ai` (RTZR) | 54.116.182.28 | 8 / 8 | 11 / 11 | 10 / 10 | 4 / 4 | ~10 ms RTT; only 2 of 10 samples finished before the report was written, so treat as indicative |

What this means for a phone:
- Add about **20-50 ms** per round trip on LTE and about 5-20 ms on good Wi-Fi [E]; p90 on a walking LTE connection can add 100 ms or more [H].
- A cold connection costs DNS + TCP + TLS: about **60 ms** for Azure koreacentral, about **130 ms** for Google, about **300-450 ms** for Deepgram, AssemblyAI and Soniox's US API (3 round trips at 140-200 ms). A persistent WebSocket or HTTP keep-alive (HTTP/2) avoids this on every turn; plan to hold one warm connection per active vendor during a session. Reconnect after Android Doze or a handover is a real extra cost [H].
- Hosts that terminate at a near edge (Anthropic, OpenAI, ElevenLabs, Soniox realtime) have a fast TCP/TLS but unknown origin latency. **The 3-9 ms numbers say nothing about model latency**; the origin-side p50 must be measured with real keys.
- Seoul-region vendors (Azure koreacentral, Google asia-northeast3 for TTS) give the best network floor; most STT specialists are US-hosted with 140-200 ms RTT.

### 4.2 Stage assumptions (all [E] unless noted)

p50 / p90 in ms. Replace these with measured values when available; totals add p50 and combine p90 by root-sum-of-squares of the spreads.

| Stage | Value | Basis |
| --- | --- | --- |
| On-device STT, end of real speech to final | 700 / 950 | the task's 600-900 ms estimate: 500-800 ms trailing-silence endpoint; final arrives with the end event (SPIKE.md) |
| Cloud STT, Seoul-hosted (Azure koreacentral, Google Tokyo/Seoul edge) | 650 / 900 | endpoint rule 300-500 ms (cannot be too short or commands are cut) + 120-250 ms uplink, decode, return |
| Cloud STT, US-hosted (Deepgram, Soniox API, AssemblyAI) | 800 / 1,100 | same + one 140-200 ms round trip for the final |
| Tier 0 parse and commit | 20 / 40 | technical-decisions.md 4.2 target |
| LLM Tier 2, non-streaming JSON of about 150 tokens, via the Worker | 1,400 / 2,300 | Haiku-class time to first token about 0.5 s + 150 tokens + an RTT to a US origin; **not measured, the largest uncertainty**; to be replaced by the llm-sim cloud bake-off |
| LLM first sentence of a streamed narration | 900 / 1,400 | TTFT + about 25 tokens |
| TTS: cached WAV clip played from a pre-built `AudioTrack` | 50 / 80 | pacing player; not a network cost |
| TTS: Supertonic live, ack of about 1.5 s audio | 600 / 900 | RTF 0.35 x 1.5 s + overhead; consistent with measured 1.75-1.86 s for 5 s |
| TTS: Supertonic live, reply of about 3 s | 1,050 / 1,400 | RTF 0.35, not streamed [measured RTF] |
| TTS: Supertonic live, first sentence of a narration (about 2.5 s audio) | 900 / 1,300 | same; a long text unsplit would be 0.35 x 45 s = 16 s, so splitting is mandatory |
| TTS: Google platform | 200 / 350 (ack), 250 / 400 (reply) | measured 0.1-0.35 s |
| TTS: Azure koreacentral, warm connection | 250-300 / 400-500 | network floor 7 ms + first-chunk synthesis; vendor leaderboard about 200 ms in the US [3P] |
| TTS: ElevenLabs Flash from Korea, warm connection | 350-380 / 600-650 | 75 ms [MC] to 296 ms [3P benchmark] + a US-origin round trip |

### 4.3 Results: time from end of real speech to first reply audio, p50 / p90 (ms)

| Combination | Deterministic command ("건너뛰어") | LLM-routed request | Travel narration start |
| --- | --- | --- | --- |
| 1. On-device STT + Supertonic live | 1,320 / 1,711 | 3,170 / 4,168 | 2,520 / 3,208 |
| **1b. On-device STT + cached clip (ack)** | **770 / 1,023** | n/a (reply is not cacheable) | n/a |
| 1c. On-device STT + Google platform TTS | 920 / 1,212 | 2,370 / 3,316 | 1,920 / 2,499 |
| 2. Seoul cloud STT + Supertonic | 1,270 / 1,661 | 3,120 / 4,118 | 2,470 / 3,158 |
| 2b. US cloud STT + Supertonic | 1,420 / 1,845 | 3,270 / 4,281 | 2,620 / 3,327 |
| 3. On-device STT + Azure TTS | 970 / 1,262 | 2,400 / 3,350 | 1,920 / 2,514 |
| 3b. On-device STT + ElevenLabs Flash | 1,070 / 1,424 | 2,500 / 3,473 | 2,000 / 2,621 |
| 4. Azure STT + Azure TTS (both Seoul) | 920 / 1,212 | 2,350 / 3,300 | 1,870 / 2,464 |
| 4b. US STT + ElevenLabs | 1,170 / 1,561 | 2,600 / 3,587 | 2,100 / 2,743 |

Against the 4.2 targets in technical-decisions.md (deterministic <= 1.0 s, LLM-routed <= 2.0 s): only the **cached-clip** path meets the first; **no** combination meets the second at these LLM estimates. The LLM stage (1.4 s) dominates the LLM-routed turn, and no speech vendor changes it. Mitigation is in the LLM design (short filler/earcon at 700 ms as already planned in 5.5, streaming the confirmation sentence, smaller output), not in the speech vendor.

### 4.4 Where cloud wins, where it loses

**Wins**
- *TTS first audio for anything that cannot be cached.* Cloud streaming TTS first audio about 250-380 ms vs Supertonic 0.6 s (ack), 1.05 s (3 s reply), 0.9 s (narration first sentence), and 1.75-1.86 s for a 5 s unsplit sentence. The gain is **0.3-0.7 s** for acks and replies and about 0.5-0.6 s for narration starts. The cloud has no RTF ceiling on long sentences.
- The cloud TTS voices are natural and consistent in quality; the user called Supertonic "a bit awkward" [technical-decisions.md 4.5].
- Gap-free long narration is easier: after the first sentence, Supertonic at RTF 0.35 stays ahead of playback (3x real time), so the chunked on-device path also does not stall; the cloud advantage is only the first chunk.

**Loses**
- *Cloud STT is not faster.* Endpointing dominates both (about 400-800 ms), and the cloud adds a network leg (Seoul 7-40 ms, US 140-200 ms RTT plus LTE). Net: cloud STT is **-50 ms to +100 ms** vs on-device and clearly worse for US-hosted vendors on LTE.
- *Network round trips and cold connections* (section 4.1): first turn after idle or after a handover costs 60-450 ms extra unless a warm socket exists.
- *Dead zones while walking*: tunnels, underpasses, elevators, subway stations and the edge of a park. See section 5.
- *Hands-free listening cost and privacy* (sections 3 and 5).
- *Mic ownership*: on Android a network STT client must stream raw PCM from the app's own recorder, so the app owns the mic and needs its own VAD, endpointing and echo control, whereas platform STT does that already (SPIKE.md half-duplex notes).

## 5. Other Factors

- **Offline and poor signal (walking).** On-device STT and TTS work in tunnels; Tier 0 commands, timers and pacing keep working with no network. With cloud STT/TTS, "skip", "pause" and timer acks fail exactly when LTE drops, and you need a second engine anyway (platform STT, Google platform TTS) behind a timeout. The LLM tier is already cloud, so only Tier 2 requests degrade today. Rule: **never put a cloud call on the path of a Tier 0 command.**
- **Battery.** A continuous mic stream over the radio keeps the modem in a high-power state: 30 min x 16 kHz PCM (about 32 KB/s, about 58 MB per session at 16-bit uncompressed; about 7 MB with Opus) [E]. VAD gating cuts the uplink by about 85% (4/30 min), but VAD itself runs on-device either way. On-device STT is SODA on the NPU/DSP path; the cost is on-device inference, not radio. Supertonic live synthesis spends CPU (RTF 0.35 means about 35% of one core's time per second of speech) [E]. **Neither is measured**; the SPIKE.md `battery` events during the planned 30-minute walk are the measurement plan. [H]: continuous cloud streaming costs more battery than gated on-device STT; gated cloud STT is similar.
- **Privacy.** Continuous upload sends room audio, bystanders and journal content to a third party; VAD gating limits it to speech segments; on-device keeps raw audio on the phone, and only text reaches the LLM. For a personal-use product this is a preference, not a blocker, but a store listing or a shared-user release would need data-processing terms for each vendor [H].
- **Korean quality.** Platform STT is "good with occasional word-choice errors (리조트 vs 리조또)"; the n-best + LLM alignment flow (5.5) addresses this at about $0.001-0.01/session. A cloud STT with custom vocabulary (Deepgram keyterms $0.0013/min [3P], Google adaptation, Soniox context [E]) can fix domain words (poomsae terms, dish names) but no vendor publishes Korean WER on our domain; no accuracy claim here is verified. **Needs a bake-off on recorded fixtures.** Cloud TTS Korean voices (Azure, Google Chirp 3 HD, CLOVA) are likely more natural than Supertonic [H].
- **Voice consistency.** The user chose a Supertonic voice by listening. Mixing it with a cloud voice inside one session (cached clips in Supertonic, narration in Azure) would make a noticeable identity switch [H]. Options: use cloud TTS for **all** speech (then cached clips come from the same cloud voice, pre-rendered once, and caching terms must permit it [U]), or keep Supertonic for all speech. Do not alternate per utterance type. A Travel-only cloud narrator, with an explicit "narrator" voice, is the one defensible exception because Travel has the fewest cached clips (15%).
- **Licensing and terms.** Cloud TTS output caching/replay terms are not checked for any vendor above [U]; check before relying on cached cloud clips. Supertonic's OpenRAIL-M restrictions (technical-decisions.md 4.5) stay.

## 6. Recommendation

| Component | Work Partner | Travel Guide | Voice Coach |
| --- | --- | --- | --- |
| **STT** | **On-device (platform)**. 0 cost, 700 ms p50, no network on the command path | **On-device**. Tier 0 commands are few; offline-safe while walking | **On-device**. Pitch is DSP; speech is commands |
| **STT fallback** | per-utterance `gpt-4o-mini-transcribe` or Deepgram only for low-confidence finals and journal re-transcription: $0.0025/session | same | same |
| **TTS, pacing/cues** | cached Supertonic clips (50 ms, $0) | cached Supertonic clips, Google platform TTS for uncached urgent cues (200 ms) | cached clips + live Supertonic |
| **TTS, replies and acks** | Supertonic live (600 ms ack); Google platform if the reply must be immediate | Supertonic sentence-by-sentence, first sentence short | Supertonic |
| **TTS, long narration** | n/a | Supertonic, split at sentence boundaries, **first sentence <= 2 s of audio** (first audio about 0.7-0.9 s). Cloud only if the switching condition below holds | n/a |

Numbers behind it: current plan = **$0.003/session, $0.09/month, $91 per 1,000 MAU**. The cheapest full-cloud alternative (gated Soniox + cached Azure) is **$0.031/session, $0.92/month, $920 per 1,000 MAU**, i.e. 10x more, for a TTS first-audio gain of 0.3-0.7 s and an STT gain of about zero.

**Switching conditions** (what measurement would change this):
1. **Cloud STT for the main path** only if the n-best + alignment flow (5.5) still misreads more than about 5% of Tier 0 utterances on real-use fixtures **and** a cloud vendor with custom vocabulary cuts that error rate by at least half **and** the VAD-gated cost stays under about $0.05/session. If so, start with gated Soniox ($0.014/session) or Deepgram ($0.045), Seoul-region only if an equivalent exists.
2. **Measure end-of-real-speech to final on-device.** If the SODA endpoint is over 1.0 s p50 on the S25, cloud streaming STT with 300 ms endpointing (about 650-800 ms) becomes latency-competitive; below 800 ms, it never is.
3. **Cloud TTS for Travel narration** if Supertonic's first-sentence first-audio exceeds 1.2 s p50 on the S25 with the screen off and a walk-time CPU load, **or** the user rejects the voice during dogfooding. Candidate: Azure koreacentral warm connection (about 250-300 ms p50 and $0.01-0.04/session for 1,800 narration characters, within a 0.5M chars/month free tier for a single user) if its measured p50 TTFB from the phone is under 400 ms; otherwise Google Chirp 3 HD in `asia-northeast3` ($30/M). Switch the whole voice for all speech, or keep Supertonic for the cached clips only if the user accepts two voices.
4. **Cloud TTS for all speech** only if the user's voice preference changes and the vendor's terms allow cached clips and replay.
5. **Realtime speech-to-speech** only for an optional free-conversation mode; stay away from the Work Partner counting loop (E1/E2 are $0.15-0.52 per session).

Open measurements, in order of value: (1) LLM Tier 2 p50/p90 from the phone through the Worker (the 1.4 s estimate dominates the LLM-routed turn); (2) on-device end-of-speech to final; (3) Supertonic first-audio for 1.5/3/2.5 s texts under walking load; (4) battery over a 30-min screen-off walk; (5) Azure koreacentral TTS and Google asia-northeast3 TTS TTFB from LTE, with a real key; (6) recheck the Google, Azure, CLOVA and RTZR prices in the vendor consoles.

## 7. Reproducing the Numbers

The cost formulas are in section 3; the stage table is in section 4.2. The cost table was produced by a short script from the section 1 parameters (not committed); the network samples used `curl -s -o /dev/null -w "%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}"` against each host, 10 times with 0.3 s spacing, from a wired PC in Korea on 2026-11-04. This PC's RTT is not a phone's RTT: it has no radio latency and may use a different peering path than the user's carrier.
