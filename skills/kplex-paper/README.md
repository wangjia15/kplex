# kplex-paper

把论文精读进 Obsidian + K-Plex：真实图表与逐节解读、全部被引论文的独立摘要笔记及关键引文详解、完整参考文献清单，以及现有 ontology、原生 Mind Map、Section 和 Facets 的使用指导。

## 安装

把本目录复制到你的技能目录，例如 `~/.claude/skills/kplex-paper/`，保留 `SKILL.md`、`references/` 与 `presets/` 的相对结构。已有同名技能时先备份再替换，重新加载技能列表。此操作只安装技能，不安装或修改 K-Plex、Obsidian vault 或设置。

提供已安装 K-Plex 的 vault 和论文文件/链接，然后说“用 K-Plex 读这篇论文”。技能会优先发现已有 vault 和配置；无法唯一定位时才询问。Facets 预设需要通过 K-Plex 原生导入预览导入并选择，不会自动激活。

## 维护与评测

在 K-Plex 源码仓库安装正常依赖后运行：

```bash
node --test skills/kplex-paper/scripts/validate.mjs
```

脚本直接打包当前真实验证器、分类器、导入计划、论文笔记构建器及 Section 解析器；不需要 Obsidian，不读写个人 vault，也不输出构建文件。源码契约变更会暴露不兼容。单独安装到技能目录后，这个维护脚本仍需要回到 K-Plex 源码 checkout 运行；它不是 Obsidian 内置命令。

`evals/fixtures.json` 是合成的确定性契约样例，图像路径只测试解析，不代表图片存在或图像质量验收。`evals/evals.json` 提供三种任务级评测：自定义 ontology、缺失元数据、重复执行。执行任务级评测时，评测者还需提供允许写入的已有测试 vault；第一例需一篇可读全文和其真实图表/引文，第二例需粘贴真实摘要，第三例需已导入且经过人工编辑的笔记。这些任务提示与断言不等于已经运行的模型基准。原生 UI、朗读与真实图片检查需在相应环境另行验证。
