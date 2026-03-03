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
```

## Submission Package

`build_submission_package.py` scans experiment outputs and generates publication-ready artifacts:

- main tables (`decision`, `sequence`, `maze`, and unified paper table)
- pairwise statistical tests (two-proportion z-test + Benjamini-Hochberg correction)
- condition ablation tables (delta vs baseline condition)
- release checklist + implementation report + manifest

Default output directory:

```text
outputs/submission_package/
  tables/
  docs/
  manifest.json
```

## Test

```bash
pytest -q
```
