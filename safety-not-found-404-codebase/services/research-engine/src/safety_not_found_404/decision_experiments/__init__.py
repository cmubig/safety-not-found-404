"""Unified text-based decision experiment framework (section 3.4)."""

from .cli import main
from .engine import run_scenario
from .models import ModelTarget, PromptCase, ScenarioDefinition

__all__ = ["main", "run_scenario", "ModelTarget", "PromptCase", "ScenarioDefinition"]
