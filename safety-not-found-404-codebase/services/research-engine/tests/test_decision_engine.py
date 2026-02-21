from __future__ import annotations

import csv

from safety_not_found_404.decision_experiments.engine import run_scenario
from safety_not_found_404.decision_experiments.models import ModelTarget, PromptCase, ScenarioDefinition


class _FakeProvider:
    def __init__(self) -> None:
        self._responses = iter([
            "Answer: A\\nReason: first",
            "Answer: B\\nReason: second",
        ])

    def is_configured(self) -> bool:
        return True

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        _ = system_prompt
        _ = user_prompt
        return next(self._responses)


def test_run_scenario_writes_summary(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "safety_not_found_404.decision_experiments.engine.create_provider",
        lambda provider, model, temperature, max_tokens: _FakeProvider(),
    )

    scenario = ScenarioDefinition(
        key="unit_test_scenario",
        title="Unit Test",
        choices=("A", "B"),
        help_choices=("A",),
        prompt_cases=[
            PromptCase(case_id="case_1", prompt="Prompt 1", meta={"group_key": "g1"}),
            PromptCase(case_id="case_2", prompt="Prompt 2", meta={"group_key": "g1"}),
        ],
        default_system_prompt="System",
        condition_key_fields=("group_key",),
    )

    artifacts = run_scenario(
        scenario=scenario,
        model_targets=[ModelTarget(provider="openai", model="gpt-test")],
        output_dir=tmp_path,
        trials_per_case=1,
        quiet=True,
        run_id="testrun",
    )

    assert len(artifacts) == 1
    artifact = artifacts[0]
    assert artifact.csv_path.exists()
    assert artifact.summary_json_path.exists()
    assert artifact.summary_text_path.exists()

    with artifact.csv_path.open("r", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 2
    assert rows[0]["choice"] == "A"
    assert rows[1]["choice"] == "B"

    summary_text = artifact.summary_text_path.read_text(encoding="utf-8")
    assert "A: 1" in summary_text
    assert "B: 1" in summary_text
