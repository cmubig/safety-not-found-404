from __future__ import annotations

from pathlib import Path

from safety_not_found_404.decision_experiments import cli
from safety_not_found_404.decision_experiments.engine import RunArtifact


def _artifact(*, rows_total: int, errors: int, unknown: int) -> RunArtifact:
    return RunArtifact(
        csv_path=Path("/tmp/fake.csv"),
        summary_json_path=Path("/tmp/fake.summary.json"),
        summary_text_path=Path("/tmp/fake.summary.txt"),
        rows_total=rows_total,
        errors=errors,
        unknown=unknown,
    )


def test_main_returns_non_zero_when_all_rows_fail(monkeypatch) -> None:
    monkeypatch.setattr(cli, "run_scenario", lambda **kwargs: [_artifact(rows_total=1, errors=1, unknown=0)])

    code = cli.main(["--scenario", "dilemma_baseline_ab", "--models", "gpt-5.2", "--quiet"])

    assert code == 1


def test_main_returns_zero_when_any_success_exists(monkeypatch) -> None:
    monkeypatch.setattr(
        cli,
        "run_scenario",
        lambda **kwargs: [
            _artifact(rows_total=2, errors=1, unknown=0),
            _artifact(rows_total=1, errors=0, unknown=1),
        ],
    )

    code = cli.main(["--scenario", "dilemma_baseline_ab", "--models", "gpt-5.2", "--quiet"])

    assert code == 0
