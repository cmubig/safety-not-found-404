"""Tests for the offline evaluation system (evaluate.py)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from safety_not_found_404.safety_vln.dataset import generate_synthetic_dataset
from safety_not_found_404.safety_vln.evaluate import (
    evaluate_predictions,
    validate_predictions,
)
from safety_not_found_404.safety_vln.models import DatasetDefinition


@pytest.fixture()
def small_dataset() -> DatasetDefinition:
    """A small synthetic dataset (3 problems per track = 9 total)."""
    return generate_synthetic_dataset(per_track_count=3, event_ratio=0.5, seed=42)


def _make_predictions_file(
    tmp_path: Path,
    dataset: DatasetDefinition,
    *,
    perfect: bool = False,
    wrong_stage1: bool = False,
    skip_ids: set[str] | None = None,
    invalid_choices: dict[str, dict[str, str]] | None = None,
    model_name: str = "test-model",
    provider: str = "test-provider",
) -> Path:
    """Helper to build a predictions JSON file.

    Parameters
    ----------
    perfect:
        If True, use the correct answers for every stage.
    wrong_stage1:
        If True, use a deliberately wrong stage1 answer for every problem.
    skip_ids:
        Problem IDs to omit from the predictions (incomplete submission).
    invalid_choices:
        Mapping of problem_id -> {"stage1_choice": ..., ...} with bad values.
    """
    skip_ids = skip_ids or set()
    invalid_choices = invalid_choices or {}

    predictions = []
    for problem in dataset.problems:
        if problem.problem_id in skip_ids:
            continue

        if problem.problem_id in invalid_choices:
            entry = {"problem_id": problem.problem_id}
            entry.update(invalid_choices[problem.problem_id])
            predictions.append(entry)
            continue

        if perfect:
            predictions.append(
                {
                    "problem_id": problem.problem_id,
                    "stage1_choice": problem.stage1.answer,
                    "stage2_choice": problem.stage2.answer,
                    "stage3_choice": problem.stage3.answer,
                }
            )
        elif wrong_stage1:
            # Pick a choice that is NOT the answer
            wrong = [c for c in problem.stage1.choices if c != problem.stage1.answer][0]
            predictions.append(
                {
                    "problem_id": problem.problem_id,
                    "stage1_choice": wrong,
                    "stage2_choice": problem.stage2.answer,
                    "stage3_choice": problem.stage3.answer,
                }
            )
        else:
            predictions.append(
                {
                    "problem_id": problem.problem_id,
                    "stage1_choice": problem.stage1.answer,
                    "stage2_choice": problem.stage2.answer,
                    "stage3_choice": problem.stage3.answer,
                }
            )

    payload = {
        "model_name": model_name,
        "provider": provider,
        "predictions": predictions,
    }
    path = tmp_path / "predictions.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


class TestPerfectPredictions:
    """Perfect predictions should yield high scores and all stages passing."""

    def test_all_stages_pass(self, tmp_path: Path, small_dataset: DatasetDefinition) -> None:
        pred_path = _make_predictions_file(tmp_path, small_dataset, perfect=True)
        artifact = evaluate_predictions(
            dataset=small_dataset,
            predictions_path=pred_path,
            output_dir=tmp_path / "out",
            run_id="test-perfect",
        )

        assert artifact.rows_total == len(small_dataset.problems)
        assert artifact.csv_path.exists()
        assert artifact.summary_json_path.exists()
        assert artifact.summary_text_path.exists()

        summary = json.loads(artifact.summary_json_path.read_text(encoding="utf-8"))
        overall = summary["overall"]
        assert overall["stage1_pass_rate"] == 1.0
        assert overall["stage2_pass_rate"] == 1.0
        assert overall["stage3_scored_rate"] == 1.0
        assert overall["stage3_accuracy"] == 1.0
        assert overall["score_mean"] > 0.0

    def test_summary_text_written(self, tmp_path: Path, small_dataset: DatasetDefinition) -> None:
        pred_path = _make_predictions_file(tmp_path, small_dataset, perfect=True)
        artifact = evaluate_predictions(
            dataset=small_dataset,
            predictions_path=pred_path,
            output_dir=tmp_path / "out",
        )

        text = artifact.summary_text_path.read_text(encoding="utf-8")
        assert "core scores:" in text
        assert "general_score:" in text


class TestGating:
    """Wrong stage1 should gate stage2 and stage3."""

    def test_wrong_stage1_gates_stage2_stage3(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        pred_path = _make_predictions_file(tmp_path, small_dataset, wrong_stage1=True)
        artifact = evaluate_predictions(
            dataset=small_dataset,
            predictions_path=pred_path,
            output_dir=tmp_path / "out",
            run_id="test-gating",
        )

        summary = json.loads(artifact.summary_json_path.read_text(encoding="utf-8"))
        overall = summary["overall"]
        assert overall["stage1_pass_rate"] == 0.0
        assert overall["stage2_pass_rate"] == 0.0
        assert overall["stage3_scored_rate"] == 0.0
        assert overall["score_mean"] == 0.0


class TestValidation:
    """Validation checks on the predictions file."""

    def test_missing_predictions_warned(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        skip = {small_dataset.problems[0].problem_id}
        pred_path = _make_predictions_file(tmp_path, small_dataset, perfect=True, skip_ids=skip)

        report = validate_predictions(dataset=small_dataset, predictions_path=pred_path)
        # Missing predictions generate a warning, not an error
        assert report.is_valid is True
        assert len(report.warnings) > 0
        assert "Missing predictions" in report.warnings[0]

    def test_invalid_choice_caught(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        pid = small_dataset.problems[0].problem_id
        pred_path = _make_predictions_file(
            tmp_path,
            small_dataset,
            perfect=True,
            invalid_choices={
                pid: {
                    "stage1_choice": "Z",
                    "stage2_choice": "A",
                    "stage3_choice": "A",
                }
            },
        )

        report = validate_predictions(dataset=small_dataset, predictions_path=pred_path)
        assert report.is_valid is False
        assert any("stage1_choice" in e and "'Z'" in e for e in report.errors)

    def test_unknown_problem_id_caught(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        payload = {
            "model_name": "bad",
            "provider": "bad",
            "predictions": [
                {
                    "problem_id": "nonexistent_9999",
                    "stage1_choice": "A",
                    "stage2_choice": "A",
                    "stage3_choice": "A",
                }
            ],
        }
        pred_path = tmp_path / "bad_preds.json"
        pred_path.write_text(json.dumps(payload), encoding="utf-8")

        report = validate_predictions(dataset=small_dataset, predictions_path=pred_path)
        assert report.is_valid is False
        assert any("nonexistent_9999" in e for e in report.errors)

    def test_duplicate_prediction_caught(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        pid = small_dataset.problems[0].problem_id
        payload = {
            "model_name": "dup",
            "provider": "dup",
            "predictions": [
                {"problem_id": pid, "stage1_choice": "A", "stage2_choice": "A", "stage3_choice": "A"},
                {"problem_id": pid, "stage1_choice": "B", "stage2_choice": "A", "stage3_choice": "A"},
            ],
        }
        pred_path = tmp_path / "dup_preds.json"
        pred_path.write_text(json.dumps(payload), encoding="utf-8")

        report = validate_predictions(dataset=small_dataset, predictions_path=pred_path)
        assert report.is_valid is False
        assert any("Duplicate" in e for e in report.errors)

    def test_malformed_json_caught(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        pred_path = tmp_path / "bad.json"
        pred_path.write_text("not json", encoding="utf-8")

        report = validate_predictions(dataset=small_dataset, predictions_path=pred_path)
        assert report.is_valid is False

    def test_evaluate_raises_on_invalid(
        self, tmp_path: Path, small_dataset: DatasetDefinition
    ) -> None:
        """evaluate_predictions should raise ValueError when validation fails."""
        pid = small_dataset.problems[0].problem_id
        pred_path = _make_predictions_file(
            tmp_path,
            small_dataset,
            perfect=True,
            invalid_choices={
                pid: {
                    "stage1_choice": "Z",
                    "stage2_choice": "A",
                    "stage3_choice": "A",
                }
            },
        )

        with pytest.raises(ValueError, match="Prediction validation failed"):
            evaluate_predictions(
                dataset=small_dataset,
                predictions_path=pred_path,
                output_dir=tmp_path / "out",
            )


class TestCLISubcommand:
    """The evaluate-submission subcommand should be registered in the CLI parser."""

    def test_parser_accepts_evaluate_submission(self) -> None:
        from safety_not_found_404.safety_vln.cli import build_parser

        parser = build_parser()
        args = parser.parse_args([
            "evaluate-submission",
            "--dataset", "fake.json",
            "--predictions", "fake_preds.json",
            "--output-dir", "out",
        ])
        assert args.command == "evaluate-submission"
        assert args.dataset == "fake.json"
        assert args.predictions == "fake_preds.json"

    def test_validate_only_flag(self) -> None:
        from safety_not_found_404.safety_vln.cli import build_parser

        parser = build_parser()
        args = parser.parse_args([
            "evaluate-submission",
            "--dataset", "fake.json",
            "--predictions", "fake_preds.json",
            "--validate-only",
        ])
        assert args.validate_only is True
