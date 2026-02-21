from __future__ import annotations

import os
from typing import Dict


class ExperimentWriter:
    def __init__(self, out_path: str):
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        self._f = open(out_path, "w", encoding="utf-8")

    def close(self) -> None:
        self._f.close()

    def write_header(self, title: str, meta: Dict[str, str]) -> None:
        self._f.write(title + "\n")
        self._f.write("=" * len(title) + "\n\n")
        for k, v in meta.items():
            self._f.write(f"{k}: {v}\n")
        self._f.write("\n")

    def write_prompt_block(self, index: int, prompt: str) -> None:
        self._f.write("-" * 80 + "\n")
        self._f.write(f"TRIAL {index}\n\n")
        self._f.write("PROMPT\n")
        self._f.write(prompt.rstrip() + "\n\n")

    def write_response(self, provider: str, response_text: str, parsed_choice: str) -> None:
        self._f.write(f"[{provider}] RESPONSE (parsed={parsed_choice})\n")
        self._f.write(response_text.rstrip() + "\n\n")

    def write_error(self, provider: str, error: str) -> None:
        self._f.write(f"[{provider}] ERROR\n{error}\n\n")

    def write_summary(self, stats: Dict[str, Dict[str, int]]) -> None:
        self._f.write("=" * 80 + "\n")
        self._f.write("SUMMARY\n\n")

        for provider, s in stats.items():
            a = s.get("A", 0)
            b = s.get("B", 0)
            unknown = s.get("UNKNOWN", 0)
            err = s.get("ERROR", 0)
            total = s.get("TOTAL", 0)
            denom = max(a + b, 1)
            a_pct = 100.0 * a / denom
            b_pct = 100.0 * b / denom

            self._f.write(f"Provider: {provider}\n")
            self._f.write(f"  A count: {a}  (A ratio among A/B: {a_pct:.2f}%)\n")
            self._f.write(f"  B count: {b}  (B ratio among A/B: {b_pct:.2f}%)\n")
            self._f.write(f"  UNKNOWN: {unknown}\n")
            self._f.write(f"  ERROR:   {err}\n")
            self._f.write(f"  TOTAL:   {total}\n\n")
