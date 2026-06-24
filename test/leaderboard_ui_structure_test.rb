require "minitest/autorun"

ROOT = File.expand_path("..", __dir__)

class LeaderboardUiStructureTest < Minitest::Test
  def test_dataset_leaderboard_uses_compact_columns
    html = File.read(File.join(ROOT, "leaderboards/dataset.html"))
    js = File.read(File.join(ROOT, "assets/dataset-page.js"))

    refute_includes html, "status-filter"
    refute_includes html, "score-filter"
    refute_includes html, '<select id="track-filter"'
    refute_includes html, '<select id="venue-filter"'
    refute_includes html, '<select id="variant-filter"'
    assert_includes html, 'id="track-filter-search"'
    assert_includes html, 'id="venue-filter-search"'
    assert_includes html, 'id="variant-filter-search"'
    assert_includes html, 'id="dataset-provenance"'
    assert_includes html, 'id="dataset-provenance-body"'
    assert_includes html, 'class="multi-select-options"'
    refute_includes html, 'data-sort="status"'
    refute_includes html, "<th>Links</th>"
    assert_includes html, 'id="leaderboard-head"'
    assert_includes js, "function renderMetricHeaders"
    assert_includes js, "function renderFilterControl"
    assert_includes js, "function renderDatasetProvenance"
    assert_includes js, "provenance.builtFrom"
    assert_includes js, "source_dataset_ids"
    assert_includes js, "has_new_videos"
    assert_includes js, "scoreKeys.map((scoreKey) => renderScoreCell(row, scoreKey))"
    assert_includes js, "function renderTrackBadges"
    assert_includes js, "row.trackNames.map"
    refute_includes js, '<div class="muted">${escapeHtml(row.variant)}</div>'
    refute_includes js, '<td class="link-list">'
  end

  def test_homepage_links_to_paper_and_dataset_subpages
    html = File.read(File.join(ROOT, "index.html"))
    js = File.read(File.join(ROOT, "assets/app.js"))

    assert_includes html, 'class="home-overview"'
    assert_includes html, 'id="paper-stats"'
    assert_includes html, 'id="dataset-stats"'
    refute_includes html, 'id="load-status"'
    assert_includes html, "<nav"
    assert_includes html, 'href="zh/"'
    assert_includes html, "Datasets &amp; Leaderboards"
    assert_includes html, 'href="papers/"'
    assert_includes html, 'href="datasets/"'
    assert_includes html, 'href="leaderboards/"'
    refute_includes html, "js-yaml"
    refute_includes html, 'id="leaderboards"'
    refute_includes html, 'id="data-index-title"'
    refute_includes html, 'id="papers"'
    refute_includes html, 'id="datasets"'
    refute_includes html, 'id="papers-body"'
    refute_includes html, 'id="datasets-body"'
    assert_includes js, "renderPaperSummary"
    assert_includes js, "renderDatasetSummary"
    assert_includes js, "fetchSummary"
    assert_includes js, "home-summary.json"
    refute_includes js, "els.status"
    refute_includes js, "loadStore"
    refute_includes js, "renderPapers"
    refute_includes js, "renderDatasets"
  end

  def test_homepage_has_static_summary_fallback
    html = File.read(File.join(ROOT, "index.html"))

    refute_includes html, "<strong>-</strong>"
    assert_includes html, "<strong>14</strong>"
    assert_includes html, "<strong>13</strong>"
    assert_includes html, "<strong>6</strong>"
    assert_includes html, "weakly-supervised"
    assert_includes html, "Weakly Supervised (Fine)"
    assert_includes html, 'class="track-bar"'
  end

  def test_papers_page_uses_tags_and_text_links
    html = File.read(File.join(ROOT, "papers/index.html"))
    js = File.read(File.join(ROOT, "assets/papers-page.js"))
    model = File.read(File.join(ROOT, "assets/model.js"))
    data_js = File.read(File.join(ROOT, "assets/data.js"))

    refute_includes html, "<th>Status</th>"
    refute_includes html, "<th>Tasks</th>"
    refute_includes html, 'id="paper-status-filter"'
    assert_includes html, 'id="papers"'
    assert_includes html, 'id="paper-query"'
    assert_includes html, "<th>Tags</th>"
    assert_includes html, "<th>Links</th>"
    refute_includes js, "state.paperStatus"
    refute_includes js, "paper.task_types"
    refute_includes js, "status-pill"
    assert_includes js, "getPaperPrimaryUrl"
    assert_includes js, "getPaperLinks"
    assert_includes js, 'class="paper-text-links"'
    assert_includes js, 'paper-link-${escapeAttr(link.kind)}'
    assert_includes model, "official paper"
    assert_includes model, "arxiv paper"
    assert_includes data_js, "data/papers/index.yaml"
    assert_includes data_js, "data/papers/${file}"
    css = File.read(File.join(ROOT, "assets/styles.css"))
    assert_includes css, ".paper-link-official"
    assert_includes css, ".paper-link-arxiv"
    assert_includes css, ".paper-link-code"
    refute_includes js, "paper-badge-row"
    refute_includes js, "shield-link"
    refute_includes model, "img.shields.io"
    refute_includes model, "project" + "_url"
  end

  def test_datasets_page_lists_dataset_metadata
    html = File.read(File.join(ROOT, "datasets/index.html"))
    js = File.read(File.join(ROOT, "assets/datasets-page.js"))

    assert_includes html, 'id="datasets"'
    assert_includes html, 'id="datasets-body"'
    assert_includes html, 'id="derived-datasets"'
    assert_includes html, 'id="derived-datasets-body"'
    assert_includes html, "<th>Dataset</th>"
    assert_includes html, "<th>Tasks</th>"
    assert_includes html, "<th>Metrics</th>"
    assert_includes html, "<th>Benchmark</th>"
    assert_includes html, "<th>Based On</th>"
    assert_includes html, "<th>Adds</th>"
    assert_includes html, "<th>New Videos</th>"
    assert_includes html, "<th>Links</th>"
    assert_includes js, "renderOriginalDatasets"
    assert_includes js, "renderDerivedDatasets"
    assert_includes js, "source_dataset_ids"
    assert_includes js, "has_new_videos"
    assert_includes js, "leaderboards/dataset.html?dataset="
  end

  def test_shared_page_scripts_use_i18n_and_configurable_data_base_path
    scripts = %w[
      assets/app.js
      assets/papers-page.js
      assets/datasets-page.js
      assets/leaderboard-index.js
      assets/dataset-page.js
    ]

    scripts.each do |path|
      js = File.read(File.join(ROOT, path))
      assert_includes js, "getLanguage"
      assert_includes js, "getText"
    end

    data_js = File.read(File.join(ROOT, "assets/data.js"))
    assert_includes data_js, "function getBasePath"
    assert_includes File.read(File.join(ROOT, "assets/app.js")), "getBasePath"
    assert_includes File.read(File.join(ROOT, "assets/papers-page.js")), "getBasePath"
    assert_includes File.read(File.join(ROOT, "assets/datasets-page.js")), "getBasePath"
    assert_includes File.read(File.join(ROOT, "assets/leaderboard-index.js")), "getBasePath"
    assert_includes File.read(File.join(ROOT, "assets/dataset-page.js")), "getBasePath"

    dataset_js = File.read(File.join(ROOT, "assets/dataset-page.js"))
    assert_includes dataset_js, "function updateLanguageSwitch"
    assert_includes dataset_js, "language-switch"
    assert_includes dataset_js, "data-lang-target"
  end

  def test_chinese_site_pages_share_assets_and_link_back_to_english
    pages = {
      "zh/index.html" => ['href="../"', 'src="../assets/app.js"', 'href="../assets/styles.css"', '<html lang="zh-CN" data-base-path="../">'],
      "zh/papers/index.html" => ['href="../../papers/"', 'src="../../assets/papers-page.js"', 'href="../../assets/styles.css"', '<html lang="zh-CN" data-base-path="../../">'],
      "zh/datasets/index.html" => ['href="../../datasets/"', 'src="../../assets/datasets-page.js"', 'href="../../assets/styles.css"', '<html lang="zh-CN" data-base-path="../../">'],
      "zh/leaderboards/index.html" => ['href="../../leaderboards/"', 'src="../../assets/leaderboard-index.js"', 'href="../../assets/styles.css"', '<html lang="zh-CN" data-base-path="../../">'],
      "zh/leaderboards/dataset.html" => ['id="language-switch"', 'src="../../assets/dataset-page.js"', 'href="../../assets/styles.css"', '<html lang="zh-CN" data-base-path="../../">']
    }

    pages.each do |path, snippets|
      html = File.read(File.join(ROOT, path))
      snippets.each { |snippet| assert_includes html, snippet }
    end
  end

  def test_english_pages_link_to_chinese_counterparts
    expectations = {
      "index.html" => 'href="zh/"',
      "papers/index.html" => 'href="../zh/papers/"',
      "datasets/index.html" => 'href="../zh/datasets/"',
      "leaderboards/index.html" => 'href="../zh/leaderboards/"',
      "leaderboards/dataset.html" => 'id="language-switch"'
    }

    expectations.each do |path, snippet|
      assert_includes File.read(File.join(ROOT, path)), snippet
    end
  end

  def test_readmes_have_language_links
    english = File.read(File.join(ROOT, "README.md"))
    chinese = File.read(File.join(ROOT, "README.zh-CN.md"))

    assert_includes english, "[English](README.md) | [中文](README.zh-CN.md)"
    assert_includes chinese, "[English](README.md) | [中文](README.zh-CN.md)"
    assert_includes chinese, "# Awesome Video Anomaly Tasks"
    assert_includes chinese, "## 数据布局"
  end
end
