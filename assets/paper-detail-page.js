import {
  escapeAttr,
  escapeHtml,
  getBasePath,
  loadStore,
} from "./data.js";
import {
  getLanguage,
  getPaperLinkLabels,
  getText,
} from "./i18n.js";
import {
  getEntryLinks,
  getPaperId,
  getPaperLinks,
  getScoreLabel,
  getScoreValue,
  getTagStyle,
  selectPaperResultRows,
} from "./model.js";

const params = new URLSearchParams(window.location.search);
const paperId = (params.get("paper") || "").trim();
const lang = getLanguage(document);

let store = {
  papers: [],
  entries: [],
  indexes: {},
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  updateLanguageSwitch();

  try {
    store = await loadStore(getBasePath("../"));
    render();
    els.status.textContent = getText("status.loaded", lang);
    els.status.className = "status ready";
  } catch (error) {
    els.status.textContent = `${getText("status.failed", lang)}: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.title = document.querySelector("#paper-title");
  els.paperTitle = document.querySelector("#paper-full-title");
  els.meta = document.querySelector("#paper-meta");
  els.links = document.querySelector("#paper-links");
  els.body = document.querySelector("#paper-results-body");
  els.empty = document.querySelector("#paper-results-empty");
  els.languageSwitch = document.querySelector("#language-switch");
  els.empty.textContent = getText("empty.noPaperResults", lang);
}

function render() {
  const paper = store.indexes.papersById[paperId];
  if (!paper) {
    document.title = `${getText("empty.unknownPaper", lang)} | Awesome Video Anomaly Tasks`;
    els.title.textContent = getText("empty.unknownPaper", lang);
    els.paperTitle.textContent = paperId || getText("common.none", lang);
    els.meta.innerHTML = "";
    els.links.innerHTML = "";
    els.body.innerHTML = "";
    els.empty.hidden = false;
    return;
  }

  const rows = selectPaperResultRows({
    entries: store.entries,
    indexes: store.indexes,
    paperId: getPaperId(paper),
  });

  document.title = `${paper.short_name} | Awesome Video Anomaly Tasks`;
  els.title.textContent = paper.short_name;
  els.paperTitle.textContent = paper.title;
  els.meta.innerHTML = renderMeta(paper);
  els.links.innerHTML = renderPaperLinks(paper);
  els.body.innerHTML = rows.map(renderResultRow).join("");
  els.empty.hidden = rows.length > 0;
}

function renderMeta(paper) {
  const metaItems = [
    paper.year,
    paper.venue,
    paper.presentation ? getText(`presentation.${paper.presentation}`, lang) : "",
  ].filter(Boolean).map((value) => `
    <span>${escapeHtml(value)}</span>
  `).join("");

  return [metaItems, renderTags(paper.tags || [])].filter(Boolean).join("");
}

function renderTags(tags) {
  return tags.map((tag) => (
    `<span class="tag" style="${escapeAttr(getTagStyle(tag))}">${escapeHtml(tag)}</span>`
  )).join("");
}

function renderPaperLinks(paper) {
  const links = getPaperLinks(paper, getPaperLinkLabels(lang));
  if (links.length === 0) return `<span class="muted">${escapeHtml(getText("common.none", lang))}</span>`;

  return `<div class="paper-text-links">${links.map((link) => `
    <a class="paper-link-${escapeAttr(link.kind)}" href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">
      ${escapeHtml(link.label)}
    </a>
  `).join("")}</div>`;
}

function renderResultRow(row) {
  const datasetName = row.dataset?.name || row.dataset_id;
  const datasetUrl = `../leaderboards/dataset.html?dataset=${encodeURIComponent(row.dataset_id)}`;

  return `
    <tr>
      <td>
        <a href="${escapeAttr(datasetUrl)}">${escapeHtml(datasetName)}</a>
      </td>
      <td>${renderTrackBadges(row)}</td>
      <td>${escapeHtml(row.variant || getText("common.none", lang))}</td>
      <td>${renderMetricList(row)}</td>
    </tr>
  `;
}

function renderTrackBadges(row) {
  return row.trackNames.map((trackName) => `
    <span class="badge">${escapeHtml(trackName)}</span>
  `).join("");
}

function renderMetricList(row) {
  const scoreKeys = Object.keys(row.scores || {});
  if (scoreKeys.length === 0) return `<span class="muted">${escapeHtml(getText("common.none", lang))}</span>`;

  return `<div class="metric-list">${scoreKeys.map((scoreKey) => {
    const value = getScoreValue(row, scoreKey);
    const displayValue = value == null ? "-" : value;
    const label = getScoreLabel(row, scoreKey);
    const sourceUrl = getEntryLinks(row, scoreKey).scoreSourceUrl;
    const content = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(displayValue)}</span>`;

    if (!sourceUrl || value == null) {
      return `<span class="metric-chip">${content}</span>`;
    }
    return `<a class="metric-chip" href="${escapeAttr(sourceUrl)}" target="_blank" rel="noreferrer">${content}</a>`;
  }).join("")}</div>`;
}

function updateLanguageSwitch() {
  if (!els.languageSwitch) return;

  const target = els.languageSwitch.getAttribute("data-lang-target");
  if (!target) return;

  const query = new URLSearchParams();
  if (paperId) {
    query.set("paper", paperId);
  }
  els.languageSwitch.href = `${target}${query.toString() ? `?${query}` : ""}`;
}
