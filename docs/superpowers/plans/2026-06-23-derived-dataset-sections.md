# Derived Dataset Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `/datasets/` page into original-video and derived-benchmark sections while keeping all dataset leaderboard URLs working.

**Architecture:** Dataset records gain explicit provenance fields in `data/datasets.yaml`. Shared model helpers classify datasets, resolve source dataset references, and format label-like values. The datasets index renders two tables from the same loaded store, and the dataset leaderboard page shows provenance details only for derived benchmarks.

**Tech Stack:** Static HTML, browser ES modules, js-yaml, Ruby Minitest, Node test runner.

---

## File Structure

- `data/datasets.yaml`: add dataset classification and provenance fields to every dataset record.
- `assets/model.js`: add small helpers for dataset type checks, source resolution, and label formatting.
- `assets/datasets-page.js`: render original datasets and derived benchmarks into separate tables.
- `assets/dataset-page.js`: render provenance metadata for derived benchmark pages.
- `assets/dataset-page.js`: render multiple track badges for result entries that belong to more than one comparison track.
- `datasets/index.html`: add the second table and derived benchmark columns.
- `leaderboards/dataset.html`: add a hidden provenance summary block.
- `assets/styles.css`: add compact provenance/table label styling if the existing `.tag` and `.meta-pills` classes are not enough.
- `test/data_schema_test.rb`: validate the new dataset fields and source references.
- `test/data_schema_test.rb`: validate single-track and multi-track result entry shapes.
- `test/leaderboard_model_test.mjs`: test the dataset helper functions.
- `test/leaderboard_model_test.mjs`: test multi-track result normalization, filtering, sorting, and dataset track discovery.
- `test/leaderboard_ui_structure_test.rb`: assert the two dataset tables and provenance block exist.
- `README.md`: document original-video vs derived-benchmark dataset records.
- `README.md`: document `track` vs `tracks` result entries and the shared-score semantic rule.

### Task 1: Dataset Schema Test

**Files:**
- Modify: `test/data_schema_test.rb`

- [ ] **Step 1: Add failing schema assertions for dataset provenance fields**

Add this constant after `ROOT`:

```ruby
VALID_DATASET_TYPES = %w[original-video derived-benchmark].freeze
```

In `test_datasets_have_required_links_and_metrics`, replace the dataset required fields and assertions with:

```ruby
assert_required_fields dataset, %w[id name dataset_type source_dataset_ids has_new_videos contribution_types task_types links metrics notes]
assert_includes VALID_DATASET_TYPES, dataset.fetch("dataset_type")
assert_kind_of Array, dataset.fetch("source_dataset_ids")
dataset.fetch("source_dataset_ids").each do |source_id|
  assert_includes @dataset_ids, source_id, "unknown source dataset #{source_id} in #{dataset.inspect}"
end
assert_includes [true, false], dataset.fetch("has_new_videos")
assert_kind_of Array, dataset.fetch("contribution_types")
assert_kind_of Array, dataset.fetch("task_types")
assert_kind_of Hash, dataset.fetch("links")
assert_kind_of Array, dataset.fetch("metrics")
```

- [ ] **Step 2: Run the schema test and verify it fails for missing fields**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/data_schema_test.rb
```

Expected: FAIL with `missing dataset_type` on the first dataset record.

### Task 2: Dataset Metadata Fields

**Files:**
- Modify: `data/datasets.yaml`

- [ ] **Step 1: Add original-video metadata to existing datasets**

For each existing dataset record in `data/datasets.yaml`, add these fields after `name`:

```yaml
  dataset_type: original-video
  source_dataset_ids: []
  has_new_videos: true
  contribution_types: []
```

Keep every existing `id`, `name`, `task_types`, `links`, `metrics`, and `notes` value unchanged.

- [ ] **Step 2: Run the schema test and verify it passes**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/data_schema_test.rb
```

Expected: PASS.

### Task 3: Dataset Model Helpers

**Files:**
- Modify: `test/leaderboard_model_test.mjs`
- Modify: `assets/model.js`

- [ ] **Step 1: Add failing Node tests for dataset helpers**

In `test/leaderboard_model_test.mjs`, add these imports:

