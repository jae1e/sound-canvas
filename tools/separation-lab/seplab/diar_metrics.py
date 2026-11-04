"""Diarization metrics on plain segment lists: {speaker: [(start_s, end_s), ...]}.

Frame-based (10 ms) DER with an optimal one-to-one speaker mapping, speaker-count accuracy, overlap recall,
purity and coverage. Kept dependency-light (numpy and scipy); pyannote.metrics is used as a cross-check in the spike.
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import linear_sum_assignment

Segments = dict[str, list[tuple[float, float]]]


def to_matrix(seg: Segments, n_frames: int, step: float) -> tuple[list[str], np.ndarray]:
    names = sorted(seg)
    m = np.zeros((len(names), n_frames), dtype=bool)
    for i, n in enumerate(names):
        for s, e in seg[n]:
            m[i, int(round(s / step)): min(int(round(e / step)), n_frames)] = True
    return names, m


def _n_frames(*segs: Segments, step: float, duration: float | None) -> int:
    end = max([e for sg in segs for v in sg.values() for _, e in v] + [duration or 0.0])
    return int(np.ceil(end / step)) + 1


def collar_mask(ref: Segments, n_frames: int, step: float, collar: float) -> np.ndarray:
    """True for frames to score; frames within +-collar of any reference boundary are dropped."""
    keep = np.ones(n_frames, dtype=bool)
    if collar <= 0:
        return keep
    w = int(round(collar / step))
    for v in ref.values():
        for s, e in v:
            for b in (int(round(s / step)), int(round(e / step))):
                keep[max(b - w, 0): b + w] = False
    return keep


def der(ref: Segments, hyp: Segments, step: float = 0.01, collar: float = 0.0, duration: float | None = None,
        skip_overlap: bool = False) -> dict:
    """Diarization error rate. Returns der, miss, false_alarm, confusion (all as fractions of reference speech)."""
    nf = _n_frames(ref, hyp, step=step, duration=duration)
    rn, R = to_matrix(ref, nf, step)
    hn, H = to_matrix(hyp, nf, step)
    keep = collar_mask(ref, nf, step, collar)
    if skip_overlap:
        keep &= R.sum(axis=0) <= 1
    R, H = R[:, keep], H[:, keep]
    r, h = R.sum(axis=0), H.sum(axis=0)
    total = float(r.sum())
    if total == 0:
        return {"der": 0.0, "miss": 0.0, "false_alarm": 0.0, "confusion": 0.0, "mapping": {}}
    overlap = (R[:, None, :] & H[None, :, :]).sum(axis=2) if len(rn) and len(hn) else np.zeros((len(rn), len(hn)))
    mapping = {}
    correct = 0.0
    if overlap.size:
        ri, hi = linear_sum_assignment(-overlap)
        for a, b in zip(ri, hi):
            mapping[rn[a]] = hn[b]
            correct += overlap[a, b]
    miss = float(np.maximum(r - h, 0).sum())
    fa = float(np.maximum(h - r, 0).sum())
    conf = float(np.minimum(r, h).sum() - correct)
    return {"der": (miss + fa + conf) / total, "miss": miss / total, "false_alarm": fa / total,
            "confusion": conf / total, "mapping": mapping}


def speaker_count_error(ref: Segments, hyp: Segments, min_speech_s: float = 1.0) -> dict:
    """Speakers with at least min_speech_s of speech, in the reference and the hypothesis."""
    count = lambda s: sum(1 for v in s.values() if sum(e - b for b, e in v) >= min_speech_s)
    r, h = count(ref), count(hyp)
    return {"ref": r, "hyp": h, "correct": r == h}


def overlap_stats(ref: Segments, hyp: Segments, step: float = 0.01, duration: float | None = None) -> dict:
    """How well overlapped speech is handled: fraction of reference overlap frames where the hypothesis also
    has two or more speakers (recall), and the fraction of hypothesis overlap frames that are real (precision)."""
    nf = _n_frames(ref, hyp, step=step, duration=duration)
    _, R = to_matrix(ref, nf, step)
    _, H = to_matrix(hyp, nf, step)
    ro, ho = R.sum(axis=0) >= 2, H.sum(axis=0) >= 2
    speech = (R.sum(axis=0) >= 1).sum()
    return {"ref_overlap_fraction": float(ro.sum() / speech) if speech else 0.0,
            "hyp_overlap_fraction": float(ho.sum() / speech) if speech else 0.0,
            "overlap_recall": float((ro & ho).sum() / ro.sum()) if ro.sum() else None,
            "overlap_precision": float((ro & ho).sum() / ho.sum()) if ho.sum() else None}


def purity_coverage(ref: Segments, hyp: Segments, step: float = 0.01) -> dict:
    """Frame-based purity (each hypothesis cluster dominated by one reference speaker) and coverage (each
    reference speaker contained in one cluster), counted on single-speaker reference frames."""
    nf = _n_frames(ref, hyp, step=step, duration=None)
    rn, R = to_matrix(ref, nf, step)
    hn, H = to_matrix(hyp, nf, step)
    single = R.sum(axis=0) == 1
    R, H = R[:, single], H[:, single]
    if not R.any() or not len(hn):
        return {"purity": 0.0, "coverage": 0.0}
    M = (H[:, None, :] & R[None, :, :]).sum(axis=2).astype(float)   # hyp x ref
    return {"purity": float(M.max(axis=1).sum() / M.sum()) if M.sum() else 0.0,
            "coverage": float(M.max(axis=0).sum() / M.sum()) if M.sum() else 0.0}


def segment_accuracy(ref: Segments, hyp: Segments, step: float = 0.01) -> dict:
    """Phrase-level accuracy: for each reference segment, the hypothesis cluster covering most of it is its
    label; a segment counts as correct when that label equals the cluster that the mapped speaker owns
    (optimal one-to-one mapping from `der`)."""
    mapping = der(ref, hyp, step)["mapping"]
    nf = _n_frames(ref, hyp, step=step, duration=None)
    hn, H = to_matrix(hyp, nf, step)
    ok = tot = 0
    for spk, segs in ref.items():
        for s, e in segs:
            a, b = int(round(s / step)), int(round(e / step))
            if b <= a:
                continue
            votes = H[:, a:b].sum(axis=1)
            tot += 1
            if votes.max() > 0 and hn[int(votes.argmax())] == mapping.get(spk):
                ok += 1
    return {"phrases": tot, "correct": ok, "accuracy": ok / tot if tot else 0.0}
