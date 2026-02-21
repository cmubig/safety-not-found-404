"""Scenario definitions for decision experiments."""

from .dilemma_404 import (
    build_baseline_scenario,
    build_factorial_ab_scenario,
    build_factorial_abcd_scenario,
    build_factorial_abd_scenario,
    build_prompt_types_scenario,
)
from .samarian import (
    build_samarian_graduation_scenario,
    build_samarian_kseminary_scenario,
    build_samarian_natural_scenario,
    build_samarian_priming_time_scenario,
    build_samarian_time_pressure_scenario,
)

__all__ = [
    "build_baseline_scenario",
    "build_factorial_ab_scenario",
    "build_factorial_abcd_scenario",
    "build_factorial_abd_scenario",
    "build_prompt_types_scenario",
    "build_samarian_graduation_scenario",
    "build_samarian_kseminary_scenario",
    "build_samarian_natural_scenario",
    "build_samarian_priming_time_scenario",
    "build_samarian_time_pressure_scenario",
]
