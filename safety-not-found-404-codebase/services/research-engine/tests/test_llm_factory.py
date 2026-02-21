from __future__ import annotations

import sys
import types

import pytest

from safety_not_found_404.llm import factory


class _DummyOpenAIVisionClient:
    def __init__(self, model: str) -> None:
        self.model = model


class _DummyGeminiVisionClient:
    def __init__(self, model: str) -> None:
        self.model = model


class _DummyOAuthVisionWrapper:
    def __init__(self, model: str, oauth_token: str, account_id: str) -> None:
        self.model = model
        self.oauth_token = oauth_token
        self.account_id = account_id


def test_create_vision_client_openai_uses_standard_client_with_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key")
    monkeypatch.setattr(factory, "OpenAIVisionClient", _DummyOpenAIVisionClient)

    client = factory.create_vision_client(provider="openai", model="gpt-5.2")

    assert isinstance(client, _DummyOpenAIVisionClient)
    assert client.model == "gpt-5.2"


def test_create_vision_client_openai_uses_oauth_wrapper_with_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_module = types.ModuleType("safety_not_found_404.llm.chatgpt_client")
    fake_module.ChatGPTOAuthVisionClientWrapper = _DummyOAuthVisionWrapper
    monkeypatch.setitem(sys.modules, "safety_not_found_404.llm.chatgpt_client", fake_module)

    monkeypatch.setenv("OPENAI_API_KEY", "eyJ.oauth.token")
    monkeypatch.setenv("CHATGPT_ACCOUNT_ID", "acct-123")

    client = factory.create_vision_client(provider="openai", model="codex-mini-latest")

    assert isinstance(client, _DummyOAuthVisionWrapper)
    assert client.model == "codex-mini-latest"
    assert client.oauth_token == "eyJ.oauth.token"
    assert client.account_id == "acct-123"


def test_create_vision_client_gemini_uses_gemini_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(factory, "GeminiVisionClient", _DummyGeminiVisionClient)

    client = factory.create_vision_client(provider="gemini", model="gemini-1.5-pro")

    assert isinstance(client, _DummyGeminiVisionClient)
    assert client.model == "gemini-1.5-pro"


def test_create_vision_client_unknown_provider_raises() -> None:
    with pytest.raises(ValueError, match="Unknown provider"):
        factory.create_vision_client(provider="unknown", model="x")
