from __future__ import annotations

import argparse
import json
from pathlib import Path

from safety_not_found_404.evaluation.prompts import CHOICE_PROMPT
from safety_not_found_404.evaluation.service import evaluate_choice_dataset


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Evaluate A/B image-choice datasets")
    parser.add_argument("--provider", choices=["openai", "gemini"], required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--folder-a", required=True, help="Folder where all answers are A")
    parser.add_argument("--folder-b", required=True, help="Folder where all answers are B")
    parser.add_argument("--prompt", default=CHOICE_PROMPT, help="Prompt override")
    parser.add_argument("--sleep", type=float, default=0.0, help="Sleep between requests")
    parser.add_argument("--max-items", type=int, default=None)
    parser.add_argument(
        "--recursive",
        dest="recursive",
        action="store_true",
        default=True,
        help="Recursively scan input folders (default: enabled)",
    )
    parser.add_argument(
        "--no-recursive",
        dest="recursive",
        action="store_false",
        help="Disable recursive folder scan",
    )
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--out", default="results.json", help="Output report path")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    report = evaluate_choice_dataset(
        provider=args.provider,
        model=args.model,
        folder_a=Path(args.folder_a),
        folder_b=Path(args.folder_b),
        prompt=args.prompt,
        max_items=args.max_items,
        sleep_seconds=args.sleep,
        recursive=args.recursive,
        quiet=args.quiet,
    )

    output_path = Path(args.out)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if not args.quiet:
        print("---")

    print(f"Provider: {report['provider']} | Model: {report['model']}")
    print(f"Total: {report['total']} | Correct: {report['correct']} | Acc: {report['accuracy']:.4f}")
    print(f"FolderA Acc: {report['accuracy_folder_a']:.4f} ({report['num_folder_a']} items)")
    print(f"FolderB Acc: {report['accuracy_folder_b']:.4f} ({report['num_folder_b']} items)")
    print(f"Saved: {output_path}")

    wrong_items = report.get("wrong_items") or []
    if wrong_items:
        print(f"Wrong: {len(wrong_items)} (see JSON for details)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
