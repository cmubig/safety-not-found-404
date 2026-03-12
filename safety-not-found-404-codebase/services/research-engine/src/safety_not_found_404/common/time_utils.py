from __future__ import annotations

import secrets
from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def new_run_id() -> str:
    """Generate a collision-safe run identifier from UTC timestamp + random hex suffix.

    Format: ``YYYYMMDDTHHMMSSZ_<microseconds>_<random-hex>``
    The random suffix ensures uniqueness even for rapid successive calls.
    """
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    usec = now.strftime("%f")
    return f"{stamp}_{usec}_{secrets.token_hex(4)}"
