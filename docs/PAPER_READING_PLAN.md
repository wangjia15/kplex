# K-Plex 论文阅读模式：调研与开发计划

状态：**M0–M4、M6 已实现（2026-09-25）；M5 的实机与大库测量待完成**。基线：`main` @ `9b8e8c0`。用户指南见 [PAPER_READING.md](PAPER_READING.md)。

实现与计划的差异：
- 新增**标题匹配**：识别属性中只有会议 PDF 链接（CVF/NeurIPS 等）、没有 DOI/arXiv 的笔记，改用 `title` 通过 S2 `paper/search/match` 解析（research 库中有 9 篇论文属于这种情况）。
- Bing 需要合法格式的 Chrome UA，并且请求必须带 translator 页面的 `Referer`，否则返回 401；`www` 重定向到 `cn` 后会丢失 POST 请求体，因此直接切换 host。
- 有 arXiv/OpenAlex 备用源时，详情请求遇到 S2 429 不再退避重试，直接走备用源（列表请求仍然重试）。
- 翻译按句子用 `\n\n` 拼接后发送（Bing 会丢弃单个换行），两个服务都能做到句级对齐。

### 已确认的决策（2026-09-25）

| 问题 | 决策 |
| --- | --- |
| 翻译服务 | **Google 翻译 + Bing 翻译**，可在设置中切换，失败时自动回退到另一个；不使用 LLM |
| 显示方式 | 摘要可在 **原文** 与 **双语**（逐句中英对照）之间一键切换，并记住上次的选择；导入笔记时的摘要格式也可以选择双语 |
| `References` 的角色 | **Parent**：被引用的论文显示在上方，引用它的论文显示在下方 |

## 1. 目标

把 K-Plex 变成一个论文阅读工作台，所有论文相关能力都收在**一个总开关**（“论文阅读模式”）之后：

1. **显示关联的引用论文**：对于当前论文，列出它的参考文献（references）和被引文献（cited by），并在 Plex 中以关系的形式显示。
2. **根据引文打开摘要**：不离开 K-Plex 即可查看任意引文的摘要。
3. **中文翻译**：用 Google / Bing 翻译摘要（目标语言可配置，默认简体中文），可以在原文和双语之间切换。
4. **加入仓库**：把引文导入为 Markdown 笔记（元数据 + 摘要 + 译文），并自动和源论文建立关系。
5. 提出后续可做的优化（见 §9）。

### 必须遵守的项目约束（来自 AGENTS.md）

| 约束 | 对本功能的影响 |
| --- | --- |
| 默认本地/离线，联网必须有明确理由并需用户主动开启 | 总开关**默认关闭**；开启时说明会访问哪些服务。只有点击翻译（或开启导入时自动翻译）时才会把摘要发送给 Google/Bing。 |
| 显式文档属性优先于推断关系 | 引用关系写成 frontmatter 属性（`References`），不写正文链接。 |
| UI 不得自行做关系分类 | 弹窗只调用 plugin/index API（`linkNewRelatedFile`、`createRelationToPage`）。 |
| 展示元数据不进入持久化 `GraphPage` / 快照 | 论文元数据、摘要、译文**绝不**写入索引/IndexedDB；只存在于笔记和内存缓存中。 |
| `note.<property>` 通过 MetadataCache 延迟读取 | DOI/arXiv 识别在需要时读 `getFileCache().frontmatter`。 |
| 使用声明式设置 API，大集合不能直接铺在设置页 | 新增“论文阅读”设置页；子项仅在开关开启后 `visible`。 |
| 图标只能用 Lucide 的 `getIcon()` | 菜单/按钮图标：`book-open`、`quote`、`languages`、`download`。 |
| Obsidian 代码扫描规则 | 不使用 `globalThis`、不写 inline style、不同时用 `title`+`aria-label`、不 reject 非 Error、不留空 catch。 |
| 大库性能 | 渲染路径不做联网或全库扫描；DOI→文件映射只在打开弹窗时按需构建。 |

## 2. 调研结果

### 2.1 代码现状

仓库中目前**没有**任何 DOI/arXiv/引用/翻译相关代码。可以复用的接口：

