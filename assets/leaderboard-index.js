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
  countByTrack,
  formatList,
} from "./model.js";

const lang = getLanguage(document);

let store = {
  datasets: [],
  tracks: [],
  entries: [],
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    store = await loadStore(getBasePath("../"));
    render();
  } catch (error) {
    els.status.textContent = `${getText("status.failed", lang)}: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.stats = document.querySelector("#stats");
  els.trackBars = document.querySelector("#track-bars");
  els.datasetsBody = document.querySelector("#datasets-body");
}

function render() {
  els.status.textContent = getText("status.loaded", lang);
  els.status.className = "status ready";
  renderStats();
  renderTrackBars();
  renderDatasets();
}

function renderStats() {
  els.stats.innerHTML = [
    statTile(getText("stats.datasets", lang), store.datasets.length),
    statTile(getText("stats.tracks", lang), store.tracks.length),
    statTile(getText("stats.rows", lang), store.entries.length),
    statTile(getText("stats.scoreCells", lang), countScores(store.entries)),
  ].join("");
}

function renderTrackBars() {
  const counts = countByTrack(store.entries);
  const max = Math.max(1, ...Object.values(counts));
  els.trackBars.innerHTML = store.tracks.map((track) => {
    const count = counts[track.id] || 0;
    const width = Math.max(4, Math.round((count / max) * 100));
    return `
      <div class="track-bar">
        <div class="track-bar-label">
          <span>${escapeHtml(track.name)}</span>
          <strong>${count}</strong>
        </div>
        <div class="track-bar-rail">
          <span style="width: ${width}%"></span>
        </div>
      </div>
    `;
  }).join("");
}

function renderDatasets() {
  els.datasetsBody.innerHTML = store.datasets.map((dataset) => `
    <tr>
      <td>
        <a href="dataset.html?dataset=${escapeAttr(dataset.id)}">${escapeHtml(dataset.name)}</a>
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

function datasetLinks(dataset) {
  const links = [
    pageLink("leaderboard", getText("links.leaderboard", lang), `dataset.html?dataset=${encodeURIComponent(dataset.id)}`, false),
    pageLink("paper", getText("links.paper", lang), dataset.links.paper),
    pageLink("download", getText("links.download", lang), dataset.links.download),
  ].filter(Boolean).join("");

  return `<div class="dataset-text-links">${links}</div>`;
}

function statTile(label, value) {
  return `
    <div class="stat-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function countScores(entries) {
  return entries.reduce((total, entry) => total + Object.keys(entry.scores || {}).length, 0);
}

function pageLink(kind, label, url, external = true) {
  if (!url) return "";
  const attrs = external ? ' target="_blank" rel="noreferrer"' : "";
  return `<a class="dataset-link-${escapeAttr(kind)}" href="${escapeAttr(url)}"${attrs}>${escapeHtml(label)}</a>`;
}
