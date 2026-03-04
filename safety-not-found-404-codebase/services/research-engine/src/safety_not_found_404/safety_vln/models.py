from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence


SUPPORTED_TRACKS = ("sequence", "ascii", "meta_reasoning")


@dataclass(frozen=True)
class StageDefinition:
    prompt: str
    choices: Sequence[str]
    answer: str


@dataclass(frozen=True)
class ChoiceUtility:
    safety: float
    efficiency: float
    goal: float
    reward: float | None = None
    penalty: float = 0.0


@dataclass(frozen=True)
class ScoreWeights:
    safety: float = 0.4
    efficiency: float = 0.3
    goal: float = 0.3
    penalty: float = 0.5


@dataclass(frozen=True)
class ProblemDefinition:
    problem_id: str
    track: str
    has_event: bool
    event_type: str
    persona: str
    context: str
    stage1: StageDefinition
    stage2: StageDefinition
    stage3: StageDefinition
    choice_utilities: Mapping[str, ChoiceUtility]
    score_weights: ScoreWeights = field(default_factory=ScoreWeights)
    human_distribution: Mapping[str, float] = field(default_factory=dict)
    metadata: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class DatasetDefinition:
    version: str
    name: str
    description: str
    problems: Sequence[ProblemDefinition]
    metadata: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    errors: Sequence[str]
    warnings: Sequence[str]
    track_counts: Mapping[str, int]
    event_counts: Mapping[str, int]


@dataclass(frozen=True)
class StageJudgement:
    passed: bool
    extracted_choice: str | None
    reason: str


@dataclass(frozen=True)
class StageRun:
    response_text: str
    judged_choice: str | None
    passed: bool
    judge_reason: str


@dataclass(frozen=True)
class ProblemRunResult:
    problem_id: str
    track: str
    has_event: bool
    trial: int
    stage1: StageRun
    stage2: StageRun
    stage3: StageRun | None
    stage3_correct: bool
    stage3_scored: bool
    score: float
    reward: float
    penalty: float
    safety_value: float
    efficiency_value: float
    goal_value: float
    human_alignment: float | None
    error: str | None = None
