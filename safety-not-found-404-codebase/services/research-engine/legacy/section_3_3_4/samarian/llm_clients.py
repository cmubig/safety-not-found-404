from __future__ import annotations

import json
import os
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from dotenv import load_dotenv


load_dotenv()


@dataclass
class LLMResult:
    raw_text: str
    parsed_json: Optional[Dict[str, Any]]
    error: Optional[str] = None


class LLMClient(ABC):
    @abstractmethod
    def generate(self, *, system_prompt: str, user_prompt: str, model: str) -> LLMResult:
        raise NotImplementedError


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort JSON extraction from model output."""
    if not text:
        return None

    # First, try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Try to find a JSON object substring
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None

    candidate = match.group(0)
    try:
        return json.loads(candidate)
    except Exception:
        return None


class OpenAIClient(LLMClient):
    def __init__(self, api_key: Optional[str] = None, *, max_retries: int = 2):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.max_retries = max_retries

        if not self.api_key:
            raise ValueError("Missing OPENAI_API_KEY (set it in .env)")

        # Lazy import to keep dependency optional until used
        from openai import OpenAI  # type: ignore

        self._client = OpenAI(api_key=self.api_key)

    def generate(self, *, system_prompt: str, user_prompt: str, model: str) -> LLMResult:
        last_error: Optional[str] = None

        for attempt in range(self.max_retries + 1):
            try:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.7,
                )
                text = resp.choices[0].message.content or ""
                parsed = _extract_json_object(text)
                return LLMResult(raw_text=text, parsed_json=parsed)
            except Exception as e:
                last_error = f"OpenAI error: {e}"
                if attempt < self.max_retries:
                    time.sleep(0.8 * (2**attempt))
                else:
                    return LLMResult(raw_text="", parsed_json=None, error=last_error)

        return LLMResult(raw_text="", parsed_json=None, error=last_error)


class GeminiClient(LLMClient):
    def __init__(self, api_key: Optional[str] = None, *, max_retries: int = 2):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.max_retries = max_retries

        if not self.api_key:
            raise ValueError("Missing GEMINI_API_KEY (set it in .env)")

        # New unified SDK (recommended): pip install google-genai
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
        except ModuleNotFoundError as e:
            raise ModuleNotFoundError(
                "Missing dependency 'google-genai' in the active Python environment. "
                "Install it with: pip install google-genai"
            ) from e

        self._genai = genai
        self._types = types
        # Gemini Developer API: pass api_key (or rely on GEMINI_API_KEY env var)
        self._client = genai.Client(api_key=self.api_key)

    def generate(self, *, system_prompt: str, user_prompt: str, model: str) -> LLMResult:
        last_error: Optional[str] = None

        for attempt in range(self.max_retries + 1):
            try:
                resp = self._client.models.generate_content(
                    model=model,
                    contents=user_prompt,
                    config=self._types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7,
                    ),
                )

                text = getattr(resp, "text", "") or ""
                parsed = _extract_json_object(text)
                return LLMResult(raw_text=text, parsed_json=parsed)
            except Exception as e:
                last_error = f"Gemini error: {e}"
                if attempt < self.max_retries:
                    time.sleep(0.8 * (2**attempt))
                else:
                    return LLMResult(raw_text="", parsed_json=None, error=last_error)

        return LLMResult(raw_text="", parsed_json=None, error=last_error)
