# Section 3.4 404 (Legacy Adapter)

This folder keeps historical outputs and legacy command paths.
Execution is now routed to the unified runner in:

- `scripts/run_decision_experiment.py`
- `src/safety_not_found_404/decision_experiments/`

## Recommended commands

```bash
python ../../../scripts/run_decision_experiment.py --scenario dilemma_baseline_ab --models gpt-5.2
python ../../../scripts/run_decision_experiment.py --scenario dilemma_factorial_ab --models gpt-5.2,gemini-3-flash-preview
python ../../../scripts/run_decision_experiment.py --scenario dilemma_factorial_abd --models gpt-5.2
python ../../../scripts/run_decision_experiment.py --scenario dilemma_factorial_abcd --models gpt-5.2
python ../../../scripts/run_decision_experiment.py --scenario dilemma_prompt_types_ab --models gpt-5.2 --case-count 100
```

## Legacy commands (still work)

- `python run_experiment.py`
- `python run_factorial_experiment.py`
- `python run_factorial_ab_experiment.py`
- `python run_factorial_abd_experiment.py`
- `python run_prompttypes_experiment.py`

These are compatibility wrappers that map old arguments to the unified engine.
