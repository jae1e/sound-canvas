"""Job pipeline for the web demo: source preparation, targets, separation, others, mix, stems."""
from __future__ import annotations

import gc
import json
import math
import os
import re
import resource
import shutil
import subprocess
import sys
import threading
import time
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np
import soundfile as sf

from .. import media
from ..audio_io import read_wav, write_wav
from ..separation import ChunkedBackend, FilterBackend, Prompt, SamAudioBackend
from . import urlimport
from .jobs import LAB_DIR, WEB_RUNS, cleanup_jobs, new_job

SR = 48000
MAX_SECONDS = 600.0
MAX_TARGETS = 4
MAX_SPEAKERS = 6
MIN_SPEAKER_S = 1.0     # speakers with less speech than this are ignored
MIN_SEGMENT_S = 0.3     # shorter segments are not used as anchors
OTHERS_DIFF, OTHERS_RESIDUAL = "others_mix_minus_targets", "others_model_residual"
OTHERS_CHOICES = {
    "others (mix - targets)": "diff",
    "others (model residual)": "residual",
    "none (mute others)": "none",
}
PRESETS = {
    "voice/speech": "speech",
    "singing voice": "singing voice",
    "music": "music",
    "drums": "drums",
    "bass": "bass guitar",
    "electric guitar": "electric guitar",
    "acoustic guitar": "acoustic guitar",
    "piano": "piano",
    "sound effects": "sound effects",
    "crowd noise": "crowd noise",
    "applause and laughter": "applause and laughter",
}


# ---------------------------------------------------------------- parsing

def parse_time(text: str | float | int | None) -> float | None:
    """'83', '1:23' or '1:02:03.5' to seconds; empty to None."""
    if text is None or (isinstance(text, str) and not text.strip()):
        return None
    if isinstance(text, (int, float)):
        return float(text)
    parts = text.strip().split(":")
    if len(parts) > 3:
        raise ValueError(f"bad time {text!r}")
    try:
        total = 0.0
        for p in parts:
            total = total * 60 + float(p)
    except ValueError as e:
        raise ValueError(f"bad time {text!r}") from e
    if total < 0:
        raise ValueError(f"bad time {text!r}")
    return total


def parse_spans(text: str, duration: float | None = None) -> list[tuple[str, float, float]]:
    """'12-18, 0:40-0:45.5' to positive anchors [('+', s, e)]. Times are in the processed section."""
    spans = []
    for item in re.split(r"[,;\n]+", text or ""):
        item = item.strip()
        if not item:
            continue
        m = re.fullmatch(r"([\d:.]+)\s*[-–]\s*([\d:.]+)", item)
        if not m:
            raise ValueError(f"bad span {item!r}; write start-end in seconds, e.g. 12-18")
        s, e = parse_time(m.group(1)), parse_time(m.group(2))
        if e <= s:
            raise ValueError(f"span {item!r}: end must be after start")
        if duration is not None:
            if s >= duration:
                raise ValueError(f"span {item!r} starts after the end of the section ({duration:.1f} s)")
            e = min(e, duration)
        spans.append(("+", s, e))
    return spans


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:30] or "track"


# ---------------------------------------------------------------- params and backend management

@dataclass
class TargetSpec:
    preset: str = ""          # key of PRESETS, or ""
    custom: str = ""          # free text; overrides the preset
    spans_text: str = ""      # "12-18, 40-45"

    @property
    def description(self) -> str:
        return (self.custom.strip().lower() or PRESETS.get(self.preset, "")).strip()


@dataclass
class JobParams:
    source: Path | None = None
    url: str = ""
    start: float | None = None
    end: float | None = None
    max_seconds: float = MAX_SECONDS
    targets: list[TargetSpec] = field(default_factory=list)
    speaker_split: bool = False
    num_speakers: int | None = None
    model: str = "large"          # small | large
    higher_quality: bool = False
    backend: str = "sam"          # sam | filter (no GPU, for tests)
    chunk_s: float | None = None  # default depends on model
    overlap_s: float = 2.0


def default_chunk_s(model: str, higher_quality: bool) -> float:
    """From the measured VRAM limits (spike-results/sam-audio-first-run.md). Reranking is untested: smaller."""
    base = 30.0 if "large" in model else 45.0
    return base * (2 / 3) if higher_quality else base


