"""Paths and constants."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

MAX_OBJECT_BYTES = 50 * 1024 * 1024
MAX_EVENTS_PER_BATCH = 200
MAX_LIVE_STREAMS = 2
MAX_JOB_RETRIES = 2
PAIRING_TTL_S = 600
ALLOWED_OBJECT_TYPES = {
    "audio/wav": ".wav",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/webp": ".webp",
}


def default_data_dir() -> Path:
    env = os.environ.get("FLS_DATA_DIR")
    if env:
        return Path(env).expanduser()
    return Path.home() / ".local" / "share" / "field-log-server"


@dataclass(frozen=True)
class Paths:
    root: Path

    @property
    def db(self) -> Path:
        return self.root / "db.sqlite3"

    @property
    def objects(self) -> Path:
        return self.root / "objects"

    @property
    def models(self) -> Path:
        return self.root / "models"

    def ensure(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self.objects.mkdir(parents=True, exist_ok=True)
        self.models.mkdir(parents=True, exist_ok=True)
