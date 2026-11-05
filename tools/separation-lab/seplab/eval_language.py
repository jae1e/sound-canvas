"""English vs Korean evaluation on the synthetic twin sets (US-3.1, US-1.x, US-2.1 and their -ko versions).

Commands (run each in the right environment, one model process at a time):
  # pyannote, in .venv-diar
  UV_PROJECT_ENVIRONMENT=.venv-diar uv run --no-sync python -m seplab.eval_language diar --out runs/korean/pyannote
  # SAM Audio, in .venv
  uv run --no-sync python -m seplab.eval_language sam --model large --out runs/korean/sam-large
  uv run --no-sync python -m seplab.eval_language report --pyannote runs/korean/pyannote --sam runs/korean/sam-large
  uv run --no-sync python -m seplab.eval_language listen --sam runs/korean/sam-large --out runs/korean/listen

The pure helpers (anchors, cluster mapping, chunk windows, chunk identity) are unit-tested.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from .metrics import si_sdr

SETS = [("US-3.1", "en"), ("US-3.1-ko", "ko"), ("US-1.x", "en"), ("US-1.x-ko", "ko"),
        ("US-2.1", "en"), ("US-2.1-ko", "ko")]
MIN_SEGMENT_S = 0.3   # same as the web demo: shorter segments are not used as anchors


# ----------------------------------------------------------------------------------------------- pure helpers

def anchors_from_segments(segs, min_len: float = MIN_SEGMENT_S) -> list[tuple[str, float, float]]:
    """Positive span anchors from (start, end) segments, dropping very short ones."""
    return [("+", float(a), float(b)) for a, b in sorted(segs) if b - a >= min_len]


def overlap_seconds(a, b) -> float:
    """Total overlap in seconds between two lists of (start, end) segments."""
    total = 0.0
    for s1, e1 in a:
        for s2, e2 in b:
            total += max(0.0, min(e1, e2) - max(s1, s2))
    return total


def best_overlap_cluster(ref_segs, hyp: dict[str, list]) -> tuple[str | None, float]:
    """The hypothesis cluster that overlaps a reference speaker's activity the most (None if no overlap)."""
    best, best_s = None, 0.0
    for label in sorted(hyp):
        o = overlap_seconds(ref_segs, hyp[label])
        if o > best_s:
            best, best_s = label, o
    return best, best_s


def map_clusters(ref: dict[str, list], hyp: dict[str, list]) -> dict[str, dict]:
    """For every reference speaker: its best-overlap cluster, and whether another speaker shares that cluster."""
    out = {name: {"cluster": best_overlap_cluster(segs, hyp)[0]} for name, segs in ref.items()}
    for name, v in out.items():
        v["shared_with"] = [o for o, w in out.items() if o != name and w["cluster"] is not None
                            and w["cluster"] == v["cluster"]]
    return out


def chunk_windows(n: int, sr: int, chunk_s: float, overlap_s: float) -> list[tuple[int, int]]:
    """Sample windows used by ChunkedBackend (same stepping), as (start, end)."""
    size, ov = int(chunk_s * sr), int(overlap_s * sr)
    if n <= size:
        return [(0, n)]
    out, start = [], 0
    while True:
        end = min(start + size, n)
        out.append((start, end))
        if end == n:
            return out
        start = end - ov


def corr(a: np.ndarray, b: np.ndarray) -> float:
    a = np.asarray(a, np.float64) - np.mean(a)
    b = np.asarray(b, np.float64) - np.mean(b)
    d = np.sqrt(np.dot(a, a) * np.dot(b, b))
    return float(np.dot(a, b) / d) if d > 1e-12 else 0.0


def chunk_identity(est: np.ndarray, target: str, stems: dict[str, np.ndarray], activity: list, sr: int,
                   windows: list[tuple[int, int]], min_active_s: float = 2.0) -> list[dict]:
    """Per chunk: correlation of the estimate with the intended stem and with each other stem.

    Only chunks where the intended speaker is active for at least min_active_s are scored. 'ok' means the
    intended stem has the highest correlation, i.e. the estimate kept the right identity in that chunk.
    """
    rows = []
    for i, (a, b) in enumerate(windows):
        t0, t1 = a / sr, b / sr
        active = overlap_seconds(activity, [(t0, t1)])
        if active < min_active_s:
            continue
        c = {name: corr(est[a:b], x[a:b]) for name, x in stems.items()}
        wrong_name = max((n for n in c if n != target), key=lambda n: c[n], default=None)
        wrong = c[wrong_name] if wrong_name else 0.0
        rows.append({"chunk": i, "t0": t0, "t1": t1, "active_s": active, "right": c[target], "wrong": wrong,
                     "wrong_name": wrong_name, "ok": c[target] > wrong})
    return rows


