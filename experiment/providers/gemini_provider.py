from __future__ import annotations

from dataclasses import dataclass

from .base import ProviderError, json_preview, post_json


@dataclass
class GeminiProvider:
    api_key: str
    model: str
    temperature: float = 0.0
    max_tokens: int = 256

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
            f"?key={self.api_key}"
        )
        headers = {"Content-Type": "application/json"}

        def _call(max_output_tokens: int) -> dict:
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": self.temperature,
                    "maxOutputTokens": max_output_tokens,
                    "candidateCount": 1,
                },
            }
            return post_json(url, headers, payload)

        data = _call(self.max_tokens)

        def _extract_text(resp: dict) -> tuple[str, str]:
            candidates = resp.get("candidates") or []
            cand0 = candidates[0] if candidates else {}
            finish = str(cand0.get("finishReason", ""))
            content = cand0.get("content") or {}
            parts = content.get("parts") or []
            text = "".join([p.get("text", "") for p in parts if isinstance(p, dict)]).strip()
            return text, finish

        text, finish = _extract_text(data)

        # Some Gemini preview models may spend the entire budget on "thoughts" and emit no text.
        # If that happens, retry once with a larger output budget.
        if not text and finish == "MAX_TOKENS":
            bumped = max(self.max_tokens * 4, 1024)
            bumped = min(bumped, 4096)
            data2 = _call(bumped)
            text2, finish2 = _extract_text(data2)
            if text2:
                return text2
            raise ProviderError(
                "Gemini returned no text (likely token budget exhausted before emitting output). "
                f"finishReason={finish2}. Try increasing --max-tokens. Response: {json_preview(data2)}"
            )

        if text:
            return text

        raise ProviderError(
            f"Unexpected Gemini response shape (no text parts). finishReason={finish}. "
            f"Response: {json_preview(data)}"
        )
