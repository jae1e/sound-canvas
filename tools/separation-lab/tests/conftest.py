import numpy as np
import pytest

from seplab.audio_io import write_wav

SR = 16000


def sine(f, dur=2.0, sr=SR, amp=0.3):
    t = np.arange(int(dur * sr)) / sr
    return (amp * np.sin(2 * np.pi * f * t)).astype(np.float32)


def noise(dur=2.0, sr=SR, seed=0, amp=0.1):
    return (amp * np.random.default_rng(seed).standard_normal(int(dur * sr))).astype(np.float32)


@pytest.fixture
def wavs(tmp_path):
    paths = {}
    for name, x in {"voice": sine(300), "tone": sine(3000, dur=1.0), "noise": noise()}.items():
        paths[name] = str(tmp_path / f"{name}.wav")
        write_wav(paths[name], x, SR)
    return paths
