# Split Paper Data Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `data/papers.yaml` file with manifest-driven paper YAML files grouped by venue/year and preprint quarter.

**Architecture:** `data/papers/index.yaml` is the runtime manifest. Browser loading and Ruby validation both read the manifest, fetch every listed YAML file, flatten the arrays, and keep downstream consumers working with the same flat `papers` array. Paper records are moved with their current committed field contents unchanged.

**Tech Stack:** Static HTML/JavaScript, js-yaml in the browser, Ruby Minitest schema checks, Node test runner for model tests.

---

### Task 1: Add Manifest-Based Data Test

**Files:**
- Modify: `test/data_schema_test.rb`

- [ ] **Step 1: Change paper loading to read the new manifest path**

Replace the direct `@papers = load_yaml("data/papers.yaml")` setup line with a helper call:

```ruby
@papers = load_papers
```

Add this helper near `load_yaml`:

```ruby
def load_papers
  index = load_yaml("data/papers/index.yaml")
  index.fetch("files").flat_map do |file|
    paper_file = load_yaml("data/papers/#{file}")
    raise TypeError, "data/papers/#{file} must contain an array" unless paper_file.is_a?(Array)

    paper_file
  end
end
```

In `test_papers_have_required_metadata`, use the current committed paper fields as required fields and keep optional validations for fields that still appear:

```ruby
assert_required_fields paper, %w[id short_name title year venue official_url tags]
assert_includes %w[accepted preprint], paper.fetch("status") if paper.key?("status")
assert_kind_of Array, paper.fetch("task_types") if paper.key?("task_types")
assert_kind_of Array, paper.fetch("tags")
```

- [ ] **Step 2: Run schema test and verify the new expected failure**

Run:

```bash
ruby test/data_schema_test.rb
```

Expected: FAIL with `No such file or directory @ rb_sysopen - ... data/papers/index.yaml`.

### Task 2: Split Paper YAML Files

**Files:**
- Create: `data/papers/index.yaml`
- Create: `data/papers/venues/aaai-2024.yaml`
- Create: `data/papers/venues/icip-2023.yaml`
- Create: `data/papers/venues/t-mm-2022.yaml`
- Create: `data/papers/venues/iccv-2021.yaml`
- Create: `data/papers/venues/aaai-2023.yaml`
- Create: `data/papers/venues/cvpr-2023.yaml`
- Create: `data/papers/venues/cvpr-2018.yaml`
- Create: `data/papers/venues/cvpr-2024.yaml`
- Create: `data/papers/venues/acm-mm-2024.yaml`
- Create: `data/papers/venues/icml-2025.yaml`
- Create: `data/papers/venues/acm-mm-2025.yaml`
- Create: `data/papers/preprints/2023-q2.yaml`
- Delete: `data/papers.yaml`

- [ ] **Step 1: Create directories**

Run:

```bash
/bin/mkdir -p data/papers/venues data/papers/preprints
```

- [ ] **Step 2: Move current records into the split files**

Move records without changing their field content:

```text
vadclip-2024       -> data/papers/venues/aaai-2024.yaml
cliptsa-2023       -> data/papers/venues/icip-2023.yaml
avvd-2022          -> data/papers/venues/t-mm-2022.yaml
rtfm-2021          -> data/papers/venues/iccv-2021.yaml
dmu-2023           -> data/papers/venues/aaai-2023.yaml
umil-2023          -> data/papers/venues/cvpr-2023.yaml
realad-2018        -> data/papers/venues/cvpr-2018.yaml
pe-mil-2024        -> data/papers/venues/cvpr-2024.yaml
stprompt-2024      -> data/papers/venues/acm-mm-2024.yaml
exvad-2025         -> data/papers/venues/icml-2025.yaml
como-2023          -> data/papers/venues/cvpr-2023.yaml
lavad-2024         -> data/papers/venues/cvpr-2024.yaml
eventvad-2025      -> data/papers/venues/acm-mm-2025.yaml
nwpu-campus-2023   -> data/papers/preprints/2023-q2.yaml
```

Create `data/papers/index.yaml` with this manifest:

```yaml
files:
  - venues/acm-mm-2025.yaml
  - venues/icml-2025.yaml
  - venues/aaai-2024.yaml
  - venues/acm-mm-2024.yaml
  - venues/cvpr-2024.yaml
  - venues/aaai-2023.yaml
  - venues/cvpr-2023.yaml
  - venues/icip-2023.yaml
  - venues/t-mm-2022.yaml
  - venues/iccv-2021.yaml
  - venues/cvpr-2018.yaml
  - preprints/2023-q2.yaml
```

