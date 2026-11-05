"""seplab command line."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from . import media
from .audio_io import read_wav, write_wav
from .mix import Interferer, build_mixture
from .separation import ChunkedBackend, FilterBackend, Prompt
from .stories import list_stories, make_backend, run_story
from .targets import STRATEGIES, Target, TrackSet


def parse_span(text: str) -> tuple[str, float, float]:
    """'+:6.3:7.0' -> ('+', 6.3, 7.0)"""
    sign, a, b = text.split(":")
    return sign, float(a), float(b)


def parse_target(text: str) -> Target:
    """'car honking|+:6.3:7.0' -> description plus optional spans."""
    desc, *spans = text.split("|")
    name = re.sub(r"[^a-z0-9]+", "_", desc.lower()).strip("_") or "target"
    return Target(name, Prompt(desc, [parse_span(s) for s in spans]))


def parse_interferer(text: str) -> Interferer:
    """'path[,snr_db[,offset_s]]'"""
    parts = text.split(",")
    return Interferer(parts[0], float(parts[1]) if len(parts) > 1 else 0.0, float(parts[2]) if len(parts) > 2 else 0.0)


def cmd_info(a):
    print(json.dumps(media.probe(a.input), indent=2))


def cmd_extract(a):
    n = media.extract_audio(a.input, a.output, a.sr, a.channels)
    print(f"wrote {a.output} ({n} samples at {a.sr} Hz)")


def cmd_proxy(a):
    media.make_proxy(a.input, a.output, a.height, a.fps)
    print(f"wrote {a.output}")


def cmd_remux(a):
    n = media.remux_audio(a.video, a.audio, a.output)
    print(f"wrote {a.output} (audio fitted to {n} samples)")


def cmd_mix(a):
    m = build_mixture(a.target, [parse_interferer(i) for i in a.interferer], a.out_dir, a.sr, a.seed,
                      a.rir, a.description)
    print(f"wrote {a.out_dir}/manifest.json ({m['n_samples']} samples)")


def cmd_build_clips(a):
    from .build_sets import build_all
    made = build_all(a.data, a.out, a.story or None)
    for k, v in made.items():
        print(f"{k}: {len(v)} clips")


def cmd_separate(a):
    audio, sr = read_wav(a.input)
    targets = [parse_target(t) for t in a.target]
    if a.backend == "fake" and not a.manifest:
        backend = FilterBackend()
        if a.chunk_s:
            backend = ChunkedBackend(backend, a.chunk_s, a.overlap_s)
    else:
        backend = make_backend(a.backend, a.manifest, a.model, a.chunk_s, a.overlap_s,
                               **({"predict_spans": a.predict_spans, "reranking_candidates": a.rerank}
                                  if a.backend == "sam" else {}))
    tracks = STRATEGIES[a.strategy](backend, audio, sr, targets)
    tracks.export(a.out_dir, len(audio))
    print(f"wrote tracks to {a.out_dir}: {', '.join([*tracks.tracks, 'others'])}")


def cmd_remix(a):
    tracks = TrackSet.load(a.tracks_dir)
    gains = {k: float(v) for k, v in (g.split("=") for g in a.gain)}
    mixed = tracks.remix(gains, a.others_gain)
    write_wav(a.output, mixed, tracks.sr)
    if a.video:
        media.remux_audio(a.video, a.output, a.output_video)
        print(f"wrote {a.output_video}")
    print(f"wrote {a.output}")


def cmd_run_story(a):
    kwargs = dict(chunk_s=a.chunk_s, overlap_s=a.overlap_s)
    if a.backend == "sam":
        kwargs.update(model=a.model, predict_spans=a.predict_spans, reranking_candidates=a.rerank)
    report = run_story(a.story, a.clips, a.backend, a.out, **kwargs)
    print(json.dumps(report["summary"], indent=2))
    print(f"results: {a.out or f'runs/{a.story}'}/results.json and index.html")


def cmd_diarize(a):
    """Needs the diarization environment (pyannote). Writes {"speakers": {label: [[s, e], ...]}, ...}."""
    from .spike_pyannote import diarize, load_pipeline
    x, sr = read_wav(a.input)
    if sr != 16000:
        from .audio_io import resample
        x, sr = resample(x, sr, 16000), 16000
    hyp, excl, seconds = diarize(load_pipeline(), x, sr, a.num_speakers or None)
    out = {"duration": len(x) / sr, "seconds": seconds, "speakers": hyp, "exclusive": excl}
    Path(a.output).write_text(json.dumps(out, indent=2))
    print(f"wrote {a.output}: {len(hyp)} speakers")


def main(argv=None):
    p = argparse.ArgumentParser(prog="seplab", description="Audio-separation test lab")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("info", help="probe duration, streams, sample rate")
    s.add_argument("input"); s.set_defaults(fn=cmd_info)

    s = sub.add_parser("extract", help="extract audio to WAV, exact source length")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--sr", type=int, default=48000); s.add_argument("--channels", type=int, default=1)
    s.set_defaults(fn=cmd_extract)

    s = sub.add_parser("proxy", help="low-resolution proxy video")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--height", type=int, default=360); s.add_argument("--fps", type=int, default=5)
    s.set_defaults(fn=cmd_proxy)

    s = sub.add_parser("remux", help="put new audio into a video, copying the video stream")
    s.add_argument("video"); s.add_argument("audio"); s.add_argument("output"); s.set_defaults(fn=cmd_remux)

    s = sub.add_parser("mix", help="build a synthetic mixture with ground truth")
    s.add_argument("--target", required=True)
    s.add_argument("--interferer", action="append", default=[], help="path[,snr_db[,offset_s]] (repeatable)")
    s.add_argument("--rir", help="room impulse response applied to the target")
    s.add_argument("--description", default="", help="text prompt stored in the manifest")
    s.add_argument("--sr", type=int, default=16000); s.add_argument("--seed", type=int, default=0)
    s.add_argument("--out-dir", required=True); s.set_defaults(fn=cmd_mix)

    def backend_args(s):
        s.add_argument("--backend", choices=["fake", "sam"], default="fake")
        s.add_argument("--model", default="facebook/sam-audio-large", help="small, base, large, *-tv or full repo id")
        s.add_argument("--predict-spans", action="store_true")
        s.add_argument("--rerank", type=int, default=1, help="reranking_candidates")
        s.add_argument("--chunk-s", type=float, default=None); s.add_argument("--overlap-s", type=float, default=2.0)

    s = sub.add_parser("separate", help="split an audio file into targets plus others")
    s.add_argument("input")
    s.add_argument("--target", action="append", required=True, help="'description[|+:start:end ...]' (repeatable)")
    s.add_argument("--strategy", choices=list(STRATEGIES), default="sequential")
    s.add_argument("--manifest", help="clip manifest for the fake oracle backend")
    s.add_argument("--out-dir", required=True); backend_args(s); s.set_defaults(fn=cmd_separate)

    s = sub.add_parser("build-clips", help="build the synthetic clip sets from the licensed corpora under --data")
    s.add_argument("--data", default="data"); s.add_argument("--out", default="data/clips")
    s.add_argument("--story", action="append", help="limit to a story (repeatable)"); s.set_defaults(fn=cmd_build_clips)

    s = sub.add_parser("remix", help="remix separated tracks with a gain each")
    s.add_argument("tracks_dir"); s.add_argument("output")
    s.add_argument("--gain", action="append", default=[], help="name=gain (default 1.0)")
    s.add_argument("--others-gain", type=float, default=0.0)
    s.add_argument("--video"); s.add_argument("--output-video", default="remix.mp4")
    s.set_defaults(fn=cmd_remix)

    s = sub.add_parser("run-story", help=f"run a story over clip manifests ({', '.join(list_stories())})")
    s.add_argument("story"); s.add_argument("--clips", required=True); s.add_argument("--out")
    backend_args(s); s.set_defaults(fn=cmd_run_story)

    s = sub.add_parser("diarize", help="pyannote speaker segments to JSON (run in the .venv-diar environment)")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--num-speakers", type=int, default=None); s.set_defaults(fn=cmd_diarize)

    a = p.parse_args(argv)
    try:
        a.fn(a)
    except (RuntimeError, KeyError, FileNotFoundError, ValueError) as e:
        raise SystemExit(f"error: {e}")


if __name__ == "__main__":
    main()
