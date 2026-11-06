"""Local quality dashboard (requirement S-5). Loopback only, no auth, shares the server's state."""

from __future__ import annotations

import asyncio
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
from .engines.aligner import safe_align
from .events import requeue_final
from .canon import canonical
from .db import now_ms
from .dsp_views import peaks, spectrogram_png
from .jobs import uses_raw_audio, variant_list
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


ROUTE_TOLERANCE_US = 1_000_000  # a route event may be stamped slightly after the segment it opens


def recording_timeline(db: Any, dev: str, memo_id: str) -> dict[str, Any]:
    """Route, pause and silenced-capture history of a memo, read from its events."""
    rows = db.query(
        "SELECT type, wall_ms, elapsed_us, payload FROM events WHERE device_id=? AND type IN "
        "('recording_started','route_changed','recording_paused','recording_resumed','capture_state',"
        "'recording_stopped') AND json_extract(payload,'$.memo_id')=? ORDER BY seq", (dev, memo_id))
    events, routes, paused, silenced = [], [], [], []
    open_pause: dict[str, int] = {}
    open_sil: dict[str, int] = {}
    for r in rows:
        p = _js(r["payload"], {})
        rec, t = p.get("recording_id"), r["elapsed_us"]
        ev = {"type": r["type"], "elapsed_us": t, "wall_ms": r["wall_ms"], "recording_id": rec}
        if r["type"] in ("recording_started", "route_changed"):
            route = p.get("route") or {}
            routes.append({"recording_id": rec, "elapsed_us": t, "route": route,
                           "reason": p.get("reason") if r["type"] == "route_changed" else None})
            ev.update(route=route, reason=p.get("reason"))
        elif r["type"] == "recording_paused":
            open_pause[rec] = t
        elif r["type"] == "recording_resumed" and rec in open_pause:
            paused.append({"start_us": open_pause.pop(rec), "end_us": t})
        elif r["type"] == "capture_state":
            ev["silenced"] = bool(p.get("silenced"))
            if p.get("silenced"):
                open_sil.setdefault(rec, t)
            elif rec in open_sil:
                silenced.append({"start_us": open_sil.pop(rec), "end_us": t})
        elif r["type"] == "recording_stopped":
            ev["reason"] = p.get("reason")
            if rec in open_pause:
                paused.append({"start_us": open_pause.pop(rec), "end_us": t})
            if rec in open_sil:
                silenced.append({"start_us": open_sil.pop(rec), "end_us": t})
        events.append(ev)
    for rec, t in open_pause.items():  # still open (recording not stopped yet)
        paused.append({"start_us": t, "end_us": None})
    for rec, t in open_sil.items():
        silenced.append({"start_us": t, "end_us": None})
    return {"events": events, "routes": routes, "paused": paused, "silenced": silenced}


