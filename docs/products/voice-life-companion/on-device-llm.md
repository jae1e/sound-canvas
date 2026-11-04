# On-Device LLM Research: OS-Provided Models First, Cloud API Otherwise

Research date: 2026-11-04. Product: Voice Life Companion. Target phone: Samsung Galaxy S25 (SM-S931N, Android 17). iPhone comes later.

Evidence labels (per repository convention): **[V]** verified fact (read in a primary source on the check date), **[MC]** vendor claim, **[E]** estimate, **[H]** hypothesis, **[U]** unknown or not found. Everything in this file was opened on 2026-11-04 unless a different date is stated.

## 1. Decision

The user's direction (2026-11-04): *if no OS-provided on-device LLM works on the S25 or iPhone without extra code (like Gemini Nano), use a cloud API; do not bundle a model runtime.*

| Platform | OS-provided LLM usable for our tasks? | Decision |
| --- | --- | --- |
| Galaxy S25 (Android) | **No** [V]. The S25 is not on the Gemini Nano "custom generation" (Prompt API) device list. | Use the cloud LLM tier (technical-decisions §5.2). Do not bundle a model. |
| iPhone (iOS 26+) | **Yes, conditionally** [V]. Apple Foundation Models framework, Korean in the Apple Intelligence language list, guided generation and tool calling. Only on Apple Intelligence devices (iPhone 15 Pro and later), with the user having Apple Intelligence enabled. | Optional on-device tier behind a capability check, cloud fallback always. Re-test Korean quality before relying on it. iPhone work is deferred anyway. |

Routing rule to implement: `capability check -> OS LLM if available and the language is supported -> else cloud API`. The deterministic Tier 0 parser stays first on both platforms (technical-decisions §5.1). The cloud tier must therefore be good enough to be the only tier on the S25 (the current development phone).

Consequence for technical-decisions §4.5/§5.1: the "Tier 1: Gemma 4 E2B via LiteRT-LM" and "Qwen3 via ExecuTorch" options become **background only**, not planned work.

## 2. Platform Checks

### 2.1 Galaxy S25 and Gemini Nano (ML Kit GenAI / AICore)

