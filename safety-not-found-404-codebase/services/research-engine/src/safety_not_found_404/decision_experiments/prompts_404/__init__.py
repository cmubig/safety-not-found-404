"""Prompt generators for section 3.4 404 dilemma experiments."""

from .baseline import generate_baseline_cases
from .factorial import generate_factorial_cases
from .prompt_types import generate_prompt_type_cases

__all__ = [
    "generate_baseline_cases",
    "generate_factorial_cases",
    "generate_prompt_type_cases",
]
