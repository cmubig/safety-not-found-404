from __future__ import annotations

import re


def slugify(value: str) -> str:
    """Convert an arbitrary string into a filesystem-safe slug."""
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    normalized = normalized.strip("-_").lower()
    return normalized or "model"
