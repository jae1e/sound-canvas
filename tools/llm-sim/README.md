# llm-sim: eval, scenarios and a local stand-in for the LLM tier

Direction (2026-11-04): the app does **not** bundle a model runtime. Language understanding goes through the Cloudflare Worker `/llm` route to a cloud model (first adapter: Anthropic `claude-haiku-5-5`), unless an OS-provided model such as Gemini Nano turns out to be usable. This directory holds the tools that make that tier testable without a phone and without spending money:

- `eval/`: 174 labelled cases for the five tasks, a scorer and a report writer.
- `scenarios/`: four scripted end-to-end sessions on the real controllers.
- `src/transports.ts`: the backends the eval and scenarios can use (`anthropic`, `worker`, `llama-server`, `fake`).
- `scripts/`, `models.json`: an optional, free, offline **stand-in**: llama.cpp + one local GGUF. It exists so the harness and prompts could be exercised here; it is not the product path and is not being expanded.
- `results/`: committed markdown summaries (`<label>/summary.md`, `scenarios-<label>.md`). Raw per-case JSON (`results.json`) is also kept; each is well under 1 MB.

The shared code is `packages/llm` (`@vlc/llm`): the `LlmBackend` interface, the five tasks (prompt builder, output JSON schema, validator that maps to session-engine / travel types), routing and the fake-backend unit tests. The Worker route is in `services/worker/src/providers/llm.ts`; the app side is `apps/mobile/src/llm/`.

## What the tasks do

