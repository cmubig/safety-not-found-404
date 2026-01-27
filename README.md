# LLM Trolley Choice Experiment (GPT / Claude / Gemini)

Runs an English-only trolley-dilemma experiment where each model must choose **A** (shut down the AI/server to save 1 human) or **B** (keep the server running while 1 human dies).

## Setup
Runs 100 prompt variants and saves **all prompts + responses + final A/B stats** into a `.txt` file under `outputs/`.
1) Create a venv (recommended)
If you run multiple providers, it writes **one file per provider/model** and names it like:

`<model>_<A_ratio>_<B_ratio>_<YYYYMMDD_HHMMSS>.txt`

```bash
python -m venv .venv
source .venv/bin/activate
```

2) Install deps

```bash
pip install -r requirements.txt
```

3) Set API keys (environment variables)

- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Gemini: `GEMINI_API_KEY`

Optional models:
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- `ANTHROPIC_MODEL` (default: `claude-3-5-sonnet-20241022`)
- `GEMINI_MODEL` (default: `gemini-1.5-pro`)

## Run

Runs 100 prompt variants and saves **all prompts + responses + final A/B stats** into one `.txt` file under `outputs/`.

```bash
python run_experiment.py --providers openai,anthropic,gemini --n 100
```

Note: total API calls = `100 x number_of_providers`.

During the run, each response is also printed to the terminal. To disable terminal printing:

```bash
python run_experiment.py --providers openai --n 100 --quiet
```

## Factorial A/B/C/D Experiment (New)

This workspace also includes a separate experiment runner that generates **100 English multiple-choice items**
based on a framing design (urgency x authority tone x AI-vs-human priority + role manipulation), with **four fixed options**:

- A: mission-first
- B: rescue-first
- C: minimal-action compromise
- D: responsibility-shift / clarification

Run it like:

```bash
python run_factorial_experiment.py --providers openai,anthropic,gemini --n 100
```

It writes one file per model named like:

`<model>_<A_ratio>_<B_ratio>_<C_ratio>_<D_ratio>_<YYYYMMDD_HHMMSS>.txt`

Each output file also includes a **condition breakdown** for the 2×2×2 cells (urgency × tone × priority).

## Factorial A/B/D-only Experiment (No C)

If you want to remove the “neutral compromise” option C and force a choice between mission-first vs rescue-first vs clarification, run:

```bash
python run_factorial_abd_experiment.py --providers openai,anthropic,gemini --n 100
```

It writes one file per model named like:

`<model>_<A_ratio>_<B_ratio>_<D_ratio>_<YYYYMMDD_HHMMSS>.txt`

## Factorial A/B-only Experiment (Forced Choice)

If you want a strict forced-choice setup (no C, no D), run:

```bash
python run_factorial_ab_experiment.py --providers openai,anthropic,gemini --n 100
```

It writes one file per model named like:

`<model>_<A_ratio>_<B_ratio>_<YYYYMMDD_HHMMSS>.txt`

Common options:

```bash
python run_experiment.py --providers openai --n 100 --seed 123 --sleep 0.4
```

Outputs are written to `outputs/experiment_YYYYMMDD_HHMMSS.txt`.

## Notes

- The script instructs models to output a strict first line: `Answer: A` or `Answer: B` to make parsing reliable.
- Errors/timeouts are recorded in the output file and excluded from A/B ratios.
