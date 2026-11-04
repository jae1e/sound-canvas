import numpy as np

from seplab.audio_io import read_wav, write_wav
from seplab.metrics import si_sdr
from seplab.mix import Interferer, build_mixture, load_manifest


def power_db(x):
    return 10 * np.log10(np.mean(x.astype(np.float64) ** 2))


def test_snr_and_stems_sum(tmp_path, wavs):
    m = build_mixture(wavs["voice"], [Interferer(wavs["noise"], snr_db=5)], tmp_path / "a", sr=16000, seed=3)
    d = tmp_path / "a"
    mix, _ = read_wav(d / "mixture.wav")
    t, _ = read_wav(d / "target.wav")
    o, _ = read_wav(d / "others.wav")
    assert len(mix) == m["n_samples"] == 32000
    assert np.allclose(mix, t + o, atol=1e-6)
    assert abs(power_db(t) - power_db(o) - 5) < 0.1


def test_deterministic_and_offset(tmp_path, wavs):
    spec = [Interferer(wavs["tone"], snr_db=0, offset_s=0.5), Interferer(wavs["noise"], snr_db=-5)]
    build_mixture(wavs["voice"], spec, tmp_path / "x", seed=1)
    build_mixture(wavs["voice"], spec, tmp_path / "y", seed=1)
    a, _ = read_wav(tmp_path / "x" / "mixture.wav")
    b, _ = read_wav(tmp_path / "y" / "mixture.wav")
    assert np.array_equal(a, b)
    i0, _ = read_wav(tmp_path / "x" / "interferer_0.wav")
    assert not np.any(i0[: 8000])      # silent before the 0.5 s offset
    assert np.any(i0[8000:])
    assert (tmp_path / "x" / "manifest.json").exists()
    assert load_manifest(tmp_path / "x" / "manifest.json")["seed"] == 1


def test_rir_changes_target(tmp_path, wavs):
    rir = np.zeros(800, np.float32)
    rir[0], rir[400] = 1.0, 0.5
    write_wav(tmp_path / "rir.wav", rir, 16000)
    build_mixture(wavs["voice"], [], tmp_path / "r", target_rir=str(tmp_path / "rir.wav"))
    t, _ = read_wav(tmp_path / "r" / "target.wav")
    dry, _ = read_wav(wavs["voice"])
    assert len(t) == len(dry) and si_sdr(t, dry) < 40 and si_sdr(t, dry) > 0
