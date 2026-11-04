import json

import numpy as np

from seplab.audio_io import read_wav
from seplab.clipsets import SR, marked_span, write_clip


def test_marked_span_avoids_other_speakers():
    segs = [(0.0, 10.0), (20.0, 23.0)]
    others = [(3.0, 5.0)]
    assert marked_span(segs, others, max_len=6.0) == (5.0, 10.0)
    assert marked_span([(0.0, 1.0)], [], min_len=2.0) is None
    assert marked_span([(0.0, 30.0)], [], max_len=5.0) == (0.0, 5.0)


def test_write_clip_mixture_is_sum_of_stems(tmp_path):
    rng = np.random.default_rng(0)
    n = SR * 2
    t = [{"name": "a", "audio": (0.8 * rng.standard_normal(n)).astype(np.float32), "description": "a",
          "activity": [(0.0, 1.0)], "spans": [("+", 0.0, 1.0)]}]
    others = {"noise": (0.8 * rng.standard_normal(n)).astype(np.float32)}
    m = write_clip(tmp_path, "US-X", 1, t, others, {"note": "x"})
    mix, _ = read_wav(tmp_path / "mixture.wav")
    a, _ = read_wav(tmp_path / "a.wav")
    o, _ = read_wav(tmp_path / "others.wav")
    assert np.allclose(mix, a + o, atol=1e-6) and np.abs(mix).max() <= 0.91
    saved = json.loads((tmp_path / "manifest.json").read_text())
    assert saved["targets"][0]["spans"] == [["+", 0.0, 1.0]] and saved["note"] == "x" and m["gain"] < 1
