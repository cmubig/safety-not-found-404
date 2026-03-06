from __future__ import annotations

from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def new_run_id() -> str:
    """Generate a unique run identifier from the current UTC timestamp and microseconds."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    random_suffix = datetime.now(timezone.utc).strftime("%f")[-6:]
    return f"{stamp}_{random_suffix}"
