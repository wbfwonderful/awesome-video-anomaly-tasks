# Multi-Track Result Entries Design

## Goal

Allow one leaderboard result entry to belong to multiple comparison tracks when the method reports one shared score under the same evaluation protocol. This supports cases where a method is both `zero-shot` and `training-free` without duplicating the row.

## Data Model

Current single-track entries stay valid:

```yaml
track: zero-shot
```

New multi-track entries use `tracks`:

```yaml
tracks:
  - zero-shot
  - training-free
```

An entry may use either `track` or `tracks`. It must not use both. `tracks` must contain at least one valid track ID.

The semantic rule is:

> A multi-track entry represents one method variant with one score set and one evaluation protocol. If the scores or evaluation protocol differ across tracks, use separate result entries instead.

## Normalized Shape

The browser model normalizes result entries to include `trackIds`:

```js
{
  trackIds: ["zero-shot", "training-free"]
}
```

For backward compatibility, normalized rows may keep `track` as the first track ID so existing sort and fallback code remains simple while display and filtering move to `trackIds`.

## Leaderboard Behavior

The dataset leaderboard renders one row for a multi-track entry.

The Track cell shows all track labels as badges, for example:

```text
Zero-shot  Training-free
```

Filtering behavior uses intersection:

- Selecting `zero-shot` shows entries whose `trackIds` includes `zero-shot`.
- Selecting `training-free` shows entries whose `trackIds` includes `training-free`.
- Selecting multiple tracks shows entries that match at least one selected track.

Dataset-level track discovery uses every ID in `trackIds`, so multi-track entries contribute all of their labels to the available track filter options and track coverage counts.

Sorting by track uses the joined track display labels.

## Validation

Schema tests should enforce:

- Each result entry has exactly one of `track` or `tracks`.
- `track` is a valid track ID when present.
- `tracks` is a non-empty array when present.
- Every ID in `tracks` references an existing track.
- Duplicate track IDs inside one entry are rejected.

## Compatibility

Existing result files using `track` keep working. Existing leaderboard URLs and score rendering do not change.

