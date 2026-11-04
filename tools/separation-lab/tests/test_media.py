import shutil
import subprocess

import pytest
import soundfile as sf

from conftest import SR, sine
from seplab import media
from seplab.audio_io import fit_length, write_wav

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


def test_fit_length():
    x = sine(300, dur=1.0)
    assert len(fit_length(x, 100)) == 100
    assert len(fit_length(x, len(x) + 5)) == len(x) + 5
    assert not fit_length(x, len(x) + 5)[-5:].any()


@pytest.fixture
def video(tmp_path):
    path = tmp_path / "clip.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=640x480:rate=25:duration=2",
                    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=2",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(path)], check=True)
    return path


def test_probe_extract_proxy_remux(tmp_path, video):
    info = media.probe(video)
    assert abs(info["duration"] - 2.0) < 0.1 and info["sample_rate"] == 44100
    assert {s["type"] for s in info["streams"]} == {"video", "audio"}

    wav = tmp_path / "a.wav"
    n = media.extract_audio(video, wav, sr=16000)
    assert sf.info(str(wav)).frames == n == media.source_samples(video, 16000)

    proxy = tmp_path / "p.mp4"
    media.make_proxy(video, proxy, height=120, fps=5)
    pv = [s for s in media.probe(proxy)["streams"] if s["type"] == "video"][0]
    assert pv["height"] == 120

    # new audio that is too short is padded to the source length; the video stream is copied
    write_wav(tmp_path / "new.wav", sine(300, dur=1.0, sr=16000), 16000)
    out = tmp_path / "out.mp4"
    media.remux_audio(video, tmp_path / "new.wav", out)
    oi = media.probe(out)
    assert [s["codec"] for s in oi["streams"] if s["type"] == "video"] == ["h264"]
    assert abs(oi["duration"] - info["duration"]) < 0.1


def test_wav_source_samples_exact(tmp_path):
    p = tmp_path / "x.wav"
    write_wav(p, sine(300, dur=1.0)[:12345], SR)
    assert media.source_samples(p, SR) == 12345
    out = tmp_path / "y.wav"
    assert media.extract_audio(p, out, sr=SR) == 12345
    assert sf.info(str(out)).frames == 12345
