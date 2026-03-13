from __future__ import annotations

from safety_not_found_404.safety_vln.models import (
    ChoiceUtility,
    ProblemDefinition,
    ProblemRunResult,
    ScoreWeights,
    StageDefinition,
    StageRun,
)
from safety_not_found_404.safety_vln.scoring import (
    compute_choice_score,
    compute_human_alignment,
    summarize_run,
)


def _problem() -> ProblemDefinition:
    return ProblemDefinition(
        problem_id="p1",
        track="sequence",
        has_event=True,
        event_type="hazard",
        persona="balanced",
        context="test",
        stage1=StageDefinition(prompt="s1", choices=("A", "B"), answer="A"),
        stage2=StageDefinition(prompt="s2", choices=("A", "B"), answer="A"),
        stage3=StageDefinition(prompt="s3", choices=("A", "B", "C"), answer="C"),
        choice_utilities={
            "A": ChoiceUtility(safety=0.9, efficiency=0.3, goal=0.6, penalty=0.05),
            "B": ChoiceUtility(safety=0.2, efficiency=0.9, goal=0.7, penalty=0.8),
            "C": ChoiceUtility(safety=0.7, efficiency=0.8, goal=0.95, penalty=0.1),
        },
        score_weights=ScoreWeights(safety=0.5, efficiency=0.2, goal=0.3, penalty=0.7),
        human_distribution={"A": 0.2, "B": 0.1, "C": 0.7},
    )


def test_compute_choice_score_prefers_safer_high_goal_choice() -> None:
    problem = _problem()

    score_a = compute_choice_score(problem, "A")
    score_c = compute_choice_score(problem, "C")

    assert score_c.score > score_a.score
    assert 0.0 <= score_c.score <= 1.0


def test_compute_human_alignment_returns_high_for_majority_choice() -> None:
    alignment = compute_human_alignment(
        model_choice="C",
        human_distribution={"A": 0.2, "B": 0.1, "C": 0.7},
        candidate_choices=("A", "B", "C"),
    )
    assert alignment is not None
    assert alignment > 0.6


def test_summarize_run_core_gap() -> None:
    stage_pass = StageRun(response_text="Answer: A", judged_choice="A", passed=True, judge_reason="ok")
    stage3_event = StageRun(response_text="Answer: C", judged_choice="C", passed=True, judge_reason="ok")
    stage3_general = StageRun(response_text="Answer: B", judged_choice="B", passed=False, judge_reason="mismatch")

    results = [
        ProblemRunResult(
            problem_id="e1",
            track="sequence",
            has_event=True,
            risk_level="high",
            demographic_group="black",
            sequence_direction="ltr",
            time_interval_bucket="high",
            trial=1,
            stage1=stage_pass,
            stage2=stage_pass,
            stage3=stage3_event,
            stage3_correct=True,
            stage3_scored=True,
            score=0.7,
            reward=0.8,
            penalty=0.1,
            safety_value=0.9,
            efficiency_value=0.4,
            goal_value=0.8,
            human_alignment=0.85,
            safety_dimensions=("physical_safety", "social_norm_respect"),
        ),
        ProblemRunResult(
            problem_id="g1",
            track="sequence",
            has_event=False,
            risk_level="low",
            demographic_group="white",
            sequence_direction="rtl",
            time_interval_bucket="low",
            trial=1,
            stage1=stage_pass,
            stage2=stage_pass,
            stage3=stage3_general,
            stage3_correct=False,
            stage3_scored=True,
            score=0.9,
            reward=0.9,
            penalty=0.0,
            safety_value=0.6,
            efficiency_value=0.9,
            goal_value=0.8,
            human_alignment=0.3,
            safety_dimensions=("physical_safety",),
        ),
    ]

    summary = summarize_run(results)

    assert summary["core_scores"]["general_score"] == 0.9
    assert summary["core_scores"]["safety_event_score"] == 0.7
    assert summary["core_scores"]["gap_general_minus_event"] == 0.2
    assert summary["core_scores"]["ltr_minus_rtl_score_gap"] == -0.2
    assert summary["core_scores"]["high_minus_low_time_interval_gap"] == -0.2
    assert summary["core_scores"]["high_minus_low_risk_gap"] == -0.2
    assert summary["by_sequence_direction"]["ltr"]["score_mean"] == 0.7
    assert summary["by_sequence_direction"]["rtl"]["score_mean"] == 0.9
    assert summary["by_time_interval_bucket"]["high"]["score_mean"] == 0.7
    assert summary["by_time_interval_bucket"]["low"]["score_mean"] == 0.9
    assert summary["by_demographic_group"]["black"]["score_mean"] == 0.7
    assert summary["by_demographic_group"]["white"]["score_mean"] == 0.9
    assert summary["by_safety_dimension"]["physical_safety"]["n_trials"] == 2
    assert summary["fairness_metrics"]["demographic_max_minus_min_score_gap"] == 0.2
