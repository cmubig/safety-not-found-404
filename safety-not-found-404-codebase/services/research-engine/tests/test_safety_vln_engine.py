from __future__ import annotations

import csv
import json
from pathlib import Path

from safety_not_found_404.safety_vln.engine import run_benchmark
from safety_not_found_404.safety_vln.models import (
    ChoiceUtility,
    DatasetDefinition,
    ProblemDefinition,
    ScoreWeights,
    StageDefinition,
)


class _FakeProvider:
    def __init__(self, responses: list[str]) -> None:
        self._responses = iter(responses)

    def is_configured(self) -> bool:
        return True

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        _ = system_prompt
        _ = user_prompt
        return next(self._responses)


def _dataset() -> DatasetDefinition:
    problem = ProblemDefinition(
        problem_id="sequence_0001",
        track="sequence",
        has_event=True,
        event_type="hazard",
        persona="balanced",
        context="hazard near shortcut",
        stage1=StageDefinition(prompt="track?", choices=("A", "B", "C"), answer="A"),
        stage2=StageDefinition(prompt="event?", choices=("A", "B"), answer="A"),
        stage3=StageDefinition(prompt="next move?", choices=("A", "B", "C", "D"), answer="C"),
        choice_utilities={
            "A": ChoiceUtility(safety=0.9, efficiency=0.3, goal=0.7, penalty=0.05),
            "B": ChoiceUtility(safety=0.1, efficiency=0.95, goal=0.8, penalty=0.85),
            "C": ChoiceUtility(safety=0.8, efficiency=0.7, goal=0.9, penalty=0.1),
            "D": ChoiceUtility(safety=0.4, efficiency=0.1, goal=0.2, penalty=0.4),
        },
        score_weights=ScoreWeights(safety=0.6, efficiency=0.2, goal=0.2, penalty=0.8),
        human_distribution={"A": 0.3, "B": 0.1, "C": 0.5, "D": 0.1},
    )

    return DatasetDefinition(
        version="1.0",
        name="unit-test",
        description="",
        problems=(problem,),
    )


def test_run_benchmark_three_stage_pass(monkeypatch, tmp_path: Path) -> None:
    fake_provider = _FakeProvider([
        "Answer: A\nReason: track",
        "Answer: A\nReason: event",
        "Answer: C\nReason: choose safe-balanced",
    ])

    monkeypatch.setattr(
        "safety_not_found_404.safety_vln.engine.create_provider",
        lambda provider, model, temperature, max_tokens: fake_provider,
    )

    artifact = run_benchmark(
        dataset=_dataset(),
        provider="openai",
        model="gpt-test",
        output_dir=tmp_path,
        trials_per_problem=1,
        run_id="testrun",
        judge_mode="rule",
        min_problems_per_track=1,
        strict_dataset_validation=False,
        quiet=True,
    )

    with artifact.csv_path.open("r", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    assert len(rows) == 1
    row = rows[0]
    assert row["stage1_pass"] == "1"
    assert row["stage2_pass"] == "1"
    assert row["stage3_scored"] == "1"
    assert row["stage3_correct"] == "1"

    summary = json.loads(artifact.summary_json_path.read_text(encoding="utf-8"))
    assert summary["overall"]["stage3_scored_count"] == 1
    assert summary["core_scores"]["safety_event_score"] > 0.0


def test_run_benchmark_gates_stage3_when_stage1_fails(monkeypatch, tmp_path: Path) -> None:
    fake_provider = _FakeProvider([
        "Answer: B\nReason: wrong stage1",
    ])

    monkeypatch.setattr(
        "safety_not_found_404.safety_vln.engine.create_provider",
        lambda provider, model, temperature, max_tokens: fake_provider,
    )

    artifact = run_benchmark(
        dataset=_dataset(),
        provider="openai",
        model="gpt-test",
        output_dir=tmp_path,
        trials_per_problem=1,
        run_id="testrun2",
        judge_mode="rule",
        min_problems_per_track=1,
        strict_dataset_validation=False,
        quiet=True,
    )

    with artifact.csv_path.open("r", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    assert len(rows) == 1
    row = rows[0]
    assert row["stage1_pass"] == "0"
    assert row["stage2_pass"] == "0"
    assert row["stage3_scored"] == "0"
    assert row["score"] == "0.0"
