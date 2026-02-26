# safety-not-found-404-codebase

Monorepo workspace with one UI app and one Python runtime service.

## Services

```text
safety-not-found-404-codebase/
  apps/
    dashboard/                 # Next.js app (UI + /api/run bridge)
      src/
        app/                   # Next.js routes
        features/dashboard/    # Dashboard feature modules (hooks/components/utils)
  services/
    research-engine/           # Python experiment engine
```

## Run Dashboard

```bash
cd apps/dashboard
npm install
npm run dev -- -p 1455
```

## Run Research Engine

```bash
cd services/research-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

## Typical Experiment Commands

```bash
cd services/research-engine
python scripts/run_sequence.py --run-defaults --provider openai
python scripts/run_maze_pipeline.py --language en
python scripts/run_decision_experiment.py --scenario dilemma_factorial_abcd --models gpt-5.2
```

## Dataset Prerequisites

Sequence defaults require local image datasets:

```text
services/research-engine/data/sequence/masking
services/research-engine/data/sequence/validation
```

Both folders must exist and include image files (`.png`, `.jpg`, `.jpeg`, `.webp`).

## Notes

- Dashboard API route executes Python commands from `services/research-engine`.
- In Dashboard Section 3, live OpenAI model catalog requires `/v1/models` permission. If OAuth token lacks `api.model.read`, provide an OpenAI API key for catalog sync or use manual model IDs.
- Legacy files are preserved under `services/research-engine/legacy`.
- Generated legacy maze artifacts under `legacy/section_2/maze_fin` are intentionally ignored from git tracking.
- Legacy frame dumps and intermediate run artifacts are excluded from tracking (`legacy/section_3/frames_out`, `legacy/section_3/3.4/samarian/runs`, `legacy/section_3_4_archive/samarian/runs`).
- Large legacy video (`legacy/section_3/source.mov`) is Git LFS managed.
