import numpy as np
import soundfile as sf

from seplab.eval_language import (anchors_from_segments, best_overlap_cluster, chunk_identity, chunk_windows,
                                  map_clusters, overlap_seconds)
from seplab.zeroth import KoreanCorpora, drop_truncated, is_complete_flac, parse_audio_info, select_speakers

INFO = """SPEAKERID|NAME|SEX|SCRIPTID|DATASET
104|A|m|003|test_data_01
105|B|f|003|test_data_01
999|C|x|003|train_data_01
bad line
"""


def test_parse_audio_info():
    d = parse_audio_info(INFO)
    assert d["104"] == {"gender": "M", "dataset": "test_data_01"}
    assert d["105"]["gender"] == "F" and d["999"]["gender"] == "?" and "bad line" not in d


def test_select_speakers():
    pool = {"1": {"gender": "F", "utts": [1] * 5}, "2": {"gender": "M", "utts": [1] * 2},
            "3": {"gender": "?", "utts": [1] * 9}}
    assert list(select_speakers(pool, 3)) == ["1"]


def _flac(path, seconds, sr=16000):
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), (0.1 * np.random.default_rng(0).standard_normal(int(seconds * sr))).astype(np.float32), sr)


def test_korean_corpora_and_truncation(tmp_path):
    z = tmp_path / "zeroth"
    z.mkdir()
    (z / "AUDIO_INFO").write_text(INFO)
    for i in range(4):
        _flac(z / "test_data_01" / "003" / "104" / f"104_003_{i:04d}.flac", 3.0)
    _flac(z / "test_data_01" / "003" / "104" / "104_003_short.flac", 0.5)      # too short
    _flac(z / "test_data_01" / "003" / "105" / "105_003_0000.flac", 3.0)        # too few utterances
    c = KoreanCorpora(tmp_path, min_utts=3)
    lib = c.libri()
    assert list(lib) == ["104"] and lib["104"]["gender"] == "M" and len(lib["104"]["utts"]) == 4
    bad = z / "test_data_01" / "003" / "104" / "104_003_9999.flac"
    raw = (z / "test_data_01" / "003" / "104" / "104_003_0000.flac").read_bytes()
    bad.write_bytes(raw[: len(raw) // 2])
    assert is_complete_flac(z / "test_data_01" / "003" / "104" / "104_003_0000.flac") and not is_complete_flac(bad)
    assert drop_truncated(z, newest=3) == [str(bad)] and not bad.exists()


def test_anchors_and_overlap():
    assert anchors_from_segments([(5, 6), (0, 0.1), (1, 2)]) == [("+", 1.0, 2.0), ("+", 5.0, 6.0)]
    assert overlap_seconds([(0, 2), (5, 6)], [(1, 5.5)]) == 1.5


def test_best_overlap_and_shared_cluster():
    hyp = {"A": [(0, 5)], "B": [(10, 12)]}
    assert best_overlap_cluster([(1, 4), (11, 11.5)], hyp) == ("A", 3.0)
    assert best_overlap_cluster([(20, 21)], hyp) == (None, 0.0)
    m = map_clusters({"x": [(0, 4)], "y": [(1, 3)], "z": [(10, 12)]}, hyp)
    assert m["x"]["shared_with"] == ["y"] and m["z"]["cluster"] == "B" and m["z"]["shared_with"] == []


def test_chunk_windows_match_chunked_backend():
    assert chunk_windows(100, 10, 30, 2) == [(0, 100)]
    w = chunk_windows(70 * 10, 10, 30, 2)
    assert w == [(0, 300), (280, 580), (560, 700)]


def test_chunk_identity_flags_swap():
    sr, rng = 100, np.random.default_rng(1)
    a, b = rng.standard_normal(600), rng.standard_normal(600)
    est = np.concatenate([a[:300], b[300:]])        # right in the first chunk, wrong in the second
    rows = chunk_identity(est, "a", {"a": a, "b": b}, [(0, 6)], sr, [(0, 300), (300, 600)], min_active_s=2.0)
    assert [r["ok"] for r in rows] == [True, False] and rows[0]["right"] > 0.99
    assert chunk_identity(est, "a", {"a": a, "b": b}, [(0, 1)], sr, [(0, 300)]) == []   # not active enough
