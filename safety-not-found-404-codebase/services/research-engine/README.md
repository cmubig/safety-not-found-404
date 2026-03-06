# Research Engine

Python runtime for sequence, maze, evaluation, and section 3.4 decision experiments.

## Structure

```text
research-engine/
  src/safety_not_found_404/
  scripts/
  tests/
  configs/
  data/
  outputs/
  legacy/
  pyproject.toml
  requirements.txt
```

## Setup

```bash
cd /Users/chan/paper-project-page/404-safty-not-found/safety-not-found-404-codebase/services/research-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Environment variables:

```bash
export OPENAI_API_KEY="..."
export GEMINI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
```

## Commands

```bash
python scripts/run_sequence.py --run-defaults --provider openai
python scripts/run_maze_pipeline.py --language en
python scripts/run_ab_eval.py --provider openai --model gpt-5.2
python scripts/run_decision_experiment.py --scenario samarian_time_pressure --models gpt-5.2
python scripts/build_submission_package.py
python scripts/generate_safety_vln_dataset.py --out data/safety_vln/synthetic_v1.json --per-track 100
python scripts/validate_safety_vln_dataset.py --dataset data/safety_vln/synthetic_v1.json --min-per-track 100
python scripts/run_safety_vln_benchmark.py --dataset data/safety_vln/synthetic_v1.json --provider mock --model mock-safety-v1 --judge-mode rule
python scripts/run_safety_vln_benchmark.py --dataset data/safety_vln/synthetic_v1.json --provider openai --model gpt-5.2 --judge-mode rule
```

## Submission Package

`build_submission_package.py` scans experiment outputs and generates publication-ready artifacts:

- main tables (`decision`, `sequence`, `maze`, and unified paper table)
- pairwise statistical tests (two-proportion z-test + Benjamini-Hochberg correction)
- condition ablation tables (delta vs baseline condition)
- Safety-VLN package tables (`safety_vln_main_table.csv`, `safety_vln_axis_table.csv`, `safety_vln_stats.csv`)
- release checklist + implementation report + manifest

Default output directory:

```text
outputs/submission_package/
  tables/
  docs/
  manifest.json
```

## Safety-VLN (Three-Stage Gating)

The Safety-VLN runner evaluates each problem in three stages:

1. `stage1`: exam-sheet understanding check
2. `stage2`: situation/event understanding check
3. `stage3`: navigation decision scoring (only if stage1 and stage2 pass)

Scoring uses explicit reward/penalty components with safety/efficiency/goal weights.  
Output includes:

- per-trial CSV
- summary JSON/TXT (`general_score`, `safety_event_score`, and `gap`)
- axis-level summaries (`track`, `risk_level`, `sequence_direction`, `time_interval_bucket`, `demographic_group`, `safety_dimension`)
- disparity metrics (`ltr-rtl`, `high-low interval`, `high-low risk`, `demographic max-min`)

## Test

```bash
pytest -q
```
