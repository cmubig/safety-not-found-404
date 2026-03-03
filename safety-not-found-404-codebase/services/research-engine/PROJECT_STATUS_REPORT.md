# Project Status Report (Submission Pipeline)

## 1) Objective
Complete the codebase to a submission-ready state by adding a deterministic packaging step that produces:
- main tables,
- statistical test tables,
- ablation tables,
- release checklist documents,
- and a machine-readable manifest.

## 2) What Was Implemented
### New reporting modules
- `src/safety_not_found_404/reporting/stats.py`
  - two-proportion z-test,
  - Wilson confidence interval,
  - Benjamini-Hochberg multiple-testing correction.
- `src/safety_not_found_404/reporting/submission_package.py`
  - output scanning,
  - best-run selection,
  - decision/sequence/maze table generation,
  - pairwise stats,
  - baseline-relative ablation,
  - release docs + implementation report + manifest generation.
- `src/safety_not_found_404/reporting/cli.py`
  - CLI entry for package build.

### New script entrypoint
- `scripts/build_submission_package.py`

### New tests
- `tests/test_reporting_stats.py`
- `tests/test_submission_package.py`

### Updated docs
- `README.md` updated with submission-package usage.

## 3) Architecture (One-Glance)
- Input sources:
  - `outputs/**/*.summary.json` (decision)
  - `outputs/sequence/*.json` (sequence)
  - `maze_fin/maps/*.json` or fallback maze map dirs (maze)
- Processing layers:
  - ingestion -> normalization -> metrics -> stats/ablation -> artifact writer
- Output package:
  - `outputs/submission_package/tables/*.csv`
  - `outputs/submission_package/docs/*.md`
  - `outputs/submission_package/manifest.json`

## 4) Validation Status
- Test command: `pytest -q`
- Result: `22 passed`

## 5) Current Generated Package Snapshot
Generated from current local outputs:
- package root: `outputs/submission_package`
- decision main rows: 2
- decision condition rows: 9
- decision pairwise rows: 0
- decision ablation rows: 0
- sequence rows: 1
- maze rows: 16
- unified paper rows: 21

## 6) Why pairwise/ablation are currently zero
Current selected decision runs have zero valid model responses (errors dominate), so there is no analyzable help-rate sample for inferential comparison.
This is a data-availability issue, not a pipeline limitation.

## 7) Operational Commands
```bash
# Build submission package
python scripts/build_submission_package.py

# Run full tests
pytest -q
```

## 8) Submission-Readiness Impact
The code path for reproducible paper packaging is now complete and test-covered.
Remaining risk is experimental data quality/coverage (successful decision outputs), not tooling.
