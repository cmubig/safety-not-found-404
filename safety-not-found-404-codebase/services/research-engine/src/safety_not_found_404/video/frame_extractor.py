from __future__ import annotations

import math
from pathlib import Path
from typing import Any


def _load_cv_stack() -> tuple[Any, Any]:
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as error:
        raise RuntimeError(
            "Video extraction requires 'opencv-python' and 'numpy'. Install with: pip install opencv-python numpy"
        ) from error
    return cv2, np


def letterbox_to_target(img: np.ndarray, out_width: int, out_height: int) -> np.ndarray:
    """Resize into target canvas without cropping."""
    cv2, np = _load_cv_stack()
    height, width = img.shape[:2]
    scale = min(out_width / width, out_height / height)
    resized_width = int(round(width * scale))
    resized_height = int(round(height * scale))

    resized = cv2.resize(img, (resized_width, resized_height), interpolation=cv2.INTER_AREA)

    canvas = np.zeros((out_height, out_width, 3), dtype=np.uint8)
    x_offset = (out_width - resized_width) // 2
    y_offset = (out_height - resized_height) // 2
    canvas[y_offset : y_offset + resized_height, x_offset : x_offset + resized_width] = resized
    return canvas


def smart_center_crop_to_target(
    img: np.ndarray,
    out_width: int,
    out_height: int,
    safe_margin: float = 0.04,
) -> np.ndarray:
    """Center crop with soft margin, then resize to target."""
    cv2, _ = _load_cv_stack()
    height, width = img.shape[:2]
    target_ratio = out_width / out_height
    source_ratio = width / height

    safe_margin = max(0.0, min(0.2, safe_margin))

    if source_ratio > target_ratio:
        ideal_width = int(round(height * target_ratio))
        crop_width = min(width, int(round(ideal_width * (1 + safe_margin))))
        crop_width = max(crop_width, ideal_width)
        x_offset = (width - crop_width) // 2
        cropped = img[:, x_offset : x_offset + crop_width]
    else:
        ideal_height = int(round(width / target_ratio))
        crop_height = min(height, int(round(ideal_height * (1 + safe_margin))))
        crop_height = max(crop_height, ideal_height)
        y_offset = (height - crop_height) // 2
        cropped = img[y_offset : y_offset + crop_height, :]

    return cv2.resize(cropped, (out_width, out_height), interpolation=cv2.INTER_AREA)


def extract_frames_every_n_seconds(
    video_path: str | Path,
    output_dir: str | Path,
    interval_seconds: float = 2.0,
    out_width: int = 1920,
    out_height: int = 1080,
    mode: str = "letterbox",
    extension: str = "jpg",
    jpeg_quality: int = 95,
    safe_margin: float = 0.04,
) -> int:
    """Extract frames at fixed interval and normalize to target size."""
    cv2, _ = _load_cv_stack()
    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or math.isnan(fps) or fps <= 0:
        fps = 30.0

    interval_frames = max(1, int(round(interval_seconds * fps)))
    frame_index = 0
    saved_count = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        if frame_index % interval_frames == 0:
            if mode == "letterbox":
                output_frame = letterbox_to_target(frame, out_width, out_height)
            elif mode == "smart_crop":
                output_frame = smart_center_crop_to_target(
                    frame,
                    out_width,
                    out_height,
                    safe_margin=safe_margin,
                )
            else:
                raise ValueError("mode must be 'letterbox' or 'smart_crop'")

            timestamp = frame_index / fps
            file_name = f"frame_{saved_count:06d}_t{timestamp:0.2f}.{extension.lower()}"
            file_path = output_root / file_name

            if extension.lower() in {"jpg", "jpeg"}:
                cv2.imwrite(
                    str(file_path),
                    output_frame,
                    [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)],
                )
            elif extension.lower() == "png":
                cv2.imwrite(
                    str(file_path),
                    output_frame,
                    [int(cv2.IMWRITE_PNG_COMPRESSION), 3],
                )
            else:
                raise ValueError("extension must be 'jpg' or 'png'")

            saved_count += 1

        frame_index += 1

    capture.release()
    return saved_count
