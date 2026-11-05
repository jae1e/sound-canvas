import json
import os
import subprocess
import time
import zipfile

import numpy as np
import pytest
import soundfile as sf

from seplab.audio_io import read_wav, write_wav
from seplab.separation import ChunkedBackend, FilterBackend, Prompt
from seplab.web import urlimport
from seplab.web.jobs import cleanup_jobs, new_job
from seplab.web.pipeline import (OTHERS_DIFF, OTHERS_RESIDUAL, BackendManager, JobParams, TargetSpec,
                                 default_chunk_s, make_stems_zip, parse_spans, parse_time, render_mix, run_job,
                                 speakers_to_targets)

SR = 48000


def tone_mix(dur=6.0, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return (0.2 * np.sin(2 * np.pi * 200 * t) + 0.2 * np.sin(2 * np.pi * 5000 * t)).astype(np.float32)


@pytest.fixture
def wav_file(tmp_path):
    p = tmp_path / "in.wav"
    write_wav(p, tone_mix(), SR)
    return p


@pytest.fixture
def video_file(tmp_path):
    p = tmp_path / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x48:rate=10:duration=4",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "libx264", "-c:a", "aac",
                    "-shortest", str(p)], check=True)
    return p


# ---- parsing

def test_parse_time():
    assert parse_time("83") == 83 and parse_time("1:23") == 83 and parse_time("1:02:03.5") == 3723.5
    assert parse_time("") is None and parse_time(None) is None
    with pytest.raises(ValueError):
        parse_time("abc")


def test_parse_spans():
    assert parse_spans("12-18, 0:40-0:45.5") == [("+", 12.0, 18.0), ("+", 40.0, 45.5)]
    assert parse_spans("") == []
    assert parse_spans("5-99", duration=10.0) == [("+", 5.0, 10.0)]  # clipped to the section
    for bad in ("18-12", "abc", "20-30"):
        with pytest.raises(ValueError):
            parse_spans(bad, duration=10.0)


def test_spans_rebased_per_chunk_and_silent_chunks():
    calls = []

    class Spy:
        name = "spy"

        def separate(self, audio, sr, prompt):
            calls.append(prompt)
            return audio.copy(), np.zeros_like(audio)

    sr = 1000
    cb = ChunkedBackend(Spy(), chunk_s=10, overlap_s=1)
    audio = np.ones(25 * sr, np.float32)
    # chunks: [0,10) [9,19) [18,25)
    t, r = cb.separate(audio, sr, Prompt("speech", [("+", 12, 14)], require_span=True))
    assert len(calls) == 1 and calls[0].spans == [("+", 3.0, 5.0)]   # rebased to chunk 2 (starts at 9 s)
    assert np.all(t[: 8 * sr] == 0) and t[10 * sr] == 1.0             # silent outside the speaker's chunk
    assert cb.chunks_run == 1
    calls.clear()
    cb.separate(audio, sr, Prompt("speech", [("+", 12, 14)]))        # without require_span all chunks run
    assert len(calls) == 3


def test_speakers_to_targets():
    diar = {"exclusive": {"A": [[0, 5], [10, 12]], "B": [[5, 9.5]], "C": [[20, 20.4]]}}
    targets = speakers_to_targets(diar)
    assert [n for n, _ in targets] == ["speaker-1", "speaker-2"]  # busiest first; C is too short
    assert targets[0][1].description == "speech" and targets[0][1].require_span
    assert targets[0][1].spans == [("+", 0.0, 5.0), ("+", 10.0, 12.0)]
    with pytest.raises(ValueError):
        speakers_to_targets({"exclusive": {}})


def test_chunk_defaults():
    assert default_chunk_s("large", False) == 30 and default_chunk_s("small", False) == 45
    assert default_chunk_s("large", True) < 30


# ---- url import (yt-dlp mocked)

class FakeYDL:
    seen = {}

    def __init__(self, opts):
        FakeYDL.seen = opts

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def download(self, urls):
        from pathlib import Path
        out = Path(FakeYDL.seen["outtmpl"].replace("%(ext)s", "mp4"))
        out.write_bytes(b"x")
        Path(str(out) + ".part").write_bytes(b"x")


def test_download_section_and_options(tmp_path):
    p = urlimport.download("https://example.com/v", tmp_path, start=30, end=None, max_seconds=600, ydl_cls=FakeYDL)
    assert p.name == "download.mp4"
    o = FakeYDL.seen
    assert o["noplaylist"] and o["download_ranges"] is not None and "node" in o["js_runtimes"]
    ranges = list(o["download_ranges"]({}, None))
    assert (ranges[0]["start_time"], ranges[0]["end_time"]) == (30, 630)  # capped to 10 minutes


def test_download_rejects_bad_input(tmp_path):
    for bad in ("file:///etc/passwd", "/etc/passwd", "", "ftp://x/y"):
        with pytest.raises(urlimport.UrlImportError):
            urlimport.download(bad, tmp_path, ydl_cls=FakeYDL)

    class Boom(FakeYDL):
        def download(self, urls):
            raise RuntimeError("Sign in to confirm")

    with pytest.raises(urlimport.UrlImportError, match="Sign in"):
        urlimport.download("https://example.com/v", tmp_path, ydl_cls=Boom)


# ---- jobs

def test_cleanup_keeps_newest_and_drops_old(tmp_path):
    ids = []
    for i in range(5):
        jid, path = new_job(tmp_path)
        os.utime(path, (1000 + i, 1000 + i))
        ids.append(jid)
    assert sorted(cleanup_jobs(tmp_path, keep=3, max_age_days=10**6, now=2000)) == sorted(ids[:2])
    assert len(list(tmp_path.iterdir())) == 3
    deleted = cleanup_jobs(tmp_path, keep=20, max_age_days=7, now=1002 + 8 * 86400)  # all older than 7 days
    assert len(deleted) == 3 and not list(tmp_path.iterdir())


