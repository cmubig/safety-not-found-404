from __future__ import annotations

from dataclasses import dataclass

from .base import ProviderError, json_preview, post_json


@dataclass
class OpenAIProvider:
    api_key: str
    model: str
    temperature: float = 0.0
    max_tokens: int = 256

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        base_payload = {
            "model": self.model,
            "temperature": self.temperature,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Follow the required output format exactly.",
                },
                {"role": "user", "content": prompt},
            ],
        }

        # Some newer OpenAI models reject `max_tokens` and require `max_completion_tokens`.
        payload = dict(base_payload)
        payload["max_tokens"] = self.max_tokens

        try:
            data = post_json(url, headers, payload)
        except ProviderError as e:
            msg = str(e)
            if (
                "Unsupported parameter" in msg
                and "max_tokens" in msg
                and "max_completion_tokens" in msg
            ):
                payload2 = dict(base_payload)
                payload2["max_completion_tokens"] = self.max_tokens
                data = post_json(url, headers, payload2)
            else:
                raise

        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            raise ProviderError(f"Unexpected OpenAI response shape: {json_preview(data)}")
