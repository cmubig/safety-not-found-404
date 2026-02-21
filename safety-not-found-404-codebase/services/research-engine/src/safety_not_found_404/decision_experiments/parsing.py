from __future__ import annotations

import re
from functools import lru_cache
from typing import Sequence


@lru_cache(maxsize=64)
def _compiled_patterns(choices_key: tuple[str, ...]) -> tuple[re.Pattern[str], re.Pattern[str]]:
    escaped_choices = [re.escape(choice) for choice in choices_key]
    choices_pattern = "(?:" + "|".join(sorted(escaped_choices, key=len, reverse=True)) + ")"
    first_line = re.compile(
        rf"^\s*(answer|choice)\s*[:\-]\s*({choices_pattern})\s*[\.)!\]]?\s*$",
        re.IGNORECASE,
    )
    fallback = re.compile(rf"(?<![A-Za-z0-9_])({choices_pattern})(?![A-Za-z0-9_])", re.IGNORECASE)
    return first_line, fallback


def parse_choice(text: str, allowed_choices: Sequence[str]) -> str | None:
    if not text:
        return None

    normalized = tuple(choice.upper() for choice in allowed_choices)
    if not normalized:
        return None

    first_line_pattern, fallback_pattern = _compiled_patterns(normalized)

    stripped = text.strip()
    first_line = stripped.splitlines()[0] if stripped else ""

    first_line_match = first_line_pattern.match(first_line)
    if first_line_match:
        token = first_line_match.group(2).upper()
        if token in normalized:
            return token

    fallback_match = fallback_pattern.search(text)
    if fallback_match:
        token = fallback_match.group(1).upper()
        if token in normalized:
            return token

    return None
