# Split Paper Data Files Design

## Goal

Move paper records out of the single `data/papers.yaml` file into smaller YAML files grouped by publication venue and year, with a separate preprint area. The paper record schema stays unchanged.

## Data Layout

The new structure will be:

```text
data/
  papers/
    index.yaml
    venues/
      cvpr-2026.yaml
      cvpr-2025.yaml
      icml-2025.yaml
      aaai-2024.yaml
    preprints/
      2026-q2.yaml
      2026-q1.yaml
```

`data/papers/index.yaml` lists the paper files that should be loaded:

```yaml
files:
  - venues/cvpr-2026.yaml
  - venues/cvpr-2025.yaml
  - venues/icml-2025.yaml
  - preprints/2026-q2.yaml
```

Each listed file contains the same array shape currently used by `data/papers.yaml`. Each paper still carries its own `id`, `short_name`, `title`, `year`, `venue`, `status`, `official_url`, `task_types`, and `tags` fields.

## Filing Rules

Accepted papers are filed by final publication venue and year under `data/papers/venues/`.

Preprints are filed under `data/papers/preprints/` by quarter. When a preprint is accepted, its record moves from the preprint file to the final venue-year file, and its explicit paper fields are updated as needed.

The manifest only changes when a new paper file is created. Adding another paper to an existing file does not require an `index.yaml` update.

## Loader Changes

`loadStore()` will load `data/papers/index.yaml`, fetch every listed paper file, flatten those arrays, and expose the resulting `papers` array with the same shape as before. Dataset, track, and result loading stay unchanged.

Because GitHub Pages cannot enumerate repository directories at runtime, the manifest remains the source of truth for which files the browser loads.

## Test Changes

Ruby data schema tests will read papers through the same manifest-based layout. Existing validations continue to apply:

- Paper IDs are globally unique.
- Required paper fields remain required on each record.
- Deprecated link keys remain rejected.
- Result entries still reference valid paper IDs.
- Home summary checks still compare against the loaded paper list.

Node leaderboard model tests should not need behavior changes because the model still receives a flat paper array.

## Compatibility

No page URLs, result files, dataset files, track files, or paper field meanings change. This is a storage layout change only.

