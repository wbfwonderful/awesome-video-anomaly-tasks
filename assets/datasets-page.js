import {
  escapeAttr,
  escapeHtml,
  getBasePath,
  loadStore,
} from "./data.js";
import {
  getLanguage,
  getText,
} from "./i18n.js";
import {
  formatDatasetLabel,
  formatList,
  getDatasetSources,
  isDerivedDataset,
} from "./model.js";

const lang = getLanguage(document);

let store = {
  datasets: [],
  indexes: {},
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    store = await loadStore(getBasePath("../"));
    renderDatasets();
    els.status.textContent = getText("status.loaded", lang);
    els.status.className = "status ready";
  } catch (error) {
    els.status.textContent = `${getText("status.failed", lang)}: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.body = document.querySelector("#datasets-body");
  els.derivedBody = document.querySelector("#derived-datasets-body");
  els.derivedEmpty = document.querySelector("#derived-datasets-empty");
  els.derivedEmpty.textContent = getText("empty.noDerivedDatasets", lang);
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
      <td>${escapeHtml(dataset.has_new_videos ? getText("common.yes", lang) : getText("common.no", lang))}</td>
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
  if (sourceDatasetIds.length === 0) return `<span class="muted">${escapeHtml(getText("common.none", lang))}</span>`;

  const sources = getDatasetSources(dataset, store.indexes);
  if (sources.length === 0) return `<span class="muted">${escapeHtml(getText("common.none", lang))}</span>`;

  return sources.map((source) => `
    <a class="tag" href="../leaderboards/dataset.html?dataset=${escapeAttr(source.id)}">
      ${escapeHtml(source.name)}
    </a>
  `).join("");
}

function renderContributionTypes(types = []) {
  if (types.length === 0) return `<span class="muted">${escapeHtml(getText("common.none", lang))}</span>`;

  return types.map((type) => `
    <span class="tag">${escapeHtml(formatDatasetLabel(type))}</span>
  `).join("");
}

function datasetLinks(dataset) {
  return `
    <a href="${escapeAttr(leaderboardPath(dataset.id))}">${escapeHtml(getText("links.leaderboard", lang))}</a>
    ${datasetLink(getText("links.paper", lang), dataset.links.paper)}
    ${datasetLink(getText("links.download", lang), dataset.links.download)}
    ${datasetLink(getText("links.annotation", lang), dataset.links.annotation)}
  `;
}

function leaderboardPath(datasetId) {
  return `../leaderboards/dataset.html?dataset=${encodeURIComponent(datasetId)}`;
}

function datasetLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
