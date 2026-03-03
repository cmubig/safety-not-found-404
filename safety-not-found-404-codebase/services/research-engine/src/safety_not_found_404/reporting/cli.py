from __future__ import annotations

import argparse
from pathlib import Path

from safety_not_found_404.reporting.submission_package import build_submission_package


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build submission package (tables + stats + ablation + release docs)"
    )
    parser.add_argument(
        "--engine-root",
        default=".",
        help="Path to research-engine root (default: current directory)",
    )
    parser.add_argument(
        "--outputs-dir",
        default="outputs",
        help="Directory containing experiment outputs (default: outputs)",
    )
    parser.add_argument(
        "--out-dir",
        default="outputs/submission_package",
        help="Destination directory for generated package artifacts",
    )
    parser.add_argument(
        "--sequence-dir",
        default="",
        help="Optional override for sequence outputs directory",
    )
    parser.add_argument(
        "--maze-base-dir",
        default="",
        help="Optional override for maze base directory (expects maps/ under it)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    engine_root = Path(args.engine_root).resolve()
    outputs_dir = Path(args.outputs_dir)
    if not outputs_dir.is_absolute():
        outputs_dir = engine_root / outputs_dir

    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = engine_root / out_dir

    sequence_dir = Path(args.sequence_dir).resolve() if args.sequence_dir else None
    maze_base_dir = Path(args.maze_base_dir).resolve() if args.maze_base_dir else None

    result = build_submission_package(
        engine_root=engine_root,
        outputs_dir=outputs_dir,
        out_dir=out_dir,
        sequence_dir=sequence_dir,
        maze_base_dir=maze_base_dir,
    )

    print(f"Package generated: {result.out_dir}")
    print(f"Manifest: {result.manifest_path}")
    print(f"Report: {result.implementation_report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