class BackendManager:
    """Holds one backend at a time. Switching the model frees the old one first."""

    def __init__(self):
        self.lock = threading.RLock()   # one job at a time
        self.key = None
        self.backend = None             # ChunkedBackend
        self._inner = None

    def release(self) -> None:
        inner = self._inner
        self.backend = self._inner = self.key = None
        if inner is not None:
            for attr in ("_model", "_processor"):
                if hasattr(inner, attr):
                    setattr(inner, attr, None)
        del inner
        gc.collect()
        if "torch" in sys.modules:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def _build(self, kind, model, hq, chunk_s, overlap_s):
        if kind == "filter":
            inner = FilterBackend()
        elif kind == "sam":
            inner = SamAudioBackend(model, autocast="bf16", bf16_weights="large" in model,
                                    predict_spans=hq, reranking_candidates=4 if hq else 1)
            inner._load()
        else:
            raise ValueError(f"unknown backend {kind!r}")
        return inner, ChunkedBackend(inner, chunk_s, overlap_s)

    def get(self, kind: str, model: str, hq: bool, chunk_s: float | None, overlap_s: float
            ) -> tuple[ChunkedBackend, list[str]]:
        notes: list[str] = []
        chunk = chunk_s or default_chunk_s(model, hq)
        key = (kind, model, hq, chunk, overlap_s)
        if key == self.key and self.backend is not None:
            return self.backend, notes
        self.release()
        try:
            inner, backend = self._build(kind, model, hq, chunk, overlap_s)
        except Exception as e:
            self.release()
            if not hq:
                raise
            notes.append("Higher quality could not be enabled (it needs access to the gated "
                         f"facebook/sam-audio-judge and LAION-CLAP): {str(e)[:300]} Running with the standard "
                         "settings instead.")
            hq, chunk = False, chunk_s or default_chunk_s(model, False)
            key = (kind, model, hq, chunk, overlap_s)
            inner, backend = self._build(kind, model, hq, chunk, overlap_s)
        self.key, self.backend, self._inner = key, backend, inner
        return backend, notes


def diarize_subprocess(wav: Path, num_speakers: int | None = None) -> dict:
    """Run `seplab diarize` in the separate pyannote environment (.venv-diar)."""
    py = os.environ.get("SEPLAB_DIAR_PYTHON", str(LAB_DIR / ".venv-diar" / "bin" / "python"))
    if not Path(py).exists():
        raise RuntimeError("Speaker split needs the pyannote environment. See the README: "
                           "UV_PROJECT_ENVIRONMENT=.venv-diar uv sync --extra diarization")
    out = Path(wav).with_suffix(".diar.json")
    cmd = [py, "-m", "seplab.cli", "diarize", str(wav), str(out)]
    if num_speakers:
        cmd += ["--num-speakers", str(num_speakers)]
    p = subprocess.run(cmd, cwd=LAB_DIR, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Diarization failed (is access to pyannote/speaker-diarization-community-1 granted?): "
                           f"{p.stderr.strip()[-500:]}")
    return json.loads(out.read_text())


# ---------------------------------------------------------------- source preparation

def prepare_source(src: Path, job_dir: Path, start: float | None, end: float | None,
                   max_seconds: float) -> dict:
    """Copy/trim the input into the job folder. Writes source.wav (48 kHz mono float) and, for video, video.mp4."""
    info = media.probe(src)
    total = info["duration"]
    has_video = any(s["type"] == "video" and s["codec"] not in ("mjpeg", "png") for s in info["streams"])
    if not any(s["type"] == "audio" for s in info["streams"]):
        raise ValueError("The file has no audio stream.")
    start = max(0.0, start or 0.0)
    if total and start >= total:
        raise ValueError(f"Start time is past the end of the file ({total:.1f} s).")
    stop = min(end if end else math.inf, total or math.inf, start + max_seconds)
    dur = stop - start
    if dur < 0.5:
        raise ValueError("The selected section is shorter than 0.5 s.")
    trimmed = start > 0 or stop < total - 0.05
    wav = job_dir / "source.wav"
    video = None
    if has_video:
        video = job_dir / "video.mp4"
        if trimmed:
            media._run([media.FFMPEG, "-y", "-v", "error", "-ss", f"{start}", "-t", f"{dur}", "-i", str(src),
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
                        str(video)])
        else:
            shutil.copy(src, video)
        n = media.extract_audio(video, wav, SR)
    elif trimmed:
        tmp = job_dir / "section.wav"
        media._run([media.FFMPEG, "-y", "-v", "error", "-ss", f"{start}", "-t", f"{dur}", "-i", str(src),
                    "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_f32le", str(tmp)])
        n = media.extract_audio(tmp, wav, SR)
        tmp.unlink()
    else:
        n = media.extract_audio(src, wav, SR)
    return {"has_video": has_video, "start": start, "end": stop, "n_samples": n,
            "duration_s": n / SR, "capped": bool(end is None and total > start + max_seconds)}


