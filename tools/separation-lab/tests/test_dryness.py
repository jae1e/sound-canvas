import numpy as np

from seplab.dryness import dynamic_range_db, high_band_ratio, level_db, rank_speakers, tail_drop_db

SR = 16000


def burst_signal(amp, tail=0.0, seed=0):
    rng = np.random.default_rng(seed)
    x = np.zeros(SR * 6, np.float32)
    for s in (0.5, 3.0):
        x[int(s * SR): int((s + 1.5) * SR)] = amp * rng.standard_normal(int(1.5 * SR))
        if tail:
            x[int((s + 1.5) * SR): int((s + 2.3) * SR)] = tail * amp * rng.standard_normal(int(0.8 * SR))
    return x


def test_level_and_dynamic_range():
    segs = [(0.5, 2.0), (3.0, 4.5)]
    loud, quiet = burst_signal(0.3), burst_signal(0.03)
    assert level_db(loud, SR, segs) > level_db(quiet, SR, segs) + 15


def test_tail_drop_prefers_dry():
    segs = [(0.5, 2.0), (3.0, 4.5)]
    dry, wet = burst_signal(0.3), burst_signal(0.3, tail=0.5)
    assert tail_drop_db(dry, SR, segs) > tail_drop_db(wet, SR, segs)


def test_high_band_ratio():
    t = np.arange(SR) / SR
    low, high = np.sin(2 * np.pi * 500 * t), np.sin(2 * np.pi * 5000 * t)
    assert high_band_ratio(low, SR, [(0, 1)]) < 0.05 < 0.9 < high_band_ratio(high, SR, [(0, 1)])


def test_rank():
    feats = {"a": {"level_db": -20, "dynamic_range_db": 30}, "b": {"level_db": -30, "dynamic_range_db": 20},
             "c": {"level_db": -28, "dynamic_range_db": 25}}
    assert rank_speakers(feats)[0] == "a"
