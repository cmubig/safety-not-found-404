from __future__ import annotations

import re
from typing import Literal

ChoiceABD = Literal["A", "B", "D", "UNKNOWN"]


_FIRST_LINE_RE = re.compile(
    r"^\s*(answer|choice)\s*[:\-]\s*([ABD])\s*[\.)!\]]?\s*$",
    re.IGNORECASE,
)

# Fallback: detect A/B/D tokens, including forms like "A)" or "B.".
_ABD_RE = re.compile(r"(?<![A-Za-z0-9])([ABD])(?=\s|[\.)!\]]|$)")


def parse_choice_abd(text: str) -> ChoiceABD:
    if not text:
        return "UNKNOWN"

    first_line = text.strip().splitlines()[0] if text.strip() else ""
    m = _FIRST_LINE_RE.match(first_line)
    if m:
        return m.group(2).upper()  # type: ignore[return-value]

    m2 = _ABD_RE.search(text)
    if m2:
        token = m2.group(1).upper()
        if token in ("A", "B", "D"):
            return token  # type: ignore[return-value]

    return "UNKNOWN"
