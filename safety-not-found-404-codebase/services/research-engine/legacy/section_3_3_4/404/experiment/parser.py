from __future__ import annotations

import re
from typing import Literal

Choice = Literal["A", "B", "UNKNOWN"]


# Prefer the model's required first-line format, but tolerate minor punctuation.
_FIRST_LINE_RE = re.compile(
    r"^\s*(answer|choice)\s*[:\-]\s*([AB])\s*[\.)!\]]?\s*$",
    re.IGNORECASE,
)

# Fallback: detect A/B tokens, including forms like "A)" or "B.".
_AB_RE = re.compile(r"(?<![A-Za-z0-9])([AB])(?=\s|[\.)!\]]|$)")


def parse_choice(text: str) -> Choice:
    if not text:
        return "UNKNOWN"

    first_line = text.strip().splitlines()[0] if text.strip() else ""
    m = _FIRST_LINE_RE.match(first_line)
    if m:
        return m.group(2).upper()  # type: ignore[return-value]

    # Fallback: look for the first standalone A/B token.
    m2 = _AB_RE.search(text)
    if m2:
        token = m2.group(1).upper()
        if token in ("A", "B"):
            return token  # type: ignore[return-value]

    return "UNKNOWN"
