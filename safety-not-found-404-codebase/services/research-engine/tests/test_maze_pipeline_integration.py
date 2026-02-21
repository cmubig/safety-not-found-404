from __future__ import annotations

import json

from safety_not_found_404.maze import pipeline


def test_run_full_pipeline_small_configuration(monkeypatch, tmp_path) -> None:
    base_dir = tmp_path / "maze_smoke"

    # Keep the integration test lightweight and deterministic enough for CI.
    monkeypatch.setattr(pipeline, "HAS_MATPLOTLIB", False)

    pipeline.run_full_pipeline(
        base_dir=base_dir,
        language="en",
        min_size=5,
        max_size=5,
        attempts_per_size=30,
        max_iterations=120,
    )

    maps_path = base_dir / "maps" / "5.json"
    view_path = base_dir / "view" / "5.txt"
    sort_path = base_dir / "sortview" / "5.txt"

    assert maps_path.exists()
    assert view_path.exists()
    assert sort_path.exists()

    maps_payload = json.loads(maps_path.read_text(encoding="utf-8"))
    assert isinstance(maps_payload, list)
    assert len(maps_payload) > 0

    first_map = maps_payload[0]
    assert first_map["size"] == 5
    assert "S" in first_map["map"]
    assert "G" in first_map["map"]

    sort_text = sort_path.read_text(encoding="utf-8")
    assert "Sorted by turn count" in sort_text
    assert "Turns:" in sort_text
