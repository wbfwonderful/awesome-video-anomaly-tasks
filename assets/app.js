import {
  escapeHtml,
  getBasePath,
} from "./data.js";
import {
  getLanguage,
  getText,
} from "./i18n.js";

const lang = getLanguage(document);
const SUMMARY_PATH = `${getBasePath()}data/home-summary.json`;

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    const summary = await fetchSummary();
    render(summary);
  } catch (error) {
    console.error(`${getText("status.failed", lang)}: ${error.message}`);
  }
});

function cacheElements() {
  els.paperStats = document.querySelector("#paper-stats");
  els.paperTags = document.querySelector("#paper-tags");
  els.datasetStats = document.querySelector("#dataset-stats");
  els.trackBars = document.querySelector("#track-bars");
}

async function fetchSummary() {
  const response = await fetch(SUMMARY_PATH);
  if (!response.ok) {
    throw new Error(`${SUMMARY_PATH} returned ${response.status}`);
  }
  return response.json();
}

function render(summary) {
  renderPaperSummary(summary.paper_stats, summary.top_tags);
  renderDatasetSummary(summary.dataset_stats);
  renderTrackBars(summary.track_coverage);
}

function renderPaperSummary(stats, topTags) {
  els.paperStats.innerHTML = [
    statTile(getText("stats.papers", lang), stats.papers),
    statTile(getText("stats.published", lang), stats.published),
    statTile(getText("stats.preprints", lang), stats.preprints),
    statTile(getText("stats.tags", lang), stats.tags),
  ].join("");
  els.paperTags.innerHTML = renderTopTags(topTags);
}

function renderDatasetSummary(stats) {
  els.datasetStats.innerHTML = [
    statTile(getText("stats.datasets", lang), stats.datasets),
    statTile(getText("stats.withResults", lang), stats.with_results),
    statTile(getText("stats.tracks", lang), stats.tracks),
    statTile(getText("stats.rows", lang), stats.rows),
  ].join("");
}

function statTile(label, value) {
  return `
    <div class="stat-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderTrackBars(trackCoverage) {
  const max = Math.max(1, ...trackCoverage.map((track) => track.count));
  els.trackBars.innerHTML = trackCoverage.map((track) => {
    const count = track.count || 0;
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

function renderTopTags(topTags) {
  if (!topTags || topTags.length === 0) return "";

  return topTags.map(({ tag, count }) => `
    <span class="tag">${escapeHtml(tag)} <strong>${escapeHtml(count)}</strong></span>
  `).join("");
}
