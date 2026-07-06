import test from "node:test";
import assert from "node:assert/strict";

import {
  getLanguage,
  getPaperLinkLabel,
  getText,
} from "../assets/i18n.js";

import {
  buildHomeSummary,
  buildIndexes,
  countByTrack,
  formatDatasetLabel,
  getEntryLinks,
  getDatasetSources,
  getPaperLinks,
  getPaperPrimaryUrl,
  getScoreLabel,
  getScoreKeysForDataset,
  getScoreValue,
  getTracksForDataset,
  isDerivedDataset,
  normalizePaperFiles,
  normalizeResultFiles,
  selectPaperRows,
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
  {
    id: "paper-c",
    short_name: "PaperC",
    title: "Code Only Method",
    status: "preprint",
    year: 2026,
    venue: "preprint",
    code_url: "https://code.example/c",
  },
];

const tracks = [
  { id: "full-training", name: "Full Training" },
  { id: "weakly-supervised-coarse", name: "Weakly Supervised (Coarse)" },
  { id: "weakly-supervised-fine", name: "Weakly Supervised (Fine)" },
  { id: "training-free", name: "Training-free" },
  { id: "zero-shot", name: "Zero-shot" },
];

test("dataset helpers identify derived benchmarks and resolve source datasets", () => {
  const datasets = [
    { id: "ucf-crime", name: "UCF-Crime", dataset_type: "original-video" },
    { id: "xd-violence", name: "XD-Violence", dataset_type: "original-video" },
    {
      id: "vad-reasoning",
      name: "VAD-Reasoning",
      dataset_type: "derived-benchmark",
      source_dataset_ids: ["ucf-crime", "xd-violence"],
    },
  ];
  const indexes = buildIndexes({ papers, datasets, tracks });
  const derived = datasets[2];

  assert.equal(isDerivedDataset(derived), true);
  assert.equal(isDerivedDataset(datasets[0]), false);
  assert.deepEqual(
    getDatasetSources(derived, indexes).map((dataset) => dataset.name),
    ["UCF-Crime", "XD-Violence"],
  );
  assert.equal(formatDatasetLabel("reasoning-annotations"), "Reasoning annotations");
});

test("i18n helpers read page language and return Chinese UI labels", () => {
  assert.equal(getLanguage({ documentElement: { lang: "zh-CN" } }), "zh-CN");
  assert.equal(getText("status.loaded", "zh-CN"), "数据已加载");
  assert.equal(getText("filters.allTracks", "zh-CN"), "全部 Track");
  assert.equal(getPaperLinkLabel("official", "zh-CN"), "论文主页");
});