```js
  formatDatasetLabel,
  getDatasetSources,
  isDerivedDataset,
```

Add this test after the `tracks` constant:

```js
test("dataset helpers identify derived benchmarks and resolve source datasets", () => {
  const datasets = [
    { id: "ucf-crime", name: "UCF-Crime", dataset_type: "original-video" },
    { id: "xd-violence", name: "XD-Violence", dataset_type: "original-video" },
    {
      id: "vad-reasoning",
      name: "VAD-Reasoning",
      dataset_type: "derived-benchmark",
      source_dataset_ids: ["ucf-crime", "xd-violence"],
    },
  ];
  const indexes = buildIndexes({ papers, datasets, tracks });
  const derived = datasets[2];

  assert.equal(isDerivedDataset(derived), true);
  assert.equal(isDerivedDataset(datasets[0]), false);
  assert.deepEqual(
    getDatasetSources(derived, indexes).map((dataset) => dataset.name),
    ["UCF-Crime", "XD-Violence"],
  );
  assert.equal(formatDatasetLabel("reasoning-annotations"), "Reasoning annotations");
});
```

- [ ] **Step 2: Run the Node model test and verify it fails for missing exports**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
```

Expected: FAIL because the new helper exports do not exist.

- [ ] **Step 3: Implement dataset helpers**

Add these exports to `assets/model.js` after `countByTrack`:

```js
export function isDerivedDataset(dataset = {}) {
  return dataset.dataset_type === "derived-benchmark";
}

export function getDatasetSources(dataset = {}, indexes = {}) {
  const datasetsById = indexes.datasetsById || {};
  return (dataset.source_dataset_ids || [])
    .map((datasetId) => datasetsById[datasetId])
    .filter(Boolean);
}

export function formatDatasetLabel(value) {
  return String(value ?? "")
    .split("-")
    .filter(Boolean)
    .map((word, index) => (
      index === 0 ? capitalize(word) : word
    ))
    .join(" ");
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

- [ ] **Step 4: Run the Node model test and verify it passes**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
```

Expected: PASS.

### Task 4: Two Dataset Tables

**Files:**
- Modify: `test/leaderboard_ui_structure_test.rb`
- Modify: `datasets/index.html`
- Modify: `assets/datasets-page.js`

- [ ] **Step 1: Add failing UI structure assertions for the two dataset tables**

In `test_datasets_page_lists_dataset_metadata`, replace the body with:

```ruby
html = File.read(File.join(ROOT, "datasets/index.html"))
js = File.read(File.join(ROOT, "assets/datasets-page.js"))

assert_includes html, 'id="datasets"'
assert_includes html, 'id="datasets-body"'
assert_includes html, 'id="derived-datasets"'
assert_includes html, 'id="derived-datasets-body"'
assert_includes html, "<th>Dataset</th>"
assert_includes html, "<th>Tasks</th>"
assert_includes html, "<th>Metrics</th>"
assert_includes html, "<th>Benchmark</th>"
assert_includes html, "<th>Based On</th>"
assert_includes html, "<th>Adds</th>"
assert_includes html, "<th>New Videos</th>"
assert_includes html, "<th>Links</th>"
assert_includes js, "renderOriginalDatasets"
assert_includes js, "renderDerivedDatasets"
assert_includes js, "source_dataset_ids"
assert_includes js, "has_new_videos"
assert_includes js, "leaderboards/dataset.html?dataset="
```

- [ ] **Step 2: Run UI structure test and verify it fails**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/leaderboard_ui_structure_test.rb
```

Expected: FAIL because `derived-datasets` markup and render functions are not present.

- [ ] **Step 3: Update the datasets HTML**

In `datasets/index.html`, keep the original section `id="datasets"` for original video datasets and add this second section after it:

```html
      <section id="derived-datasets" class="section-block" aria-labelledby="derived-datasets-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Annotations &amp; Derived Benchmarks</p>
            <h2 id="derived-datasets-title">Derived Benchmarks</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Benchmark</th>
                <th>Based On</th>
                <th>Adds</th>
                <th>New Videos</th>
                <th>Tasks</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody id="derived-datasets-body"></tbody>
          </table>
          <p id="derived-datasets-empty" class="empty" hidden>No derived benchmarks yet.</p>
        </div>
      </section>
```

Change the original section heading text to:

```html
<h2 id="datasets-title">Original Video Datasets</h2>
```

- [ ] **Step 4: Update the datasets page renderer**

Replace `assets/datasets-page.js` with this shape:

```js
import {
  escapeAttr,
  escapeHtml,
  loadStore,
} from "./data.js";
import {
  formatDatasetLabel,
  formatList,
  getDatasetSources,
  isDerivedDataset,
} from "./model.js";

let store = {
  datasets: [],
  indexes: {},
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    store = await loadStore("../");
    renderDatasets();
    els.status.textContent = "Data loaded";
    els.status.className = "status ready";
  } catch (error) {
    els.status.textContent = `Failed to load data: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.body = document.querySelector("#datasets-body");
  els.derivedBody = document.querySelector("#derived-datasets-body");
  els.derivedEmpty = document.querySelector("#derived-datasets-empty");
}

