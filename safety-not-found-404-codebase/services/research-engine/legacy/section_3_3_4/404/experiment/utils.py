from __future__ import annotations

import time


def sleep_seconds(seconds: float) -> None:
    if seconds and seconds > 0:
        time.sleep(seconds)
