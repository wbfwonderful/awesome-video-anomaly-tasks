import {
  escapeHtml,
} from "./data.js";

const SUMMARY_PATH = "data/home-summary.json";

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  try {
    const summary = await fetchSummary();
    render(summary);
  } catch (error) {
    console.error(`Failed to load homepage data: ${error.message}`);
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
    statTile("Papers", stats.papers),
    statTile("Published", stats.published),
    statTile("Preprints", stats.preprints),
    statTile("Tags", stats.tags),
  ].join("");
  els.paperTags.innerHTML = renderTopTags(topTags);
}

function renderDatasetSummary(stats) {
  els.datasetStats.innerHTML = [
    statTile("Datasets", stats.datasets),
    statTile("With Results", stats.with_results),
    statTile("Tracks", stats.tracks),
    statTile("Rows", stats.rows),
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
