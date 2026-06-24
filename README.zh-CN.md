# Awesome Video Anomaly Tasks

[English](README.md) | [中文](README.zh-CN.md)

一个数据驱动的视频异常任务目录，用于展示论文、数据集、Track 和排行榜。

本仓库面向 GitHub Pages 设计。网站会读取 `data/` 下的结构化 YAML 文件，在浏览器中关联论文、数据集、Track 和结果记录，并渲染可搜索的论文表格与数据集级排行榜。

## 跟踪内容

- 按 Venue、年份、预印本状态和标签组织的论文。
- 包含关键链接、支持任务、指标和说明的数据集。
- 对比 Track，例如 full training、weakly supervised coarse/fine evaluation、semi-supervised、zero-shot 和 training-free。
- 数据集级排行榜结果；每条 entry 表示一个方法变体，并可包含多个指标分数。
- 数据集排行榜页面，包含 benchmark 说明、链接、可排序列，以及 Track、Variant 和 Venue 筛选器。

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
    shanghaitech.yaml
    xd-violence.yaml
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
- id: lavad-2024
  short_name: LAVAD
  title: Harnessing Large Language Models for Training-free Video Anomaly Detection
  year: 2024
  venue: CVPR
  official_url: https://arxiv.org/abs/2404.01014
  arxiv_url: https://arxiv.org/abs/2404.01014
  code_url: https://github.com/lucazanella/lavad
  tags:
    - training-free
    - llm
    - vlm
```

每个结果文件对应一个数据集：

```yaml
dataset_id: ucf-crime
entries:
  - paper_id: vadclip-2024
    method: VadCLIP
    variant: CLIP
    track: weakly-supervised-coarse
    score_source: https://arxiv.org/abs/2308.11681
    scores:
      AUC: 88.02

  - paper_id: vadclip-2024
    method: VadCLIP
    variant: CLIP
    track: weakly-supervised-fine
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

单一对比 Track 使用 `track`：

```yaml
track: zero-shot
```

如果同一条 entry 在同一组分数和同一套评估协议下同时属于多个 Track，使用 `tracks`：

```yaml
tracks:
  - zero-shot
  - training-free
```

不要用 `tracks` 合并不同分数或不同评估协议的结果；这些结果应保留为多条独立 entry。

`variant` 用于表示特征提取器、backbone、模型尺寸、模态组合或其他方法变体。不同变体保持为不同 entry。如果论文只报告一个未命名设置，`variant` 可以为空。

每条 entry 使用一个 `score_source`，指向该 entry 分数来源的表格、论文、benchmark 文件或附录。

## 链接

排行榜行不使用单独的链接列。重要链接放在对应的可见单元格中：

- Method 单元格：使用论文记录中的链接，优先级为 `official_url`、`arxiv_url`、`code_url`。
- Score 单元格：使用 entry 级别的 `score_source`。
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

## 添加数据

1. 将论文加入 `data/papers/` 下匹配的文件。只有创建新的论文文件时，才需要更新 `data/papers/index.yaml`。
2. 如果是新数据集，将其加入 `data/datasets.yaml`。
3. 新增或更新 `data/results/` 下的数据集级结果文件。
4. 如果创建了新的结果文件，将文件名加入 `data/results/index.yaml`。
5. 运行验证命令。

## 本地预览

```bash
/Users/bytedance/miniconda3/bin/python -m http.server 8000
```

从仓库根目录打开 `http://localhost:8000`。

## 验证

```bash
/opt/homebrew/bin/npm test
```

也可以单独运行检查：

```bash
/usr/bin/ruby test/data_schema_test.rb
/opt/homebrew/bin/node --test test/leaderboard_model_test.mjs
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
