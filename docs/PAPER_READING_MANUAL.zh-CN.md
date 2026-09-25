# K-Plex 论文阅读工作流使用手册（research 仓库案例）

2026-09-25

## 概述

用两件工具，把一堆论文笔记变成一张可以按引用关系浏览、悬停即看中文摘要的文献地图：**kplex-vault-organize 技能**负责批量整理仓库，**K-Plex 论文阅读模式**负责在 Obsidian 里阅读、翻译和扩充。本手册以 research 仓库（141 篇论文笔记）为例，走一遍完整流程。

适合读者：用 Obsidian 管理论文笔记、已经或准备安装 K-Plex 的研究者。

| 工具 | 负责什么 | 在哪里用 |
| --- | --- | --- |
| kplex-vault-organize 技能 | 批量写 frontmatter：引用关系（References）、相似论文（similar）、中文标题别名、中文摘要（abstract_zh）、主题（topic） | Claude Code，对整个仓库或新增文章运行 |
| K-Plex 论文阅读模式 | 悬停摘要卡片、论文详情（引用 / 被引列表、翻译）、加入仓库、导入全文、中英名称切换 | Obsidian 中的 K-Plex 视图与 Sidecar |

整体工作流：

1. 部署 K-Plex 并开启论文阅读模式。
2. 用技能对仓库运行 init：先预览，确认后写入。
3. 在 K-Plex 中浏览：引用的论文在上方，被引的在下方，相似的在左侧，悬停即看中文摘要。
4. 从论文详情里把新的引文加入仓库，或导入全文。
5. 新文章积累后运行 update，只处理新增和改动的笔记。

## 案例仓库：research

research 是一个围绕 DETR 检测、多模态定位和自动驾驶的文献库，论文笔记集中在 `notes/` 文件夹。整理前，笔记之间几乎没有互相引用的关系，也没有中文标题和摘要。

笔记的几种典型写法（技能和 K-Plex 都已适配）：

- `doi: arXiv:2104.09864`：arXiv 编号写在 doi 字段里，识别为 arXiv 论文。
- `source: https://arxiv.org/abs/...`：论文链接，同样用来识别。
- 只有 CVPR / NeurIPS 的 PDF 链接、没有 DOI 或 arXiv 编号的笔记（如 MI-DETR、3DET-Mamba）：按 `title` 匹配论文。
- 正文是 PDF 转换出的全文，带有参考文献列表；也有抓取的 arXiv 摘要网页（`> Abstract:` 写法）。

2026-09-25 整理后的实际结果：

| 项目 | 数量 |
| --- | --- |
| 论文笔记 | 141 篇 |
| 能识别为论文（arXiv / DOI） | 117 篇（arXiv 101、DOI 16），另有 9 篇按标题匹配 |
| 解析出参考文献列表 | 108 篇 |
| 引用链接（References） | 217 条 |
| 相似链接（similar） | 322 条 |
| 中文标题别名 | 122 篇 |
| 中文摘要（abstract_zh） | 122 篇 |
| 写入主题（topic） | 135 篇，7 个主题 |

被引最多的是领域的基础论文：Deformable DETR 22 次、DETR 21 次、DINO 18 次、Mamba 13 次、CLIP 11 次。

## 准备工作

开始前需要安装好 K-Plex 插件、打开论文阅读模式，并确认技能可用。

1. **安装 K-Plex**：把构建产物 `main.js`、`manifest.json`、`styles.css` 放到 `research/.obsidian/plugins/k-plex/`，在「第三方插件」中启用；更新构建后重新加载插件。
2. **开启论文阅读模式**：设置 → K-Plex → Paper reading → 打开「Enable paper reading」。首次开启会弹窗说明会访问哪些服务，并把 `References` 登记为 Parent 关系字段。这是 K-Plex 中唯一会联网的功能，默认关闭。
3. **确认技能可用**：技能位于 `~/.claude/skills/kplex-vault-organize/`。在 Claude Code 中用中文说“整理 research 库的 frontmatter”即可触发。脚本用 `uv` 运行，依赖自动安装；第一次运行会下载约 130 MB 的嵌入模型。

research 仓库使用的推荐设置：

| 位置 | 设置项 | 取值 |
| --- | --- | --- |
| Visual styling | Name fields | `aliases`（显示中文别名） |
| Visual styling | Name fields when display names are off | `title`（关掉别名时显示英文标题） |
| Paper reading | Show paper details in the sidecar | 开 |
| Paper reading | Double-click shows paper details | 开 |
| Paper reading | Show abstract on hover | 开 |
| Paper reading | Translation service / Translate to | Google Translate / 简体中文 |
| Paper reading | Default abstract view | Translation only（只看中文）或 Bilingual |
| Paper reading → Full text | Article folder / Image folder | `Papers/Articles` / `images` |

