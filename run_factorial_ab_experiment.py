#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime

from experiment.prompts_factorial_ab import generate_factorial_prompt_cases_ab
from experiment.providers import AnthropicProvider, GeminiProvider, OpenAIProvider, ProviderError
from experiment.parser import parse_choice
from experiment.writer import ExperimentWriter
from experiment.utils import sleep_seconds


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Run factorial framing experiment with choices restricted to A/B only"
    )
    p.add_argument(
        "--providers",
        default="openai,anthropic,gemini",
        help="Comma-separated: openai,anthropic,gemini",
    )
    p.add_argument("--n", type=int, default=100, help="Must be 100")
    p.add_argument("--seed", type=int, default=20260127, help="RNG seed")
    p.add_argument(
        "--sleep",
        type=float,
        default=0.2,
        help="Sleep seconds between API calls (rate-limit friendly)",
    )
    p.add_argument(
        "--out",
        default="outputs",
        help="Output directory (default: outputs)",
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
        help="Sampling temperature (keep 0 for consistency)",
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


def _sanitize(name: str) -> str:
    name = name.strip()
    name = re.sub(r"\s+", "-", name)
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
    return name.strip("-_") or "model"


def _ratios_ab(counts: dict[str, int]) -> dict[str, float]:
    denom = sum(counts.get(k, 0) for k in ("A", "B"))
    if denom <= 0:
        return {"A": 0.0, "B": 0.0}
    return {
        "A": 100.0 * counts.get("A", 0) / denom,
        "B": 100.0 * counts.get("B", 0) / denom,
    }


def _cond_key(meta: dict[str, str]) -> str:
    u = meta.get("urgency", "")
    t = meta.get("tone", "")
    p = meta.get("priority", "")
    return f"urgency={u}|tone={t}|priority={p}"


def main() -> int:
    args = _parse_args()

    if args.n != 100:
        print(
            "This factorial experiment is configured to run exactly 100 trials per execution. "
            "Please set --n 100.",
            file=sys.stderr,
        )
        return 2

    provider_names = [x.strip().lower() for x in args.providers.split(",") if x.strip()]
    if not provider_names:
        print("No providers specified", file=sys.stderr)
        return 2

    cases = generate_factorial_prompt_cases_ab(n=args.n, seed=args.seed)

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
            "Missing API keys for: " + ", ".join(missing) + "\n" "Set env vars (see .env.example).",
            file=sys.stderr,
        )
        return 2

    written_paths: list[str] = []

    for provider_name, provider in providers.items():
        model_name = {
            "openai": args.openai_model,
            "anthropic": args.anthropic_model,
            "gemini": args.gemini_model,
        }.get(provider_name, provider_name)

        tmp_path = os.path.join(out_dir, f"factorial_ab_{provider_name}_{ts}.txt")
        writer = ExperimentWriter(out_path=tmp_path)
        writer.write_header(
            title="LLM Factorial Framing Experiment (A/B only)",
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

        counts = {"A": 0, "B": 0, "UNKNOWN": 0, "ERROR": 0, "TOTAL": 0}
        cond_counts: dict[str, dict[str, int]] = {}

        for i, case in enumerate(cases, start=1):
            counts["TOTAL"] += 1

            ck = _cond_key(case.meta)
            if ck not in cond_counts:
                cond_counts[ck] = {"A": 0, "B": 0, "UNKNOWN": 0, "ERROR": 0, "TOTAL": 0}
            cond_counts[ck]["TOTAL"] += 1

            writer._f.write("META\n")
            for k in sorted(case.meta.keys()):
                writer._f.write(f"{k}: {case.meta[k]}\n")
            writer._f.write("\n")

            writer.write_prompt_block(index=i, prompt=case.prompt)

            try:
                text = provider.generate(case.prompt)
                choice = parse_choice(text)

                if choice not in ("A", "B"):
                    counts["UNKNOWN"] += 1
                    cond_counts[ck]["UNKNOWN"] += 1
                else:
                    counts[choice] += 1
                    cond_counts[ck][choice] += 1

                writer.write_response(provider=provider_name, response_text=text, parsed_choice=choice)

                if not args.quiet:
                    print("-" * 60)
                    print(f"TRIAL {i} [{provider_name}] model={model_name} parsed={choice}")
                    print("META:")
                    for k in sorted(case.meta.keys()):
                        print(f"{k}: {case.meta[k]}")
                    print("PROMPT:")
                    print(case.prompt.rstrip())
                    print("RESPONSE:")
                    print(text.rstrip())
                    print(flush=True)

            except ProviderError as e:
                counts["ERROR"] += 1
                cond_counts[ck]["ERROR"] += 1
                writer.write_error(provider=provider_name, error=str(e))

                if not args.quiet:
                    print("-" * 60)
                    print(f"TRIAL {i} [{provider_name}] model={model_name} ERROR")
                    print("META:")
                    for k in sorted(case.meta.keys()):
                        print(f"{k}: {case.meta[k]}")
                    print("PROMPT:")
                    print(case.prompt.rstrip())
                    print("ERROR:")
                    print(str(e).rstrip())
                    print(flush=True)

                if str(e).startswith("NONRETRYABLE_QUOTA_ZERO:"):
                    writer._f.write(
                        "\nNOTE: Provider quota appears to be 0; stopping further trials for this provider.\n"
                    )
                    break

            sleep_seconds(args.sleep)

        ratios = _ratios_ab(counts)

        writer._f.write("=" * 80 + "\n")
        writer._f.write("SUMMARY\n\n")
        writer._f.write(f"Provider: {provider_name}\n")
        writer._f.write(f"Model: {model_name}\n")
        writer._f.write(f"A count: {counts['A']} (ratio among A/B: {ratios['A']:.2f}%)\n")
        writer._f.write(f"B count: {counts['B']} (ratio among A/B: {ratios['B']:.2f}%)\n")
        writer._f.write(f"UNKNOWN: {counts['UNKNOWN']}\n")
        writer._f.write(f"ERROR: {counts['ERROR']}\n")
        writer._f.write(f"TOTAL: {counts['TOTAL']}\n\n")

        writer._f.write("CONDITION BREAKDOWN (2x2x2: urgency x tone x priority)\n\n")
        for ck in sorted(cond_counts.keys()):
            c = cond_counts[ck]
            r = _ratios_ab(c)
            writer._f.write(f"Condition: {ck}\n")
            writer._f.write(
                f"  A: {c['A']} ({r['A']:.2f}%)  B: {c['B']} ({r['B']:.2f}%)\n"
            )
            writer._f.write(f"  UNKNOWN: {c['UNKNOWN']}  ERROR: {c['ERROR']}  TOTAL: {c['TOTAL']}\n\n")

        writer.close()

        final_name = f"{_sanitize(model_name)}_{ratios['A']:.2f}_{ratios['B']:.2f}_{ts}.txt"
        final_path = os.path.join(out_dir, final_name)
        os.replace(tmp_path, final_path)
        written_paths.append(final_path)

    for p in written_paths:
        print(f"Wrote results to: {p}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
