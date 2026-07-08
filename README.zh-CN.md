# Awesome Video Anomaly Tasks

[English](README.md) | [中文](README.zh-CN.md)

一个数据驱动的视频异常任务目录，用于展示论文、数据集、Track 和排行榜。

本仓库面向 GitHub Pages 设计。网站会读取 `data/` 下的结构化 YAML 文件，在浏览器中关联论文、数据集、Track 和结果记录，并渲染可搜索的论文表格与数据集级排行榜。

## 跟踪内容

- 按 Venue 文件组织的论文，并记录年份、Venue、报告类型和主题标签。
- 包含关键链接、支持任务、指标和说明的数据集。
- 对比 Track，例如 full training、weakly supervised coarse/fine evaluation、semi-supervised、zero-shot 和 training-free。
- 按 Track 分组的数据集级排行榜结果；每条 entry 引用一篇论文，并可包含多个指标分数。
- 数据集排行榜页面，包含 benchmark 说明、链接、可排序列，以及 Track、Variant 和 Venue 筛选器。
- 论文详情页面，用于汇总一个方法在所有数据集上的结果。

## 数据布局

```text
data/
  papers/
    index.yaml
    venues/
      cvpr-2024.yaml
      acm-mm-2025.yaml
    preprints/
      2023-q2.yaml
  datasets.yaml
  tracks.yaml
  results/
    index.yaml
    ucf-crime.yaml
    ubnormal.yaml
    xd-violence.yaml
    shanghaitech.yaml
    hivau-70k.yaml
    nwpu-campus.yaml
```

`data/papers/` 下的论文文件存储论文元数据。`data/papers/index.yaml` 列出网站需要加载的论文文件：

```yaml
files:
  - venues/cvpr-2024.yaml
  - venues/acm-mm-2025.yaml
  - preprints/2023-q2.yaml
```

每个论文文件包含一个论文记录数组：

```yaml
- paper_id: lavad-2024
  short_name: LAVAD
  title: Harnessing Large Language Models for Training-free Video Anomaly Detection
  year: 2024
  venue: CVPR
  official_url: https://arxiv.org/abs/2404.01014
  arxiv_url: https://arxiv.org/abs/2404.01014
  code_url: https://github.com/lucazanella/lavad
  presentation: spotlight
  tags:
    - training-free
    - llm
    - vlm
```

`paper_id` 是稳定的论文标识。结果文件也通过同名的 `paper_id` 引用论文；页面会从论文记录的 `short_name` 推导方法名，所以 result entry 不应重复写 `method` 字段。

每个结果文件对应一个数据集，并在 `entry_groups` 下按 Track 分组。分组 key 就是 track id，因此组内 entry 不需要重复写 `track`：

```yaml
dataset_id: ucf-crime
entry_groups:
  weakly-supervised-coarse:
    - paper_id: vadclip-2024
      variant: CLIP
      score_source: https://arxiv.org/abs/2308.11681
      scores:
        AUC: 88.02

  weakly-supervised-fine:
    - paper_id: vadclip-2024
      variant: CLIP
      score_source: https://arxiv.org/abs/2308.11681
      scores:
        mAP@0.1: 11.72
        mAP@0.2: 7.83
        mAP@0.3: 6.40
        mAP@0.4: 4.53
        mAP@0.5: 2.93
        AVG: 6.68
```

## 数据集元数据

使用 `dataset_type` 区分原始视频数据集和衍生 Benchmark。原始视频数据集使用：

```yaml
dataset_type: original-video
source_dataset_ids: []
has_new_videos: true
contribution_types: []
```

衍生 Benchmark 使用 `source_dataset_ids` 引用 `data/datasets.yaml` 中已有的数据集：

```yaml
dataset_type: derived-benchmark
source_dataset_ids:
  - ucf-crime
  - xd-violence
has_new_videos: false
contribution_types:
  - reasoning-annotations
  - instruction-data
```

## Track 与 Metric

`track` 是对比视角，用来说明结果属于 full training、semi-supervision、zero-shot、training-free evaluation，或更具体的 weakly supervised coarse-grained AUC / fine-grained temporal localization。

分数字段的 key 是排行榜中展示的指标名，例如 `AUC`、`AP`、`mAP@0.1` 或 `AVG`。一条排行榜 entry 可以在 `scores` 下包含多个指标。

在结果文件中，通常通过 `entry_groups` 的 key 指定单一对比 Track：

```yaml
entry_groups:
  zero-shot:
    - paper_id: lavad-2024
      variant: ""
      score_source: ""
      scores:
        AUC: 85.0
```

只有当同一条 entry 在同一组分数和同一套评估协议下同时属于多个 Track 时，才在 entry 内使用 `tracks`：

```yaml
entry_groups:
  zero-shot:
    - paper_id: lavad-2024
      variant: ""
      score_source: ""
      tracks:
        - zero-shot
        - training-free
      scores:
        AUC: 85.0
```

