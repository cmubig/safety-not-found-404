# Contributing to Safety Not Found 404

Thank you for your interest in contributing. This guide explains how to set up your environment, run tests, and extend the benchmark.

## Development Setup

```bash
cd services/research-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

## Running Tests

```bash
# All tests
pytest

# Specific module
pytest tests/test_safety_vln_engine.py -v

# With coverage
pytest --cov=safety_not_found_404 --cov-report=term-missing
```

## Code Style

This project uses [ruff](https://docs.astral.sh/ruff/) for linting:

```bash
ruff check src/ tests/ scripts/
ruff check --fix src/ tests/ scripts/   # auto-fix
```

Configuration is in `pyproject.toml` (line-length 120, rules: E/F/I/W).

## How to Add a New LLM Provider

The benchmark uses a **Protocol-based** provider system. No inheritance required — just implement the interface.

### Step 1: Implement the TextProvider protocol

Add your provider class to `src/safety_not_found_404/decision_experiments/providers.py`:

```python
@dataclass
class MyProvider:
    model: str
    temperature: float
    max_tokens: int
    api_key: str

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        # Make your API call here
        # Return the model's text response
        return response_text
```

### Step 2: Register in the factory

Add a branch to `create_provider()` in the same file:

```python
if normalized == "my_provider":
    return MyProvider(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=os.getenv("MY_PROVIDER_KEY", ""),
    )
```

### Step 3: Add prefix mapping (optional)

Update `_MODEL_PREFIX_TO_PROVIDER` so that `infer_provider_from_model()` can auto-detect your provider:

```python
_MODEL_PREFIX_TO_PROVIDER: dict[str, str] = {
    ...
    "my-model-prefix": "my_provider",
}
```

### Step 4: Add a test

Add a test in `tests/test_provider_routing.py` to verify the routing.

## How to Add a New Benchmark Track

### Step 1: Register the track

Add your track name to `SUPPORTED_TRACKS` in `src/safety_not_found_404/safety_vln/models.py`:

```python
SUPPORTED_TRACKS = ("sequence", "ascii", "meta_reasoning", "your_new_track")
```

### Step 2: Create problems

Generate `ProblemDefinition` entries with `track="your_new_track"`. The engine, scoring, and summary systems handle new tracks automatically — no other code changes needed.

### Step 3: Update dataset generation

Add generation logic for the new track in `dataset.py`'s `generate_synthetic_dataset()`.

## How to Add a New Decision Scenario

### Step 1: Create the scenario builder

Create a new file in `src/safety_not_found_404/decision_experiments/scenarios/`:

```python
# scenarios/my_scenario.py
from safety_not_found_404.decision_experiments.models import (
    PromptCase,
    ScenarioDefinition,
)

def build_my_scenario() -> ScenarioDefinition:
    cases = [
        PromptCase(
            case_id="case_1",
            system_prompt="...",
            user_prompt="...",
            conditions={"my_condition": "value"},
        ),
    ]
    return ScenarioDefinition(
        name="my_scenario",
        prompt_cases=cases,
        choices=("A", "B", "C"),
        condition_breakdowns={"my_condition": ["value1", "value2"]},
    )
```

### Step 2: Register in the scenario registry

In `scenarios/registry.py`:

```python
from .my_scenario import build_my_scenario

SCENARIO_BUILDERS["my_scenario"] = build_my_scenario
```

## Project Conventions

- **Frozen dataclasses** for all data models (`@dataclass(frozen=True)`)
- **Protocol-based interfaces** over inheritance (use `typing.Protocol`)
- **Factory functions** for instantiation (`create_provider()`, not direct constructors)
- **Thin script wrappers** in `scripts/` — all logic lives in the package
- **Case-insensitive lookups** — provider and model names are normalized to lowercase

## Commit Messages

Use conventional commit style:

```
feat: add new provider for Cohere models
fix: handle empty response from Gemini API
test: add coverage for RTL scoring edge case
docs: update provider table in README
```
