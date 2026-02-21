from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class SequenceExperiment:
    provider: str
    model: str
    task: str
    input_folder: Path
    prompt: str
    output_file: Path


@dataclass
class SequenceResultItem:
    image_name: str
    image_path: str
    output: str
    error: Optional[str] = None
