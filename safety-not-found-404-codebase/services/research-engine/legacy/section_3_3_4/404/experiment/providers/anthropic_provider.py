from __future__ import annotations

from dataclasses import dataclass

from .base import ProviderError, json_preview, post_json


@dataclass
class AnthropicProvider:
    api_key: str
    model: str
    temperature: float = 0.0
    max_tokens: int = 256

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, prompt: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        data = post_json(url, headers, payload)
        try:
            blocks = data["content"]
            text_parts = [b.get("text", "") for b in blocks if b.get("type") == "text"]
            return "".join(text_parts).strip()
        except Exception:
            raise ProviderError(f"Unexpected Anthropic response shape: {json_preview(data)}")
