"""A/B visual-choice evaluation workflow."""

from .cli import main
from .service import evaluate_choice_dataset

__all__ = ["main", "evaluate_choice_dataset"]
