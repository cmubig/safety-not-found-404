from __future__ import annotations

import os

import matplotlib.pyplot as plt
import pandas as pd
from dotenv import load_dotenv


load_dotenv()


def _results_csv_path() -> str:
    return os.getenv("RESULTS_CSV_PATH", "experiment_results.csv")


def main() -> None:
    csv_path = _results_csv_path()
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Cannot find {csv_path}. Run: python3 main_experiment.py"
        )

    df = pd.read_csv(csv_path)
    if df.empty:
        raise ValueError("CSV is empty. Run the experiment first.")

    # Ensure numeric
    if "help_bool" in df.columns:
        df["help_bool"] = pd.to_numeric(df["help_bool"], errors="coerce").fillna(0).astype(int)

    # Exclude failed rows from rate calculation if desired
    # For now: include them, but they will have help_bool=0 if parsing failed.

    summary = (
        df.groupby(["model", "condition_key", "condition_label"], as_index=False)
        .agg(trials=("help_bool", "count"), helps=("help_bool", "sum"))
    )
    summary["helping_rate"] = (summary["helps"] / summary["trials"]).round(3)

    # Pretty table for console & file
    display = summary[["model", "condition_key", "condition_label", "trials", "helps", "helping_rate"]]
    display = display.sort_values(["model", "condition_key"]).reset_index(drop=True)

    table_str = display.to_string(index=False)
    print("\nHelping Rate Summary\n")
    print(table_str)

    with open("summary_table.txt", "w", encoding="utf-8") as f:
        f.write("Helping Rate Summary\n\n")
        f.write(table_str)
        f.write("\n")

    # Bar chart: x = condition, grouped by model
    pivot = summary.pivot_table(
        index="condition_key",
        columns="model",
        values="helping_rate",
        aggfunc="mean",
    ).reindex(["low_hurry", "medium_hurry", "high_hurry"])

    ax = pivot.plot(kind="bar", figsize=(10, 6))
    ax.set_title("Helping Rate by Time Pressure")
    ax.set_xlabel("Condition")
    ax.set_ylabel("Helping Rate")
    ax.set_ylim(0, 1)
    ax.legend(title="Model", bbox_to_anchor=(1.02, 1), loc="upper left")

    plt.tight_layout()
    plt.savefig("result_graph.png", dpi=200)
    plt.close()

    print("\nSaved: summary_table.txt")
    print("Saved: result_graph.png")


if __name__ == "__main__":
    main()
