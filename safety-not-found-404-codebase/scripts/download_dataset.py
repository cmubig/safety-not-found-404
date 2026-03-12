#!/usr/bin/env python3
"""Download or generate the Safety-VLN benchmark dataset.

Sources:
    local       -- Generate the synthetic dataset locally (default).
    huggingface -- Download from HuggingFace Hub (placeholder; not yet available).

Usage:
    python scripts/download_dataset.py --source local --output data/safety_vln_v1.json
    python scripts/download_dataset.py --source huggingface --output data/safety_vln_v1.json
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[0]
CODEBASE_ROOT = PROJECT_ROOT.parent if PROJECT_ROOT.name == "scripts" else PROJECT_ROOT
RESEARCH_ENGINE_SRC = CODEBASE_ROOT / "services" / "research-engine" / "src"
sys.path.insert(0, str(RESEARCH_ENGINE_SRC))


def _generate_local(output_path: Path, *, per_track: int, event_ratio: float, seed: int) -> None:
    from safety_not_found_404.safety_vln.dataset import generate_synthetic_dataset, save_dataset

    print(f"Generating synthetic dataset (per_track={per_track}, event_ratio={event_ratio}, seed={seed})...")
    dataset = generate_synthetic_dataset(
        per_track_count=per_track,
        event_ratio=event_ratio,
        seed=seed,
    )
    save_dataset(output_path, dataset)
    print(f"Saved {len(dataset.problems)} problems to {output_path.resolve()}")


def _download_huggingface(output_path: Path) -> None:
    print("HuggingFace download is not yet available.")
    print()
    print("The Safety-VLN dataset will be published to HuggingFace Hub in a future release.")
    print("For now, use --source local to generate the synthetic dataset locally:")
    print()
    print(f"    python {Path(__file__).name} --source local --output {output_path}")
    print()
    sys.exit(1)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Download or generate the Safety-VLN benchmark dataset.",
    )
    parser.add_argument(
        "--source",
        choices=["local", "huggingface"],
        default="local",
        help="Dataset source: 'local' generates synthetically, 'huggingface' downloads from Hub (default: local).",
    )
    parser.add_argument(
        "--output",
        default="data/safety_vln_v1.json",
        help="Output file path (default: data/safety_vln_v1.json).",
    )
    parser.add_argument("--per-track", type=int, default=100, help="Problems per track (default: 100).")
    parser.add_argument("--event-ratio", type=float, default=0.5, help="Fraction of event problems (default: 0.5).")
    parser.add_argument("--seed", type=int, default=20260304, help="Random seed (default: 20260304).")

    args = parser.parse_args(argv)
    output_path = Path(args.output)

    if args.source == "local":
        _generate_local(output_path, per_track=args.per_track, event_ratio=args.event_ratio, seed=args.seed)
    elif args.source == "huggingface":
        _download_huggingface(output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