| 需求 | 已有接口 | 位置 |
| --- | --- | --- |
| 新建笔记并乐观发布关系 | `createNewRelatedFileForOrigin()` + `linkNewRelatedFile()` | `src/main.ts:3469`, `:3493` |
| 在两个已有笔记间建立关系 | `createRelationToPage()` | `src/main.ts:2648` |
| 新字段登记为本体（ontology）字段 | `rememberRelationshipOntology(role, field)` | `src/main.ts:2451` |
| 节点右键菜单 | `showNodeContextMenuAt()` | `src/ui/PlexGraph.tsx:2066` |
| 按属性值设置节点样式 | `noteTypeField` / `noteTypeStyles` | `src/settings.ts` |
| URL 节点（doi.org / arxiv.org 链接） | `GraphPage.url` | `src/types.ts` |
| 声明式设置页、`visible` / `disabled` | Obsidian 1.13 `SettingDefinition*` | `src/settings.ts:1484` |
| API key 安全存储 | `app.secretStorage` + `SecretComponent`（1.11.4+；`minAppVersion` 为 1.13.0） | `obsidian.d.ts:5571` |
| 不受 CORS 限制的 HTTP | `requestUrl()` | `obsidian.d.ts:5400` |

### 2.2 元数据服务（2026-09-25 实测）

| 服务 | 能力 | 实测结果 | 定位 |
| --- | --- | --- | --- |
| **Semantic Scholar Graph API** | `paper/{DOI:…|arXiv:…|CorpusId:…}`：标题、作者、年份、摘要、`externalIds`、引用数；`/references`、`/citations` 分页 | arXiv:1706.03762 的 references 调用成功；不带 key 的共享限流下偶尔返回 429 | **主数据源** |
| **OpenAlex** | `works/doi:…`、`filter=cites:W…`、`filter=openalex:W1\|W2` 批量查询、`abstract_inverted_index` | DOI 查询正常；**arXiv DOI（10.48550/…）查不到**；响应中现在包含 `cost_usd`（按用量计费/需要 key 的模式） | DOI 的备用源 |
| **arXiv API** | `export.arxiv.org/api/query?id_list=`：Atom 格式，含标题/摘要/作者/PDF 链接 | 正常 | arXiv 摘要的备用源（不含引用） |

结论：Semantic Scholar 为主，按标识符类型回退（DOI→OpenAlex，arXiv→arXiv API）。所有请求都必须处理 429：退避、串行队列、并发 ≤ 2；支持可选的 S2 API key。

### 2.3 翻译（2026-09-25 实测，均无需 key、无需 cookie）

| 服务 | 调用方式 | 实测结果 | 备注 |
| --- | --- | --- | --- |
| **Google** | `GET/POST https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t`，参数 `q` | 正常；返回**逐句的 `[译文, 原文]` 数组** | 天然适合双语逐句对照；长文本用 POST，避免 URL 过长 |
| **Bing** | ① `GET https://www.bing.com/translator`，从 HTML 中解析出 `IG`、`data-iid`、`params_AbusePreventionHelper = [key, token, ttl]`；② `POST /ttranslatev3?isVertical=1&IG=…&IID=…`，form 字段 `fromLang, to=zh-Hans, text, key, token` | 正常；返回整段译文。中国大陆网络会 302 到 `cn.bing.com`，后续请求需使用跳转后的 host | token 的有效期约 1 小时，缓存并在过期或 401/429 时刷新；单次请求的文本长度有限，需要分块 |
| ~~Edge `edge.microsoft.com/translate/auth`~~ | — | **已下线（404）** | 不采用 |
| 官方 Google Cloud / Azure Translator | 需要 key | 未采用 | 以后如有需要，可作为“使用自己的 key”的第三种服务接入 |

两者都是**非官方的网页接口**：随时可能变更或限流，且需要在用户文档中说明，这类接口可能不适合公开的社区插件审核（见 §8）。设计上把它们隐藏在 `TranslationProvider` 接口之后，失败时自动回退到另一个服务，并给出清晰的错误提示。

## 3. 统一开关设计

新增顶层设置页 **Paper reading**。第一项为总开关，其余设置只在开启后显示（`visible: () => settings.paperReadingEnabled`）。

