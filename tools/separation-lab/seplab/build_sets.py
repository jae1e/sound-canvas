"""Build every synthetic clip set (about 5 clips per story) under one output root."""
from __future__ import annotations

from pathlib import Path

from .clipsets import (Corpora, build_us1, build_us21, build_us31, build_us61, build_us71, guitar_stems)

STORIES = ["US-3.1", "US-1.x", "US-2.1", "US-7.1", "US-6.1"]

# Fixed recipes. Seeds never change, so clip sets are reproducible from the same corpora.
US31_RECIPES = [(2, True), (2, False), (2, False), (3, True), (3, False)]   # (speakers, same gender)
US1_PASSERS = [1, 1, 2, 2, 1]
US61_SINGERS = [(["female2", "male3"], ["excerpts"]), (["female4", "female5"], ["excerpts"]),
                (["male2", "male5"], ["excerpts"]), (["female3", "male6", "female7"], ["excerpts"]),
                (["male7", "male9"], ["excerpts"])]


def build_all(data_root: str | Path, out_root: str | Path, stories: list[str] | None = None) -> dict[str, list[str]]:
    c = Corpora(Path(data_root))
    out = Path(out_root)
    wanted = stories or STORIES
    made: dict[str, list[str]] = {}
    if "US-3.1" in wanted:
        for i, (n, same) in enumerate(US31_RECIPES):
            d = out / "US-3.1" / f"clip{i + 1}_{n}spk_{'same' if same else 'mixed'}"
            build_us31(c, d, 310 + i, n, same)
            made.setdefault("US-3.1", []).append(str(d))
    if "US-1.x" in wanted:
        for i, p in enumerate(US1_PASSERS):
            d = out / "US-1.x" / f"clip{i + 1}_{p}passers"
            build_us1(c, d, 110 + i, p)
            made.setdefault("US-1.x", []).append(str(d))
    if "US-2.1" in wanted:
        for i in range(5):
            d = out / "US-2.1" / f"clip{i + 1}"
            build_us21(c, d, 210 + i, music_snr_db=[0.0, -3.0, 0.0, 3.0, -3.0][i])
            made.setdefault("US-2.1", []).append(str(d))
    if "US-7.1" in wanted:
        # One clip per song with two or more guitar stems; the target is the acoustic guitar if there is one.
        songs = [(s, guitar_stems(s)) for s in c.songs()]
        songs = [(s, g) for s, g in songs if len(g) >= 2][:5]
        for i, (song, gs) in enumerate(songs):
            stem = next((sid for sid, name in gs if "Acoustic" in name), gs[0][0])
            d = out / "US-7.1" / f"clip{i + 1}_{song.name}_{stem}"
            build_us71(c, d, 710 + i, song, stem)
            made.setdefault("US-7.1", []).append(str(d))
    if "US-6.1" in wanted:
        for i, (singers, techs) in enumerate(US61_SINGERS):
            d = out / "US-6.1" / f"clip{i + 1}_{len(singers)}singers"
            build_us61(c, d, 610 + i, singers, techs)
            made.setdefault("US-6.1", []).append(str(d))
    return made
