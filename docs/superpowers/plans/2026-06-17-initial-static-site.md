# Initial Static Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first GitHub Pages version of Awesome Video Anomaly Tasks with structured papers, datasets, tracks, and dataset-scoped leaderboard result files.

**Architecture:** Use a no-build static site served by GitHub Pages. YAML files under `data/` are the source of truth; browser JavaScript loads them, joins `paper_id` and `dataset_id`, and renders papers, datasets, and leaderboard views.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, `js-yaml` from CDN in the browser, Ruby standard-library YAML parser for local validation, Node built-in test runner for pure leaderboard logic.

---

### Task 1: Data Contract Tests

**Files:**
- Create: `test/data_schema_test.rb`
- Create: `test/leaderboard_model_test.mjs`

- [ ] Write a Ruby schema test that loads `data/papers.yaml`, `data/datasets.yaml`, `data/tracks.yaml`, `data/results/index.yaml`, and every result file listed in the index.
- [ ] Assert every result references an existing paper and dataset, uses a known track, has `task`, `granularity`, `metric`, numeric `score`, and source metadata.
- [ ] Write a Node test for leaderboard grouping and best-per-paper behavior.
- [ ] Run both tests and verify they fail before implementation because the data and model files do not exist.

### Task 2: Data Files

**Files:**
- Create: `data/papers.yaml`
- Create: `data/datasets.yaml`
- Create: `data/tracks.yaml`
- Create: `data/results/index.yaml`
- Create: `data/results/ucf-crime.yaml`
- Create: `data/results/shanghaitech.yaml`
- Create: `data/results/nwpu-campus.yaml`

- [ ] Add initial paper records seeded from the researched VAD repositories and benchmark examples.
- [ ] Add initial dataset records with homepage, paper, download, annotation, metric, and note fields.
- [ ] Add coarse leaderboard tracks: `full-training`, `weakly-supervised`, `semi-supervised`, `zero-shot`, and `training-free`.
- [ ] Add sample dataset-scoped result records where each result has `track`, `task`, `granularity`, `metric`, `score`, `details`, and source fields.

### Task 3: Static Site

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/model.js`
- Create: `assets/app.js`

- [ ] Implement pure model helpers for indexing papers/datasets/tracks, grouping leaderboard rows, filtering by dataset/track/metric/status, and selecting best-per-paper rows.
- [ ] Implement the page shell with sections for overview, papers, datasets, leaderboard, and related repositories.
- [ ] Implement browser data loading from YAML files and render tables with clickable result cells that link to paper/source URLs.
- [ ] Add controls for dataset, track, metric, publication status, and show-all-variants vs best-per-paper.

### Task 4: Documentation

**Files:**
- Modify: `README.md`

- [ ] Document the purpose of the repository in English.
- [ ] Explain the data model and how to add papers, datasets, tracks, and results.
- [ ] List related repositories found during research and explain what each one contributes.
- [ ] Add local preview and validation commands.

### Task 5: Verification

**Commands:**
- `/usr/bin/ruby test/data_schema_test.rb`
- `/opt/homebrew/bin/node --test test/leaderboard_model_test.mjs`
- `/Users/bytedance/miniconda3/bin/python -m http.server 8000`

- [ ] Run the data schema validation.
- [ ] Run the Node model tests.
- [ ] Start a local static server and smoke-test that the page can be served.
