from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Protocol

import requests


class ProviderError(RuntimeError):
    """LLM provider request failure."""


class TextProvider(Protocol):
    def is_configured(self) -> bool:
        ...

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        ...


def _post_json(
    url: str,
    headers: Dict[str, str],
    payload: Dict[str, Any],
    timeout_seconds: float = 60.0,
    max_retries: int = 5,
) -> Dict[str, Any]:
    last_error: str | None = None

    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=timeout_seconds)

            if response.status_code == 429:
                body_lower = (response.text or "").lower()
                if (
                    "quota exceeded" in body_lower
                    and ("limit: 0" in body_lower or "limit:0" in body_lower)
                ) or "generate_requests_per_model_per_day" in body_lower:
                    preview = (response.text or "")[:800]
                    raise ProviderError(
                        "NONRETRYABLE_QUOTA_ZERO: HTTP 429 (quota appears to be 0). "
                        f"Response preview: {preview}"
                    )

            if response.status_code in (429, 500, 502, 503, 504):
                wait_seconds = min(8.0, 0.5 * (2**attempt))
                time.sleep(wait_seconds)
                last_error = f"HTTP {response.status_code}: {response.text[:500]}"
                continue

            if response.status_code < 200 or response.status_code >= 300:
                raise ProviderError(f"HTTP {response.status_code}: {response.text[:2000]}")

            return response.json()
        except requests.RequestException as error:
            wait_seconds = min(8.0, 0.5 * (2**attempt))
            time.sleep(wait_seconds)
            last_error = str(error)

    raise ProviderError(f"Request failed after retries: {last_error}")


def _json_preview(payload: Any, limit: int = 2000) -> str:
    try:
        return json.dumps(payload)[:limit]
    except Exception:
        return str(payload)[:limit]


@dataclass
class OpenAITextProvider:
    model: str
    temperature: float
    max_tokens: int
    api_key: str

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        base_payload: Dict[str, Any] = {
            "model": self.model,
            "temperature": self.temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        payload = dict(base_payload)
        payload["max_tokens"] = self.max_tokens

        try:
            data = _post_json(url=url, headers=headers, payload=payload)
        except ProviderError as error:
            message = str(error)
            if (
                "Unsupported parameter" in message
                and "max_tokens" in message
                and "max_completion_tokens" in message
            ):
                payload = dict(base_payload)
                payload["max_completion_tokens"] = self.max_tokens
                data = _post_json(url=url, headers=headers, payload=payload)
            else:
                raise

        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            raise ProviderError(f"Unexpected OpenAI response shape: {_json_preview(data)}")


@dataclass
class AnthropicTextProvider:
    model: str
    temperature: float
    max_tokens: int
    api_key: str

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
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
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        data = _post_json(url=url, headers=headers, payload=payload)

        try:
            content = data["content"]
            text_parts = [part.get("text", "") for part in content if part.get("type") == "text"]
            return "".join(text_parts).strip()
        except Exception:
            raise ProviderError(f"Unexpected Anthropic response shape: {_json_preview(data)}")


@dataclass
class GeminiTextProvider:
    model: str
    temperature: float
    max_tokens: int
    api_key: str

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
            f"?key={self.api_key}"
        )
        headers = {"Content-Type": "application/json"}

        def _call(max_output_tokens: int) -> Dict[str, Any]:
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_prompt}],
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": user_prompt}],
                    }
                ],
                "generationConfig": {
                    "temperature": self.temperature,
                    "maxOutputTokens": max_output_tokens,
                    "candidateCount": 1,
                },
            }
            return _post_json(url=url, headers=headers, payload=payload)

        data = _call(self.max_tokens)

        def _extract_text(response_payload: Dict[str, Any]) -> tuple[str, str]:
            candidates = response_payload.get("candidates") or []
            candidate0 = candidates[0] if candidates else {}
            finish_reason = str(candidate0.get("finishReason", ""))
            content = candidate0.get("content") or {}
            parts = content.get("parts") or []
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
            return text, finish_reason

        text, finish_reason = _extract_text(data)

        if not text and finish_reason == "MAX_TOKENS":
            bumped_tokens = min(max(self.max_tokens * 4, 1024), 4096)
            data = _call(bumped_tokens)
            text, finish_reason = _extract_text(data)

        if text:
            return text

        raise ProviderError(
            "Unexpected Gemini response shape (no text parts). "
            f"finishReason={finish_reason}. Response: {_json_preview(data)}"
        )


def infer_provider_from_model(model: str) -> str:
    lowered = model.strip().lower()
    if lowered.startswith("gpt-") or lowered.startswith("o"):
        return "openai"
    if lowered.startswith("claude"):
        return "anthropic"
    if lowered.startswith("gemini"):
        return "gemini"
    return "openai"


def create_provider(
    provider: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> TextProvider:
    normalized = provider.strip().lower()

    if normalized == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key.startswith("eyJ"):
            from safety_not_found_404.llm.chatgpt_client import ChatGPTClient
            return ChatGPTClient(
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                oauth_token=api_key,
                account_id=os.getenv("CHATGPT_ACCOUNT_ID", ""),
            )
        return OpenAITextProvider(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
        )
    if normalized == "anthropic":
        return AnthropicTextProvider(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        )
    if normalized == "gemini":
        return GeminiTextProvider(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=os.getenv("GEMINI_API_KEY", ""),
        )

    raise ValueError(f"Unknown provider: {provider}")
