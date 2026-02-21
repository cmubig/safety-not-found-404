from __future__ import annotations

from safety_not_found_404.maze.pipeline import count_turns


def test_count_turns_straight_path() -> None:
    path = [(0, 0), (0, 1), (0, 2), (0, 3)]
    assert count_turns(path) == 0


def test_count_turns_with_two_turns() -> None:
    path = [(0, 0), (0, 1), (1, 1), (1, 2)]
    assert count_turns(path) == 2
