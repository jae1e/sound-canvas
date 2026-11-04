"""pyannote clustering spike: diarize synthetic clips, score against ground truth, test the camera-holder heuristic.

Run in the diarization environment:
  UV_PROJECT_ENVIRONMENT=.venv-diar uv run --no-sync python -m seplab.spike_pyannote --clips data/clips --out runs/pyannote
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from .audio_io import read_wav, write_wav
from .diar_metrics import (Segments, der, overlap_stats, purity_coverage, segment_accuracy, speaker_count_error)
from .dryness import dynamic_range_db, high_band_ratio, level_db, rank_speakers, tail_drop_db
from .synth import merge_segments

MODEL = "pyannote/speaker-diarization-community-1"


def load_pipeline():
    import torch
    from pyannote.audio import Pipeline
    return Pipeline.from_pretrained(MODEL).to(torch.device("cuda"))


def diarize(pipeline, x: np.ndarray, sr: int, num_speakers: int | None = None) -> tuple[Segments, Segments, float]:
    """Returns (overlap-aware segments, exclusive segments, seconds). x is mono float32."""
    import torch
    kw = {"num_speakers": num_speakers} if num_speakers else {}
    torch.cuda.synchronize()
    t0 = time.perf_counter()
    out = pipeline({"waveform": torch.from_numpy(x.astype(np.float32))[None], "sample_rate": sr}, **kw)
    torch.cuda.synchronize()
    dt = time.perf_counter() - t0

    def conv(ann) -> Segments:
        d: Segments = {}
        for turn, _, label in ann.itertracks(yield_label=True):
            d.setdefault(label, []).append((float(turn.start), float(turn.end)))
        return {k: merge_segments(v) for k, v in d.items()}

    return conv(out.speaker_diarization), conv(out.exclusive_speaker_diarization), dt


def pyannote_der(ref: Segments, hyp: Segments, collar: float = 0.25) -> float:
    from pyannote.core import Annotation, Segment
    from pyannote.metrics.diarization import DiarizationErrorRate

    def ann(s: Segments):
        a = Annotation()
        for k, v in s.items():
            for b, e in v:
                a[Segment(b, e)] = k
        return a
    return float(DiarizationErrorRate(collar=collar)(ann(ref), ann(hyp)))


def score(ref: Segments, hyp: Segments, hyp_excl: Segments, duration: float) -> dict:
    r = {"der_collar0": der(ref, hyp, duration=duration), "der_collar025": der(ref, hyp, collar=0.25, duration=duration),
         "der_collar025_skip_overlap": der(ref, hyp, collar=0.25, duration=duration, skip_overlap=True),
         "der_exclusive_collar025": der(ref, hyp_excl, collar=0.25, duration=duration),
         "count": speaker_count_error(ref, hyp), "overlap": overlap_stats(ref, hyp, duration=duration),
         "purity_coverage": purity_coverage(ref, hyp), "phrase_accuracy": segment_accuracy(ref, hyp)}
    try:
        r["pyannote_metrics_der_collar025"] = pyannote_der(ref, hyp)
    except Exception as exc:   # cross-check only
        r["pyannote_metrics_der_collar025"] = f"error: {exc}"
    return r


def camera_holder_check(mix: np.ndarray, sr: int, hyp_excl: Segments, mapping: dict[str, str], roles: dict[str, str]) -> dict:
    """roles: ground-truth target name -> role. mapping: GT name -> hypothesis label (from DER)."""
    inv = {v: k for k, v in mapping.items()}
    feats = {}
    for label, segs in hyp_excl.items():
        if label not in inv or sum(e - s for s, e in segs) < 2.0:
            continue
        feats[label] = {"level_db": level_db(mix, sr, segs), "dynamic_range_db": dynamic_range_db(mix, sr, segs),
                        "high_band_ratio": high_band_ratio(mix, sr, segs), "tail_drop_db": tail_drop_db(mix, sr, segs),
                        "gt_name": inv[label], "role": roles.get(inv[label])}
    cam = [k for k, v in feats.items() if v["role"] == "camera_holder"]
    out = {"features": feats, "camera_holder_found": bool(cam)}
    if not cam:
        return out
    for name, keys in {"level": ("level_db",), "dynamic_range": ("dynamic_range_db",), "tail_drop": ("tail_drop_db",),
                       "level+dynamic_range": ("level_db", "dynamic_range_db"),
                       "level+tail_drop": ("level_db", "tail_drop_db")}.items():
        order = rank_speakers(feats, keys)
        out[f"rank_{name}"] = order.index(cam[0]) + 1
    return out


def run_clip(pipeline, clip: Path, out: Path) -> dict:
    m = json.loads((clip / "manifest.json").read_text())
    story = m["story"]
    mix, sr = read_wav(clip / m["mixture"])
    dur = len(mix) / sr
    ref: Segments = {t["name"]: [tuple(a) for a in t["activity"]] for t in m["targets"]}
    res: dict = {"clip": clip.name, "story": story, "duration_s": dur, "n_ref_speakers": len(ref)}
    inputs = {"mixture": mix}
    if story == "US-6.1":
        vocal = np.sum([read_wav(clip / t["path"])[0] for t in m["targets"]], axis=0)
        inputs = {"vocal_sum": vocal, "mixture": mix}
    for iname, x in inputs.items():
        variants = {"auto": None}
        if story == "US-6.1":
            variants["oracle_k"] = len(ref)
        for vname, k in variants.items():
            hyp, hyp_excl, dt = diarize(pipeline, x, sr, k)
            r = score(ref, hyp, hyp_excl, dur)
            r.update(seconds=dt, rtf=dt / dur, hyp_speakers=len(hyp))
            if story == "US-1.x" and iname == "mixture" and k is None:
                roles = {t["name"]: t["role"] for t in m["targets"]}
                r["camera_holder"] = camera_holder_check(mix, sr, hyp_excl, r["der_collar025"]["mapping"], roles)
            res[f"{iname}/{vname}"] = r
            (out / clip.name).mkdir(parents=True, exist_ok=True)
            (out / clip.name / f"hyp_{iname}_{vname}.json").write_text(json.dumps({"hyp": hyp, "exclusive": hyp_excl}))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", default="data/clips")
    ap.add_argument("--out", default="runs/pyannote")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    pipeline = load_pipeline()
    # Warm-up so that CUDA initialisation does not count towards runtimes.
    diarize(pipeline, np.random.default_rng(0).standard_normal(16000 * 10).astype(np.float32) * 0.1, 16000)
    results = []
    for mp in sorted(Path(a.clips).rglob("manifest.json")):
        if json.loads(mp.read_text())["story"] not in {"US-3.1", "US-1.x", "US-2.1", "US-6.1"}:
            continue
        results.append(run_clip(pipeline, mp.parent, out))
        print(mp.parent.name, "done", flush=True)
    (out / "results.json").write_text(json.dumps(results, indent=2))
    (out / "summary.json").write_text(json.dumps(summarize(results), indent=2))


if __name__ == "__main__":
    main()


def summarize(results: list[dict]) -> dict:
    """Mean metrics per (story, input, variant) over clips."""
    groups: dict[str, list[dict]] = {}
    for r in results:
        for k, v in r.items():
            if "/" in k:
                groups.setdefault(f"{r['story']} {k}", []).append({**v, "n_ref": r["n_ref_speakers"], "dur": r["duration_s"]})
    out = {}
    for g, items in groups.items():
        mean = lambda f: float(np.mean([f(i) for i in items]))
        rec = [i["overlap"]["overlap_recall"] for i in items if i["overlap"]["overlap_recall"] is not None]
        out[g] = {"clips": len(items), "der_collar0": mean(lambda i: i["der_collar0"]["der"]),
                  "der_collar025": mean(lambda i: i["der_collar025"]["der"]),
                  "miss": mean(lambda i: i["der_collar025"]["miss"]), "false_alarm": mean(lambda i: i["der_collar025"]["false_alarm"]),
                  "confusion": mean(lambda i: i["der_collar025"]["confusion"]),
                  "der_skip_overlap": mean(lambda i: i["der_collar025_skip_overlap"]["der"]),
                  "count_correct": f"{sum(i['count']['correct'] for i in items)}/{len(items)}",
                  "overlap_recall": float(np.mean(rec)) if rec else None,
                  "purity": mean(lambda i: i["purity_coverage"]["purity"]), "coverage": mean(lambda i: i["purity_coverage"]["coverage"]),
                  "phrase_accuracy": mean(lambda i: i["phrase_accuracy"]["accuracy"]),
                  "seconds_mean": mean(lambda i: i["seconds"]), "rtf_mean": mean(lambda i: i["rtf"]),
                  "audio_seconds_total": float(sum(i["dur"] for i in items))}
    return out