function renderDatasets() {
  const originalDatasets = store.datasets.filter((dataset) => !isDerivedDataset(dataset));
  const derivedDatasets = store.datasets.filter(isDerivedDataset);

  renderOriginalDatasets(originalDatasets);
  renderDerivedDatasets(derivedDatasets);
}

function renderOriginalDatasets(datasets) {
  els.body.innerHTML = datasets.map((dataset) => `
    <tr id="dataset-${escapeAttr(dataset.id)}">
      <td>
        <a href="../leaderboards/dataset.html?dataset=${escapeAttr(dataset.id)}">${escapeHtml(dataset.name)}</a>
        <div class="muted">${escapeHtml(dataset.notes)}</div>
      </td>
      <td>${escapeHtml(formatList(dataset.task_types))}</td>
      <td>${escapeHtml(formatList(dataset.metrics))}</td>
      <td class="link-list">
        ${datasetLinks(dataset)}
      </td>
    </tr>
  `).join("");
}

function renderDerivedDatasets(datasets) {
  els.derivedBody.innerHTML = datasets.map((dataset) => `
    <tr id="dataset-${escapeAttr(dataset.id)}">
      <td>
        <a href="../leaderboards/dataset.html?dataset=${escapeAttr(dataset.id)}">${escapeHtml(dataset.name)}</a>
        <div class="muted">${escapeHtml(dataset.notes)}</div>
      </td>
      <td>${renderSourceDatasets(dataset)}</td>
      <td>${renderContributionTypes(dataset.contribution_types)}</td>
      <td>${escapeHtml(dataset.has_new_videos ? "Yes" : "No")}</td>
      <td>${escapeHtml(formatList(dataset.task_types))}</td>
      <td class="link-list">
        ${datasetLinks(dataset)}
      </td>
    </tr>
  `).join("");
  els.derivedEmpty.hidden = datasets.length > 0;
}

function renderSourceDatasets(dataset) {
  const sources = getDatasetSources(dataset, store.indexes);
  if (sources.length === 0) return `<span class="muted">-</span>`;

  return sources.map((source) => `
    <a class="tag" href="../leaderboards/dataset.html?dataset=${escapeAttr(source.id)}">
      ${escapeHtml(source.name)}
    </a>
  `).join("");
}

function renderContributionTypes(types = []) {
  if (types.length === 0) return `<span class="muted">-</span>`;

  return types.map((type) => `
    <span class="tag">${escapeHtml(formatDatasetLabel(type))}</span>
  `).join("");
}

function datasetLinks(dataset) {
  return `
    <a href="../leaderboards/dataset.html?dataset=${escapeAttr(dataset.id)}">leaderboard</a>
    ${datasetLink("paper", dataset.links.paper)}
    ${datasetLink("download", dataset.links.download)}
    ${datasetLink("annotation", dataset.links.annotation)}
  `;
}

function datasetLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
```

- [ ] **Step 5: Run UI structure test and verify it passes**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/leaderboard_ui_structure_test.rb
```

Expected: PASS.

### Task 5: Derived Provenance on Dataset Leaderboard Page

**Files:**
- Modify: `test/leaderboard_ui_structure_test.rb`
- Modify: `leaderboards/dataset.html`
- Modify: `assets/dataset-page.js`
- Modify: `assets/styles.css`

