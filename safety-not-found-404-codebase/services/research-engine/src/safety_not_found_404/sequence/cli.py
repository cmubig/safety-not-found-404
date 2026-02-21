from __future__ import annotations

import argparse
from pathlib import Path

from safety_not_found_404.sequence.models import SequenceExperiment
from safety_not_found_404.sequence.prompts import DEFAULT_TASK_PROMPTS
from safety_not_found_404.sequence.service import (
    build_default_experiments,
    parse_experiments_config,
    run_experiments,
    slugify,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run sequence reasoning benchmarks")
    parser.add_argument("--config", type=str, help="JSON config path for multiple experiments")

    parser.add_argument("--run-defaults", action="store_true", help="Run default tasks for a provider")
    parser.add_argument("--provider", choices=["openai", "gemini"], help="LLM provider")
    parser.add_argument("--model", help="Model name for single experiment mode")
    parser.add_argument("--task", help="Task name for single experiment mode")
    parser.add_argument("--input-folder", help="Input image folder for single experiment mode")
    parser.add_argument("--prompt", help="Override prompt for single experiment mode")
    parser.add_argument("--output-file", help="Output file for single experiment mode")

    parser.add_argument(
        "--data-dir",
        type=str,
        default="data/sequence",
        help="Base directory containing masking/validation folders (default mode)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="outputs/sequence",
        help="Output directory for generated reports",
    )
    parser.add_argument("--recursive", action="store_true", help="Recursively scan input folders")
    parser.add_argument("--quiet", action="store_true", help="Reduce console logs")
    return parser


def resolve_single_experiment(args: argparse.Namespace) -> SequenceExperiment:
    if not args.provider or not args.model or not args.task or not args.input_folder:
        raise ValueError(
            "Single experiment mode requires --provider, --model, --task, and --input-folder"
        )

    task_key = args.task.strip().lower()
    prompt = args.prompt or DEFAULT_TASK_PROMPTS.get(task_key)
    if not prompt:
        raise ValueError("Prompt is required for unknown tasks. Pass --prompt explicitly.")

    output_dir = Path(args.output_dir)
    output_file = Path(args.output_file) if args.output_file else output_dir / (
        f"{args.provider}_{slugify(args.model)}_{task_key}.json"
    )

    return SequenceExperiment(
        provider=args.provider,
        model=args.model,
        task=task_key,
        input_folder=Path(args.input_folder),
        prompt=prompt,
        output_file=output_file,
    )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    output_dir = Path(args.output_dir)

    if args.config:
        experiments = parse_experiments_config(Path(args.config), fallback_output_dir=output_dir)
    elif args.run_defaults:
        if not args.provider:
            raise ValueError("--provider is required with --run-defaults")
        experiments = build_default_experiments(
            provider=args.provider,
            data_dir=Path(args.data_dir),
            output_dir=output_dir,
        )
    else:
        experiments = [resolve_single_experiment(args)]

    run_experiments(experiments=experiments, recursive=args.recursive, quiet=args.quiet)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
