import {
  escapeAttr,
  escapeHtml,
  loadStore,
} from "./data.js";
import {
  countByTrack,
  formatList,
} from "./model.js";

let store = {
  datasets: [],
  tracks: [],
  entries: [],
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    store = await loadStore("../");
    render();
  } catch (error) {
    els.status.textContent = `Failed to load data: ${error.message}`;
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
  els.status.textContent = "Data loaded";
  els.status.className = "status ready";
  renderStats();
  renderTrackBars();
  renderDatasets();
}

function renderStats() {
  els.stats.innerHTML = [
    statTile("Datasets", store.datasets.length),
    statTile("Tracks", store.tracks.length),
    statTile("Rows", store.entries.length),
    statTile("Score cells", countScores(store.entries)),
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
        <a href="dataset.html?dataset=${escapeAttr(dataset.id)}">leaderboard</a>
        ${pageLink("paper", dataset.links.paper)}
        ${pageLink("download", dataset.links.download)}
      </td>
    </tr>
  `).join("");
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

function pageLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
