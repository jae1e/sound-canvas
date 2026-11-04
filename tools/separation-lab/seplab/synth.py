"""Pure helpers for synthetic clip sets: voice activity, turn scheduling, levels, ground-truth activity.

Everything here works on numpy arrays and plain tuples so it can be tested without any dataset.
Segments are (start_s, end_s) tuples; activity maps a speaker name to a list of segments.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import fftconvolve

Segment = tuple[float, float]


def power(x: np.ndarray) -> float:
    return float(np.mean(np.asarray(x, dtype=np.float64) ** 2)) + 1e-12


def merge_segments(segs: list[Segment], max_gap: float = 0.0) -> list[Segment]:
    """Sort and merge segments whose gap is at most max_gap seconds."""
    out: list[list[float]] = []
    for s, e in sorted(segs):
        if out and s - out[-1][1] <= max_gap:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [(a, b) for a, b in out]


def energy_vad(x: np.ndarray, sr: int, frame_s: float = 0.025, thr_db: float = -35.0,
               min_gap_s: float = 0.3, min_dur_s: float = 0.15) -> list[Segment]:
    """Energy voice activity detection on a clean signal. thr_db is relative to the loudest frame."""
    hop = int(frame_s * sr)
    n = len(x) // hop
    if n == 0:
        return []
    frames = np.asarray(x[: n * hop], dtype=np.float64).reshape(n, hop)
    db = 10 * np.log10(np.mean(frames**2, axis=1) + 1e-12)
    active = db > db.max() + thr_db
    segs, start = [], None
    for i, a in enumerate(active):
        if a and start is None:
            start = i
        if not a and start is not None:
            segs.append((start * frame_s, i * frame_s))
            start = None
    if start is not None:
        segs.append((start * frame_s, n * frame_s))
    merged = merge_segments(segs, min_gap_s)
    return [(s, e) for s, e in merged if e - s >= min_dur_s]


def total_duration(segs: list[Segment]) -> float:
    return sum(e - s for s, e in merge_segments(segs))


def overlap_fraction(activity: dict[str, list[Segment]], step: float = 0.01) -> float:
    """Time with two or more active speakers divided by time with at least one."""
    end = max((e for segs in activity.values() for _, e in segs), default=0.0)
    n = int(np.ceil(end / step))
    count = np.zeros(n, dtype=np.int32)
    for segs in activity.values():
        mask = np.zeros(n, dtype=bool)
        for s, e in segs:
            mask[int(round(s / step)): int(round(e / step))] = True
        count += mask
    any_speech = (count >= 1).sum()
    return float((count >= 2).sum() / any_speech) if any_speech else 0.0


def shift_segments(segs: list[Segment], offset: float, limit: float | None = None) -> list[Segment]:
    """Move segments by offset seconds and clip them to [0, limit]."""
    out = []
    for s, e in segs:
        s, e = s + offset, e + offset
        if limit is not None:
            e = min(e, limit)
        if e > s:
            out.append((s, e))
    return out


def schedule_turns(durations: dict[str, list[float]], total_s: float, rng: np.random.Generator,
                   overlap_target: float = 0.17, gap_range: Segment = (0.2, 0.9),
                   overlap_range: Segment = (1.0, 3.0)) -> list[tuple[str, int, float]]:
    """Plan a conversation as (speaker, utterance_index, start_s) placements.

    Speakers take turns (never the same speaker twice in a row). While the overlapped time so far is
    below overlap_target of the elapsed time, the next speaker cuts in before the previous utterance ends.
    Each speaker's utterances are used in order; the plan stops when total_s is reached.
    """
    names = sorted(durations)
    if len(names) < 2:
        raise ValueError("a conversation needs at least two speakers")
    used = {n: 0 for n in names}
    plan: list[tuple[str, int, float]] = []
    overlapped = 0.0
    prev: tuple[str, float, float] | None = None
    while True:
        cands = [n for n in names if (prev is None or n != prev[0]) and used[n] < len(durations[n])]
        if not cands:
            break
        spk = cands[int(rng.integers(len(cands)))]
        idx = used[spk]
        used[spk] += 1
        d = durations[spk][idx]
        if prev is None:
            start = 0.0
        else:
            _, p_start, p_end = prev
            if overlapped < overlap_target * max(p_end, 1e-6):
                ov = min(float(rng.uniform(*overlap_range)), 0.5 * (p_end - p_start), 0.5 * d)
                start = p_end - ov
                overlapped += ov
            else:
                start = p_end + float(rng.uniform(*gap_range))
        if start >= total_s:
            break
        plan.append((spk, idx, start))
        prev = (spk, start, start + d)
    return plan


def snr_gain(signal: np.ndarray, reference: np.ndarray, snr_db: float) -> float:
    """Gain g such that 10*log10(P(reference) / P(g*signal)) == snr_db."""
    return float(np.sqrt(power(reference) / (power(signal) * 10 ** (snr_db / 10))))


def convolve_keep_level(x: np.ndarray, rir: np.ndarray) -> np.ndarray:
    """Apply a room impulse response, then restore the dry signal's power."""
    out = fftconvolve(x, rir)[: len(x)]
    return (out * np.sqrt(power(x) / power(out))).astype(np.float32)


def loop_to_length(x: np.ndarray, n: int, start: int = 0) -> np.ndarray:
    """Return n samples taken from x starting at start, wrapping around if x is shorter."""
    if len(x) == 0:
        raise ValueError("empty signal")
    idx = (np.arange(n) + start) % len(x)
    return x[idx]


def alternate_phrases(phrases: dict[str, list[Segment]], total_s: float, rng: np.random.Generator,
                      gap_range: Segment = (0.3, 1.0), max_phrase_s: float = 6.0) -> list[tuple[str, int, float, float]]:
    """Plan singer A, B, A, ... phrases as (singer, phrase_index, start_s, length_s). No overlap in time.

    Singers are served in a fixed rotation (sorted names); a phrase longer than max_phrase_s is cut.
    """
    names = sorted(phrases)
    used = {n: 0 for n in names}
    plan, cursor, turn = [], 0.0, 0
    while cursor < total_s:
        spk = names[turn % len(names)]
        if used[spk] >= len(phrases[spk]):
            break
        s, e = phrases[spk][used[spk]]
        length = min(e - s, max_phrase_s)
        plan.append((spk, used[spk], cursor, length))
        used[spk] += 1
        cursor += length + float(rng.uniform(*gap_range))
        turn += 1
    return plan


def mean_pairwise_gender(genders: dict[str, str]) -> str:
    """'same' if all genders are equal, else 'mixed'. Used to label manifests."""
    return "same" if len(set(genders.values())) == 1 else "mixed"