const resultFiles = [
  {
    dataset_id: "ucf-crime",
    entries: [
      {
        paper_id: "paper-a",
        variant: "I3D",
        track: "weakly-supervised-coarse",
        score_source: "https://source.example/a-i3d",
        scores: {
          AUC: 86.1,
        },
      },
      {
        paper_id: "paper-a",
        variant: "CLIP",
        track: "weakly-supervised-coarse",
        score_source: "https://source.example/a-clip",
        scores: {
          AUC: 88.2,
        },
      },
      {
        paper_id: "paper-a",
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

const multiTrackResultFiles = [
  {
    dataset_id: "ucf-crime",
    entries: [
      {
        paper_id: "paper-a",
        variant: "MLLM",
        tracks: ["zero-shot", "training-free"],
        score_source: "https://source.example/a-multitrack",
        scores: {
          AUC: 79.2,
        },
      },
      {
        paper_id: "paper-b",
        variant: "MLLM",
        track: "training-free",
        score_source: "https://source.example/b-training-free",
        scores: {
          AUC: 78.4,
        },
      },
    ],
  },
];

const groupedResultFiles = [
  {
    dataset_id: "ucf-crime",
    entry_groups: {
      "weakly-supervised-coarse": [
        {
          paper_id: "paper-a",
          variant: "CLIP",
          score_source: "https://source.example/a-clip",
          scores: {
            AUC: 88.2,
          },
        },
      ],
      "weakly-supervised-fine": [
        {
          paper_id: "paper-a",
          variant: "",
          score_source: "https://source.example/a-fine",
          scores: {
            "mAP@0.1": 11.72,
            AVG: 6.68,
          },
        },
      ],
      "training-free": [
        {
          paper_id: "paper-b",
          variant: null,
          score_source: "https://source.example/b",
          scores: {
            AUC: 78.4,
          },
        },
      ],
    },
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

test("selectPaperRows filters papers by query and multi-select metadata", () => {
  const paperRows = [
    {
      id: "paper-z",
      short_name: "Zeta",
      title: "Vision-language Detector",
      year: 2024,
      venue: "CVPR",
      presentation: "oral",
      tags: ["clip", "vision-language"],
    },
    {
      id: "paper-a",
      short_name: "Alpha",
      title: "Training-Free Video Reasoning",
      year: 2026,
      venue: "ICML",
      presentation: "spotlight",
      tags: ["training-free", "MLLM"],
    },
    {
      id: "paper-b",
      short_name: "Beta",
      title: "Clip Baseline",
      year: 2025,
      venue: "preprint",
      tags: ["clip"],
    },
  ];

  const filtered = selectPaperRows({
    papers: paperRows,
    filters: {
      query: "training",
      venues: ["ICML", "CVPR"],
      years: ["2026"],
      tags: ["MLLM"],
      presentations: ["spotlight"],
    },
    sort: {
      field: "paper",
      direction: "asc",
    },
  });

  assert.deepEqual(filtered.map((paper) => paper.short_name), ["Alpha"]);
});

test("selectPaperRows sorts papers by clicked columns", () => {
  const paperRows = [
    { id: "paper-z", short_name: "Zeta", title: "Zeta", year: 2024, venue: "CVPR", tags: ["clip"] },
    { id: "paper-a", short_name: "Alpha", title: "Alpha", year: 2026, venue: "ICML", tags: ["training-free"] },
    { id: "paper-b", short_name: "Beta", title: "Beta", year: 2025, venue: "AAAI", tags: ["benchmark"] },
  ];

  assert.deepEqual(
    selectPaperRows({
      papers: paperRows,
      sort: { field: "year", direction: "desc" },
    }).map((paper) => paper.short_name),
    ["Alpha", "Beta", "Zeta"],
  );
  assert.deepEqual(
    selectPaperRows({
      papers: paperRows,
      sort: { field: "venue", direction: "asc" },
    }).map((paper) => paper.short_name),
    ["Beta", "Zeta", "Alpha"],
  );
  assert.deepEqual(
    selectPaperRows({
      papers: paperRows,
      sort: { field: "tags", direction: "asc" },
    }).map((paper) => paper.short_name),
    ["Beta", "Zeta", "Alpha"],
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

test("normalizeResultFiles preserves all track IDs on multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].trackIds, ["zero-shot", "training-free"]);
  assert.equal(entries[0].track, "zero-shot");
  assert.deepEqual(entries[1].trackIds, ["training-free"]);
});

test("normalizeResultFiles expands entry_groups into track-scoped entries", () => {
  const entries = normalizeResultFiles(groupedResultFiles);

  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => [entry.dataset_id, entry.track, entry.trackIds, entry.variant]),
    [
      ["ucf-crime", "weakly-supervised-coarse", ["weakly-supervised-coarse"], "CLIP"],
      ["ucf-crime", "weakly-supervised-fine", ["weakly-supervised-fine"], ""],
      ["ucf-crime", "training-free", ["training-free"], ""],
    ],
  );
  assert.equal(entries[0].scores.AUC, 88.2);
  assert.equal(entries[1].scores["mAP@0.1"], 11.72);
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

test("getScoreKeysForDataset matches normalized multi-track entries by secondary track", () => {
  const entries = normalizeResultFiles([
    {
      dataset_id: "ucf-crime",
      entries: [
        {
          paper_id: "paper-a",
          variant: "MLLM",
          tracks: ["zero-shot", "training-free"],
          score_source: "https://source.example/a-multitrack",
          scores: {
            "Secondary-only": 79.2,
          },
        },
      ],
    },
  ]).map(({ tracks: _tracks, ...entry }) => entry);

  assert.deepEqual(
    getScoreKeysForDataset(entries, "ucf-crime", { trackIds: ["training-free"] }),
    ["Secondary-only"],
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

test("getTracksForDataset includes all tracks from multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.deepEqual(
    getTracksForDataset(entries, tracks, "ucf-crime").map((track) => track.id),
    ["training-free", "zero-shot"],
  );
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

test("selectLeaderboardRows derives method names from paper short_name", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles([
    {
      dataset_id: "ucf-crime",
      entry_groups: {
        "training-free": [
          {
            paper_id: "paper-a",
            variant: "",
            score_source: "",
            scores: {
              AUC: 88.2,
            },
          },
        ],
      },
    },
  ]);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["training-free"],
    },
  });

  assert.equal(rows[0].method, "PaperA");
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

test("selectLeaderboardRows matches multi-track rows by any selected track", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks });
  const entries = normalizeResultFiles(multiTrackResultFiles);

  const zeroShotRows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["zero-shot"],
    },
  });
  const trainingFreeRows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["training-free"],
    },
  });

  assert.deepEqual(zeroShotRows.map((row) => row.method), ["PaperA"]);
  assert.deepEqual(
    trainingFreeRows.map((row) => [row.method, row.trackNames]),
    [
      ["PaperA", ["Zero-shot", "Training-free"]],
      ["PaperB", ["Training-free"]],
    ],
  );
});