## 第一步：用技能整理仓库

一次 init 就能让整个仓库在 K-Plex 中形成引用关系图。技能永远先出预览报告，确认后才写入，写入前自动备份。

### 技能写入什么

| 字段 | 在 K-Plex 中的效果 | 来源 |
| --- | --- | --- |
| `References` | 被引论文显示在上方（Parent） | 笔记自己的参考文献列表，按 arXiv 编号、DOI 或标题匹配到仓库中的其他笔记 |
| `similar` | 相似论文显示在左侧（Friend） | 标题 + 摘要 + 引言的向量相似度，每篇最多 5 条 |
| `aliases`（第一项） | 节点显示中文标题 | 英文标题机器翻译，冒号前的模型名保留原文 |
| `abstract_zh` | 悬停卡片显示中文摘要 | 笔记中的英文摘要，机器翻译 |
| `topic` | 可在滤镜和样式中按主题筛选 / 着色 | 向量聚类，由 Claude 看标题命名 |

### 操作步骤

1. 对 Claude 说“对 research 库运行 init”。技能执行预览：`init . --dir notes`，在仓库里生成 `.kplex/` 文件夹（配置、向量索引、报告）。Obsidian 不显示以点开头的文件夹。
2. 阅读预览摘要和 `.kplex/report.md`：会改哪些文件、每篇论文引用了谁、与谁相似、别名和摘要译文。
3. 确认后说“写入”。技能加 `--apply` 写入，并报告备份路径。
4. 可选：说“做主题聚类”。技能导出聚类，Claude 根据每类的论文标题起名，预览后再写入 `topic`。

### research 的实际结果示例

- **Grounding DINO 1.5** 的 `References`：YOLO-World、Grounding DINO、OWLv2、OWL-ViT、CLIP、DINO。
- **RoFormer** 的 `similar`：Rotary Position Embedding。
- 中文别名：`Ferret：随时随地以任何粒度参考和接地任何内容`、`检测重要内容：自动驾驶车辆中非分布 3D 物体检测的新方法`。
- 中文摘要（3DET-Mamba）：“基于 Transformer 的架构已被证明可以成功地从点云中检测 3D 对象。然而，随着点云分辨率的增加……”

主题聚类结果：

| 主题 | 篇数 | 代表论文 |
| --- | --- | --- |
| 开放词表检测与多模态定位 | 47 | MDETR、Florence-2、Ferret、GLaMM、LLaVA |
| DETR 目标检测 | 22 | DETR、DINO、RT-DETR、D-FINE、DiffusionDet |
| 端到端自动驾驶与 VLA | 20 | OpenDriveVLA、AutoVLA、VERDI、Bench2Drive |
| Mamba 状态空间模型 | 17 | Mamba、MambaVision、Mamba YOLO |
| 3D 感知与 BEV | 14 | nuScenes、BEVFormer、PV-RCNN++、NOVA |
| 自动驾驶异常与长尾检测 | 10 | CODA、AnoVox |
| 小目标 DETR 检测 | 5 | UAV-DETR、DV-DETR、LDA-DETR |

另有 6 篇内容较杂（RT-DETR 部署与几篇中文研究综合笔记），没有写入主题。

## 第二步：在 K-Plex 中阅读

整理完后，打开任意一篇论文，K-Plex 会把它放在中心：它引用的论文在上方，引用它的论文在下方，相似论文在左侧。点击任何节点即可让它成为新的中心。

### 悬停看摘要、固定对照

- 鼠标在节点上停留约 0.75 秒，旁边弹出摘要卡片。内容按 `abstract_zh` → `abstract` → `summary` 的顺序读取，都没有时取笔记正文的摘要；不联网。
- 把鼠标移进卡片，点 📌 固定。固定后拖动标题栏移动、点 × 关闭，最多同时固定 8 张。平移、缩放或切换中心节点时，固定的卡片保持不动。
- 卡片上的 📖 按钮打开这篇论文的论文详情。

### 中英文名称切换

工具栏的 Aa（Display aliases）按钮打开时，节点显示中文别名；关闭时显示英文标题（需要先把「Name fields when display names are off」设为 `title`）。

### 论文详情（Sidecar）