| Question | Answer | Label and source |
| --- | --- | --- |
| Is the S25 on the Prompt API ("direct model access") device list? | **No.** Direct model access and agentic workflows are listed for: `nano-v2` Samsung Galaxy Z Fold7 and Z TriFold only; `nano-v3` Samsung Galaxy S26, S26+, S26 Ultra; `nano-v4` Galaxy Z Flip8, Z Fold8, Z Fold8 Ultra. No S25 entry. | [V] [ML Kit GenAI overview, device support](https://developers.google.com/ml-kit/genai), checked 2026-11-04 |
| Is the S25 supported by any ML Kit GenAI API? | **Yes, only the fixed-purpose "text and image task" APIs**: Image Description, Summarization, Proofreading, Rewriting (Galaxy S25, S25+, S25 Ultra listed). | [V] same page |
| Do those fixed APIs help us? | **No.** Each has a built-in prompt and fixed LoRA: summaries are 1 to 3 bullets, rewriting has predefined styles. They cannot do n-best selection, action mapping, or routine JSON. | [V] [Prompt API page](https://developers.google.com/ml-kit/genai/prompt/android) |
| Prompt API status | **Beta**, "not subject to any SLA or deprecation policy"; "changes may be made that break backward compatibility". | [V] Prompt API page |
| Structured output | Direct model access "emits text output or typed structured output" and can "enforce typed structured schemas". Tool-calling loops via `AgentRunner`. | [V] Prompt API page |
| Korean input and output | **Not documented** on the pages opened. Google says language support varies by device configuration and downloaded models. Nothing says Korean is supported for the Prompt API. | [U] checked 2026-11-04 |
| Quota | AICore enforces a per-app inference quota. Too many requests return `ErrorCode.BUSY` (retry with backoff). `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` exists for long-duration quotas. | [V] ML Kit GenAI overview |
| Foreground only | **Yes.** Inference is permitted only when the app is the top foreground app. A foreground service does not count; it returns `BACKGROUND_USE_BLOCKED`. Bad for a screen-off walking/earbud session. | [V] ML Kit GenAI overview |
| Other limits | Input must fit under ~4000 tokens; avoid outputs over 4K tokens; Android API 26+; not supported with an unlocked bootloader. | [V] [Get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) |
| Samsung's own on-device LLM API for third parties | **None found.** The Samsung developer URL tried (`developer.samsung.com/ai`) returned 404. Web search returned only low-quality secondary sites (a "Galaxy AI Agent SDK" and a "partner portal" claim), none confirmed by a Samsung source. | [U] |
| Google's own recommendation | The Gemma 4 LiteRT model card says AICore/Gemini Nano is the recommended production path "on supported devices". The S25 is not one of them for custom prompts. | [MC] [litert-community/gemma-4-E2B-it-litert-lm](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) |

**Verdict for the S25: NO.** This matches and re-confirms the November 3 note in technical-decisions §1.1. Google says it plans to expand device support [MC], so recheck the device table periodically. Even if the S25 were added, the foreground-only rule, beta status, and undocumented Korean support would still limit it.

### 2.2 iPhone and Apple Foundation Models (iOS 26+)

| Question | Answer | Label and source |
| --- | --- | --- |
| What is it? | The on-device Apple Intelligence language model (about 3B parameters, 2-bit QAT, KV-cache sharing), exposed through the `FoundationModels` framework. No model download or runtime to bundle. Apple updates the model in OS updates; Apple documents three model versions: iOS 26.0 to 26.3, 26.4, and 27.0. | [V] [Apple docs: SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel); [MC] [Apple tech report 2025](https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025) |
| Which devices? | Needs a device that supports Apple Intelligence. The Apple Intelligence page lists iPhone 15 Pro, 15 Pro Max, 16 series (16, 16 Plus, 16e, 16 Pro, 16 Pro Max), 17 series (17, 17e, Air, 17 Pro, 17 Pro Max) and newer. Availability also depends on region and on the user turning Apple Intelligence on; the model may still be downloading (`SystemLanguageModel.Availability` must be checked). | [V] [apple.com/apple-intelligence](https://www.apple.com/apple-intelligence/); [Apple docs](https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models) |
| Korean | **Yes.** Korean is in the Apple Intelligence language list. The model is multilingual; the session throws an unsupported-language error otherwise. Check with `supportsLocale` / `supportedLanguages`. Guardrails apply only to supported languages. | [V] apple.com page and [Apple docs: supporting languages](https://developer.apple.com/documentation/foundationmodels/supporting-languages-and-locales-with-foundation-models). Start date of Korean support not stated on the page opened. |
| Korean quality evidence | Only aggregate multilingual numbers exist. The 2025 report: AFM on-device MMMLU 60.60, MGSM 74.91, versus Qwen-2.5-3B 56.53/64.80, Gemma-3-4B 56.71/74.74, Qwen-3-4B 66.52/82.97. Per-locale human-eval results exist only as a figure (no Korean numbers in text). No independent Korean test found. | [MC] [Apple report, arXiv 2507.13575](https://arxiv.org/html/2507.13575) |
| Guided generation | **Yes.** `@Generable` macro: "strong guarantees that the model generates instances of your type" (Swift structs, constrained decoding). | [V] [Foundation Models overview](https://developer.apple.com/documentation/foundationmodels) |
| Tool calling | **Yes** (`Tool` protocol). Apple says the rebuilt iOS 27 model is better at tool calling. | [V] same page; [MC] [WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/) |
| Context size | **4096 tokens per session on iOS 26.x**, shared by instructions, prompts, tool schemas, `@Generable` schemas, and responses. For CJK, roughly one character per token. **iOS 27: `contextSize` prints 8192** in the WWDC26 session sample. Apple's doc page states no number; read `SystemLanguageModel.contextSize` at runtime. | [V] [TN3193](https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window) (4096); [MC] WWDC26 session 241 (8192) |
| Task fit per Apple | Good: summarization, entity extraction, classification, tags, text understanding. Not suited: basic math, code, logical reasoning, heavy world knowledge. | [V] Apple "Generating content" article |
| Optional cloud model | iOS 27 adds `PrivateCloudComputeLanguageModel` (32K context, reasoning levels, no API key). Apple says apps under 2 million first-time downloads pay no cloud API cost; an entitlement is required. | [MC] WWDC26 session 241. Not yet checked against the entitlement documentation. |

**Verdict for the iPhone: YES, conditionally.** The on-device model is built into the OS, handles short structured output through `@Generable`, and lists Korean. Conditions: Apple Intelligence-capable iPhone (15 Pro or newer), user opt-in, supported region, and a 4096-token session on iOS 26.x (travel Q&A over a long source text will not fit; chunk it or send it to the cloud). Korean accuracy for n-best selection and correction-note parsing is **unmeasured** [H: acceptable for command mapping and routine JSON, weaker for domain-specific Korean]. Plan a Korean eval set before trusting it, and always keep the cloud fallback. The model is not controllable (no pinning; updates change behavior, and Apple documents per-version prompt updates).

### 2.3 Fit against our five LLM tasks

| Task | S25 | iPhone (Foundation Models) |
| --- | --- | --- |
| n-best hypothesis choice | Cloud | Plausible [H]; short prompt; test Korean |
| Free-form command to fixed action set | Cloud | Good fit [H] (`@Generable` enum, tool calling) |
| Routine description to routine JSON | Cloud | Good fit if the schema is small (schema tokens count toward 4096/8192) [H] |
| Correction note to target movement and cue | Cloud | Plausible [H]; Korean domain wording is the risk |
| Travel Q&A grounded in source text | Cloud | Limited by context (4096 on 26.x) |

## 3. Reading List

All items below were opened on 2026-11-04. Numbers are as read. "Abs" means only the abstract page was read, not the full text. Papers are cited for method and trend; most use different phones, so none of these numbers substitutes for measuring on the S25.

| # | Title and link | Date | Takeaway | Key numbers |
| --- | --- | --- | --- | --- |
| 1 | [Blazing fast on-device GenAI with LiteRT-LM](https://developers.googleblog.com/en/blazing-fast-on-device-genai-with-litert-lm/) (Google Developers Blog) | 2026-05-19 | Google's own Gemma 4 E2B numbers across Android, iOS, web. MTP drafters speed decode up to 2.2x. [MC] | GPU decode 52 tok/s Android (OpenCL), 56 tok/s iOS; model 2.58 GB; 607 MB footprint on Apple mobile CPU; tested on S26 Ultra |
| 2 | [Gemma 4 E2B LiteRT-LM model card](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) (Hugging Face) | 2026-11-03 (last modified) | Per-device table incl. Linux RTX 4090 and CPU memory. [MC] | S26 Ultra GPU: 3,808 prefill, 52.1 decode, TTFT 0.3 s, 676 MB RSS; CPU: 557/46.9, TTFT 1.8 s, 1.7 GB; RTX 4090: 11,234/143.4; text-only weights can sit near 0.8 GB with memory-mapped embeddings |
| 3 | [ExecuTorch: A Unified PyTorch Solution to Run AI Models On-Device](https://arxiv.org/html/2605.08195v1) | 2026-05-05 | Independent-style comparison on a Galaxy S25 Ultra (Snapdragon 8 Elite): llama.cpp wins CPU decode, ExecuTorch QNN NPU wins prefill. Authors are the ExecuTorch team [MC]. | CPU Qwen3 0.6B decode: llama.cpp ~99, ExecuTorch ~72.5, ONNX RT ~62, LiteRT ~12 tok/s. Llama 3.2 1B QNN NPU prefill ~2,900, decode ~46.5. Phi4-mini CPU decode ~18 to 23 tok/s, ~2.2 to 2.4 GB |
| 4 | [LFM2 Technical Report](https://arxiv.org/html/2511.23404v1) | 2025-11-28 | S25 CPU table (llama.cpp Q4_0): small models are fast enough for short outputs. Authors are the Liquid AI team [MC]. | S25 decode at 1K ctx: LFM2-1.2B 69.8, Qwen3-1.7B 39.7, Qwen3-4B 17.2, Gemma-3-4B 18.3 tok/s; prefill 335 / 140 / 57 / 72 |
| 5 | [LFM2.5-1.2B-Instruct model card](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct) | 2026-01 | Same-vendor numbers on S25 Ultra and NPU. [MC] | S25 Ultra CPU llama.cpp Q4_0: 335 prefill, 70 decode, 719 MB; ROG Phone 9 Pro NPU (NexaML): 4,391/82, 0.9 GB |
| 6 | [xebench: cross-engine on-device LLM benchmark](https://github.com/a-ghorbani/xebench) (Apache-2.0 harness; powers pocketpal.dev) | 2026 (links dated Oct 2026) | Same model, prompt, device across llama.cpp, ExecuTorch, LiteRT-LM, GENIE-X. No engine wins everywhere; vendor NPU paths are fragile; adb-shell runs report numbers several times too low. | POCO F8 Ultra (8 Elite Gen 5): Gemma 4 E2B CPU LiteRT-LM 259/29.7 vs llama.cpp 130/26.7; llama.cpp Hexagon prefill 9 to 13x CPU (Qwen3 1.7B 2,514 vs 203); ExecuTorch Gemma 4 E2B decode only 4.9 to 6.9 tok/s |
| 7 | [llama.cpp Hexagon NPU backend docs](https://github.com/ggml-org/llama.cpp/blob/master/docs/backend/snapdragon/README.md) | rolling (read 2026-11-04) | Backend is still "experimental". Default `burst` power mode can thermal-throttle; ~3.5 GB virtual address space per NPU session. | Gemma-2-2b Q4_0 ~3,200 prefill / ~47.6 decode; Llama-3.2-1B ~136 to 169 / ~51.5 |
| 8 | [LLM Inference at the Edge: Mobile, NPU, and GPU Performance Efficiency Trade-offs Under Sustained Load](https://arxiv.org/abs/2603.23640) (abs) | 2026-03-24, rev. 2026-06-07 | Sustained load is the problem: phones throttle hard. Qwen 2.5 1.5B 4-bit, 20 iterations. | iPhone 16 Pro lost nearly half its throughput within two iterations; Galaxy S24 Ultra hit an OS-enforced GPU frequency floor that ended inference |
| 9 | [EnerInfer: Energy-Aware On-Device LLM Inference](https://arxiv.org/html/2606.23001v1) | 2026-06-22 | Max NPU/memory clocks give top speed but poor efficiency, and heat the shell fast. Huawei phones, not Android/Qualcomm, so use as directional. | Shell passes 42 C in ~100 s at peak clocks; default stress run 690 tokens in 40 s before the thermal limit; best efficiency setting +62 to 65% tokens/joule; 19.7 vs 32.5 tokens/J (Llama 1.3B Q4) |
| 10 | [The Battery Price of edge AI](https://arxiv.org/abs/2609.11940) (abs) | 2026-07-10 | On-device decode is less energy-efficient than batched server inference. Quantization vs energy is non-monotonic. | About 3x less energy-efficient than batched server inference; 18 configurations, 2 phones; 88 to 90% of on-device carbon impact is embodied device carbon |
| 11 | [MNN-AECS: Energy Optimization for LLM Decoding on Mobile Devices](https://arxiv.org/abs/2506.19884) (abs) | 2025-06-24 | Decode is memory-bound and dominates energy; core selection matters. | 23% energy cut vs MNN; vs llama.cpp/ExecuTorch/mllm/MediaPipe: 39 to 78% less energy, 12 to 363% faster (average, 5 Android + 2 iOS devices) |
| 12 | [When NPUs Are Not Always Faster: A Stage-Level Analysis of Mobile LLM Inference](https://arxiv.org/abs/2605.27435) (abs) | 2026-05-22 | NPU is not a free win: CPU can beat NPU at prefill; NPU helps decode only a little and can cost energy. | CPU up to 1.6x faster prefill; NPU decode only 1.05 to 1.2x; more NPU offload raised energy up to 51% |
| 13 | [MobileAIBench: Benchmarking LLMs and LMMs for On-Device Use Cases](https://arxiv.org/abs/2406.10290) (abs) | 2024-06-12 | Older but the standard framework for quality vs size vs quantization on real devices (iOS app). Dated; use for method only. | No numbers on the abstract page |
| 14 | [Apple Intelligence Foundation Language Models Tech Report 2025](https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025) and [arXiv 2507.13575](https://arxiv.org/html/2507.13575) | 2025-07 | How the OS model is built for phones: ~3B, 2-bit QAT, KV sharing, 150K vocabulary. [MC] | KV-cache sharing cuts KV memory 37.5% and TTFT about 37.5%; vocabulary 100K to 150K; MMMLU 60.60 |
| 15 | [TN3193: Managing the on-device foundation model's context window](https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window) and [WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/) | 2025-26 | The practical limit of the OS model on iPhone is context, not speed. | 4096 tokens per session on iOS 26.x; 8192 shown for iOS 27; about one token per CJK character |

Gaps in the literature found on 2026-11-04 [U]: no peer-reviewed Android battery-per-session study on the S25; no independent Korean-language quality benchmark for any on-device LLM at phone scale; no independent MLC-LLM comparison on the 8 Elite from 2025 to 2026.

## 4. Background: Bundled Models and Runtimes (Not Planned)

Kept so another agent does not repeat the discovery. Per the user's 2026-11-04 decision, none of this is on the plan. If the decision is ever reversed, start from a bake-off over these.

### 4.1 Candidate models (shortlist-level, one row each)

Hugging Face metadata (license tag, file sizes) read 2026-11-04 through the Hugging Face API. Sizes are GGUF file sizes.

| Model | License (key terms) | Korean evidence | Thinking / tools | GGUF repo and size |
| --- | --- | --- | --- | --- |
| Gemma 4 E2B / E4B (Google, 2026) | Apache-2.0 [V: HF tag] | MMMLU 67.4% (E2B), 76.6% (E4B) [MC, model card]; 140+ languages [MC] | Thinking toggled via `<|think|>` in the system prompt, off by default in the HF example; native function calling [MC] | `ggml-org/gemma-4-E2B-it-GGUF`: `gemma-4-E2B-it-Q4_0.gguf` 2.84 GB, `Q8_0` 4.97 GB. `ggml-org/gemma-4-E4B-it-GGUF`: Q4_0 4.59 GB. Large because per-layer embeddings are included; LiteRT-LM `gemma-4-E2B-it.litertlm` is 2.59 GB |
| Qwen3.5 0.8B / 2B / 4B (Alibaba, 2026-03) | Apache-2.0 [V: LICENSE file] | MMMLU 4B 76.1, 2B 63.1, 0.8B 44.3; INCLUDE 4B 71.0 (thinking) [MC]. Kanana's table shows Qwen3.5-2B at KoMT-Bench 5.21 vs Kanana-2-3B 6.92 [MC, rival vendor] | 0.8B non-thinking by default; 4B thinking by default, `enable_thinking=false` disables [MC] | `unsloth/Qwen3.5-2B-GGUF`: Q4_K_M 1.28 GB, Q4_0 1.21 GB, Q8_0 2.01 GB. `unsloth/Qwen3.5-4B-GGUF`: Q4_K_M 2.74 GB. 0.8B: Q4_K_M 0.53 GB |
| LFM2.5 (350M/1.2B/2.6B) and LFM3-1.7B (Liquid AI, 2026-10) | **LFM Open License v1.0**: commercial use allowed only for entities with annual revenue under US$10M; above that, not licensed [V: LICENSE text] | Korean in the language list [V: card]; no Korean benchmark published [U] | LFM3: reasoning on by default, `enable_thinking=False` "can be inconsistent"; XML tool calls [MC] | `LiquidAI/LFM2.5-1.2B-Instruct-GGUF`: Q4_K_M 0.73 GB. `LiquidAI/LFM3-1.7B-GGUF`: Q4_K_M 1.10 GB, Q8_0 1.85 GB |
| Kanana-2 1.3B / 3B (Kakao, 2026-07) | **Kanana Open License**: own-service use is fine, but a separate Kakao license is required to offer or resell the model "embedded in on-device domains" to third parties (section 4.1(iii)); "Powered by Kanana" notice required [V: LICENSE text]. Shipping it inside our own app is a gray area [H: needs written confirmation] | Vendor: 3B base KMMLU 47.92, HAE-RAE 80.66; 3B instruct KoMT-Bench 6.92, IFEval 80.96, BFCL-v3 Live 71.94 [MC] | Tool calling supported in the card [MC] | `mradermacher/kanana-2-3b-instruct-GGUF`: Q4_K_M 2.16 GB (community quant; no official GGUF) |
| HyperCLOVA X SEED Text 0.5B / 1.5B (Naver, 2025-04) | Naver license: separate license needed above 10M monthly active users [V: LICENSE text]; gated repos | Vendor only [U: no benchmarks read] | None found | `naver-ellm/HyperCLOVAX-SEED-Text-Instruct-1.5B-GGUF` Q4_K_M 1.01 GB; 0.5B Q4_K_M 0.43 GB. Also `naver-ellm/functiongemma-270m-it-naver-actions-GGUF` (0.25 GB), a Korean-capable action-mapping fine-tune [U: quality] |
| EXAONE 4.0 1.2B / 4.5 (LG) | **Non-commercial** (EXAONE license 1.2 NC; "expressly prohibited" from commercial products) [V: LICENSE and card] | n/a | n/a | Excluded |
| Mi:dm 2.0 Mini (KT) | MIT [V: HF tag] | Vendor tables incl. KMMLU, Ko-IFEval [MC] | n/a | No official GGUF found [U] |
| Granite 4.2 3B, Ministral 3 3B, SmolLM3 3B, Phi-4-mini | Apache-2.0 / Apache-2.0 / Apache-2.0 / MIT [V: HF tags] | Granite lists Korean among tested languages [MC]; others unverified [U] | Tool support not verified [U] | Granite 4.2 3B Q4_K_M 2.24 GB; Ministral 3 3B Q4_K_M 2.15 GB; SmolLM3 Q4_K_M 1.92 GB |
| Solar (Upstage) | Open models found are 100B/250B scale only | n/a | n/a | Excluded: no small open model [V: HF search] |
| Llama 3.2 1B/3B | Llama community license; not re-read this session [U] | Korean not an officially supported language [H] | n/a | Superseded by the models above |

Tokenizer efficiency for Korean (drives latency): Kakao claims Kanana-2's tokenizer is over 30% more efficient on Korean than the previous generation [MC]; Apple says CJK is roughly one token per character [V: TN3193]; Liquid says its tokenizer is tuned for Korean among seven languages [MC]. No independent tokens-per-Korean-sentence comparison found [U].

### 4.2 Runtimes (one line each)

| Runtime | License | Notes (Snapdragon 8 Elite) |
| --- | --- | --- |
| llama.cpp (GGUF) | MIT | Runs the same GGUF on the Linux RTX 4090 and the phone. CPU path is strong (S25 Ultra decode ~99 tok/s for Qwen3 0.6B) [MC, ExecuTorch paper]. OpenCL Adreno backend verified on Adreno 750/830 etc. with Q4_0, Q8_0, Q4_K [V: docs]. Hexagon NPU backend is "experimental" [V: docs]. Grammar and JSON-schema constrained output built in (known feature; not re-checked this session). |
| LiteRT-LM v0.19.0 | Apache-2.0 | Android (Kotlin), Linux, macOS, Windows, iOS preview, web; runs Gemma 4, Qwen, Phi-4, Llama families; constrained decoding and tool use [V: GitHub page]. Linux RTX 4090 GPU row exists on the Gemma 4 card [MC]. NPU paths are vendor- and device-fragile per xebench [MC]. |
| ExecuTorch / react-native-executorch | BSD-style (not re-read) | XNNPACK CPU, Vulkan GPU, QNN NPU; export quality varies by model (Gemma 4 E2B export slow in xebench) [MC]. |
| MLC LLM, ONNX Runtime GenAI, Qualcomm Genie / AI Hub | Not re-checked this session [U] | ONNX RT was ~2x slower than llama.cpp on S25 Ultra CPU for Qwen3 0.6B [MC, ExecuTorch paper]; Genie needs Qualcomm-compiled bundles per SoC. |

Practical read: llama.cpp CPU is the lowest-risk bundled runtime and the only one that matches "same file on PC and phone". That is background only now.

### 4.3 Downsides of bundling (why the cloud route is reasonable) [E unless marked]

- **App size and download:** 0.7 to 3 GB per model on top of Supertonic (~145 MB) and the STT model. Gemma 4 E2B alone is 2.6 to 2.8 GB [V]. Play Store base limit and mobile-data downloads need a separate on-demand download flow.
- **RAM pressure:** a 1 to 3 GB model resident next to STT and TTS on a 12 GB phone (RAM figure for the S25 not re-verified in this session [U]; Samsung's S25 spec is 12 GB). Android may kill the app in the background. Gemma 4 E2B CPU peaks near 1.7 GB RSS, GPU 0.7 GB [MC].
- **Battery and thermals:** sustained inference throttles phones within seconds to minutes (reading list items 8, 9) [V: papers]. Short structured outputs (tens of tokens) limit the exposure, but TTS plus STT plus GPS already run in a session [E].
- **Cold load:** loading a multi-GB GGUF into memory takes seconds; only partially hidden by mmap [E; not measured here].
- **Korean quality risk:** sub-4B models have thin Korean knowledge; vendor Korean numbers (KMMLU about 43 to 48 for 1B to 3B class) are far below cloud models [MC/E]. Misparsing a correction note is worse than a 300 to 800 ms cloud round trip [H].
- **License risk:** Kanana (on-device clause), LFM (US$10M revenue), Naver (10M MAU), EXAONE (non-commercial) each carry conditions; only Gemma 4, Qwen3.5, Granite, Ministral, SmolLM3, Phi-4-mini are plain Apache/MIT [V].

## 5. Next Steps

1. Implement the capability-check router with the cloud tier as the only tier on the S25. The cloud candidates and cost envelope are in technical-decisions §5.2 and §5.4.
2. Build a small ko/en eval set for the five LLM tasks (n-best choice, action mapping, routine JSON, correction notes, grounded travel Q&A). It scores both the cloud LLM and, later, Apple Foundation Models on iPhone.
3. Recheck the ML Kit device table (https://developers.google.com/ml-kit/genai) and any Samsung developer announcements every few months; if the S25 appears under direct model access with documented Korean, revisit.
4. Before an iPhone release: measure Apple Foundation Models Korean accuracy and decide how to chunk grounded Q&A under the 4096-token session.

## 6. Sources and Check Dates

All checked 2026-11-04.

- ML Kit GenAI overview and device tables: https://developers.google.com/ml-kit/genai
- ML Kit Prompt API (direct model access): https://developers.google.com/ml-kit/genai/prompt/android and /get-started
- Android Gemini Nano overview: https://developer.android.com/ai/gemini-nano
- Apple Foundation Models: https://developer.apple.com/documentation/foundationmodels, `/systemlanguagemodel`, `/supporting-languages-and-locales-with-foundation-models`, `/generating-content-and-performing-tasks-with-foundation-models`
- Apple TN3193: https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window
- Apple Intelligence devices and languages: https://www.apple.com/apple-intelligence/
- WWDC26 session 241: https://developer.apple.com/videos/play/wwdc2026/241/
- Apple tech report: https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025 and https://arxiv.org/html/2507.13575
- LiteRT-LM: https://github.com/google-ai-edge/LiteRT-LM and https://developers.googleblog.com/en/blazing-fast-on-device-genai-with-litert-lm/
- Hugging Face model cards and LICENSE files read directly: `google/gemma-4-E2B-it`, `Qwen/Qwen3.5-{0.8B,2B,4B}`, `LiquidAI/LFM3-1.7B`, `LiquidAI/LFM2.5-1.2B-Instruct`, `kakaocorp/kanana-2-3b-instruct`, `naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-0.5B`, `LGAI-EXAONE/EXAONE-4.0-1.2B`, `K-intelligence/Midm-2.0-Mini-Instruct`, `ibm-granite/granite-4.2-3b`; GGUF file lists via the Hugging Face API.
- llama.cpp docs: https://github.com/ggml-org/llama.cpp/blob/master/docs/backend/snapdragon/README.md and `/docs/backend/OPENCL.md`
- Papers and benchmarks: see section 3 for links.
- Not verified: Samsung on-device LLM SDK for third parties; Korean support in the Gemini Nano Prompt API; Apple PCC entitlement terms; MLC LLM, ONNX Runtime GenAI, Genie current status.
