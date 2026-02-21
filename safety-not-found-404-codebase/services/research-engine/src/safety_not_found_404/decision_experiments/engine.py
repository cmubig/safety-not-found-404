from __future__ import annotations

import csv
import json
import re
import time
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

from safety_not_found_404.decision_experiments.models import ModelTarget, ScenarioDefinition
from safety_not_found_404.decision_experiments.parsing import parse_choice
from safety_not_found_404.decision_experiments.providers import ProviderError, create_provider


RUN_CSV_COLUMNS = [
    "timestamp_utc",
    "run_id",
    "scenario_key",
    "scenario_title",
    "provider",
    "model",
    "trial",
    "case_id",
    "condition_key",
    "condition_label",
    "choice",
    "help_bool",
    "raw_response",
    "error",
    "system_prompt",
    "prompt",
    "meta_json",
]


@dataclass(frozen=True)
class RunArtifact:
    csv_path: Path
    summary_json_path: Path
    summary_text_path: Path


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_run_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    random_suffix = datetime.now(timezone.utc).strftime("%f")[-6:]
    return f"{stamp}_{random_suffix}"


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    normalized = normalized.strip("-_")
    return normalized or "model"


def _ensure_csv_header(path: Path) -> None:
    if path.exists() and path.stat().st_size > 0:
        return

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=RUN_CSV_COLUMNS)
        writer.writeheader()


def _append_csv_row(path: Path, row: Dict[str, Any]) -> None:
    with path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=RUN_CSV_COLUMNS)
        writer.writerow(row)


def _build_condition_key(scenario: ScenarioDefinition, meta: Dict[str, str]) -> str:
    if not scenario.condition_key_fields:
        return ""
    chunks = [f"{key}={meta.get(key, '')}" for key in scenario.condition_key_fields]
    return "|".join(chunks)


def _build_condition_label(scenario: ScenarioDefinition, meta: Dict[str, str]) -> str:
    if scenario.condition_label_field:
        return str(meta.get(scenario.condition_label_field, ""))
    return ""


def _choice_ratios(choice_counts: Dict[str, int], allowed_choices: Iterable[str]) -> Dict[str, float]:
    allowed = list(allowed_choices)
    denominator = sum(choice_counts.get(choice, 0) for choice in allowed)
    if denominator <= 0:
        return {choice: 0.0 for choice in allowed}

    return {
        choice: (100.0 * choice_counts.get(choice, 0) / denominator)
        for choice in allowed
    }


def _format_summary_text(summary: Dict[str, Any], allowed_choices: List[str]) -> str:
    lines: List[str] = []
    lines.append(f"scenario: {summary['scenario_key']} ({summary['scenario_title']})")
    lines.append(f"provider: {summary['provider']} | model: {summary['model']}")
    lines.append(f"rows_total: {summary['rows_total']}")
    lines.append(f"errors: {summary['errors']} | unknown: {summary['unknown']}")
    lines.append("")
    lines.append("choice counts:")

    for choice in allowed_choices:
        count = summary["choice_counts"].get(choice, 0)
        ratio = summary["choice_ratios"].get(choice, 0.0)
        lines.append(f"  {choice}: {count} ({ratio:.2f}%)")

    lines.append("")
    lines.append("condition breakdown:")

    condition_breakdown = summary.get("condition_breakdown") or {}
    if not condition_breakdown:
        lines.append("  (none)")
    else:
        for condition_key in sorted(condition_breakdown.keys()):
            row = condition_breakdown[condition_key]
            label = row.get("label", "")
            header = condition_key or "(empty)"
            if label:
                header = f"{header} [{label}]"
            lines.append(f"  - {header}")
            for choice in allowed_choices:
                lines.append(f"      {choice}: {row['choice_counts'].get(choice, 0)}")

    return "\n".join(lines).strip() + "\n"


