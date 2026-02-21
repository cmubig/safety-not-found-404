from __future__ import annotations

import os
from safety_not_found_404.llm.base import VisionLLMClient
from safety_not_found_404.llm.gemini_client import GeminiVisionClient
from safety_not_found_404.llm.openai_client import OpenAIVisionClient


def create_vision_client(provider: str, model: str) -> VisionLLMClient:
    normalized = provider.strip().lower()

    if normalized == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key.startswith("eyJ"):
            from safety_not_found_404.llm.chatgpt_client import ChatGPTOAuthVisionClientWrapper
            return ChatGPTOAuthVisionClientWrapper(
                model=model,
                oauth_token=api_key,
                account_id=os.getenv("CHATGPT_ACCOUNT_ID", ""),
            )
        return OpenAIVisionClient(model=model)
    if normalized == "gemini":
        return GeminiVisionClient(model=model)

    raise ValueError(f"Unknown provider: {provider}")
