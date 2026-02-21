#!/usr/bin/env python3
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from safety_not_found_404.decision_experiments.cli import main as decision_main

if __name__ == "__main__":
    argv = ["--scenario", "samarian_natural", *sys.argv[1:]]
    raise SystemExit(decision_main(argv))
