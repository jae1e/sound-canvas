import json

import numpy as np
import pytest

from fls.engines.base import FinalResult
from fls.langs import decode_with_policy, normalize_languages, qwen_name_to_iso
from conftest import wav_bytes
from test_flow import segment_event


def test_normalize_and_names():
    assert normalize_languages(None) == ["ko", "en"]
    assert normalize_languages(["EN", "ko", "en", "xx", 3]) == ["en", "ko"]
    assert normalize_languages([]) == ["ko", "en"]
    assert qwen_name_to_iso("Korean,English") == "ko,en" and qwen_name_to_iso("") == ""


class Rec:
    """Records decode calls; returns `auto_lang` for auto detection."""

    name = "rec"

    def __init__(self, auto_lang="ko"):
        self.calls, self.auto_lang = [], auto_lang

    def decode(self, audio, sr, context="", language=None):
        self.calls.append((context, language))
        return FinalResult(text="t", language=language or self.auto_lang, no_speech=False)


A = np.ones(1600, dtype=np.float32) * 0.1


def test_policy_single_language_forced():
    e = Rec()
    r = decode_with_policy(e, A, ["en"])
    assert e.calls == [("", "en")] and r.path == "forced:en"


def test_policy_auto_kept_when_detected_in_list():
    e = Rec("ko,en")
    r = decode_with_policy(e, A, ["ko", "en"])
    assert e.calls == [("", None)] and r.path == "auto"  # no language hint in the context


def test_policy_redecode_when_detected_outside_list():
    e = Rec("zh")
    r = decode_with_policy(e, A, ["ko", "en"])
    assert e.calls[1] == ("", "ko") and r.language == "ko" and r.path == "auto(zh)->forced:ko"


def create_memo(dev, memo, languages=None):
    p = {"memo_id": memo, "kind": "voice", "tz": "Asia/Seoul", "retention_class": "standard"}
    if languages is not None:
        p["languages"] = languages
    e = dev.event("memo_created", p)
    dev.commit(e)
    return e


@pytest.mark.parametrize("langs,auto,expect_path", [
    (["en"], "ko", "forced:en"),
    (None, "ko", "auto"),
    (["ko", "en"], "zh", "auto(zh)->forced:ko"),
])
def test_job_uses_memo_languages(client, dev, monkeypatch, langs, auto, expect_path):
    st = client.app.state.fls
    rec = Rec(auto)
    rec.name = "fake-final"
    monkeypatch.setattr(st.worker, "engine", rec)
    data = wav_bytes()
    dev.put(data)
    dev.post(create_memo(dev, "m1", langs), segment_event(dev, "m1", "s1", data))
    (seg,) = dev.wait_done("m1")
    assert seg["status"] == "done"
    row = st.db.one("SELECT detect_path FROM transcripts WHERE segment_id='s1'")
    assert row["detect_path"] == expect_path
    stored = json.loads(st.db.one("SELECT languages FROM memos WHERE memo_id='m1'")["languages"])
    assert stored == (langs or ["ko", "en"])
