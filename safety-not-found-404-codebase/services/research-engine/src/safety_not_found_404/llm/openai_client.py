from __future__ import annotations

import os
import time
from pathlib import Path

from safety_not_found_404.common import encode_image_base64, guess_image_mime_type


class OpenAIVisionClient:
    """OpenAI vision client using chat completions."""

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        system_prompt: str = "You are a careful visual reasoning assistant.",
        temperature: float = 0.0,
        max_retries: int = 3,
        retry_backoff_seconds: float = 1.5,
    ) -> None:
        self.model = model
        self.system_prompt = system_prompt
        self.temperature = temperature
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds

        resolved_key = api_key or os.getenv("OPENAI_API_KEY")
        if not resolved_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        try:
            from openai import OpenAI
        except Exception as error:  # pragma: no cover - import guard
            raise RuntimeError(
                "Python package 'openai' is not installed. Install with: pip install openai"
            ) from error

        self._client = OpenAI(api_key=resolved_key)

    def generate(self, prompt: str, image_path: Path) -> str:
        image_base64 = encode_image_base64(image_path)
        mime = guess_image_mime_type(image_path)
        last_error: Exception | None = None

        for attempt in range(self.max_retries):
            try:
                response = self._client.chat.completions.create(
                    model=self.model,
                    temperature=self.temperature,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime};base64,{image_base64}",
                                    },
                                },
                            ],
                        },
                    ],
                )
                return _extract_openai_text(response).strip()
            except Exception as error:  # pragma: no cover - network path
                last_error = error
                time.sleep(self.retry_backoff_seconds * (attempt + 1))

        raise RuntimeError(f"OpenAI request failed after retries: {last_error}")


def _extract_openai_text(response: object) -> str:
    # SDK message content can be a string, None, or content blocks depending on version.
    choice = response.choices[0]
    message = choice.message
    content = getattr(message, "content", "")

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        texts: list[str] = []
        for block in content:
            text = getattr(block, "text", None)
            if text:
                texts.append(str(text))
            elif isinstance(block, dict) and "text" in block:
                texts.append(str(block["text"]))
        return "\n".join(texts)

    return ""
