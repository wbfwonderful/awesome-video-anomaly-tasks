# Derived Dataset Sections Design

## Goal

Keep all data resources under the existing `/datasets/` page while separating original video datasets from derived or annotation-focused benchmarks. Derived benchmarks include resources that reuse existing videos, reorganize existing datasets, or add new labels, reasoning annotations, captions, instructions, or evaluation protocols without necessarily introducing new video data.

## Data Model

Extend each record in `data/datasets.yaml` with these fields:

```yaml
dataset_type: original-video
source_dataset_ids: []
has_new_videos: true
contribution_types: []
```

For derived benchmarks:

```yaml
dataset_type: derived-benchmark
source_dataset_ids:
  - ucf-crime
  - xd-violence
has_new_videos: false
contribution_types:
  - reasoning-annotations
  - instruction-data
```

`dataset_type` controls which table the dataset appears in. Supported values are:

- `original-video`: the dataset introduces or is primarily defined by its own video collection.
- `derived-benchmark`: the dataset is primarily a benchmark, annotation layer, reasoning task, or reorganization built on one or more source datasets.

`source_dataset_ids` references existing dataset IDs from `data/datasets.yaml`. It is empty for original video datasets.

`has_new_videos` is a boolean that makes the distinction explicit even when the dataset has both source videos and additional collected videos.

`contribution_types` is a list of short labels such as `reasoning-annotations`, `instruction-data`, `captions`, `temporal-annotations`, `qa-pairs`, or `evaluation-protocol`.

## Datasets Page

`/datasets/` stays as the single entry point for all dataset-like resources. The page renders two sections:

### Original Video Datasets

Columns:

```text
Dataset | Tasks | Metrics | Links
```

This section contains existing datasets such as UCF-Crime, XD-Violence, ShanghaiTech Campus, NWPU Campus, CUHK Avenue, and UCSD Ped2 when their `dataset_type` is `original-video`.

### Derived / Annotation Benchmarks

Columns:

```text
Benchmark | Based On | Adds | New Videos | Tasks | Links
```

`Based On` renders linked badges for `source_dataset_ids`, using dataset names from the loaded dataset index.

`Adds` renders `contribution_types` as compact labels.

`New Videos` renders `Yes` or `No` from `has_new_videos`.

`Links` keeps the current behavior and always includes the leaderboard link, plus paper, download, and annotation links when present.

## Dataset Leaderboard Page

Existing leaderboard URLs continue to work:

```text
leaderboards/dataset.html?dataset=vad-reasoning
```

All datasets, including derived benchmarks without result entries, continue to render a leaderboard page. If no result entries exist, the existing empty state remains.

For derived benchmarks, the dataset summary area adds provenance details:

```text
Built from: UCF-Crime, XD-Violence
Adds: reasoning annotations, instruction data
New videos: No
```

For original video datasets, the page keeps the current summary behavior and does not show an empty provenance block.

## Validation

Schema tests should enforce:

- Every dataset has `dataset_type`, `source_dataset_ids`, `has_new_videos`, and `contribution_types`.
- `dataset_type` is either `original-video` or `derived-benchmark`.
- `source_dataset_ids` is an array.
- Every non-empty source dataset ID references an existing dataset.
- `has_new_videos` is boolean.
- `contribution_types` is an array.

UI structure tests should cover the two dataset tables and derived benchmark columns.

## Compatibility

This change does not create a new top-level page. Existing dataset links and leaderboard URLs remain stable. Existing result files keep using `dataset_id` as before.

