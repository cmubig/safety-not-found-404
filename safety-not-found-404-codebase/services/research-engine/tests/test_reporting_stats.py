from __future__ import annotations

from safety_not_found_404.reporting.stats import benjamini_hochberg, two_proportion_z_test, wilson_interval


def test_two_proportion_z_test_detects_difference() -> None:
    result = two_proportion_z_test(x1=80, n1=100, x2=50, n2=100)

    assert result.diff > 0.0
    assert result.p_value < 0.001
    assert result.ci95_low > 0.0


def test_wilson_interval_bounds() -> None:
    low, high = wilson_interval(successes=7, total=10)
    assert 0.0 <= low <= high <= 1.0


def test_benjamini_hochberg_monotonicity() -> None:
    adjusted = benjamini_hochberg([0.001, 0.01, 0.02, 0.2])

    assert len(adjusted) == 4
    assert all(0.0 <= value <= 1.0 for value in adjusted)
    assert adjusted[0] <= adjusted[1] <= adjusted[2] <= adjusted[3]