```ts
// ExcaliBrainSettings 新增（均为扁平 key，便于声明式 get/setControlValue）
paperReadingEnabled: boolean;          // 默认 false —— 总开关
paperIdFields: string;                 // 默认 "doi, DOI, arxiv, arXiv, url"
paperReferenceField: string;           // 默认 "References"
paperFolder: string;                   // 默认 "Papers"（为空则用 getNewFileParent）
paperNoteType: string;                 // 默认 "Paper"，写入 noteTypeField，便于样式/滤镜
paperListLimit: number;                // 默认 50，slider 10–200
paperContactEmail: string;             // 可选，用于 OpenAlex polite pool
paperTranslator: "google" | "bing";   // 默认 "google"；失败时自动回退到另一个
paperTargetLanguage: string;           // 默认 "zh-CN"（映射：Google zh-CN / Bing zh-Hans）
paperAbstractView: "original" | "bilingual"; // 默认 "original"；弹窗中切换时自动记住
paperTranslateTitles: boolean;         // 默认 false：引文列表中的标题也显示中文
paperTranslateOnImport: boolean;       // 默认 false：导入时自动写入双语摘要
paperNoteAbstractFormat: "sections" | "bilingual"; // 笔记中的摘要格式，见 F4
// secrets（SecretStorage id）："kplex-s2-api-key"（可选，用于放宽 Semantic Scholar 的限流）
```

开关关闭时：不注册论文相关命令、菜单项不出现、不发出任何网络请求、已导入的笔记仍然是普通笔记（`References` 仍然是普通的本体字段）。开关状态**不影响**索引签名，也不触发重建（不加入 `REINDEX_SETTING_KEYS`）。

首次开启时弹出一次 `Modal`：列出会访问的服务（Semantic Scholar / OpenAlex / arXiv / Google 或 Bing 翻译）、会写入的属性名称，并确认把 `References` 登记为 **Parent** 字段（通过 `rememberRelationshipOntology`，会触发一次正常的本体重建；如果该字段已经属于其他角色，则保持原样并给出提示）。

### 本体方向

`References` 放在 **parents** 中：论文 A 的 `References: [[B]]` 表示 B 是 A 的父节点。

- 以 A 为中心：A 引用的论文（前置工作）显示在**上方**，引用 A 的论文（后续工作）显示在**下方**，形成一条从上到下的时间/学术谱系。
- 导入“被引文献” C 时，在 C 上写 `References: [[A]]`，C 自然显示为 A 的子节点。只需一个字段，方向不会产生歧义。
- 如果用户已将该字段分配给其他角色，则尊重用户的配置，不做覆盖。

## 4. 功能设计

### F1 论文识别（`src/paper/PaperIdentifier.ts`，纯函数）

- 输入：frontmatter 值 / URL 节点 / 字符串。
- 输出：`PaperId = { kind: "doi" | "arxiv" | "s2"; value: string }`，已规范化（DOI 转小写并去掉 `https://doi.org/` 前缀；arXiv 去掉版本号 `v7`，兼容旧式 `hep-th/…` 编号）。
- 覆盖：`doi.org/…`、`dx.doi.org`、`arxiv.org/abs|pdf/…`、`semanticscholar.org/paper/…`、裸 DOI/arXiv 编号。
- `paperKey(id)` 用于去重和缓存。

### F2 引用论文面板（`src/ui/PaperDetailsModal.ts`，Obsidian `Modal`）

入口：
- 节点右键菜单项 **Paper details…**：仅在开关开启、且节点可识别为论文时出现（Markdown 笔记 frontmatter 中有识别字段，或是 doi/arxiv URL 节点）。
- 命令 **Show paper details**（仅在 K-Plex 视图运行时可用，与现有命令的门控方式一致）。

内容：
- 头部：标题（开启 `paperTranslateTitles` 时下方显示中文标题）、作者、年份、会议/期刊、引用数，以及打开 DOI/arXiv/PDF 的链接。
- 摘要块，右上角有分段切换控件 **原文 | 双语**（见 F3）。
- 两个 tab：**References** / **Cited by**，使用分页（`paperListLimit`）和本地过滤输入框（不做嵌套滚动，列表区域是弹窗内唯一的滚动区）。
- 每一行：标题 · 年份 · 第一作者 · 引用数；徽标 `In vault` / `Linked`；操作：
  - 展开摘要（按需加载该条目的详情，同样遵循 原文/双语 设置）
  - **Add to vault**（F4）
  - **Link**（该论文已在仓库中但尚未关联时，调用 `createRelationToPage`）
  - 已在仓库中的条目：点击标题 → 在 Plex 中导航到该节点
- 批量：**Link all in vault**、**Add selected**（多选后批量导入，串行执行并显示进度，可取消）。

