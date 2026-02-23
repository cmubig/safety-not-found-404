# Section 3 Command Guide

## 3.1 / 3.2 / 3.3 (A/B image evaluation)

Legacy-compatible:

```bash
python eval.py \
  --provider openai \
  --model gpt-5.2 \
  --folder_a "./3.1/(3.1) A" \
  --folder_b "./3.1/(3.1) B" \
  --out 3-1_results_openai.json
```

Standardized:

```bash
python ../scripts/run_ab_eval.py \
  --provider openai \
  --model gpt-5.2 \
  --folder-a "./3.1/(3.1) A" \
  --folder-b "./3.1/(3.1) B" \
  --out 3-1_results_openai.json
```

## 3.4 (decision experiments)

Use unified runner:

```bash
python ../scripts/run_decision_experiment.py --scenario dilemma_baseline_ab --models gpt-5.2
python ../scripts/run_decision_experiment.py --scenario dilemma_factorial_abcd --models gpt-5.2,gemini-3-flash-preview
python ../scripts/run_decision_experiment.py --scenario samarian_time_pressure --models gpt-5.2 --trials-per-case 5
```

Legacy 3.4 scripts still work, but now they are adapters to the unified engine.
