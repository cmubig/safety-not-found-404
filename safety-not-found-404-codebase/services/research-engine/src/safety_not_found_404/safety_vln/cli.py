from __future__ import annotations

import argparse
import json
from pathlib import Path

from safety_not_found_404.safety_vln.dataset import (
    generate_synthetic_dataset,
    load_dataset,
    save_dataset,
    validate_dataset,
)
from safety_not_found_404.safety_vln.engine import run_benchmark_from_path


def _build_generate_parser(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        "generate-dataset",
        help="Generate synthetic Safety-VLN dataset with 3-stage structure",
    )
    parser.add_argument("--out", required=True, help="Output dataset JSON path")
    parser.add_argument("--name", default="Safety-VLN Synthetic v1")
    parser.add_argument("--per-track", type=int, default=100)
    parser.add_argument("--event-ratio", type=float, default=0.5)
    parser.add_argument("--seed", type=int, default=20260304)


def _build_validate_parser(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        "validate-dataset",
        help="Validate dataset fairness/consistency constraints",
    )
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--min-per-track", type=int, default=100)


def _build_run_parser(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser(
        "run-benchmark",
        help="Run Safety-VLN benchmark with 3-stage gating and scoring",
    )
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--provider", default="openai")
    parser.add_argument("--model", default="gpt-5.2")
    parser.add_argument("--output-dir", default="outputs/safety_vln")
    parser.add_argument("--trials-per-problem", type=int, default=1)
    parser.add_argument("--run-id", default="")

    parser.add_argument("--judge-mode", choices=["rule", "llm"], default="rule")
    parser.add_argument("--judge-provider", default="openai")
    parser.add_argument("--judge-model", default="gpt-4.1-mini")

    parser.add_argument("--min-per-track", type=int, default=100)
    parser.add_argument("--strict-dataset-validation", action="store_true", default=False)

    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=256)
    parser.add_argument("--quiet", action="store_true")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Safety-VLN benchmark toolkit")
    subparsers = parser.add_subparsers(dest="command", required=True)

    _build_generate_parser(subparsers)
    _build_validate_parser(subparsers)
    _build_run_parser(subparsers)

    return parser


def _cmd_generate(args: argparse.Namespace) -> int:
    dataset = generate_synthetic_dataset(
        name=args.name,
        per_track_count=args.per_track,
        event_ratio=args.event_ratio,
        seed=args.seed,
    )
    output_path = save_dataset(args.out, dataset)
    print(f"Generated dataset: {output_path.resolve()}")
    print(f"Problems: {len(dataset.problems)}")
    return 0


def _cmd_validate(args: argparse.Namespace) -> int:
    dataset = load_dataset(args.dataset)
    validation = validate_dataset(dataset, min_problems_per_track=args.min_per_track)

    print(f"Dataset: {Path(args.dataset).resolve()}")
    print(f"Valid: {validation.is_valid}")
    print(f"Track counts: {dict(validation.track_counts)}")
    print(f"Event counts: {dict(validation.event_counts)}")

    for warning in validation.warnings:
        print(f"WARNING: {warning}")

    if validation.errors:
        for error in validation.errors:
            print(f"ERROR: {error}")
        return 1

    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    artifact = run_benchmark_from_path(
        dataset_path=Path(args.dataset),
        provider=args.provider,
        model=args.model,
        output_dir=Path(args.output_dir),
        trials_per_problem=args.trials_per_problem,
        run_id=args.run_id or None,
        judge_mode=args.judge_mode,
        judge_provider=args.judge_provider,
        judge_model=args.judge_model,
        min_problems_per_track=args.min_per_track,
        strict_dataset_validation=bool(args.strict_dataset_validation),
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        quiet=bool(args.quiet),
    )

    print(f"CSV: {artifact.csv_path.resolve()}")
    print(f"Summary JSON: {artifact.summary_json_path.resolve()}")
    print(f"Summary TXT: {artifact.summary_text_path.resolve()}")

    summary = json.loads(artifact.summary_json_path.read_text(encoding="utf-8"))
    core = summary.get("core_scores") or {}
    disparity = summary.get("disparity_metrics") or {}
    print(f"general_score: {float(core.get('general_score', 0.0)):.6f}")
    print(f"safety_event_score: {float(core.get('safety_event_score', 0.0)):.6f}")
    print(f"gap_general_minus_event: {float(core.get('gap_general_minus_event', 0.0)):.6f}")
    print(f"ltr_minus_rtl_score_gap: {float(disparity.get('ltr_minus_rtl_score_gap', 0.0)):.6f}")
    print(
        "high_minus_low_time_interval_gap: "
        f"{float(disparity.get('high_minus_low_time_interval_gap', 0.0)):.6f}"
    )
    print(f"demographic_max_minus_min_score_gap: {float(disparity.get('demographic_max_minus_min_score_gap', 0.0)):.6f}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "generate-dataset":
        return _cmd_generate(args)
    if args.command == "validate-dataset":
        return _cmd_validate(args)
    if args.command == "run-benchmark":
        return _cmd_run(args)

    parser.error("Unknown command")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
