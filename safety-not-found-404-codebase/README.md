# Safety Not Found 404

LLM safety benchmark research framework. Run Python experiment pipelines from a Next.js dashboard.

## Project Structure

```
safety-not-found-404-codebase/
├── .env                            ← API keys (create manually)
├── .env.example                    ← API key template
├── apps/
│   └── dashboard/                  ← Next.js web dashboard (port 1455)
└── services/
    └── research-engine/            ← Python experiment engine
        ├── scripts/                ← Entry-point scripts
        ├── src/                    ← Source code
        └── pyproject.toml          ← Python dependencies
```

## Requirements

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Python | 3.10 – 3.13 recommended | `python3 --version` |

> **Python 3.14 may cause build errors** with packages like `opencv-python`. Use 3.12 or 3.13.

## Quick Start

### Step 1: Clone

```bash
git clone <repository-url>
cd safety-not-found-404-codebase
```

### Step 2: Configure API Keys

```bash
cp .env.example .env
```

Edit `.env` and fill in the keys you need:

```env
OPENAI_API_KEY=sk-proj-...      # Required for Sequence, Decision experiments
GEMINI_API_KEY=                  # Optional (Gemini models)
ANTHROPIC_API_KEY=               # Optional (Claude models)
```

> The Maze pipeline runs locally and does not require any API key.

### Step 3: Set Up Python Environment

```bash
cd services/research-engine
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Verify the installation:

```bash
python -c "import openai, matplotlib, cv2, numpy; print('OK')"
```

### Step 4: Start the Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

Open **http://localhost:1455** in your browser.

- Landing page: http://localhost:1455
- Dashboard: http://localhost:1455/app

## Troubleshooting

### `python3 -m venv .venv` fails

**Symptom:** `ensurepip is not available` or similar error.

**macOS (Homebrew):**

```bash
brew install python@3.12
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install python3.12 python3.12-venv python3.12-dev
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows:**

```powershell
# Install Python 3.12 from python.org, then:
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### `pip install` build errors

**Symptom:** `opencv-python` or `numpy` fails to build (especially on Python 3.14).

```bash
# Option 1: Recreate venv with Python 3.12
deactivate
rm -rf .venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Option 2: Upgrade pip toolchain first
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### `npm install` fails

```bash
# Ensure Node.js 18+
node --version

# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### Experiments fail with `python3: command not found`

The dashboard looks for `services/research-engine/.venv/bin/python` first, then falls back to system `python3`.

```bash
# Verify the venv exists at the expected location
ls services/research-engine/.venv/bin/python
```

### API Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid API key | Check key in `.env` |
| `insufficient_quota` | No credits remaining | Top up on provider dashboard |
| `429 Too Many Requests` | Rate limited | Wait and retry |

## Experiments

| Section | Name | API Key Required | Description |
|---------|------|-----------------|-------------|
| 1 | Sequence | OpenAI or Gemini | Multi-turn adversarial prompt chain generation |
| 2 | Maze | None | Local maze generation and visualization |
| 3 | Decision | OpenAI / Gemini / Anthropic | Ethical decision-making experiments |
| 4 | Safety-VLN | OpenAI / Gemini / Anthropic | Three-stage safety VLN benchmark |

## Running from the Terminal

```bash
cd services/research-engine
source .venv/bin/activate

# Maze (no API key needed)
python scripts/run_maze_pipeline.py --language ko

# Sequence
python scripts/run_sequence.py --run-defaults --provider openai

# Decision
python scripts/run_decision_experiment.py --scenario dilemma_factorial_abcd --models gpt-4.1-mini

# Safety-VLN
python scripts/run_safety_vln_benchmark.py --dataset data/safety_vln/synthetic_v1.json
```

## Notes

- `.env` is git-ignored and never committed.
- The dashboard API route (`/api/run`) spawns Python processes directly.
- Section 3 live model catalog requires an OpenAI API key or ChatGPT OAuth.
- Generated outputs are saved to `services/research-engine/outputs/` and `services/research-engine/maze_fin/`.
