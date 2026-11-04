import numpy as np

from seplab.synth import (alternate_phrases, convolve_keep_level, energy_vad, loop_to_length, merge_segments,
                          overlap_fraction, power, schedule_turns, shift_segments, snr_gain)

SR = 16000


def test_energy_vad_finds_bursts():
    x = np.zeros(SR * 4, np.float32)
    x[SR: 2 * SR] = 0.3 * np.random.default_rng(0).standard_normal(SR)
    x[int(3.0 * SR): int(3.5 * SR)] = 0.3 * np.random.default_rng(1).standard_normal(SR // 2)
    segs = energy_vad(x, SR)
    assert len(segs) == 2
    assert abs(segs[0][0] - 1.0) < 0.06 and abs(segs[0][1] - 2.0) < 0.06
    assert abs(segs[1][0] - 3.0) < 0.06


def test_merge_and_overlap_fraction():
    assert merge_segments([(0, 1), (1.2, 2), (5, 6)], 0.3) == [(0, 2), (5, 6)]
    act = {"a": [(0.0, 4.0)], "b": [(3.0, 5.0)]}
    assert abs(overlap_fraction(act) - 1.0 / 5.0) < 0.01
    assert overlap_fraction({"a": [(0, 1)], "b": [(2, 3)]}) == 0.0


def test_shift_segments_clips():
    assert shift_segments([(0, 2), (9, 12)], 1.0, limit=10.0) == [(1, 3), (10.0, 10.0)][:1]
    assert shift_segments([(0, 2), (8, 12)], 1.0, limit=10.0) == [(1, 3), (9, 10.0)]


def test_schedule_turns_alternates_and_overlaps():
    durs = {"a": [6.0] * 30, "b": [6.0] * 30, "c": [6.0] * 30}
    plan = schedule_turns(durs, 100.0, np.random.default_rng(0), overlap_target=0.17)
    assert all(plan[i][0] != plan[i + 1][0] for i in range(len(plan) - 1))
    assert plan[0][2] == 0.0 and all(p[2] < 100.0 for p in plan)
    act: dict[str, list] = {}
    for spk, i, s in plan:
        act.setdefault(spk, []).append((s, s + 6.0))
    assert 0.08 < overlap_fraction(act) < 0.3
    again = schedule_turns(durs, 100.0, np.random.default_rng(0), overlap_target=0.17)
    assert plan == again


def test_snr_gain():
    rng = np.random.default_rng(0)
    ref, sig = rng.standard_normal(5000), 5 * rng.standard_normal(5000)
    g = snr_gain(sig, ref, 10.0)
    assert abs(10 * np.log10(power(ref) / power(g * sig)) - 10) < 1e-6


def test_convolve_keep_level_and_loop():
    x = np.random.default_rng(0).standard_normal(4000).astype(np.float32)
    rir = np.zeros(200, np.float32)
    rir[0], rir[100] = 1.0, 0.8
    y = convolve_keep_level(x, rir)
    assert len(y) == len(x) and abs(power(y) - power(x)) < 1e-3
    assert list(loop_to_length(np.arange(3), 7, start=1)) == [1, 2, 0, 1, 2, 0, 1]


def test_alternate_phrases_rotates_without_overlap():
    ph = {"A": [(0, 3.0), (5, 12.0)] * 10, "B": [(0, 2.0)] * 20}
    plan = alternate_phrases(ph, 60.0, np.random.default_rng(0), max_phrase_s=6.0)
    assert [p[0] for p in plan[:4]] == ["A", "B", "A", "B"]
    assert plan[2][3] == 6.0
    for a, b in zip(plan, plan[1:]):
        assert b[2] >= a[2] + a[3]
