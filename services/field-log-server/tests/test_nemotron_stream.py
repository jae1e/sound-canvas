"""Regression for the quiet-speech bug: an endpoint with no decoded text must not reset the stream."""

import numpy as np

from fls.engines.nemotron import _Stream, tokens_to_text


class FakeStreamObj:
    def __init__(self):
        self.options, self.fed = {}, 0

    def set_option(self, k, v):
        self.options[k] = v

    def accept_waveform(self, sr, x):
        self.fed += len(x)

    def input_finished(self):
        pass


class FakeRec:
    def __init__(self):
        self.tokens_now: list[str] = []
        self.endpoint = False
        self.resets = 0

    def create_stream(self):
        return FakeStreamObj()

    def is_ready(self, s):
        return False

    def decode_stream(self, s):
        pass

    def tokens(self, s):
        return list(self.tokens_now)

    def timestamps(self, s):
        return [0.2, 0.6]

    def is_endpoint(self, s):
        return self.endpoint

    def reset(self, s):
        self.resets += 1
        self.tokens_now = []


class Eng:
    def _release(self, rec):
        pass


def test_empty_endpoint_does_not_reset_but_text_endpoint_does():
    rec = FakeRec()
    st = _Stream(Eng(), rec, "ko", condition=False)
    chunk = np.zeros(1600, dtype=np.int16)
    rec.endpoint = True  # 0.8 s of leading silence looks like an endpoint with no text
    assert st.feed(chunk) == [] and rec.resets == 0
    rec.tokens_now = [" ", "일", " ", "분"]
    rec.endpoint = False
    ev = st.feed(chunk)
    assert [(e.kind, e.text) for e in ev] == [("partial", "일 분")]
    rec.endpoint = True
    ev = st.feed(chunk)
    assert [(e.kind, e.text, e.utterance) for e in ev] == [("final", "일 분", 0)] and rec.resets == 1


def test_tokens_to_text_strips_tags_and_spaces():
    assert tokens_to_text([" ", "조", "국", "이", " ", "<ko-KR>", "당"]) == "조국이 당"
