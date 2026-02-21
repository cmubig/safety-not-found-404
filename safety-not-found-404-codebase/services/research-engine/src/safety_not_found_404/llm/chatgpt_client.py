from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict

import requests
from safety_not_found_404.decision_experiments.providers import ProviderError, TextProvider


# ChatGPT backend API endpoint (same as Codex CLI uses)
CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses"
DEFAULT_INSTRUCTIONS = "You are a helpful AI assistant. Always respond in the requested format."

class ChatGPTClient(TextProvider):
    """
    LLM provider using ChatGPT Plus/Pro subscription via OAuth.
    Bypasses standard API billing by hitting the chatgpt.com backend.
    """

    def __init__(
        self,
        model: str,
        oauth_token: str,
        account_id: str,
        temperature: float = 0.0,
        max_tokens: int = 1000,
        max_retries: int = 3,
        retry_backoff_seconds: float = 1.5,
    ) -> None:
        self.model = model
        self.oauth_token = oauth_token
        self.account_id = account_id
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self._session_id = str(uuid.uuid4())

    def is_configured(self) -> bool:
        return bool(self.oauth_token)

    def generate(self, prompt: str, image_path: Any = None, system_prompt: str = "") -> str:
        # Overloaded signature to handle both Vision (sequence wrapper) and Text (decision wrapper)
        if hasattr(self, "_call_chatgpt"):
             return self._call_chatgpt(system_prompt=system_prompt, user_prompt=prompt, image_path=image_path)
        return ""

    def _call_chatgpt(self, system_prompt: str, user_prompt: str, image_path: Any = None) -> str:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.oauth_token}",
            "Accept": "text/event-stream",
            "OpenAI-Beta": "responses=experimental",
            "session_id": self._session_id,
            "originator": "safety_not_found_404_gui",
            "chatgpt-account-id": self.account_id,
        }

        input_messages = []
        if system_prompt:
            input_messages.append({
                "role": "developer",
                "content": [{"type": "input_text", "text": system_prompt}],
            })

        user_content = []
        if image_path:
            # We don't support images in the free tier endpoint easily without complex upload flows
            # so we just skip it or warn if called from VisionClient wrapper.
            # (Note: the original sequence scripts don't strictly require images, they're text-based.)
            pass
            
        user_content.append({"type": "input_text", "text": user_prompt})
        input_messages.append({"role": "user", "content": user_content})

        body: Dict[str, Any] = {
            "model": self.model,
            "instructions": DEFAULT_INSTRUCTIONS,
            "input": input_messages,
            "tools": [],
            "tool_choice": "auto",
            "reasoning": {"summary": "auto"},
            "stream": True,  # Server-Sent Events
            "store": False,
            "prompt_cache_key": str(uuid.uuid4()),
        }

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    CODEX_API_URL,
                    headers=headers,
                    json=body,
                    stream=True,
                    timeout=120,
                )

                if response.status_code != 200:
                    raise ProviderError(f"ChatGPT API error ({response.status_code}): {response.text[:500]}")

                text = self._parse_sse_response(response)
                return text.strip()

            except Exception as e:
                last_error = e
                time.sleep(self.retry_backoff_seconds * (attempt + 1))

        raise ProviderError(f"Request failed after retries: {last_error}")

    def _parse_sse_response(self, resp: requests.Response) -> str:
        text_parts = []
        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue

            if isinstance(line, bytes):
                line = line.decode("utf-8", errors="ignore")

            if line.startswith("data: "):
                data_str = line[6:]
                if data_str == "[DONE]":
                    break

                try:
                    event_data = json.loads(data_str)
                    text = self._extract_text_from_event(event_data)
                    if text:
                        text_parts.append(text)
                except json.JSONDecodeError:
                    continue

        return "".join(text_parts)

    def _extract_text_from_event(self, event: dict) -> str:
        event_type = event.get("type", "")

        if event_type == "response.output_text.delta":
            return event.get("delta", "")

        if event_type == "response.output_item.added":
            item = event.get("item", {})
            if item.get("type") == "message":
                for content in item.get("content", []):
                    if content.get("type") == "output_text":
                        return content.get("text", "")

        if event_type == "response.completed":
            response = event.get("response", {})
            for item in response.get("output", []):
                if item.get("type") == "message":
                    for content in item.get("content", []):
                        if content.get("type") == "output_text":
                            return content.get("text", "")

        if event_type == "response.content_part.delta":
            return event.get("delta", {}).get("text", "")

        return ""

# Wrapper to mimic OpenAIVisionClient for the sequence/maze pipeline
class ChatGPTOAuthVisionClientWrapper:
    def __init__(self, model: str, oauth_token: str, account_id: str):
        self._client = ChatGPTClient(model, oauth_token, account_id)
        self.model = model

    def generate(self, prompt: str, image_path: Any = None) -> str:
        system_prompt = "You are a careful reasoning assistant."
        return self._client.generate(prompt=prompt, image_path=image_path, system_prompt=system_prompt)
