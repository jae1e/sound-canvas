import numpy as np

from fls.conditioning import CEILING, Conditioner, condition

SR = 16000


def db(x):
    return 20 * np.log10(max(float(np.sqrt(np.mean(np.square(x)))), 1e-9))


def synth(speech_dbfs=-50.0, rumble_dbfs=-45.0, noise_dbfs=-70.0, seconds=6):
    t = np.arange(seconds * SR) / SR
    rng = np.random.default_rng(1)
    x = rng.standard_normal(len(t)) * 10 ** (noise_dbfs / 20)
    x += np.sin(2 * np.pi * 30 * t) * 10 ** (rumble_dbfs / 20) * np.sqrt(2)
    on = (t % 1.5) < 0.9  # 0.9 s of "speech" every 1.5 s
    tone = (np.sin(2 * np.pi * 500 * t) + np.sin(2 * np.pi * 1500 * t) * 0.7) * on
    tone *= 10 ** (speech_dbfs / 20) / np.sqrt(np.mean(tone[on] ** 2))
    return (x + tone).astype(np.float32), on


def test_highpass_removes_rumble():
    x, _ = synth(speech_dbfs=-30, rumble_dbfs=-20)
    y = condition(x)
    spec_in = np.abs(np.fft.rfft(x[SR:])) ** 2
    spec_out = np.abs(np.fft.rfft(y[SR:] / max(np.abs(y).max(), 1e-9) * np.abs(x).max())) ** 2
    f = np.fft.rfftfreq(len(x[SR:]), 1 / SR)
    low = (f > 20) & (f < 40)
    mid = (f > 400) & (f < 1600)
    assert spec_out[low].sum() / spec_out[mid].sum() < 0.05 * spec_in[low].sum() / spec_in[mid].sum()


def test_quiet_speech_is_normalised_to_about_minus_23():
    x, on = synth(speech_dbfs=-50.0, rumble_dbfs=-60.0)
    y = condition(x)
    late = np.arange(len(x)) > 2 * SR  # let the gain settle
    assert abs(db(y[on & late]) - (-23)) < 3.0
    assert len(y) == len(x) and y.dtype == np.float32


def test_gain_capped_at_30_db():
    x, on = synth(speech_dbfs=-80.0, rumble_dbfs=-120.0, noise_dbfs=-110.0)
    y = condition(x)
    assert db(y[on]) - db(x[on]) <= 30.5


def test_loud_input_limited_and_not_boosted():
    x, on = synth(speech_dbfs=-3.0, rumble_dbfs=-60.0)
    x = x * 4  # drive into the limiter
    y = condition(np.clip(x, -1, 1))
    assert np.abs(y).max() <= CEILING + 1e-6
    assert db(y[on]) < db(np.clip(x, -1, 1)[on])


def test_streaming_matches_whole_and_keeps_length():
    x, on = synth()
    whole = condition(x)
    c = Conditioner()
    parts = []
    i = 0
    for n in (160, 1600, 333, 3200, 17, 800):
        pass
    sizes = [1600] * 20 + [160] * 20 + [333] * 30 + [3200]
    for n in sizes:
        parts.append(c.process(x[i:i + n]))
        i += n
    parts.append(c.process(x[i:]))
    y = np.concatenate(parts)
    assert len(y) == len(x)
    assert abs(db(y[on]) - db(whole[on])) < 2.0


def test_silence_stays_silent():
    y = condition(np.zeros(SR, dtype=np.float32))
    assert np.abs(y).max() == 0