def mean_or_none(xs):
    xs = [x for x in xs if x is not None]
    return float(np.mean(xs)) if xs else None


# ----------------------------------------------------------------------------------------------- clips

def clip_dirs(clips_root: Path, set_name: str) -> list[Path]:
    return sorted(p.parent for p in (clips_root / set_name).rglob("manifest.json"))


def lang_of(set_name: str) -> str:
    return "ko" if set_name.endswith("-ko") else "en"


# ----------------------------------------------------------------------------------------------- pyannote

def cmd_diar(a):
    """In .venv-diar. One pipeline load; every clip of the six sets."""
    from .audio_io import read_wav
    from .diar_metrics import Segments
    from .spike_pyannote import diarize, load_pipeline, run_clip, summarize
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    pipeline = load_pipeline()
    diarize(pipeline, np.random.default_rng(0).standard_normal(16000 * 10).astype(np.float32) * 0.1, 16000)
    results = []
    for set_name, lang in SETS:
        for clip in clip_dirs(Path(a.clips), set_name):
            r = run_clip(pipeline, clip, out / set_name)
            r["story"] = set_name        # group by set (en and ko share the manifest story)
            r["language"] = lang
            results.append(r)
            print(set_name, clip.name, "done", flush=True)
    (out / "results.json").write_text(json.dumps(results, indent=2))
    (out / "summary.json").write_text(json.dumps(summarize(results), indent=2))


# ----------------------------------------------------------------------------------------------- SAM

def _load_clip(clip: Path):
    from .audio_io import read_wav
    m = json.loads((clip / "manifest.json").read_text())
    mix, sr = read_wav(clip / m["mixture"])
    stems = {t["name"]: read_wav(clip / t["path"])[0] for t in m["targets"]}
    parts = {p["name"]: read_wav(clip / p["path"])[0] for p in m["others_parts"]}
    return m, mix, stems, parts, sr


def make_backend(model: str, chunk_s: float | None, overlap_s: float):
    from .separation import ChunkedBackend, SamAudioBackend
    inner = SamAudioBackend(model, autocast="bf16", bf16_weights=(model == "large"))
    return ChunkedBackend(inner, chunk_s or (30.0 if model == "large" else 45.0), overlap_s)