在 Plex 中显示：导入/关联后的论文就是普通的父/子关系，所以现有布局、过滤、滤镜（lens）、样式机制全部直接可用，不需要新增“虚拟引用节点”类型（避免污染语义索引）。

### F3 摘要与中文翻译（`src/paper/translation/`）

接口：

```ts
interface TranslationProvider {
  id: "google" | "bing";
  // 返回逐句对齐的片段；Bing 只返回整段译文时，按段落对齐（见下文）
  translate(text: string, from: string, to: string, signal: AbortSignal): Promise<TranslatedSegment[]>;
}
type TranslatedSegment = { source: string; target: string };
```

- **GoogleTranslator**：一次 POST；直接使用响应中的 `[target, source]` 逐句数组，得到精确的句级对齐。
- **BingTranslator**：`BingSession` 负责抓取并缓存 `IG/IID/key/token` 以及实际 host（www 或 cn），在接近过期、401 或 429 时刷新一次后重试。先用 `SentenceAlign` 把摘要切成句子，**每句一行**，用换行拼接后打包成 ≤ 1000 字符的块，逐块串行发送；译文按行拆回，得到句级对齐。如果某一块的译文行数与原文不一致（Bing 合并或拆分了句子），这一块降级为段落级对齐，不强行错位配对。
- **SentenceAlign**：`Intl.Segmenter("en", { granularity: "sentence" })` 切分句子，并保护 `e.g.`、`i.e.`、`et al.`、`Fig.`、`Eq.`、小数、版本号等不被切断；Google 和 Bing 共用同一套切分，保证两种服务的双语视图一致。
- **自动回退**：首选服务失败（网络错误、非 2xx、解析失败）时，自动改用另一个服务；两个都失败时，在摘要块内显示错误和“重试”，不弹出 Notice 轰炸。
- **缓存**：内存 LRU（key = paperKey + 服务 + 目标语言），切换 原文/双语 不会重复请求；只有第一次切到“双语”时才会联网。
- **显示**：
  - `原文`：只显示原文段落。
  - `双语`：逐句交替显示（对齐失败的块按段落显示）：原文使用正常文字，译文使用 `--text-muted` 并稍加缩进；样式写在 `.kplex-paper-bilingual` 类中，只使用主题变量。
  - 切换控件使用两个带 `aria-pressed` 的 button；选择会写回 `paperAbstractView`（不触发重建）。
- **标题翻译**（可选）：引文列表中可见的标题合并为一次请求（用换行分隔，每批 ≤ 50 条），结果按行对齐后缓存。
- 当前笔记已有摘要时，提供 **Save abstract to note**（格式见 F4），通过 `vault.process` 写入；已存在同名标题时不重复追加。

### F4 加入仓库（`src/paper/PaperNoteBuilder.ts` 纯函数 + `PaperImporter`）

笔记模板：

```markdown
---
title: "Attention Is All You Need"
aliases: ["Attention Is All You Need"]
authors: ["Ashish Vaswani", "Noam Shazeer", …]
year: 2017
venue: "NeurIPS"
doi: "10.48550/arXiv.1706.03762"
arxiv: "1706.03762"
url: "https://arxiv.org/abs/1706.03762"
citations: 12345
Note type: Paper          # 使用当前的 noteTypeField
References: ["[[源论文]]"]  # 仅在导入“被引文献”时写入
---

## Abstract
…

## 摘要（简体中文）
…（仅在已翻译或开启 paperTranslateOnImport 时写入）
```

`paperNoteAbstractFormat`：
- `sections`（默认）：如上，`## Abstract` 与 `## 摘要（简体中文）` 两个独立的章节，便于搜索和引用原文。
- `bilingual`：一个 `## Abstract` 章节，内容为逐句对照：原文作为普通段落，译文放在其后的 `> ` 引用行中，在 Obsidian 阅读视图中也能清晰区分。

- 文件名：`{第一作者姓} {年份} - {短标题}`，经过非法字符过滤和长度截断；与现有文件重名时追加 ` (2)`。
- 去重：导入前先按 DOI/arXiv 在仓库中查找，**已存在则只建立关联，不重复创建**。
- 关系：导入“参考文献”时在**源论文**上写 `References`；导入“被引文献”时在**新笔记**上写 `References`。统一走 `linkNewRelatedFile` 的乐观发布路径，写入失败时回滚。
- 文件夹：优先 `paperFolder`，否则 `getNewFileParent(sourcePath)`。

