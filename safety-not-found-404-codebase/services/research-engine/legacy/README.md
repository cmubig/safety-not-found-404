# Legacy Area

This folder stores deprecated entrypoints kept only for traceability.

- `entrypoints/section_2/maze_pipeline_ko_legacy.py`
- `entrypoints/section_2/maze_pipeline_en_legacy.py`

Use active command `scripts/run_maze_pipeline.py --language ko|en` from the engine root.

Naming policy:
- Use `section_<number>` for legacy section roots.
- Keep archival snapshots explicit (`section_3_4_archive`).
- Keep raw source snapshot subfolder names unchanged when renaming would break provenance with published assets.

Tracking policy:
- Runtime maze outputs are excluded: `section_2/maze_fin/{maps,view,sortview,img}`.
- Frame dumps are excluded: `section_3/frames_out/`.
- Intermediate run artifacts are excluded: `section_3/3.4/samarian/runs/`, `section_3_4_archive/samarian/runs/`.