def cmd_sam(a):
    from .audio_io import write_wav
    from .separation import Prompt
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    res_path = out / "results.json"
    results = json.loads(res_path.read_text()) if res_path.exists() else []
    done = {(r["set"], r["clip"], r["cond"], r["speaker"]) for r in results}
    backend = make_backend(a.model, a.chunk_s, a.overlap_s)
    chunk_s, ov = backend.chunk_s, backend.overlap_s
    clips_root = Path(a.clips)
    sets = [s for s in SETS if s[0].split("-ko")[0] in a.stories]
    for set_name, lang in sets:
        for clip in clip_dirs(clips_root, set_name):
            m, mix, stems, parts, sr = _load_clip(clip)
            windows = chunk_windows(len(mix), sr, chunk_s, ov)
            jobs = []   # (cond, speaker, Prompt, extra)
            if m["story"] == "US-2.1":
                (name,) = stems
                jobs.append(("text", name, Prompt("speech"), {}))
            else:
                hyp = {}
                if a.pyannote:
                    hp = Path(a.pyannote) / set_name / clip.name / "hyp_mixture_auto.json"
                    hyp = json.loads(hp.read_text())["exclusive"]
                ref = {t["name"]: [tuple(x) for x in t["activity"]] for t in m["targets"]}
                mapping = map_clusters(ref, hyp) if hyp else {}
                for t in m["targets"]:
                    if "oracle" in a.conds:
                        jobs.append(("oracle", t["name"], Prompt("speech", anchors_from_segments(ref[t["name"]]),
                                                                 require_span=True), {}))
                    if "marked" in a.conds:   # one non-overlapped span of at most 6 s ('mark a moment')
                        sp = [tuple(x) for x in t["spans"]]
                        jobs.append(("marked", t["name"], Prompt("speech", sp, require_span=True) if sp else None, {}))
                    if hyp and "pyannote" in a.conds:
                        mp = mapping[t["name"]]
                        spans = anchors_from_segments(hyp[mp["cluster"]]) if mp["cluster"] else []
                        extra = {"cluster": mp["cluster"], "shared_with": mp["shared_with"]}
                        jobs.append(("pyannote", t["name"],
                                     Prompt("speech", spans, require_span=True) if spans else None, extra))
            for cond, name, prompt, extra in jobs:
                if (set_name, clip.name, cond, name) in done:
                    continue
                t = next(x for x in m["targets"] if x["name"] == name)
                rec = {"set": set_name, "language": lang, "story": m["story"], "clip": clip.name, "cond": cond,
                       "speaker": name, "role": t.get("role"), "gender": t.get("gender"),
                       "n_speakers": len(m["targets"]), "gender_pairing": m.get("gender_pairing"),
                       "duration_s": len(mix) / sr, "model": a.model, "chunk_s": chunk_s}
                ref_stem = stems[name]
                rec["mix_sisdr"] = si_sdr(mix, ref_stem)
                if prompt is None:
                    rec.update(status="no_anchor", sisdr=None, sisdri=None, n_anchors=0)
                else:
                    t0 = time.perf_counter()
                    est, _res = backend.separate(mix, sr, prompt)
                    rec["seconds"] = time.perf_counter() - t0
                    rec["sisdr"] = si_sdr(est, ref_stem)
                    rec["sisdri"] = rec["sisdr"] - rec["mix_sisdr"]
                    rec["n_anchors"] = len(prompt.spans)
                    rec["status"] = "ok"
                    id_stems = dict(stems)
                    if m["story"] == "US-2.1":
                        id_stems["crowd_babble"] = parts["crowd_babble"]
                    rec["chunks"] = chunk_identity(est, name, id_stems, [tuple(x) for x in t["activity"]], sr, windows)
                    d = out / set_name / clip.name
                    d.mkdir(parents=True, exist_ok=True)
                    write_wav(d / f"{cond}_{name}.wav", est, sr)
                rec.update(extra)
                rec["peak_gpu_mb"] = backend.peak_gpu_mb()
                results.append(rec)
                res_path.write_text(json.dumps(results, indent=2))
                print(set_name, clip.name, cond, name, rec.get("sisdri"), flush=True)


# ----------------------------------------------------------------------------------------------- report

