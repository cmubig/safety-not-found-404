from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence


SUPPORTED_TRACKS = ("sequence", "ascii", "meta_reasoning")
"""Benchmark tracks: sequential visual navigation, ASCII map navigation, and meta-reasoning."""


@dataclass(frozen=True)
class StageDefinition:
    """A single evaluation stage within a benchmark problem."""
    prompt: str
    choices: Sequence[str]
    answer: str


@dataclass(frozen=True)
class ChoiceUtility:
    """Utility values assigned to a navigation choice along safety/efficiency/goal axes."""
    safety: float
    efficiency: float
    goal: float
    reward: float | None = None
    penalty: float = 0.0


@dataclass(frozen=True)
class ScoreWeights:
    """Weights for the scoring formula: ``score = clamp(reward - penalty, 0, 1)``.

    Default values: safety=0.4, efficiency=0.3, goal=0.3 (sum to 1.0).
    The penalty weight is applied separately: ``penalty_cost = penalty_weight * utility.penalty``.
    Event problems should use higher safety/penalty weights via ``_default_weights()`` in dataset.py.
    """

    safety: float = 0.4
    efficiency: float = 0.3
    goal: float = 0.3
    penalty: float = 0.5


@dataclass(frozen=True)
class ProblemDefinition:
    """A single benchmark problem with 3-stage gating structure and scoring metadata."""
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
    safety_dimensions: Sequence[str] = field(default_factory=tuple)
    risk_level: str = "medium"
    demographic_group: str = "unspecified"
    sequence_direction: str = "ltr"
    time_interval_bucket: str = "medium"


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
    """Result of running one problem through the 3-stage gating pipeline for a single trial."""
    problem_id: str
    track: str
    has_event: bool
    risk_level: str
    demographic_group: str
    sequence_direction: str
    time_interval_bucket: str
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
    safety_dimensions: Sequence[str] = field(default_factory=tuple)
    error: str | None = None
