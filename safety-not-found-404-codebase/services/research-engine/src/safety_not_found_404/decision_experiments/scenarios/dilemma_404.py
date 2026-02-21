from __future__ import annotations

from typing import List

from safety_not_found_404.decision_experiments.models import PromptCase, ScenarioDefinition
from safety_not_found_404.decision_experiments.prompts_404 import (
    generate_baseline_cases,
    generate_factorial_cases,
    generate_prompt_type_cases,
)


DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. Follow the required output format exactly."


def build_baseline_scenario(case_count: int = 100, seed: int = 20260127) -> ScenarioDefinition:
    cases = generate_baseline_cases(case_count=case_count, seed=seed)
    return ScenarioDefinition(
        key="dilemma_baseline_ab",
        title="LLM Trolley Baseline (A/B)",
        description="Baseline A/B dilemma prompt set.",
        choices=("A", "B"),
        help_choices=(),
        prompt_cases=cases,
        default_system_prompt=DEFAULT_SYSTEM_PROMPT,
        default_trials_per_case=1,
        default_case_count=100,
    )


def build_factorial_ab_scenario(case_count: int = 100, seed: int = 20260127) -> ScenarioDefinition:
    cases = generate_factorial_cases(case_count=case_count, seed=seed, choices=("A", "B"))
    return ScenarioDefinition(
        key="dilemma_factorial_ab",
        title="LLM Factorial Framing (A/B)",
        description="2x2x2 factorial framing with A/B answer space.",
        choices=("A", "B"),
        help_choices=(),
        prompt_cases=cases,
        default_system_prompt=DEFAULT_SYSTEM_PROMPT,
        condition_key_fields=("urgency", "tone", "priority"),
        default_trials_per_case=1,
        default_case_count=100,
    )


def build_factorial_abd_scenario(case_count: int = 100, seed: int = 20260127) -> ScenarioDefinition:
    cases = generate_factorial_cases(case_count=case_count, seed=seed, choices=("A", "B", "D"))
    return ScenarioDefinition(
        key="dilemma_factorial_abd",
        title="LLM Factorial Framing (A/B/D)",
        description="2x2x2 factorial framing with A/B/D answer space.",
        choices=("A", "B", "D"),
        help_choices=(),
        prompt_cases=cases,
        default_system_prompt=DEFAULT_SYSTEM_PROMPT,
        condition_key_fields=("urgency", "tone", "priority"),
        default_trials_per_case=1,
        default_case_count=100,
    )


def build_factorial_abcd_scenario(case_count: int = 100, seed: int = 20260127) -> ScenarioDefinition:
    cases = generate_factorial_cases(case_count=case_count, seed=seed, choices=("A", "B", "C", "D"))
    return ScenarioDefinition(
        key="dilemma_factorial_abcd",
        title="LLM Factorial Framing (A/B/C/D)",
        description="2x2x2 factorial framing with A/B/C/D answer space.",
        choices=("A", "B", "C", "D"),
        help_choices=(),
        prompt_cases=cases,
        default_system_prompt=DEFAULT_SYSTEM_PROMPT,
        condition_key_fields=("urgency", "tone", "priority"),
        default_trials_per_case=1,
        default_case_count=100,
    )


def build_prompt_types_scenario(case_count: int = 100, seed: int = 20260128) -> ScenarioDefinition:
    grouped = generate_prompt_type_cases(n_per_type=case_count, seed=seed)
    flat_cases: List[PromptCase] = []
    for prompt_type, prompt_cases in grouped.items():
        for case in prompt_cases:
            meta = dict(case.meta)
            meta["prompt_type"] = prompt_type
            flat_cases.append(PromptCase(case_id=case.case_id, prompt=case.prompt, meta=meta))

    return ScenarioDefinition(
        key="dilemma_prompt_types_ab",
        title="LLM Prompt Types (A/B)",
        description="Five prompt-type families with A/B outputs.",
        choices=("A", "B"),
        help_choices=(),
        prompt_cases=flat_cases,
        default_system_prompt=DEFAULT_SYSTEM_PROMPT,
        condition_key_fields=("prompt_type",),
        default_trials_per_case=1,
        default_case_count=100,
    )
