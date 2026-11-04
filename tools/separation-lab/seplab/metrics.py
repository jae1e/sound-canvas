"""Separation metrics."""
from __future__ import annotations

import numpy as np

EPS = 1e-12


def si_sdr(est: np.ndarray, ref: np.ndarray) -> float:
    """Scale-invariant SDR in dB (zero-mean signals)."""
    est = np.asarray(est, dtype=np.float64)
    ref = np.asarray(ref, dtype=np.float64)
    est = est - est.mean()
    ref = ref - ref.mean()
    alpha = np.dot(est, ref) / (np.dot(ref, ref) + EPS)
    proj = alpha * ref
    noise = est - proj
    return float(10 * np.log10((np.dot(proj, proj) + EPS) / (np.dot(noise, noise) + EPS)))


def si_sdr_improvement(est: np.ndarray, ref: np.ndarray, mixture: np.ndarray) -> float:
    """SI-SDR of the estimate minus SI-SDR of the unprocessed mixture, both against `ref`."""
    return si_sdr(est, ref) - si_sdr(mixture, ref)
