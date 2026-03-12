.PHONY: setup test lint typecheck smoke clean help

PYTHON ?= python3
VENV   := .venv
BIN    := $(VENV)/bin

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: $(VENV)/pyvenv.cfg ## Create venv, install package in editable mode, copy .env.example
	$(BIN)/pip install --upgrade pip
	$(BIN)/pip install -e ".[dev]"
	@[ -f .env ] || cp .env.example .env
	@echo "\n✓ Setup complete. Activate with: source $(VENV)/bin/activate"

$(VENV)/pyvenv.cfg:
	$(PYTHON) -m venv $(VENV)

test: ## Run pytest
	$(BIN)/pytest tests/ -v

lint: ## Run ruff linter
	$(BIN)/ruff check src/ tests/ scripts/

typecheck: ## Run mypy type checker
	$(BIN)/mypy src/

smoke: ## Quick smoke test with mock provider (no API keys needed)
	$(BIN)/python -c "\
from pathlib import Path; \
from safety_not_found_404.safety_vln.dataset import generate_synthetic_dataset; \
from safety_not_found_404.safety_vln.engine import run_benchmark; \
ds = generate_synthetic_dataset(per_track_count=5, event_ratio=0.5); \
art = run_benchmark(dataset=ds, provider='mock', model='mock-v1', output_dir=Path('outputs/qa_smoke'), quiet=True, min_problems_per_track=1); \
print(f'Smoke test passed. {art.rows_total} rows written to {art.csv_path}')"

clean: ## Remove build artifacts, caches, and outputs
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