不要用 `tracks` 合并不同分数或不同评估协议的结果；这些结果应保留为多条独立 entry。

`variant` 用于表示特征提取器、backbone、模型尺寸、模态组合或其他方法变体。不同变体保持为不同 entry。如果论文只报告一个未命名设置，`variant` 可以为空。

每条 entry 都要写一个 `score_source` 字段。如果分数来自特定表格、论文、benchmark 文件或附录，就把对应 URL 写入 `score_source`。如果有意留空，页面会按 `official_url`、`arxiv_url`、`code_url` 的优先级回退到论文链接。

Tags 和 Tracks 在 UI 中使用确定性颜色。颜色由 tag 文本或 track id 生成，因此同一个 tag/track 在刷新后和不同页面中都会保持一致；新增 tag/track 不需要手动维护颜色表。

## 链接

排行榜行不使用单独的链接列。重要链接放在对应的可见单元格中：

- Method 单元格：使用论文记录中的链接，优先级为 `official_url`、`arxiv_url`、`code_url`。
- Score 单元格：使用 entry 级别的 `score_source`；如果留空，则按论文链接优先级回退。
- 数据集概览链接：使用 dataset homepage、paper、download 和 annotation URL。

## 排行榜页面

数据集排行榜位于：

```text
leaderboards/
  index.html
  dataset.html?dataset=ucf-crime
  dataset.html?dataset=shanghaitech
```

每个数据集页面会把展开后的论文文件与该数据集的结果文件关联起来。表格会把当前 Track 筛选下可用的每个指标展开为独立分数列，点击任意指标列即可按该指标排序。Track、Venue 和 Variant 筛选器支持多选和搜索。页面也支持按 method、track、variant、year 和 venue 等展示字段排序。Tags 会显示在论文表中，但不是排行榜排序字段。

数据集排行榜页面不展示单独的 status 列。预印本论文请把 paper `venue` 设置为 `preprint`；Venue 列和 Venue 筛选器会覆盖这个场景，不需要在 result entry 中重复 status。

论文页面位于：

```text
papers/
  index.html
  detail.html?paper=lavad-2024
```

论文索引页支持 Venue、年份、Tag 和报告类型的多选筛选，也支持列排序。方法名会跳转到同一个动态详情页，根据选中的 `paper_id` 渲染该论文在所有数据集上的结果；仓库不会为每篇论文创建单独 HTML 文件。

## 添加数据

1. 将论文加入 `data/papers/` 下匹配的文件。只有创建新的论文文件时，才需要更新 `data/papers/index.yaml`。
2. 如果是新数据集，将其加入 `data/datasets.yaml`。
3. 新增或更新 `data/results/` 下的数据集级结果文件，并按 track id 放入 `entry_groups`。
4. 如果需要新的 Track，将其加入 `data/tracks.yaml`。已有和未来新增的 Track 会在 UI 中自动获得稳定颜色。
5. 如果创建了新的结果文件，将文件名加入 `data/results/index.yaml`。
6. 运行验证命令。

## 本地预览

```bash
npm run dev
```

从仓库根目录打开命令输出的本地预览 URL。

## 验证

```bash
npm test
```

也可以单独运行检查：

```bash
ruby test/data_schema_test.rb
node --test test/leaderboard_model_test.mjs
```

Ruby 测试验证 YAML 结构和跨文件引用。Node 测试验证排行榜选择逻辑，包括 `best per paper`。

## 相关仓库

- [Junxi-Chen/Awesome-Video-Anomaly-Detection](https://github.com/Junxi-Chen/Awesome-Video-Anomaly-Detection)：VAD 论文、数据集、工具和 benchmark 表格的主要种子来源。
- [vt-le/Video-Anomaly-Detection](https://github.com/vt-le/Video-Anomaly-Detection)：面向 VAD 论文和数据集的结构化 JSON-to-README 工作流。
- [zuble/uws4vad](https://github.com/zuble/uws4vad)：面向 VAD 评估流程的实验工作台，支持 UCFC 和 XDV。
- [Kamino666/RethinkingVAD](https://github.com/Kamino666/RethinkingVAD)：围绕 VAD 指标和 benchmark 协议反思的代码与数据。
- [fjchange/awesome-video-anomaly-detection](https://github.com/fjchange/awesome-video-anomaly-detection)：较早的 VAD 论文、代码和性能对比集合。
- [paperswithcode/paperswithcode-data](https://github.com/paperswithcode/paperswithcode-data)：大规模论文、数据集、方法和评估数据建模的参考。
- [freddyaboulton/gradio-leaderboard](https://github.com/freddyaboulton/gradio-leaderboard)：交互式排行榜行为的有用参考；本仓库采用静态 GitHub Pages 方式。

## 说明

初始数据刻意保持较小规模。它先建立 schema 和 UI 行为，之后可以通过常规 pull request 扩展目录内容。