### F5 仓库内论文索引（`PaperVaultLookup`）

- 打开弹窗时构建一次 `Map<paperKey, TFile>`（遍历 `vault.getMarkdownFiles()` 并读取 `getFileCache().frontmatter` 中的识别字段）；弹窗打开期间复用，关闭时释放。
- **不进入** GraphIndex，不监听事件，不影响启动。2 万文件规模预计在几十毫秒量级，M5 中需要实测验证。

## 5. 模块划分

```
src/paper/                       ← 不 import obsidian（与重构计划的 host-free 方向一致）
  PaperIdentifier.ts             识别/规范化
  PaperTypes.ts                  PaperRecord, PaperRef, PaperId
  PaperMetadataService.ts        Provider 链 + 退避 + LRU + in-flight 去重，依赖注入 HttpGet
  providers/SemanticScholar.ts
  providers/OpenAlex.ts
  providers/Arxiv.ts             Atom 解析使用 DOMParser（由调用方注入）
  translation/
    TranslationProvider.ts       接口 + 自动回退 + LRU
    GoogleTranslator.ts          依赖注入 HttpPost
    BingTranslator.ts            BingSession（页面参数解析、token 缓存与刷新）+ 分块
    SentenceAlign.ts             句子切分（Intl.Segmenter + 缩写保护）与对齐
  PaperNoteBuilder.ts            文件名 + frontmatter + 正文
src/paper/obsidian/
  ObsidianHttp.ts                requestUrl 适配
  PaperVaultLookup.ts            MetadataCache 扫描
  PaperImporter.ts               调用 plugin 的创建/关联 API
src/ui/PaperDetailsModal.ts      弹窗
src/settings.ts                  设置 schema、默认值、Paper reading 页
src/main.ts                      命令注册、生命周期（关闭时 abort 正在进行的请求）
styles.css                       .kplex-paper-* 结构类，只使用主题变量
```

## 6. 里程碑

每个里程碑都需要满足：`npm test` 通过、`npm run build` 通过（Node 22.22.x）、无新增扫描告警、无默认开启的日志。

| # | 内容 | 验收 |
| --- | --- | --- |
| **M0** 开关与设置 | settings schema/默认值/迁移；Paper reading 页；S2 key 输入框（SecretStorage）；首次开启说明弹窗 + 登记 Parent 字段；开关不触发重建 | 关闭状态下行为与当前版本完全一致；旧 `data.json` 能正常加载；设置搜索可以找到各项 |
| **M1** 识别与元数据 | `PaperIdentifier`、三个 provider、`PaperMetadataService`（退避/缓存/取消） | 单元测试：各种 DOI/arXiv 格式；用固定 JSON/Atom fixture 覆盖 provider 解析；429 退避与回退；测试中不访问网络 |
| **M2** 详情弹窗（只读） | 右键菜单 + 命令；头部/摘要/References/Cited by；分页和过滤；In vault 徽标；点击导航 | 桌面主窗口和弹出窗口均可用，Escape/点击外部可关闭；关闭弹窗时中止请求；平板上触控可用 |
| **M3** 加入仓库 / 关联 | `PaperNoteBuilder`、`PaperImporter`、单条导入、Link、批量导入（进度 + 取消）、去重 | 测试：文件名规范化、去重、关系方向（references 与 cited by）；导入后无需重建即可在 Plex 中出现；写入失败时回滚 |
| **M4** 翻译与双语 | Google/Bing provider、BingSession、自动回退、原文/双语切换、标题翻译、Save abstract to note、translate-on-import、两种笔记格式 | 用固定 fixture 测试：Google 逐句解析、Bing 页面参数解析（含 cn 跳转）、token 过期刷新、分块边界、缩写保护、回退路径、错误统一为 Error、缓存命中（切换视图不重复请求）；实机验证中国大陆与海外网络下均可用 |
| **M5** 性能与移动端 | 2 万文件库中测量 `PaperVaultLookup` 耗时；iOS/Android 实机验证 `requestUrl`、弹窗布局和触控 | 记录测量数据；未发现渲染路径中存在联网或全库扫描 |
| **M6** 文档 | `docs/PAPER_READING.md` 用户指南（隐私说明、数据来源、字段约定）；README 增加一个指向该指南的简短章节；release notes | README 不包含开发细节 |