def run_scenario(
    *,
    scenario: ScenarioDefinition,
    model_targets: Iterable[ModelTarget],
    output_dir: Path,
    trials_per_case: int | None = None,
    sleep_seconds: float = 0.0,
    temperature: float = 0.0,
    max_tokens: int = 256,
    quiet: bool = False,
    run_id: str | None = None,
) -> List[RunArtifact]:
    output_dir.mkdir(parents=True, exist_ok=True)

    effective_trials = trials_per_case or scenario.default_trials_per_case
    effective_run_id = run_id or _new_run_id()

    artifacts: List[RunArtifact] = []

    for target in model_targets:
        provider = create_provider(
            provider=target.provider,
            model=target.model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        model_slug = _slugify(target.model)
        csv_path = output_dir / f"{scenario.key}_{target.provider}_{model_slug}_{effective_run_id}.csv"
        summary_json_path = csv_path.with_suffix(".summary.json")
        summary_text_path = csv_path.with_suffix(".summary.txt")

        _ensure_csv_header(csv_path)

        choice_counts: Dict[str, int] = defaultdict(int)
        condition_counts: Dict[str, Dict[str, Any]] = {}

        errors = 0
        unknown = 0
        rows_total = 0

        provider_error: str | None = None
        if not provider.is_configured():
            provider_error = (
                f"Missing API key for provider={target.provider}. "
                "Set environment variable before running."
            )

        for case in scenario.prompt_cases:
            system_prompt = case.system_prompt or scenario.default_system_prompt
            case_meta = dict(case.meta)
            condition_key = _build_condition_key(scenario, case_meta)
            condition_label = _build_condition_label(scenario, case_meta)

            for trial in range(1, effective_trials + 1):
                rows_total += 1
                raw_response = ""
                error_message = provider_error
                choice = None

                if provider_error is None:
                    try:
                        raw_response = provider.generate(system_prompt=system_prompt, user_prompt=case.prompt)
                        choice = parse_choice(raw_response, scenario.choices)
                    except ProviderError as error:
                        error_message = str(error)
                    except Exception as error:  # pragma: no cover - safety net
                        error_message = f"Unhandled provider error: {error}"

                if error_message:
                    errors += 1
                elif choice is None:
                    unknown += 1
                else:
                    choice_counts[choice] += 1

                condition_row = condition_counts.setdefault(
                    condition_key,
                    {
                        "label": condition_label,
                        "choice_counts": defaultdict(int),
                        "errors": 0,
                        "unknown": 0,
                        "rows_total": 0,
                    },
                )
                condition_row["rows_total"] += 1
                if error_message:
                    condition_row["errors"] += 1
                elif choice is None:
                    condition_row["unknown"] += 1
                else:
                    condition_row["choice_counts"][choice] += 1

                row = {
                    "timestamp_utc": _utc_now_iso(),
                    "run_id": effective_run_id,
                    "scenario_key": scenario.key,
                    "scenario_title": scenario.title,
                    "provider": target.provider,
                    "model": target.model,
                    "trial": trial,
                    "case_id": case.case_id,
                    "condition_key": condition_key,
                    "condition_label": condition_label,
                    "choice": choice or "",
                    "help_bool": int((choice or "") in scenario.help_choices),
                    "raw_response": raw_response,
                    "error": error_message or "",
                    "system_prompt": system_prompt,
                    "prompt": case.prompt,
                    "meta_json": json.dumps(case_meta, ensure_ascii=False),
                }
                _append_csv_row(csv_path, row)

                if not quiet:
                    status = "ERR" if error_message else (choice or "UNKNOWN")
                    print(
                        f"[{scenario.key}] {target.provider}:{target.model} case={case.case_id} trial={trial} -> {status}"
                    )

                if sleep_seconds > 0:
                    time.sleep(sleep_seconds)

        for allowed in scenario.choices:
            choice_counts.setdefault(allowed, 0)

        condition_serialized: Dict[str, Any] = {}
        for key, value in condition_counts.items():
            normalized_counts = {choice: value["choice_counts"].get(choice, 0) for choice in scenario.choices}
            condition_serialized[key] = {
                "label": value["label"],
                "choice_counts": normalized_counts,
                "choice_ratios": _choice_ratios(normalized_counts, scenario.choices),
                "errors": value["errors"],
                "unknown": value["unknown"],
                "rows_total": value["rows_total"],
            }

        summary = {
            "run_id": effective_run_id,
            "scenario_key": scenario.key,
            "scenario_title": scenario.title,
            "provider": target.provider,
            "model": target.model,
            "rows_total": rows_total,
            "errors": errors,
            "unknown": unknown,
            "choices": list(scenario.choices),
            "choice_counts": dict(choice_counts),
            "choice_ratios": _choice_ratios(dict(choice_counts), scenario.choices),
            "condition_breakdown": condition_serialized,
        }

        summary_json_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        summary_text_path.write_text(
            _format_summary_text(summary, list(scenario.choices)),
            encoding="utf-8",
        )

        artifacts.append(
            RunArtifact(
                csv_path=csv_path,
                summary_json_path=summary_json_path,
                summary_text_path=summary_text_path,
            )
        )

        if not quiet:
            print(f"Saved CSV: {csv_path}")
            print(f"Saved summary: {summary_text_path}")

    return artifacts
