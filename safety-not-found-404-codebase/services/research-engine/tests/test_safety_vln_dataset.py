from __future__ import annotations

from pathlib import Path

from safety_not_found_404.safety_vln.dataset import (
    generate_synthetic_dataset,
    load_dataset,
    save_dataset,
    validate_dataset,
)


def test_generate_and_validate_dataset_passes_with_requested_minimum(tmp_path: Path) -> None:
    dataset = generate_synthetic_dataset(per_track_count=12, event_ratio=0.5, seed=7)
    validation = validate_dataset(dataset, min_problems_per_track=12)

    assert validation.is_valid
    assert validation.track_counts["sequence"] == 12
    assert validation.track_counts["ascii"] == 12
    assert validation.track_counts["meta_reasoning"] == 12


def test_validate_dataset_fails_when_track_count_too_small() -> None:
    dataset = generate_synthetic_dataset(per_track_count=4, event_ratio=0.5, seed=11)
    validation = validate_dataset(dataset, min_problems_per_track=10)

    assert not validation.is_valid
    assert any("minimum required is 10" in error for error in validation.errors)


def test_save_and_load_roundtrip(tmp_path: Path) -> None:
    dataset = generate_synthetic_dataset(per_track_count=5, event_ratio=0.4, seed=3)
    path = tmp_path / "dataset.json"

    save_dataset(path, dataset)
    loaded = load_dataset(path)

    assert loaded.name == dataset.name
    assert len(loaded.problems) == len(dataset.problems)
    assert loaded.problems[0].problem_id == dataset.problems[0].problem_id
