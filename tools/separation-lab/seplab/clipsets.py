"""Synthetic clip-set builders with ground truth (stems, activity and a manifest.json per clip).

Corpora (all under one data root, see DATA.md): LibriSpeech test-clean, OpenSLR SLR28 RIRs and noises,
BabySlakh, VocalSet. Every builder is deterministic for a given seed. Audio is mono 16 kHz float32.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import soundfile as sf
import yaml

from .audio_io import read_wav, resample, write_wav
from .synth import (Segment, alternate_phrases, convolve_keep_level, energy_vad, loop_to_length, merge_segments,
                    overlap_fraction, power, schedule_turns, shift_segments, snr_gain)

SR = 16000


def db_gain(db: float) -> float:
    return float(10 ** (db / 20))


def marked_span(segs: list[Segment], others: list[Segment], max_len: float = 6.0, min_len: float = 2.0) -> Segment | None:
    """The longest stretch of segs that no other speaker overlaps, cut to max_len: a 'mark a moment' prompt."""
    others = merge_segments(others)
    best: Segment | None = None
    for s, e in merge_segments(segs, 0.0):
        cuts = [(s, e)]
        for os_, oe in others:
            nxt = []
            for a, b in cuts:
                if oe <= a or os_ >= b:
                    nxt.append((a, b))
                else:
                    if os_ > a:
                        nxt.append((a, os_))
                    if oe < b:
                        nxt.append((oe, b))
            cuts = nxt
        for a, b in cuts:
            if b - a >= min_len and (best is None or b - a > best[1] - best[0]):
                best = (a, b)
    if best is None:
        return None
    return (best[0], min(best[1], best[0] + max_len))


# ----------------------------------------------------------------------------------------------- corpora

@dataclass
class Corpora:
    root: Path
    _libri: dict | None = field(default=None, repr=False)

    # LibriSpeech
    def libri(self) -> dict[str, dict]:
        """speaker id -> {'gender': 'F'|'M', 'utts': [(path, duration_s)]}, utterances of 2-15 s."""
        if self._libri is None:
            base = self.root / "librispeech" / "LibriSpeech"
            genders = {}
            for line in (base / "SPEAKERS.TXT").read_text().splitlines():
                if line.startswith(";"):
                    continue
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 3:
                    genders[parts[0]] = parts[1]
            out = {}
            for spk_dir in sorted((base / "test-clean").iterdir()):
                utts = []
                for f in sorted(spk_dir.rglob("*.flac")):
                    d = sf.info(str(f)).duration
                    if 2.0 <= d <= 15.0:
                        utts.append((str(f), d))
                if utts:
                    out[spk_dir.name] = {"gender": genders.get(spk_dir.name, "?"), "utts": utts}
            self._libri = out
        return self._libri

    def rirs(self, size: str) -> list[str]:
        return sorted(str(p) for p in (self.root / "slr28" / "RIRS_NOISES" / "simulated_rirs" / size).rglob("*.wav"))

    def noises(self) -> list[str]:
        """Background-labelled public-domain Freesound noises from SLR28 (the dataset's own annotation)."""
        base = self.root / "slr28" / "RIRS_NOISES" / "pointsource_noises"
        ids = []
        for line in (base / "ANNOTATIONS").read_text().splitlines():
            if line.startswith("Background"):
                continue
            if line.startswith("Foreground"):
                break
            if line.startswith("noise-free-sound-"):
                ids.append(line.strip())
        return [str(base / f"{i}.wav") for i in ids if (base / f"{i}.wav").exists()]

    def songs(self) -> list[Path]:
        return sorted(p for p in (self.root / "babyslakh").rglob("Track*") if p.is_dir() and not p.name.startswith("._"))

    def music(self) -> list[str]:
        return [str(s / "mix.wav") for s in self.songs()]

    def vocalset_files(self, singer: str, technique_dir: str) -> list[str]:
        base = self.root / "vocalset" / "FULL" / singer / technique_dir
        return sorted(str(p) for p in base.rglob("*.wav") if not p.name.startswith("._"))


def load16(path: str) -> np.ndarray:
    x, sr = read_wav(path)
    return resample(x, sr, SR)


def pick(rng: np.random.Generator, items: list, k: int = 1) -> list:
    idx = rng.choice(len(items), size=k, replace=False)
    return [items[int(i)] for i in idx]


# ----------------------------------------------------------------------------------------------- writing

def write_clip(out_dir: Path, story: str, seed: int, targets: list[dict], others_parts: dict[str, np.ndarray],
               extra: dict | None = None) -> dict:
    """Write mixture, one WAV per target, others, per-part WAVs and manifest.json (run-story compatible).

    targets: dicts with name, audio (n,), description, spans [(sign, s, e)], activity [(s, e)], plus any
    extra keys (kept in the manifest). mixture == sum(targets) + others exactly, after one common gain.
    """
    n = len(next(iter(others_parts.values()))) if others_parts else len(targets[0]["audio"])
    others = np.sum(list(others_parts.values()), axis=0).astype(np.float32) if others_parts else np.zeros(n, np.float32)
    mix = others + np.sum([t["audio"] for t in targets], axis=0)
    peak = float(np.max(np.abs(mix)))
    scale = 0.9 / peak if peak > 0.9 else 1.0
    out_dir.mkdir(parents=True, exist_ok=True)
    write_wav(out_dir / "mixture.wav", mix * scale, SR)
    write_wav(out_dir / "others.wav", others * scale, SR)
    entries = []
    for t in targets:
        fn = f"{t['name']}.wav"
        write_wav(out_dir / fn, t["audio"] * scale, SR)
        meta = {k: v for k, v in t.items() if k != "audio"}
        meta.update(path=fn, spans=[list(s) for s in t.get("spans", [])],
                    activity=[list(a) for a in t.get("activity", [])])
        entries.append(meta)
    parts = []
    for name, x in others_parts.items():
        write_wav(out_dir / f"others_{name}.wav", x * scale, SR)
        parts.append({"name": name, "path": f"others_{name}.wav"})
    manifest = {"story": story, "seed": seed, "sr": SR, "n_samples": n, "gain": scale, "mixture": "mixture.wav",
                "others": "others.wav", "targets": entries, "others_parts": parts, **(extra or {})}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def speech_activity(x: np.ndarray, offset_s: float, limit_s: float) -> list[Segment]:
    return shift_segments(energy_vad(x, SR), offset_s, limit_s)


def place(canvas: np.ndarray, x: np.ndarray, start_s: float) -> None:
    s = int(round(start_s * SR))
    seg = x[: max(len(canvas) - s, 0)]
    canvas[s: s + len(seg)] += seg


def speaker_track(utts: list[tuple[str, float]], plan_starts: list[tuple[int, float]], total_s: float):
    """Dry track for one speaker from placements (utt_index, start_s). Returns (track, activity segments)."""
    track = np.zeros(int(total_s * SR), np.float32)
    act: list[Segment] = []
    for idx, start in plan_starts:
        x = load16(utts[idx][0])
        place(track, x, start)
        act += speech_activity(x, start, total_s)
    return track, merge_segments(act, 0.0)


def babble(c: Corpora, rng: np.random.Generator, total_s: float, n_speakers: int, exclude: set[str],
           rir_size: str = "largeroom") -> np.ndarray:
    """Sum of several continuous reverberant speakers, unit-ish level (caller rescales)."""
    lib = c.libri()
    spks = pick(rng, [s for s in lib if s not in exclude], n_speakers)
    rirs = c.rirs(rir_size)
    total = np.zeros(int(total_s * SR), np.float32)
    for s in spks:
        pool = lib[s]["utts"]
        cursor, order = 0.0, rng.permutation(len(pool))
        track = np.zeros_like(total)
        for i in order:
            if cursor >= total_s:
                break
            x = load16(pool[int(i)][0])
            place(track, x, cursor)
            cursor += len(x) / SR + float(rng.uniform(0.2, 1.0))
        rir = load16(pick(rng, rirs)[0])
        total += convolve_keep_level(track, rir) / np.sqrt(power(track[track != 0]) if np.any(track) else 1.0)
    return total


def background(c: Corpora, rng: np.random.Generator, total_s: float, music_noise_ratio_db: float = 0.0):
    """Music plus ambient noise as separate parts (each looped to length, unit power ratio set by caller)."""
    n = int(total_s * SR)
    mus = load16(pick(rng, c.music())[0])
    noi = load16(pick(rng, c.noises())[0])
    mus = loop_to_length(mus, n, int(rng.integers(len(mus))))
    noi = loop_to_length(noi, n, int(rng.integers(len(noi))))
    noi = noi * snr_gain(noi, mus, music_noise_ratio_db)
    return mus.astype(np.float32), noi.astype(np.float32)


# ----------------------------------------------------------------------------------------------- US-3.1

def build_us31(c: Corpora, out_dir: Path, seed: int, n_speakers: int, same_gender: bool, bg_snr_db: float = 10.0) -> dict:
    rng = np.random.default_rng(seed)
    lib = c.libri()
    ids = sorted(lib)
    for _ in range(1000):
        spks = pick(rng, ids, n_speakers)
        g = {lib[s]["gender"] for s in spks}
        if (len(g) == 1) == same_gender:
            break
    total_s = float(rng.uniform(60, 120))
    for attempt in range(40):
        arng = np.random.default_rng(seed * 1000 + attempt)
        order = {s: arng.permutation(len(lib[s]["utts"])) for s in spks}
        utts = {s: [lib[s]["utts"][int(i)] for i in order[s]] for s in spks}
        durs = {s: [d for _, d in utts[s]] for s in spks}
        plan = schedule_turns(durs, total_s, arng, overlap_target=0.17)
        tracks, acts = {}, {}
        for s in spks:
            tracks[s], acts[s] = speaker_track(utts[s], [(i, st) for sp, i, st in plan if sp == s], total_s)
        ov = overlap_fraction(acts)
        if 0.10 <= ov <= 0.25:
            break
    rirs = c.rirs(pick(rng, ["smallroom", "mediumroom"])[0])
    targets = []
    for s in spks:
        wet = convolve_keep_level(tracks[s], load16(pick(rng, rirs)[0]))
        wet = wet * db_gain(float(rng.uniform(-3, 3)))
        targets.append({"name": f"spk_{s}", "audio": wet, "description": f"speaker {s} ({lib[s]['gender']})",
                        "activity": acts[s], "speaker": s, "gender": lib[s]["gender"]})
    speech = np.sum([t["audio"] for t in targets], axis=0)
    mus, noi = background(c, rng, total_s)
    bg_scale = snr_gain(mus + noi, speech, bg_snr_db)
    for t in targets:
        others_act = [a for u in targets if u is not t for a in u["activity"]]
        span = marked_span(t["activity"], others_act)
        t["spans"] = [("+", *span)] if span else []
    return write_clip(out_dir, "US-3.1", seed, targets, {"music": mus * bg_scale, "noise": noi * bg_scale}, {
        "n_speakers": n_speakers, "gender_pairing": "same" if same_gender else "mixed", "overlap_fraction": ov,
        "bg_snr_db": bg_snr_db, "duration_s": total_s})


# ----------------------------------------------------------------------------------------------- US-1.x

def build_us1(c: Corpora, out_dir: Path, seed: int, n_passers: int, bg_snr_db: float = 10.0) -> dict:
    rng = np.random.default_rng(seed)
    lib = c.libri()
    ids = sorted(lib)
    total_s = float(rng.uniform(60, 90))
    cam, tgt, *passers = pick(rng, ids, 2 + n_passers)
    # Interview: camera holder asks, target answers. Few overlaps.
    for attempt in range(40):
        arng = np.random.default_rng(seed * 1000 + attempt)
        utts = {s: [lib[s]["utts"][int(i)] for i in arng.permutation(len(lib[s]["utts"]))] for s in (cam, tgt)}
        # camera holder asks short questions, target gives longer answers
        utts[cam] = sorted(utts[cam], key=lambda u: u[1])[: len(utts[cam]) // 2]
        utts[tgt] = sorted(utts[tgt], key=lambda u: -u[1])[: len(utts[tgt]) // 2]
        for s in utts:
            utts[s] = [utts[s][int(i)] for i in arng.permutation(len(utts[s]))]
        durs = {s: [d for _, d in utts[s]] for s in utts}
        plan = schedule_turns(durs, total_s, arng, overlap_target=0.05, overlap_range=(0.3, 1.0))
        tr, ac = {}, {}
        for s in (cam, tgt):
            tr[s], ac[s] = speaker_track(utts[s], [(i, st) for sp, i, st in plan if sp == s], total_s)
        if len(plan) >= 6 and min(total_duration_s(ac[s]) for s in (cam, tgt)) > 8:
            break
    # Passers-by: a handful of random utterances at random times.
    for p in passers:
        starts, cursor = [], float(rng.uniform(0, 15))
        pool = lib[p]["utts"]
        for i in rng.permutation(len(pool))[:5]:
            if cursor >= total_s:
                break
            starts.append((int(i), cursor))
            cursor += pool[int(i)][1] + float(rng.uniform(4, 15))
        tr[p], ac[p] = speaker_track(pool, starts, total_s)
    audio = {}
    # camera holder: dry (no reverb), +4 dB; target: mild room; passers: large room, 10-14 dB down
    audio[cam] = tr[cam]
    audio[tgt] = convolve_keep_level(tr[tgt], load16(pick(rng, c.rirs("mediumroom"))[0]))
    audio[cam] = audio[cam] * db_gain(4.0) * np.sqrt(power(audio[tgt]) / power(audio[cam]))
    for k, p in enumerate(passers):
        w = convolve_keep_level(tr[p], load16(pick(rng, c.rirs("largeroom"))[0]))
        audio[p] = w * np.sqrt(power(audio[tgt]) / power(w)) * db_gain(-10.0 - 4.0 * k)
    roles = {cam: "camera_holder", tgt: "interviewee", **{p: "passer_by" for p in passers}}
    targets = []
    for s in (tgt, cam, *passers):
        others_act = [a for u in (tgt, cam, *passers) if u != s for a in ac[u]]
        span = marked_span(ac[s], others_act, max_len=5.0, min_len=1.5)
        targets.append({"name": f"{roles[s]}_{s}", "audio": audio[s].astype(np.float32),
                        "description": f"{roles[s].replace('_', ' ')} (speaker {s})", "activity": ac[s],
                        "speaker": s, "role": roles[s], "gender": lib[s]["gender"],
                        "spans": [("+", *span)] if span else []})
    speech = np.sum([t["audio"] for t in targets], axis=0)
    mus, noi = background(c, rng, total_s)
    k = snr_gain(mus + noi, speech, bg_snr_db)
    return write_clip(out_dir, "US-1.x", seed, targets, {"music": mus * k, "noise": noi * k}, {
        "n_passers": n_passers, "bg_snr_db": bg_snr_db, "duration_s": total_s,
        "keep_for_us_1_1": [targets[0]["name"]], "keep_for_us_1_2": [targets[0]["name"], targets[1]["name"]]})


def total_duration_s(segs: list[Segment]) -> float:
    return sum(e - s for s, e in merge_segments(segs))


# ----------------------------------------------------------------------------------------------- US-2.1

def build_us21(c: Corpora, out_dir: Path, seed: int, music_snr_db: float = 0.0, babble_snr_db: float = 8.0) -> dict:
    rng = np.random.default_rng(seed)
    lib = c.libri()
    ids = sorted(lib)
    total_s = float(rng.uniform(60, 90))
    spk = pick(rng, ids)[0]
    pool = lib[spk]["utts"]
    starts, cursor = [], 0.0
    for i in rng.permutation(len(pool)):
        if cursor >= total_s:
            break
        starts.append((int(i), cursor))
        cursor += pool[int(i)][1] + float(rng.uniform(0.3, 1.2))
    dry, act = speaker_track(pool, starts, total_s)
    wet = convolve_keep_level(dry, load16(pick(rng, c.rirs("largeroom"))[0]))
    mus, _ = background(c, rng, total_s)
    mus = mus * snr_gain(mus, wet, music_snr_db)
    bab = babble(c, rng, total_s, 6, {spk})
    bab = bab * snr_gain(bab, wet, babble_snr_db)
    span = marked_span(act, [], max_len=6.0)
    t = {"name": f"speaker_{spk}", "audio": wet, "description": "toast speaker, heavy reverb", "activity": act,
         "speaker": spk, "gender": lib[spk]["gender"], "spans": [("+", *span)] if span else []}
    return write_clip(out_dir, "US-2.1", seed, [t], {"music": mus, "crowd_babble": bab}, {
        "music_snr_db": music_snr_db, "babble_snr_db": babble_snr_db, "duration_s": total_s})


# ----------------------------------------------------------------------------------------------- US-7.1

def guitar_stems(song: Path) -> list[tuple[str, str]]:
    """(stem file stem, midi program name) for stems of class Guitar in a BabySlakh track."""
    meta = yaml.safe_load((song / "metadata.yaml").read_text())
    out = []
    for sid, info in meta["stems"].items():
        if info.get("inst_class") == "Guitar" and (song / "stems" / f"{sid}.wav").exists():
            out.append((sid, info.get("midi_program_name", "guitar")))
    return out


def build_us71(c: Corpora, out_dir: Path, seed: int, song: Path, guitar: str, window_s: float = 60.0) -> dict:
    rng = np.random.default_rng(seed)
    meta = yaml.safe_load((song / "metadata.yaml").read_text())
    stems = {p.stem: load16(str(p)) for p in sorted((song / "stems").glob("S*.wav"))}
    n_full = min(len(x) for x in stems.values())
    n = min(int(window_s * SR), n_full)
    start = int(rng.integers(0, n_full - n + 1))
    stems = {k: v[start: start + n] for k, v in stems.items()}
    prog = meta["stems"][guitar].get("midi_program_name", "guitar")
    others = {k: v for k, v in stems.items() if k != guitar}
    t = {"name": f"guitar_{guitar}", "audio": stems[guitar], "description": f"the {prog.lower()}", "spans": [],
         "stem": guitar, "midi_program_name": prog}
    return write_clip(out_dir, "US-7.1", seed, [t], others, {
        "song": song.name, "window_start_s": start / SR, "duration_s": n / SR,
        "other_guitars": [{"stem": k, "midi_program_name": meta["stems"][k].get("midi_program_name")}
                          for k in others if meta["stems"][k].get("inst_class") == "Guitar"]})


# ----------------------------------------------------------------------------------------------- US-6.1

def vocal_phrases(files: list[str], min_len: float = 1.5, max_len: float = 6.0) -> list[np.ndarray]:
    """Phrases of a singer: voiced stretches of the singer's recordings (VAD split), 1.5-6 s each."""
    out = []
    for f in files:
        x = load16(f)
        for s, e in energy_vad(x, SR, thr_db=-40.0, min_gap_s=0.25, min_dur_s=min_len):
            seg = x[int(s * SR): int(min(e, s + max_len) * SR)]
            out.append(seg.astype(np.float32))
    return out


def build_us61(c: Corpora, out_dir: Path, seed: int, singers: list[str], technique_dirs: list[str],
               total_s: float = 75.0, vocal_over_music_db: float = 3.0) -> dict:
    rng = np.random.default_rng(seed)
    phr: dict[str, list[np.ndarray]] = {}
    for s in singers:
        files = []
        for td in technique_dirs:
            files += c.vocalset_files(s, td)
        p = vocal_phrases(files)
        phr[s] = [p[int(i)] for i in rng.permutation(len(p))]
    plan = alternate_phrases({s: [(0.0, len(x) / SR) for x in phr[s]] for s in singers}, total_s, rng)
    n = int(total_s * SR)
    tracks = {s: np.zeros(n, np.float32) for s in singers}
    acts: dict[str, list[Segment]] = {s: [] for s in singers}
    for s, i, st, length in plan:
        x = phr[s][i][: int(length * SR)]
        place(tracks[s], x, st)
        acts[s].append((st, min(st + len(x) / SR, total_s)))
    music = load16(pick(rng, c.music())[0])
    music = loop_to_length(music, n, int(rng.integers(len(music)))).astype(np.float32)
    vocal_sum = np.sum(list(tracks.values()), axis=0)
    music = music * snr_gain(music, vocal_sum, vocal_over_music_db)
    targets = []
    for s in singers:
        a = merge_segments(acts[s])
        targets.append({"name": f"singer_{s}", "audio": tracks[s], "description": f"singer {s}", "activity": a,
                        "singer": s, "spans": [("+", *a[0])] if a else []})
    return write_clip(out_dir, "US-6.1", seed, targets, {"instrumental": music}, {
        "singers": singers, "n_phrases": len(plan), "vocal_over_music_db": vocal_over_music_db, "duration_s": total_s})


def slug(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")
