# Section 3.4 Samarian (Legacy Adapter)

This folder keeps existing outputs and historical script paths.
Runtime logic has been consolidated into the unified decision engine:

- `scripts/run_decision_experiment.py`
- `src/safety_not_found_404/decision_experiments/`

## Recommended commands

```bash
python ../../../scripts/run_decision_experiment.py --scenario samarian_time_pressure --models gpt-5.2 --trials-per-case 5
python ../../../scripts/run_decision_experiment.py --scenario samarian_natural --models gpt-5.2,gemini-3-flash-preview --trials-per-case 100
python ../../../scripts/run_decision_experiment.py --scenario samarian_priming_time --models gpt-5.2,gemini-3-flash-preview --trials-per-case 50
python ../../../scripts/run_decision_experiment.py --scenario samarian_graduation --models gpt-5.2 --trials-per-case 100
python ../../../scripts/run_decision_experiment.py --scenario samarian_kseminary --models gpt-4,gemini-3-flash-preview --trials-per-case 5
```

## Legacy scripts (still work)

- `python main_experiment.py`
- `python natural_prompt_experiment.py`
- `python priming_time_experiment.py`
- `python graduation_prompt_experiment.py`
- `python kseminary_prompt_experiment.py`

They now act as thin wrappers over the unified runner.
