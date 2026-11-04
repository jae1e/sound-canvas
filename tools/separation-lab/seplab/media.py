"""ffprobe/ffmpeg wrappers (external binaries, run with subprocess)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .audio_io import fit_length, read_wav, write_wav

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


class MediaError(RuntimeError):
    pass


def _run(cmd: list[str]) -> str:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError as e:
        raise MediaError(f"{cmd[0]} not found; install ffmpeg") from e
    if p.returncode != 0:
        raise MediaError(f"{' '.join(cmd[:3])} failed: {p.stderr.strip()[-600:]}")
    return p.stdout


def probe(path: str | Path) -> dict:
    """Return {'duration', 'streams': [...], 'sample_rate'} (sample_rate of the first audio stream)."""
    out = _run([FFPROBE, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)])
    raw = json.loads(out)
    streams = []
    for s in raw.get("streams", []):
        streams.append({
            "index": s.get("index"),
            "type": s.get("codec_type"),
            "codec": s.get("codec_name"),
            "sample_rate": int(s["sample_rate"]) if s.get("sample_rate") else None,
            "channels": s.get("channels"),
            "width": s.get("width"),
            "height": s.get("height"),
            "duration": float(s["duration"]) if s.get("duration") else None,
            "duration_ts": s.get("duration_ts"),
            "time_base": s.get("time_base"),
        })
    audio = [s for s in streams if s["type"] == "audio"]
    return {
        "duration": float(raw.get("format", {}).get("duration", 0.0)),
        "streams": streams,
        "sample_rate": audio[0]["sample_rate"] if audio else None,
    }


def source_samples(path: str | Path, sr: int) -> int:
    """Number of samples the audio of `path` has at rate `sr`. Outputs are fitted to this."""
    info = probe(path)
    audio = [s for s in info["streams"] if s["type"] == "audio"]
    if audio:
        a = audio[0]
        # Exact when the stream time base is 1/sample_rate (WAV and most PCM).
        if a["duration_ts"] is not None and a["time_base"] == f"1/{a['sample_rate']}" and a["sample_rate"] == sr:
            return int(a["duration_ts"])
        if a["duration"]:
            return round(a["duration"] * sr)
    return round(info["duration"] * sr)


def extract_audio(src: str | Path, dst: str | Path, sr: int = 48000, channels: int = 1) -> int:
    """Extract audio to a WAV at `sr`; length is padded/trimmed to the source duration. Returns samples."""
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", "-v", "error", "-i", str(src), "-vn", "-ac", str(channels), "-ar", str(sr),
          "-c:a", "pcm_f32le", str(dst)])
    n = source_samples(src, sr)
    import soundfile as sf
    x, _ = sf.read(str(dst), dtype="float32", always_2d=True)
    x = fit_length(x, n)
    write_wav(dst, x if channels > 1 else x[:, 0], sr)
    return n


def make_proxy(src: str | Path, dst: str | Path, height: int = 360, fps: int = 5, keep_audio: bool = False) -> None:
    """Low-resolution proxy video (default 360p at 5 fps, no audio)."""
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    cmd = [FFMPEG, "-y", "-v", "error", "-i", str(src), "-vf", f"scale=-2:{height},fps={fps}",
           "-c:v", "libx264", "-crf", "30", "-preset", "veryfast", "-pix_fmt", "yuv420p"]
    cmd += ["-c:a", "aac", "-b:a", "64k"] if keep_audio else ["-an"]
    _run(cmd + [str(dst)])


def remux_audio(video: str | Path, new_audio: str | Path, dst: str | Path, audio_codec: str = "aac") -> int:
    """Replace the audio of `video` with `new_audio`, copying the video stream.

    The new audio is padded/trimmed to exactly the original audio length first. Returns samples.
    """
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    x, sr = read_wav(new_audio)
    n = source_samples(video, sr)
    fitted = Path(dst).with_suffix(".fitted.wav")
    write_wav(fitted, fit_length(x, n), sr)
    try:
        _run([FFMPEG, "-y", "-v", "error", "-i", str(video), "-i", str(fitted), "-map", "0:v:0", "-map", "1:a:0",
              "-c:v", "copy", "-c:a", audio_codec, "-b:a", "192k", str(dst)])
    finally:
        fitted.unlink(missing_ok=True)
    return n
