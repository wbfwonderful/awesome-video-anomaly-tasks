require "minitest/autorun"
require "json"
require "yaml"

ROOT = File.expand_path("..", __dir__)
VALID_DATASET_TYPES = %w[original-video derived-benchmark].freeze

def load_yaml(path)
  YAML.load_file(File.join(ROOT, path))
end

def load_papers
  index = load_yaml("data/papers/index.yaml")
  index.fetch("files").flat_map do |file|
    paper_file = load_yaml("data/papers/#{file}")
    raise TypeError, "data/papers/#{file} must contain an array" unless paper_file.is_a?(Array)

    paper_file
  end
end

class DataSchemaTest < Minitest::Test
  def setup
    @papers = load_papers
    @datasets = load_yaml("data/datasets.yaml")
    @tracks = load_yaml("data/tracks.yaml")
    @result_index = load_yaml("data/results/index.yaml")

    @paper_ids = @papers.map { |paper| paper.fetch("id") }
    @dataset_ids = @datasets.map { |dataset| dataset.fetch("id") }
    @track_ids = @tracks.map { |track| track.fetch("id") }
    @deprecated_project_url_key = "project" + "_url"
  end

  def test_papers_have_required_metadata
    assert_kind_of Array, @papers

    @papers.each do |paper|
      assert_required_fields paper, %w[id short_name title year venue official_url tags]
      refute paper.key?("paper_url"), "paper_url is deprecated; use official_url in #{paper.inspect}"
      refute paper.key?(@deprecated_project_url_key), "#{@deprecated_project_url_key} is deprecated; keep paper links to official_url, arxiv_url, and code_url in #{paper.inspect}"
      assert_includes %w[accepted preprint], paper.fetch("status") if paper.key?("status")
      assert_kind_of Array, paper.fetch("task_types") if paper.key?("task_types")
      assert_kind_of Array, paper.fetch("tags")
    end

    assert_equal @paper_ids.uniq, @paper_ids
  end

  def test_datasets_have_required_links_and_metrics
    assert_kind_of Array, @datasets

    @datasets.each do |dataset|
      assert_required_fields dataset, %w[id name dataset_type source_dataset_ids has_new_videos contribution_types task_types links metrics notes]
      assert_includes VALID_DATASET_TYPES, dataset.fetch("dataset_type")
      assert_kind_of Array, dataset.fetch("source_dataset_ids")
      dataset.fetch("source_dataset_ids").each do |source_id|
        assert_includes @dataset_ids, source_id, "unknown source dataset #{source_id} in #{dataset.inspect}"
      end
      assert_includes [true, false], dataset.fetch("has_new_videos")
      assert_kind_of Array, dataset.fetch("contribution_types")
      assert_kind_of Array, dataset.fetch("task_types")
      assert_kind_of Hash, dataset.fetch("links")
      assert_kind_of Array, dataset.fetch("metrics")
    end

    assert_equal @dataset_ids.uniq, @dataset_ids
  end

  def test_tracks_define_coarse_comparison_groups
    assert_kind_of Array, @tracks

    @tracks.each do |track|
      assert_required_fields track, %w[id name description]
    end

    assert_includes @track_ids, "training-free"
    assert_includes @track_ids, "zero-shot"
    assert_includes @track_ids, "full-training"
    assert_includes @track_ids, "weakly-supervised-coarse"
    assert_includes @track_ids, "weakly-supervised-fine"
  end

  def test_result_files_reference_existing_entities
    files = @result_index.fetch("files")
    assert_kind_of Array, files
    refute_empty files

    files.each do |file|
      result_file = load_yaml("data/results/#{file}")
      dataset_id = result_file.fetch("dataset_id")
      assert_includes @dataset_ids, dataset_id
      entry_keys = []

      result_file.fetch("entries").each do |entry|
        assert_required_fields entry, %w[paper_id method score_source scores]
        track_ids = entry_track_ids(entry)
        refute_empty track_ids, "missing track or tracks in #{entry.inspect}"
        assert_equal track_ids.uniq, track_ids, "duplicate tracks in #{entry.inspect}"
        track_ids.each do |track_id|
          assert_includes @track_ids, track_id
        end
        assert entry.key?("variant"), "missing variant in #{entry.inspect}"
        refute entry.key?("feature"), "feature is deprecated; use variant in #{entry.inspect}"
        refute entry.key?("method_url"), "method_url is deprecated; use official_url, arxiv_url, or code_url in papers.yaml"
        assert_includes @paper_ids, entry.fetch("paper_id")
        assert_kind_of String, entry.fetch("score_source")
        refute_empty entry.fetch("score_source")
        assert_kind_of Hash, entry.fetch("scores")
        refute_empty entry.fetch("scores")
        track_ids.each do |track_id|
          entry_keys << [dataset_id, entry.fetch("paper_id"), entry["variant"].to_s, track_id]
        end

        entry.fetch("scores").each do |score_key, score|
          assert_match(/\A[A-Za-z0-9_@.]+\z/, score_key)
          assert_kind_of Numeric, score
        end
      end

      assert_equal entry_keys.uniq, entry_keys
    end
  end

  def test_exvad_fine_grained_results_exclude_random_baseline
    expected = {
      "ucf-crime.yaml" => {
        "RealAD" => [5.73, 4.41, 2.69, 1.93, 1.44, 3.24],
        "RTFM" => [12.59, 7.54, 6.44, 5.42, 1.54, 6.71],
        "AVVD" => [10.27, 7.01, 6.25, 3.42, 3.29, 6.05],
        "DMU" => [11.32, 7.62, 5.97, 4.33, 2.36, 6.32],
        "CLIP-TSA" => [12.62, 8.13, 6.66, 4.28, 1.91, 6.72],
        "UMIL" => [11.84, 7.85, 6.52, 3.97, 2.84, 6.60],
        "VadCLIP" => [11.72, 7.83, 6.40, 4.53, 2.93, 6.68],
        "STPrompt" => [11.56, 7.49, 6.13, 5.11, 2.11, 6.48],
        "Ex-VAD" => [16.51, 12.35, 9.41, 7.82, 4.65, 10.15]
      },
      "xd-violence.yaml" => {
        "RealAD" => [22.72, 15.57, 9.98, 6.20, 3.78, 11.65],
        "RTFM" => [31.25, 26.85, 21.94, 13.56, 12.54, 21.23],
        "AVVD" => [30.51, 25.75, 20.18, 14.83, 9.79, 20.21],
        "DMU" => [32.33, 28.88, 22.57, 14.33, 13.68, 22.36],
        "CLIP-TSA" => [34.53, 32.88, 28.11, 13.65, 10.01, 23.84],
        "UMIL" => [34.44, 27.13, 22.63, 19.85, 13.24, 23.46],
        "VadCLIP" => [37.03, 30.84, 23.38, 17.09, 14.31, 24.70],
        "STPrompt" => [38.21, 25.63, 28.66, 13.11, 11.63, 23.44],
        "Ex-VAD" => [40.14, 32.75, 28.78, 20.15, 18.35, 28.23]
      }
    }

    metric_keys = ["mAP@0.1", "mAP@0.2", "mAP@0.3", "mAP@0.4", "mAP@0.5", "AVG"]

    @result_index.fetch("files").each do |file|
      result_file = load_yaml("data/results/#{file}")
      result_file.fetch("entries").each do |entry|
        refute_equal "Random Baseline", entry.fetch("method")
      end
    end

    expected.each do |file, method_scores|
      result_file = load_yaml("data/results/#{file}")
      fine_entries = result_file.fetch("entries")
        .select { |entry| entry.fetch("track") == "weakly-supervised-fine" }
        .each_with_object({}) { |entry, index| index[entry.fetch("method")] = entry }

      method_scores.each do |method, scores|
        assert fine_entries.key?(method), "missing #{method} in #{file}"
        assert_equal(
          metric_keys.zip(scores).to_h,
          fine_entries.fetch(method).fetch("scores")
        )
      end
    end
  end

  def test_home_summary_matches_source_data
    summary = JSON.parse(File.read(File.join(ROOT, "data/home-summary.json")))
    entries = @result_index.fetch("files").flat_map do |file|
      result_file = load_yaml("data/results/#{file}")
      result_file.fetch("entries").map { |entry| entry.merge("dataset_id" => result_file.fetch("dataset_id")) }
    end

    preprint_count = @papers.count { |paper| paper.fetch("venue").to_s.downcase == "preprint" }
    tag_counts = @papers.each_with_object(Hash.new(0)) do |paper, counts|
      paper.fetch("tags").each { |tag| counts[tag] += 1 }
    end
    track_counts = entries.each_with_object(Hash.new(0)) do |entry, counts|
      entry_track_ids(entry).each { |track_id| counts[track_id] += 1 }
    end

    assert_equal(
      {
        "papers" => @papers.length,
        "published" => @papers.length - preprint_count,
        "preprints" => preprint_count,
        "tags" => tag_counts.length
      },
      summary.fetch("paper_stats")
    )
    assert_equal(
      {
        "datasets" => @datasets.length,
        "with_results" => entries.map { |entry| entry.fetch("dataset_id") }.uniq.length,
        "tracks" => @tracks.length,
        "rows" => entries.length
      },
      summary.fetch("dataset_stats")
    )
    assert_equal(
      tag_counts.sort_by { |tag, count| [-count, tag] }.first(8).map { |tag, count| { "tag" => tag, "count" => count } },
      summary.fetch("top_tags")
    )
    assert_equal(
      @tracks.map { |track| { "id" => track.fetch("id"), "name" => track.fetch("name"), "count" => track_counts[track.fetch("id")] } },
      summary.fetch("track_coverage")
    )
  end

  private

  def entry_track_ids(entry)
    has_track = entry.key?("track")
    has_tracks = entry.key?("tracks")
    assert has_track ^ has_tracks, "entry must use exactly one of track or tracks in #{entry.inspect}"

    if has_tracks
      assert_kind_of Array, entry.fetch("tracks")
      return entry.fetch("tracks")
    end

    [entry.fetch("track")]
  end

  def assert_required_fields(record, fields)
    fields.each do |field|
      assert record.key?(field), "missing #{field} in #{record.inspect}"
      refute_nil record.fetch(field), "#{field} is nil in #{record.inspect}"
    end
  end
end
