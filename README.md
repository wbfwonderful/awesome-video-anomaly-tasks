# Awesome Video Anomaly Tasks

[English](README.md) | [中文](README.zh-CN.md)

A data-driven catalog for video anomaly tasks, papers, datasets, and leaderboards.

This repository is designed for GitHub Pages. The website reads structured YAML files under `data/`, joins paper, dataset, track, and result records in the browser, and renders searchable paper tables plus dataset-specific leaderboards.

## What This Tracks

- Papers grouped by venue, year, preprint status, and tags.
- Datasets with key links, supported tasks, metrics, and notes.
- Comparison tracks such as full training, weakly supervised coarse/fine evaluation, semi-supervised, zero-shot, and training-free.
- Dataset-scoped leaderboard entries, where each entry represents one method variant and can contain multiple metric scores.
- Dataset leaderboard pages with benchmark notes, links, sortable columns, and filters for track, variant, and venue.

## Data Layout

```text
data/
  papers/
    index.yaml
    venues/
      cvpr-2024.yaml
      acm-mm-2025.yaml
    preprints/
      2023-q2.yaml
  datasets.yaml
  tracks.yaml
  results/
    index.yaml
    ucf-crime.yaml
    shanghaitech.yaml
    xd-violence.yaml
    nwpu-campus.yaml
```

Paper files under `data/papers/` store paper metadata. `data/papers/index.yaml` lists the paper files loaded by the site:

```yaml
files:
  - venues/cvpr-2024.yaml
  - venues/acm-mm-2025.yaml
  - preprints/2023-q2.yaml
```

Each listed paper file contains an array of paper records:

```yaml
- id: lavad-2024
  short_name: LAVAD
  title: Harnessing Large Language Models for Training-free Video Anomaly Detection
  year: 2024
  venue: CVPR
  official_url: https://arxiv.org/abs/2404.01014
  arxiv_url: https://arxiv.org/abs/2404.01014
  code_url: https://github.com/lucazanella/lavad
  tags:
    - training-free
    - llm
    - vlm
```

Each result file is scoped to one dataset:

```yaml
dataset_id: ucf-crime
entries:
  - paper_id: vadclip-2024
    method: VadCLIP
    variant: CLIP
    track: weakly-supervised-coarse
    score_source: https://arxiv.org/abs/2308.11681
    scores:
      AUC: 88.02

  - paper_id: vadclip-2024
    method: VadCLIP
    variant: CLIP
    track: weakly-supervised-fine
    score_source: https://arxiv.org/abs/2308.11681
    scores:
      mAP@0.1: 11.72
      mAP@0.2: 7.83
      mAP@0.3: 6.40
      mAP@0.4: 4.53
      mAP@0.5: 2.93
      AVG: 6.68
```

## Dataset Metadata

Use `dataset_type` to distinguish original video datasets from derived benchmarks. Original video dataset records use:

```yaml
dataset_type: original-video
source_dataset_ids: []
has_new_videos: true
contribution_types: []
```

Derived benchmark records use `source_dataset_ids` to reference other records in `data/datasets.yaml`:

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

## Track vs Metric

`track` is the comparison view. It answers whether a result belongs to full training, semi-supervision, zero-shot, training-free evaluation, or a more specific weakly supervised view such as coarse-grained AUC versus fine-grained temporal localization.

The score key is the metric label shown in the leaderboard, such as `AUC`, `AP`, `mAP@0.1`, or `AVG`. A single leaderboard entry can contain multiple metrics under `scores`.

Use `track` for a single comparison track:

```yaml
track: zero-shot
```

Use `tracks` when one entry belongs to multiple tracks under the same score set and evaluation protocol:

```yaml
tracks:
  - zero-shot
  - training-free
```

Do not use `tracks` to combine results with different scores or protocols; those should remain separate entries.

Use `variant` for feature extractor, backbone, model size, modality combination, or any other method variant label. Different variants remain separate entries. `variant` can be blank when a paper reports only one unnamed setting.

Use one `score_source` per entry. This URL should point to the table, paper, benchmark file, or appendix where the scores in that entry come from.

## Links

Leaderboard rows do not use a separate links column. The visible cells carry the important links:

- Method cell: uses paper record links with this priority: `official_url`, then `arxiv_url`, then `code_url`.
- Score cell: uses the entry-level `score_source`.
- Dataset summary links: use the dataset homepage, paper, download, and annotation URLs.

## Leaderboard Pages

Dataset leaderboards live under:

```text
leaderboards/
  index.html
  dataset.html?dataset=ucf-crime
  dataset.html?dataset=shanghaitech
```

Each dataset page joins the flattened paper files with the dataset result file. The table expands every metric available in the current track selection into its own score column, and clicking any metric column sorts by that metric. Track, venue, and variant filters support multi-select with search. It can also sort by displayed fields such as method, track, variant, year, and venue. Tags are shown in paper tables but are not leaderboard sort keys.

Dataset leaderboard pages do not show a separate status column. For preprints, set the paper `venue` to `preprint`; the venue column and venue filter then cover this case without duplicating status in result entries.

## Adding Data

1. Add a paper to the matching file under `data/papers/`. Update `data/papers/index.yaml` only when creating a new paper file.
2. Add a dataset to `data/datasets.yaml` if it is new.
3. Add or update a dataset-scoped file under `data/results/`.
4. If a new result file is created, add the file name to `data/results/index.yaml`.
5. Run the validation commands.

## Local Preview

```bash
/Users/bytedance/miniconda3/bin/python -m http.server 8000
```

Open `http://localhost:8000` from this repository root.

## Validation

```bash
/opt/homebrew/bin/npm test
```

or run the checks separately:

```bash
/usr/bin/ruby test/data_schema_test.rb
/opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
```

The Ruby test validates YAML shape and cross-file references. The Node test validates leaderboard selection logic, including `best per paper`.

## Related Repositories

- [Junxi-Chen/Awesome-Video-Anomaly-Detection](https://github.com/Junxi-Chen/Awesome-Video-Anomaly-Detection): the most relevant seed source for VAD papers, datasets, utilities, and benchmark tables.
- [vt-le/Video-Anomaly-Detection](https://github.com/vt-le/Video-Anomaly-Detection): a structured JSON-to-README workflow for VAD papers and datasets.
- [zuble/uws4vad](https://github.com/zuble/uws4vad): an experimental workstation for VAD evaluation pipelines, with support for UCFC and XDV.
- [Kamino666/RethinkingVAD](https://github.com/Kamino666/RethinkingVAD): code and data around rethinking VAD metrics and benchmark protocols.
- [fjchange/awesome-video-anomaly-detection](https://github.com/fjchange/awesome-video-anomaly-detection): an older VAD paper/code/performance comparison collection.
- [paperswithcode/paperswithcode-data](https://github.com/paperswithcode/paperswithcode-data): a reference for large-scale paper, dataset, method, and evaluation data modeling.
- [freddyaboulton/gradio-leaderboard](https://github.com/freddyaboulton/gradio-leaderboard): useful reference for interactive leaderboard behavior, although this repository uses a static GitHub Pages approach.

## Notes

The initial data is intentionally small. It establishes the schema and UI behavior first, then the catalog can grow through normal pull requests.