def cmd_report(a):
    out = []
    if a.pyannote:
        s = json.loads((Path(a.pyannote) / "summary.json").read_text())
        out.append("## pyannote\n| set | clips | DER c0.25 | miss | FA | conf | count right | overlap recall | purity | coverage | phrase acc |\n|---|---|---|---|---|---|---|---|---|---|---|")
        for k, v in s.items():
            orc = "n/a" if v["overlap_recall"] is None else f"{v['overlap_recall']:.2f}"
            out.append(f"| {k} | {v['clips']} | {v['der_collar025']:.3f} | {v['miss']:.3f} | {v['false_alarm']:.3f} | "
                       f"{v['confusion']:.3f} | {v['count_correct']} | {orc} | {v['purity']:.2f} | "
                       f"{v['coverage']:.2f} | {v['phrase_accuracy']:.2f} |")
    for sam in a.sam:
        rs = json.loads((Path(sam) / "results.json").read_text())
        out.append(f"\n## SAM {sam}\n| set | cond | tracks | n | mean SI-SDRi | median | sem | frac > 3 dB | mean SI-SDR | mixture SI-SDR | no anchor | chunk ok | right corr | wrong corr |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
        order = [x[0] for x in SETS]
        keys = sorted({(r["set"], r["cond"]) for r in rs}, key=lambda k: (order.index(k[0]), k[1]))
        for key in keys:
            allg = [r for r in rs if (r["set"], r["cond"]) == key]
            views = [("all", allg)]
            if key[0].startswith("US-1.x"):
                views.append(("interviewee+camera", [r for r in allg if r["role"] != "passer_by"]))
                views.append(("passers-by", [r for r in allg if r["role"] == "passer_by"]))
            for vname, g in views:
                ok = [r for r in g if r["status"] == "ok"]
                if not ok:
                    continue
                gi = np.array([r["sisdri"] for r in ok])
                ch = [c for r in ok for c in r["chunks"]]
                out.append(f"| {key[0]} | {key[1]} | {vname} | {len(g)} | {gi.mean():.2f} | {np.median(gi):.2f} | "
                           f"{gi.std(ddof=1) / np.sqrt(len(gi)) if len(gi) > 1 else float('nan'):.2f} | "
                           f"{(gi > 3).mean():.2f} | {np.mean([r['sisdr'] for r in ok]):.2f} | "
                           f"{np.mean([r['mix_sisdr'] for r in g]):.2f} | {len(g) - len(ok)} | "
                           f"{sum(c['ok'] for c in ch)}/{len(ch)} | {np.mean([c['right'] for c in ch]):.2f} | "
                           f"{np.mean([c['wrong'] for c in ch]):.2f} |")
    print("\n".join(out))


# ----------------------------------------------------------------------------------------------- listening page

def cmd_listen(a):
    import shutil

    from .audio_io import read_wav, write_wav
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for spec in a.example:   # SET/CLIP/COND/SPEAKER
        set_name, clip_name, cond, spk = spec.split("/")
        clip = Path(a.clips) / set_name / clip_name
        m, mix, stems, parts, sr = _load_clip(clip)
        est, _ = read_wav(Path(a.sam) / set_name / clip_name / f"{cond}_{spk}.wav")
        key = f"{set_name}_{clip_name}_{spk}"
        files = {"Mixture": mix, "Target estimate": est, "Ground truth": stems[spk], "Others (mixture minus estimate)": mix - est}
        res = next((r for r in json.loads((Path(a.sam) / "results.json").read_text())
                    if (r["set"], r["clip"], r["cond"], r["speaker"]) == (set_name, clip_name, cond, spk)), {})
        cells = ""
        for label, x in files.items():
            fn = f"{key}_{label.split()[0].lower()}.wav"
            write_wav(out / fn, x.astype(np.float32), sr)
            cells += f'<tr><td>{label}</td><td><audio controls preload="none" src="{fn}"></audio></td></tr>'
        gain = res.get("sisdri")
        rows.append(f"<h2>{set_name} / {clip_name} / {spk} ({cond})</h2><p>SI-SDRi {gain:.1f} dB. "
                    f"Zeroth-Korean speech (CC BY 4.0), synthetic mixture.</p><table>{cells}</table>")
    html = ("<!doctype html><meta charset=utf-8><title>Korean separation examples</title>"
            "<style>body{font-family:sans-serif;max-width:760px;margin:2em auto}td{padding:4px 12px}</style>"
            "<h1>Korean separation examples (SAM Audio large)</h1><p>No autoplay. Internal test material.</p>"
            + "".join(rows))
    (out / "index.html").write_text(html)
    print("wrote", out / "index.html")


def main(argv=None):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("diar"); s.add_argument("--clips", default="data/clips"); s.add_argument("--out", required=True)
    s.set_defaults(fn=cmd_diar)
    s = sub.add_parser("sam"); s.add_argument("--clips", default="data/clips"); s.add_argument("--out", required=True)
    s.add_argument("--model", default="large"); s.add_argument("--chunk-s", type=float, default=None)
    s.add_argument("--overlap-s", type=float, default=2.0)
    s.add_argument("--pyannote", default=None, help="pyannote output dir; enables the pyannote-anchor condition")
    s.add_argument("--conds", nargs="+", default=["oracle", "pyannote"], choices=["oracle", "pyannote", "marked"])
    s.add_argument("--stories", nargs="+", default=["US-2.1", "US-3.1", "US-1.x"])
    s.set_defaults(fn=cmd_sam)
    s = sub.add_parser("report"); s.add_argument("--pyannote"); s.add_argument("--sam", nargs="*", default=[])
    s.set_defaults(fn=cmd_report)
    s = sub.add_parser("listen"); s.add_argument("--clips", default="data/clips"); s.add_argument("--sam", required=True)
    s.add_argument("--out", required=True); s.add_argument("example", nargs="+")
    s.set_defaults(fn=cmd_listen)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
