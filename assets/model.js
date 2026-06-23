export function buildIndexes({ papers = [], datasets = [], tracks = [] }) {
  return {
    papersById: Object.fromEntries(papers.map((paper) => [paper.id, paper])),
    datasetsById: Object.fromEntries(datasets.map((dataset) => [dataset.id, dataset])),
    tracksById: Object.fromEntries(tracks.map((track) => [track.id, track])),
  };
}

export function normalizePaperFiles(paperFiles) {
  return paperFiles.flat();
}

export function normalizeResultFiles(resultFiles) {
  return resultFiles.flatMap((file) => {
    const datasetId = file.dataset_id;
    return (file.entries || []).map((entry) => {
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
    });
  });
}

function normalizeTrackIds(entry) {
  if (Array.isArray(entry.tracks)) return entry.tracks;
  return entry.track ? [entry.track] : [];
}

function matchesSelectedTrack(trackIds, selectedValues) {
  return !Array.isArray(selectedValues) ||
    selectedValues.length === 0 ||
    trackIds.some((trackId) => selectedValues.includes(trackId));
}

export function getScoreKeysForDataset(entries, datasetId, filters = {}) {
  const keys = new Set();

  for (const entry of entries) {
    if (entry.dataset_id !== datasetId) continue;
    const trackIds = normalizeTrackIds(entry);
    if (!matchesSelectedTrack(trackIds, filters.trackIds)) continue;
    if (filters.trackId && filters.trackId !== "all" && !trackIds.includes(filters.trackId)) continue;
    Object.keys(entry.scores || {}).forEach((key) => keys.add(key));
  }

  return [...keys];
}

export function getTracksForDataset(entries, tracks, datasetId) {
  const usedTrackIds = new Set(
    entries
      .filter((entry) => entry.dataset_id === datasetId)
      .flatMap((entry) => entry.trackIds || normalizeTrackIds(entry)),
  );

  return tracks.filter((track) => usedTrackIds.has(track.id));
}

export function selectLeaderboardRows({ entries = [], indexes, filters = {}, sort = {} }) {
  const scoreKey = sort.scoreKey || filters.scoreKey || "AUC";
  const rows = entries
    .map((entry) => enrichEntry(entry, indexes))
    .filter((row) => matchesFilters(row, filters));

  const selectedRows = filters.bestPerPaper ? bestRowsPerPaper(rows, scoreKey) : rows;
  return sortRows(selectedRows, sort.field || "score", sort.direction || "desc", scoreKey);
}

export function countByTrack(entries) {
  return entries.reduce((counts, entry) => {
    for (const trackId of entry.trackIds || normalizeTrackIds(entry)) {
      counts[trackId] = (counts[trackId] || 0) + 1;
    }
    return counts;
  }, {});
}

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

const PAPER_LINK_TYPES = [
  { key: "official_url", kind: "official", label: "official paper" },
  { key: "arxiv_url", kind: "arxiv", label: "arxiv paper" },
  { key: "code_url", kind: "code", label: "code" },
];

export function getPaperPrimaryUrl(paper = {}) {
  return paper.official_url || paper.arxiv_url || paper.code_url || "";
}

export function getPaperLinks(paper = {}) {
  return PAPER_LINK_TYPES.flatMap((linkType) => {
    const url = paper[linkType.key];
    if (!url) return [];

    return [{
      kind: linkType.kind,
      label: linkType.label,
      url,
    }];
  });
}

export function getEntryLinks(row, scoreKey) {
  const score = row.scores?.[scoreKey] || {};
  return {
    methodUrl: row.paperUrl || row.paper?.code_url || "",
    paperUrl: row.paperUrl || "",
    codeUrl: row.paper?.code_url || "",
    scoreSourceUrl: row.score_source || score.source_url || row.paperUrl || "",
  };
}

export function getScoreValue(row, scoreKey) {
  const score = row.scores?.[scoreKey];
  const value = typeof score === "number" ? score : score?.value;
  return typeof value === "number" ? value : null;
}

export function getScoreLabel(row, scoreKey) {
  return scoreKey;
}

export function formatList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ") || "-";
  }
  return value || "-";
}

export function sortRows(rows, field, direction, scoreKey = "auc") {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = getSortValue(a, field, scoreKey);
    const right = getSortValue(b, field, scoreKey);
    const result = compareValues(left, right);
    if (result !== 0) return result * multiplier;
    return a.method.localeCompare(b.method);
  });
}

function enrichEntry(entry, indexes) {
  const paper = indexes.papersById[entry.paper_id] || {};
  const dataset = indexes.datasetsById[entry.dataset_id] || {};
  const trackIds = entry.trackIds || normalizeTrackIds(entry);
  const trackInfos = trackIds.map((trackId) => indexes.tracksById[trackId] || { id: trackId, name: trackId });
  const track = trackInfos[0] || {};
  const trackNames = trackInfos.map((trackInfo) => trackInfo.name || trackInfo.id);

  return {
    ...entry,
    paper,
    dataset,
    trackIds,
    trackInfos,
    trackInfo: track,
    trackNames,
    paperStatus: paper.status || "unknown",
    paperTitle: paper.title || entry.paper_id,
    paperUrl: paper.official_url || paper.arxiv_url || "",
    venue: paper.venue || "",
    year: paper.year || "",
    trackName: trackNames.join(", ") || entry.track,
  };
}

function matchesFilters(row, filters) {
  if (filters.datasetId && filters.datasetId !== "all" && row.dataset_id !== filters.datasetId) {
    return false;
  }
  if (filters.trackId && filters.trackId !== "all" && !row.trackIds.includes(filters.trackId)) {
    return false;
  }
  if (!matchesSelectedTrack(row.trackIds, filters.trackIds)) {
    return false;
  }
  if (filters.status && filters.status !== "all" && row.paperStatus !== filters.status) {
    return false;
  }
  if (filters.venue && filters.venue !== "all" && row.venue !== filters.venue) {
    return false;
  }
  if (!matchesSelected(row.venue, filters.venues)) {
    return false;
  }
  if (filters.variant && filters.variant !== "all" && row.variant !== filters.variant) {
    return false;
  }
  if (!matchesSelected(row.variant, filters.variants)) {
    return false;
  }
  return true;
}

function matchesSelected(value, selectedValues) {
  return !Array.isArray(selectedValues) || selectedValues.length === 0 || selectedValues.includes(value);
}

function bestRowsPerPaper(rows, scoreKey) {
  const bestByPaper = new Map();

  for (const row of rows) {
    const existing = bestByPaper.get(row.paper_id);
    if (!existing || compareValues(getScoreValue(row, scoreKey), getScoreValue(existing, scoreKey)) > 0) {
      bestByPaper.set(row.paper_id, row);
    }
  }

  return [...bestByPaper.values()];
}

function getSortValue(row, field, scoreKey) {
  if (field === "score") return getScoreValue(row, scoreKey);
  if (field === "method") return row.method;
  if (field === "track") return row.trackName;
  if (field === "venue") return row.venue;
  if (field === "year") return row.year;
  if (field === "status") return row.paperStatus;
  if (field === "variant") return row.variant;
  return row[field];
}

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
