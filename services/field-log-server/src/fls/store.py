"""Content-addressed object store."""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
from pathlib import Path
from typing import AsyncIterator

from .config import MAX_OBJECT_BYTES

HEX64 = re.compile(r"^[0-9a-f]{64}$")


class TooLarge(Exception):
    pass


class HashMismatch(Exception):
    def __init__(self, actual: str):
        self.actual = actual


class ObjectStore:
    def __init__(self, root: Path):
        self.root = root
        self.tmp = root / "_tmp"
        self.tmp.mkdir(parents=True, exist_ok=True)

    def path(self, sha: str) -> Path:
        return self.root / sha[:2] / sha

    def exists(self, sha: str) -> bool:
        return self.path(sha).is_file()

    async def put_stream(self, sha: str, chunks: AsyncIterator[bytes], max_bytes: int = MAX_OBJECT_BYTES) -> tuple[bool, int]:
        """Stream into a temp file, verify the hash, atomically rename.

        Returns (created, size). Raises TooLarge or HashMismatch.
        """
        h = hashlib.sha256()
        size = 0
        fd, tmp_name = tempfile.mkstemp(dir=self.tmp)
        try:
            with os.fdopen(fd, "wb") as f:
                async for chunk in chunks:
                    size += len(chunk)
                    if size > max_bytes:
                        raise TooLarge()
                    h.update(chunk)
                    f.write(chunk)
                f.flush()
                os.fsync(f.fileno())
            actual = h.hexdigest()
            if actual != sha:
                raise HashMismatch(actual)
            dest = self.path(sha)
            if dest.is_file():
                return False, size
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(tmp_name, dest)
            tmp_name = ""
            return True, size
        finally:
            if tmp_name and os.path.exists(tmp_name):
                os.unlink(tmp_name)
