from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from safety_not_found_404.common import guess_image_mime_type


class GeminiVisionClient:
    """Gemini vision client with support for both Google SDK variants."""

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        max_retries: int = 3,
        retry_backoff_seconds: float = 1.5,
    ) -> None:
        self.model = model
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds

        resolved_key = api_key or os.getenv("GEMINI_API_KEY")
        if not resolved_key:
            raise RuntimeError("GEMINI_API_KEY is not set")

        self._sdk: str
        self._client: Any
        self._types: Any

        try:
            from google import genai
            from google.genai import types as genai_types

            self._sdk = "google_genai"
            self._client = genai.Client(api_key=resolved_key)
            self._types = genai_types
            return
        except Exception:
            pass

        try:
            import google.generativeai as legacy_genai

            legacy_genai.configure(api_key=resolved_key)
            self._sdk = "google_generativeai"
            self._client = legacy_genai.GenerativeModel(self.model)
            self._types = None
            return
        except Exception as error:  # pragma: no cover - import guard
            raise RuntimeError(
                "Gemini SDK not found. Install one of: pip install google-genai OR pip install google-generativeai"
            ) from error

    def generate(self, prompt: str, image_path: Path) -> str:
        image_bytes = image_path.read_bytes()
        mime_type = guess_image_mime_type(image_path)
        last_error: Exception | None = None

        for attempt in range(self.max_retries):
            try:
                if self._sdk == "google_genai":
                    response = self._client.models.generate_content(
                        model=self.model,
                        contents=[
                            self._types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                            prompt,
                        ],
                    )
                    return (getattr(response, "text", "") or "").strip()

                response = self._client.generate_content(
                    [
                        prompt,
                        {
                            "mime_type": mime_type,
                            "data": image_bytes,
                        },
                    ],
                    generation_config={"temperature": 0},
                )
                return (getattr(response, "text", "") or "").strip()
            except Exception as error:  # pragma: no cover - network path
                last_error = error
                time.sleep(self.retry_backoff_seconds * (attempt + 1))

        raise RuntimeError(f"Gemini request failed after retries: {last_error}")
