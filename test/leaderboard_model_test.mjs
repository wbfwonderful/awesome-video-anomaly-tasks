import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIndexes,
  getEntryLinks,
  getPaperLinks,
  getPaperPrimaryUrl,
  getScoreLabel,
  getScoreKeysForDataset,
  getScoreValue,
  getTracksForDataset,
  normalizePaperFiles,
  normalizeResultFiles,
  selectLeaderboardRows,
} from "../assets/model.js";

const papers = [
  {
    id: "paper-a",
    short_name: "PaperA",
    title: "Accepted Method",
    status: "accepted",
    year: 2025,
    venue: "AAAI",
    official_url: "https://official.example/a",
    arxiv_url: "https://arxiv.example/a",
    code_url: "https://code.example/a",
  },
  {
    id: "paper-b",
    short_name: "PaperB",
    title: "Preprint Method",
    status: "preprint",
    year: 2025,
    venue: "preprint",
    arxiv_url: "https://arxiv.example/b",
    code_url: "https://code.example/b",
  },
];

const tracks = [
  { id: "full-training", name: "Full Training" },
  { id: "weakly-supervised-coarse", name: "Weakly Supervised (Coarse)" },
  { id: "weakly-supervised-fine", name: "Weakly Supervised (Fine)" },
  { id: "training-free", name: "Training-free" },
  { id: "zero-shot", name: "Zero-shot" },
];

const resultFiles = [
  {
    dataset_id: "ucf-crime",
    entries: [
      {
        paper_id: "paper-a",
        method: "PaperA",
        variant: "I3D",
        track: "weakly-supervised-coarse",
        score_source: "https://source.example/a-i3d",
        scores: {
          AUC: 86.1,
        },
      },
      {
        paper_id: "paper-a",
        method: "PaperA",
        variant: "CLIP",
        track: "weakly-supervised-coarse",
        score_source: "https://source.example/a-clip",
        scores: {
          AUC: 88.2,
        },
      },
      {
        paper_id: "paper-a",
        method: "PaperA",
        variant: "CLIP",
        track: "weakly-supervised-fine",
        score_source: "https://source.example/a-clip-fine",
        scores: {
          "mAP@0.1": 11.72,
          AVG: 6.68,
        },
      },
      {
        paper_id: "paper-b",
        method: "PaperB",
        variant: null,
        track: "training-free",
        score_source: "https://source.example/b",
        scores: {
          AUC: 78.4,
        },
      },
    ],
  },
];

test("normalizePaperFiles flattens manifest-scoped paper files", () => {
  const paperFiles = [
    [{ id: "paper-a", short_name: "PaperA" }],
    [{ id: "paper-b", short_name: "PaperB" }],
  ];

  assert.deepEqual(
    normalizePaperFiles(paperFiles).map((paper) => paper.id),
    ["paper-a", "paper-b"],
  );
});

test("normalizeResultFiles converts dataset-scoped entries into flat entries", () => {
  const entries = normalizeResultFiles(resultFiles);

  assert.equal(entries.length, 4);
  assert.equal(entries[0].dataset_id, "ucf-crime");
  assert.equal(entries[0].scores.AUC, 86.1);
  assert.equal(entries[2].scores["mAP@0.1"], 11.72);
  assert.equal(entries[3].variant, "");
  assert.equal(entries[3].score_source, "https://source.example/b");
});

test("getScoreKeysForDataset reports the metrics available on a dataset page", () => {
  const entries = normalizeResultFiles(resultFiles);

  assert.deepEqual(getScoreKeysForDataset(entries, "ucf-crime"), ["AUC", "mAP@0.1", "AVG"]);
  assert.deepEqual(
    getScoreKeysForDataset(entries, "ucf-crime", { trackId: "weakly-supervised-coarse" }),
    ["AUC"],
  );
  assert.deepEqual(
    getScoreKeysForDataset(entries, "ucf-crime", { trackId: "weakly-supervised-fine" }),
    ["mAP@0.1", "AVG"],
  );
  assert.deepEqual(
    getScoreKeysForDataset(entries, "ucf-crime", { trackId: "training-free" }),
    ["AUC"],
  );
});

test("getTracksForDataset returns only tracks used by the dataset in configured order", () => {
  const entries = normalizeResultFiles(resultFiles);

  assert.deepEqual(
    getTracksForDataset(entries, tracks, "ucf-crime").map((track) => track.id),
    ["weakly-supervised-coarse", "weakly-supervised-fine", "training-free"],
  );
  assert.deepEqual(getTracksForDataset(entries, tracks, "shanghaitech"), []);
});

test("score helpers read direct numeric scores and preserve metric labels", () => {
  const entries = normalizeResultFiles(resultFiles);
  const fineRow = entries[2];

  assert.equal(getScoreValue(fineRow, "mAP@0.1"), 11.72);
  assert.equal(getScoreLabel(fineRow, "mAP@0.1"), "mAP@0.1");
});

