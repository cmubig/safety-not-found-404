from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable, List

from safety_not_found_404.common import ensure_directory, list_image_files
from safety_not_found_404.llm import create_vision_client
from safety_not_found_404.sequence.models import SequenceExperiment, SequenceResultItem
from safety_not_found_404.sequence.prompts import DEFAULT_TASK_PROMPTS


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip())
    normalized = normalized.strip("_")
    return normalized.lower() or "model"


def build_default_experiments(
    provider: str,
    data_dir: Path,
    output_dir: Path,
) -> List[SequenceExperiment]:
    provider_key = provider.lower().strip()

    if provider_key == "openai":
        models = ["gpt-4.1", "gpt-5.2"]
    elif provider_key == "gemini":
        models = ["gemini-3-flash-preview"]
    else:
        raise ValueError(f"Unknown provider: {provider}")

    experiments: List[SequenceExperiment] = []
    for model in models:
        for task_name, prompt in DEFAULT_TASK_PROMPTS.items():
            output_file = output_dir / f"{provider_key}_{slugify(model)}_{task_name}.json"
            experiments.append(
                SequenceExperiment(
                    provider=provider_key,
                    model=model,
                    task=task_name,
                    input_folder=data_dir / task_name,
                    prompt=prompt,
                    output_file=output_file,
                )
            )
    return experiments


def run_experiments(
    experiments: Iterable[SequenceExperiment],
    recursive: bool = False,
    quiet: bool = False,
) -> List[dict]:
    reports: List[dict] = []

    for index, experiment in enumerate(experiments, start=1):
        if not quiet:
            print(f"[{index}] {experiment.provider}:{experiment.model} - {experiment.task}")
            print(f"  input: {experiment.input_folder}")
            print(f"  output: {experiment.output_file}")

        client = create_vision_client(experiment.provider, experiment.model)
        image_files = list_image_files(experiment.input_folder, recursive=recursive)
        result_items: List[SequenceResultItem] = []

        if not quiet:
            print(f"  found {len(image_files)} image(s)")

        for image_index, image_path in enumerate(image_files, start=1):
            output_text = ""
            error_text = None

            try:
                output_text = client.generate(prompt=experiment.prompt, image_path=image_path)
            except Exception as error:  # pragma: no cover - network path
                error_text = str(error)

            result_item = SequenceResultItem(
                image_name=image_path.name,
                image_path=str(image_path),
                output=output_text,
                error=error_text,
            )
            result_items.append(result_item)

            if not quiet:
                status = "ok" if error_text is None else "error"
                print(f"    [{image_index}/{len(image_files)}] {image_path.name} -> {status}")

        report = {
            "provider": experiment.provider,
            "model": experiment.model,
            "task": experiment.task,
            "input_folder": str(experiment.input_folder),
            "total_images": len(image_files),
            "items": [item.__dict__ for item in result_items],
        }

        ensure_directory(experiment.output_file.parent)
        experiment.output_file.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        if not quiet:
            print(f"  saved report: {experiment.output_file}")

        reports.append(report)

    return reports


def parse_experiments_config(config_path: Path, fallback_output_dir: Path) -> List[SequenceExperiment]:
    raw_text = config_path.read_text(encoding="utf-8")
    payload = json.loads(raw_text)

    if not isinstance(payload, list):
        raise ValueError("Experiment config must be a JSON array")

    experiments: List[SequenceExperiment] = []

    for item in payload:
        if not isinstance(item, dict):
            raise ValueError("Each experiment item must be a JSON object")

        provider = str(item["provider"]).strip().lower()
        model = str(item["model"]).strip()
        task = str(item["task"]).strip().lower()
        input_folder = Path(str(item["input_folder"]))

        prompt = str(item.get("prompt") or DEFAULT_TASK_PROMPTS.get(task) or "")
        if not prompt:
            raise ValueError(f"Prompt missing for task: {task}")

        output_value = item.get("output_file")
        if output_value:
            output_file = Path(str(output_value))
        else:
            output_file = fallback_output_dir / f"{provider}_{slugify(model)}_{task}.json"

        experiments.append(
            SequenceExperiment(
                provider=provider,
                model=model,
                task=task,
                input_folder=input_folder,
                prompt=prompt,
                output_file=output_file,
            )
        )

    return experiments
