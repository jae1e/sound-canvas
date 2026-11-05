"""Zeroth-Korean (OpenSLR SLR40, CC BY 4.0) loader: a drop-in Korean speech pool for the clip builders.

Layout after extraction (data/zeroth/): AUDIO_INFO (SPEAKERID|NAME|SEX|SCRIPTID|DATASET) and
<dataset>/<script>/<speaker>/<speaker>_<script>_<utt>.flac. Only the speaker id and sex are used; names in
AUDIO_INFO are never copied into manifests or docs.
"""
from __future__ import annotations

from pathlib import Path

import soundfile as sf

from .clipsets import Corpora


def parse_audio_info(text: str) -> dict[str, dict]:
    """AUDIO_INFO text -> {speaker id: {'gender': 'F'|'M', 'dataset': str}}. Unknown sex gives '?'."""
    out: dict[str, dict] = {}
    for line in text.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 5 or not parts[0].isdigit():
            continue   # header or malformed line
        sex = parts[2].lower()
        out[parts[0]] = {"gender": {"f": "F", "m": "M"}.get(sex, "?"), "dataset": parts[4]}
    return out


def is_complete_flac(path: str | Path) -> bool:
    """True when the file decodes fully (a stream cut by a truncated tar.gz does not)."""
    try:
        info = sf.info(str(path))
        with sf.SoundFile(str(path)) as f:
            return len(f.read(dtype="float32")) == info.frames
    except Exception:
        return False


def drop_truncated(root: str | Path, newest: int = 5) -> list[str]:
    """Delete the newest few FLAC files that do not decode (the cut at the end of a partial download)."""
    files = sorted(Path(root).rglob("*.flac"), key=lambda p: p.stat().st_mtime, reverse=True)[:newest]
    removed = []
    for f in files:
        if not is_complete_flac(f):
            f.unlink()
            removed.append(str(f))
    return removed


def select_speakers(pool: dict[str, dict], min_utts: int) -> dict[str, dict]:
    """Keep speakers with a known gender and at least min_utts usable utterances."""
    return {s: v for s, v in pool.items() if v["gender"] in ("F", "M") and len(v["utts"]) >= min_utts}


class KoreanCorpora(Corpora):
    """Corpora whose speech pool is Zeroth-Korean. Rooms, noises and music still come from the same
    SLR28 and BabySlakh data as the English sets, so only the language of the speech changes."""

    def __init__(self, root: Path, zeroth_dir: Path | None = None, min_utts: int = 40,
                 min_dur: float = 2.0, max_dur: float = 15.0):
        super().__init__(Path(root))
        self.zeroth_dir = Path(zeroth_dir) if zeroth_dir else self.root / "zeroth"
        self.min_utts, self.min_dur, self.max_dur = min_utts, min_dur, max_dur

    def libri(self) -> dict[str, dict]:   # same name and format as the English pool, so builders are unchanged
        if self._libri is None:
            info = parse_audio_info((self.zeroth_dir / "AUDIO_INFO").read_text())
            pool: dict[str, dict] = {}
            for flac in sorted(self.zeroth_dir.glob("*/*/*/*.flac")):
                spk = flac.parent.name
                if spk not in info:
                    continue
                d = sf.info(str(flac)).duration
                if self.min_dur <= d <= self.max_dur:
                    pool.setdefault(spk, {"gender": info[spk]["gender"], "utts": []})["utts"].append((str(flac), d))
            self._libri = select_speakers(pool, self.min_utts)
        return self._libri
