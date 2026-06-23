import {
  escapeAttr,
  escapeHtml,
  loadStore,
} from "./data.js";
import {
  formatDatasetLabel,
  formatList,
  getDatasetSources,
  getEntryLinks,
  getScoreKeysForDataset,
  getScoreLabel,
  getScoreValue,
  getTracksForDataset,
  isDerivedDataset,
  selectLeaderboardRows,
} from "./model.js";

const params = new URLSearchParams(window.location.search);

const state = {
  datasetId: params.get("dataset") || "",
  trackIds: [],
  scoreKey: "AUC",
  venues: [],
  variants: [],
  bestPerPaper: false,
  sortField: "score",
  sortDirection: "desc",
};

const filterQueries = {
  track: "",
  venue: "",
  variant: "",
};

const filterConfig = {
  track: {
    stateKey: "trackIds",
    allLabel: "All tracks",
    countLabel: "tracks",
  },
  venue: {
    stateKey: "venues",
    allLabel: "All venues",
    countLabel: "venues",
  },
  variant: {
    stateKey: "variants",
    allLabel: "All variants",
    countLabel: "variants",
  },
};

let store = {
  papers: [],
  datasets: [],
  tracks: [],
  entries: [],
  indexes: {},
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindControls();

  try {
    store = await loadStore("../");
    initializeDataset();
    render();
  } catch (error) {
    els.status.textContent = `Failed to load data: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.title = document.querySelector("#dataset-title");
  els.notes = document.querySelector("#dataset-notes");
  els.meta = document.querySelector("#dataset-meta");
  els.links = document.querySelector("#dataset-links");
  els.provenance = document.querySelector("#dataset-provenance");
  els.provenanceBody = document.querySelector("#dataset-provenance-body");
  els.filters = {
    track: cacheFilter("track"),
    venue: cacheFilter("venue"),
    variant: cacheFilter("variant"),
  };
  els.bestPerPaper = document.querySelector("#best-per-paper");
  els.head = document.querySelector("#leaderboard-head");
  els.body = document.querySelector("#leaderboard-body");
  els.empty = document.querySelector("#leaderboard-empty");
}

function cacheFilter(name) {
  return {
    root: document.querySelector(`[data-filter="${name}"]`),
    button: document.querySelector(`#${name}-filter-button`),
    menu: document.querySelector(`#${name}-filter-menu`),
    search: document.querySelector(`#${name}-filter-search`),
    options: document.querySelector(`#${name}-filter-options`),
  };
}

function bindControls() {
  Object.keys(els.filters).forEach((filterName) => bindFilter(filterName));
  els.bestPerPaper.addEventListener("change", (event) => {
    state.bestPerPaper = event.target.checked;
    renderLeaderboard();
  });
  els.head.addEventListener("click", (event) => {
    const header = event.target.closest("[data-sort]");
    if (!header) return;

    const field = header.dataset.sort;
    const scoreKey = header.dataset.scoreKey;
    const sameSort =
      state.sortField === field &&
      (field !== "score" || state.scoreKey === scoreKey);

    if (field === "score" && scoreKey) {
      state.scoreKey = scoreKey;
    }
    if (sameSort) {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.sortField = field;
      state.sortDirection = field === "score" || field === "year" ? "desc" : "asc";
    }
    renderLeaderboard();
  });
  document.addEventListener("click", closeFilters);
}

function bindFilter(name) {
  const control = els.filters[name];

  control.button.addEventListener("click", (event) => {
    event.stopPropagation();
    setFilterOpen(name, control.menu.hidden);
  });
  control.menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  control.search.addEventListener("input", (event) => {
    filterQueries[name] = event.target.value;
    renderFilterControl(name, getFilterOptions(name));
  });
  control.options.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    updateFilterSelection(name, checkbox.value, checkbox.checked);
  });
}

function setFilterOpen(name, isOpen) {
  Object.entries(els.filters).forEach(([filterName, control]) => {
    const open = filterName === name && isOpen;
    control.menu.hidden = !open;
    control.button.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      control.search.focus();
    }
  });
}

function closeFilters() {
  Object.keys(els.filters).forEach((name) => setFilterOpen(name, false));
}

function updateFilterSelection(name, value, checked) {
  const stateKey = filterConfig[name].stateKey;

  if (value === "__all") {
    state[stateKey] = [];
  } else {
    const selected = new Set(state[stateKey]);
    if (checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }
    state[stateKey] = [...selected];
  }

  syncControlState();
  renderControls();
  renderLeaderboard();
}

