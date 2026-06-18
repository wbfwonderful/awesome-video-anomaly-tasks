require "minitest/autorun"

ROOT = File.expand_path("..", __dir__)

class CssStructureTest < Minitest::Test
  def test_link_list_table_cells_keep_table_cell_display
    css = File.read(File.join(ROOT, "assets/styles.css"))

    assert_match(
      /td\.link-list\s*\{[^}]*display:\s*table-cell\s*;/m,
      css,
      "td.link-list must keep table-cell display so the last table column aligns with other rows",
    )
  end

  def test_leaderboard_filter_menus_are_not_clipped
    css = File.read(File.join(ROOT, "assets/styles.css"))
    html = File.read(File.join(ROOT, "leaderboards/dataset.html"))

    assert_includes html, "leaderboard-section"
    assert_match(
      /\.leaderboard-section\s*\{[^}]*overflow:\s*visible\s*;/m,
      css,
      "leaderboard section must allow visible overflow so filter menus are not clipped when few rows match",
    )
  end
end
