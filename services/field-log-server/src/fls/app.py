"""FastAPI application implementing docs/products/industrial-voice-logging/api-v0.md."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket
from fastapi.responses import FileResponse, JSONResponse

from . import __version__, auth
from .config import (ALLOWED_OBJECT_TYPES, MAX_EVENTS_PER_BATCH, MAX_LIVE_STREAMS, MAX_OBJECT_BYTES,
                     Paths)
from .db import Database, now_ms
from .engines.aligner import Aligner
from .engines.base import FinalEngine, StreamingEngine
from . import events as events_mod
from .events import enqueue_for_object, ingest, requeue_final
from .jobs import Worker
from .nospeech import LIVE_STOCK_MAX_RMS_DBFS, is_stock_phrase
from .store import HEX64, HashMismatch, ObjectStore, TooLarge

log = logging.getLogger("fls.app")

MAX_FRAME_BYTES = 64 * 1024


class ChangeNotifier:
    """Wakes long-poll requests when any transcript row changes (callable from any thread)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._waiters: set[tuple[asyncio.AbstractEventLoop, asyncio.Event]] = set()

    def register(self) -> tuple[asyncio.AbstractEventLoop, asyncio.Event]:
        w = (asyncio.get_running_loop(), asyncio.Event())
        with self._lock:
            self._waiters.add(w)
        return w

    def unregister(self, w) -> None:
        with self._lock:
            self._waiters.discard(w)

    def notify(self) -> None:
        with self._lock:
            waiters = list(self._waiters)
        for loop, ev in waiters:
            try:
                loop.call_soon_threadsafe(ev.set)
            except RuntimeError:  # loop already closed
                pass


@dataclass
class State:
    paths: Paths
    db: Database
    store: ObjectStore
    final_engine: FinalEngine
    live_engine: StreamingEngine | None
    worker: Worker
    notifier: ChangeNotifier
    limiter: auth.EnrollLimiter = field(default_factory=auth.EnrollLimiter)
    live_active: int = 0
    live_lock: threading.Lock = field(default_factory=threading.Lock)
    live_pool: ThreadPoolExecutor = field(
        default_factory=lambda: ThreadPoolExecutor(max_workers=MAX_LIVE_STREAMS, thread_name_prefix="fls-live")
    )
    live_error: str | None = None
    aligner: Aligner | None = None


