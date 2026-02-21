#!/usr/bin/env python3
"""Legacy entrypoint for video frame extraction."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.video.cli import main as video_main


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raise SystemExit(video_main(sys.argv[1:]))

    section_root = Path(__file__).resolve().parent
    default_args = [
        "--video",
        str(section_root / "source.mov"),
        "--out-dir",
        str(section_root / "frames_out"),
        "--interval",
        "2.0",
        "--width",
        "1920",
        "--height",
        "1080",
        "--mode",
        "letterbox",
        "--ext",
        "jpg",
        "--jpeg-quality",
        "95",
    ]
    raise SystemExit(video_main(default_args))
