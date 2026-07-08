export function buildIndexes({ papers = [], datasets = [], tracks = [] }) {
  return {
    papersById: Object.fromEntries(papers.flatMap((paper) => {
      const paperId = getPaperId(paper);
      return paperId ? [[paperId, paper]] : [];
    })),
    datasetsById: Object.fromEntries(datasets.map((dataset) => [dataset.id, dataset])),
    tracksById: Object.fromEntries(tracks.map((track) => [track.id, track])),
  };
}

export function getPaperId(paper = {}) {
  return String(paper.paper_id || paper.id || "").trim();
}

export function normalizePaperFiles(paperFiles) {
  return paperFiles.flat();
}

export function selectPaperRows({ papers = [], filters = {}, sort = {} }) {
  const rows = papers.filter((paper) => matchesPaperFilters(paper, filters));
  return sortPaperRows(rows, sort.field || "year", sort.direction || "desc");
}

export function matchesFilterOption(option = {}, query = "") {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [option.label, option.value].some((value) => (
    String(value ?? "").toLowerCase().includes(normalizedQuery)
  ));
}

function matchesPaperFilters(paper, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  if (query) {
    const haystack = [
      paper.short_name,
      paper.title,
      paper.venue,
      paper.year,
      paper.presentation,
      ...(paper.tags || []),
    ].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (!matchesSelected(paper.venue, filters.venues)) return false;
  if (!matchesSelected(String(paper.year || ""), filters.years)) return false;
  if (!matchesSelected(paper.presentation || "", filters.presentations)) return false;
  if (!matchesSelectedAny(paper.tags || [], filters.tags)) return false;
  return true;
}

function matchesSelectedAny(values, selectedValues) {
  return !Array.isArray(selectedValues) ||
    selectedValues.length === 0 ||
    values.some((value) => selectedValues.includes(value));
}

function sortPaperRows(rows, field, direction) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = getPaperSortValue(a, field);
    const right = getPaperSortValue(b, field);
    const result = compareValues(left, right);
    if (result !== 0) return result * multiplier;
    return String(a.short_name || "").localeCompare(String(b.short_name || ""));
  });
}

