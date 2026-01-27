from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

import requests


class ProviderError(RuntimeError):
    pass


def post_json(
    url: str,
    headers: Dict[str, str],
    payload: Dict[str, Any],
    timeout_s: float = 60.0,
    max_retries: int = 5,
) -> Dict[str, Any]:
    last_err: Optional[str] = None
    for attempt in range(max_retries):
        try:
            r = requests.post(url, headers=headers, json=payload, timeout=timeout_s)
            # Some 429s are non-retryable (e.g., daily quota limit is literally 0).
            # Retrying just wastes time and floods output.
            if r.status_code == 429:
                body_lower = (r.text or "").lower()
                if (
                    "quota exceeded" in body_lower
                    and ("limit: 0" in body_lower or "limit:0" in body_lower)
                ) or "generate_requests_per_model_per_day" in body_lower:
                    preview = (r.text or "")[:800]
                    raise ProviderError(
                        "NONRETRYABLE_QUOTA_ZERO: HTTP 429 (quota exceeded; limit appears to be 0). "
                        "Fix by enabling billing / upgrading your plan, using a different Google project/API key, "
                        "or exclude Gemini via --providers. Response preview: "
                        f"{preview}"
                    )
            if r.status_code in (429, 500, 502, 503, 504):
                wait = min(8.0, 0.5 * (2**attempt))
                time.sleep(wait)
                last_err = f"HTTP {r.status_code}: {r.text[:500]}"
                continue
            if r.status_code < 200 or r.status_code >= 300:
                raise ProviderError(f"HTTP {r.status_code}: {r.text[:2000]}")
            return r.json()
        except requests.RequestException as e:
            wait = min(8.0, 0.5 * (2**attempt))
            time.sleep(wait)
            last_err = str(e)

    raise ProviderError(f"Request failed after retries: {last_err}")


def json_preview(obj: Any, limit: int = 2000) -> str:
    try:
        return json.dumps(obj)[:limit]
    except Exception:
        return str(obj)[:limit]
