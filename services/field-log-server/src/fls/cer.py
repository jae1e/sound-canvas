"""Character error rate with the dashboard's normalisation."""

from __future__ import annotations

import unicodedata


def normalize(text: str) -> str:
    """NFKC, lowercase (Latin), drop spaces, punctuation and control characters."""
    t = unicodedata.normalize("NFKC", text).lower()
    return "".join(ch for ch in t if unicodedata.category(ch)[0] not in ("P", "Z", "C"))


def edit_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(reference: str, hypothesis: str) -> dict:
    """CER = edit_distance(norm(ref), norm(hyp)) / len(norm(ref)). `cer` is None for an empty reference."""
    r, h = normalize(reference), normalize(hypothesis)
    d = edit_distance(r, h)
    return {"cer": (d / len(r)) if r else None, "distance": d, "ref_len": len(r), "hyp_len": len(h)}
