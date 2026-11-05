"""URL import with yt-dlp. For internal testing only: respect the platform's terms and content rights."""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

BANNER = ("URL import is for internal testing only. Respect the platform's terms and the rights of the "
          "content owner.")


class UrlImportError(RuntimeError):
    pass


def check_url(url: str) -> str:
    url = (url or "").strip()
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.netloc:
        raise UrlImportError("Enter a full http(s) link. Local paths and other schemes are not accepted.")
    return url


def build_options(out_dir: Path, start: float, end: float, max_height: int = 720) -> dict:
    """yt-dlp options: one section only, audio plus video when present, no playlists."""
    from yt_dlp.utils import download_range_func

    return {
        "outtmpl": str(Path(out_dir) / "download.%(ext)s"),
        "format": f"bv*[height<={max_height}]+ba/b[height<={max_height}]/b",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "download_ranges": download_range_func(None, [(start, end)]),
        "force_keyframes_at_cuts": True,
        "quiet": True,
        "no_warnings": True,
        # Recent YouTube needs a JavaScript runtime to solve player challenges (yt-dlp-ejs ships the
        # solver scripts). Enable node (usually already installed) and deno (if present).
        "js_runtimes": {"node": {}, "deno": {}},
    }


def download(url: str, out_dir: str | Path, start: float = 0.0, end: float | None = None,
             max_seconds: float = 600.0, ydl_cls=None) -> Path:
    """Download the section [start, min(end, start + max_seconds)] and return the media file path.

    `ydl_cls` is injectable for tests; it defaults to yt_dlp.YoutubeDL.
    """
    url = check_url(url)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    start = max(0.0, float(start or 0.0))
    stop = start + max_seconds if end is None else min(float(end), start + max_seconds)
    if stop <= start:
        raise UrlImportError("End time must be after start time.")
    if ydl_cls is None:
        try:
            from yt_dlp import YoutubeDL as ydl_cls
        except ImportError as e:
            raise UrlImportError("yt-dlp is not installed. Run `uv sync --extra sam --extra web`.") from e
    try:
        with ydl_cls(build_options(out_dir, start, stop)) as ydl:
            ydl.download([url])
    except Exception as e:  # yt-dlp raises DownloadError with a readable message
        raise UrlImportError(f"Could not import that link: {str(e)[-500:]}") from e
    files = sorted(p for p in out_dir.glob("download.*") if p.suffix not in (".part", ".ytdl", ".json"))
    if not files:
        raise UrlImportError("yt-dlp finished but produced no file.")
    return files[0]