test("selectLeaderboardRows filters rows expanded from entry_groups by track", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks });
  const entries = normalizeResultFiles(groupedResultFiles);

  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["weakly-supervised-fine"],
    },
    sort: {
      scoreKey: "AVG",
    },
  });

  assert.deepEqual(rows.map((row) => [row.method, row.trackName, row.scores.AVG]), [
    ["PaperA", "Weakly Supervised (Fine)", 6.68],
  ]);
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

test("countByTrack counts every track on multi-track entries", () => {
  const entries = normalizeResultFiles(multiTrackResultFiles);

  assert.equal(countByTrack(entries)["zero-shot"], 1);
  assert.equal(countByTrack(entries)["training-free"], 2);
});

test("buildHomeSummary derives homepage statistics from source data", () => {
  const entries = normalizeResultFiles([
    ...resultFiles,
    ...multiTrackResultFiles,
  ]);
  const datasets = [
    { id: "ucf-crime", name: "UCF-Crime" },
    { id: "shanghaitech", name: "ShanghaiTech" },
  ];
  const taggedPapers = [
    { ...papers[0], tags: ["weakly-supervised", "clip"] },
    { ...papers[1], tags: ["weakly-supervised"] },
    { ...papers[2], tags: ["training-free", "clip"] },
  ];

  assert.deepEqual(
    buildHomeSummary({ papers: taggedPapers, datasets, tracks, entries }),
    {
      paper_stats: {
        papers: 3,
        published: 1,
        preprints: 2,
        tags: 3,
      },
      dataset_stats: {
        datasets: 2,
        with_results: 1,
        tracks: 5,
        rows: 6,
      },
      top_tags: [
        { tag: "clip", count: 2 },
        { tag: "weakly-supervised", count: 2 },
        { tag: "training-free", count: 1 },
      ],
      track_coverage: [
        { id: "full-training", name: "Full Training", count: 0 },
        { id: "weakly-supervised-coarse", name: "Weakly Supervised (Coarse)", count: 2 },
        { id: "weakly-supervised-fine", name: "Weakly Supervised (Fine)", count: 1 },
        { id: "training-free", name: "Training-free", count: 3 },
        { id: "zero-shot", name: "Zero-shot", count: 1 },
      ],
    },
  );
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

test("getEntryLinks falls back to the paper URL when score_source is empty", () => {
  const indexes = buildIndexes({ papers, datasets: [], tracks: [] });
  const entries = normalizeResultFiles([
    {
      dataset_id: "ucf-crime",
      entry_groups: {
        "training-free": [
          {
            paper_id: "paper-a",
            variant: "",
            score_source: "",
            scores: {
              AUC: 88.2,
            },
          },
          {
            paper_id: "paper-b",
            variant: "",
            score_source: "",
            scores: {
              AUC: 78.4,
            },
          },
          {
            paper_id: "paper-c",
            variant: "",
            score_source: "",
            scores: {
              AUC: 70.1,
            },
          },
        ],
      },
    },
  ]);
  const rows = selectLeaderboardRows({
    entries,
    indexes,
    filters: {
      datasetId: "ucf-crime",
      trackIds: ["training-free"],
    },
    sort: {
      field: "method",
      direction: "asc",
    },
  });

  assert.deepEqual(
    rows.map((row) => getEntryLinks(row, "AUC").scoreSourceUrl),
    [
      "https://official.example/a",
      "https://arxiv.example/b",
      "https://code.example/c",
    ],
  );
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

test("paper links accept localized labels without changing default English labels", () => {
  const defaultLinks = getPaperLinks({ official_url: "https://official.example/paper" });
  const zhLinks = getPaperLinks(
    { official_url: "https://official.example/paper" },
    { official: "论文主页" },
  );

  assert.equal(defaultLinks[0].label, "official paper");
  assert.equal(zhLinks[0].label, "论文主页");
});
