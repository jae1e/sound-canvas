"""Voice-activity detection with Silero VAD (MIT), CPU only."""

from __future__ import annotations

import threading

import numpy as np

_model = None
_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        from silero_vad import load_silero_vad

        _model = load_silero_vad(onnx=False)
    return _model


def speech_spans(audio: np.ndarray, threshold: float = 0.5) -> list[tuple[int, int]]:
    """Speech spans in milliseconds [(start, end)] for 16 kHz mono float audio."""
    if audio.size < 512:
        return []
    import torch
    from silero_vad import get_speech_timestamps

    with _lock:  # the model keeps state between calls
        ts = get_speech_timestamps(torch.from_numpy(np.ascontiguousarray(audio, dtype=np.float32)), _get_model(),
                                   sampling_rate=16000, threshold=threshold, min_speech_duration_ms=60,
                                   min_silence_duration_ms=100, speech_pad_ms=30)
    return [(int(t["start"] * 1000 // 16000), int(t["end"] * 1000 // 16000)) for t in ts]


def speech_ms(audio: np.ndarray, threshold: float = 0.5) -> int:
    return sum(b - a for a, b in speech_spans(audio, threshold))
