from __future__ import annotations

from pathlib import Path
from typing import Protocol


class VisionLLMClient(Protocol):
    """Provider-agnostic interface for image + text generation."""

    def generate(self, prompt: str, image_path: Path) -> str:
        """Generate text from a prompt and image."""
