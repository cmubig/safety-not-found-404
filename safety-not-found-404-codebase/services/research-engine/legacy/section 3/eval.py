#!/usr/bin/env python3
"""Legacy entrypoint for A/B visual evaluation.

Backwards-compatible aliases:
- --folder_a -> --folder-a
- --folder_b -> --folder-b
- --max_items -> --max-items
"""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.evaluation.cli import main as eval_main


ALIASES = {
    "--folder_a": "--folder-a",
    "--folder_b": "--folder-b",
    "--max_items": "--max-items",
}


def normalize_args(args: list[str]) -> list[str]:
    normalized: list[str] = []
    for arg in args:
        normalized.append(ALIASES.get(arg, arg))
    return normalized


if __name__ == "__main__":
    raise SystemExit(eval_main(normalize_args(sys.argv[1:])))
