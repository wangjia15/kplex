# K-Plex 当前契约与功能边界

以随仓库源码为准；外部安装版本可能不同，先检查版本和实际配置。本文是技能作者的参考，不代表允许修改用户设置。

## 论文元数据与匹配

- 插件 ID `k-plex`。`src/settings.ts` 默认：`paperReadingEnabled=false`、`paperFolder="Papers"`、`paperReferenceField="References"`、`paperIdFields="doi, DOI, arxiv, arXiv, url, source"`。`paperFolder` 被显式设为空时，原生控制器使用 Obsidian 的新文件夹规则。
- `src/paper/PaperIdentifier.ts` 识别 DOI、arXiv（包括旧格式和 DOI 包装）、S2 ID。属性名由 `paperIdFields` 决定。`PaperReadingController.idsForFile()` 可将非 DOI/arXiv 的 HTTP 论文链接结合 title 变成标题查询提示；单有 `Note type: Paper` 或一个标题不保证启用论文卡。网络标题匹配有歧义，应核对作者与年份。
- `PaperNoteBuilder.paperFrontmatter()` 只写实际有值的字段：title、aliases、authors、year、venue、doi、arxiv、url、pdf、citations 和调用方给定样式字段。authors 最多取 12 位再加 et al.。`citations=0` 有效，未知值不可伪装成 0。
- `missingPaperProperties()` 按不区分大小写的属性名补缺，不覆盖现有值，不自动补 aliases；已存在 doi 或 arxiv 时不再自动补这两类属性。`appendAbstractSections()` 防止重复追加相同标题。技能应保留这种增量语义，并对自己的深读小节执行相同的保留/去重原则。
- 悬停摘要来自本地可配置摘要属性，继而中文翻译摘要节、Abstract 节；图片来自本地嵌入图像（原生默认取至多 3 张）。因此写入真实正文与图片有用，但 DOI/arXiv 不是凭空保证所有功能的开关。论文开关、悬停选项、识别到 ID 和宿主状态都影响结果。

## Ontology 与引用

`src/paper/obsidian/PaperReadingController.ts` 的 `ensureReferenceOntology()` 将配置的引用字段注册为 parent，遇到字段已分配其他角色则拒绝移动并提示。`linkCitation(citing,cited)` 在 citing 的引用字段建立 parent 关系，保留现有 ontology，避免自链/重复。

- 默认 Compass：parent 上、child 下、leftFriend 左、rightFriend 右。字段名称及所属角色以 `settings.hierarchy` 为准，默认语汇不授权硬套用户 vault。
- 默认纸面引用属于 parent 分类，表示引用方向；“方法奠基”是更强的阅读解释，需要在正文给证据。完整书目清单是引用事实的权威清单，与 ontology 的投影分开。新生成的同一对论文只声明一种显式角色：一般引用用 References，核实的相似/反对工作可用 Friends/Challenger 代替且不同时写 References。否则不同的显式角色会引入竞争证据，不能保证只呈现想要的方位。旧有竞争关系保留并报告，不未经许可删除。
- 关系声明一侧已足够：`主文 References → 引文` 不要求再写引文的 Children。反写不同角色可能给同一对节点制造竞争证据，尤其是 Friends/Challenger。
- 默认逐篇建立被引论文的独立摘要笔记；关键引文额外详解，其余不递归扩展。未建独立笔记的参考文献保留书目原文或 HTTPS 链接，不放到已建笔记关系列表里伪装成已完成。摘要不可得的 metadata-only 笔记计为“摘要待补”，按清单区分笔记覆盖数与摘要取得数。
- 当前样式属性配置键是 `noteTypeField`，默认 `Note type`；`PaperReadingController` 用它和 `paperNoteType` 调用 `paperFrontmatter()`。`primaryTagField` 仅保留旧迁移兼容，不能拿它替代当前字段。frontmatter 写配置值，例如 `文献类型: Paper`，而非键名 `noteTypeField`；论文类型值也沿用配置的 `paperNoteType`。

## Section、图卡与朗读

解析由 `src/index/SectionContent.ts` 拥有：

- 标题构成原生 Section 树，包含嵌套层级；并非只有 `##`。高亮 `==文本==` 后接 `^[评论]` 或脚注可被读为内容面板。普通正文依然保存在笔记，但不会自动成为高亮面板。
- 图片可用 `![[相对路径.png]]` 或 Markdown 图像。图后紧跟 `Figure 1: …` / `Table 1: …` / `图 1…` / `表 1…` 题注最稳定；解析器最多看后两行且遇普通内容即停止。支持斜体题注，无需把解读混成作者题注。
- 代码围栏中的 Mermaid 不会被 Section 图像解析器当作真实图片。Markdown 表格也不会自动转成图像面板，应保留真实表格裁图，文字表格可作补充。
- `sectionShowContent`、`sectionShowHighlights`、`sectionShowFigures` 与局部折叠状态影响显示。面板可移动/缩放/折叠，图像悬停大图可钉住。`FigureCard.tsx` 中钉住图卡以视口为坐标，不跟随画布平移；不要承诺跨重启持久保存图卡。
- `sectionPanelSpeechText()` 读取高亮 + 评论或图像题注。更长图表解读要在笔记正文阅读；需要面板朗读时可增加明确标为读者概括的高亮评论，不能冒充作者原句。
- `docs/CANVAS_VIEW_API.md` 的能力表确认 Compass 和 Mind Map 共用可选章节边界；Facets 的类别区域不等于全文章节。Pins、图卡 pin、同步到 pinned leaf 是三个不同概念。Sidecar 是原生相邻 leaf，K-Plex 在 sidepanel 时不可用；只写 PDF 路径不会自动打开它。

## Facets 与安全谓词

实际 schema：`src/core/plex/sharing/{contracts,validation,authoring}.ts` 和 `views/facets/{contracts,classification,validation,rules}.ts`。

预设 envelope 为 `{format:"kplex-preset",version:1,kind:"facets",id,preset,aiContext}`。preset 必须包括 version、name、source、field、categories、order、start、spacing、regionWidth、regionHeight、guides、tints、conflictingColor、unassignedColor、helpMarkdown。category 为 `{label,color,values,assignment?,rule?}`；不接受随意添加的配置键。要求 3–7 个分类，order 与 categories 对应。

本技能采用 `source:"property"` 和 `field:"Paper role"`：六种角色精确匹配，英文/中文别名对应一个 category，`assignment` 指定原生拖放预览可写的规范英文值。用户明确操作前不写入角色。未知值和缺失角色进入 Unassigned；元数据尚不可用进入 Checking 或 Cannot classify；数组包含两个类别时进入 Conflicting，不使用“所有 Paper 都是 application”的兜底。

当前 `predicateParser.parseIdentifierPath()` **支持** `note["Paper role"]`，同样支持 `note.state`；属性有空格时方括号写法有效。合法组合使用 `&&`、`||`、`!`，不写 JavaScript 或自然语言 `or`。字段/枚举大小写和类型要匹配。纯属性分类无需编造规则；规则模式对不可用元数据有独立 unknown 语义。

`validatePortablePackage()` 是 GUI 与后续调用者共用的真正验证入口。验证不能只做 JSON.parse，也不能把“能编译 rule”当成“分类互斥”。随技能测试覆盖完整 admission、导入计划、分类行为、合法方括号语法与反例。导入不自动启用视图/镜头、不修改笔记或 ontology。没有已发布的 CLI import 命令，不猜测插件公共方法。