# ---- end to end with the filter backend

def run(wav_file, tmp_path, manager=None, **kw):
    manager = manager or BackendManager()
    params = JobParams(source=wav_file, backend="filter", targets=[TargetSpec(custom="low")], **kw)
    return run_job(params, manager, tmp_path / "runs"), manager


def test_job_end_to_end(wav_file, tmp_path):
    job, _ = run(wav_file, tmp_path)
    jd = tmp_path / "runs" / job["id"]
    n = job["n_samples"]
    assert n == len(tone_mix())
    names = [t["kind"] for t in job["tracks"]]
    assert names == ["target", "others_diff", "others_residual"]  # one target -> both variants
    mix, _ = read_wav(wav_file)
    low, _ = read_wav(jd / job["tracks"][0]["file"])
    diff, _ = read_wav(jd / f"tracks/{OTHERS_DIFF}.wav")
    assert np.allclose(low + diff, mix, atol=1e-6)               # exact recombination
    assert job["stats"]["chunks"] == 1

    # render mix: all at 0 dB with the diff variant reproduces the source
    out = render_mix(jd, {}, others="diff")
    y, _ = read_wav(out["wav"])
    assert len(y) == n and np.allclose(y, mix, atol=2e-4)       # 16-bit quantisation
    # gains: target muted, others +6 dB
    out = render_mix(jd, {OTHERS_DIFF: 6.0}, muted={job["tracks"][0]["name"]}, others="diff")
    y, _ = read_wav(out["wav"])
    assert np.allclose(y, diff * 10 ** (6 / 20), atol=2e-4)
    # residual variant and none
    assert render_mix(jd, {}, others="residual")["notes"] == []
    assert np.allclose(read_wav(render_mix(jd, {}, others="none")["wav"])[0], low, atol=2e-4)

    z = make_stems_zip(jd)
    with zipfile.ZipFile(z) as zf:
        assert len(zf.namelist()) == 3
        for nm in zf.namelist():
            with zf.open(nm) as f:
                assert len(sf.read(f)[0]) == n                    # exactly as long as the source


def test_two_targets_have_no_residual_variant_and_fallback(wav_file, tmp_path):
    params = JobParams(source=wav_file, backend="filter", chunk_s=3, overlap_s=0.5,
                       targets=[TargetSpec(custom="low"), TargetSpec(custom="high", spans_text="1-2")])
    job = run_job(params, BackendManager(), tmp_path / "runs")
    assert [t["kind"] for t in job["tracks"]] == ["target", "target", "others_diff"]
    assert job["stats"]["chunks"] == 2 * 3                       # 6 s in 3 s chunks with 0.5 s overlap
    jd = tmp_path / "runs" / job["id"]
    out = render_mix(jd, {}, others="residual")
    assert "only with one target" in " ".join(out["notes"])


def test_speaker_split_job_with_fake_diarization(wav_file, tmp_path):
    seen = {}

    def fake_diar(wav, n):
        seen["n"] = n
        return {"exclusive": {"S0": [[0, 2]], "S1": [[3, 5]]}}

    mgr = BackendManager()
    released = []
    mgr.release = lambda: released.append(1)
    params = JobParams(source=wav_file, backend="filter", speaker_split=True, num_speakers=2, chunk_s=3,
                       overlap_s=0.5)
    job = run_job(params, mgr, tmp_path / "runs", diarize_fn=fake_diar)
    assert seen["n"] == 2 and released                            # model freed before diarization
    assert [t["kind"] for t in job["tracks"]] == ["target", "target", "others_diff"]
    jd = tmp_path / "runs" / job["id"]
    s1, _ = read_wav(jd / job["tracks"][1]["file"])
    assert np.max(np.abs(s1[: SR])) == 0.0                        # speaker 2 is silent before 2.5 s chunks


def test_trim_cap_and_video(video_file, tmp_path):
    params = JobParams(source=video_file, backend="filter", start=1.0, end=3.0, targets=[TargetSpec(custom="low")])
    job = run_job(params, BackendManager(), tmp_path / "runs")
    assert job["has_video"] and abs(job["n_samples"] / SR - 2.0) < 0.1
    jd = tmp_path / "runs" / job["id"]
    out = render_mix(jd, {})
    assert out["mp4"] and out["mp4"].stat().st_size > 0
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams",
                                       str(out["mp4"])], capture_output=True, text=True).stdout)
    assert {s["codec_type"] for s in probe["streams"]} == {"video", "audio"}
    # cap
    params = JobParams(source=video_file, backend="filter", max_seconds=1.5, targets=[TargetSpec(custom="low")])
    job = run_job(params, BackendManager(), tmp_path / "runs")
    assert abs(job["n_samples"] / SR - 1.5) < 0.1 and any("cap" in n for n in job["notes"])


def test_errors_are_user_messages(wav_file, tmp_path):
    with pytest.raises(ValueError, match="at least one target"):
        run_job(JobParams(source=wav_file, backend="filter"), BackendManager(), tmp_path / "runs")
    with pytest.raises(ValueError, match="Upload a file"):
        run_job(JobParams(backend="filter"), BackendManager(), tmp_path / "runs")


def test_app_builds_and_serves(tmp_path):
    import urllib.request

    from seplab.web.app import build_app

    demo = build_app(BackendManager(), "filter")
    _, url, _ = demo.launch(server_name="127.0.0.1", server_port=None, prevent_thread_lock=True, share=False,
                            quiet=True)
    try:
        assert url.startswith("http://127.0.0.1")
        assert b"Sound separation demo" in urllib.request.urlopen(url, timeout=10).read()
    finally:
        demo.close()
