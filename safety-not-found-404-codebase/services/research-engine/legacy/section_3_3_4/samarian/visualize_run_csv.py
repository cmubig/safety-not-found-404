from __future__ import annotations

import argparse
import os
from dataclasses import dataclass

import matplotlib.pyplot as plt
from matplotlib import font_manager
import pandas as pd


@dataclass(frozen=True)
class RunCsvSchema:
    group_key_col: str
    group_label_col: str | None


def _infer_schema(df: pd.DataFrame) -> RunCsvSchema:
    if "group_key" in df.columns:
        return RunCsvSchema(group_key_col="group_key", group_label_col="group_label" if "group_label" in df.columns else None)
    if "condition_id" in df.columns:
        return RunCsvSchema(group_key_col="condition_id", group_label_col=None)
    raise ValueError(
        "Unsupported CSV: expected columns like group_key/group_label or condition_id. "
        f"Got columns={list(df.columns)}"
    )


def _safe_series_str(df: pd.DataFrame, col: str) -> pd.Series:
    if col not in df.columns:
        return pd.Series([""] * len(df))
    return df[col].fillna("").astype(str)


def _ensure_out_dir(out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)


def _basename_no_ext(path: str) -> str:
    base = os.path.basename(path)
    return os.path.splitext(base)[0]


def _configure_matplotlib_fonts() -> None:
    """Best-effort font configuration for Hangul labels.

    Matplotlib's default DejaVu Sans can miss Hangul glyphs on macOS.
    We try a short list of common fonts and fall back silently.
    """

    candidates = [
        # macOS
        "AppleGothic",
        # Windows
        "Malgun Gothic",
        # Common Linux/Noto/Nanum
        "NanumGothic",
        "Noto Sans CJK KR",
        "Noto Sans KR",
    ]

    available = {f.name for f in font_manager.fontManager.ttflist}
    for name in candidates:
        if name in available:
            plt.rcParams["font.family"] = name
            break

    # Prevent minus sign rendering issues with some CJK fonts
    plt.rcParams["axes.unicode_minus"] = False


def _save_help_rate_plot(
    *,
    df: pd.DataFrame,
    schema: RunCsvSchema,
    out_path: str,
    title: str,
) -> None:
    if "help_bool" not in df.columns:
        raise ValueError("CSV missing required column: help_bool")

    group_key = schema.group_key_col
    group_label = schema.group_label_col

    group_cols = [group_key]
    if group_label:
        group_cols.append(group_label)

    dfg = df.groupby(["model", *group_cols], dropna=False)["help_bool"].mean().reset_index()

    if group_label:
        dfg["group_display"] = dfg[group_label].astype(str)
    else:
        dfg["group_display"] = dfg[group_key].astype(str)

    # pivot: rows=group, cols=model
    pivot = dfg.pivot_table(index="group_display", columns="model", values="help_bool", aggfunc="mean")
    pivot = pivot.sort_index()

    fig, ax = plt.subplots(figsize=(10, 5))

    models = list(pivot.columns)
    groups = list(pivot.index)

    if not models or not groups:
        raise ValueError("No data to plot (empty after filtering errors?)")

    x = list(range(len(groups)))
    width = 0.8 / max(1, len(models))

    for i, model in enumerate(models):
        vals = pivot[model].fillna(0.0).tolist()
        offsets = [xi - 0.4 + width / 2 + i * width for xi in x]
        ax.bar(offsets, vals, width=width, label=str(model))

    ax.set_title(title)
    ax.set_ylabel("Help rate (mean of help_bool)")
    ax.set_ylim(0, 1)
    ax.set_xticks(x)
    ax.set_xticklabels(groups, rotation=0)
    ax.legend(loc="best")
    ax.grid(axis="y", alpha=0.2)

    fig.tight_layout()
    fig.savefig(out_path, dpi=200)
    plt.close(fig)


