import {
  escapeAttr,
  escapeHtml,
  loadStore,
} from "./data.js";
import {
  formatList,
} from "./model.js";

let store = {
  datasets: [],
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
}

function renderDatasets() {
  els.body.innerHTML = store.datasets.map((dataset) => `
    <tr id="dataset-${escapeAttr(dataset.id)}">
      <td>
        <a href="../leaderboards/dataset.html?dataset=${escapeAttr(dataset.id)}">${escapeHtml(dataset.name)}</a>
        <div class="muted">${escapeHtml(dataset.notes)}</div>
      </td>
      <td>${escapeHtml(formatList(dataset.task_types))}</td>
      <td>${escapeHtml(formatList(dataset.metrics))}</td>
      <td class="link-list">
        <a href="../leaderboards/dataset.html?dataset=${escapeAttr(dataset.id)}">leaderboard</a>
        ${datasetLink("paper", dataset.links.paper)}
        ${datasetLink("download", dataset.links.download)}
        ${datasetLink("annotation", dataset.links.annotation)}
      </td>
    </tr>
  `).join("");
}

function datasetLink(label, url) {
  if (!url) return "";
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