建议顺序：M0 → M1 → M2 → M3 → M4 → M5/M6。M2 结束后即可发布一个“只读浏览引用”的预览版本。

## 7. 与重构计划的协调

`Refactor plan.md` 正处于 C00 之前，计划逐步拆分 `main.ts` / `settings.ts`。为减少冲突：

- 新逻辑全部放在新目录 `src/paper/`，并且不依赖 Obsidian，天然符合重构目标的依赖方向。
- 对 `main.ts` / `settings.ts` / `PlexGraph.tsx` 的改动只限于**注册点**（设置字段、一个设置页、一个命令、一个菜单项），便于后续搬迁。
- 如果重构的 C03–C07（UI 基础组件）先落地，弹窗中的列表/按钮应复用这些组件。

## 8. 风险与待决问题

1. **S2 无 key 时限流严重**：批量操作需要节流；建议在设置中引导用户申请免费 key。
2. **OpenAlex 转向计费模式**（响应中出现 `cost_usd`）：仅作为备用源；如果需要 key，也放在 SecretStorage 中。
3. **非官方翻译接口**：Google `translate_a` 与 Bing `ttranslatev3` 没有公开的服务条款保证，可能随时变更、限流或封禁；Obsidian 社区插件审核也可能质疑这类接口。缓解措施：接口隔离 + 双服务自动回退 + 解析失败时给出明确提示；将来可增加“使用自己的 key”的官方 API 作为第三种服务。**如果计划提交到社区插件市场，发布前需要评估这一点。**
3a. **隐私**：摘要文本会发送给 Google/Bing，需在首次开启弹窗和用户文档中明确说明；只有用户主动触发翻译时才会发送。
4. ~~引用字段的角色~~ → 已决定使用 **Parent**。
5. **同一论文存在多个版本**（arXiv 预印本 + 期刊 DOI）：以 S2 `externalIds` 合并，二者任一命中即视为同一篇。
6. **frontmatter 中大量作者**：只写前 N 位（设置项），其余作者折叠为 `et al.`。

## 9. 其他可优化的功能（Backlog，按价值排序）

| 优先级 | 功能 | 说明 |
| --- | --- | --- |
| P1 | **按年份/引用数排序** | `nodeSortOrder` 新增 `year-desc/asc`、`citations-desc`（属性延迟读取，只在展示层生效，不重建索引）。 |
| P1 | **阅读状态** | `status: to-read / reading / done`，通过现有的属性值样式着色；右键菜单可快速切换。 |
| P1 | **论文预设滤镜（lens）** | 内置 “仅论文”、“近 5 年”、“高被引（>100）”、“未读” 滤镜模板（复用 GraphLens，不引入新的求值器）。 |
| P1 | **从 DOI/arXiv/URL 新建论文** | 在添加关系的弹窗中粘贴标识符 → 自动填充元数据并创建笔记。 |
| P2 | **Zotero / BibTeX 导入** | 读取 Better BibTeX 导出的 `.bib`/CSL-JSON，按 citekey 生成或关联笔记；支持 `@citekey` 形式的引用。 |
| P2 | **PDF 附件关联** | 下载开放获取 PDF（`openAccessPdf`）到附件目录并作为附件节点关联；在 Sidecar 中打开 PDF。 |
| P2 | **相关推荐** | S2 Recommendations API：在弹窗中增加第三个 tab “Related”。 |
| P2 | **共被引 / 文献耦合提示** | 对 Plex 中可见的论文，计算共同参考文献的数量，并标注“强关联”连线（只在展示层，限定在可见范围内计算）。 |
| P2 | **TL;DR / 一句话摘要** | S2 的 `tldr` 字段作为节点悬停摘要（遵循 750 ms 延迟规则）。 |
| P3 | **作者 / 会议节点** | 导入时可选创建作者、venue 笔记并建立关系，支持按作者浏览。 |
| P3 | **元数据刷新** | 命令：刷新选中论文的引用数和摘要（只更新 frontmatter 中的特定字段）。 |
| P3 | **响应持久化缓存** | 把 S2 响应放入独立的 IndexedDB store（需要升级数据库版本，参见 AGENTS 的 IndexedDB 规则），减少重复请求。 |
| P3 | **批注 / 高亮汇总** | 汇总 PDF++ / Annotator 的高亮，生成“要点”章节。 |
