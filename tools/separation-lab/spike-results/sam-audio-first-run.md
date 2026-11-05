# SAM Audio: first real runs (2026-11-05)

Hardware: RTX 4090 (24 GB), 29 GiB of system RAM shared with other apps.

Clip: `US-2.1/clip1`. This is a synthetic toast: one LibriSpeech speaker with heavy reverb, mixed with music and 6-speaker crowd babble at 16 kHz. The target is the speaker. The text prompt was `"speech"`. The babble is also speech, which makes this a hard case for a text prompt. The numbers are from one clip, so read them as a smoke test, not a benchmark.

## Loading and memory

- **Fix 1.** Upstream `SAMAudio.from_pretrained` fails with `huggingface_hub` 2.x because of the `proxies`/`resume_download` kwargs. We download the snapshot ourselves and build the model ourselves.
- **Fix 2.** Upstream loading builds the model on the CPU in fp32 and then loads a full CPU copy of the checkpoint. The first attempt reached about **14.6 GB RSS** and the OOM killer ended the session.
  - Our loader instead builds the modules directly on CUDA (this needs `accelerate`) and memory-maps `checkpoint.pt`.
  - Peak RSS is now **6.1 GB (small)** and **8.5 GB (large)**.
  - Every run happens inside `systemd-run --user --scope -p MemoryMax=12–14G -p MemorySwapMax=0`.
- **Rankers are disabled unless needed.**
  - The visual ranker is ImageBind, which is **CC BY-NC-SA 4.0 (non-commercial)** and must stay off in the product.
  - The text ranker (LAION-CLAP plus `facebook/sam-audio-judge`) loads only when `reranking_candidates > 1`. The judge is a separately gated repository under the SAM License. The LAION-CLAP weight licence has not been checked yet.
- **The span predictor (`pe-a-frame-large`) is skipped** unless `predict_spans` is on. Its licence has not been checked yet.

## Speed, VRAM and quality

| Model / precision | 10 s | 20 s | 30 s | 45 s | 60 s |
|---|---|---|---|---|---|
| small, fp32 | 1.6 s, 8.3 GB, SI-SDRi 5.2 | n/a | 2.1 s, 13.6 GB, 5.7 | n/a | CUDA OOM |
| small, bf16 autocast | 1.4 s, 7.3 GB, 5.9 | n/a | 1.6 s, 10.7 GB, 5.2 | 2.4 s, 13.2 GB, 4.8 | 3.4 s, 15.7 GB, 4.2 |
| large, fp32 weights + bf16 autocast | 2.5 s, 16.7 GB, 8.1 | 2.3 s, 18.4 GB, 7.3 | CUDA OOM | n/a | n/a |
| large, bf16 weights (DiT + vision) + autocast | 2.1 s, 9.8 GB, 8.5 | n/a | 3.1 s, 13.2 GB, 7.4 | 4.7 s, 15.7 GB, 7.1 | CUDA OOM (after the earlier runs in the same process) |

Each cell gives processing time, peak GPU memory, and SI-SDR improvement in dB.

- **Speed is not the bottleneck.** The real-time factor is about 0.05–0.25, so a 1-hour file takes minutes.
- **VRAM is the bottleneck.** Peak memory grows by roughly 0.17 GB per second of audio. The plan is to process in chunks: about **30 s for large** with bf16 weights, and **45–60 s for small** with bf16 autocast, each with crossfaded overlap.
- **Large beats small by about 2–3 dB** SI-SDRi on this clip.
- **bf16 does not visibly reduce quality** on this clip.

## Target plus residual is not the input

The SI-SDR of `target + residual` measured against the input is only about **7–9 dB**, with a maximum absolute difference of about 0.2–0.5. The residual is generated separately; it is not computed by subtraction.

Consequences for the targets-plus-others model:
- The sequential strategy does not sum back to the input.
- To recombine exactly, use **others = mix − Σ targets** (parallel).
- The model's own residual may sound cleaner, so the demo offers both versions and they get compared by listening.

## Next

- Chunk identity across 30 s windows: does the target stay the same person or instrument from window to window?
- Span prompts for voice-against-voice cases (US-1.x, US-3.1, US-6.1), using the pyannote segments.
- Instrument prompts (US-7.1).
- Music removal that keeps effects (US-4.1).
- The `-tv` models with visual prompts. The `large-tv` download was interrupted and must be resumed on its own, not while a model is running.
