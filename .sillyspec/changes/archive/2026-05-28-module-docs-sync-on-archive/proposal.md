# module-docs-sync-on-archive — 提案

author: qinyi
created_at: 2026-05-28 11:09:00

## 背景

当前 SillySpec 的 scan 文档只在初始扫描阶段生成，archive 阶段只负责检查任务、移动变更目录、更新 ROADMAP 和 git add。

这导致一个问题：变更完成后，设计知识只保存在 archive 历史里，没有沉淀回当前模块文档。下一次 AI 开发时，如果只读取 scan 文档，就无法获得模块的最新设计状态；如果翻 archive，又会成本高、噪音大。

因此需要在 archive 阶段增加模块文档同步能力。

## 目标

在变更归档前，自动分析本次变更影响的模块，生成模块影响记录，并将已确认的设计结果同步到模块级长期设计文档。

## 非目标

- 本次不实现 plan / execute / verify 阶段对 modules/ 的强制读取和校验
- 本次不改变 archive 目录的历史证据定位
- 本次不把模块文档设计成完整变更日志

## 核心原则

- **scan 是项目全景**（初始理解）
- **modules 是长期上下文**（描述模块当前状态，是下一次 AI 开发前必须读取的上下文）
- **archive 是历史证据**（保存完整变更过程）
- **module-impact.md 是 change 与 modules 之间的桥梁**
- **模块文档正文描述当前状态，底部只保留轻量变更索引**

## 方案概述

### 1. scan 阶段生成模块映射初稿

在 scan 阶段末尾新增步骤，生成 `.sillyspec/docs/<project>/modules/_module-map.yaml`，建立"文件路径 → 模块"的稳定映射。

### 2. archive 阶段新增两个步骤

**extract-module-impact：**
- 综合 proposal.md、design.md、tasks.md 和 git diff
- 根据 `_module-map.yaml` 匹配影响的模块
- 生成 `changes/<change>/module-impact.md`

**sync-module-docs：**
- 根据 module-impact.md 生成模块文档更新 patch
- 展示给用户确认
- 确认后写入 `.sillyspec/docs/<project>/modules/*.md`

### 3. 独立命令

暴露 `silly sync-modules <change>`，支持归档前单独预览模块文档更新。

## 变更范围

- 修改 `src/stages/archive.js`（插入两个新步骤）
- 修改 `src/stages/scan.js`（末尾新增模块映射生成步骤）
- 新增模块文档模板逻辑
- 新增 `silly sync-modules` 独立命令（可选，取决于 CLI 架构）

## 不在范围内

- plan/execute/verify 阶段读取 modules/ 的能力
- proposal 自动对比 modules/ 发现冲突
- 模块文档自动生成完整 API 文档

## 成功标准

1. archive 流程中能自动识别本次变更影响的模块
2. 能生成结构化的 module-impact.md
3. 能在用户确认后更新 modules/*.md
4. 模块文档正文始终描述当前状态，不累积历史
5. `silly sync-modules <change>` 可独立运行预览
