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
  const sourceDatasetIds = dataset.source_dataset_ids || [];
  if (sourceDatasetIds.length === 0) return `<span class="muted">-</span>`;

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
