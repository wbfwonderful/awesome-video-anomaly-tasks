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
  selectPaperRows,
} from "./model.js";

const lang = getLanguage(document);

const state = {
  query: "",
  venues: [],
  years: [],
  tags: [],
  presentations: [],
  sortField: "year",
  sortDirection: "desc",
};

const filterQueries = {
  venue: "",
  year: "",
  tag: "",
  presentation: "",
};

const filterConfig = {
  venue: {
    stateKey: "venues",
    allLabelKey: "filters.allVenues",
    countLabelKey: "filters.venues",
  },
  year: {
    stateKey: "years",
    allLabelKey: "filters.allYears",
    countLabelKey: "filters.years",
  },
  tag: {
    stateKey: "tags",
    allLabelKey: "filters.allTags",
    countLabelKey: "filters.tags",
  },
  presentation: {
    stateKey: "presentations",
    allLabelKey: "filters.allPresentations",
    countLabelKey: "filters.presentations",
  },
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
    renderControls();
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
  els.filters = {
    venue: cacheFilter("venue"),
    year: cacheFilter("year"),
    tag: cacheFilter("tag"),
    presentation: cacheFilter("presentation"),
  };
  els.head = document.querySelector("#papers-head");
  els.body = document.querySelector("#papers-body");
  els.empty = document.querySelector("#papers-empty");
  els.empty.textContent = getText("empty.noMatchingPapers", lang);
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
  els.query.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderPapers();
  });
  Object.keys(els.filters).forEach((filterName) => bindFilter(filterName));
  els.head.addEventListener("click", (event) => {
    const header = event.target.closest("[data-sort]");
    if (!header) return;

    const field = header.dataset.sort;
    if (state.sortField === field) {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.sortField = field;
      state.sortDirection = field === "year" ? "desc" : "asc";
    }
    renderPapers();
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

  renderControls();
  renderPapers();
}

function renderControls() {
  syncControlState();
  Object.keys(els.filters).forEach((name) => renderFilterControl(name, getFilterOptions(name)));
}

function getFilterOptions(name) {
  if (name === "venue") {
    return unique(store.papers.map((paper) => paper.venue))
      .map((venue) => ({ value: venue, label: venue }));
  }
  if (name === "year") {
    return unique(store.papers.map((paper) => String(paper.year || "")))
      .sort((a, b) => Number(b) - Number(a) || b.localeCompare(a))
      .map((year) => ({ value: year, label: year }));
  }
  if (name === "tag") {
    return unique(store.papers.flatMap((paper) => paper.tags || []))
      .map((tag) => ({ value: tag, label: tag }));
  }
  if (name === "presentation") {
    return unique(store.papers.map((paper) => paper.presentation))
      .map((presentation) => ({
        value: presentation,
        label: getPresentationLabel(presentation),
      }));
  }
  return [];
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
    renderFilterOption("__all", getText(config.allLabelKey, lang), selected.length === 0),
    filteredOptions.length > 0
      ? filteredOptions.map((option) => renderFilterOption(
        option.value,
        option.label,
        selected.includes(option.value),
      )).join("")
      : `<div class="multi-select-empty">${escapeHtml(getText("empty.noMatches", lang))}</div>`,
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
    return getText(config.allLabelKey, lang);
  }

  const labels = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean);
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.length} ${getText(config.countLabelKey, lang)}`;
}

function syncControlState() {
  Object.keys(filterConfig).forEach((name) => {
    const stateKey = filterConfig[name].stateKey;
    const validValues = getFilterOptions(name).map((option) => option.value);
    state[stateKey] = state[stateKey].filter((value) => validValues.includes(value));
  });
}

function renderPapers() {
  const rows = selectPaperRows({
    papers: store.papers,
    filters: {
      query: state.query,
      venues: state.venues,
      years: state.years,
      tags: state.tags,
      presentations: state.presentations,
    },
    sort: {
      field: state.sortField,
      direction: state.sortDirection,
    },
  });

  updateSortIndicators();
  els.body.innerHTML = rows.map((paper) => `
    <tr id="paper-${escapeAttr(paper.id)}">
      <td>
        <div class="paper-title-row">
          ${renderPaperPrimaryLink(paper)}
          ${renderPresentationTag(paper.presentation)}
        </div>
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

function updateSortIndicators() {
  els.head.querySelectorAll("[data-sort]").forEach((header) => {
    const active = header.dataset.sort === state.sortField;
    header.dataset.active = active ? "true" : "false";
    header.dataset.direction = active ? state.sortDirection : "";
  });
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

function renderPresentationTag(presentation) {
  const key = String(presentation || "").trim().toLowerCase();
  if (!key) return "";

  const label = getText(`presentation.${key}`, lang);
  return `<span class="presentation-tag ${escapeAttr(key)}">${escapeHtml(label)}</span>`;
}

function renderTags(tags) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function getPresentationLabel(presentation) {
  return getText(`presentation.${presentation}`, lang);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
