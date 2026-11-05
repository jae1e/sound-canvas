"""Job folders under runs/web/<job-id>/ and cleanup."""
from __future__ import annotations

import json
import secrets
import shutil
import time
from pathlib import Path

LAB_DIR = Path(__file__).resolve().parents[2]
WEB_RUNS = LAB_DIR / "runs" / "web"
KEEP_JOBS = 20
MAX_AGE_DAYS = 7


def new_job(root: Path = WEB_RUNS) -> tuple[str, Path]:
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    job_id = time.strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(2)
    path = root / job_id
    path.mkdir()
    return job_id, path


def job_path(job_id: str, root: Path = WEB_RUNS) -> Path:
    if not job_id or "/" in job_id or "\\" in job_id or job_id.startswith("."):
        raise ValueError("bad job id")
    p = Path(root) / job_id
    if not p.is_dir():
        raise FileNotFoundError(f"job {job_id} not found (it may have been cleaned up)")
    return p


def load_job(job_id: str, root: Path = WEB_RUNS) -> dict:
    return json.loads((job_path(job_id, root) / "job.json").read_text())


def cleanup_jobs(root: Path = WEB_RUNS, keep: int = KEEP_JOBS, max_age_days: float = MAX_AGE_DAYS,
                 now: float | None = None) -> list[str]:
    """Delete jobs older than max_age_days, then all but the newest `keep`. Returns deleted ids."""
    root = Path(root)
    if not root.is_dir():
        return []
    now = time.time() if now is None else now
    jobs = sorted((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.stat().st_mtime, reverse=True)
    deleted = []
    for i, p in enumerate(jobs):
        too_old = now - p.stat().st_mtime > max_age_days * 86400
        if i >= keep or too_old:
            shutil.rmtree(p, ignore_errors=True)
            deleted.append(p.name)
    return deleted
