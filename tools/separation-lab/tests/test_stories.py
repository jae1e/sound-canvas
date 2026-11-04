import json
import re

import pytest

from conftest import SR
from seplab.cli import main
from seplab.stories import list_stories, load_story, run_story

IDS = ["US-1.1", "US-1.2", "US-1.3", "US-2.1", "US-2.2", "US-2.3", "US-3.1", "US-3.2", "US-3.3", "US-4.1",
       "US-4.2", "US-4.3", "US-5.1", "US-5.2", "US-6.1", "US-6.2", "US-6.3", "US-6.4", "US-7.1", "US-7.2"]


def test_all_story_specs_present_and_valid():
    assert set(IDS) <= set(list_stories())
    for sid in list_stories():
        s = load_story(sid)
        assert s["id"] == sid and s["persona"] in {f"P{i}" for i in range(1, 8)}
        assert s["baselines"] and s["metrics"] and s["clips"]["synthetic"] is not None
        assert s["pass_bar"]["blind_preference_min"] == 0.6 and s["pass_bar"]["usable_without_apology_min"] == 0.5


def test_run_story_with_fake_backend(tmp_path, wavs):
    clip = tmp_path / "clips" / "c1"
    main(["mix", "--target", wavs["voice"], "--interferer", f"{wavs['noise']},0,0", "--description", "voice",
          "--seed", "1", "--out-dir", str(clip)])
    out = tmp_path / "run"
    main(["run-story", "US-3.1", "--clips", str(tmp_path / "clips"), "--backend", "fake", "--out", str(out)])
    res = json.loads((out / "results.json").read_text())
    m = res["clips"][0]["metrics"]
    assert m["target"]["si_sdri_db"] > 50 and res["clips"][0]["peak_gpu_mb"] is None
    page = (out / "index.html").read_text()
    assert "<audio controls" in page and "autoplay" not in page.lower()


def test_cli_separate_remix_and_info(tmp_path, wavs, capsys):
    main(["separate", wavs["voice"], "--target", "low", "--target", "high", "--strategy", "sequential",
          "--out-dir", str(tmp_path / "t")])
    main(["remix", str(tmp_path / "t"), str(tmp_path / "r.wav"), "--gain", "low=0.5"])
    assert (tmp_path / "r.wav").exists() and (tmp_path / "t" / "multitrack.wav").exists()
    main(["info", wavs["voice"]])
    assert '"sample_rate": 16000' in capsys.readouterr().out


def test_cli_sam_backend_error_is_clean(wavs, tmp_path, monkeypatch):
    import sys
    monkeypatch.setitem(sys.modules, "sam_audio", None)   # never touch the real model or network
    with pytest.raises(SystemExit) as e:
        main(["separate", wavs["voice"], "--target", "voice", "--backend", "sam", "--model", "small",
              "--out-dir", str(tmp_path / "s")])
    assert "error:" in str(e.value)