| Task | Input | Validated output |
| --- | --- | --- |
| `align` | n-best list, language, session context (open tasks, timers, current step) | action (engine `Action` or routine command), `confidence`, `needsConfirmation`, `confirmQuestion`. Names must occur in the heard text or the context; hard-to-undo actions and n-best disagreement on a number or unknown label always ask |
| `command` | one free-form utterance + context (`work` or `routine` mode) | `action`, `clarify` (with a question) or `not_command` |
| `routine_setup` | free-form routine description | a `RoutineTemplate` that passes the engine's zod schema, assumptions, optional confirmation question |
| `correction` | note + routine (movements in the user's language) + practice context | target (movement / item / routine, with real ids), side, body part, cues in ko and en |
| `travel_qa` | question + landmark name + source text | grounded answer, or the fixed "the source doesn't say" line. The model must quote a supporting sentence; the quote must occur in the source and every number in the answer must occur in the source or question, otherwise the answer is replaced by the fixed line |

The engine stays authoritative: a rejected output is never applied, the app falls back to the deterministic path or asks the user to repeat. The model never sees or sets engine state.

## Run the eval with your Anthropic key (no cost until you do this)

```bash
export ANTHROPIC_API_KEY=sk-ant-...        # in your shell only; never in a file in the repo
cd tools/llm-sim
pnpm eval -- --backend anthropic --label haiku-5-5            # all 174 cases, 4 in parallel
pnpm eval -- --backend anthropic --label haiku-5-5 --tasks align,command --limit 40   # cheaper subset
pnpm scenarios -- --backend anthropic --label haiku-5-5
```

Options: `--model claude-haiku-5-5` (default; or set `LLM_MODEL`), `--tasks a,b`, `--limit N` (every k-th case), `--concurrency N`, `--label` (output folder name). Results land in `results/<label>/summary.md` and `results.json`. A full run is 174 calls, about **$0.03** at the estimates below.

Other backends: `--backend worker --url https://<worker>.workers.dev` with `VLC_WORKER_TOKEN` set (tests the deployed route, including its latency); `--backend llama-server --url http://127.0.0.1:8080` (local stand-in); `--backend fake` (a do-nothing model that checks the harness: it passes only the out-of-scope cases).

The eval calls the model through the same prompt and schema the Worker uses, and the same validators the app uses, so a pass here is a pass in the product. The Worker `/llm` route was tested only against mocked fetch; it has not been deployed or called with a real key.

## Token estimates per call (for cost)

Measured with the local stand-in (Qwen3 tokenizer) over the eval cases. Claude Haiku 5.5 has a newer tokenizer that counts roughly 30% more tokens for the same text [SDK migration notes, not measured here], so the Haiku columns are mean x 1.3 [Est]. Price: $0.10 / $0.50 per million input / output tokens up to 100K prompt tokens [V, Anthropic model table in the SDK reference, 2026-11-04]. Prompt caching is not used (the static prompts are below the minimum cacheable size).

| Task | Prompt tokens (mean, Qwen) | Completion tokens (mean, Qwen) | Haiku est. in / out | Cost per call [Est] |
| --- | --- | --- | --- | --- |
| align | 806 | 52 | 1,050 / 68 | $0.00014 |
| command | 696 | 37 | 905 / 48 | $0.00011 |
| correction | 661 | 76 | 860 / 99 | $0.00014 |
| routine_setup | 671 | 307 | 870 / 400 | $0.00029 |
| travel_qa (fixture source, ~350 tokens of text) | 351 | 32 | 456 / 42 | $0.00007 |
| travel_qa (long source, up to 6,000 characters) | about 2,000 | 32 | about 2,600 / 42 | about $0.00028 |

Cost per call = `in x 0.10e-6 + out x 0.50e-6`. A 30-minute Work Partner session with 15 LLM calls costs about $0.002. Only a fraction of utterances reach the LLM (see scenarios).

## Local stand-in (optional)

Everything is under `tools/llm-sim/.cache/` (gitignored; nothing installed system-wide).

```bash
cd tools/llm-sim
scripts/setup-cuda.sh            # CUDA toolkit via conda into .cache/cuda (this PC has a driver but no toolkit)
scripts/build-llama.sh           # llama.cpp b12098: .cache/build-cuda and .cache/build-cpu
node scripts/models.mjs download qwen3-4b-instruct-2507      # sha256-checked
scripts/server.sh start qwen3-4b-instruct-2507 gpu 8080      # or: cpu 8081 (4 threads, rough phone-class proxy)
pnpm eval -- --backend llama-server --url http://127.0.0.1:8080 --label qwen3-4b-instruct-2507-gpu
scripts/server.sh stop 8080
```

`models.json` lists three candidates (all Apache-2.0 per their model cards, Q4_K_M from unsloth GGUF repos); only **Qwen3-4B-Instruct-2507** was downloaded when the direction changed. Qwen3.5-4B and Gemma 4 E2B are listed but not downloaded. Greedy decoding (temperature 0) and constrained JSON output (`response_format` json_schema) are used.

## Results (local stand-in, 2026-11-04)

Qwen3-4B-Instruct-2507 Q4_K_M, llama.cpp b12098. **This is a 4B local model, not the product model.** It shows how hard the cases are and that the harness works; the Haiku numbers will come from the command above. GPU = RTX 4090, all layers offloaded. CPU = Ryzen 7 7800X3D limited to 4 threads, every third case (58 cases), which is only a rough proxy for a phone.

| Task | Cases | Pass (GPU) | JSON valid | Accepted by validator | Prompt / completion tokens | GPU latency p50 / p95 ms | CPU 4 threads p50 / p95 ms (subset) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| align | 44 | 77% | 100% | 98% | 806 / 52 | 222 / 314 | 5,057 / 8,472 |
| command | 46 | 72% | 100% | 98% | 696 / 37 | 151 / 217 | 3,937 / 6,191 |
| correction | 26 | 38% | 100% | 92% | 661 / 76 | 339 / 408 | 6,831 / 7,402 |
| routine_setup | 26 | 77% | 100% | 92% | 671 / 307 | 1,042 / 2,588 | 19,675 / 117,290 |
| travel_qa | 32 | 97% | 100% | 100% | 351 / 32 | 119 / 294 | 2,602 / 5,664 |
| all | 174 | 74% | 100% | 97% | 652 / 86 | 221 / 1,710 | 5,361 / 25,351 |

CPU pass rate on the subset: 71% overall. Per-task detail checks (exact action, arguments, `askedWhenShould`, `quietWhenShould`, groundedness) are in each `summary.md`.

Findings that matter beyond this model:

- **Constrained output works.** JSON validity was 100% on every run; the remaining rejections are semantic (for example an unknown movement number) and the validator caught them.
- **Small models do not ask for clarification.** `command` asked in 13% of the cases labelled "should ask"; `align` asked in 88% of its confirm cases only after adding a deterministic policy (n-best disagreement on a number or unknown label, hard-to-undo actions, low confidence) around the model. Haiku is expected to do better; the eval measures it.
- **Few-shot examples leak.** With a named example in the prompt, the model answered a different timer with the example's name ("쿠키 5분 타이머" -> "리조또 5분 타이머 맞나요?"). The examples now use neutral names and a validator rejects new labels that the user did not say.
- **Korean failures:** the real note "오른손 먼저 나가야되는데 자꾸 왼손이 나가요" without practice context was attached to an invented movement (should be the form item); notes about an exercise ("스쿼트할 때 무릎이 안으로 모여요") got routine scope instead of the exercise item; "라멘/라면" spelling variants were applied without asking (now caught by the policy); a generated leg routine contained an invented exercise ("고개 숙이 운동").
- **English failures:** a mixed ko/en label kept the English spelling ("ramen" for "라면"); "go back one" became `repeat_from`.
- **`travel_qa` is the best-behaved task** (97%): every unanswerable question got the fixed "doesn't say" line; no invented numbers.

## Scenarios

`results/scenarios-<label>.md` has the four transcripts (heard, path, action, engine state, spoken reply, LLM latency and tokens). Run: `pnpm scenarios -- --backend llama-server --url ... --label ...` (`--only work|routine|taegeuk|travel`).

What they show about where the LLM is needed:

- The device case "리조트 / 리조또 5분 타이머" is **already solved deterministically**: the cooking lexicon contains 리조또, so `chooseHypothesis` picks the right alternative with no LLM call. The same holds for "Pasta / pastor". The LLM is needed for labels the lexicon does not know ("쿠키/쿠기"), where it asks a confirmation question.
- Free-form phrasing ("아까 그 파스타 타이머 2분만 더 늘려줄래"), questions with no answer, and "잠깐 쉬어야겠어요" in a routine go to the LLM; in the scripted cooking session 4 of 9 turns reached the LLM (one more was a local yes/no answer).
- A routine description like "오늘은 하체 위주로 20분 정도" used to parse as a single 20-minute exercise named "오늘은 하체 위주로 정" with no leftovers, so it never reached the LLM; `routineParseNeedsLlm` now catches goal words and sentence-like names.
- Taegeuk 1: the user's right-hand note is attached deterministically (current movement, or the form when nothing is playing). Only a technique name that matches several movements ("아래막기") needs the `correction` task.
- On the CPU proxy every LLM call exceeded the app's 2.5 s budget; the transcript `scenarios-qwen3-4b-instruct-2507-cpu4.md` shows the clean fallback (deterministic result, or "please say it again").

## What transfers to a deployed setup

- **Transfers:** prompts, schemas, validators, routing, the eval set and scoring, the Worker route (apart from real network behaviour), the app's confirmation and fallback logic.
- **Does not transfer:** accuracy numbers of the local 4B model to Haiku (run the eval with your key); GPU and CPU latencies to cloud latency (measure with `--backend worker` from a phone-like network in Korea; the budget is 2.5 s); anything about on-device inference.
- **Not done, by decision:** no model downloads beyond the one stand-in, no Android cross-compile, no phone benchmark, no cloud call by the agent that built this.

## Tests

`pnpm --filter @vlc/llm-sim test` checks the case set (size, language balance, real utterances, tag coverage) and the scorer with the fake backend. `pnpm --filter @vlc/llm test` covers every task with a fake backend; `pnpm --filter @vlc/worker test` covers the route with mocked fetch.
