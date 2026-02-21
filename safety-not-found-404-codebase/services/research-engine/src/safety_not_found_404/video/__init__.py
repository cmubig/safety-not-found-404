"""Video preprocessing utilities."""

from .cli import main
from .frame_extractor import extract_frames_every_n_seconds

__all__ = ["main", "extract_frames_every_n_seconds"]
