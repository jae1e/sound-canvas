import numpy as np

from conftest import noise, sine
from seplab.metrics import si_sdr, si_sdr_improvement


def test_identical_signal_is_very_high():
    x = sine(440)
    assert si_sdr(x, x) > 100


def test_scale_invariant():
    x = sine(440)
    ref = noise(seed=5)
    est = ref + noise(seed=6, amp=0.03)
    assert abs(si_sdr(0.1 * est, ref) - si_sdr(est, ref)) < 1e-3


def test_known_snr():
    ref = noise(seed=1)
    err = noise(seed=2)
    err = err / np.std(err) * np.std(ref) * 10 ** (-10 / 20)   # error 10 dB below reference
    assert abs(si_sdr(ref + err, ref) - 10) < 0.5


def test_improvement():
    ref = noise(seed=1)
    mix = ref + noise(seed=2, amp=0.1)
    est = ref + noise(seed=3, amp=0.01)
    assert si_sdr_improvement(est, ref, mix) > 15
    assert abs(si_sdr_improvement(mix, ref, mix)) < 1e-9
