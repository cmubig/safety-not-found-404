from __future__ import annotations

import re

ANSWER_PATTERN = re.compile(r"\bAnswer\s*:\s*([AB])\b", re.IGNORECASE)


def parse_choice_answer(text: str) -> str | None:
    match = ANSWER_PATTERN.search(text or "")
    if match:
        return match.group(1).upper()

    fallback_candidates = re.findall(r"\b([AB])\b", (text or "").upper())
    if len(fallback_candidates) == 1:
        return fallback_candidates[0]

    return None
