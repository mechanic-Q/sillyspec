---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# dashboard-components
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：packages/dashboard/src/components/**

## 职责
Dashboard 的所有 UI 组件，涵盖项目概览、流水线可视化、文档浏览、日志流、命令面板、详情面板及布局调整手柄。

## 当前设计

组件库按功能分为三类：布局组件（PipelineView、ProjectOverview、DetailPanel）、交互组件（ActionBar、CommandPalette、LogStream）和基础组件（StageBadge、StepCard、ProjectCard、DocTree、DocPreview、PipelineStage）。另有 `detail/` 子目录包含三个详情子组件（GitDetail、TechDetail、DocsDetail）和两个调整手柄组件（HResizeHandle、VResizeHandle）。

所有组件使用 Vue 3 `<script setup>` 语法，通过 `defineProps` 接收数据、`defineEmits` 向上发送事件。组件间无直接通信，所有数据流经父组件 App.vue 或 PipelineView 中转。UI 主要使用 Naive UI 组件（NButton、NTag、NSpin 等）配合 Tailwind CSS 类名。

## 对外接口（表格）

| 组件 | 说明 | Props | Emits |
|------|------|-------|-------|
| `PipelineView` | 主三栏视图（流水线+文档树+预览） | project, docs, selectedStep, activeTab | select-step, switch-tab, select-doc-file |
| `ProjectOverview` | 项目概览区域，展示项目卡片列表 | projects, activeProject, scanPaths | select |
| `ProjectList` | 左侧项目列表 | projects, activeProject, scanPaths | select, scan:add-path, scan:remove-path |
| `ProjectCard` | 单个项目卡片 | project, isActive | select |
| `ActionBar` | 顶部操作栏（执行/终止/命令面板） | project, isExecuting | execute, kill, toggle-panel, open-palette |
| `CommandPalette` | 命令面板浮层 | isOpen, projects | close, select-project, select-stage |
| `DetailPanel` | 右侧详情面板（日志+详情子面板） | project, selectedStep, isExecuting, visible | close, clear-logs, open-doc-file |
| `LogStream` | 日志流输出展示 | logs | clear |
| `StageBadge` | 阶段状态徽标 | stage, status | - |
| `StepCard` | 步骤卡片 | step, isActive, isSelected | select |
| `PipelineStage` | 流水线阶段（包含步骤列表） | stage, stageName, activeStepId | select-step |
| `DocTree` | 文档树形列表 | docs, activeFile | select-file |
| `DocPreview` | 文档预览（Markdown 渲染） | content, loading | - |
| `HResizeHandle` | 水平调整手柄 | side | drag-start, drag-end, resize |
| `VResizeHandle` | 垂直调整手柄 | side | drag-start, drag-end, resize |
| `detail/GitDetail` | Git 状态详情 | data | - |
| `detail/TechDetail` | 技术栈详情 | data | - |
| `detail/DocsDetail` | 文档列表详情 | data | open-file |

## 关键数据流

1. **项目列表**：App.vue → `ProjectOverview`（projects prop）→ `ProjectList` → `ProjectCard`（用户点击）→ emit select → App.vue
2. **流水线视图**：App.vue → `PipelineView`（project prop）→ `PipelineStage`（阶段数据）→ `StepCard`（步骤数据）→ emit select-step → App.vue
3. **文档浏览**：App.vue → `PipelineView`（docs prop）→ `DocTree`（文件树）→ emit select-file → App.vue → `DocPreview`（content prop）
4. **详情面板**：App.vue → `DetailPanel`（selectedStep prop）→ `LogStream`（日志）+ `GitDetail`/`TechDetail`/`DocsDetail`
5. **命令执行**：`ActionBar` → emit execute/kill → App.vue → WebSocket 发送 → 服务端执行

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 纯 Props/Emits 单向数据流 | 简单清晰，组件解耦，易于理解和维护 | Provide/Inject（跨层级多时不直观） |
| 组件按功能分层 | 职责单一、复用性高 | 按页面/路由拆分（dashboard 是单页） |
| DocPreview 使用 marked 渲染 | 支持完整 Markdown 语法 | v-html + 简易解析（功能不足） |
| detail/ 子目录独立 | 详情子组件与主组件同级数量过多 | 平铺在 components/ 根目录 |
| 自定义 ResizeHandle 而非 Naive UI Split | 需要精确控制拖拽行为和持久化 | Naive UI NSplit（定制性不足） |
| StageBadge 独立组件 | 多处复用（ActionBar、PipelineStage、CommandPalette） | 内联在各组件中（重复代码） |

## 依赖关系
- 内部依赖：
  - `StageBadge` → 被 ActionBar、PipelineStage、CommandPalette 引用
  - `StepCard` → 被 PipelineStage 引用
  - `ProjectCard` → 被 ProjectOverview/ProjectList 引用
  - `LogStream` → 被 DetailPanel 引用
  - `detail/*` → 被 DetailPanel 引用
  - `PipelineStage`、`DocTree`、`DocPreview` → 被 PipelineView 引用
  - `ProjectOverview` → 使用 `useLayout` composable
- 外部依赖：
  - `vue`（computed, ref, watch, nextTick）
  - `marked`（Markdown 渲染，仅 DocPreview 使用）

## 注意事项
- `ProjectOverview` 额外 import 了 `defineProps`/`defineEmits`（Vue 3 script setup 中自动可用，此处为冗余导入）
- ResizeHandle 组件使用原生 DOM 事件而非 Vue 指令实现拖拽
- LogStream 有自动滚动到底部功能（使用 `nextTick` + `scrollTop`）
- DocPreview 需要处理 Markdown 渲染异常（marked 可能对非法语法报错）
- detail/ 子组件（GitDetail、TechDetail、DocsDetail）都是纯展示组件，仅接收 data prop

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