右键论文节点 →「Paper details…」，或双击中心以外的论文节点，详情会在 K-Plex 旁边的 Sidecar 中打开。

- **头部**：标题、作者、期刊、年份、被引数，以及 arXiv / DOI / PDF 链接。
- **摘要**：在 Original / Bilingual（逐句对照）/ 简体中文 之间切换。选「简体中文」时，列表中的标题也显示中文。
- **References / Cited by**：引用和被引列表，按 Semantic Scholar → OpenAlex → 笔记正文参考文献的顺序获取，列表上方标明来源。如 3DET-Mamba 在线服务没有数据，会从笔记中解析出 49 条引文。
- **钻取**：点击列表中的论文标题，Sidecar 切换到这篇引文的详情，可以一层层往下看，用「Back」返回。标着「In vault」的引文已在仓库中，定位按钮可在 Plex 中居中显示。

### 双击与图片

- 双击中心以外的论文节点：在 Sidecar 显示论文详情；双击中心节点仍打开笔记。
- 双击图片节点：在 Sidecar 中打开图片。
- 导入全文后插图会变成图片节点，可在筛选弹窗的 Visibility 中用「Images」开关显示或隐藏，不影响其他附件。

### 按主题筛选与着色

- 在 Graph Lens 中按 `topic` 筛选，比如只看“Mamba 状态空间模型”。
- 在 Visual styling → Node styling 中把 Style property 设为 `topic`，给每个主题配一种颜色。

## 第三步：扩充仓库

阅读中发现值得收录的引文，可以直接在论文详情里加入仓库或导入全文，再用技能的 update 补齐关联。

| 操作 | 位置 | 结果 |
| --- | --- | --- |
| Add to vault | 引文行或详情头部 | 在 `Papers/` 新建论文笔记（元数据 + 摘要），并写入 `References` 关系；已存在的论文只关联不重复创建 |
| Link | 标着「In vault」的引文行 | 把已有笔记关联为引用或被引 |
| Add selected / Link all in vault | 列表上方 | 批量加入或关联，显示进度，可取消 |
| Save to note | 详情头部（已有笔记时） | 补上缺少的论文属性和 `abstract_zh`，追加摘要章节，不改已有内容 |
| Import full text | 详情头部（arXiv 论文） | 把 arXiv HTML 全文转为 Markdown，公式保留 LaTeX，插图下载到 `images/` |
| Clip with Web Clipper | 详情头部（设置为 Web Clipper 方式时） | 在浏览器打开文章，用 Obsidian Web Clipper 剪藏；DOI 论文也可用 |

导入全文的两种情况：

- 论文已有笔记：全文单独保存到 `Papers/Articles/`，原笔记通过 `Full text` 字段关联，全文显示在论文下方。
- 论文还没有笔记：全文笔记本身就作为这篇论文的笔记，带上元数据。

例：对 RoPE-ViT（arXiv 2403.13298）导入全文，得到约 14 万字的 Markdown、16 个行间公式、1 张插图；它的参考文献之后也能被解析出 41 条引文。

加入几篇新文章后，对 Claude 说“更新 research 库的关联”。update 只处理新增或改动的笔记：补上它们的引用、相似论文、中文别名和中文摘要；老笔记的参考文献如果引用了新论文，也会自动连上。测试中加入 RoPE-ViT 后，只重新计算了这 1 篇，识别出它引用了仓库里的 RoFormer、CLIP 和 DINO，共更新 7 个文件。

## 日常工作流与命令速查

日常使用只需要对 Claude 说几句话，其余在 K-Plex 里点。

| 你说的话 | 技能执行的命令 | 作用 |
| --- | --- | --- |
| 对 research 库运行 init | `init . --dir notes`，确认后加 `--apply` | 首次整理全库 |
| 更新 research 库的关联 | `update .`，确认后加 `--apply` | 只处理新增或改动的笔记 |
| 做主题聚类 | `topics . export` → 命名 → `topics . apply --apply` | 写入 `topic` |
| 看一下索引状态 | `status .` | 笔记数、向量数、当前配置 |
| 撤销刚才的写入 | `restore .` | 按最近一次备份还原文件 |

命令完整形式（在仓库根目录下运行）：`uv run --script ~/.claude/skills/kplex-vault-organize/scripts/kplex_organize.py <命令>`。

一个典型的读论文流程：

1. 在 K-Plex 中打开一篇论文，悬停上方各篇引文快速看中文摘要，把有关的几张卡片固定下来对照。
2. 双击感兴趣的引文，在 Sidecar 看它的详情和它自己的引用。
3. 对还不在仓库里的重要引文点「Add to vault」，需要精读的点「Import full text」。
4. 一周一次（或加入一批文章后）让 Claude 更新关联；文章多了再重新做一次主题聚类。

