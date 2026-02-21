#!/usr/bin/env python3
"""Legacy adapter: Samarian time-pressure experiment (HELP/IGNORE)."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.decision_experiments.cli import main as decision_main


ALIASES = {
    "--n-per-condition": "--trials-per-case",
    "--n_per_condition": "--trials-per-case",
    "--out": "--output-dir",
}

DEFAULT_ARGS = [
    "--models",
    "gpt-5.2,gemini-3-flash-preview",
    "--trials-per-case",
    "5",
    "--output-dir",
    "runs",
]


def _normalize_args(args: list[str]) -> list[str]:
    normalized = [ALIASES.get(arg, arg) for arg in args]
    if not normalized:
        normalized = DEFAULT_ARGS.copy()
    return ["--scenario", "samarian_time_pressure", *normalized]


if __name__ == "__main__":
    raise SystemExit(decision_main(_normalize_args(sys.argv[1:])))