# ---------------------------------------------------------------- targets

def speakers_to_targets(diar: dict, max_speakers: int = MAX_SPEAKERS) -> list[tuple[str, Prompt]]:
    """One target per detected speaker: description 'speech', that speaker's segments as positive anchors."""
    segs = diar.get("exclusive") or diar.get("speakers") or {}
    clean = {}
    for label, items in segs.items():
        items = [(float(a), float(b)) for a, b in items if b - a >= MIN_SEGMENT_S]
        if sum(b - a for a, b in items) >= MIN_SPEAKER_S:
            clean[label] = items
    if not clean:
        raise ValueError("No speakers were detected in this section.")
    ranked = sorted(clean, key=lambda k: -sum(b - a for a, b in clean[k]))[:max_speakers]
    return [(f"speaker-{i + 1}", Prompt("speech", [("+", a, b) for a, b in sorted(clean[k])], require_span=True))
            for i, k in enumerate(ranked)]


def manual_targets(specs: list[TargetSpec], duration: float) -> list[tuple[str, Prompt]]:
    out = []
    for spec in specs:
        desc = spec.description
        spans = parse_spans(spec.spans_text, duration)
        if not desc and not spans:
            continue
        out.append((desc or "target", Prompt(desc, spans)))
    if not out:
        raise ValueError("Add at least one target (a preset or a description).")
    if len(out) > MAX_TARGETS:
        raise ValueError(f"At most {MAX_TARGETS} targets.")
    return out


def peak_rss_mb() -> float:
    return (resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            + resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss) / 1024


# ---------------------------------------------------------------- the job

def run_job(params: JobParams, manager: BackendManager, root: Path = WEB_RUNS,
            diarize_fn: Callable[[Path, int | None], dict] = diarize_subprocess,
            progress: Callable[[float, str], None] | None = None) -> dict:
    """Run one job end to end and return its job.json dict. Raises ValueError/RuntimeError with user messages."""
    say = progress or (lambda frac, msg: None)
    with manager.lock:
        t_job = time.perf_counter()
        job_id, job_dir = new_job(root)
        cleanup_jobs(root)
        notes: list[str] = []

        start, end = params.start, params.end
        if params.url:
            say(0.02, "Downloading the link")
            src = urlimport.download(params.url, job_dir / "input", start or 0.0, end, params.max_seconds)
            start, end = 0.0, None   # the downloaded file is already the requested section
        elif params.source:
            (job_dir / "input").mkdir()
            src = job_dir / "input" / Path(params.source).name
            shutil.copy(params.source, src)
        else:
            raise ValueError("Upload a file or paste a link.")

        say(0.1, "Preparing audio")
        section = prepare_source(src, job_dir, start, end, params.max_seconds)
        if section["capped"]:
            notes.append(f"Only the first {params.max_seconds / 60:.0f} minutes were processed (cap).")
        audio, sr = read_wav(job_dir / "source.wav")
        n = len(audio)

        if params.speaker_split:
            say(0.15, "Detecting speakers")
            manager.release()   # never hold the SAM model while pyannote runs
            targets = speakers_to_targets(diarize_fn(job_dir / "source.wav", params.num_speakers))
            notes.append(f"Speaker split found {len(targets)} speaker(s).")
        else:
            targets = manual_targets(params.targets, n / sr)

        say(0.2, "Loading the model (first run takes a while)")
        t_load = time.perf_counter()
        backend, backend_notes = manager.get(params.backend, params.model, params.higher_quality,
                                             params.chunk_s, params.overlap_s)
        notes += backend_notes
        load_s = time.perf_counter() - t_load

        chunk, ov = backend.chunk_s, backend.overlap_s
        per_target = 1 if n <= chunk * sr else math.ceil((n / sr - ov) / (chunk - ov))
        total = per_target * len(targets)
        backend.reset_chunks()
        backend.on_chunk = lambda done: say(0.25 + 0.7 * done / total, f"Separating: chunk {done} of {total}")
        if hasattr(backend, "reset_stats"):
            backend.reset_stats()
        t_sep = time.perf_counter()
        tracks_dir = job_dir / "tracks"
        entries, residual = [], None
        stems = []
        try:
            for i, (label, prompt) in enumerate(targets):
                tgt, res = backend.separate(audio, sr, prompt)
                residual = res
                name = f"{i + 1:02d}_{slug(label)}"
                write_wav(tracks_dir / f"{name}.wav", tgt, sr)
                stems.append(tgt)
                entries.append({"name": name, "label": f"{label}" + (f" ({prompt.description})"
                                if prompt.description and prompt.description != label else ""),
                                "kind": "target", "file": f"tracks/{name}.wav",
                                "description": prompt.description,
                                "spans": [[a, b] for _, a, b in prompt.spans]})
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                manager.release()
                raise RuntimeError("The GPU ran out of memory. Use a shorter section, the small model, "
                                   "or turn off higher quality.") from e
            raise
        finally:
            backend.on_chunk = None
        sep_s = time.perf_counter() - t_sep
        peak_gpu = backend.peak_gpu_mb() if hasattr(backend, "peak_gpu_mb") else None

        diff = (audio - np.sum(stems, axis=0)).astype(np.float32)
        write_wav(tracks_dir / f"{OTHERS_DIFF}.wav", diff, sr)
        entries.append({"name": OTHERS_DIFF, "label": "others (mix - targets)", "kind": "others_diff",
                        "file": f"tracks/{OTHERS_DIFF}.wav"})
        if len(targets) == 1 and residual is not None:
            write_wav(tracks_dir / f"{OTHERS_RESIDUAL}.wav", residual, sr)
            entries.append({"name": OTHERS_RESIDUAL, "label": "others (model residual)", "kind": "others_residual",
                            "file": f"tracks/{OTHERS_RESIDUAL}.wav"})

        job = {
            "id": job_id, "created": time.strftime("%Y-%m-%d %H:%M:%S"), "sr": sr, "n_samples": n,
            "has_video": section["has_video"], "section": [section["start"], section["end"]],
            "tracks": entries, "notes": notes, "model": params.model, "higher_quality": params.higher_quality,
            "backend": params.backend,
            "stats": {"total_s": round(time.perf_counter() - t_job, 2), "separate_s": round(sep_s, 2),
                      "load_s": round(load_s, 2), "audio_s": round(n / sr, 2), "chunks": backend.chunks_run,
                      "chunk_s": chunk, "peak_gpu_mb": None if peak_gpu is None else round(peak_gpu),
                      "peak_rss_mb": round(peak_rss_mb())},
        }
        (job_dir / "job.json").write_text(json.dumps(job, indent=2))
        say(1.0, "Done")
        return job