test("selectLeaderboardRows ranks all variants by the selected score", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackId: "weakly-supervised-coarse",
      scoreKey: "AUC",
      status: "all",
      bestPerPaper: false,
    },
  });

  assert.deepEqual(
    rows.map((row) => row.variant),
    ["CLIP", "I3D"],
  );
});

test("selectLeaderboardRows can keep the best variant per paper for the selected score", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackId: "weakly-supervised-coarse",
      scoreKey: "AUC",
      status: "all",
      bestPerPaper: true,
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].variant, "CLIP");
  assert.equal(rows[0].scores.AUC, 88.2);
});

test("selectLeaderboardRows filters preprints through the venue field", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      scoreKey: "AUC",
      venue: "preprint",
      bestPerPaper: false,
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].paperStatus, "preprint");
  assert.equal(rows[0].venue, "preprint");
});

test("selectLeaderboardRows supports multi-select track, venue, and variant filters", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["weakly-supervised-coarse", "training-free"],
      venues: ["AAAI"],
      variants: ["CLIP", "I3D"],
      bestPerPaper: false,
    },
    sort: {
      field: "variant",
      direction: "asc",
      scoreKey: "AUC",
    },
  });

  assert.deepEqual(
    rows.map((row) => [row.track, row.venue, row.variant]),
    [
      ["weakly-supervised-coarse", "AAAI", "CLIP"],
      ["weakly-supervised-coarse", "AAAI", "I3D"],
    ],
  );
});

test("getScoreKeysForDataset accepts multiple selected tracks", () => {
  const entries = normalizeResultFiles(resultFiles);

  assert.deepEqual(
    getScoreKeysForDataset(entries, "ucf-crime", {
      trackIds: ["weakly-supervised-fine", "training-free"],
    }),
    ["mAP@0.1", "AVG", "AUC"],
  );
});

test("selectLeaderboardRows sorts by joined paper fields and variant", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const byVariant = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      scoreKey: "AUC",
      status: "all",
    },
    sort: {
      field: "variant",
      direction: "asc",
    },
  });
  assert.deepEqual(
    byVariant.map((row) => row.variant),
    ["", "CLIP", "CLIP", "I3D"],
  );

  const byVenue = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      scoreKey: "AUC",
      status: "all",
    },
    sort: {
      field: "venue",
      direction: "desc",
    },
  });
  assert.equal(byVenue[0].venue, "preprint");
});

test("selectLeaderboardRows keeps rows that do not report the active sort metric", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      status: "all",
    },
    sort: {
      field: "score",
      direction: "desc",
      scoreKey: "AUC",
    },
  });

  assert.equal(rows.length, 4);
  assert.equal(rows.at(-1).track, "weakly-supervised-fine");
  assert.equal(getScoreValue(rows.at(-1), "AUC"), null);
});

test("getEntryLinks separates method links from score source links", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);
  const row = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackId: "weakly-supervised-coarse",
      scoreKey: "AUC",
      status: "all",
    },
  })[1];

  const links = getEntryLinks(row, "AUC");

  assert.equal(links.methodUrl, "https://official.example/a");
  assert.equal(links.paperUrl, "https://official.example/a");
  assert.equal(links.codeUrl, "https://code.example/a");
  assert.equal(links.scoreSourceUrl, "https://source.example/a-i3d");
});

test("getEntryLinks falls back from official URL to arxiv before code", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles(resultFiles);
  const row = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["training-free"],
    },
  })[0];

  const links = getEntryLinks(row, "AUC");

  assert.equal(links.methodUrl, "https://arxiv.example/b");
  assert.equal(links.paperUrl, "https://arxiv.example/b");
  assert.equal(links.codeUrl, "https://code.example/b");
});

test("paper primary links prefer official and arxiv destinations before code links", () => {
  assert.equal(getPaperPrimaryUrl(papers[0]), "https://official.example/a");
  assert.equal(getPaperPrimaryUrl(papers[1]), "https://arxiv.example/b");
  assert.equal(getPaperPrimaryUrl({ code_url: "https://code.example/d" }), "https://code.example/d");
  assert.equal(getPaperPrimaryUrl({}), "");
});

test("paper links expose official, arxiv, and code text links", () => {
  const links = getPaperLinks({
    official_url: "https://official.example/paper",
    arxiv_url: "https://arxiv.example/paper",
    code_url: "https://code.example/paper",
  });

  assert.deepEqual(
    links.map((link) => [link.kind, link.label, link.url]),
    [
      ["official", "official paper", "https://official.example/paper"],
      ["arxiv", "arxiv paper", "https://arxiv.example/paper"],
      ["code", "code", "https://code.example/paper"],
    ],
  );
});
