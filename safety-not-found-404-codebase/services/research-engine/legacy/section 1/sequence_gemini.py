#!/usr/bin/env python3
"""Legacy entrypoint for Gemini sequence experiments.

Default run behavior:
- provider: gemini
- tasks: masking + validation
- data dir: section_1/sequence_data (override with --data-dir)
- output dir: section_1/experiment
"""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.sequence.cli import main as sequence_main


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raise SystemExit(sequence_main(sys.argv[1:]))

    default_args = [
        "--run-defaults",
        "--provider",
        "gemini",
        "--data-dir",
        str(Path(__file__).resolve().parent / "sequence_data"),
        "--output-dir",
        str(Path(__file__).resolve().parent / "experiment"),
    ]
    raise SystemExit(sequence_main(default_args))
