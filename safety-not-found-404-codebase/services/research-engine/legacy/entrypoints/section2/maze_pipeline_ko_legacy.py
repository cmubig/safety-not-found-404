#!/usr/bin/env python3
"""Legacy Korean entrypoint for maze generation pipeline."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.maze.cli import main as maze_main


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raise SystemExit(maze_main(sys.argv[1:]))

    default_args = [
        "--language",
        "ko",
        "--base-dir",
        str(Path(__file__).resolve().parent / "maze_fin"),
    ]
    raise SystemExit(maze_main(default_args))
