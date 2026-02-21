from __future__ import annotations

from typing import Callable, Dict

from safety_not_found_404.decision_experiments.models import ScenarioDefinition
from safety_not_found_404.decision_experiments.scenarios.dilemma_404 import (
    build_baseline_scenario,
    build_factorial_ab_scenario,
    build_factorial_abcd_scenario,
    build_factorial_abd_scenario,
    build_prompt_types_scenario,
)
from safety_not_found_404.decision_experiments.scenarios.samarian import (
    build_samarian_graduation_scenario,
    build_samarian_kseminary_scenario,
    build_samarian_natural_scenario,
    build_samarian_priming_time_scenario,
    build_samarian_time_pressure_scenario,
)


Builder = Callable[[int, int], ScenarioDefinition]


def _wrap_no_args(builder: Callable[[], ScenarioDefinition]) -> Builder:
    def _inner(_: int, __: int) -> ScenarioDefinition:
        return builder()

    return _inner


SCENARIO_BUILDERS: Dict[str, Builder] = {
    "dilemma_baseline_ab": build_baseline_scenario,
    "dilemma_factorial_ab": build_factorial_ab_scenario,
    "dilemma_factorial_abd": build_factorial_abd_scenario,
    "dilemma_factorial_abcd": build_factorial_abcd_scenario,
    "dilemma_prompt_types_ab": build_prompt_types_scenario,
    "samarian_natural": _wrap_no_args(build_samarian_natural_scenario),
    "samarian_time_pressure": _wrap_no_args(build_samarian_time_pressure_scenario),
    "samarian_priming_time": _wrap_no_args(build_samarian_priming_time_scenario),
    "samarian_graduation": _wrap_no_args(build_samarian_graduation_scenario),
    "samarian_kseminary": _wrap_no_args(build_samarian_kseminary_scenario),
}


def available_scenarios() -> list[str]:
    return sorted(SCENARIO_BUILDERS.keys())


def build_scenario(scenario_key: str, case_count: int, seed: int) -> ScenarioDefinition:
    try:
        builder = SCENARIO_BUILDERS[scenario_key]
    except KeyError as error:
        raise ValueError(f"Unknown scenario: {scenario_key}") from error
    return builder(case_count, seed)
