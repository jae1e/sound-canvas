"""Local quality dashboard (requirement S-5). Loopback only, no auth, shares the server's state."""

from __future__ import annotations

import io
import json
import re
from pathlib import Path
from typing import Any

import soundfile as sf
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

from .audio import load_16k_mono
from .cer import cer
from .conditioning import condition
from .db import now_ms
from .dsp_views import peaks, spectrogram_png
from .jobs import variant_list
from .langs import DEFAULT_LANGUAGES, normalize_languages
from .store import HEX64

DASHBOARD_HOST = "127.0.0.1"
STATIC = Path(__file__).parent / "static"
HOST_OK = re.compile(r"^(127\.0\.0\.1|localhost)(:\d+)?$")


def _js(v: str | None, default: Any = None) -> Any:
    try:
        return json.loads(v) if v else default
    except ValueError:
        return default


def create_dashboard(state: Any) -> FastAPI:
    db, store = state.db, state.store
    app = FastAPI(title="Field Voice Log dashboard", docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def host_guard(request: Request, call_next):
        # Defence against DNS rebinding: only loopback host names are served.
        if not HOST_OK.match(request.headers.get("host", "")):
            return JSONResponse({"detail": "forbidden host"}, status_code=403)
        resp = await call_next(request)
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        return resp

    @app.get("/", response_class=HTMLResponse)
    def index():
        return HTMLResponse((STATIC / "dashboard.html").read_text(encoding="utf-8"))

    # ------------------------------------------------------------------ helpers
    def segment_row(segment_id: str):
        row = db.one(
            "SELECT s.* FROM segments s LEFT JOIN memos m ON m.device_id=s.device_id AND m.memo_id=s.memo_id "
            "WHERE s.segment_id=? AND m.deleted_server_ms IS NULL ORDER BY s.rowid LIMIT 1", (segment_id,))
        if row is None:
            raise HTTPException(404, "segment not found")
        return row

    def audio_for(segment_id: str, conditioned: bool):
        row = segment_row(segment_id)
        if not store.exists(row["object_sha256"]):
            raise HTTPException(404, "audio not uploaded yet")
        x = load_16k_mono(store.path(row["object_sha256"]))
        return condition(x) if conditioned else x

    def with_cer(text: str | None, ref: str | None) -> float | None:
        if ref is None or text is None:
            return None
        return cer(ref, text)["cer"]

    # ------------------------------------------------------------------ memo list and detail
    @app.get("/dash/api/memos")
    def memos():
        out = []
        for m in db.query("SELECT * FROM memos WHERE deleted_server_ms IS NULL AND kind IS NOT NULL "
                          "ORDER BY created_wall_ms DESC, rowid DESC"):
            dev, mid = m["device_id"], m["memo_id"]
            segs = db.query(
                "SELECT s.segment_id, s.flags, t.status, t.no_speech FROM segments s LEFT JOIN transcripts t "
                "ON t.device_id=s.device_id AND t.segment_id=s.segment_id WHERE s.device_id=? AND s.memo_id=?",
                (dev, mid))
            statuses = [r["status"] or "queued" for r in segs]
            if not statuses:
                final = "none"
            elif "failed" in statuses:
                final = "failed"
            elif "running" in statuses:
                final = "running"
            elif "queued" in statuses:
                final = "queued"
            else:
                final = "done"
            flags = sorted({f for r in segs for f in _js(r["flags"], [])})
            if any(r["no_speech"] for r in segs):
                flags.append("no_speech")
            loc = _js(m["location"])
            out.append({
                "memo_id": mid, "device_id": dev, "kind": m["kind"], "created_wall_ms": m["created_wall_ms"],
                "tz": m["tz"], "languages": _js(m["languages"], DEFAULT_LANGUAGES),
                "location": {"lat": loc["lat_e7"] / 1e7, "lon": loc["lon_e7"] / 1e7,
                             "accuracy_m": loc.get("accuracy_cm", 0) / 100} if loc else None,
                "segment_count": len(segs), "final_status": final, "flags": flags,
                "photos": [{"photo_id": p["photo_id"], "sha256": p["object_sha256"], "mime": p["mime"]}
                           for p in db.query("SELECT * FROM photos WHERE device_id=? AND memo_id=?", (dev, mid))
                           if store.exists(p["object_sha256"])],
                "photo_count": db.one("SELECT COUNT(*) c FROM photos WHERE device_id=? AND memo_id=?",
                                      (dev, mid))["c"],
            })
        return {"memos": out}

    @app.get("/dash/api/memos/{memo_id}")
    def memo_detail(memo_id: str):
        m = db.one("SELECT * FROM memos WHERE memo_id=? AND deleted_server_ms IS NULL", (memo_id,))
        if m is None:
            raise HTTPException(404, "memo not found")
        dev = m["device_id"]
        segments = []
        for s in db.query("SELECT * FROM segments WHERE device_id=? AND memo_id=? ORDER BY idx, rowid", (dev, memo_id)):
            sid = s["segment_id"]
            rec = db.one("SELECT * FROM recordings WHERE device_id=? AND recording_id=?", (dev, s["recording_id"]))
            t = db.one("SELECT * FROM transcripts WHERE device_id=? AND segment_id=?", (dev, sid))
            ref = db.one("SELECT text FROM reference_transcripts WHERE device_id=? AND segment_id=?", (dev, sid))
            ref_text = ref["text"] if ref else None
            alts = [{
                "engine": a["engine"], "variant": a["variant"], "status": a["status"], "language": a["language"],
                "detect_path": a["detect_path"], "text": a["text"],
                "rtf": float(a["rtf"]) if a["rtf"] is not None else None, "processing_ms": a["processing_ms"],
                "error": a["error"], "updated_server_ms": a["updated_server_ms"],
                "cer": with_cer(a["text"], ref_text) if a["status"] == "done" else None,
            } for a in db.query("SELECT * FROM alt_transcripts WHERE device_id=? AND segment_id=? "
                                "ORDER BY created_server_ms, rowid", (dev, sid))]
            final = None
            if t is not None:
                final = {
                    "status": t["status"], "engine": t["engine"], "text": t["text"], "language": t["language"],
                    "no_speech": bool(t["no_speech"]), "detect_path": t["detect_path"],
                    "rtf": float(t["rtf"]) if t["rtf"] is not None else None, "error": t["error"],
                    "updated_server_ms": t["updated_server_ms"],
                    "cer": with_cer(t["text"], ref_text) if t["status"] == "done" else None,
                }
            segments.append({
                "segment_id": sid, "index": s["idx"], "duration_ms": s["duration_ms"], "bytes": s["bytes"],
                "object_sha256": s["object_sha256"], "audio_present": store.exists(s["object_sha256"]),
                "peak_dbfs": None if s["peak_dbfs_x100"] is None else s["peak_dbfs_x100"] / 100,
                "clipped_samples": s["clipped_samples"], "hf_ratio_4k_ppm": s["hf_ratio_4k_ppm"],
                "flags": _js(s["flags"], []), "recovered": bool(s["recovered"]),
                "route": _js(rec["route"]) if rec else None, "source": rec["source"] if rec else None,
                "effects": _js(rec["effects"]) if rec else None,
                "final": final, "alts": alts, "reference": ref_text,
            })
        return {
            "memo_id": memo_id, "device_id": dev, "kind": m["kind"], "created_wall_ms": m["created_wall_ms"],
            "tz": m["tz"], "languages": _js(m["languages"], DEFAULT_LANGUAGES), "note": m["note"],
            "location": _js(m["location"]), "segments": segments,
            "photos": [{"photo_id": p["photo_id"], "sha256": p["object_sha256"], "mime": p["mime"]}
                       for p in db.query("SELECT * FROM photos WHERE device_id=? AND memo_id=?", (dev, memo_id))
                       if store.exists(p["object_sha256"])],
        }

    # ------------------------------------------------------------------ audio views
    @app.get("/dash/api/segments/{segment_id}/peaks")
    def segment_peaks(segment_id: str, n: int = 1200, conditioned: int = 0):
        if not 16 <= n <= 4000:
            raise HTTPException(422, "n must be 16..4000")
        x = audio_for(segment_id, bool(conditioned))
        lo, hi = peaks(x, n)
        return {"n": n, "duration_ms": int(len(x) * 1000 / 16000), "min": lo, "max": hi,
                "conditioned": bool(conditioned)}

    @app.get("/dash/api/segments/{segment_id}/spectrogram.png")
    def segment_spectrogram(segment_id: str, conditioned: int = 0):
        return Response(spectrogram_png(audio_for(segment_id, bool(conditioned))), media_type="image/png")

    @app.get("/dash/api/segments/{segment_id}/conditioned.wav")
    def conditioned_wav(segment_id: str, request: Request):
        x = audio_for(segment_id, True)
        buf = io.BytesIO()
        sf.write(buf, x, 16000, format="WAV", subtype="PCM_16")
        return range_response(buf.getvalue(), request.headers.get("range"), "audio/wav")

    @app.get("/dash/api/objects/{sha}")
    def get_object(sha: str):
        row = db.one("SELECT mime FROM objects WHERE sha256=?", (sha,)) if HEX64.match(sha) else None
        if row is None or not store.exists(sha):
            raise HTTPException(404, "not found")
        # Starlette's FileResponse implements HTTP Range, so <audio> can seek.
        return FileResponse(store.path(sha), media_type=row["mime"])

    # ------------------------------------------------------------------ comparison and reference
    @app.post("/dash/api/segments/{segment_id}/compare")
    def compare(segment_id: str):
        s = segment_row(segment_id)
        if not store.exists(s["object_sha256"]):
            raise HTTPException(409, "audio not uploaded yet")
        m = db.one("SELECT languages FROM memos WHERE device_id=? AND memo_id=?", (s["device_id"], s["memo_id"]))
        langs = normalize_languages(_js(m["languages"]) if m else None)
        variants = variant_list(langs)
        t = now_ms()
        with db.tx() as c:
            for engine, variant in variants:
                c.execute(
                    "INSERT INTO alt_transcripts(device_id, segment_id, engine, variant, status, "
                    "created_server_ms, updated_server_ms) VALUES (?,?,?,?, 'queued', ?, ?) "
                    "ON CONFLICT(device_id, segment_id, engine, variant) DO UPDATE SET status='queued', "
                    "text=NULL, language=NULL, detect_path=NULL, rtf=NULL, processing_ms=NULL, error=NULL, "
                    "attempts=0, created_server_ms=excluded.created_server_ms, "
                    "updated_server_ms=excluded.updated_server_ms",
                    (s["device_id"], segment_id, engine, variant, t, t))
        state.worker.notify()
        return {"variants": [{"engine": e, "variant": v} for e, v in variants]}

    @app.put("/dash/api/segments/{segment_id}/reference")
    async def set_reference(segment_id: str, request: Request):
        s = segment_row(segment_id)
        try:
            text = (await request.json())["text"]
            if not isinstance(text, str) or len(text) > 20000:
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "body must be {\"text\": string}") from None
        if text.strip():
            db.execute("INSERT INTO reference_transcripts(device_id, segment_id, text, updated_server_ms) "
                       "VALUES (?,?,?,?) ON CONFLICT(device_id, segment_id) DO UPDATE SET text=excluded.text, "
                       "updated_server_ms=excluded.updated_server_ms", (s["device_id"], segment_id, text, now_ms()))
        else:
            db.execute("DELETE FROM reference_transcripts WHERE device_id=? AND segment_id=?",
                       (s["device_id"], segment_id))
        return {"ok": True}

    @app.post("/dash/api/cer")
    async def cer_api(request: Request):
        try:
            body = await request.json()
            ref, hyp = body["reference"], body["hypothesis"]
            if not isinstance(ref, str) or not isinstance(hyp, str):
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "body must be {reference, hypothesis}") from None
        return cer(ref, hyp)

    return app


def range_response(data: bytes, header: str | None, media_type: str) -> Response:
    """Serve in-memory bytes with single-range HTTP Range support."""
    total = len(data)
    base = {"Accept-Ranges": "bytes"}
    if header:
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                a = int(m.group(1))
                b = int(m.group(2)) if m.group(2) else total - 1
            else:  # suffix range
                a, b = max(0, total - int(m.group(2))), total - 1
            b = min(b, total - 1)
            if a > b or a >= total:
                return Response(status_code=416, headers={**base, "Content-Range": f"bytes */{total}"})
            return Response(data[a:b + 1], status_code=206, media_type=media_type,
                            headers={**base, "Content-Range": f"bytes {a}-{b}/{total}"})
    return Response(data, media_type=media_type, headers=base)
