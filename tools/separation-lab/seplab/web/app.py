"""Gradio UI for the local web demo. Run with ./run-demo.sh (binds to 127.0.0.1 only)."""
from __future__ import annotations

import argparse
from pathlib import Path

import gradio as gr

from .jobs import WEB_RUNS, job_path, load_job
from .pipeline import (MAX_SECONDS, MAX_SPEAKERS, MAX_TARGETS, OTHERS_CHOICES, PRESETS, BackendManager,
                       JobParams, TargetSpec, make_stems_zip, parse_time, render_mix, run_job)
from .urlimport import BANNER, UrlImportError

N_SLOTS = MAX_SPEAKERS + 2   # speakers (or targets) plus the two others variants
PRESET_CHOICES = [""] + list(PRESETS)


def build_app(manager: BackendManager, backend_kind: str = "sam", max_seconds: float = MAX_SECONDS) -> gr.Blocks:
    def run(upload, url, start, end, split, nspk, model, hq, *rest, progress=gr.Progress()):
        target_fields, others_choice = rest[:3 * MAX_TARGETS], rest[3 * MAX_TARGETS]
        try:
            specs = [TargetSpec(*target_fields[i * 3:i * 3 + 3]) for i in range(MAX_TARGETS)]
            params = JobParams(
                source=Path(upload) if upload else None, url=(url or "").strip(),
                start=parse_time(start), end=parse_time(end), max_seconds=max_seconds, targets=specs,
                speaker_split=bool(split), num_speakers=int(nspk) if nspk else None, model=model,
                higher_quality=bool(hq), backend=backend_kind)
            if params.start is not None and params.end is not None and params.end <= params.start:
                raise ValueError("End time must be after start time.")
            job = run_job(params, manager, progress=lambda f, m: progress(f, desc=m))
        except (ValueError, RuntimeError, UrlImportError, FileNotFoundError) as e:
            raise gr.Error(str(e)) from e
        s = job["stats"]
        gpu = f"{s['peak_gpu_mb'] / 1024:.1f} GB" if s["peak_gpu_mb"] is not None else "n/a"
        stats = (f"**Done.** Audio {s['audio_s']:.1f} s. Processing time {s['total_s']:.1f} s "
                 f"(model load {s['load_s']:.1f} s, separation {s['separate_s']:.1f} s). "
                 f"Chunks: {s['chunks']} (chunk length {s['chunk_s']:.0f} s). "
                 f"Peak GPU memory: {gpu}. Peak process RSS: {s['peak_rss_mb'] / 1024:.1f} GB.")
        if job["notes"]:
            stats += "\n\n" + "\n\n".join(f"Note: {n}" for n in job["notes"])
        updates = []
        for i in range(N_SLOTS):
            if i < len(job["tracks"]):
                t = job["tracks"][i]
                updates += [gr.update(visible=True), gr.update(value=str(job_path(job["id"]) / t["file"]),
                                                                label=t["label"]), 0, False]
            else:
                updates += [gr.update(visible=False), None, 0, False]
        return [job["id"], stats, *updates, None, None, None, None]

    def mix(job_id, others_choice, *vals):
        if not job_id:
            raise gr.Error("Run a separation first.")
        try:
            job = load_job(job_id)
            gains, muted = {}, set()
            for i, t in enumerate(job["tracks"]):
                gains[t["name"]] = float(vals[i])
                if vals[N_SLOTS + i]:
                    muted.add(t["name"])
            out = render_mix(job_path(job_id), gains, muted, OTHERS_CHOICES[others_choice])
        except (ValueError, RuntimeError, FileNotFoundError) as e:
            raise gr.Error(str(e)) from e
        note = " ".join(out["notes"])
        return (str(out["wav"]), str(out["wav"]), str(out["mp4"]) if out["mp4"] else None, note)

    def stems(job_id):
        if not job_id:
            raise gr.Error("Run a separation first.")
        try:
            return str(make_stems_zip(job_path(job_id)))
        except (ValueError, FileNotFoundError) as e:
            raise gr.Error(str(e)) from e

    with gr.Blocks(title="Sound separation demo (v0)") as demo:
        gr.Markdown("# Sound separation demo (v0)\nPull sounds out of a recording with SAM Audio, listen to "
                    "each track, then download the stems or a mix. Local, internal testing build.")
        gr.Markdown(f"**{BANNER}**")
        job_state = gr.State("")

        with gr.Row():
            with gr.Column():
                gr.Markdown("### 1. Input")
                upload = gr.File(label="Upload an audio or video file", type="filepath")
                url = gr.Textbox(label="...or paste a public link (YouTube or any link yt-dlp supports)",
                                 placeholder="https://")
                with gr.Row():
                    start = gr.Textbox(label="Start (optional)", placeholder="0:00 or seconds")
                    end = gr.Textbox(label="End (optional)", placeholder="0:30 or seconds")
                gr.Markdown(f"Cap: {max_seconds / 60:.0f} minutes per job. Link imports download only the "
                            "chosen section. Times below (\"where it sounds\") count from the start of the "
                            "chosen section.")
            with gr.Column():
                gr.Markdown(f"### 2. What to pull out (up to {MAX_TARGETS} targets)")
                rows = []
                for i in range(MAX_TARGETS):
                    with gr.Row():
                        p = gr.Dropdown(PRESET_CHOICES, value="voice/speech" if i == 0 else "",
                                        label=f"Target {i + 1}: preset", scale=2)
                        c = gr.Textbox(label="or describe it (short noun phrase)", placeholder="e.g. dog barking",
                                       scale=2)
                        s = gr.Textbox(label="where it sounds (optional)", placeholder="12-18, 40-45", scale=2)
                    rows += [p, c, s]
                with gr.Row():
                    split = gr.Checkbox(label="Speaker split: one target per detected speaker (pyannote); "
                                              "ignores the targets above")
                    nspk = gr.Number(label="Number of speakers (0 = auto)", value=0, precision=0, minimum=0,
                                     maximum=MAX_SPEAKERS)
                gr.Checkbox(label="Click a face or player in the video to pick the target (coming in v1)",
                            interactive=False)

        with gr.Row():
            model = gr.Radio(["large", "small"], value="large", label="Model")
            hq = gr.Checkbox(label="Higher quality (reranking and span prediction; slower, needs the gated "
                                   "judge model)")
            others_choice = gr.Radio(list(OTHERS_CHOICES), value="others (mix - targets)",
                                     label="Others variant used in the mix (the model residual exists only "
                                           "with one target)")
        run_btn = gr.Button("Separate", variant="primary")
        status = gr.Markdown()

        gr.Markdown("### 3. Listen")
        slot_rows, slot_audio, slot_gain, slot_mute = [], [], [], []
        for i in range(N_SLOTS):
            with gr.Row(visible=False) as r:
                a = gr.Audio(label=f"Track {i + 1}", type="filepath", autoplay=False, interactive=False, scale=4)
                with gr.Column(scale=2):
                    g = gr.Slider(-60, 12, value=0, step=0.5, label="Gain (dB, used in the mix)")
                    m = gr.Checkbox(label="Mute in the mix")
            slot_rows.append(r); slot_audio.append(a); slot_gain.append(g); slot_mute.append(m)

        gr.Markdown("### 4. Mix and download")
        with gr.Row():
            mix_btn = gr.Button("Render mix")
            stems_btn = gr.Button("Download stems")
        mix_note = gr.Markdown()
        with gr.Row():
            mix_audio = gr.Audio(label="Mix preview", type="filepath", autoplay=False, interactive=False)
            mix_wav = gr.File(label="Mix (WAV)")
            mix_mp4 = gr.File(label="Video with the mix (MP4, video input only)")
            stems_zip = gr.File(label="Stems (zip of WAVs)")

        slot_outputs = [c for quad in zip(slot_rows, slot_audio, slot_gain, slot_mute) for c in quad]
        run_btn.click(run, [upload, url, start, end, split, nspk, model, hq, *rows, others_choice],
                      [job_state, status, *slot_outputs, mix_audio, mix_wav, mix_mp4, stems_zip],
                      concurrency_limit=1, concurrency_id="job")
        mix_btn.click(mix, [job_state, others_choice, *slot_gain, *slot_mute],
                      [mix_audio, mix_wav, mix_mp4, mix_note], concurrency_id="light")
        stems_btn.click(stems, [job_state], [stems_zip], concurrency_id="light")
    demo.queue(default_concurrency_limit=1)
    return demo


def main(argv=None):
    ap = argparse.ArgumentParser(description="Local sound separation web demo (binds to 127.0.0.1)")
    ap.add_argument("--port", type=int, default=7860)
    ap.add_argument("--backend", choices=["sam", "filter"], default="sam",
                    help="filter = no GPU, for smoke tests (low/high-pass instead of SAM Audio)")
    ap.add_argument("--max-seconds", type=float, default=MAX_SECONDS)
    a = ap.parse_args(argv)
    WEB_RUNS.mkdir(parents=True, exist_ok=True)
    demo = build_app(BackendManager(), a.backend, a.max_seconds)
    # Local only: never share=True, never a public tunnel. Use SSH port forwarding for remote use.
    demo.launch(server_name="127.0.0.1", server_port=a.port, share=False, allowed_paths=[str(WEB_RUNS)],
                inbrowser=False)


if __name__ == "__main__":
    main()
