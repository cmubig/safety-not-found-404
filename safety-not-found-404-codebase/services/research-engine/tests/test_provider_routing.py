from __future__ import annotations

import sys
import types

import pytest

from safety_not_found_404.decision_experiments import providers


class _DummyChatGPTClient:
    def __init__(
        self,
        model: str,
        temperature: float,
        max_tokens: int,
        oauth_token: str,
        account_id: str,
    ) -> None:
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.oauth_token = oauth_token
        self.account_id = account_id

    def is_configured(self) -> bool:
        return True

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        _ = system_prompt
        _ = user_prompt
        return "Answer: A"


def test_infer_provider_from_model_handles_expected_prefixes() -> None:
    assert providers.infer_provider_from_model("gpt-5.2") == "openai"
    assert providers.infer_provider_from_model("codex-mini-latest") == "openai"
    assert providers.infer_provider_from_model("claude-3-5-sonnet-20241022") == "anthropic"
    assert providers.infer_provider_from_model("gemini-1.5-pro") == "gemini"


def test_create_provider_openai_uses_oauth_client_when_jwt_key(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_module = types.ModuleType("safety_not_found_404.llm.chatgpt_client")
    fake_module.ChatGPTClient = _DummyChatGPTClient
    monkeypatch.setitem(sys.modules, "safety_not_found_404.llm.chatgpt_client", fake_module)

    monkeypatch.setenv("OPENAI_API_KEY", "eyJ.oauth.token")
    monkeypatch.setenv("CHATGPT_ACCOUNT_ID", "acct-xyz")

    client = providers.create_provider(
        provider="openai",
        model="codex-mini-latest",
        temperature=0.2,
        max_tokens=128,
    )

    assert isinstance(client, _DummyChatGPTClient)
    assert client.model == "codex-mini-latest"
    assert client.oauth_token == "eyJ.oauth.token"
    assert client.account_id == "acct-xyz"


def test_create_provider_openai_uses_api_provider_when_standard_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")

    client = providers.create_provider(
        provider="openai",
        model="gpt-5.2",
        temperature=0.0,
        max_tokens=64,
    )

    assert isinstance(client, providers.OpenAITextProvider)
    assert client.api_key == "sk-openai"


def test_create_provider_other_providers_read_env_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "anthropic-key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key")

    anthropic_client = providers.create_provider(
        provider="anthropic",
        model="claude-3-5-sonnet-20241022",
        temperature=0.0,
        max_tokens=64,
    )
    gemini_client = providers.create_provider(
        provider="gemini",
        model="gemini-1.5-pro",
        temperature=0.0,
        max_tokens=64,
    )

    assert isinstance(anthropic_client, providers.AnthropicTextProvider)
    assert anthropic_client.api_key == "anthropic-key"
    assert isinstance(gemini_client, providers.GeminiTextProvider)
    assert gemini_client.api_key == "gemini-key"


def test_create_provider_unknown_raises() -> None:
    with pytest.raises(ValueError, match="Unknown provider"):
        providers.create_provider(provider="invalid", model="x", temperature=0.0, max_tokens=64)
