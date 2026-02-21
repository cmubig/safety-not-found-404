from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import List

from safety_not_found_404.decision_experiments.engine import run_scenario
from safety_not_found_404.decision_experiments.models import ModelTarget
from safety_not_found_404.decision_experiments.providers import infer_provider_from_model
from safety_not_found_404.decision_experiments.scenarios.registry import (
    available_scenarios,
    build_scenario,
)


def _split_csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _resolve_model_targets(args: argparse.Namespace) -> List[ModelTarget]:
    if args.models:
        targets: List[ModelTarget] = []
        for model_name in _split_csv(args.models):
            targets.append(
                ModelTarget(provider=infer_provider_from_model(model_name), model=model_name)
            )
        return targets

    provider_names = _split_csv(args.providers)
    targets: List[ModelTarget] = []

    if "openai" in provider_names:
        targets.append(ModelTarget(provider="openai", model=args.openai_model))
    if "anthropic" in provider_names:
        targets.append(ModelTarget(provider="anthropic", model=args.anthropic_model))
    if "gemini" in provider_names:
        targets.append(ModelTarget(provider="gemini", model=args.gemini_model))

    if not targets:
        raise ValueError("No model targets resolved. Provide --models or --providers.")

    return targets


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Unified runner for section 3.4 decision experiments")
    parser.add_argument("--scenario", choices=available_scenarios(), required=True)
    parser.add_argument(
        "--providers",
        default="openai,gemini",
        help="Comma-separated provider list if --models is not set",
    )
    parser.add_argument(
        "--models",
        default="",
        help="Optional explicit models list (provider inferred), e.g. 'gpt-5.2,gemini-1.5-pro'",
    )
    parser.add_argument("--openai-model", default=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"))
    parser.add_argument(
        "--anthropic-model",
        default=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
    )
    parser.add_argument("--gemini-model", default=os.getenv("GEMINI_MODEL", "gemini-1.5-pro"))

    parser.add_argument("--case-count", type=int, default=100, help="Cases per scenario (or per prompt type)")
    parser.add_argument("--trials-per-case", type=int, default=None)
    parser.add_argument("--seed", type=int, default=20260127)
    parser.add_argument("--sleep", type=float, default=0.0)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=256)
    parser.add_argument("--output-dir", default="outputs/decision_experiments")
    parser.add_argument("--run-id", default="")
    parser.add_argument("--quiet", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    scenario = build_scenario(
        scenario_key=args.scenario,
        case_count=args.case_count,
        seed=args.seed,
    )
    targets = _resolve_model_targets(args)

    artifacts = run_scenario(
        scenario=scenario,
        model_targets=targets,
        output_dir=Path(args.output_dir),
        trials_per_case=args.trials_per_case,
        sleep_seconds=args.sleep,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        quiet=args.quiet,
        run_id=args.run_id or None,
    )

    if args.quiet:
        for artifact in artifacts:
            print(artifact.csv_path)
    else:
        print("---")
        print(f"Scenario: {scenario.key}")
        print(f"Models: {', '.join(f'{t.provider}:{t.model}' for t in targets)}")
        for artifact in artifacts:
            print(f"CSV: {artifact.csv_path}")
            print(f"Summary JSON: {artifact.summary_json_path}")
            print(f"Summary TXT: {artifact.summary_text_path}")

    if sum(artifact.successful_rows for artifact in artifacts) <= 0:
        print(
            "Decision experiment produced no successful responses (all rows are errors/unknown).",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