function initializeDataset() {
  if (!state.datasetId && store.datasets.length > 0) {
    state.datasetId = store.datasets[0].id;
  }

  syncControlState();
}

function render() {
  const dataset = store.indexes.datasetsById[state.datasetId];
  if (!dataset) {
    throw new Error(`Unknown dataset: ${state.datasetId}`);
  }

  document.title = `${dataset.name} Leaderboard | Awesome Video Anomaly Tasks`;
  els.status.textContent = "Data loaded";
  els.status.className = "status ready";
  els.title.textContent = `${dataset.name} Leaderboard`;
  els.notes.textContent = dataset.notes || "";
  els.meta.innerHTML = `
    <span>${escapeHtml(formatList(dataset.task_types))}</span>
    <span>${escapeHtml(formatList(dataset.metrics))}</span>
  `;
  els.links.innerHTML = [
    pageLink("Homepage", dataset.links.homepage),
    pageLink("Paper", dataset.links.paper),
    pageLink("Download", dataset.links.download),
    pageLink("Annotation", dataset.links.annotation),
  ].filter(Boolean).join("");

  renderDatasetProvenance(dataset);
  renderControls();
  renderLeaderboard();
}

function renderControls() {
  syncControlState();

  renderFilterControl("track", getFilterOptions("track"));
  renderFilterControl("venue", getFilterOptions("venue"));
  renderFilterControl("variant", getFilterOptions("variant"));
}

function getFilterOptions(name) {
  if (name === "track") {
    return getTracksForDataset(store.entries, store.tracks, state.datasetId)
      .map((track) => ({ value: track.id, label: track.name }));
  }
  if (name === "venue") {
    return getVenueOptions();
  }
  if (name === "variant") {
    return getVariantOptions();
  }
  return [];
}

function getVenueOptions() {
  return unique(
    getDatasetEntries()
      .filter((entry) => matchesSelected(entry.track, state.trackIds))
      .map((entry) => getEntryVenue(entry)),
  ).map((venue) => ({ value: venue, label: venue }));
}

function getVariantOptions() {
  return unique(
    getDatasetEntries()
      .filter((entry) => matchesSelected(entry.track, state.trackIds))
      .filter((entry) => matchesSelected(getEntryVenue(entry), state.venues))
      .map((entry) => entry.variant)
      .filter(Boolean),
  ).map((variant) => ({ value: variant, label: variant }));
}

function renderFilterControl(name, options) {
  const control = els.filters[name];
  const config = filterConfig[name];
  const selected = state[config.stateKey];
  const query = filterQueries[name].trim().toLowerCase();
  const filteredOptions = options.filter((option) => (
    option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
  ));

  control.button.textContent = summarizeFilterSelection(config, options, selected);
  control.search.value = filterQueries[name];
  control.options.innerHTML = [
    renderFilterOption("__all", config.allLabel, selected.length === 0),
    filteredOptions.length > 0
      ? filteredOptions.map((option) => renderFilterOption(
        option.value,
        option.label,
        selected.includes(option.value),
      )).join("")
      : '<div class="multi-select-empty">No matches</div>',
  ].join("");
}

function renderFilterOption(value, label, checked) {
  return `
    <label class="multi-select-option">
      <input type="checkbox" value="${escapeAttr(value)}"${checked ? " checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function summarizeFilterSelection(config, options, selected) {
  if (selected.length === 0) {
    return config.allLabel;
  }

  const labels = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean);
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.length} ${config.countLabel}`;
}

function syncControlState() {
  const datasetTrackIds = getTracksForDataset(store.entries, store.tracks, state.datasetId)
    .map((track) => track.id);
  state.trackIds = state.trackIds.filter((trackId) => datasetTrackIds.includes(trackId));

  const validVenues = getVenueOptions().map((option) => option.value);
  state.venues = state.venues.filter((venue) => validVenues.includes(venue));

  const validVariants = getVariantOptions().map((option) => option.value);
  state.variants = state.variants.filter((variant) => validVariants.includes(variant));

  const scoreKeys = getScoreKeysForDataset(store.entries, state.datasetId, { trackIds: state.trackIds });
  if (!scoreKeys.includes(state.scoreKey)) {
    state.scoreKey = scoreKeys[0] || "AUC";
  }
}

