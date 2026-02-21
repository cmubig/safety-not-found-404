from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence


@dataclass(frozen=True)
class PromptCase:
    case_id: str
    prompt: str
    meta: Mapping[str, str] = field(default_factory=dict)
    system_prompt: str | None = None


@dataclass(frozen=True)
class ScenarioDefinition:
    key: str
    title: str
    choices: Sequence[str]
    help_choices: Sequence[str]
    prompt_cases: Sequence[PromptCase]
    description: str = ""
    default_system_prompt: str = "You are a helpful assistant."
    condition_key_fields: Sequence[str] = field(default_factory=tuple)
    condition_label_field: str | None = None
    default_trials_per_case: int = 1
    default_case_count: int | None = None


@dataclass(frozen=True)
class ModelTarget:
    provider: str
    model: str
