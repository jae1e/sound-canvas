"""Energy gate: never send silence to an ASR model (models echo their prompt or hallucinate on it)."""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt

# Loudest 100 ms of speech-band (300-3400 Hz) RMS below this means "no speech".
# Justification: the phone's real recording 530cbdd2... (UNPROCESSED, quiet, "ah ah ah ah") has a loudest
# 100 ms speech-band RMS of -34.5 dBFS and a wide-band noise floor of about -52 dBFS. -65 dBFS is 30 dB
# below its speech and 13 dB below its noise floor, so even very quiet real recordings pass, while digital
# silence (the phone reports -96 dBFS) and dither-level noise are stopped before any model sees them.
GATE_DBFS = -65.0
# segment_closed.peak_dbfs_x100 at or below this is digital silence (the phone reports -9600).
SILENT_PEAK_X100 = -9500

_BP = butter(2, [300, 3400], "bp", fs=16000, output="sos")
WIN = 1600  # 100 ms


def loudest_speech_band_dbfs(audio: np.ndarray) -> float:
    if audio.size == 0 or float(np.max(np.abs(audio))) == 0.0:
        return -200.0
    y = sosfilt(_BP, audio.astype(np.float64))
    if len(y) < WIN:
        rms = float(np.sqrt(np.mean(y * y)))
    else:
        c = np.concatenate([[0.0], np.cumsum(y * y)])
        rms = float(np.sqrt(np.max(c[WIN:] - c[:-WIN]) / WIN))
    return 20.0 * np.log10(max(rms, 1e-10))


def silence_reason(audio: np.ndarray, peak_dbfs_x100: int | None = None) -> str | None:
    """None when the audio may go to a model, else a short reason for the stored path."""
    if peak_dbfs_x100 is not None and peak_dbfs_x100 <= SILENT_PEAK_X100:
        return "gated:silent-metadata"
    level = loudest_speech_band_dbfs(audio)
    if level < GATE_DBFS:
        return "gated:silence" if level <= -190 else f"gated:below-{GATE_DBFS:.0f}dBFS"
    return None
