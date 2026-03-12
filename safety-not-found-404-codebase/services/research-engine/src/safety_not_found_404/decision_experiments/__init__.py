"""Unified text-based decision experiment framework (section 3.4)."""

from .cli import main
from .engine import RunArtifact, run_scenario
from .models import ModelTarget, PromptCase, ScenarioDefinition
from .providers import ProviderError, TextProvider, create_provider, infer_provider_from_model

__all__ = [
    # Engine
    "RunArtifact",
    "main",
    "run_scenario",
    # Models
    "ModelTarget",
    "PromptCase",
    "ScenarioDefinition",
    # Providers
    "ProviderError",
    "TextProvider",
    "create_provider",
    "infer_provider_from_model",
]