## 字段与设置参考

### frontmatter 字段

| 字段 | 写入者 | 说明 |
| --- | --- | --- |
| `References` | 技能、K-Plex（Add to vault / Link） | 本文引用的论文，Parent 关系 |
| `similar` | 技能 | 语义相似的论文，Friend 关系 |
| `aliases` | 技能（第一项为中文标题）、K-Plex | 显示名与搜索别名 |
| `abstract_zh` | 技能、K-Plex（Save to note） | 中文摘要，悬停卡片优先读取 |
| `topic` | 技能 | 主题，可用于滤镜和着色 |
| `Full text` | K-Plex（Import full text） | 论文笔记指向全文笔记，Child 关系 |
| `title`、`authors`、`year`、`venue`、`doi`、`arxiv`、`url`、`pdf`、`citations` | K-Plex（Add to vault / Save to note） | 论文元数据；Save to note 只补缺失项 |

技能只替换自己写入过的值，记录在 `.kplex/managed.json`；你手工添加或修改的链接、别名和摘要不会被覆盖。

### K-Plex 主要设置（Paper reading 页）

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| Enable paper reading | 关 | 论文阅读模式总开关 |
| Identifier properties | `doi, DOI, arxiv, arXiv, url, source` | 识别论文编号的属性 |
| Reference property | `References` | 写入引用关系的属性 |
| Paper folder | `Papers` | 新加入论文的文件夹 |
| Show abstract on hover | 开 | 悬停摘要卡片 |
| Abstract properties | `abstract_zh, abstract, summary` | 悬停卡片读取顺序 |
| Translation service | Google Translate | 失败时自动改用 Bing |
| Import full text with | Built-in import | 或 Obsidian Web Clipper |
| Download images / Image folder | 开 / `images` | 全文插图下载位置 |

### 技能配置（`.kplex/config.json`）

| 键 | 默认值 | 作用 |
| --- | --- | --- |
| `notes_dir` | `notes`（research） | 要整理的文件夹 |
| `similar_top_k` / `similar_percentile` | 5 / 90 | 每篇最多几条相似链接 / 阈值百分位；调到 95 会更少更准 |
| `model` | `BAAI/bge-small-en-v1.5` | 嵌入模型；以中文为主的仓库可换 `BAAI/bge-small-zh-v1.5` |
| `translate_titles` / `translate_abstracts` | true / true | 是否写中文别名 / 中文摘要 |
| `translate_target` / `translator` | `zh-CN` / `google` | 目标语言 / 首选翻译服务 |

## 注意事项与常见问题

- **网络与隐私**：论文详情会把 DOI、arXiv 编号或标题发送给 Semantic Scholar、OpenAlex、arXiv；翻译会把标题或摘要发送给 Google 或 Bing。悬停卡片和向量索引都只用本地数据。
- **限流**：Semantic Scholar 不带 key 时经常返回 429，K-Plex 会自动改用 arXiv 或 OpenAlex；想更稳定可以申请免费 API key，在设置里选择。Google 翻译被限流时会自动改用 Bing。
- **模型下载失败**：设置 `HF_ENDPOINT=https://hf-mirror.com` 后重试，或改用不需要模型的 `--backend tfidf`。
- **翻译质量**：机器翻译总体可读，但个别术语生硬（如 grounding 译成“接地”、transformer 译成“变压器”）。直接修改笔记里的别名或 `abstract_zh` 即可，之后运行不会覆盖。
- **页眉当标题**：有几篇笔记的 `title` 是 PDF 页眉（如“Published as a conference paper at ICLR 2022”、“arXiv:2506.17901v1 [cs.CV]”）。关系仍按编号正确匹配，只是显示名不好看，也不会生成中文别名。建议手工改正这些 `title`，再运行 update。
- **重复笔记**：research 中有两篇 Grounding DINO 笔记，会各自获得链接。合并后运行 update 即可。
- **备份与还原**：每次写入都在 `.kplex/backups/` 留有备份，`restore` 恢复最近一次，也可以用 `--backup` 指定文件。research 目前的备份：`20260925-204823`（引用与相似）、`20260925-205141-topics`（主题）、`20260925-210511`（中文别名）、`20260925-212556`（中文摘要）。
- **移动端**：悬停卡片只在鼠标或触控笔操作时出现；手机和平板的实机测试尚未完成。
