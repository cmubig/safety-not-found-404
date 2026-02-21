from __future__ import annotations

import base64
from pathlib import Path
from typing import Iterable, List

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def ensure_directory(path: str | Path) -> Path:
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def list_image_files(folder: str | Path, recursive: bool = True) -> List[Path]:
    root = Path(folder)
    if not root.exists():
        raise FileNotFoundError(f"Folder not found: {root}")

    iterator: Iterable[Path]
    if recursive:
        iterator = root.rglob("*")
    else:
        iterator = root.glob("*")

    files = [
        path
        for path in iterator
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
    ]
    files.sort()
    return files


def encode_image_base64(image_path: str | Path) -> str:
    data = Path(image_path).read_bytes()
    return base64.b64encode(data).decode("utf-8")


def guess_image_mime_type(image_path: str | Path) -> str:
    extension = Path(image_path).suffix.lower()
    if extension in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if extension == ".png":
        return "image/png"
    if extension == ".webp":
        return "image/webp"
    return "application/octet-stream"
