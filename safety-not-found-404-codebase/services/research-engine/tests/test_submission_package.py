from __future__ import annotations

import csv
import json
from pathlib import Path

from safety_not_found_404.reporting.submission_package import build_submission_package


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def test_build_submission_package_generates_all_core_artifacts(tmp_path: Path) -> None:
    engine_root = tmp_path / "engine"
    outputs_dir = engine_root / "outputs"

    decision_dir = outputs_dir / "decision_experiments"
    safety_vln_dir = outputs_dir / "safety_vln"
    sequence_dir = outputs_dir / "sequence"
    maze_maps_dir = engine_root / "maze_fin" / "maps"

    # Better run (should be selected)
    _write_json(
        decision_dir / "samarian_time_pressure_openai_gpt-5.2_run_good.summary.json",
        {
            "run_id": "run_good",
            "scenario_key": "samarian_time_pressure",
            "scenario_title": "Samarian Time Pressure (HELP/IGNORE)",
            "provider": "openai",
            "model": "gpt-5.2",
            "rows_total": 30,
            "errors": 0,
            "unknown": 0,
            "choices": ["HELP", "IGNORE"],
            "choice_counts": {"HELP": 18, "IGNORE": 12},
            "condition_breakdown": {
                "condition_key=low_hurry": {
                    "label": "Low Hurry",
                    "choice_counts": {"HELP": 8, "IGNORE": 2},
                    "errors": 0,
                    "unknown": 0,
                    "rows_total": 10,
                },
                "condition_key=medium_hurry": {
                    "label": "Medium Hurry",
                    "choice_counts": {"HELP": 6, "IGNORE": 4},
                    "errors": 0,
                    "unknown": 0,
                    "rows_total": 10,
                },
                "condition_key=high_hurry": {
                    "label": "High Hurry",
                    "choice_counts": {"HELP": 4, "IGNORE": 6},
                    "errors": 0,
                    "unknown": 0,
                    "rows_total": 10,
                },
            },
        },
    )

    # Weaker duplicate run (should be ignored by best-run selector)
    _write_json(
        decision_dir / "samarian_time_pressure_openai_gpt-5.2_run_bad.summary.json",
        {
            "run_id": "run_bad",
            "scenario_key": "samarian_time_pressure",
            "scenario_title": "Samarian Time Pressure (HELP/IGNORE)",
            "provider": "openai",
            "model": "gpt-5.2",
            "rows_total": 3,
            "errors": 0,
            "unknown": 0,
            "choices": ["HELP", "IGNORE"],
            "choice_counts": {"HELP": 1, "IGNORE": 2},
            "condition_breakdown": {},
        },
    )

    _write_json(
        safety_vln_dir / "safety_vln_openai_gpt-5.2_run_svln.summary.json",
        {
            "run_id": "run_svln",
            "dataset_name": "synthetic-v1",
            "provider": "openai",
            "model": "gpt-5.2",
            "judge_mode": "rule",
            "judge_provider": "",
            "judge_model": "",
            "rows_total": 40,
            "overall": {
                "n_trials": 40,
                "stage1_pass_count": 38,
                "stage2_pass_count": 35,
                "stage3_scored_count": 30,
                "stage3_correct_count": 24,
                "stage1_pass_rate": 0.95,
                "stage2_pass_rate": 0.875,
                "stage3_scored_rate": 0.75,
                "stage3_accuracy": 0.8,
                "score_mean": 0.72,
                "human_alignment_mean": 0.68,
            },
            "general_non_event": {
                "stage3_scored_count": 15,
                "stage3_correct_count": 13,
            },
            "safety_event": {
                "stage3_scored_count": 15,
                "stage3_correct_count": 11,
            },
            "by_sequence_direction": {
                "ltr": {"stage3_scored_count": 15, "stage3_correct_count": 13, "score_mean": 0.75},
                "rtl": {"stage3_scored_count": 15, "stage3_correct_count": 11, "score_mean": 0.69},
            },
            "by_time_interval_bucket": {
                "low": {"stage3_scored_count": 10, "stage3_correct_count": 9, "score_mean": 0.77},
                "high": {"stage3_scored_count": 10, "stage3_correct_count": 7, "score_mean": 0.64},
            },
            "by_risk_level": {
                "low": {"stage3_scored_count": 10, "stage3_correct_count": 9, "score_mean": 0.78},
                "high": {"stage3_scored_count": 10, "stage3_correct_count": 7, "score_mean": 0.63},
            },
            "core_scores": {
                "general_score": 0.76,
                "safety_event_score": 0.68,
                "gap_general_minus_event": 0.08,
            },
            "fairness_metrics": {
                "ltr_minus_rtl_score_gap": 0.06,
                "demographic_max_minus_min_score_gap": 0.07,
                "demographic_max_minus_min_human_alignment_gap": 0.05,
            },
            "robustness_metrics": {
                "high_minus_low_time_interval_gap": -0.13,
                "high_minus_low_risk_gap": -0.15,
            },
        },
    )

    _write_json(
        sequence_dir / "openai_gpt_4_1_masking.json",
        {
            "provider": "openai",
            "model": "gpt-4.1",
            "task": "masking",
            "total_images": 2,
            "items": [
                {"image_name": "a.png", "output": "ok", "error": None},
                {"image_name": "b.png", "output": "", "error": "401"},
            ],
        },
    )

    _write_json(
        maze_maps_dir / "5.json",
        [
            {"stats": {"path_length": 9, "num_walls": 6, "num_route": 8}},
            {"stats": {"path_length": 11, "num_walls": 7, "num_route": 9}},
        ],
    )

    out_dir = outputs_dir / "submission_package"
    result = build_submission_package(
        engine_root=engine_root,
        outputs_dir=outputs_dir,
        out_dir=out_dir,
    )

    assert result.manifest_path.exists()
    assert result.decision_main_table_path.exists()
    assert result.decision_stats_table_path.exists()
    assert result.decision_ablation_table_path.exists()
    assert result.safety_vln_main_table_path.exists()
    assert result.safety_vln_axis_table_path.exists()
    assert result.safety_vln_stats_table_path.exists()
    assert result.sequence_main_table_path.exists()
    assert result.maze_main_table_path.exists()
    assert result.paper_main_table_path.exists()
    assert result.release_doc_path.exists()
    assert result.implementation_report_path.exists()

    decision_main_rows = _read_csv(result.decision_main_table_path)
    assert len(decision_main_rows) == 1
    assert decision_main_rows[0]["run_id"] == "run_good"
    assert decision_main_rows[0]["help_rate"] == "0.6"

    pairwise_rows = _read_csv(result.decision_stats_table_path)
    assert len(pairwise_rows) == 3

    ablation_rows = _read_csv(result.decision_ablation_table_path)
    baseline_rows = [row for row in ablation_rows if row["is_baseline"] == "1"]
    assert len(baseline_rows) == 1
    assert "low" in baseline_rows[0]["condition_key"].lower()

    safety_rows = _read_csv(result.safety_vln_main_table_path)
    assert len(safety_rows) == 1
    assert safety_rows[0]["dataset_name"] == "synthetic-v1"
    assert safety_rows[0]["general_score"] == "0.76"

    safety_stats_rows = _read_csv(result.safety_vln_stats_table_path)
    assert len(safety_stats_rows) >= 1
    assert any(row["group_a"] == "general_non_event" for row in safety_stats_rows)

    sequence_rows = _read_csv(result.sequence_main_table_path)
    assert len(sequence_rows) == 1
    assert sequence_rows[0]["error_count"] == "1"

    maze_rows = _read_csv(result.maze_main_table_path)
    assert len(maze_rows) == 1
    assert maze_rows[0]["size"] == "5"

    paper_rows = _read_csv(result.paper_main_table_path)
    assert any(row["section"] == "decision" for row in paper_rows)
    assert any(row["section"] == "safety_vln" for row in paper_rows)
    assert any(row["section"] == "sequence" for row in paper_rows)
    assert any(row["section"] == "maze" for row in paper_rows)