- [ ] **Step 3: Run schema test and verify the loader-facing test passes this stage**

Run:

```bash
ruby test/data_schema_test.rb
```

Expected: PASS.

### Task 3: Update Browser Loader

**Files:**
- Modify: `assets/data.js`
- Test: `test/leaderboard_model_test.mjs`

- [ ] **Step 1: Add a failing Node test for paper file flattening**

In `test/leaderboard_model_test.mjs`, import `normalizePaperFiles`:

```js
  normalizePaperFiles,
```

Add this test near the normalization tests:

```js
test("normalizePaperFiles flattens manifest-scoped paper files", () => {
  const paperFiles = [
    [{ id: "paper-a", short_name: "PaperA" }],
    [{ id: "paper-b", short_name: "PaperB" }],
  ];

  assert.deepEqual(
    normalizePaperFiles(paperFiles).map((paper) => paper.id),
    ["paper-a", "paper-b"],
  );
});
```

- [ ] **Step 2: Run Node model test and verify failure**

Run:

```bash
node --test test/leaderboard_model_test.mjs
```

Expected: FAIL because `normalizePaperFiles` is not exported.

- [ ] **Step 3: Implement paper flattening and manifest loading**

In `assets/model.js`, export:

```js
export function normalizePaperFiles(paperFiles) {
  return paperFiles.flat();
}
```

In `assets/data.js`, import `normalizePaperFiles` and replace the direct paper fetch with manifest loading:

```js
const [paperIndex, datasets, tracks, resultIndex] = await Promise.all([
  fetchYaml(`${basePath}data/papers/index.yaml`),
  fetchYaml(`${basePath}data/datasets.yaml`),
  fetchYaml(`${basePath}data/tracks.yaml`),
  fetchYaml(`${basePath}data/results/index.yaml`),
]);

const paperFiles = await Promise.all(
  paperIndex.files.map((file) => fetchYaml(`${basePath}data/papers/${file}`)),
);
const papers = normalizePaperFiles(paperFiles);
```

- [ ] **Step 4: Run Node model test and verify pass**

Run:

```bash
node --test test/leaderboard_model_test.mjs
```

Expected: PASS.

### Task 4: Update Documentation and Structure Tests

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-22-split-paper-data-files-design.md`
- Modify: `test/leaderboard_ui_structure_test.rb`

- [ ] **Step 1: Update docs to describe `data/papers/index.yaml` and split files**

In `README.md`, replace references to `data/papers.yaml` with the new layout:

```text
data/
  papers/
    index.yaml
    venues/
      cvpr-2024.yaml
      acm-mm-2025.yaml
    preprints/
      2023-q2.yaml
```

In the adding-data section, replace "Add a paper to `data/papers.yaml`" with "Add a paper to the matching file under `data/papers/`; update `data/papers/index.yaml` only when creating a new paper file."

In the design spec, replace the required-field list sentence with:

```text
Each listed file contains the same array shape currently used by the committed paper records. Records are moved as-is; no venue, year, or status fields are inferred from file paths.
```

- [ ] **Step 2: Add structure assertions**

In `test/leaderboard_ui_structure_test.rb`, extend `test_papers_page_uses_tags_and_text_links` with:

```ruby
data_js = File.read(File.join(ROOT, "assets/data.js"))
assert_includes data_js, "data/papers/index.yaml"
assert_includes data_js, "data/papers/${file}"
```

- [ ] **Step 3: Run UI structure test**

Run:

```bash
ruby test/leaderboard_ui_structure_test.rb
```

Expected: PASS.

### Task 5: Final Verification and Commit

**Files:**
- All changed files

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Inspect worktree**

Run:

```bash
/usr/bin/git status --short --branch
```

Expected: only intentional migration, docs, loader, and test changes are present.

- [ ] **Step 3: Commit migration**

Run:

```bash
/usr/bin/git add README.md assets/data.js assets/model.js data/papers docs/superpowers/plans/2026-06-22-split-paper-data-files.md docs/superpowers/specs/2026-06-22-split-paper-data-files-design.md test/data_schema_test.rb test/leaderboard_model_test.mjs test/leaderboard_ui_structure_test.rb
/usr/bin/git add -u data/papers.yaml
/usr/bin/git commit -m "Split paper data into manifest files"
```

Expected: commit succeeds on `main`.

