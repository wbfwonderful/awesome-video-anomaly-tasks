import {
  buildIndexes,
  normalizePaperFiles,
  normalizeResultFiles,
} from "./model.js";

export async function loadStore(basePath = "") {
  const [paperIndex, datasets, tracks, resultIndex] = await Promise.all([
    fetchYaml(`${basePath}data/papers/index.yaml`),
    fetchYaml(`${basePath}data/datasets.yaml`),
    fetchYaml(`${basePath}data/tracks.yaml`),
    fetchYaml(`${basePath}data/results/index.yaml`),
  ]);

  const paperFiles = await Promise.all(
    paperIndex.files.map((file) => fetchYaml(`${basePath}data/papers/${file}`)),
  );
  const resultFiles = await Promise.all(
    resultIndex.files.map((file) => fetchYaml(`${basePath}data/results/${file}`)),
  );
  const papers = normalizePaperFiles(paperFiles);
  const entries = normalizeResultFiles(resultFiles);
  const indexes = buildIndexes({ papers, datasets, tracks });

  return { papers, datasets, tracks, entries, indexes };
}

export function getBasePath(
  defaultBasePath = "",
  documentRef = typeof document === "undefined" ? null : document,
) {
  return documentRef?.documentElement?.dataset?.basePath || defaultBasePath;
}

export async function fetchYaml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  const text = await response.text();
  return window.jsyaml.load(text);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}