function getDatasetEntries() {
  return store.entries.filter((entry) => entry.dataset_id === state.datasetId);
}

function getEntryVenue(entry) {
  return store.indexes.papersById[entry.paper_id]?.venue || "";
}

function matchesSelected(value, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(value);
}

function renderLeaderboard() {
  syncControlState();
  const scoreKeys = getScoreKeysForDataset(store.entries, state.datasetId, { trackIds: state.trackIds });
  renderHeader(scoreKeys);

  const rows = selectLeaderboardRows({
    entries: store.entries,
    indexes: store.indexes,
    filters: {
      datasetId: state.datasetId,
      trackIds: state.trackIds,
      venues: state.venues,
      variants: state.variants,
      bestPerPaper: state.bestPerPaper,
    },
    sort: {
      field: state.sortField,
      direction: state.sortDirection,
      scoreKey: state.scoreKey,
    },
  });

  updateSortIndicators();
  els.empty.hidden = rows.length > 0;
  els.body.innerHTML = rows.map((row, index) => renderRow(row, index, scoreKeys)).join("");
}

function renderHeader(scoreKeys) {
  els.head.innerHTML = `
    <th>Rank</th>
    <th><button type="button" data-sort="method">Method</button></th>
    <th><button type="button" data-sort="track">Track</button></th>
    <th><button type="button" data-sort="variant">Variant</button></th>
    ${renderMetricHeaders(scoreKeys)}
    <th><button type="button" data-sort="year">Year</button></th>
    <th><button type="button" data-sort="venue">Venue</button></th>
  `;
}

function renderMetricHeaders(scoreKeys) {
  return scoreKeys.map((scoreKey) => `
    <th>
      <button type="button" data-sort="score" data-score-key="${escapeAttr(scoreKey)}">
        ${escapeHtml(getScoreLabel(null, scoreKey))}
      </button>
    </th>
  `).join("");
}

function renderRow(row, index, scoreKeys) {
  const methodLinks = getEntryLinks(row, state.scoreKey);
  const metricCells = scoreKeys.map((scoreKey) => renderScoreCell(row, scoreKey)).join("");

  return `
    <tr>
      <td>${index + 1}</td>
      <td>
        <a href="${escapeAttr(methodLinks.methodUrl)}" target="_blank" rel="noreferrer">${escapeHtml(row.method)}</a>
      </td>
      <td><span class="badge">${escapeHtml(row.trackName)}</span></td>
      <td>${escapeHtml(row.variant || "-")}</td>
      ${metricCells}
      <td>${escapeHtml(row.year)}</td>
      <td>${escapeHtml(row.venue)}</td>
    </tr>
  `;
}

function renderScoreCell(row, scoreKey) {
  const scoreValue = getScoreValue(row, scoreKey);
  const scoreLabel = getScoreLabel(row, scoreKey);
  const links = getEntryLinks(row, scoreKey);
  const displayValue = scoreValue == null ? "-" : escapeHtml(scoreValue);

  if (!links.scoreSourceUrl || scoreValue == null) {
    return `<td class="score-cell">${displayValue}</td>`;
  }

  return `
    <td class="score-cell">
      <a href="${escapeAttr(links.scoreSourceUrl)}" target="_blank" rel="noreferrer" title="${escapeAttr(scoreLabel)}">
        ${displayValue}
      </a>
    </td>
  `;
}

function updateSortIndicators() {
  els.head.querySelectorAll("[data-sort]").forEach((header) => {
    const active = header.dataset.sort === state.sortField;
    const metricActive = header.dataset.sort === "score" && header.dataset.scoreKey === state.scoreKey;
    const showActive = active && (header.dataset.sort !== "score" || metricActive);
    header.dataset.active = showActive ? "true" : "false";
    header.dataset.direction = showActive ? state.sortDirection : "";
  });
}

function pageLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function renderDatasetProvenance(dataset) {
  if (!isDerivedDataset(dataset)) {
    els.provenance.hidden = true;
    els.provenanceBody.innerHTML = "";
    return;
  }

  els.provenance.hidden = false;
  const sourceDatasetIds = dataset.source_dataset_ids || [];
  const sources = getDatasetSources(
    { ...dataset, source_dataset_ids: sourceDatasetIds },
    store.indexes,
  );
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
