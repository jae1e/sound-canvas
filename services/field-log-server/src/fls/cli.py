"""Command line: fls serve | pair | devices | revoke | fetch-models | smoke-final | smoke-live."""

from __future__ import annotations

import argparse
import logging
import resource
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

from . import auth
from .config import Paths, default_data_dir
from .db import Database


def _paths(args) -> Paths:
    p = Paths(Path(args.data_dir).expanduser() if args.data_dir else default_data_dir())
    p.ensure()
    return p


def cmd_serve(args) -> None:
    import asyncio
    import contextlib

    import uvicorn

    from .app import create_app
    from .dashboard import DASHBOARD_HOST, create_dashboard
    from .engines import make_final_engine, make_live_engine
    from .net import tailscale_ipv4, validate_host

    host = validate_host(args.host or tailscale_ipv4())
    paths = _paths(args)
    app = create_app(paths.root, make_final_engine(args.final_engine),
                     make_live_engine(args.live_engine, paths.models))
    log = logging.getLogger("fls")
    log.info("serving on %s:%d data=%s", host, args.port, paths.root)
    main_server = uvicorn.Server(uvicorn.Config(app, host=host, port=args.port, log_level="info"))

    class QuietServer(uvicorn.Server):
        """Secondary server: the main server owns signal handling."""

        @contextlib.contextmanager
        def capture_signals(self):
            yield

    async def run() -> None:
        tasks = [asyncio.create_task(main_server.serve())]
        dash = None
        if args.dashboard_port:
            dash_app = create_dashboard(app.state.fls)
            dash = QuietServer(uvicorn.Config(dash_app, host=DASHBOARD_HOST, port=args.dashboard_port,
                                              log_level="warning", lifespan="off"))
            tasks.append(asyncio.create_task(dash.serve()))
            log.info("dashboard on http://%s:%d/ (loopback only, no auth)", DASHBOARD_HOST, args.dashboard_port)
        await asyncio.wait(tasks[:1])  # the main server decides when to stop
        if dash is not None:
            dash.should_exit = True
        await asyncio.gather(*tasks, return_exceptions=True)

    asyncio.run(run())


def cmd_pair(args) -> None:
    db = Database(_paths(args).db)
    code = auth.create_pairing_code(db)
    print(code)
    print("Valid for 10 minutes, single use.", file=sys.stderr)


def cmd_devices(args) -> None:
    db = Database(_paths(args).db)
    rows = db.query("SELECT * FROM devices ORDER BY created_server_ms")
    if not rows:
        print("(no devices)")
    for r in rows:
        created = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r["created_server_ms"] / 1000))
        state = "REVOKED" if r["revoked_server_ms"] else "active"
        print(f"{r['device_id']}  {state:8} {created}  {r['manufacturer']} {r['model']}  app={r['app_version']}")


def cmd_revoke(args) -> None:
    db = Database(_paths(args).db)
    if auth.revoke(db, args.device_id):
        print(f"revoked {args.device_id}")
    else:
        raise SystemExit(f"no active device {args.device_id}")


def cmd_fetch_models(args) -> None:
    from .engines.nemotron import MODEL_DIR_NAME, MODEL_URL, model_ready

    models = _paths(args).models
    if model_ready(models):
        print("nemotron model already present")
        return
    tarball = models / (MODEL_DIR_NAME + ".tar.bz2")
    for _ in range(20):
        have = tarball.stat().st_size if tarball.exists() else 0
        req = urllib.request.Request(MODEL_URL, headers={"Range": f"bytes={have}-"} if have else {})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if have and resp.status == 200:  # server ignored Range: restart
                    have = 0
                with open(tarball, "ab" if have else "wb") as f:
                    while chunk := resp.read(1 << 20):
                        f.write(chunk)
                print(f"downloaded {tarball.stat().st_size / 1e6:.0f} MB")
            break
        except urllib.error.HTTPError as e:
            if e.code == 416:  # already complete
                break
            raise
        except OSError as e:
            print(f"download interrupted ({e}); resuming", file=sys.stderr)
            time.sleep(2)
    with tarfile.open(tarball, "r:bz2") as tf:
        tf.extractall(models, filter="data")
    if not model_ready(models):
        raise SystemExit("extraction finished but required model files are missing")
    if not args.keep_archive:
        tarball.unlink()
    print("nemotron model ready:", models / MODEL_DIR_NAME)


