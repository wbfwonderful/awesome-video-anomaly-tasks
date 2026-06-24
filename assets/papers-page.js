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
  getPaperLinks,
  getPaperPrimaryUrl,
} from "./model.js";

const lang = getLanguage(document);

const state = {
  query: "",
};

let store = {
  papers: [],
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindControls();

  try {
    store = await loadStore(getBasePath("../"));
    renderPapers();
    els.status.textContent = getText("status.loaded", lang);
    els.status.className = "status ready";
  } catch (error) {
    els.status.textContent = `${getText("status.failed", lang)}: ${error.message}`;
    els.status.className = "status error";
  }
});

function cacheElements() {
  els.status = document.querySelector("#load-status");
  els.query = document.querySelector("#paper-query");
  els.body = document.querySelector("#papers-body");
  els.empty = document.querySelector("#papers-empty");
  els.empty.textContent = getText("empty.noMatchingPapers", lang);
}

function bindControls() {
  els.query.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderPapers();
  });
}

function renderPapers() {
  const rows = store.papers
    .filter((paper) => {
      if (!state.query) return true;
      const haystack = [
        paper.short_name,
        paper.title,
        paper.venue,
        paper.year,
        ...(paper.tags || []),
      ].join(" ").toLowerCase();
      return haystack.includes(state.query);
    })
    .sort((a, b) => b.year - a.year || a.short_name.localeCompare(b.short_name));

  els.body.innerHTML = rows.map((paper) => `
    <tr id="paper-${escapeAttr(paper.id)}">
      <td>
        ${renderPaperPrimaryLink(paper)}
        <div class="muted">${escapeHtml(paper.title)}</div>
      </td>
      <td>${escapeHtml(paper.year)}</td>
      <td>${escapeHtml(paper.venue)}</td>
      <td>${renderTags(paper.tags || [])}</td>
      <td class="paper-links">${renderPaperLinks(paper)}</td>
    </tr>
  `).join("");
  els.empty.hidden = rows.length > 0;
}

function renderPaperPrimaryLink(paper) {
  const primaryUrl = getPaperPrimaryUrl(paper);
  if (!primaryUrl) return `<span class="paper-name">${escapeHtml(paper.short_name)}</span>`;

  return `<a href="${escapeAttr(primaryUrl)}" target="_blank" rel="noreferrer">${escapeHtml(paper.short_name)}</a>`;
}

function renderPaperLinks(paper) {
  const links = getPaperLinks(paper, getPaperLinkLabels(lang));
  if (links.length === 0) return `<span class="muted">-</span>`;

  return `<div class="paper-text-links">${links.map((link) => `
    <a class="paper-link-${escapeAttr(link.kind)}" href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">
      ${escapeHtml(link.label)}
    </a>
  `).join("")}</div>`;
}

function renderTags(tags) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}
