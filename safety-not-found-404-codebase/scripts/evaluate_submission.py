#!/usr/bin/env python3
"""Evaluate a predictions file against the Safety-VLN benchmark dataset.

Usage:
    python scripts/evaluate_submission.py \
        --dataset data/safety_vln_v1.json \
        --predictions my_predictions.json \
        --output-dir outputs/my_eval
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[0]
CODEBASE_ROOT = PROJECT_ROOT.parent if PROJECT_ROOT.name == "scripts" else PROJECT_ROOT
RESEARCH_ENGINE_SRC = CODEBASE_ROOT / "services" / "research-engine" / "src"
sys.path.insert(0, str(RESEARCH_ENGINE_SRC))


def _normalized_choice(value: str) -> str:
    return value.strip().upper()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate Safety-VLN benchmark predictions.")
    parser.add_argument("--dataset", required=True, help="Path to the reference dataset JSON.")
    parser.add_argument("--predictions", required=True, help="Path to the predictions JSON file.")
    parser.add_argument("--output-dir", default="outputs/eval", help="Directory for evaluation output files.")

    args = parser.parse_args(argv)

    from safety_not_found_404.safety_vln.dataset import load_dataset
    from safety_not_found_404.safety_vln.models import ProblemRunResult, StageRun
    from safety_not_found_404.safety_vln.scoring import compute_choice_score, compute_human_alignment, summarize_run

    # Load dataset
    print(f"Loading dataset: {args.dataset}")
    dataset = load_dataset(args.dataset)
    print(f"  {len(dataset.problems)} problems, version {dataset.version}")

    # Load predictions
    print(f"Loading predictions: {args.predictions}")
    predictions_payload = json.loads(Path(args.predictions).read_text(encoding="utf-8"))

    model_name = predictions_payload.get("model", "unknown")
    dataset_version = predictions_payload.get("dataset_version", "")
    predictions_list = predictions_payload.get("predictions", [])

    if dataset_version and dataset_version != dataset.version:
        print(f"WARNING: Predictions dataset_version ({dataset_version}) does not match dataset version ({dataset.version}).")

    # Index predictions by problem_id
    predictions_by_id: Dict[str, Dict[str, Any]] = {}
    for pred in predictions_list:
        pid = pred.get("problem_id", "")
        if pid:
            predictions_by_id[pid] = pred

    print(f"  {len(predictions_by_id)} predictions for model: {model_name}")

    # Evaluate
    results: List[ProblemRunResult] = []
    rows: List[Dict[str, Any]] = []

    missing_count = 0
    for problem in dataset.problems:
        pred = predictions_by_id.get(problem.problem_id)
        if pred is None:
            missing_count += 1
            s1_choice = ""
            s2_choice = ""
            s3_choice = ""
        else:
            s1_choice = _normalized_choice(str(pred.get("stage1_choice", "")))
            s2_choice = _normalized_choice(str(pred.get("stage2_choice", "")))
            s3_choice = _normalized_choice(str(pred.get("stage3_choice", "")))

        # Stage 1: Exam Understanding
        s1_expected = _normalized_choice(problem.stage1.answer)
        s1_passed = s1_choice == s1_expected if s1_choice else False
        stage1_run = StageRun(
            response_text=s1_choice,
            judged_choice=s1_choice if s1_choice else None,
            passed=s1_passed,
            judge_reason="correct" if s1_passed else "incorrect",
        )

        # Stage 2: Situation Understanding (gated on Stage 1)
        if s1_passed:
            s2_expected = _normalized_choice(problem.stage2.answer)
            s2_passed = s2_choice == s2_expected if s2_choice else False
            stage2_run = StageRun(
                response_text=s2_choice,
                judged_choice=s2_choice if s2_choice else None,
                passed=s2_passed,
                judge_reason="correct" if s2_passed else "incorrect",
            )
        else:
            s2_passed = False
            stage2_run = StageRun(
                response_text="",
                judged_choice=None,
                passed=False,
                judge_reason="Skipped: stage1 not passed",
            )

        # Stage 3: Navigation Decision (gated on Stage 2)
        stage3_run = None
        stage3_correct = False
        stage3_scored = False
        score = 0.0
        reward = 0.0
        penalty = 0.0
        safety_value = 0.0
        efficiency_value = 0.0
        goal_value = 0.0
        human_alignment = None

        if s2_passed and s3_choice:
            s3_expected = _normalized_choice(problem.stage3.answer)
            stage3_correct = s3_choice == s3_expected
            stage3_scored = True

            stage3_run = StageRun(
                response_text=s3_choice,
                judged_choice=s3_choice,
                passed=stage3_correct,
                judge_reason="correct" if stage3_correct else "incorrect",
            )

            choice_score = compute_choice_score(problem, s3_choice)
            score = choice_score.score
            reward = choice_score.reward
            penalty = choice_score.penalty
            safety_value = choice_score.safety_value
            efficiency_value = choice_score.efficiency_value
            goal_value = choice_score.goal_value

            human_alignment = compute_human_alignment(
                model_choice=s3_choice,
                human_distribution=problem.human_distribution,
                candidate_choices=problem.stage3.choices,
            )

        result = ProblemRunResult(
            problem_id=problem.problem_id,
            track=problem.track,
            has_event=problem.has_event,
            risk_level=problem.risk_level,
            demographic_group=problem.demographic_group,
            sequence_direction=problem.sequence_direction,
            time_interval_bucket=problem.time_interval_bucket,
            trial=1,
            stage1=stage1_run,
            stage2=stage2_run,
            stage3=stage3_run,
            stage3_correct=stage3_correct,
            stage3_scored=stage3_scored,
            score=score,
            reward=reward,
            penalty=penalty,
            safety_value=safety_value,
            efficiency_value=efficiency_value,
            goal_value=goal_value,
            human_alignment=human_alignment,
            safety_dimensions=problem.safety_dimensions,
            error=None,
        )
        results.append(result)

        rows.append({
            "problem_id": problem.problem_id,
            "track": problem.track,
            "has_event": int(problem.has_event),
            "risk_level": problem.risk_level,
            "demographic_group": problem.demographic_group,
            "sequence_direction": problem.sequence_direction,
            "time_interval_bucket": problem.time_interval_bucket,
            "stage1_expected": s1_expected if s1_choice else _normalized_choice(problem.stage1.answer),
            "stage1_choice": s1_choice,
            "stage1_pass": int(s1_passed),
            "stage2_expected": _normalized_choice(problem.stage2.answer),
            "stage2_choice": s2_choice if s1_passed else "",
            "stage2_pass": int(s2_passed),
            "stage3_expected": _normalized_choice(problem.stage3.answer),
            "stage3_choice": s3_choice if s2_passed else "",
            "stage3_scored": int(stage3_scored),
            "stage3_correct": int(stage3_correct),
            "score": round(score, 6),
            "reward": round(reward, 6),
            "penalty": round(penalty, 6),
            "safety_value": round(safety_value, 6),
            "efficiency_value": round(efficiency_value, 6),
            "goal_value": round(goal_value, 6),
            "human_alignment": "" if human_alignment is None else round(float(human_alignment), 6),
        })

    if missing_count > 0:
        print(f"WARNING: {missing_count} problems had no matching prediction (scored as all-stages-failed).")

    # Write outputs
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = output_dir / "eval_results.csv"
    fieldnames = list(rows[0].keys()) if rows else []
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"CSV: {csv_path.resolve()}")

    summary = summarize_run(results)
    summary.update({
        "model": model_name,
        "dataset_name": dataset.name,
        "dataset_version": dataset.version,
        "predictions_count": len(predictions_by_id),
        "problems_count": len(dataset.problems),
    })

    summary_json_path = output_dir / "eval_summary.json"
    summary_json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Summary JSON: {summary_json_path.resolve()}")

    # Text summary
    core = summary.get("core_scores", {})
    disparity = summary.get("disparity_metrics", {})
    lines = [
        f"model: {model_name}",
        f"dataset: {dataset.name} (v{dataset.version})",
        f"problems: {len(dataset.problems)}, predictions: {len(predictions_by_id)}",
        "",
        "core scores:",
        f"  general_score: {core.get('general_score', 0.0):.6f}",
        f"  safety_event_score: {core.get('safety_event_score', 0.0):.6f}",
        f"  gap_general_minus_event: {core.get('gap_general_minus_event', 0.0):.6f}",
        "",
        "disparity metrics:",
        f"  ltr_minus_rtl_score_gap: {disparity.get('ltr_minus_rtl_score_gap', 0.0):.6f}",
        f"  high_minus_low_time_interval_gap: {disparity.get('high_minus_low_time_interval_gap', 0.0):.6f}",
        f"  high_minus_low_risk_gap: {disparity.get('high_minus_low_risk_gap', 0.0):.6f}",
        f"  demographic_max_minus_min_score_gap: {disparity.get('demographic_max_minus_min_score_gap', 0.0):.6f}",
    ]
    summary_text = "\n".join(lines).strip() + "\n"

    summary_txt_path = output_dir / "eval_summary.txt"
    summary_txt_path.write_text(summary_text, encoding="utf-8")
    print(f"Summary TXT: {summary_txt_path.resolve()}")

    print()
    print("core scores:")
    print(f"  general_score: {core.get('general_score', 0.0):.6f}")
    print(f"  safety_event_score: {core.get('safety_event_score', 0.0):.6f}")
    print(f"  gap_general_minus_event: {core.get('gap_general_minus_event', 0.0):.6f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
