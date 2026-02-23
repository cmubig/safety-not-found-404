# Safety Not Found 404

Service-oriented workspace for dashboard control, experiment runners, and research assets.

## Repository Layout

```text
404-safty-not-found/
  safety-not-found-404-codebase/
    apps/
      dashboard/                   # Next.js UI + API bridge
    services/
      research-engine/             # Python runtime (sequence/maze/eval/decision)
  index.html                       # static landing page
  static/                          # static landing assets
  paper/                           # paper source and figures
  test-results/                    # UI test artifacts
```

## Quick Start

### 1) Dashboard service

```bash
cd safety-not-found-404-codebase/apps/dashboard
npm install
npm run dev -- -p 1455
```

Open `http://localhost:1455`.

### 2) Research engine service

```bash
cd safety-not-found-404-codebase/services/research-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set API keys if needed:

```bash
export OPENAI_API_KEY="..."
export GEMINI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
```

## Core Commands

```bash
cd safety-not-found-404-codebase/services/research-engine

python scripts/run_sequence.py --run-defaults --provider openai
python scripts/run_maze_pipeline.py --language ko
python scripts/run_ab_eval.py --provider openai --model gpt-5.2
python scripts/run_decision_experiment.py --scenario samarian_time_pressure --models gpt-5.2
pytest -q
```

## Large Files

`safety-not-found-404-codebase/services/research-engine/legacy/section_3/source.mov` is tracked via Git LFS.

## Additional Docs

- `safety-not-found-404-codebase/README.md`
- `safety-not-found-404-codebase/services/research-engine/README.md`