def _peak_rss_mb() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def cmd_smoke_final(args) -> None:
    from .audio import load_16k_mono
    from .engines import make_final_engine

    from .audio import degrade
    from .conditioning import condition
    from .langs import decode_with_policy, normalize_languages

    audio = degrade(load_16k_mono(args.wav), args.attenuate_db, args.lf_noise_dbfs)
    dur = len(audio) / 16000
    if not args.raw:
        audio = condition(audio)
    langs = normalize_languages(args.languages.split(","))
    eng = make_final_engine(args.engine)
    t = time.monotonic()
    r = decode_with_policy(eng, audio, langs)
    first = time.monotonic() - t
    t = time.monotonic()
    r = decode_with_policy(eng, audio, langs)
    second = time.monotonic() - t
    print(f"engine={eng.name} audio_s={dur:.2f} lang={r.language!r} path={r.path} no_speech={r.no_speech} "
          f"conditioned={not args.raw}")
    print(f"text={r.text!r}")
    print(f"first_call_s={first:.2f} (includes model load) warm_call_s={second:.2f} rtf_warm={second / dur:.3f}")
    try:
        import torch

        print(f"cuda_max_allocated_MB={torch.cuda.max_memory_allocated() / 1e6:.0f} "
              f"reserved_MB={torch.cuda.max_memory_reserved() / 1e6:.0f}")
    except Exception:  # noqa: BLE001
        pass
    print(f"peak_rss_MB={_peak_rss_mb():.0f}")


def cmd_smoke_live(args) -> None:
    import numpy as np

    from .audio import load_16k_mono
    from .engines import make_live_engine

    paths = _paths(args)
    audio = load_16k_mono(args.wav)
    from .audio import degrade

    audio = degrade(audio, args.attenuate_db, args.lf_noise_dbfs)
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    pcm = np.concatenate([pcm, np.zeros(16000, dtype="<i2")])  # trailing second of silence
    eng = make_live_engine(args.engine, paths.models)
    t = time.monotonic()
    eng.preload()
    print(f"load_s={time.monotonic() - t:.2f}")
    stream = eng.open_stream(args.language, not args.raw)
    chunk = 1600
    t0 = time.monotonic()
    first_partial = None
    max_feed = 0.0
    for i in range(0, len(pcm), chunk):
        target = t0 + i / 16000
        time.sleep(max(0.0, target - time.monotonic()))
        a = time.monotonic()
        events = stream.feed(pcm[i:i + chunk])
        max_feed = max(max_feed, time.monotonic() - a)
        now = time.monotonic() - t0
        for e in events:
            if e.kind == "partial" and first_partial is None:
                first_partial = now
            print(f"[{now:6.2f}s audio@{(i + chunk) / 16000:5.2f}s] {e.kind:7} u{e.utterance} "
                  f"{e.start_ms}-{e.end_ms}ms {e.text!r}")
    for e in stream.finish():
        print(f"[end] {e.kind} u{e.utterance} {e.start_ms}-{e.end_ms}ms {e.text!r}")
    stream.close()
    print(f"first_partial_latency_s={first_partial} max_feed_s={max_feed:.3f} peak_rss_MB={_peak_rss_mb():.0f}")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="fls")
    ap.add_argument("--data-dir", help="default: $FLS_DATA_DIR or ~/.local/share/field-log-server")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("serve")
    s.add_argument("--host", help="default: tailscale ip -4; only 127.0.0.1 or 100.64.0.0/10 allowed")
    s.add_argument("--port", type=int, default=8787)
    s.add_argument("--final-engine", choices=["qwen3", "fake"], default="qwen3")
    s.add_argument("--live-engine", choices=["nemotron", "fake", "none"], default="nemotron")
    s.add_argument("--dashboard-port", type=int, default=8790,
                   help="local quality dashboard on 127.0.0.1 (0 disables)")
    s.set_defaults(fn=cmd_serve)

    sub.add_parser("pair").set_defaults(fn=cmd_pair)
    sub.add_parser("devices").set_defaults(fn=cmd_devices)
    r = sub.add_parser("revoke")
    r.add_argument("device_id")
    r.set_defaults(fn=cmd_revoke)
    f = sub.add_parser("fetch-models")
    f.add_argument("--keep-archive", action="store_true")
    f.set_defaults(fn=cmd_fetch_models)
    sf = sub.add_parser("smoke-final")
    sf.add_argument("wav")
    sf.add_argument("--engine", default="qwen3", choices=["qwen3", "fake"])
    for sp in (sf,):
        sp.add_argument("--languages", default="ko,en", help="memo language list, priority order")
    sf.set_defaults(fn=cmd_smoke_final)
    sl = sub.add_parser("smoke-live")
    sl.add_argument("wav")
    sl.add_argument("--engine", default="nemotron", choices=["nemotron", "fake"])
    sl.add_argument("--language", default="auto")
    sl.set_defaults(fn=cmd_smoke_live)
    for sp in (sf, sl):
        sp.add_argument("--raw", action="store_true", help="skip input conditioning")
        sp.add_argument("--attenuate-db", type=float, default=0.0, help="quiet-input test: gain in dB, e.g. -25")
        sp.add_argument("--lf-noise-dbfs", type=float, default=None, help="add 30-150 Hz noise at this RMS level")

    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    args.fn(args)


if __name__ == "__main__":
    main()
