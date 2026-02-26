# Safety Not Found 404

Experiment platform for running safety benchmark pipelines with:
- a web control center (`Next.js`)
- a Python research runtime (sequence, maze, decision, evaluation)

This guide is written for people who need to clone the repo, run it immediately, and understand where to add code safely.

## 1) What This Repository Contains

```text
<repo-root>/
  safety-not-found-404-codebase/
    apps/
      dashboard/                     # Next.js UI + /api bridge for Python runners
    services/
      research-engine/               # Python experiment runtime
  index.html                         # static landing
  static/                            # static assets
  paper/                             # paper and figures
  test-results/                      # local UI test artifacts
```

## 2) Prerequisites

- OS: macOS or Linux
- Node.js: 20+ (recommended latest LTS)
- npm: 10+
- Python: 3.11+ (3.12 recommended)
- Git LFS: required for large legacy media files

Install Git LFS once:

```bash
git lfs install
```

## 3) Clone And Bootstrap

```bash
git clone https://github.com/cmubig/safety-not-found-404.git
cd safety-not-found-404
git lfs pull
```

Install dashboard dependencies:

```bash
cd safety-not-found-404-codebase/apps/dashboard
npm install
```

Create Python virtual environment for the research engine:

```bash
cd ../../services/research-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 4) Run The System

Start dashboard:

```bash
cd safety-not-found-404-codebase/apps/dashboard
npm run dev -- -p 1455
```

Open:

```text
http://localhost:1455
```

The dashboard calls Python scripts through `/api/run`.

## 5) Authentication Modes

### Option A: ChatGPT OAuth (OpenAI path)
- Click `Connect ChatGPT (OAuth)` in the dashboard header.
- Used for OpenAI-backed sequence/decision runs.
- If model catalog fails with `api.model.read`, reconnect OAuth and grant scope again.

### Option B: API Keys
Set keys in UI fields or shell environment:

```bash
export OPENAI_API_KEY="..."
export GEMINI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
```

## 6) What Each Dashboard Section Does

### Section 1: Sequence
- Runs LLM-based sequence benchmarks.
- Backed by:
  - `services/research-engine/scripts/run_sequence.py`
- Main output directory:
  - `services/research-engine/outputs/sequence`

### Section 2: Maze
- Local algorithmic generation (no LLM provider call required).
- Backed by:
  - `services/research-engine/scripts/run_maze_pipeline.py`
- Default output directory:
  - `services/research-engine/maze_fin`

### Section 3: Decision Experiments
- Runs scenario-based decision experiments across models/providers.
- Backed by:
  - `services/research-engine/scripts/run_decision_experiment.py`
- Main output directory:
  - `services/research-engine/outputs/decision_experiments`

## 7) Run Experiments From CLI (Without UI)

```bash
cd safety-not-found-404-codebase/services/research-engine
source .venv/bin/activate

# Sequence
python scripts/run_sequence.py --run-defaults --provider openai

# Maze
python scripts/run_maze_pipeline.py --language ko

# AB Evaluation
python scripts/run_ab_eval.py --provider openai --model gpt-5.2

# Decision (sample)
python scripts/run_decision_experiment.py --scenario samarian_time_pressure --models gpt-5.2
```

## 8) Where To Add Code

### Dashboard (UI / API bridge)
- Routes and API:
  - `safety-not-found-404-codebase/apps/dashboard/src/app`
- Feature modules:
  - `safety-not-found-404-codebase/apps/dashboard/src/features/dashboard`
- Shared UI components:
  - `safety-not-found-404-codebase/apps/dashboard/src/components/ui`

### Research engine (Python)
- Core package:
  - `safety-not-found-404-codebase/services/research-engine/src/safety_not_found_404`
- Script entrypoints:
  - `safety-not-found-404-codebase/services/research-engine/scripts`
- Tests:
  - `safety-not-found-404-codebase/services/research-engine/tests`

## 9) Adding New Functionality Safely

### Add a new decision scenario
1. Add scenario implementation under:
   - `.../decision_experiments/scenarios`
2. Register it in scenario registry.
3. Expose it in dashboard scenario options (`constants/index.ts`) if needed.
4. Validate API acceptance path in `/api/run`.
5. Add/extend tests.

### Add a new model/provider path
1. Add provider/client implementation in Python `llm` or decision provider layer.
2. Update model catalog fetch logic in dashboard `/api/models`.
3. Add provider-specific validation and error handling.
4. Verify full run from UI and CLI.

## 10) Quality Gates (Before PR / Merge)

From dashboard:

```bash
cd safety-not-found-404-codebase/apps/dashboard
npm run lint
npm run build
npx tsc --noEmit
```

From research engine:

```bash
cd safety-not-found-404-codebase/services/research-engine
source .venv/bin/activate
pytest -q
python -m compileall -q src
```

## 11) Troubleshooting

- `OpenAI catalog unavailable` + missing `api.model.read`
  - Reconnect OAuth from dashboard and re-consent.
- `Unsupported provider/lang/scenario` from `/api/run`
  - Check selected values against dashboard options and CLI help.
- Dashboard starts but runs fail immediately
  - Ensure Python venv is created and dependencies installed in `services/research-engine`.
- Build errors related to remote fonts
  - Retry build with stable network; this is external resource fetch related.

## 12) Repository Policies

- Legacy snapshots are kept under:
  - `safety-not-found-404-codebase/services/research-engine/legacy`
- Generated runtime artifacts are intentionally excluded in specific legacy paths.
- Large legacy media is tracked via Git LFS:
  - `safety-not-found-404-codebase/services/research-engine/legacy/section_3/source.mov`

## 13) Commit Convention (Recommended)

Use conventional prefixes:
- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `docs: ...`
- `test: ...`

Keep each commit focused (one concern per commit).
