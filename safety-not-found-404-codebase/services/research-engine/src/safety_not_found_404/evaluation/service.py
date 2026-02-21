from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from time import sleep
from typing import Any, Dict, List, Optional

from safety_not_found_404.common import list_image_files
from safety_not_found_404.evaluation.parser import parse_choice_answer
from safety_not_found_404.evaluation.prompts import CHOICE_PROMPT
from safety_not_found_404.llm import create_vision_client


@dataclass
class EvaluationItem:
    path: str
    expected: str
    predicted: Optional[str]
    correct: bool
    raw_response: str
    error: Optional[str] = None


def evaluate_choice_dataset(
    provider: str,
    model: str,
    folder_a: Path,
    folder_b: Path,
    prompt: str = CHOICE_PROMPT,
    max_items: Optional[int] = None,
    sleep_seconds: float = 0.0,
    recursive: bool = True,
    quiet: bool = False,
) -> Dict[str, Any]:
    images_a = _limit_items(list_image_files(folder_a, recursive=recursive), max_items)
    images_b = _limit_items(list_image_files(folder_b, recursive=recursive), max_items)

    client = create_vision_client(provider=provider, model=model)
    results: List[EvaluationItem] = []

    if not quiet:
        print(f"Found {len(images_a)} image(s) in A folder")
        print(f"Found {len(images_b)} image(s) in B folder")

    results.extend(
        _evaluate_split(
            client=client,
            images=images_a,
            expected="A",
            prompt=prompt,
            sleep_seconds=sleep_seconds,
            quiet=quiet,
        )
    )
    results.extend(
        _evaluate_split(
            client=client,
            images=images_b,
            expected="B",
            prompt=prompt,
            sleep_seconds=sleep_seconds,
            quiet=quiet,
        )
    )

    total = len(results)
    correct = sum(item.correct for item in results)

    split_a = [item for item in results if item.expected == "A"]
    split_b = [item for item in results if item.expected == "B"]

    report: Dict[str, Any] = {
        "provider": provider,
        "model": model,
        "folder_a": str(folder_a),
        "folder_b": str(folder_b),
        "total": total,
        "correct": correct,
        "accuracy": (correct / total) if total else 0.0,
        "accuracy_folder_a": _compute_accuracy(split_a),
        "accuracy_folder_b": _compute_accuracy(split_b),
        "num_folder_a": len(split_a),
        "num_folder_b": len(split_b),
        "wrong_items": [item.__dict__ for item in results if not item.correct],
        "all_items": [item.__dict__ for item in results],
    }
    return report


def _limit_items(paths: List[Path], max_items: Optional[int]) -> List[Path]:
    if max_items is None:
        return paths
    return paths[: max(0, int(max_items))]


def _compute_accuracy(items: List[EvaluationItem]) -> float:
    if not items:
        return 0.0
    return sum(item.correct for item in items) / len(items)


def _evaluate_split(
    client: object,
    images: List[Path],
    expected: str,
    prompt: str,
    sleep_seconds: float,
    quiet: bool,
) -> List[EvaluationItem]:
    split_results: List[EvaluationItem] = []

    for index, image_path in enumerate(images, start=1):
        raw_text = ""
        parsed = None
        error = None

        try:
            raw_text = client.generate(prompt=prompt, image_path=image_path)
            parsed = parse_choice_answer(raw_text)
        except Exception as request_error:  # pragma: no cover - network path
            error = str(request_error)

        is_correct = parsed == expected if parsed else False
        split_results.append(
            EvaluationItem(
                path=str(image_path),
                expected=expected,
                predicted=parsed,
                correct=is_correct,
                raw_response=raw_text,
                error=error,
            )
        )

        if not quiet:
            status = parsed if parsed else "(unparsed)"
            suffix = f" | error: {error}" if error else ""
            print(f"[{expected} {index}/{len(images)}] {image_path.name} -> {status}{suffix}")

        if sleep_seconds > 0:
            sleep(sleep_seconds)

    return split_results
