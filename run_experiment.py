#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime

from experiment.prompts import generate_prompt_variants
from experiment.providers import AnthropicProvider, GeminiProvider, OpenAIProvider, ProviderError
from experiment.parser import parse_choice
from experiment.writer import ExperimentWriter
from experiment.utils import sleep_seconds


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Run trolley-choice experiment across LLM APIs")
    p.add_argument(
        "--providers",
        default="openai,anthropic,gemini",
        help="Comma-separated: openai,anthropic,gemini",
    )
    p.add_argument("--n", type=int, default=100, help="Number of trials (default: 100)")
    p.add_argument("--seed", type=int, default=20260127, help="RNG seed for prompt variants")
    p.add_argument(
        "--sleep",
        type=float,
        default=0.2,
        help="Sleep seconds between API calls (rate-limit friendly)",
    )
    p.add_argument(
        "--out",
        default="",
        help="Output .txt file path (default: outputs/experiment_YYYYMMDD_HHMMSS.txt)",
    )
    p.add_argument(
        "--openai-model",
        default=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
    )
    p.add_argument(
        "--anthropic-model",
        default=os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
    )
    p.add_argument(
        "--gemini-model",
        default=os.environ.get("GEMINI_MODEL", "gemini-1.5-pro"),
    )
    p.add_argument(
        "--temperature",
        type=float,
        default=0.0,
        help="Sampling temperature (best to keep 0 for choice consistency)",
    )
    p.add_argument(
        "--max-tokens",
        type=int,
        default=256,
        help="Max output tokens for each completion",
    )
    p.add_argument(
        "--quiet",
        action="store_true",
        help="Do not print each response/error to the terminal (still saved to .txt)",
    )
    return p.parse_args()


def main() -> int:
    args = _parse_args()

    provider_names = [x.strip().lower() for x in args.providers.split(",") if x.strip()]
    if not provider_names:
        print("No providers specified", file=sys.stderr)
        return 2

    if args.n != 100:
        print(
            "This experiment is configured to run exactly 100 trials per execution. "
            "Please set --n 100.",
            file=sys.stderr,
        )
        return 2

    prompts = generate_prompt_variants(n=args.n, seed=args.seed)

    # Output directory (we generate one file per provider/model).
    out_dir = args.out or "outputs"
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    providers = {}
    if "openai" in provider_names:
        providers["openai"] = OpenAIProvider(
            api_key=os.environ.get("OPENAI_API_KEY", ""),
            model=args.openai_model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )
    if "anthropic" in provider_names:
        providers["anthropic"] = AnthropicProvider(
            api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
            model=args.anthropic_model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )
    if "gemini" in provider_names:
        providers["gemini"] = GeminiProvider(
            api_key=os.environ.get("GEMINI_API_KEY", ""),
            model=args.gemini_model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )

    missing = [name for name, p in providers.items() if not p.is_configured()]
    if missing:
        print(
            "Missing API keys for: " + ", ".join(missing) + "\n"
            "Set env vars (see .env.example).",
            file=sys.stderr,
        )
        return 2

    def _sanitize(name: str) -> str:
        name = name.strip()
        name = re.sub(r"\s+", "-", name)
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
        return name.strip("-_") or "model"

    def _ratio(a: int, b: int) -> tuple[float, float]:
        denom = a + b
        if denom <= 0:
            return (0.0, 0.0)
        return (100.0 * a / denom, 100.0 * b / denom)

    written_paths: list[str] = []

    for provider_name, provider in providers.items():
        model_name = {
            "openai": args.openai_model,
            "anthropic": args.anthropic_model,
            "gemini": args.gemini_model,
        }.get(provider_name, provider_name)

        # Write to a temp name first, then rename once we know A/B ratios.
        tmp_path = os.path.join(out_dir, f"experiment_{provider_name}_{ts}.txt")
        writer = ExperimentWriter(out_path=tmp_path)
        writer.write_header(
            title="LLM Trolley Choice Experiment",
            meta={
                "date": datetime.now().isoformat(),
                "n": str(args.n),
                "seed": str(args.seed),
                "provider": provider_name,
                "model": model_name,
                "temperature": str(args.temperature),
                "max_tokens": str(args.max_tokens),
            },
        )

        s = {"A": 0, "B": 0, "UNKNOWN": 0, "ERROR": 0, "TOTAL": 0}

        for i, prompt in enumerate(prompts, start=1):
            writer.write_prompt_block(index=i, prompt=prompt)
            s["TOTAL"] += 1
            try:
                text = provider.generate(prompt)
                choice = parse_choice(text)
                if choice not in ("A", "B"):
                    s["UNKNOWN"] += 1
                else:
                    s[choice] += 1
                writer.write_response(
                    provider=provider_name,
                    response_text=text,
                    parsed_choice=choice,
                )

                if not args.quiet:
                    print("-" * 60)
                    print(f"TRIAL {i} [{provider_name}] model={model_name} parsed={choice}")
                    print("PROMPT:")
                    print(prompt.rstrip())
                    print("RESPONSE:")
                    print(text.rstrip())
                    print(flush=True)
            except ProviderError as e:
                s["ERROR"] += 1
                writer.write_error(provider=provider_name, error=str(e))

                if not args.quiet:
                    print("-" * 60)
                    print(f"TRIAL {i} [{provider_name}] model={model_name} ERROR")
                    print("PROMPT:")
                    print(prompt.rstrip())
                    print("ERROR:")
                    print(str(e).rstrip())
                    print(flush=True)

                if str(e).startswith("NONRETRYABLE_QUOTA_ZERO:"):
                    writer._f.write(
                        "\nNOTE: Provider quota appears to be 0; stopping further trials for this provider.\n"
                    )
                    break

            sleep_seconds(args.sleep)

        writer.write_summary({provider_name: s})
        writer.close()

        a_pct, b_pct = _ratio(s["A"], s["B"])
        # Filename format requested: model_A비율_B비율_날짜
        final_name = f"{_sanitize(model_name)}_{a_pct:.2f}_{b_pct:.2f}_{ts}.txt"
        final_path = os.path.join(out_dir, final_name)
        os.replace(tmp_path, final_path)
        written_paths.append(final_path)

    for p in written_paths:
        print(f"Wrote results to: {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
