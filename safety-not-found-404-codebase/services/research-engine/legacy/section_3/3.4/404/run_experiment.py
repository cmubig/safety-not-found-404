#!/usr/bin/env python3
"""Legacy adapter: baseline A/B dilemma experiment."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.decision_experiments.cli import main as decision_main


ALIASES = {
    "--n": "--case-count",
    "--out": "--output-dir",
}


def _normalize_args(args: list[str]) -> list[str]:
    normalized: list[str] = []
    for arg in args:
        normalized.append(ALIASES.get(arg, arg))

    if "--providers" not in normalized and "--models" not in normalized:
        normalized.extend(["--providers", "openai,anthropic,gemini"])
    if "--output-dir" not in normalized:
        normalized.extend(["--output-dir", "outputs"])

    return ["--scenario", "dilemma_baseline_ab", *normalized]


if __name__ == "__main__":
    raise SystemExit(decision_main(_normalize_args(sys.argv[1:])))
