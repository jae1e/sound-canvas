"""Story specs (one YAML per story) and the harness that runs them over clip manifests."""
from __future__ import annotations

import html
import json
import time
from pathlib import Path

import yaml

from ..audio_io import read_wav, write_wav
from ..metrics import si_sdr, si_sdr_improvement
from ..mix import load_manifest
from ..separation import ChunkedBackend, FakeBackend, Prompt, SamAudioBackend
from ..targets import STRATEGIES, Target

SPEC_DIR = Path(__file__).parent


def list_stories() -> list[str]:
    return sorted(p.stem for p in SPEC_DIR.glob("*.yaml"))


def load_story(story_id: str) -> dict:
    path = SPEC_DIR / f"{story_id}.yaml"
    if not path.exists():
        raise KeyError(f"unknown story {story_id!r}; known: {', '.join(list_stories())}")
    return yaml.safe_load(path.read_text())


def make_backend(kind: str, manifest_path: Path | None = None, model: str = "facebook/sam-audio-large",
                 chunk_s: float | None = None, overlap_s: float = 2.0, **sam_kwargs):
    if kind == "fake":
        backend = FakeBackend.from_manifest(manifest_path)
    elif kind == "sam":
        backend = SamAudioBackend(model, **sam_kwargs)
    else:
        raise ValueError(f"unknown backend {kind!r}; use fake or sam")
    return ChunkedBackend(backend, chunk_s, overlap_s) if chunk_s else backend


def run_clip(story: dict, manifest_path: Path, out_dir: Path, backend_kind: str, **backend_kwargs) -> dict:
    m = load_manifest(manifest_path)
    base = Path(m["_dir"])
    mix, sr = read_wav(base / m["mixture"])
    backend = make_backend(backend_kind, manifest_path, **backend_kwargs)
    targets = [Target(t["name"], Prompt(t.get("description", ""), [tuple(s) for s in t.get("spans", [])],
                                        t.get("masked_video"))) for t in m["targets"]]
    if hasattr(backend, "reset_stats"):
        backend.reset_stats()
    t0 = time.perf_counter()
    tracks = STRATEGIES[story.get("strategy", "sequential")](backend, mix, sr, targets)
    elapsed = time.perf_counter() - t0
    peak = backend.peak_gpu_mb() if hasattr(backend, "peak_gpu_mb") else None

    out_dir.mkdir(parents=True, exist_ok=True)
    tracks.export(out_dir / "tracks")
    write_wav(out_dir / "tracks" / "mixture.wav", mix, sr)
    metrics: dict = {}
    for t in m["targets"]:
        ref, _ = read_wav(base / t["path"])
        est = tracks.tracks[t["name"]]
        metrics[t["name"]] = {"si_sdr_db": si_sdr(est, ref), "si_sdri_db": si_sdr_improvement(est, ref, mix)}
    if m.get("others"):
        ref, _ = read_wav(base / m["others"])
        metrics["others"] = {"si_sdr_db": si_sdr(tracks.others, ref), "si_sdri_db": si_sdr_improvement(tracks.others, ref, mix)}
    audio_s = len(mix) / sr
    return {
        "clip": Path(m["_dir"]).name, "manifest": str(manifest_path), "sr": sr, "n_samples": len(mix),
        "audio_seconds": audio_s, "backend": backend.name, "strategy": story.get("strategy", "sequential"),
        "processing_seconds": elapsed, "real_time_factor": elapsed / audio_s if audio_s else None,
        "peak_gpu_mb": peak, "metrics": metrics,
        # Filled in by hand after listening; the pass bar is evaluated over these.
        "ratings": {"blind_preference_win": None, "usable_without_apology": None},
    }


def run_story(story_id: str, clips_dir: str | Path, backend_kind: str = "fake", out_dir: str | Path | None = None,
              **backend_kwargs) -> dict:
    story = load_story(story_id)
    clips_dir = Path(clips_dir)
    out_dir = Path(out_dir or f"runs/{story_id}")
    manifests = sorted(clips_dir.rglob("manifest.json"))
    if not manifests:
        raise FileNotFoundError(f"no manifest.json under {clips_dir}; build clips with `seplab mix`")
    results = [run_clip(story, mp, out_dir / mp.parent.name, backend_kind, **backend_kwargs) for mp in manifests]
    sdri = [r["metrics"][k]["si_sdri_db"] for r in results for k in r["metrics"] if k != "others"]
    report = {
        "story": story, "backend": backend_kind, "clips": results,
        "summary": {"n_clips": len(results), "mean_target_si_sdri_db": sum(sdri) / len(sdri) if sdri else None,
                    "total_processing_seconds": sum(r["processing_seconds"] for r in results)},
    }
    (out_dir / "results.json").write_text(json.dumps(report, indent=2))
    write_listening_page(report, out_dir)
    return report


def write_listening_page(report: dict, out_dir: Path) -> Path:
    """Static HTML page. Audio elements never autoplay and load nothing until the user presses play."""
    story = report["story"]
    rows = []
    for r in report["clips"]:
        base = f"{r['clip']}/tracks"
        items = [(n, f"{base}/{n}.wav") for n in ["mixture", *[k for k in r["metrics"] if k != "others"], "others"]]
        cells = "".join(
            f"<li>{html.escape(n)}: <audio controls preload=\"none\" src=\"{html.escape(p)}\"></audio>"
            + (f" SI-SDRi {r['metrics'][n]['si_sdri_db']:.1f} dB" if n in r["metrics"] else "") + "</li>"
            for n, p in items)
        rows.append(f"<h3>{html.escape(r['clip'])}</h3><p>{r['audio_seconds']:.1f} s, "
                    f"{r['processing_seconds']:.2f} s processing, peak GPU {r['peak_gpu_mb']} MB</p><ul>{cells}</ul>")
    page = (f"<!doctype html><meta charset=utf-8><title>{html.escape(story['id'])}</title>"
            f"<h1>{html.escape(story['id'])}: {html.escape(story['title'])}</h1>"
            f"<p>Persona {html.escape(story['persona'])}. Backend: {html.escape(report['backend'])}. "
            f"Pass bar: {html.escape(story['pass_bar']['note'])}</p>" + "".join(rows))
    path = out_dir / "index.html"
    path.write_text(page)
    return path
