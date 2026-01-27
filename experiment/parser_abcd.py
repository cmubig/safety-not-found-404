from __future__ import annotations

import re
from typing import Literal

ChoiceABCD = Literal["A", "B", "C", "D", "UNKNOWN"]


_FIRST_LINE_RE = re.compile(
    r"^\s*(answer|choice)\s*[:\-]\s*([ABCD])\s*[\.)!\]]?\s*$",
    re.IGNORECASE,
)

# Fallback: detect A/B/C/D tokens, including forms like "A)" or "B.".
_ABCD_RE = re.compile(r"(?<![A-Za-z0-9])([ABCD])(?=\s|[\.)!\]]|$)")


def parse_choice_abcd(text: str) -> ChoiceABCD:
    if not text:
        return "UNKNOWN"

    first_line = text.strip().splitlines()[0] if text.strip() else ""
    m = _FIRST_LINE_RE.match(first_line)
    if m:
        return m.group(2).upper()  # type: ignore[return-value]

    m2 = _ABCD_RE.search(text)
    if m2:
        token = m2.group(1).upper()
        if token in ("A", "B", "C", "D"):
            return token  # type: ignore[return-value]

    return "UNKNOWN"
