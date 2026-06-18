# Awesome Video Anomaly Tasks

A data-driven catalog for video anomaly tasks, papers, datasets, and leaderboards.

This repository is designed for GitHub Pages. The website reads structured YAML files under `data/`, joins paper, dataset, track, and result records in the browser, and renders searchable paper tables plus dataset-specific leaderboards.

## What This Tracks

- Papers grouped by task, venue, status, and tags.
- Datasets with key links, supported tasks, metrics, and notes.
- Comparison tracks such as full training, weakly supervised coarse/fine evaluation, semi-supervised, zero-shot, and training-free.
- Dataset-scoped leaderboard entries, where each entry represents one method variant and can contain multiple metric scores.
- Dataset leaderboard pages with benchmark notes, links, sortable columns, and filters for track, variant, and venue.

## Data Layout

```text
data/
  papers.yaml
  datasets.yaml
  tracks.yaml
  results/
    index.yaml
    ucf-crime.yaml
    shanghaitech.yaml
    xd-violence.yaml
    nwpu-campus.yaml
```

`papers.yaml` stores paper metadata:

```yaml
- id: vadclip-2024
  short_name: VadCLIP
  title: VadCLIP: Adapting Vision-Language Models for Weakly Supervised Video Anomaly Detection
  year: 2024
  venue: AAAI
  status: accepted
  official_url: https://arxiv.org/abs/2308.11681
  task_types:
    - weakly-supervised-vad
  tags:
    - weakly-supervised
    - clip
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

## Track vs Metric

`track` is the comparison view. It answers whether a result belongs to full training, semi-supervision, zero-shot, training-free evaluation, or a more specific weakly supervised view such as coarse-grained AUC versus fine-grained temporal localization.

The score key is the metric label shown in the leaderboard, such as `AUC`, `AP`, `mAP@0.1`, or `AVG`. A single leaderboard entry can contain multiple metrics under `scores`.

Use `variant` for feature extractor, backbone, model size, modality combination, or any other method variant label. Different variants remain separate entries. `variant` can be blank when a paper reports only one unnamed setting.

Use one `score_source` per entry. This URL should point to the table, paper, benchmark file, or appendix where the scores in that entry come from.

## Links

Leaderboard rows do not use a separate links column. The visible cells carry the important links:

- Method cell: uses `papers.yaml` links with this priority: `official_url`, then `arxiv_url`, then `code_url`.
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

Each dataset page joins `papers.yaml` with the dataset result file. The table expands every metric available in the current track selection into its own score column, and clicking any metric column sorts by that metric. Track, venue, and variant filters support multi-select with search. It can also sort by displayed fields such as method, track, variant, year, and venue. Tags are shown in paper tables but are not leaderboard sort keys.

Publication status is maintained in `papers.yaml` for paper browsing:

```yaml
status: accepted
status: preprint
```

Dataset leaderboard pages do not show a separate status column. For preprints, set the paper `venue` to `preprint`; the venue column and venue filter then cover this case without duplicating status in result entries.

## Adding Data

1. Add a paper to `data/papers.yaml`.
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
