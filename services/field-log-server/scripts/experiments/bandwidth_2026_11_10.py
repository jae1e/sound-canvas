"""Bandwidth experiment: does an 8 kHz (narrowband) Bluetooth link hurt Qwen3-ASR compared with 16 kHz?

Takes the S25 phone-mic reads of the first ASR test set (2026-11-06 18:43-18:45, known references),
mixes in noise cut from the S25 subway recordings (non-speech parts, 19:49-19:52), at several SNRs,
then simulates the Bluetooth codec bandwidth, and runs the server's own final pipeline on each copy.

Run from services/field-log-server:  uv run --no-sync python -I <this file> OUTDIR
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, resample_poly, sosfiltfilt

from fls.audio import load_16k_mono
from fls.cer import cer
from fls.engines import make_final_engine
from fls.pipeline import transcribe_segment
from fls.vad import speech_spans

ROOT = Path.home() / ".local/share/field-log-server"
SR = 16000

REFS = {
    "s1": "오늘 3번 라인 컨베이어 점검 완료했고, bearing 교체는 내일 오전 9시에 진행합니다. 담당자는 김민수 대리입니다.",
    "s2": "압력은 2.5 bar, 온도는 섭씨 78도, 진동 값은 4.2 mm/s로 기준치보다 15퍼센트 높습니다.",
    "s3": "Pump number two is leaking near the outlet valve. Please shut it down before the night shift and log the work order.",
    "s4": "점심 이후 2공장 순찰 결과입니다. 첫째, 프레스 A 구역 안전 펜스가 일부 열려 있어서 바로 닫았습니다. 둘째, 지게차 통로에 팔레트가 세 개 방치되어 있었고, 물류팀에 연락했습니다. 셋째, compressor room 환기팬 소음이 평소보다 크니까 maintenance 요청 넣어주세요. 마지막으로 내일 TBM 때 보호안경 착용 다시 강조하겠습니다.",
}
# Phone-mic segments of each sentence (s4 was split in two by the app).
PHONE = {
    "s1": ["01a1b03e-3852-7638-808c-b20225d35a58"],
    "s2": ["01a1b03e-b365-7aa5-a49e-126eaaf73589"],
    "s3": ["01a1b03f-2ffc-7215-af0d-22c0efa2ca50"],
    "s4": ["01a1b03f-c17b-73f5-8791-76f57f005a58", "01a1b03f-d5bf-729b-bb15-549c55bc181b"],
}
# The same sentences on the QCY earbuds a few minutes later (real Bluetooth, for comparison).
EARBUDS = {
    "s1": ["01a1b040-aea8-7651-b42b-c293d7c29d66"],
    "s2": ["01a1b041-0aba-7437-aa86-59bf277f2f33"],
    "s3": ["01a1b041-7030-776f-b40e-0d0f85b3935f"],
    "s4": ["01a1b041-d587-7baa-a7e2-83dccf30d5a8", "01a1b042-2a5a-79aa-b7d7-ce2654f3d1e4"],
}
SUBWAY_PHONE = [  # S25 phone mic, subway station, 19:49-19:52 (speech parts are cut out)
    "01a1b07a-b4d1-7a2a-a1dd-bc9f0cc28298",
    "01a1b07a-f540-7543-b490-c30195cbef3e",
    "01a1b07d-a11b-7aa0-a657-153b604afe96",
]
SNRS = [None, 10, 5, 0]  # dB; None = no added noise


def seg_audio(db: sqlite3.Connection, seg: str) -> np.ndarray:
    sha = db.execute("select object_sha256 from segments where segment_id=?", (seg,)).fetchone()[0]
    return load_16k_mono(ROOT / "objects" / sha[:2] / sha)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x, dtype=np.float64)) + 1e-12))


def speech_mask(x: np.ndarray, pad_ms: int = 150) -> np.ndarray:
    m = np.zeros(len(x), bool)
    for a, b in speech_spans(x):
        m[max(0, (a - pad_ms) * SR // 1000):(b + pad_ms) * SR // 1000] = True
    return m


def band_energy_edge(x: np.ndarray) -> float:
    """Frequency (Hz) below which 99.5% of the speech-frame energy lies (rough effective bandwidth)."""
    m = speech_mask(x, 0)
    y = x[m] if m.sum() > SR // 2 else x
    n = 1024
    frames = np.lib.stride_tricks.sliding_window_view(y, n)[:: n // 2] * np.hanning(n)
    p = np.mean(np.abs(np.fft.rfft(frames, axis=1)) ** 2, axis=0)
    p[: int(100 * n / SR)] = 0  # ignore rumble below 100 Hz
    c = np.cumsum(p) / p.sum()
    return float(np.searchsorted(c, 0.995) * SR / n)


def hf_share(x: np.ndarray, f: float = 4000) -> float:
    n = 1024
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[:: n // 2] * np.hanning(n)
    p = np.mean(np.abs(np.fft.rfft(frames, axis=1)) ** 2, axis=0)
    k = int(f * n / SR)
    return float(p[k:].sum() / p[2:].sum())


def narrowband(x: np.ndarray) -> np.ndarray:
    """CVSD-like link: telephone band 300-3400 Hz, resampled to 8 kHz and back (codec noise not modelled)."""
    sos = butter(6, [300, 3400], btype="band", fs=SR, output="sos")
    y = resample_poly(sosfiltfilt(sos, x), 1, 2)
    return resample_poly(y, 2, 1).astype(np.float32)[: len(x)]


def wideband(x: np.ndarray) -> np.ndarray:
    """mSBC-like link: 50-7000 Hz (the 16 kHz phone recording already ends near 8 kHz)."""
    sos = butter(6, [50, 7000], btype="band", fs=SR, output="sos")
    return sosfiltfilt(sos, x).astype(np.float32)


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(f"file:{ROOT / 'db.sqlite3'}?mode=ro", uri=True)
    rng = np.random.default_rng(7)

    # Subway noise bed and the real subway SNR of the phone recordings.
    beds, subway = [], []
    for seg in SUBWAY_PHONE:
        x = seg_audio(db, seg)
        m = speech_mask(x)
        if (~m).sum() > SR // 4:
            beds.append(x[~m])
        if m.any() and (~m).any():
            sp, nz = rms(x[m]), rms(x[~m])
            snr = 20 * np.log10(np.sqrt(max(sp**2 - nz**2, 1e-12)) / nz)
            subway.append({"segment": seg, "speech_plus_noise_dbfs": 20 * np.log10(sp),
                           "noise_dbfs": 20 * np.log10(nz), "snr_db": snr})
    bed = np.concatenate(beds)
    print(f"noise bed {len(bed) / SR:.1f} s, rms {20 * np.log10(rms(bed)):.1f} dBFS")

    # Real recordings: effective bandwidth.
    measured = []
    for label, table in (("phone", PHONE), ("earbuds", EARBUDS)):
        for s, segs in table.items():
            for seg in segs:
                x = seg_audio(db, seg)
                measured.append({"input": label, "sentence": s, "segment": seg,
                                 "edge_hz": band_energy_edge(x), "hf4k_share": hf_share(x)})
    for seg in SUBWAY_PHONE:
        x = seg_audio(db, seg)
        measured.append({"input": "phone-subway", "sentence": "-", "segment": seg,
                         "edge_hz": band_energy_edge(x), "hf4k_share": hf_share(x)})

    eng = make_final_engine("qwen3")
    langs = ["ko", "en"]

    def run(x: np.ndarray) -> str:
        r = transcribe_segment(eng, None, x, langs, None, force=False)
        return r.text or ""

    rows = []
    # Real earbud recordings, unchanged.
    for s, segs in EARBUDS.items():
        hyp = " ".join(run(seg_audio(db, g)) for g in segs)
        rows.append({"source": "earbuds-real", "band": "as recorded", "snr": None, "sentence": s, "hyp": hyp,
                     **cer(REFS[s], hyp)})
    # Phone recordings: noise x bandwidth.
    for s, segs in PHONE.items():
        clean = [seg_audio(db, g) for g in segs]
        for snr in SNRS:
            mixed = []
            for x in clean:
                if snr is None:
                    mixed.append(x)
                    continue
                m = speech_mask(x)
                start = rng.integers(0, max(1, len(bed) - len(x)))
                n = np.resize(bed[start:], len(x)).astype(np.float32)
                gain = rms(x[m]) / rms(n) / (10 ** (snr / 20))
                mixed.append(np.clip(x + gain * n, -1, 1).astype(np.float32))
            for band, fn in (("16k (orig)", None), ("16k mSBC 7k", wideband), ("8k CVSD 3.4k", narrowband)):
                xs = [fn(x) if fn else x for x in mixed]
                hyp = " ".join(run(x) for x in xs)
                r = {"source": "phone", "band": band, "snr": snr, "sentence": s, "hyp": hyp, **cer(REFS[s], hyp)}
                rows.append(r)
                print(f"{s} snr={snr} {band:13s} cer={r['cer']:.3f} {hyp[:60]}")
                if s == "s2":  # keep listening samples
                    import soundfile as sf
                    sf.write(out / f"s2_snr{snr}_{band.split()[0]}_{band.split()[1]}.wav", np.concatenate(xs), SR)

    (out / "results.json").write_text(json.dumps({"subway": subway, "measured": measured, "rows": rows},
                                                 ensure_ascii=False, indent=1))
    print("done")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
