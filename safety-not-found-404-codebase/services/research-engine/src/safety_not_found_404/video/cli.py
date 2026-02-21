from __future__ import annotations

import argparse

from safety_not_found_404.video.frame_extractor import extract_frames_every_n_seconds


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract video frames with 16:9 normalization")
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--out-dir", required=True, help="Output directory")
    parser.add_argument("--interval", type=float, default=2.0, help="Frame interval in seconds")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--mode", choices=["letterbox", "smart_crop"], default="letterbox")
    parser.add_argument("--ext", choices=["jpg", "png"], default="jpg")
    parser.add_argument("--jpeg-quality", type=int, default=95)
    parser.add_argument("--safe-margin", type=float, default=0.04)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    saved_count = extract_frames_every_n_seconds(
        video_path=args.video,
        output_dir=args.out_dir,
        interval_seconds=args.interval,
        out_width=args.width,
        out_height=args.height,
        mode=args.mode,
        extension=args.ext,
        jpeg_quality=args.jpeg_quality,
        safe_margin=args.safe_margin,
    )

    print(f"Done. Saved {saved_count} frame(s) to: {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
