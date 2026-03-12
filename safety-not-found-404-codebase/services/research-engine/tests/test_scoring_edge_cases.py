"""Edge case tests for safety_vln scoring and dataset validation."""
from __future__ import annotations

from safety_not_found_404.safety_vln.models import (
    ChoiceUtility,
    ProblemDefinition,
    ScoreWeights,
    StageDefinition,
)
from safety_not_found_404.safety_vln.scoring import (
    compute_choice_score,
    compute_human_alignment,
    summarize_run,
)


def _make_problem(**overrides) -> ProblemDefinition:
    """Helper to create a minimal problem with overridable fields."""
    defaults = dict(
        problem_id="test_001",
        track="sequence",
        has_event=True,
        event_type="hazard",
        persona="balanced",
        context="test context",
        stage1=StageDefinition(prompt="q1", choices=("A", "B"), answer="A"),
        stage2=StageDefinition(prompt="q2", choices=("A", "B"), answer="A"),
        stage3=StageDefinition(prompt="q3", choices=("A", "B", "C", "D"), answer="A"),
        choice_utilities={
            "A": ChoiceUtility(safety=0.9, efficiency=0.3, goal=0.8, penalty=0.05),
            "B": ChoiceUtility(safety=0.1, efficiency=0.9, goal=0.9, penalty=0.8),
            "C": ChoiceUtility(safety=0.5, efficiency=0.5, goal=0.5, penalty=0.2),
            "D": ChoiceUtility(safety=0.2, efficiency=0.1, goal=0.1, penalty=0.5),
        },
        score_weights=ScoreWeights(),
    )
    defaults.update(overrides)
    return ProblemDefinition(**defaults)


class TestComputeChoiceScoreEdgeCases:
    def test_unknown_choice_returns_zero_score_with_full_penalty(self) -> None:
        problem = _make_problem()
        result = compute_choice_score(problem, "Z")
        assert result.score == 0.0
        assert result.penalty == 1.0

    def test_whitespace_and_case_normalized(self) -> None:
        problem = _make_problem()
        result = compute_choice_score(problem, "  a  ")
        assert result.score > 0.0
        assert result.safety_value == 0.9


class TestComputeHumanAlignmentEdgeCases:
    def test_empty_distribution_returns_none(self) -> None:
        result = compute_human_alignment(
            model_choice="A",
            human_distribution={},
            candidate_choices=("A", "B"),
        )
        assert result is None

    def test_model_choice_not_in_candidates_returns_none(self) -> None:
        result = compute_human_alignment(
            model_choice="Z",
            human_distribution={"A": 0.5, "B": 0.5},
            candidate_choices=("A", "B"),
        )
        assert result is None

    def test_zero_sum_distribution_returns_none(self) -> None:
        result = compute_human_alignment(
            model_choice="A",
            human_distribution={"A": 0.0, "B": 0.0},
            candidate_choices=("A", "B"),
        )
        assert result is None

    def test_perfect_alignment(self) -> None:
        result = compute_human_alignment(
            model_choice="A",
            human_distribution={"A": 1.0, "B": 0.0},
            candidate_choices=("A", "B"),
        )
        assert result == 1.0


class TestSummarizeRunEdgeCases:
    def test_empty_results_returns_zero_metrics(self) -> None:
        summary = summarize_run([])
        overall = summary["overall"]
        assert overall["n_trials"] == 0
        assert overall["score_mean"] == 0.0
        assert overall["stage1_pass_rate"] == 0.0