def create_app(data_dir: Path, final_engine: FinalEngine, live_engine: StreamingEngine | None,
               aligner: Aligner | None = None) -> FastAPI:
    paths = Paths(Path(data_dir))
    paths.ensure()
    db = Database(paths.db)
    store = ObjectStore(paths.objects)
    notifier = ChangeNotifier()
    state = State(paths, db, store, final_engine, live_engine,
                  Worker(db, store, final_engine, live_engine, aligner, notifier.notify), notifier,
                  aligner=aligner)

    def _preload_live() -> None:
        try:
            if live_engine is not None:
                live_engine.preload()
        except Exception as e:  # noqa: BLE001
            state.live_error = type(e).__name__
            log.error("live engine preload failed: %s", e)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        state.worker.start()
        threading.Thread(target=_preload_live, name="fls-live-preload", daemon=True).start()
        yield
        state.worker.stop()
        state.live_pool.shutdown(wait=False, cancel_futures=True)
        db.close()

    app = FastAPI(title="Field Voice Log server", version=__version__, lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)
    app.state.fls = state
    events_mod._objects_path = state.store.path

    def device_id(request: Request) -> str:
        dev = auth.authenticate(db, request.headers.get("authorization"))
        if dev is None:
            raise HTTPException(401, "invalid or missing token", headers={"WWW-Authenticate": "Bearer"})
        return dev

    # ---------------------------------------------------------------- enrol, health, clock
    @app.post("/v1/enroll")
    async def enroll(request: Request):
        if state.limiter.blocked():
            raise HTTPException(429, "too many failed attempts")
        try:
            body = await request.json()
            code = body["pairing_code"]
            info = body.get("device", {})
            if not isinstance(code, str) or not isinstance(info, dict):
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "bad body") from None
        res = auth.enroll(db, code, info)
        if res is None:
            state.limiter.fail()
            raise HTTPException(403, "unknown, expired or used pairing code")
        dev, token = res
        log.info("device enrolled id=%s", dev)
        return {"device_id": dev, "token": token, "server_time_ms": now_ms()}

    @app.get("/v1/health")
    def health(_: str = Depends(device_id)):
        le = state.live_engine
        return {
            "server_time_ms": now_ms(),
            "version": __version__,
            "final_engine": state.final_engine.name,
            "streaming_engine": le.name if le else None,
            "streaming_available": bool(le and le.available and state.live_error is None),
        }

    @app.post("/v1/clock")
    async def clock(request: Request, _: str = Depends(device_id)):
        recv = time.time_ns() // 1_000_000
        try:
            body = await request.json()
            w, e = body["client_send_wall_ms"], body["client_send_elapsed_us"]
            if isinstance(w, bool) or isinstance(e, bool) or not isinstance(w, int) or not isinstance(e, int):
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "bad body") from None
        return {"client_send_wall_ms": w, "client_send_elapsed_us": e, "server_recv_ms": recv,
                "server_send_ms": time.time_ns() // 1_000_000}

    # ---------------------------------------------------------------- objects
    def _owns(dev: str, sha: str) -> bool:
        return db.one("SELECT 1 FROM object_owners WHERE sha256=? AND device_id=?", (sha, dev)) is not None

    @app.put("/v1/objects/{sha}")
    async def put_object(sha: str, request: Request, dev: str = Depends(device_id)):
        if not HEX64.match(sha):
            raise HTTPException(422, "sha256 must be 64 lowercase hex characters")
        mime = request.headers.get("content-type", "").split(";")[0].strip().lower()
        if mime not in ALLOWED_OBJECT_TYPES:
            raise HTTPException(415, "unsupported content type")
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > MAX_OBJECT_BYTES:
            raise HTTPException(413, "object too large")
        try:
            created, size = await state.store.put_stream(sha, request.stream())
        except TooLarge:
            raise HTTPException(413, "object too large") from None
        except HashMismatch:
            raise HTTPException(422, "body sha256 differs from path") from None
        t = now_ms()
        with db.tx() as c:
            c.execute("INSERT OR IGNORE INTO objects(sha256, size, mime, created_server_ms) VALUES (?,?,?,?)",
                      (sha, size, mime, t))
            c.execute("INSERT OR IGNORE INTO object_owners(sha256, device_id) VALUES (?,?)", (sha, dev))
        if enqueue_for_object(db, sha):
            state.worker.notify()
            notifier.notify()
        log.info("object put sha=%s size=%d created=%s", sha[:12], size, created)
        return JSONResponse({"sha256": sha, "size": size}, status_code=201 if created else 200)

    @app.api_route("/v1/objects/{sha}", methods=["HEAD"])
    def head_object(sha: str, dev: str = Depends(device_id)):
        if not HEX64.match(sha) or not _owns(dev, sha) or not state.store.exists(sha):
            return Response(status_code=404)
        return Response(status_code=200)

    @app.get("/v1/objects/{sha}")
    def get_object(sha: str, dev: str = Depends(device_id)):
        row = db.one("SELECT mime FROM objects WHERE sha256=?", (sha,)) if HEX64.match(sha) else None
        if row is None or not _owns(dev, sha) or not state.store.exists(sha):
            raise HTTPException(404, "not found")
        return FileResponse(state.store.path(sha), media_type=row["mime"],
                            headers={"X-Content-Type-Options": "nosniff"})

    # ---------------------------------------------------------------- events
    @app.post("/v1/events")
    async def post_events(request: Request, dev: str = Depends(device_id)):
        try:
            body = await request.json()
            events = body["events"]
            if not isinstance(events, list):
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "bad body") from None
        if len(events) > MAX_EVENTS_PER_BATCH:
            raise HTTPException(413, f"at most {MAX_EVENTS_PER_BATCH} events per request")
        results, last, enq = await asyncio.to_thread(ingest, db, dev, events, state.store.exists, state.store.path)
        if enq:
            state.worker.notify()
        notifier.notify()  # new queued rows, or rows removed by a deletion
        acc = sum(r["status"] == "accepted" for r in results)
        log.info("events device=%s n=%d accepted=%d last_seq=%d", dev, len(events), acc, last)
        return {"results": results, "last_seq": last}

    # ---------------------------------------------------------------- transcripts
    def _segment_json(r) -> dict[str, Any]:
        done = r["status"] == "done"
        return {
            "segment_id": r["segment_id"], "memo_id": r["memo_id"], "index": r["idx"],
            "status": r["status"], "engine": r["engine"],
            "text": r["text"] if done else None,
            "language": r["language"] if done else None,
            "no_speech": bool(r["no_speech"]),
            "no_speech_reason": r["no_speech_reason"] if done else None,
            "speech_ms": r["speech_ms"] if done else None,
            "filtered_text": r["filtered_text"] if done else None,
            "confidence": r["confidence"],
            "words": json.loads(r["words"]) if r["words"] else None,
            "rtf": float(r["rtf"]) if r["rtf"] is not None else None,
            "updated_server_ms": r["updated_server_ms"],
            "error": r["error"],
        }

    @app.get("/v1/memos/{memo_id}/transcript")
    def memo_transcript(memo_id: str, dev: str = Depends(device_id)):
        m = db.one("SELECT deleted_server_ms FROM memos WHERE device_id=? AND memo_id=?", (dev, memo_id))
        if m is not None and m["deleted_server_ms"] is not None:
            raise HTTPException(404, "memo deleted")
        rows = db.query("SELECT * FROM transcripts WHERE device_id=? AND memo_id=? ORDER BY idx, segment_id",
                        (dev, memo_id))
        return {"memo_id": memo_id, "segments": [_segment_json(r) for r in rows]}

    @app.get("/v1/transcripts")
    async def transcripts(since_server_ms: int = 0, wait_s: int | None = None, dev: str = Depends(device_id)):
        if wait_s is not None and not 1 <= wait_s <= 25:
            raise HTTPException(422, "wait_s must be 1..25")

        def query():
            now = now_ms()
            rows = db.query(
                "SELECT * FROM transcripts WHERE device_id=? AND updated_server_ms>=? "
                "ORDER BY updated_server_ms, segment_id", (dev, since_server_ms))
            return rows, now

        if wait_s is None:
            rows, now = query()
            return {"segments": [_segment_json(r) for r in rows], "now_server_ms": now}
        # Long poll: register first so a change between the query and the wait is not missed.
        waiter = notifier.register()
        try:
            deadline = time.monotonic() + wait_s
            while True:
                waiter[1].clear()
                rows, now = query()
                left = deadline - time.monotonic()
                if rows or left <= 0:
                    return {"segments": [_segment_json(r) for r in rows], "now_server_ms": now}
                try:
                    await asyncio.wait_for(waiter[1].wait(), timeout=left)
                except asyncio.TimeoutError:
                    pass
        finally:
            notifier.unregister(waiter)

    @app.post("/v1/segments/{segment_id}/retranscribe", status_code=202)
    async def retranscribe(segment_id: str, request: Request, dev: str = Depends(device_id)):
        try:
            if (await request.json()).get("force") is not True:
                raise ValueError
        except Exception:  # noqa: BLE001
            raise HTTPException(422, 'body must be {"force": true}') from None
        err = requeue_final(db, dev, segment_id, True)
        if err == "not_found":
            raise HTTPException(404, "segment not found")
        if err == "no_audio":
            raise HTTPException(409, "audio not uploaded yet")
        state.worker.notify()
        notifier.notify()
        log.info("retranscribe queued segment=%s", segment_id)
        return {"segment_id": segment_id, "status": "queued"}

    # ---------------------------------------------------------------- live preview
    @app.websocket("/v1/live")
    async def live(ws: WebSocket):
        dev = auth.authenticate(db, ws.headers.get("authorization"))
        if dev is None:
            await ws.send_denial_response(Response("unauthorized", status_code=401))
            return
        await ws.accept()
        eng = state.live_engine
        with state.live_lock:
            ok = eng is not None and eng.available and state.live_error is None \
                and state.live_active < MAX_LIVE_STREAMS
            if ok:
                state.live_active += 1
        if not ok:
            await ws.send_json({"type": "busy"})
            await ws.close()
            return
        loop = asyncio.get_running_loop()
        stream = None
        t_open = time.monotonic()
        frames = 0
        try:
            start = json.loads(await asyncio.wait_for(ws.receive_text(), timeout=15))
            if start.get("type") != "start":
                raise ValueError("first message must be start")
            lang = start.get("language", "auto")
            stream = await loop.run_in_executor(state.live_pool, eng.open_stream, lang)
            await ws.send_json({"type": "ready", "engine": eng.name})
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                if msg.get("bytes") is not None:
                    data = msg["bytes"]
                    if len(data) > MAX_FRAME_BYTES or len(data) % 2:
                        await ws.send_json({"type": "error", "message": "bad frame size"})
                        break
                    frames += 1
                    pcm = np.frombuffer(data, dtype="<i2")
                    events = await loop.run_in_executor(state.live_pool, stream.feed, pcm)
                    await _send_events(ws, events)
                elif msg.get("text") is not None:
                    if json.loads(msg["text"]).get("type") == "end":
                        events = await loop.run_in_executor(state.live_pool, stream.finish)
                        await _send_events(ws, events)
                        break
            await ws.close()
        except (json.JSONDecodeError, ValueError, asyncio.TimeoutError, AttributeError):
            try:
                await ws.send_json({"type": "error", "message": "protocol error"})
                await ws.close()
            except Exception:  # noqa: BLE001
                pass
        except Exception as e:  # noqa: BLE001 - includes client disconnects
            if type(e).__name__ not in ("WebSocketDisconnect", "RuntimeError", "ConnectionClosedError"):
                log.warning("live stream error: %s", type(e).__name__)
        finally:
            if stream is not None:
                stream.close()
            with state.live_lock:
                state.live_active -= 1
            log.info("live closed device=%s frames=%d secs=%.1f", dev, frames, time.monotonic() - t_open)

    async def _send_events(ws: WebSocket, events) -> None:
        for e in events:
            if e.kind == "final" and is_stock_phrase(e.text) and e.rms_dbfs is not None \
                    and e.rms_dbfs < LIVE_STOCK_MAX_RMS_DBFS:
                log.info("live final dropped (stock phrase, rms %.0f dBFS)", e.rms_dbfs)
                continue
            if e.kind == "partial":
                await ws.send_json({"type": "partial", "text": e.text, "utterance": e.utterance})
            else:
                await ws.send_json({"type": "final", "text": e.text, "utterance": e.utterance,
                                    "start_ms": e.start_ms, "end_ms": e.end_ms})

    return app
