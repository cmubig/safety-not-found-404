from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, List


@dataclass(frozen=True)
class TwoProportionResult:
    n1: int
    x1: int
    n2: int
    x2: int
    p1: float
    p2: float
    diff: float
    z_score: float
    p_value: float
    ci95_low: float
    ci95_high: float


def safe_rate(successes: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return successes / total


def wilson_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    if total <= 0:
        return (0.0, 0.0)

    p = safe_rate(successes, total)
    denom = 1.0 + (z * z) / total
    center = (p + (z * z) / (2.0 * total)) / denom
    margin = (z / denom) * math.sqrt((p * (1.0 - p) / total) + (z * z) / (4.0 * total * total))
    return (max(0.0, center - margin), min(1.0, center + margin))


def two_proportion_z_test(x1: int, n1: int, x2: int, n2: int) -> TwoProportionResult:
    if n1 <= 0 or n2 <= 0:
        return TwoProportionResult(
            n1=n1,
            x1=x1,
            n2=n2,
            x2=x2,
            p1=0.0,
            p2=0.0,
            diff=0.0,
            z_score=0.0,
            p_value=1.0,
            ci95_low=0.0,
            ci95_high=0.0,
        )

    p1 = safe_rate(x1, n1)
    p2 = safe_rate(x2, n2)
    diff = p1 - p2

    pooled = safe_rate(x1 + x2, n1 + n2)
    pooled_var = pooled * (1.0 - pooled)
    pooled_se = math.sqrt(pooled_var * (1.0 / n1 + 1.0 / n2)) if pooled_var > 0.0 else 0.0

    if pooled_se <= 0.0:
        z_score = 0.0
        p_value = 1.0
    else:
        z_score = diff / pooled_se
        p_value = math.erfc(abs(z_score) / math.sqrt(2.0))

    unpooled_var = (p1 * (1.0 - p1) / n1) + (p2 * (1.0 - p2) / n2)
    unpooled_se = math.sqrt(unpooled_var) if unpooled_var > 0.0 else 0.0

    if unpooled_se <= 0.0:
        ci_low = diff
        ci_high = diff
    else:
        ci_low = diff - 1.96 * unpooled_se
        ci_high = diff + 1.96 * unpooled_se

    return TwoProportionResult(
        n1=n1,
        x1=x1,
        n2=n2,
        x2=x2,
        p1=p1,
        p2=p2,
        diff=diff,
        z_score=z_score,
        p_value=max(0.0, min(1.0, p_value)),
        ci95_low=max(-1.0, min(1.0, ci_low)),
        ci95_high=max(-1.0, min(1.0, ci_high)),
    )


def benjamini_hochberg(p_values: Iterable[float]) -> List[float]:
    indexed = [(index, max(0.0, min(1.0, p))) for index, p in enumerate(p_values)]
    if not indexed:
        return []

    sorted_pairs = sorted(indexed, key=lambda item: item[1])
    m = len(sorted_pairs)
    adjusted_sorted = [0.0] * m

    for rank, (_, p_value) in enumerate(sorted_pairs, start=1):
        adjusted_sorted[rank - 1] = p_value * m / rank

    for idx in range(m - 2, -1, -1):
        adjusted_sorted[idx] = min(adjusted_sorted[idx], adjusted_sorted[idx + 1])

    adjusted_by_original_index = [0.0] * m
    for (original_index, _), adjusted in zip(sorted_pairs, adjusted_sorted):
        adjusted_by_original_index[original_index] = max(0.0, min(1.0, adjusted))

    return adjusted_by_original_index