function getPaperSortValue(paper, field) {
  if (field === "paper") return paper.short_name || "";
  if (field === "year") return paper.year || "";
  if (field === "venue") return paper.venue || "";
  if (field === "tags") return (paper.tags || []).join(", ");
  return paper[field];
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeResultFiles(resultFiles) {
  return resultFiles.flatMap((file) => {
    const datasetId = file.dataset_id;
    return normalizeResultFileEntries(file).map((entry) => {
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

function normalizeResultFileEntries(file) {
  const entries = Array.isArray(file.entries) ? file.entries : [];
  const entryGroups = file.entry_groups || {};
  const groupedEntries = Object.entries(entryGroups).flatMap(([trackId, groupEntries]) => (
    (groupEntries || []).map((entry) => (
      entry.track || entry.tracks ? entry : { ...entry, track: trackId }
    ))
  ));

  return [...entries, ...groupedEntries];
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
    const trackIds = entry.trackIds || normalizeTrackIds(entry);
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

export function selectPaperResultRows({ entries = [], indexes = {}, paperId = "" }) {
  const normalizedPaperId = String(paperId || "").trim();
  return entries
    .filter((entry) => String(entry.paper_id || "").trim() === normalizedPaperId)
    .map((entry) => enrichEntry(entry, indexes))
    .sort((left, right) => (
      compareValues(left.dataset?.name || left.dataset_id, right.dataset?.name || right.dataset_id) ||
      compareValues(left.trackName, right.trackName) ||
      compareValues(left.variant, right.variant)
    ));
}

export function countByTrack(entries) {
  return entries.reduce((counts, entry) => {
    for (const trackId of entry.trackIds || normalizeTrackIds(entry)) {
      counts[trackId] = (counts[trackId] || 0) + 1;
    }
    return counts;
  }, {});
}

export function buildHomeSummary({ papers = [], datasets = [], tracks = [], entries = [] }) {
  const preprintCount = papers.filter((paper) => (
    String(paper.venue || "").toLowerCase() === "preprint"
  )).length;
  const tagCounts = papers.reduce((counts, paper) => {
    for (const tag of paper.tags || []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
  }, {});
  const trackCounts = countByTrack(entries);

  return {
    paper_stats: {
      papers: papers.length,
      published: papers.length - preprintCount,
      preprints: preprintCount,
      tags: Object.keys(tagCounts).length,
    },
    dataset_stats: {
      datasets: datasets.length,
      with_results: new Set(entries.map((entry) => entry.dataset_id)).size,
      tracks: tracks.length,
      rows: entries.length,
    },
    top_tags: Object.entries(tagCounts)
      .sort(([leftTag, leftCount], [rightTag, rightCount]) => {
        if (leftCount !== rightCount) return rightCount - leftCount;
        if (leftTag < rightTag) return -1;
        if (leftTag > rightTag) return 1;
        return 0;
      })
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count })),
    track_coverage: tracks.map((track) => ({
      id: track.id,
      name: track.name,
      count: trackCounts[track.id] || 0,
    })),
  };
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

export function getPaperDetailUrl(paper = {}) {
  const paperId = getPaperId(paper);
  return paperId ? `detail.html?paper=${encodeURIComponent(paperId)}` : "";
}

export function getTagStyle(tag) {
  const normalizedTag = String(tag || "").trim().toLowerCase();
  if (!normalizedTag) return "";

  return getTokenStyle("tag", normalizedTag);
}

export function getTrackStyle(trackId) {
  const normalizedTrackId = String(trackId || "").trim().toLowerCase();
  if (!normalizedTrackId) return "";

  return getTokenStyle("track", normalizedTrackId);
}

function getTokenStyle(prefix, value) {
  const hash = hashString(`${prefix}:${value}`);
  const hue = hash % 360;
  const saturation = 52 + (hash % 18);
  const backgroundLightness = 90 + ((hash >> 4) % 5);
  const foregroundLightness = 24 + ((hash >> 8) % 9);
  const borderLightness = Math.max(backgroundLightness - 12, 72);

  return [
    `--${prefix}-bg: hsl(${hue} ${saturation}% ${backgroundLightness}%)`,
    `--${prefix}-fg: hsl(${hue} ${Math.min(saturation + 8, 82)}% ${foregroundLightness}%)`,
    `--${prefix}-border: hsl(${hue} ${saturation}% ${borderLightness}%)`,
  ].join("; ");
}

export function getPaperLinks(paper = {}, labels = {}) {
  return PAPER_LINK_TYPES.flatMap((linkType) => {
    const url = paper[linkType.key];
    if (!url) return [];

    return [{
      kind: linkType.kind,
      label: labels[linkType.kind] || linkType.label,
      url,
    }];
  });
}

export function getEntryLinks(row, scoreKey) {
  const score = row.scores?.[scoreKey] || {};
  const paperPrimaryUrl = getPaperPrimaryUrl(row.paper);
  return {
    methodUrl: row.paperUrl || row.paper?.code_url || "",
    paperUrl: row.paperUrl || "",
    codeUrl: row.paper?.code_url || "",
    scoreSourceUrl: row.score_source || score.source_url || paperPrimaryUrl,
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
  const entryPaperId = String(entry.paper_id || "").trim();
  const paper = indexes.papersById[entryPaperId] || {};
  const dataset = indexes.datasetsById[entry.dataset_id] || {};
  const trackIds = entry.trackIds || normalizeTrackIds(entry);
  const trackInfos = trackIds.map((trackId) => indexes.tracksById[trackId] || { id: trackId, name: trackId });
  const track = trackInfos[0] || {};
  const trackNames = trackInfos.map((trackInfo) => trackInfo.name || trackInfo.id);

  return {
    ...entry,
    method: paper.short_name || entry.paper_id,
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
