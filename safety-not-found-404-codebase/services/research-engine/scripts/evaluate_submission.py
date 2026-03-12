#!/usr/bin/env python3
"""Evaluate a submission predictions file against a Safety-VLN dataset offline."""

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.safety_vln.cli import main

if __name__ == "__main__":
    argv = ["evaluate-submission", *sys.argv[1:]]
    raise SystemExit(main(argv))
