import numpy as np
import pytest

from conftest import SR, noise, sine
from seplab.metrics import si_sdr
from seplab.separation import ChunkedBackend, FakeBackend, FilterBackend, Prompt, SamAudioBackend
from seplab.targets import Target, TrackSet, extract_parallel, extract_sequential


def test_prompt_validation():
    assert Prompt("x", [("+", 6.3, 7.0)]).spans == [("+", 6.3, 7.0)]
    with pytest.raises(ValueError):
        Prompt("x", [("?", 1, 2)])
    with pytest.raises(ValueError):
        Prompt("x", [("+", 2, 1)])


def test_sequential_sums_to_input_and_is_exact():
    a, b, c = sine(300), sine(1200), noise()
    mix = a + b + c
    backend = FakeBackend({"a": a, "b": b})
    ts = extract_sequential(backend, mix, SR, [Target("a", Prompt("a")), Target("b", Prompt("b"))])
    total = ts.tracks["a"] + ts.tracks["b"] + ts.others
    assert np.allclose(total, mix, atol=1e-6)
    assert np.allclose(ts.others, c, atol=1e-6)
    assert np.allclose(ts.remix(others_gain=1.0), mix, atol=1e-6)


def test_parallel_others_is_mix_minus_targets():
    a, b = sine(300), sine(1200)
    mix = a + b + noise()
    ts = extract_parallel(FakeBackend({"a": a, "b": b}), mix, SR, [Target("a", Prompt("a")), Target("b", Prompt("b"))])
    assert np.allclose(ts.others, mix - a - b, atol=1e-6)


def test_remix_gains():
    a, b = sine(300), sine(1200)
    ts = TrackSet(SR, {"a": a}, b)
    assert np.allclose(ts.remix({"a": 0.5}, others_gain=0.0), 0.5 * a)
    assert np.allclose(ts.remix({"a": 0.0}, others_gain=2.0), 2 * b)


def test_export_exact_length_and_roundtrip(tmp_path):
    a, b = sine(300), sine(1200)
    ts = TrackSet(SR, {"a": a}, b)
    ts.export(tmp_path, n_samples=len(a) + 77)
    import soundfile as sf
    info = sf.info(str(tmp_path / "multitrack.wav"))
    assert info.frames == len(a) + 77 and info.channels == 2
    assert sf.info(str(tmp_path / "a.wav")).frames == len(a) + 77
    assert TrackSet.load(tmp_path).sr == SR


def test_chunked_matches_whole_file_for_filter_backend():
    x = sine(300, dur=7.0) + sine(3000, dur=7.0) + noise(dur=7.0)
    whole, _ = FilterBackend().separate(x, SR, Prompt("low"))
    chunked = ChunkedBackend(FilterBackend(), chunk_s=3.0, overlap_s=0.5)
    t, r = chunked.separate(x, SR, Prompt("low"))
    assert len(t) == len(x)
    assert np.allclose(t + r, x, atol=1e-5)          # crossfade weights sum to one
    assert si_sdr(t, whole) > 30


def test_chunked_rebases_spans():
    seen = []

    class Spy:
        name = "spy"

        def separate(self, audio, sr, prompt):
            seen.append(prompt.spans)
            return np.zeros_like(audio), audio

    x = noise(dur=10.0)
    ChunkedBackend(Spy(), chunk_s=4.0, overlap_s=1.0).separate(x, SR, Prompt("", [("+", 5.0, 6.0)]))
    assert [("+", 2.0, 3.0)] in seen            # second chunk starts at 3 s
    assert len(seen) == 1                        # chunks without a positive span are skipped


def test_sam_backend_fails_clearly_without_install_or_access(monkeypatch):
    import sys
    import types

    backend = SamAudioBackend("large", device="cpu")
    assert backend.model_name == "facebook/sam-audio-large"
    # Without the extra installed (or with no access) the error must say what to do. No network is used.
    fake = types.ModuleType("sam_audio")

    class Gated:
        @staticmethod
        def from_pretrained(name):
            raise OSError("401 gated repo")

    fake.SAMAudio = fake.SAMAudioProcessor = Gated
    monkeypatch.setitem(sys.modules, "sam_audio", fake)
    with pytest.raises(RuntimeError, match="gated.*hf auth login|hf auth login"):
        backend.separate(noise(dur=0.1), SR, Prompt("x"))
    monkeypatch.setitem(sys.modules, "sam_audio", None)   # simulates a missing package
    with pytest.raises(RuntimeError, match="uv sync --extra sam"):
        SamAudioBackend("large", device="cpu").separate(noise(dur=0.1), SR, Prompt("x"))
