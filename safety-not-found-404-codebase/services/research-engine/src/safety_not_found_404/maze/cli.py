from __future__ import annotations

import argparse
from pathlib import Path

from safety_not_found_404.maze.pipeline import run_full_pipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Maze generation + analysis pipeline")
    parser.add_argument("--language", choices=["en", "ko"], default="en")
    parser.add_argument("--base-dir", default="maze_fin", help="Output root for maps/view/sortview/img")
    parser.add_argument("--min-size", type=int, default=5)
    parser.add_argument("--max-size", type=int, default=20)
    parser.add_argument("--attempts-per-size", type=int, default=100)
    parser.add_argument("--max-iterations", type=int, default=500)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    run_full_pipeline(
        base_dir=Path(args.base_dir),
        language=args.language,
        min_size=args.min_size,
        max_size=args.max_size,
        attempts_per_size=args.attempts_per_size,
        max_iterations=args.max_iterations,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