# ---------------------------------------------------------------- mix and stems

def _pcm16(path: Path, x: np.ndarray, sr: int) -> None:
    sf.write(str(path), np.clip(x, -1.0, 1.0), sr, subtype="PCM_16")


def render_mix(job_dir: Path, gains_db: dict[str, float], muted: set[str] | frozenset = frozenset(),
               others: str = "diff") -> dict:
    """Mix the targets plus the chosen others variant ('diff', 'residual' or 'none') with a gain each."""
    job_dir = Path(job_dir)
    job = json.loads((job_dir / "job.json").read_text())
    notes = []
    by_kind = {t["kind"]: t for t in job["tracks"]}
    if others == "residual" and "others_residual" not in by_kind:
        notes.append("The model residual exists only with one target; used the mix-minus-targets others instead.")
        others = "diff"
    chosen = [t for t in job["tracks"] if t["kind"] == "target"]
    if others != "none":
        chosen.append(by_kind["others_" + others])
    mix = np.zeros(job["n_samples"], np.float32)
    for t in chosen:
        if t["name"] in muted:
            continue
        x, _ = read_wav(job_dir / t["file"])
        mix += x * np.float32(10 ** (gains_db.get(t["name"], 0.0) / 20))
    peak = float(np.max(np.abs(mix))) if len(mix) else 0.0
    if peak > 1.0:
        mix *= np.float32(0.99 / peak)
        notes.append(f"The mix peaked at {20 * math.log10(peak):.1f} dBFS and was turned down to avoid clipping.")
    wav = job_dir / "mix.wav"
    _pcm16(wav, mix, job["sr"])
    out = {"wav": wav, "mp4": None, "notes": notes}
    if job["has_video"]:
        out["mp4"] = job_dir / "mix.mp4"
        media.remux_audio(job_dir / "video.mp4", wav, out["mp4"])
    return out


def make_stems_zip(job_dir: Path) -> Path:
    """Zip of 16-bit WAVs, one per track, each exactly as long as the source section."""
    job_dir = Path(job_dir)
    job = json.loads((job_dir / "job.json").read_text())
    tmp = job_dir / "stems"
    tmp.mkdir(exist_ok=True)
    zip_path = job_dir / "stems.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:
        for t in job["tracks"]:
            x, _ = read_wav(job_dir / t["file"])
            p = tmp / f"{t['name']}.wav"
            _pcm16(p, x, job["sr"])
            z.write(p, p.name)
    shutil.rmtree(tmp)
    return zip_path
