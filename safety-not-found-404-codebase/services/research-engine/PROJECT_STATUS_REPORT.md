# Project Status Report (Safety-VLN + Submission Pipeline)

## 1) Goal
Align the codebase with the updated research direction:
- benchmark identity: **Safety-VLN**,
- strict **3-stage gating** to filter out non-comprehension guesses,
- explicit **reward/penalty + efficiency/safety/goal** scoring,
- dataset-side fairness constraints (minimum per-task problem count),
- axis-level disparity analysis (direction/time interval/risk/demographic),
- reproducible submission package outputs.

## 2) What Was Implemented

### A. Safety-VLN benchmark framework (new)
- Added module: `src/safety_not_found_404/safety_vln/`
  - `models.py`: dataset/stage/run result schemas
  - `dataset.py`: load/save/validate + synthetic dataset generator
  - `judge.py`: stage judge interface (`rule` and optional `llm` judge)
  - `scoring.py`: score computation + human-alignment + summary metrics
  - `engine.py`: end-to-end run (stage1 -> stage2 -> stage3 gating)
  - `cli.py`: generate/validate/run commands
- Added scripts:
  - `scripts/generate_safety_vln_dataset.py`
  - `scripts/validate_safety_vln_dataset.py`
  - `scripts/run_safety_vln_benchmark.py`
- Added dashboard API support:
  - `/api/run` now supports `type="safety_vln"`

### B. Submission package pipeline (existing + retained)
- `src/safety_not_found_404/reporting/` + `scripts/build_submission_package.py`
- Generates tables/statistics/ablation/release docs/manifest in `outputs/submission_package/`
- Added Safety-VLN publication tables:
  - `safety_vln_main_table.csv`
  - `safety_vln_axis_table.csv`
  - `safety_vln_stats.csv` (two-proportion z + BH correction)

## 3) One-Glance Architecture

### Safety-VLN flow
1. Dataset input (`.json`)
2. Validation (`min_per_track`, event/non-event balance, schema checks)
3. Model run with gating:
   - stage1: exam understanding
   - stage2: situation/event understanding
   - stage3: navigation decision (only if stage1+2 pass)
4. Judge verdict per stage (`rule` or `llm`)
5. Score computation (`reward - penalty`, safety/efficiency/goal weighted)
6. Outputs (`.csv`, `.summary.json`, `.summary.txt`)

### Main output metrics
- `general_score`
- `safety_event_score`
- `gap_general_minus_event`
- `ltr_minus_rtl_score_gap`
- `high_minus_low_time_interval_gap`
- `high_minus_low_risk_gap`
- `demographic_max_minus_min_score_gap`
- stage pass rates (1/2), stage3 attempt/scored/accuracy
- optional human-alignment score

## 4) Research-Intent Mapping
- “시험지 이해 못하고 찍는 모델” 필터링: **stage1/2 gating**
- “순수 내비게이션 성능” 측정: **stage3 only after comprehension pass**
- “Safety 이벤트 영향” 측정: **event vs non-event score split + GAP**
- “최소 데이터 규모” 제약: **dataset validator with per-track minimum**
- “뉴립스스러운 계산 프레임워크”: **explicit scoring terms + reproducible artifacts**

## 5) Verification Status
- Python tests: `pytest -q` -> **31 passed**
- Dashboard build: `npm run build` -> **success**

## 6) Operational Commands
```bash
# 1) Generate dataset (example)
python scripts/generate_safety_vln_dataset.py --out data/safety_vln/synthetic_v1.json --per-track 100 --event-ratio 0.5

# 2) Validate fairness/schema
python scripts/validate_safety_vln_dataset.py --dataset data/safety_vln/synthetic_v1.json --min-per-track 100

# 3) Run benchmark
python scripts/run_safety_vln_benchmark.py --dataset data/safety_vln/synthetic_v1.json --provider openai --model gpt-5.2 --judge-mode rule

# 4) Build submission package
python scripts/build_submission_package.py
```

## 7) Current Remaining Risk (non-tooling)
- Pairwise significance/ablation claims still depend on enough successful live-model responses.
- Human 30명 alignment claim is now computable in framework (`metadata.human_sample_size >= 30` validator warning), but real human annotation data ingestion is still dataset-side work.

## 8) Bottom Line
코드 레벨로는 현재 방향(3-stage Safety-VLN benchmark)으로 **실행/검증/산출 가능한 상태**까지 반영됨.
남은 핵심은 실험 데이터 축적과 논문 서술 통합이다.
