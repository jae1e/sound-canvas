"""ASR input conditioning (contract section 7): 80 Hz high-pass, slow speech gain, peak limiter.

The class is streaming-capable: feed chunks of any size and it keeps filter, level and gain
state. Output length always equals input length. Stored audio is never modified; callers
condition a copy.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt

SR = 16000
FRAME = 320  # 20 ms
TARGET_DBFS = -23.0
MAX_GAIN_DB = 30.0
MIN_GAIN_DB = -12.0  # loud input is only attenuated a little
CEILING = 0.891  # -1 dBFS
FLOOR_DB = -75.0  # frames below this never count as speech
SPEECH_ABOVE_NOISE_DB = 10.0
WARMUP_FRAMES = 5  # 100 ms to find the noise floor before any speech decision


def _db(x: float) -> float:
    return 20.0 * np.log10(max(float(x), 1e-9))


class Conditioner:
    def __init__(self, sample_rate: int = SR, highpass_hz: float = 80.0):
        if sample_rate != SR:
            raise ValueError("conditioning expects 16 kHz audio")
        self._sos = butter(4, highpass_hz, "hp", fs=sample_rate, output="sos")
        self._zi = np.zeros((self._sos.shape[0], 2))
        # Level decisions use the speech band only (300-3400 Hz) so that rumble and hum, which
        # pass an 80 Hz high-pass, are not mistaken for speech and boosted.
        self._asos = butter(2, [300, 3400], "bp", fs=sample_rate, output="sos")
        self._azi = np.zeros((self._asos.shape[0], 2))
        self._noise_db: float | None = None  # tracked noise floor
        self._level_db: float | None = None  # tracked speech level
        self._gain_db = 0.0
        self._lim = 1.0
        self._frames = 0

    def process(self, chunk: np.ndarray) -> np.ndarray:
        x = np.asarray(chunk, dtype=np.float32)
        if x.size == 0:
            return x
        y, self._zi = sosfilt(self._sos, x.astype(np.float64), zi=self._zi)
        a, self._azi = sosfilt(self._asos, y, zi=self._azi)
        out = np.empty_like(y)
        for i in range(0, len(y), FRAME):
            out[i:i + FRAME] = self._frame(y[i:i + FRAME], a[i:i + FRAME])
        return out.astype(np.float32)

    def _frame(self, f: np.ndarray, band: np.ndarray) -> np.ndarray:
        w = len(f) / FRAME  # shorter frames move the trackers proportionally less
        rms = _db(np.sqrt(np.mean(band * band)))  # speech-band level of this frame
        # Noise floor: follows quiet frames down at once and creeps upward (about 3 dB/s).
        if self._noise_db is None:
            self._noise_db = rms
        elif rms < self._noise_db:
            self._noise_db = rms
        else:
            self._noise_db += 0.06 * w
        self._frames += 1
        speech = self._frames > WARMUP_FRAMES and rms > max(FLOOR_DB, self._noise_db + SPEECH_ABOVE_NOISE_DB)
        if speech:
            if self._level_db is None:
                self._level_db = rms
                target = float(np.clip(TARGET_DBFS - rms, MIN_GAIN_DB, MAX_GAIN_DB))
                self._gain_db = target  # first speech: jump to the target
            else:
                a = (0.3 if rms > self._level_db else 0.03) * w
                self._level_db += a * (rms - self._level_db)
        if self._level_db is not None:
            target = float(np.clip(TARGET_DBFS - self._level_db, MIN_GAIN_DB, MAX_GAIN_DB))
            step = (0.4 if target < self._gain_db else 0.2) * w  # dB per frame: down 20, up 10 dB/s
            self._gain_db += float(np.clip(target - self._gain_db, -step, step))
        g = 10.0 ** (self._gain_db / 20.0)
        y = f * g
        # Peak limiter: instant attack, smooth release, then a hard safety clip.
        peak = float(np.max(np.abs(y))) if len(y) else 0.0
        need = min(1.0, CEILING / peak) if peak > 0 else 1.0
        prev = self._lim
        if need < prev:
            new = need
        else:
            new = prev + (1.0 - prev) * min(1.0, 0.1 * w)
        new = min(new, need) if peak * new > CEILING else new
        ramp = np.linspace(prev, new, len(y), endpoint=False) if new < prev else np.full(len(y), new)
        self._lim = new
        return np.clip(y * ramp, -CEILING, CEILING)


def condition(x: np.ndarray) -> np.ndarray:
    """Condition a whole 16 kHz mono array (fresh state)."""
    return Conditioner().process(x)