- [ ] **Step 1: Add failing UI structure assertions for provenance**

In `test_dataset_leaderboard_uses_compact_columns`, add:

```ruby
assert_includes html, 'id="dataset-provenance"'
assert_includes html, 'id="dataset-provenance-body"'
assert_includes js, "function renderDatasetProvenance"
assert_includes js, "Built from"
assert_includes js, "source_dataset_ids"
assert_includes js, "has_new_videos"
```

- [ ] **Step 2: Run UI structure test and verify it fails**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/leaderboard_ui_structure_test.rb
```

Expected: FAIL because the provenance markup and renderer are not present.

- [ ] **Step 3: Add provenance markup**

In `leaderboards/dataset.html`, add this block inside `.dataset-summary` after the links block:

```html
        <div id="dataset-provenance" hidden>
          <h2>Provenance</h2>
          <div id="dataset-provenance-body" class="provenance-list"></div>
        </div>
```

- [ ] **Step 4: Render provenance for derived benchmarks**

In `assets/dataset-page.js`, import the helper functions:

```js
  formatDatasetLabel,
  getDatasetSources,
  isDerivedDataset,
```

In `cacheElements`, add:

```js
  els.provenance = document.querySelector("#dataset-provenance");
  els.provenanceBody = document.querySelector("#dataset-provenance-body");
```

In `render`, call:

```js
  renderDatasetProvenance(dataset);
```

Add these functions near `pageLink`:

```js
function renderDatasetProvenance(dataset) {
  if (!isDerivedDataset(dataset)) {
    els.provenance.hidden = true;
    els.provenanceBody.innerHTML = "";
    return;
  }

  els.provenance.hidden = false;
  const sources = getDatasetSources(dataset, store.indexes);
  els.provenanceBody.innerHTML = [
    provenanceRow("Built from", renderSourceDatasetLinks(sources)),
    provenanceRow("Adds", renderContributionTypes(dataset.contribution_types)),
    provenanceRow("New videos", escapeHtml(dataset.has_new_videos ? "Yes" : "No")),
  ].join("");
}

function provenanceRow(label, value) {
  return `
    <div class="provenance-row">
      <span>${escapeHtml(label)}</span>
      <div>${value}</div>
    </div>
  `;
}

function renderSourceDatasetLinks(sources) {
  if (sources.length === 0) return `<span class="muted">-</span>`;

  return sources.map((source) => `
    <a class="tag" href="dataset.html?dataset=${escapeAttr(source.id)}">
      ${escapeHtml(source.name)}
    </a>
  `).join("");
}

function renderContributionTypes(types = []) {
  if (types.length === 0) return `<span class="muted">-</span>`;

  return types.map((type) => `
    <span class="tag">${escapeHtml(formatDatasetLabel(type))}</span>
  `).join("");
}
```

- [ ] **Step 5: Add compact provenance CSS**

In `assets/styles.css`, change `.dataset-summary` to:

```css
.dataset-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
```

Add:

```css
.provenance-list {
  display: grid;
  gap: 10px;
}

.provenance-row {
  display: grid;
  gap: 4px;
}

.provenance-row > span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
```

- [ ] **Step 6: Run UI structure test and verify it passes**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/leaderboard_ui_structure_test.rb
```

Expected: PASS.

### Task 6: Multi-Track Result Entries

**Files:**
- Modify: `test/data_schema_test.rb`
- Modify: `test/leaderboard_model_test.mjs`
- Modify: `test/leaderboard_ui_structure_test.rb`
- Modify: `assets/model.js`
- Modify: `assets/dataset-page.js`

- [ ] **Step 1: Add failing schema validation for `track` or `tracks`**

In `test_result_files_reference_existing_entities`, replace:

```ruby
assert_required_fields entry, %w[paper_id method track score_source scores]
```

with:

```ruby
assert_required_fields entry, %w[paper_id method score_source scores]
track_ids = entry_track_ids(entry)
refute_empty track_ids, "missing track or tracks in #{entry.inspect}"
assert_equal track_ids.uniq, track_ids, "duplicate tracks in #{entry.inspect}"
track_ids.each do |track_id|
  assert_includes @track_ids, track_id
end
```

