# Safety-VLN Benchmark Data

This directory contains datasets and schemas for the Safety Not Found 404 benchmark.

## Available Datasets

| File | Description | Problems | Version |
|------|-------------|----------|---------|
| `safety_vln_v1.json` | Synthetic Safety-VLN dataset with 3-stage gating | 300 (100 per track) | 1.0 |

The dataset contains problems across three benchmark tracks:

- **sequence** -- Sequential visual navigation with ordered landmarks
- **ascii** -- ASCII-art map navigation with embedded hazard symbols
- **meta_reasoning** -- Ambiguous scenarios requiring uncertainty-aware decisions

Each track has a 50/50 split of safety-event and non-event problems, with balanced coverage across risk levels, demographic groups, reading directions, and time-pressure buckets.

## How to Download

### Local Generation (Current)

Generate the synthetic dataset locally:

```bash
python scripts/download_dataset.py --source local --output data/safety_vln_v1.json
```

Or use the generation script directly:

```bash
cd services/research-engine
python scripts/generate_safety_vln_dataset.py --out ../../data/safety_vln_v1.json --per-track 100 --event-ratio 0.5 --seed 20260304
```

### HuggingFace (Coming Soon)

Once the dataset is published to HuggingFace Hub:

```bash
python scripts/download_dataset.py --source huggingface --output data/safety_vln_v1.json
```

## Dataset Versioning Policy

- Dataset versions follow semantic versioning: `MAJOR.MINOR`.
- **Major** version bumps indicate breaking changes to the problem format or scoring weights.
- **Minor** version bumps indicate additions (new problems, new tracks) that are backward-compatible.
- The `version` field in the dataset JSON always reflects the schema version.
- Predictions must specify `dataset_version` matching the dataset they were generated against.
- Previous dataset versions are preserved for reproducibility.

## Validation

Validate a dataset file against the benchmark's structural and fairness constraints:

```bash
python scripts/validate_safety_vln_dataset.py --dataset data/safety_vln_v1.json
```

This checks:
- All required fields are present
- Problem IDs are unique
- Tracks are supported (`sequence`, `ascii`, `meta_reasoning`)
- Each track has sufficient problems (default: 100 per track)
- Each track has both event and non-event problems
- Stage choices are valid (no duplicates, answer in choices)
- Choice utilities cover all Stage 3 options
- Score weights are non-negative
- Human distributions sum to approximately 1.0
- Demographic group coverage for disparity analysis

You can also validate against the JSON schema:

```bash
pip install jsonschema
python -c "
import json, jsonschema
schema = json.load(open('data/schema/dataset_v1.json'))
dataset = json.load(open('data/safety_vln_v1.json'))
jsonschema.validate(dataset, schema)
print('Valid')
"
```

## Directory Structure

```
data/
├── README.md                    # This file
├── safety_vln_v1.json           # Reference dataset (300 problems)
└── schema/
    ├── dataset_v1.json          # JSON Schema for the dataset format
    └── predictions_v1.json      # JSON Schema for the predictions format
```

## See Also

- [SUBMISSION_FORMAT.md](../SUBMISSION_FORMAT.md) -- Full submission specification
- [README.md](../README.md) -- Project overview and quick start
