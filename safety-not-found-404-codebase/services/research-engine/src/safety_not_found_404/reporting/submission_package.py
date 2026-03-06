from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev
from typing import Any, Dict, Iterable, List, Sequence

from safety_not_found_404.decision_experiments.scenarios.registry import (
    available_scenarios,
    build_scenario,
)
from safety_not_found_404.reporting.stats import (
    benjamini_hochberg,
    two_proportion_z_test,
    wilson_interval,
)


@dataclass(frozen=True)
class SubmissionPackageResult:
    out_dir: Path
    manifest_path: Path
    decision_main_table_path: Path
    decision_condition_table_path: Path
    decision_stats_table_path: Path
    decision_ablation_table_path: Path
    safety_vln_main_table_path: Path
    safety_vln_axis_table_path: Path
    safety_vln_stats_table_path: Path
    sequence_main_table_path: Path
    maze_main_table_path: Path
    paper_main_table_path: Path
    release_doc_path: Path
    implementation_report_path: Path


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _safe_div(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _load_json(path: Path) -> Dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def _write_csv(path: Path, rows: List[Dict[str, Any]], fieldnames: Sequence[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _extract_help_choice_map() -> Dict[str, tuple[str, ...]]:
    help_choices: Dict[str, tuple[str, ...]] = {}
    for scenario_key in available_scenarios():
        try:
            scenario = build_scenario(scenario_key=scenario_key, case_count=8, seed=0)
        except Exception:
            continue
        help_choices[scenario_key] = tuple(choice.upper() for choice in scenario.help_choices)
    return help_choices


def _scan_decision_summaries(outputs_dir: Path) -> List[Dict[str, Any]]:
    summaries: List[Dict[str, Any]] = []
    for path in sorted(outputs_dir.rglob("*.summary.json")):
        if "submission_package" in path.parts:
            continue

        payload = _load_json(path)
        if not payload:
            continue

        required = {"scenario_key", "provider", "model", "rows_total", "errors", "unknown", "choices"}
        if not required.issubset(payload.keys()):
            continue

        payload["_source_path"] = str(path)
        payload["_source_mtime"] = path.stat().st_mtime
        summaries.append(payload)

    return summaries


def _scan_safety_vln_summaries(outputs_dir: Path) -> List[Dict[str, Any]]:
    summaries: List[Dict[str, Any]] = []
    for path in sorted(outputs_dir.rglob("*.summary.json")):
        if "submission_package" in path.parts:
            continue

        payload = _load_json(path)
        if not payload:
            continue

        required = {"dataset_name", "provider", "model", "rows_total", "overall", "core_scores"}
        if not required.issubset(payload.keys()):
            continue

        payload["_source_path"] = str(path)
        payload["_source_mtime"] = path.stat().st_mtime
        summaries.append(payload)

    return summaries


def _pick_best_runs(summaries: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best_by_key: Dict[tuple[str, str, str], Dict[str, Any]] = {}

    for summary in summaries:
        key = (
            str(summary.get("scenario_key", "")),
            str(summary.get("provider", "")),
            str(summary.get("model", "")),
        )

        rows_total = _to_int(summary.get("rows_total"))
        errors = _to_int(summary.get("errors"))
        unknown = _to_int(summary.get("unknown"))
        valid_rows = max(0, rows_total - errors - unknown)
        score = (valid_rows, rows_total, -errors, -unknown, _to_float(summary.get("_source_mtime")))

        previous = best_by_key.get(key)
        if previous is None:
            best_by_key[key] = dict(summary)
            best_by_key[key]["_score"] = score
            continue

        previous_score = previous.get("_score", (0, 0, 0, 0, 0.0))
        if score > previous_score:
            best_by_key[key] = dict(summary)
            best_by_key[key]["_score"] = score

    selected = list(best_by_key.values())
    selected.sort(key=lambda row: (row.get("scenario_key", ""), row.get("provider", ""), row.get("model", "")))
    return selected


def _pick_best_safety_vln_runs(summaries: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best_by_key: Dict[tuple[str, str, str, str, str, str], Dict[str, Any]] = {}

    for summary in summaries:
        key = (
            str(summary.get("dataset_name", "")),
            str(summary.get("provider", "")),
            str(summary.get("model", "")),
            str(summary.get("judge_mode", "")),
            str(summary.get("judge_provider", "")),
            str(summary.get("judge_model", "")),
        )

        rows_total = _to_int(summary.get("rows_total"))
        overall = summary.get("overall") or {}
        if not isinstance(overall, dict):
            overall = {}
        stage3_scored = _to_int(overall.get("stage3_scored_count"))
        score = (rows_total, stage3_scored, _to_float(summary.get("_source_mtime")))

        previous = best_by_key.get(key)
        if previous is None:
            best_by_key[key] = dict(summary)
            best_by_key[key]["_score"] = score
            continue

        previous_score = previous.get("_score", (0, 0, 0.0))
        if score > previous_score:
            best_by_key[key] = dict(summary)
            best_by_key[key]["_score"] = score

    selected = list(best_by_key.values())
    selected.sort(
        key=lambda row: (
            row.get("dataset_name", ""),
            row.get("provider", ""),
            row.get("model", ""),
            row.get("judge_mode", ""),
        )
    )
    return selected


def _extract_stage3_counts(group: Any) -> tuple[int, int]:
    if not isinstance(group, dict):
        return (0, 0)
    scored = _to_int(group.get("stage3_scored_count"))
    correct = _to_int(group.get("stage3_correct_count"))
    return (scored, correct)


def _build_safety_vln_tables(
    selected_summaries: List[Dict[str, Any]],
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    main_rows: List[Dict[str, Any]] = []
    axis_rows: List[Dict[str, Any]] = []
    stats_rows: List[Dict[str, Any]] = []

    for summary in selected_summaries:
        dataset_name = str(summary.get("dataset_name", ""))
        provider = str(summary.get("provider", ""))
        model = str(summary.get("model", ""))
        run_id = str(summary.get("run_id", ""))
        judge_mode = str(summary.get("judge_mode", ""))
        judge_provider = str(summary.get("judge_provider", ""))
        judge_model = str(summary.get("judge_model", ""))

        overall = summary.get("overall") or {}
        core = summary.get("core_scores") or {}
        disparity = summary.get("disparity_metrics") or {}
        if not isinstance(overall, dict):
            overall = {}
        if not isinstance(core, dict):
            core = {}
        if not isinstance(disparity, dict):
            disparity = {}

        main_rows.append(
            {
                "dataset_name": dataset_name,
                "provider": provider,
                "model": model,
                "judge_mode": judge_mode,
                "judge_provider": judge_provider,
                "judge_model": judge_model,
                "run_id": run_id,
                "rows_total": _to_int(summary.get("rows_total")),
                "n_trials": _to_int(overall.get("n_trials")),
                "stage1_pass_rate": round(_to_float(overall.get("stage1_pass_rate")), 6),
                "stage2_pass_rate": round(_to_float(overall.get("stage2_pass_rate")), 6),
                "stage3_scored_rate": round(_to_float(overall.get("stage3_scored_rate")), 6),
                "stage3_accuracy": round(_to_float(overall.get("stage3_accuracy")), 6),
                "score_mean": round(_to_float(overall.get("score_mean")), 6),
                "human_alignment_mean": round(_to_float(overall.get("human_alignment_mean")), 6),
                "general_score": round(_to_float(core.get("general_score")), 6),
                "safety_event_score": round(_to_float(core.get("safety_event_score")), 6),
                "gap_general_minus_event": round(_to_float(core.get("gap_general_minus_event")), 6),
                "ltr_minus_rtl_score_gap": round(_to_float(disparity.get("ltr_minus_rtl_score_gap")), 6),
                "high_minus_low_time_interval_gap": round(
                    _to_float(disparity.get("high_minus_low_time_interval_gap")), 6
                ),
                "high_minus_low_risk_gap": round(_to_float(disparity.get("high_minus_low_risk_gap")), 6),
                "demographic_max_minus_min_score_gap": round(
                    _to_float(disparity.get("demographic_max_minus_min_score_gap")), 6
                ),
                "demographic_max_minus_min_human_alignment_gap": round(
                    _to_float(disparity.get("demographic_max_minus_min_human_alignment_gap")), 6
                ),
                "source_summary": str(summary.get("_source_path", "")),
            }
        )

        axis_map = {
            "track": summary.get("by_track"),
            "risk_level": summary.get("by_risk_level"),
            "sequence_direction": summary.get("by_sequence_direction"),
            "time_interval_bucket": summary.get("by_time_interval_bucket"),
            "demographic_group": summary.get("by_demographic_group"),
            "safety_dimension": summary.get("by_safety_dimension"),
        }

        for axis_name, axis_bucket in axis_map.items():
            if not isinstance(axis_bucket, dict):
                continue
            for axis_value, metrics in sorted(axis_bucket.items()):
                if not isinstance(metrics, dict):
                    continue
                axis_rows.append(
                    {
                        "dataset_name": dataset_name,
                        "provider": provider,
                        "model": model,
                        "judge_mode": judge_mode,
                        "run_id": run_id,
                        "axis_name": axis_name,
                        "axis_value": str(axis_value),
                        "n_trials": _to_int(metrics.get("n_trials")),
                        "stage1_pass_rate": round(_to_float(metrics.get("stage1_pass_rate")), 6),
                        "stage2_pass_rate": round(_to_float(metrics.get("stage2_pass_rate")), 6),
                        "stage3_accuracy": round(_to_float(metrics.get("stage3_accuracy")), 6),
                        "score_mean": round(_to_float(metrics.get("score_mean")), 6),
                        "human_alignment_mean": round(_to_float(metrics.get("human_alignment_mean")), 6),
                    }
                )

        comparison_rows: List[Dict[str, Any]] = []
        p_values: List[float] = []

        def _append_comparison(label_a: str, group_a: Any, label_b: str, group_b: Any) -> None:
            n_a, x_a = _extract_stage3_counts(group_a)
            n_b, x_b = _extract_stage3_counts(group_b)
            if n_a <= 0 or n_b <= 0:
                return

            result = two_proportion_z_test(x1=x_a, n1=n_a, x2=x_b, n2=n_b)
            p_values.append(result.p_value)
            comparison_rows.append(
                {
                    "dataset_name": dataset_name,
                    "provider": provider,
                    "model": model,
                    "judge_mode": judge_mode,
                    "run_id": run_id,
                    "group_a": label_a,
                    "group_b": label_b,
                    "n_a": n_a,
                    "correct_a": x_a,
                    "acc_a": round(result.p1, 6),
                    "n_b": n_b,
                    "correct_b": x_b,
                    "acc_b": round(result.p2, 6),
                    "delta_accuracy": round(result.diff, 6),
                    "delta_ci95_low": round(result.ci95_low, 6),
                    "delta_ci95_high": round(result.ci95_high, 6),
                    "z_score": round(result.z_score, 6),
                    "p_value": round(result.p_value, 8),
                }
            )

        _append_comparison(
            "general_non_event",
            summary.get("general_non_event"),
            "safety_event",
            summary.get("safety_event"),
        )

        by_direction = summary.get("by_sequence_direction") or {}
        by_interval = summary.get("by_time_interval_bucket") or {}
        by_risk = summary.get("by_risk_level") or {}
        if isinstance(by_direction, dict):
            _append_comparison("sequence_ltr", by_direction.get("ltr"), "sequence_rtl", by_direction.get("rtl"))
        if isinstance(by_interval, dict):
            _append_comparison("interval_high", by_interval.get("high"), "interval_low", by_interval.get("low"))
        if isinstance(by_risk, dict):
            _append_comparison("risk_high", by_risk.get("high"), "risk_low", by_risk.get("low"))

        adjusted = benjamini_hochberg(p_values)
        for row, q_value in zip(comparison_rows, adjusted):
            row["q_value_bh"] = round(q_value, 8)
            row["significant_0_05"] = int(q_value < 0.05)

        stats_rows.extend(comparison_rows)

    main_rows.sort(key=lambda row: (row["dataset_name"], row["provider"], row["model"], row["judge_mode"]))
    axis_rows.sort(
        key=lambda row: (
            row["dataset_name"],
            row["provider"],
            row["model"],
            row["judge_mode"],
            row["axis_name"],
            row["axis_value"],
        )
    )
    stats_rows.sort(
        key=lambda row: (
            row["dataset_name"],
            row["provider"],
            row["model"],
            row["judge_mode"],
            row["group_a"],
            row["group_b"],
        )
    )
    return main_rows, axis_rows, stats_rows


def _help_count(choice_counts: Dict[str, Any], help_choices: Sequence[str]) -> int:
    if not help_choices:
        return 0
    total = 0
    for choice in help_choices:
        total += _to_int(choice_counts.get(choice))
    return total


def _build_decision_rows(
    selected_summaries: List[Dict[str, Any]],
    help_choice_map: Dict[str, tuple[str, ...]],
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    main_rows: List[Dict[str, Any]] = []
    condition_rows: List[Dict[str, Any]] = []

    for summary in selected_summaries:
        scenario_key = str(summary.get("scenario_key", ""))
        provider = str(summary.get("provider", ""))
        model = str(summary.get("model", ""))

        rows_total = _to_int(summary.get("rows_total"))
        errors = _to_int(summary.get("errors"))
        unknown = _to_int(summary.get("unknown"))
        valid_rows = max(0, rows_total - errors - unknown)

        choices = [str(choice).upper() for choice in summary.get("choices", [])]
        choice_counts = {str(key).upper(): _to_int(value) for key, value in (summary.get("choice_counts") or {}).items()}
        dominant_choice = ""
        if choices:
            dominant_choice = max(choices, key=lambda choice: choice_counts.get(choice, 0))

        help_choices = help_choice_map.get(scenario_key, tuple())
        help_count = _help_count(choice_counts, help_choices)
        help_rate = _safe_div(help_count, valid_rows)
        ci_low, ci_high = wilson_interval(help_count, valid_rows)

        main_rows.append(
            {
                "scenario_key": scenario_key,
                "scenario_title": str(summary.get("scenario_title", "")),
                "provider": provider,
                "model": model,
                "run_id": str(summary.get("run_id", "")),
                "rows_total": rows_total,
                "valid_rows": valid_rows,
                "errors": errors,
                "unknown": unknown,
                "valid_rate": round(_safe_div(valid_rows, rows_total), 6),
                "help_choices": ",".join(help_choices),
                "help_count": help_count,
                "help_rate": round(help_rate, 6),
                "help_rate_ci95_low": round(ci_low, 6),
                "help_rate_ci95_high": round(ci_high, 6),
                "dominant_choice": dominant_choice,
                "choice_counts_json": json.dumps(choice_counts, ensure_ascii=False, sort_keys=True),
                "source_summary": str(summary.get("_source_path", "")),
            }
        )

        for condition_key, condition_value in sorted((summary.get("condition_breakdown") or {}).items()):
            if not isinstance(condition_value, dict):
                continue

            condition_choice_counts = {
                str(key).upper(): _to_int(value)
                for key, value in (condition_value.get("choice_counts") or {}).items()
            }
            condition_rows_total = _to_int(condition_value.get("rows_total"))
            condition_errors = _to_int(condition_value.get("errors"))
            condition_unknown = _to_int(condition_value.get("unknown"))
            condition_valid_rows = max(0, condition_rows_total - condition_errors - condition_unknown)
            condition_help_count = _help_count(condition_choice_counts, help_choices)
            condition_help_rate = _safe_div(condition_help_count, condition_valid_rows)
            c_low, c_high = wilson_interval(condition_help_count, condition_valid_rows)

            condition_rows.append(
                {
                    "scenario_key": scenario_key,
                    "provider": provider,
                    "model": model,
                    "run_id": str(summary.get("run_id", "")),
                    "condition_key": str(condition_key),
                    "condition_label": str(condition_value.get("label", "")),
                    "rows_total": condition_rows_total,
                    "valid_rows": condition_valid_rows,
                    "errors": condition_errors,
                    "unknown": condition_unknown,
                    "help_choices": ",".join(help_choices),
                    "help_count": condition_help_count,
                    "help_rate": round(condition_help_rate, 6),
                    "help_rate_ci95_low": round(c_low, 6),
                    "help_rate_ci95_high": round(c_high, 6),
                    "choice_counts_json": json.dumps(condition_choice_counts, ensure_ascii=False, sort_keys=True),
                }
            )

    return main_rows, condition_rows


def _build_pairwise_stats(condition_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[tuple[str, str, str], List[Dict[str, Any]]] = {}

    for row in condition_rows:
        help_choices = str(row.get("help_choices", ""))
        if not help_choices:
            continue
        if _to_int(row.get("valid_rows")) <= 0:
            continue

        key = (str(row["scenario_key"]), str(row["provider"]), str(row["model"]))
        grouped.setdefault(key, []).append(row)

    all_rows: List[Dict[str, Any]] = []

    for key, rows in grouped.items():
        scenario_key, provider, model = key
        if len(rows) < 2:
            continue

        pair_rows: List[Dict[str, Any]] = []
        p_values: List[float] = []

        ordered = sorted(rows, key=lambda item: str(item.get("condition_key", "")))

        for i in range(len(ordered)):
            for j in range(i + 1, len(ordered)):
                left = ordered[i]
                right = ordered[j]

                x1 = _to_int(left.get("help_count"))
                n1 = _to_int(left.get("valid_rows"))
                x2 = _to_int(right.get("help_count"))
                n2 = _to_int(right.get("valid_rows"))

                result = two_proportion_z_test(x1=x1, n1=n1, x2=x2, n2=n2)
                effect_size = abs(result.diff)
                p_values.append(result.p_value)

                pair_rows.append(
                    {
                        "scenario_key": scenario_key,
                        "provider": provider,
                        "model": model,
                        "condition_a": str(left.get("condition_key", "")),
                        "condition_b": str(right.get("condition_key", "")),
                        "n_a": n1,
                        "help_a": x1,
                        "help_rate_a": round(result.p1, 6),
                        "n_b": n2,
                        "help_b": x2,
                        "help_rate_b": round(result.p2, 6),
                        "delta_help_rate": round(result.diff, 6),
                        "delta_help_rate_abs": round(effect_size, 6),
                        "delta_ci95_low": round(result.ci95_low, 6),
                        "delta_ci95_high": round(result.ci95_high, 6),
                        "z_score": round(result.z_score, 6),
                        "p_value": round(result.p_value, 8),
                    }
                )

        adjusted = benjamini_hochberg(p_values)
        for row, q_value in zip(pair_rows, adjusted):
            row["q_value_bh"] = round(q_value, 8)
            row["significant_0_05"] = int(q_value < 0.05)

        all_rows.extend(pair_rows)

    all_rows.sort(key=lambda row: (row["scenario_key"], row["provider"], row["model"], row["condition_a"], row["condition_b"]))
    return all_rows


def _baseline_rank(condition_key: str, condition_label: str) -> tuple[int, str]:
    text = f"{condition_key} {condition_label}".lower()

    if any(token in text for token in ("baseline", "control", "low", "group_a", "condition_a")):
        return (0, text)
    if any(token in text for token in ("medium", "mid", "group_b", "condition_b")):
        return (1, text)
    if any(token in text for token in ("high", "group_c", "condition_c")):
        return (2, text)
    return (3, text)


def _build_ablation_tables(condition_rows: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    grouped: Dict[tuple[str, str, str], List[Dict[str, Any]]] = {}
    for row in condition_rows:
        if _to_int(row.get("valid_rows")) <= 0:
            continue
        if not str(row.get("help_choices", "")):
            continue
        key = (str(row["scenario_key"]), str(row["provider"]), str(row["model"]))
        grouped.setdefault(key, []).append(row)

    ablation_rows: List[Dict[str, Any]] = []
    overview_rows: List[Dict[str, Any]] = []

    for (scenario_key, provider, model), rows in grouped.items():
        if not rows:
            continue

        baseline = sorted(
            rows,
            key=lambda row: _baseline_rank(str(row.get("condition_key", "")), str(row.get("condition_label", ""))),
        )[0]

        baseline_rate = _to_float(baseline.get("help_rate"))
        baseline_key = str(baseline.get("condition_key", ""))
        max_abs_delta = 0.0

        for row in sorted(rows, key=lambda item: str(item.get("condition_key", ""))):
            condition_key = str(row.get("condition_key", ""))
            condition_rate = _to_float(row.get("help_rate"))
            delta = condition_rate - baseline_rate
            max_abs_delta = max(max_abs_delta, abs(delta))

            ablation_rows.append(
                {
                    "scenario_key": scenario_key,
                    "provider": provider,
                    "model": model,
                    "baseline_condition": baseline_key,
                    "condition_key": condition_key,
                    "condition_label": str(row.get("condition_label", "")),
                    "valid_rows": _to_int(row.get("valid_rows")),
                    "help_rate": round(condition_rate, 6),
                    "delta_vs_baseline": round(delta, 6),
                    "is_baseline": int(condition_key == baseline_key),
                }
            )

        overview_rows.append(
            {
                "scenario_key": scenario_key,
                "provider": provider,
                "model": model,
                "baseline_condition": baseline_key,
                "baseline_help_rate": round(baseline_rate, 6),
                "num_conditions": len(rows),
                "max_abs_delta_vs_baseline": round(max_abs_delta, 6),
            }
        )

    ablation_rows.sort(key=lambda row: (row["scenario_key"], row["provider"], row["model"], row["condition_key"]))
    overview_rows.sort(key=lambda row: (row["scenario_key"], row["provider"], row["model"]))
    return ablation_rows, overview_rows


def _scan_sequence_reports(sequence_dir: Path) -> List[Dict[str, Any]]:
    if not sequence_dir.exists():
        return []

    rows: List[Dict[str, Any]] = []
    for path in sorted(sequence_dir.rglob("*.json")):
        payload = _load_json(path)
        if not payload:
            continue

        if not {"provider", "model", "task", "items"}.issubset(payload.keys()):
            continue

        items = payload.get("items") or []
        if not isinstance(items, list):
            continue

        total_images = _to_int(payload.get("total_images")) or len(items)
        error_count = 0
        non_empty_output_count = 0

        for item in items:
            if not isinstance(item, dict):
                continue
            error_value = item.get("error")
            if error_value is not None and str(error_value).strip():
                error_count += 1
            output_text = str(item.get("output", "")).strip()
            if output_text:
                non_empty_output_count += 1

        successful_count = max(0, total_images - error_count)

        rows.append(
            {
                "provider": str(payload.get("provider", "")),
                "model": str(payload.get("model", "")),
                "task": str(payload.get("task", "")),
                "total_images": total_images,
                "success_count": successful_count,
                "error_count": error_count,
                "non_empty_output_count": non_empty_output_count,
                "success_rate": round(_safe_div(successful_count, total_images), 6),
                "error_rate": round(_safe_div(error_count, total_images), 6),
                "output_non_empty_rate": round(_safe_div(non_empty_output_count, total_images), 6),
                "source_file": str(path),
            }
        )

    rows.sort(key=lambda row: (row["provider"], row["model"], row["task"]))
    return rows


def _collect_maze_map_files(engine_root: Path, explicit_maze_base_dir: Path | None) -> List[Path]:
    candidates: List[Path] = []

    if explicit_maze_base_dir is not None:
        candidates.append(explicit_maze_base_dir)

    candidates.extend(
        [
            engine_root / "maze_fin",
            engine_root / "legacy" / "section_2" / "maze_fin",
        ]
    )

    map_files: List[Path] = []
    seen = set()

    for candidate in candidates:
        maps_dir = candidate / "maps"
        if not maps_dir.exists():
            continue
        for path in sorted(maps_dir.glob("*.json")):
            if path in seen:
                continue
            seen.add(path)
            map_files.append(path)

    return map_files


def _build_maze_rows(engine_root: Path, explicit_maze_base_dir: Path | None) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for path in _collect_maze_map_files(engine_root, explicit_maze_base_dir):
        try:
            maps = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(maps, list):
            continue

        size_token = path.stem
        size = _to_int(size_token)
        path_lengths: List[float] = []
        wall_counts: List[float] = []
        route_counts: List[float] = []

        for maze in maps:
            if not isinstance(maze, dict):
                continue
            stats = maze.get("stats") or {}
            if not isinstance(stats, dict):
                continue
            path_lengths.append(_to_float(stats.get("path_length")))
            wall_counts.append(_to_float(stats.get("num_walls")))
            route_counts.append(_to_float(stats.get("num_route")))

        map_count = len(path_lengths)
        if map_count <= 0:
            continue

        rows.append(
            {
                "size": size,
                "map_count": map_count,
                "path_length_mean": round(mean(path_lengths), 6),
                "path_length_std": round(pstdev(path_lengths) if map_count > 1 else 0.0, 6),
                "num_walls_mean": round(mean(wall_counts), 6),
                "num_walls_std": round(pstdev(wall_counts) if map_count > 1 else 0.0, 6),
                "num_route_mean": round(mean(route_counts), 6),
                "num_route_std": round(pstdev(route_counts) if map_count > 1 else 0.0, 6),
                "source_file": str(path),
            }
        )

    rows.sort(key=lambda row: row["size"])
    return rows


def _build_paper_main_table(
    decision_rows: List[Dict[str, Any]],
    safety_vln_rows: List[Dict[str, Any]],
    sequence_rows: List[Dict[str, Any]],
    maze_rows: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for row in decision_rows:
        rows.append(
            {
                "section": "decision",
                "entity": f"{row['scenario_key']}|{row['provider']}|{row['model']}",
                "metric": "help_rate",
                "value": row.get("help_rate", 0.0),
                "meta": json.dumps(
                    {
                        "valid_rows": row.get("valid_rows", 0),
                        "run_id": row.get("run_id", ""),
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                ),
            }
        )
        rows.append(
            {
                "section": "decision",
                "entity": f"{row['scenario_key']}|{row['provider']}|{row['model']}",
                "metric": "valid_rate",
                "value": row.get("valid_rate", 0.0),
                "meta": json.dumps(
                    {
                        "rows_total": row.get("rows_total", 0),
                        "errors": row.get("errors", 0),
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                ),
            }
        )

    for row in safety_vln_rows:
        entity = f"{row['dataset_name']}|{row['provider']}|{row['model']}"
        metric_values = {
            "general_score": row.get("general_score", 0.0),
            "safety_event_score": row.get("safety_event_score", 0.0),
            "gap_general_minus_event": row.get("gap_general_minus_event", 0.0),
            "stage3_accuracy": row.get("stage3_accuracy", 0.0),
            "human_alignment_mean": row.get("human_alignment_mean", 0.0),
        }
        for metric_name, metric_value in metric_values.items():
            rows.append(
                {
                    "section": "safety_vln",
                    "entity": entity,
                    "metric": metric_name,
                    "value": metric_value,
                    "meta": json.dumps(
                        {
                            "run_id": row.get("run_id", ""),
                            "judge_mode": row.get("judge_mode", ""),
                        },
                        ensure_ascii=False,
                        sort_keys=True,
                    ),
                }
            )

    for row in sequence_rows:
        rows.append(
            {
                "section": "sequence",
                "entity": f"{row['provider']}|{row['model']}|{row['task']}",
                "metric": "success_rate",
                "value": row.get("success_rate", 0.0),
                "meta": json.dumps({"total_images": row.get("total_images", 0)}, ensure_ascii=False, sort_keys=True),
            }
        )

    for row in maze_rows:
        rows.append(
            {
                "section": "maze",
                "entity": f"size={row['size']}",
                "metric": "path_length_mean",
                "value": row.get("path_length_mean", 0.0),
                "meta": json.dumps({"map_count": row.get("map_count", 0)}, ensure_ascii=False, sort_keys=True),
            }
        )

    rows.sort(key=lambda item: (item["section"], item["entity"], item["metric"]))
    return rows


def _build_release_markdown(
    *,
    generated_at: str,
    decision_rows: List[Dict[str, Any]],
    pairwise_rows: List[Dict[str, Any]],
    ablation_overview_rows: List[Dict[str, Any]],
    safety_vln_main_rows: List[Dict[str, Any]],
    safety_vln_stats_rows: List[Dict[str, Any]],
    sequence_rows: List[Dict[str, Any]],
    maze_rows: List[Dict[str, Any]],
    out_dir: Path,
) -> str:
    lines: List[str] = []

    lines.append("# Submission Release Checklist")
    lines.append("")
    lines.append(f"Generated at (UTC): {generated_at}")
    lines.append("")
    lines.append("## Coverage")
    lines.append(f"- Decision runs selected: {len(decision_rows)}")
    lines.append(f"- Decision pairwise tests: {len(pairwise_rows)}")
    lines.append(f"- Decision ablation groups: {len(ablation_overview_rows)}")
    lines.append(f"- Safety-VLN runs selected: {len(safety_vln_main_rows)}")
    lines.append(f"- Safety-VLN statistical comparisons: {len(safety_vln_stats_rows)}")
    lines.append(f"- Sequence reports: {len(sequence_rows)}")
    lines.append(f"- Maze size summaries: {len(maze_rows)}")
    lines.append("")

    lines.append("## Artifact Paths")
    lines.append(f"- Tables: `{out_dir / 'tables'}`")
    lines.append(f"- Docs: `{out_dir / 'docs'}`")
    lines.append(f"- Manifest: `{out_dir / 'manifest.json'}`")
    lines.append("")

    lines.append("## Required Pre-Submission Checks")
    lines.append("- Confirm every row in `decision_main_table.csv` has expected `run_id` and model names.")
    lines.append("- Verify statistical claims use `decision_stats_pairwise.csv` with BH-corrected `q_value_bh`.")
    lines.append("- Verify ablation claims use `decision_ablation.csv` (delta vs baseline).")
    lines.append("- Verify Safety-VLN claims use `safety_vln_main_table.csv` and `safety_vln_stats.csv`.")
    lines.append("- Verify sequence and maze tables match the exact data version used in paper figures.")
    lines.append("- Freeze this package directory and attach commit hash in paper appendix.")
    lines.append("")

    lines.append("## Rebuild Command")
    lines.append("```bash")
    lines.append("python scripts/build_submission_package.py")
    lines.append("```")

    return "\n".join(lines).strip() + "\n"


def _build_implementation_report_markdown(
    *,
    generated_at: str,
    decision_rows: List[Dict[str, Any]],
    pairwise_rows: List[Dict[str, Any]],
    ablation_rows: List[Dict[str, Any]],
    safety_vln_main_rows: List[Dict[str, Any]],
    safety_vln_axis_rows: List[Dict[str, Any]],
    safety_vln_stats_rows: List[Dict[str, Any]],
    sequence_rows: List[Dict[str, Any]],
    maze_rows: List[Dict[str, Any]],
) -> str:
    lines: List[str] = []

    lines.append("# Research Engineering Report")
    lines.append("")
    lines.append(f"Generated at (UTC): {generated_at}")
    lines.append("")

    lines.append("## Goal")
    lines.append(
        "Build a submission-grade analysis pipeline that converts raw experiment outputs into reproducible paper artifacts: "
        "main tables, statistical tests, ablation tables, release checklist, and a machine-readable manifest."
    )
    lines.append("")

    lines.append("## What Was Implemented")
    lines.append("1. Decision summary collector with best-run selection per scenario/provider/model.")
    lines.append("2. Unified decision main table with validity, help-rate, and confidence intervals.")
    lines.append("3. Condition-level table plus pairwise two-proportion z-tests with BH correction.")
    lines.append("4. Baseline-relative ablation tables for condition deltas.")
    lines.append("5. Safety-VLN main/axis/statistics tables for stage-gating and disparity analysis.")
    lines.append("6. Sequence and maze summary tables from native output files.")
    lines.append("7. Combined paper main table for cross-section metric loading.")
    lines.append("8. Release checklist and manifest for reproducibility handoff.")
    lines.append("")

    lines.append("## Pipeline Structure")
    lines.append("- Input: `outputs/**/*.summary.json`, `outputs/sequence/*.json`, and maze `maps/*.json` files.")
    lines.append("- Core module: `src/safety_not_found_404/reporting/submission_package.py`.")
    lines.append("- Stats module: `src/safety_not_found_404/reporting/stats.py`.")
    lines.append("- Entry point: `scripts/build_submission_package.py`.")
    lines.append("- Output: `outputs/submission_package/` with `tables/`, `docs/`, and `manifest.json`.")
    lines.append("")

    lines.append("## Current Build Snapshot")
    lines.append(f"- Decision main rows: {len(decision_rows)}")
    lines.append(f"- Decision pairwise tests: {len(pairwise_rows)}")
    lines.append(f"- Decision ablation rows: {len(ablation_rows)}")
    lines.append(f"- Safety-VLN main rows: {len(safety_vln_main_rows)}")
    lines.append(f"- Safety-VLN axis rows: {len(safety_vln_axis_rows)}")
    lines.append(f"- Safety-VLN stats rows: {len(safety_vln_stats_rows)}")
    lines.append(f"- Sequence rows: {len(sequence_rows)}")
    lines.append(f"- Maze rows: {len(maze_rows)}")
    lines.append("")

    lines.append("## How To Use In Paper Writing")
    lines.append("1. Pull effect claims only from `decision_stats_pairwise.csv` (`q_value_bh < 0.05`).")
    lines.append("2. Pull robustness claims from `decision_ablation.csv` and `decision_ablation_overview.csv`.")
    lines.append("3. Pull Safety-VLN gap/disparity claims from `safety_vln_main_table.csv` and `safety_vln_stats.csv`.")
    lines.append("4. Use `paper_main_table.csv` as the source for figure/table scripts.")
    lines.append("5. Keep `manifest.json` with the camera-ready artifact bundle.")

    return "\n".join(lines).strip() + "\n"


def build_submission_package(
    *,
    engine_root: Path,
    outputs_dir: Path,
    out_dir: Path,
    sequence_dir: Path | None = None,
    maze_base_dir: Path | None = None,
) -> SubmissionPackageResult:
    tables_dir = _ensure_dir(out_dir / "tables")
    docs_dir = _ensure_dir(out_dir / "docs")

    help_choice_map = _extract_help_choice_map()
    summaries = _scan_decision_summaries(outputs_dir=outputs_dir)
    selected_summaries = _pick_best_runs(summaries)
    decision_rows, condition_rows = _build_decision_rows(selected_summaries, help_choice_map)
    pairwise_rows = _build_pairwise_stats(condition_rows)
    ablation_rows, ablation_overview_rows = _build_ablation_tables(condition_rows)

    safety_vln_summaries = _scan_safety_vln_summaries(outputs_dir=outputs_dir)
    selected_safety_vln_summaries = _pick_best_safety_vln_runs(safety_vln_summaries)
    safety_vln_main_rows, safety_vln_axis_rows, safety_vln_stats_rows = _build_safety_vln_tables(
        selected_safety_vln_summaries
    )

    effective_sequence_dir = sequence_dir or (outputs_dir / "sequence")
    sequence_rows = _scan_sequence_reports(effective_sequence_dir)
    maze_rows = _build_maze_rows(engine_root=engine_root, explicit_maze_base_dir=maze_base_dir)
    paper_rows = _build_paper_main_table(decision_rows, safety_vln_main_rows, sequence_rows, maze_rows)

    decision_main_table_path = tables_dir / "decision_main_table.csv"
    decision_condition_table_path = tables_dir / "decision_condition_table.csv"
    decision_stats_table_path = tables_dir / "decision_stats_pairwise.csv"
    decision_ablation_table_path = tables_dir / "decision_ablation.csv"
    decision_ablation_overview_table_path = tables_dir / "decision_ablation_overview.csv"
    safety_vln_main_table_path = tables_dir / "safety_vln_main_table.csv"
    safety_vln_axis_table_path = tables_dir / "safety_vln_axis_table.csv"
    safety_vln_stats_table_path = tables_dir / "safety_vln_stats.csv"
    sequence_main_table_path = tables_dir / "sequence_main_table.csv"
    maze_main_table_path = tables_dir / "maze_main_table.csv"
    paper_main_table_path = tables_dir / "paper_main_table.csv"

    _write_csv(
        decision_main_table_path,
        decision_rows,
        fieldnames=[
            "scenario_key",
            "scenario_title",
            "provider",
            "model",
            "run_id",
            "rows_total",
            "valid_rows",
            "errors",
            "unknown",
            "valid_rate",
            "help_choices",
            "help_count",
            "help_rate",
            "help_rate_ci95_low",
            "help_rate_ci95_high",
            "dominant_choice",
            "choice_counts_json",
            "source_summary",
        ],
    )

    _write_csv(
        decision_condition_table_path,
        condition_rows,
        fieldnames=[
            "scenario_key",
            "provider",
            "model",
            "run_id",
            "condition_key",
            "condition_label",
            "rows_total",
            "valid_rows",
            "errors",
            "unknown",
            "help_choices",
            "help_count",
            "help_rate",
            "help_rate_ci95_low",
            "help_rate_ci95_high",
            "choice_counts_json",
        ],
    )

    _write_csv(
        decision_stats_table_path,
        pairwise_rows,
        fieldnames=[
            "scenario_key",
            "provider",
            "model",
            "condition_a",
            "condition_b",
            "n_a",
            "help_a",
            "help_rate_a",
            "n_b",
            "help_b",
            "help_rate_b",
            "delta_help_rate",
            "delta_help_rate_abs",
            "delta_ci95_low",
            "delta_ci95_high",
            "z_score",
            "p_value",
            "q_value_bh",
            "significant_0_05",
        ],
    )

    _write_csv(
        decision_ablation_table_path,
        ablation_rows,
        fieldnames=[
            "scenario_key",
            "provider",
            "model",
            "baseline_condition",
            "condition_key",
            "condition_label",
            "valid_rows",
            "help_rate",
            "delta_vs_baseline",
            "is_baseline",
        ],
    )

    _write_csv(
        decision_ablation_overview_table_path,
        ablation_overview_rows,
        fieldnames=[
            "scenario_key",
            "provider",
            "model",
            "baseline_condition",
            "baseline_help_rate",
            "num_conditions",
            "max_abs_delta_vs_baseline",
        ],
    )

    _write_csv(
        safety_vln_main_table_path,
        safety_vln_main_rows,
        fieldnames=[
            "dataset_name",
            "provider",
            "model",
            "judge_mode",
            "judge_provider",
            "judge_model",
            "run_id",
            "rows_total",
            "n_trials",
            "stage1_pass_rate",
            "stage2_pass_rate",
            "stage3_scored_rate",
            "stage3_accuracy",
            "score_mean",
            "human_alignment_mean",
            "general_score",
            "safety_event_score",
            "gap_general_minus_event",
            "ltr_minus_rtl_score_gap",
            "high_minus_low_time_interval_gap",
            "high_minus_low_risk_gap",
            "demographic_max_minus_min_score_gap",
            "demographic_max_minus_min_human_alignment_gap",
            "source_summary",
        ],
    )

    _write_csv(
        safety_vln_axis_table_path,
        safety_vln_axis_rows,
        fieldnames=[
            "dataset_name",
            "provider",
            "model",
            "judge_mode",
            "run_id",
            "axis_name",
            "axis_value",
            "n_trials",
            "stage1_pass_rate",
            "stage2_pass_rate",
            "stage3_accuracy",
            "score_mean",
            "human_alignment_mean",
        ],
    )

    _write_csv(
        safety_vln_stats_table_path,
        safety_vln_stats_rows,
        fieldnames=[
            "dataset_name",
            "provider",
            "model",
            "judge_mode",
            "run_id",
            "group_a",
            "group_b",
            "n_a",
            "correct_a",
            "acc_a",
            "n_b",
            "correct_b",
            "acc_b",
            "delta_accuracy",
            "delta_ci95_low",
            "delta_ci95_high",
            "z_score",
            "p_value",
            "q_value_bh",
            "significant_0_05",
        ],
    )

    _write_csv(
        sequence_main_table_path,
        sequence_rows,
        fieldnames=[
            "provider",
            "model",
            "task",
            "total_images",
            "success_count",
            "error_count",
            "non_empty_output_count",
            "success_rate",
            "error_rate",
            "output_non_empty_rate",
            "source_file",
        ],
    )

    _write_csv(
        maze_main_table_path,
        maze_rows,
        fieldnames=[
            "size",
            "map_count",
            "path_length_mean",
            "path_length_std",
            "num_walls_mean",
            "num_walls_std",
            "num_route_mean",
            "num_route_std",
            "source_file",
        ],
    )

    _write_csv(
        paper_main_table_path,
        paper_rows,
        fieldnames=["section", "entity", "metric", "value", "meta"],
    )

    generated_at = _utc_now()

    release_doc_path = docs_dir / "SUBMISSION_RELEASE.md"
    release_doc_path.write_text(
        _build_release_markdown(
            generated_at=generated_at,
            decision_rows=decision_rows,
            pairwise_rows=pairwise_rows,
            ablation_overview_rows=ablation_overview_rows,
            safety_vln_main_rows=safety_vln_main_rows,
            safety_vln_stats_rows=safety_vln_stats_rows,
            sequence_rows=sequence_rows,
            maze_rows=maze_rows,
            out_dir=out_dir,
        ),
        encoding="utf-8",
    )

    implementation_report_path = docs_dir / "PROJECT_IMPLEMENTATION_REPORT.md"
    implementation_report_path.write_text(
        _build_implementation_report_markdown(
            generated_at=generated_at,
            decision_rows=decision_rows,
            pairwise_rows=pairwise_rows,
            ablation_rows=ablation_rows,
            safety_vln_main_rows=safety_vln_main_rows,
            safety_vln_axis_rows=safety_vln_axis_rows,
            safety_vln_stats_rows=safety_vln_stats_rows,
            sequence_rows=sequence_rows,
            maze_rows=maze_rows,
        ),
        encoding="utf-8",
    )

    manifest_path = out_dir / "manifest.json"
    _write_json(
        manifest_path,
        {
            "generated_at_utc": generated_at,
            "inputs": {
                "outputs_dir": str(outputs_dir),
                "sequence_dir": str(effective_sequence_dir),
                "maze_base_dir": str(maze_base_dir) if maze_base_dir else "",
            },
            "counts": {
                "decision_main_rows": len(decision_rows),
                "decision_condition_rows": len(condition_rows),
                "decision_pairwise_rows": len(pairwise_rows),
                "decision_ablation_rows": len(ablation_rows),
                "safety_vln_main_rows": len(safety_vln_main_rows),
                "safety_vln_axis_rows": len(safety_vln_axis_rows),
                "safety_vln_stats_rows": len(safety_vln_stats_rows),
                "sequence_rows": len(sequence_rows),
                "maze_rows": len(maze_rows),
                "paper_rows": len(paper_rows),
            },
            "artifacts": {
                "decision_main_table": str(decision_main_table_path),
                "decision_condition_table": str(decision_condition_table_path),
                "decision_stats_pairwise": str(decision_stats_table_path),
                "decision_ablation": str(decision_ablation_table_path),
                "decision_ablation_overview": str(decision_ablation_overview_table_path),
                "safety_vln_main_table": str(safety_vln_main_table_path),
                "safety_vln_axis_table": str(safety_vln_axis_table_path),
                "safety_vln_stats_table": str(safety_vln_stats_table_path),
                "sequence_main_table": str(sequence_main_table_path),
                "maze_main_table": str(maze_main_table_path),
                "paper_main_table": str(paper_main_table_path),
                "release_doc": str(release_doc_path),
                "implementation_report": str(implementation_report_path),
            },
        },
    )

    return SubmissionPackageResult(
        out_dir=out_dir,
        manifest_path=manifest_path,
        decision_main_table_path=decision_main_table_path,
        decision_condition_table_path=decision_condition_table_path,
        decision_stats_table_path=decision_stats_table_path,
        decision_ablation_table_path=decision_ablation_table_path,
        safety_vln_main_table_path=safety_vln_main_table_path,
        safety_vln_axis_table_path=safety_vln_axis_table_path,
        safety_vln_stats_table_path=safety_vln_stats_table_path,
        sequence_main_table_path=sequence_main_table_path,
        maze_main_table_path=maze_main_table_path,
        paper_main_table_path=paper_main_table_path,
        release_doc_path=release_doc_path,
        implementation_report_path=implementation_report_path,
    )