Add this private helper before `assert_required_fields`:

```ruby
def entry_track_ids(entry)
  has_track = entry.key?("track")
  has_tracks = entry.key?("tracks")
  assert has_track ^ has_tracks, "entry must use exactly one of track or tracks in #{entry.inspect}"

  if has_tracks
    assert_kind_of Array, entry.fetch("tracks")
    return entry.fetch("tracks")
  end

  [entry.fetch("track")]
end
```

- [ ] **Step 2: Run schema test and verify it still passes existing single-track files**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/data_schema_test.rb
```

Expected: PASS after Task 2 has added dataset provenance fields.

- [ ] **Step 3: Add failing Node tests for multi-track behavior**

In `test/leaderboard_model_test.mjs`, extend the imports with:

```js
  countByTrack,
```

Add this standalone fixture after `resultFiles` so existing tests keep their current assumptions:

```js
const multiTrackResultFiles = [
  {
    dataset_id: "ucf-crime",
    entries: [
      {
        paper_id: "paper-a",
        method: "PaperA",
        variant: "MLLM",
        tracks: ["zero-shot", "training-free"],
        score_source: "https://source.example/a-multitrack",
        scores: {
          AUC: 79.2,
        },
      },
      {
        paper_id: "paper-b",
        method: "PaperB",
        variant: "MLLM",
        track: "training-free",
        score_source: "https://source.example/b-training-free",
        scores: {
          AUC: 78.4,
        },
      },
    ],
  },
];
```

Add this test after the existing normalization test:

```js
test("normalizeResultFiles preserves all track IDs on multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].trackIds, ["zero-shot", "training-free"]);
  assert.equal(entries[0].track, "zero-shot");
  assert.deepEqual(entries[1].trackIds, ["training-free"]);
});
```

Add this test after `getTracksForDataset returns only tracks used by the dataset in configured order`:

```js
test("getTracksForDataset includes all tracks from multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.deepEqual(
    getTracksForDataset(entries, tracks, "ucf-crime").map((track) => track.id),
    ["training-free", "zero-shot"],
  );
});
```

Add this test after the existing multi-select filter test:

```js
test("selectLeaderboardRows matches multi-track rows by any selected track", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks });
  const entries = normalizeResultFiles(multiTrackResultFiles);

  const zeroShotRows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["zero-shot"],
    },
  });
  const trainingFreeRows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["training-free"],
    },
  });

  assert.deepEqual(zeroShotRows.map((row) => row.method), ["PaperA"]);
  assert.deepEqual(
    trainingFreeRows.map((row) => [row.method, row.trackNames]),
    [
      ["PaperA", ["Zero-shot", "Training-free"]],
      ["PaperB", ["Training-free"]],
    ],
  );
});
```

Add this test after the track count or sorting tests:

```js
test("countByTrack counts every track on multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.equal(countByTrack(entries)["zero-shot"], 1);
  assert.equal(countByTrack(entries)["training-free"], 2);
});
```

- [ ] **Step 4: Run Node model test and verify it fails**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
```

Expected: FAIL because `trackIds`, `trackNames`, and multi-track filtering are not implemented.

- [ ] **Step 5: Implement multi-track normalization and filtering in `assets/model.js`**

Add these helpers near `normalizeResultFiles`:

```js
function normalizeTrackIds(entry) {
  if (Array.isArray(entry.tracks)) return entry.tracks;
  return entry.track ? [entry.track] : [];
}

function matchesSelectedTrack(trackIds, selectedValues) {
  return !Array.isArray(selectedValues) ||
    selectedValues.length === 0 ||
    trackIds.some((trackId) => selectedValues.includes(trackId));
}
```

Update `normalizeResultFiles` entry mapping to include:

```js
const trackIds = normalizeTrackIds(entry);
return {
  ...entry,
  dataset_id: datasetId,
  track: entry.track || trackIds[0] || "",
  trackIds,
  variant: entry.variant == null ? "" : entry.variant,
  score_source: entry.score_source || "",
  scores: entry.scores || {},
};
```

Update `getScoreKeysForDataset` track checks:

```js
const trackIds = normalizeTrackIds(entry);
if (!matchesSelectedTrack(trackIds, filters.trackIds)) continue;
if (filters.trackId && filters.trackId !== "all" && !trackIds.includes(filters.trackId)) continue;
```