def route_at(routes: list[dict], recording_id: str, start_us: int | None) -> dict | None:
    """The route in effect at a segment's start (latest route event of its recording at or before it)."""
    mine = [r for r in routes if r["recording_id"] == recording_id]
    if not mine:
        return None
    if start_us is None:
        return mine[0]
    best = mine[0]
    for r in mine:
        if r["elapsed_us"] <= start_us + ROUTE_TOLERANCE_US:
            best = r
    return best


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
            first = db.one("SELECT t.text FROM segments s JOIN transcripts t ON t.device_id=s.device_id AND "
                           "t.segment_id=s.segment_id WHERE s.device_id=? AND s.memo_id=? AND t.status='done' "
                           "AND t.no_speech=0 AND t.text<>'' ORDER BY s.idx LIMIT 1", (dev, mid))
            seg0 = db.one("SELECT recording_id, start_elapsed_us FROM segments WHERE device_id=? AND memo_id=? "
                          "ORDER BY idx LIMIT 1", (dev, mid))
            dur = db.one("SELECT COALESCE(SUM(duration_ms),0) d FROM segments WHERE device_id=? AND memo_id=?",
                         (dev, mid))["d"]
            inp = None
            if seg0:
                inp = (route_at(recording_timeline(db, dev, mid)["routes"], seg0["recording_id"],
                                seg0["start_elapsed_us"]) or {}).get("route")
            out.append({
                "title": m["title"], "snippet": (first["text"][:40] if first else None),
                "duration_ms": dur, "input": inp,
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
        timeline = recording_timeline(db, dev, memo_id)
        for s in db.query("SELECT * FROM segments WHERE device_id=? AND memo_id=? ORDER BY idx, rowid", (dev, memo_id)):
            sid = s["segment_id"]
            rec = db.one("SELECT * FROM recordings WHERE device_id=? AND recording_id=?", (dev, s["recording_id"]))
            t = db.one("SELECT * FROM transcripts WHERE device_id=? AND segment_id=?", (dev, sid))
            ref = db.one("SELECT text, words FROM reference_transcripts WHERE device_id=? AND segment_id=?", (dev, sid))
            ref_text = ref["text"] if ref else None
            alts = [{
                "engine": a["engine"], "variant": a["variant"], "status": a["status"], "language": a["language"],
                "detect_path": a["detect_path"], "text": a["text"],
                "rtf": float(a["rtf"]) if a["rtf"] is not None else None, "processing_ms": a["processing_ms"],
                "error": a["error"], "updated_server_ms": a["updated_server_ms"],
                "words": _js(a["words"]), "words_kind": a["words_kind"] or "words",
                "cer": with_cer(a["text"], ref_text) if a["status"] == "done" else None,
            } for a in db.query("SELECT * FROM alt_transcripts WHERE device_id=? AND segment_id=? "
                                "ORDER BY created_server_ms, rowid", (dev, sid))]
            final = None
            if t is not None:
                final = {
                    "status": t["status"], "engine": t["engine"], "text": t["text"], "language": t["language"],
                    "no_speech": bool(t["no_speech"]), "detect_path": t["detect_path"],
                    "words": _js(t["words"]), "words_kind": "words",
                    "no_speech_reason": t["no_speech_reason"], "speech_ms": t["speech_ms"],
                    "filtered_text": t["filtered_text"],
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
                "route": (route_at(timeline["routes"], s["recording_id"], s["start_elapsed_us"]) or {}).get("route")
                or (_js(rec["route"]) if rec else None),
                "route_reason": (route_at(timeline["routes"], s["recording_id"], s["start_elapsed_us"]) or {}).get("reason"),
                "start_elapsed_us": s["start_elapsed_us"], "end_elapsed_us": s["end_elapsed_us"],
                "recording_id": s["recording_id"], "source": rec["source"] if rec else None,
                "effects": _js(rec["effects"]) if rec else None,
                "final": final, "alts": alts, "reference": ref_text,
                "reference_words": _js(ref["words"]) if ref else None,
            })
        return {
            "memo_id": memo_id, "device_id": dev, "kind": m["kind"], "created_wall_ms": m["created_wall_ms"],
            "tz": m["tz"], "languages": _js(m["languages"], DEFAULT_LANGUAGES), "note": m["note"],
            "title": m["title"], "duration_ms": sum(x["duration_ms"] or 0 for x in segments),
            "snippet": next((x["final"]["text"][:40] for x in segments if x["final"] and x["final"]["status"] == "done"
                             and not x["final"]["no_speech"] and x["final"]["text"]), None),
            "input": next((x["route"] for x in segments if x["route"]), None),
            "location": _js(m["location"]), "segments": segments, "timeline": timeline,
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
                    "text=NULL, language=NULL, detect_path=NULL, rtf=NULL, processing_ms=NULL, words=NULL, words_kind=NULL, error=NULL, "
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
                       "words=CASE WHEN text=excluded.text THEN words ELSE NULL END, "
                       "updated_server_ms=excluded.updated_server_ms", (s["device_id"], segment_id, text, now_ms()))
        else:
            db.execute("DELETE FROM reference_transcripts WHERE device_id=? AND segment_id=?",
                       (s["device_id"], segment_id))
        return {"ok": True}

    @app.post("/dash/api/segments/{segment_id}/retranscribe")
    def dash_retranscribe(segment_id: str):
        """Transcribe anyway: internal (loopback) twin of the device endpoint."""
        s = segment_row(segment_id)
        err = requeue_final(db, s["device_id"], segment_id, True)
        if err:
            raise HTTPException(409 if err == "no_audio" else 404, err)
        state.worker.notify()
        state.notifier.notify()
        return {"status": "queued"}

    @app.post("/dash/api/segments/{segment_id}/align")
    async def align(segment_id: str, request: Request):
        """Word timestamps for one row: {"row": "final" | "alt:<engine>/<variant>" | "reference"}."""
        s = segment_row(segment_id)
        try:
            row = (await request.json())["row"]
            if not isinstance(row, str):
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "body must be {\"row\": string}") from None
        if state.aligner is None:
            raise HTTPException(503, "aligner unavailable")
        dev = s["device_id"]
        m = db.one("SELECT languages FROM memos WHERE device_id=? AND memo_id=?", (dev, s["memo_id"]))
        langs = normalize_languages(_js(m["languages"]) if m else None)
        raw_audio = False
        if row == "final":
            r = db.one("SELECT text, language FROM transcripts WHERE device_id=? AND segment_id=? AND status='done'",
                       (dev, segment_id))
        elif row == "reference":
            r = db.one("SELECT text FROM reference_transcripts WHERE device_id=? AND segment_id=?", (dev, segment_id))
            if r is not None:  # no detected language: guess from the script
                r = {"text": r["text"], "language": "ko" if any("\uac00" <= c <= "\ud7a3" for c in r["text"]) else ""}
        elif row.startswith("alt:") and "/" in row:
            engine, variant = row[4:].split("/", 1)
            r = db.one("SELECT text, language FROM alt_transcripts WHERE device_id=? AND segment_id=? "
                       "AND engine=? AND variant=? AND status='done'", (dev, segment_id, engine, variant))
            raw_audio = uses_raw_audio(engine, variant)
        else:
            raise HTTPException(422, "unknown row")
        if r is None or not (r["text"] or "").strip():
            raise HTTPException(409, "row has no text to align")
        audio = audio_for(segment_id, not raw_audio)
        words = await asyncio.to_thread(safe_align, state.aligner, audio, r["text"], r["language"] or "", langs)
        if words is None:
            raise HTTPException(502, "alignment failed")
        t = now_ms()
        wj = canonical(words)
        if row == "final":
            db.execute("UPDATE transcripts SET words=?, updated_server_ms=? WHERE device_id=? AND segment_id=?",
                       (wj, t, dev, segment_id))
            state.notifier.notify()
        elif row == "reference":
            db.execute("UPDATE reference_transcripts SET words=? WHERE device_id=? AND segment_id=?", (wj, dev, segment_id))
        else:
            db.execute("UPDATE alt_transcripts SET words=?, words_kind='words' WHERE device_id=? AND segment_id=? "
                       "AND engine=? AND variant=?", (wj, dev, segment_id, engine, variant))
        return {"words": words}

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