def _save_choice_share_plot(
    *,
    df: pd.DataFrame,
    schema: RunCsvSchema,
    out_path: str,
    title: str,
) -> None:
    if "choice" not in df.columns:
        raise ValueError("CSV missing required column: choice")

    group_key = schema.group_key_col
    group_label = schema.group_label_col

    group_cols = [group_key]
    if group_label:
        group_cols.append(group_label)

    d = df.copy()
    d["choice"] = d["choice"].fillna("").astype(str).str.strip().str.upper().str[:1]

    # Keep only plausible single-letter choices
    allowed = {"A", "B", "C"}
    d = d[d["choice"].isin(allowed)]
    if d.empty:
        raise ValueError("No valid choices (A/B/C) found to plot")

    if group_label:
        d["group_display"] = d[group_label].astype(str)
    else:
        d["group_display"] = d[group_key].astype(str)

    counts = (
        d.groupby(["model", "group_display", "choice"], dropna=False)
        .size()
        .reset_index(name="n")
    )

    totals = counts.groupby(["model", "group_display"], dropna=False)["n"].sum().reset_index(name="total")
    merged = counts.merge(totals, on=["model", "group_display"], how="left")
    merged["share"] = merged["n"] / merged["total"]

    pivot = merged.pivot_table(
        index=["group_display", "model"],
        columns="choice",
        values="share",
        aggfunc="mean",
        fill_value=0.0,
    )

    for col in ["A", "B", "C"]:
        if col not in pivot.columns:
            pivot[col] = 0.0
    pivot = pivot[["A", "B", "C"]]

    x_labels = [f"{idx[0]}\n{idx[1]}" for idx in pivot.index]
    x = list(range(len(x_labels)))

    fig, ax = plt.subplots(figsize=(max(10, len(x_labels) * 0.6), 5))

    bottom = [0.0] * len(x)
    colors = {"A": "#4C78A8", "B": "#F58518", "C": "#54A24B"}

    for choice in ["A", "B", "C"]:
        vals = pivot[choice].tolist()
        ax.bar(x, vals, bottom=bottom, label=choice, color=colors.get(choice))
        bottom = [b + v for b, v in zip(bottom, vals)]

    ax.set_title(title)
    ax.set_ylabel("Choice share")
    ax.set_ylim(0, 1)
    ax.set_xticks(x)
    ax.set_xticklabels(x_labels, rotation=0)
    ax.legend(loc="best", title="Choice")
    ax.grid(axis="y", alpha=0.2)

    fig.tight_layout()
    fig.savefig(out_path, dpi=200)
    plt.close(fig)


def visualize_run_csv(*, csv_path: str, out_dir: str) -> dict[str, str]:
    _configure_matplotlib_fonts()
    df = pd.read_csv(csv_path)
    schema = _infer_schema(df)

    # Filter out error rows for visualization
    err = _safe_series_str(df, "error")
    df_ok = df[err.str.len() == 0].copy()

    base = _basename_no_ext(csv_path)
    _ensure_out_dir(out_dir)

    help_rate_png = os.path.join(out_dir, f"{base}_help_rate.png")
    choice_share_png = os.path.join(out_dir, f"{base}_choice_share.png")
    summary_txt = os.path.join(out_dir, f"{base}_summary.txt")

    # Summary tables
    group_key = schema.group_key_col
    group_label = schema.group_label_col
    group_cols = [group_key]
    if group_label:
        group_cols.append(group_label)

    lines: list[str] = []
    lines.append(f"source_csv: {csv_path}")
    lines.append(f"rows_total: {len(df)}")
    lines.append(f"rows_ok: {len(df_ok)}")
    lines.append(f"rows_error: {len(df) - len(df_ok)}")

    if len(df_ok) > 0 and "help_bool" in df_ok.columns:
        help_tbl = (
            df_ok.groupby(["model", *group_cols], dropna=False)["help_bool"].mean().reset_index()
        )
        lines.append("\nhelp_rate_by_model_and_group:")
        lines.append(help_tbl.to_string(index=False))

    if len(df_ok) > 0 and "choice" in df_ok.columns:
        choice_tbl = (
            df_ok.groupby(["model", *group_cols, "choice"], dropna=False)
            .size()
            .reset_index(name="n")
        )
        lines.append("\nchoice_counts_by_model_and_group:")
        lines.append(choice_tbl.to_string(index=False))

    with open(summary_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).strip() + "\n")

    # Plots
    if len(df_ok) > 0:
        if "help_bool" in df_ok.columns:
            _save_help_rate_plot(
                df=df_ok,
                schema=schema,
                out_path=help_rate_png,
                title=f"Help rate — {base}",
            )
        if "choice" in df_ok.columns:
            _save_choice_share_plot(
                df=df_ok,
                schema=schema,
                out_path=choice_share_png,
                title=f"Choice share — {base}",
            )

    return {
        "help_rate_png": help_rate_png,
        "choice_share_png": choice_share_png,
        "summary_txt": summary_txt,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Visualize a per-run CSV produced by experiment scripts.")
    parser.add_argument("csv_path", help="Path to a run CSV (e.g., runs/graduation_prompt_run_*.csv)")
    parser.add_argument("--out-dir", default=os.path.join("runs", "plots"), help="Directory to write PNG/TXT outputs")
    args = parser.parse_args()

    outputs = visualize_run_csv(csv_path=args.csv_path, out_dir=args.out_dir)
    print("Saved:")
    for k, v in outputs.items():
        print(f"- {k}: {v}")


if __name__ == "__main__":
    main()