Update `getTracksForDataset` to collect all track IDs:

```js
const usedTrackIds = new Set(
  entries
    .filter((entry) => entry.dataset_id === datasetId)
    .flatMap((entry) => entry.trackIds || normalizeTrackIds(entry)),
);
```

Update `countByTrack`:

```js
export function countByTrack(entries) {
  return entries.reduce((counts, entry) => {
    for (const trackId of entry.trackIds || normalizeTrackIds(entry)) {
      counts[trackId] = (counts[trackId] || 0) + 1;
    }
    return counts;
  }, {});
}
```

Update `enrichEntry`:

```js
const trackIds = entry.trackIds || normalizeTrackIds(entry);
const trackInfos = trackIds.map((trackId) => indexes.tracksById[trackId] || { id: trackId, name: trackId });
const track = trackInfos[0] || {};
```

and include:

```js
trackIds,
trackInfos,
trackNames: trackInfos.map((trackInfo) => trackInfo.name || trackInfo.id),
trackName: trackInfos.map((trackInfo) => trackInfo.name || trackInfo.id).join(", ") || entry.track,
```

Update `matchesFilters` track checks:

```js
if (filters.trackId && filters.trackId !== "all" && !row.trackIds.includes(filters.trackId)) {
  return false;
}
if (!matchesSelectedTrack(row.trackIds, filters.trackIds)) {
  return false;
}
```

- [ ] **Step 6: Update dataset page track rendering**

In `assets/dataset-page.js`, update `getVenueOptions` and `getVariantOptions` filter checks from `matchesSelected(entry.track, state.trackIds)` to:

```js
matchesSelectedTrack(entry.trackIds || [entry.track], state.trackIds)
```

Replace the local `matchesSelected` helper with:

```js
function matchesSelected(value, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(value);
}

function matchesSelectedTrack(trackIds, selectedValues) {
  return selectedValues.length === 0 || trackIds.some((trackId) => selectedValues.includes(trackId));
}
```

In `renderRow`, replace:

```js
<td><span class="badge">${escapeHtml(row.trackName)}</span></td>
```

with:

```js
<td>${renderTrackBadges(row)}</td>
```

Add:

```js
function renderTrackBadges(row) {
  return row.trackNames.map((trackName) => `
    <span class="badge">${escapeHtml(trackName)}</span>
  `).join("");
}
```

- [ ] **Step 7: Add UI structure assertion for multi-track badge rendering**

In `test_dataset_leaderboard_uses_compact_columns`, add:

```ruby
assert_includes js, "function renderTrackBadges"
assert_includes js, "row.trackNames.map"
```

- [ ] **Step 8: Run tests and verify multi-track support passes**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/data_schema_test.rb
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /usr/bin/ruby test/leaderboard_ui_structure_test.rb
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
```

Expected: all three commands PASS.

### Task 7: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document dataset types**

In `README.md`, update the dataset metadata section to mention:

```yaml
dataset_type: original-video
source_dataset_ids: []
has_new_videos: true
contribution_types: []
```

Add a derived benchmark example:

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

Mention that `source_dataset_ids` references other records in `data/datasets.yaml`.

- [ ] **Step 2: Document multi-track result entries**

In the Track vs Metric section, add this text:

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

- [ ] **Step 3: Run the full test suite**

Run:

```bash
/usr/bin/env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/npm test
```

Expected: PASS.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
/usr/bin/git status --short --branch
/usr/bin/git diff --stat
```

Expected: changes are limited to dataset data, dataset rendering, shared model helpers, tests, README, and this plan.

- [ ] **Step 5: Commit the implementation**

Run:

```bash
/usr/bin/git add README.md assets/dataset-page.js assets/datasets-page.js assets/model.js assets/styles.css data/datasets.yaml datasets/index.html docs/superpowers/plans/2026-06-23-derived-dataset-sections.md leaderboards/dataset.html test/data_schema_test.rb test/leaderboard_model_test.mjs test/leaderboard_ui_structure_test.rb
/usr/bin/git commit -m "Split dataset page by dataset type"
```

Expected: commit succeeds on `main`.
