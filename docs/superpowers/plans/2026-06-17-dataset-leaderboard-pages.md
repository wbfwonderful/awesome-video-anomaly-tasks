# Dataset Leaderboard Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the initial long leaderboard with dataset-specific leaderboard pages backed by method-variant entries and multi-metric score objects.

**Architecture:** Keep the no-build GitHub Pages site. Result YAML files remain dataset-scoped, but each file now stores `entries[]`; each entry represents one method variant and contains a `scores` map so one row can hold AUC, AP, or future metrics. The home page links to dataset leaderboard pages, and `leaderboards/dataset.html?dataset=<id>` renders dataset metadata plus a compact matrix table.

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, `js-yaml` CDN, Ruby YAML schema validation, Node built-in tests.

---

### Task 1: Tests First

**Files:**
- Modify: `test/data_schema_test.rb`
- Modify: `test/leaderboard_model_test.mjs`

- [ ] Update schema tests to require result files with `entries[]` and per-entry `scores`.
- [ ] Update model tests to cover multi-metric entries, dataset filtering, best-per-paper by selected score, and separation between method links and score source links.
- [ ] Run Ruby and Node tests and confirm they fail against the existing implementation.

### Task 2: Result Data Migration

**Files:**
- Modify: `data/results/ucf-crime.yaml`
- Modify: `data/results/shanghaitech.yaml`
- Modify: `data/results/xd-violence.yaml`
- Modify: `data/results/nwpu-campus.yaml`

- [ ] Replace `results[]` with `entries[]`.
- [ ] Move `metric`, `granularity`, `score`, `source_url`, and `source_note` under `scores.<metric_key>`.
- [ ] Keep `track`, `feature`, `method`, `variant`, and optional `method_url` at the entry level.

### Task 3: Model and Pages

**Files:**
- Modify: `assets/model.js`
- Modify: `assets/app.js`
- Create: `assets/dataset-page.js`
- Modify: `index.html`
- Create: `leaderboards/index.html`
- Create: `leaderboards/dataset.html`
- Modify: `assets/styles.css`

- [ ] Update model helpers for entries and score maps.
- [ ] Convert the home leaderboard section into dataset page links.
- [ ] Add dataset leaderboard index and dataset detail page.
- [ ] Render compact dataset tables with `Method`, `Track`, `Feature`, selected metric score, and links.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] Document dataset-specific leaderboard pages.
- [ ] Document `entries[]` and `scores{}`.
- [ ] Run Ruby schema validation, Node model tests, diff whitespace check, and local HTTP smoke checks.
