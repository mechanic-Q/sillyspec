---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: components
---

# components

## 定位

Vue 组件层。共 18 个 `.vue` 文件，构成 Dashboard 的完整 UI 界面，涵盖项目列表、流水线视图、文档预览、日志流、详情面板等模块。

## 契约摘要

### 项目列表

| 组件 | 职责 |
|------|------|
| `ProjectList.vue` | 项目列表容器，含头部和项目卡片列表 |
| `ProjectCard.vue` | 单个项目卡片，emit `select` 事件，支持 selected 样式 |
| `ProjectOverview.vue` | 概览区域，显示项目概况信息 |

### 流水线

| 组件 | 职责 |
|------|------|
| `PipelineView.vue` | 流水线主视图容器，含 Tab 切换（pipeline / docs） |
| `PipelineStage.vue` | 单个阶段节点，含状态指示器和连接线 |
| `StepCard.vue` | 单个步骤卡片，支持 hover 效果和选中状态 |
| `StageBadge.vue` | 阶段状态徽章，JetBrains Mono 字体，支持多种 size |

### 命令与操作

| 组件 | 职责 |
|------|------|
| `CommandPalette.vue` | 命令面板（n-modal），搜索+命令列表 |
| `ActionBar.vue` | 底部操作栏，含顶部光晕装饰效果 |

### 文档

| 组件 | 职责 |
|------|------|
| `DocTree.vue` | 文档树，含搜索过滤（n-input） |
| `DocPreview.vue` | 文档预览，空态提示"选择一个文档查看内容" |

### 日志

| 组件 | 职责 |
|------|------|
| `LogStream.vue` | 日志流视图，含搜索过滤（n-input） |

### 详情面板

| 组件 | 职责 |
|------|------|
| `DetailPanel.vue` | 侧边详情面板，支持展开/收起动画（w-[340px] ↔ w-0） |
| `detail/GitDetail.vue` | Git 信息详情子组件 |
| `detail/TechDetail.vue` | 技术栈详情子组件 |
| `detail/DocsDetail.vue` | 文档详情子组件 |

### 布局

| 组件 | 职责 |
|------|------|
| `VResizeHandle.vue` | 垂直拖拽分割条（mousedown 事件） |
| `HResizeHandle.vue` | 水平拖拽分割条（mousedown 事件） |

## 关键逻辑

1. `DetailPanel.vue` 通过 CSS class 切换实现 340px ↔ 0 的过渡动画
2. `CommandPalette.vue` 使用 Naive UI 的 `n-modal`，mask-closable 支持点击遮罩关闭
3. `LogStream.vue` 和 `DocTree.vue` 都使用 `n-input` 进行搜索过滤
4. `StageBadge.vue` 使用动态 `badgeStyle` 计算样式，JetBrains Mono 等宽字体
5. 两个 ResizeHandle 组件配合 `useLayout` composable 的 `startDrag/endDrag` 实现拖拽调整布局
6. detail 子组件（Git/Tech/Docs）嵌套在 `DetailPanel` 内，根据 activeTab 切换显示

## 注意事项

- 大量组件使用内联 style 而非 CSS class（如 `background: rgba(17,17,19,0.9)`），维护性一般
- `CommandPalette.vue` 和 `LogStream.vue` 直接使用 Naive UI 组件（n-modal, n-input），耦合了 UI 库
- `DetailPanel.vue` 的宽度写死为 `w-[340px]`，未使用 useLayout 的布局状态
- `ProjectCard.vue` 通过 props 接收 project 数据，但 props 定义需查看 `<script>` 确认
- detail 子组件位于 `components/detail/` 子目录，路由/import 路径需注意

## 人工备注

- 组件共 18 个，未发现路由配置文件（可能为纯组件库或内嵌在某个 App 组件中）
- UI 风格统一：浅色主题 + 微妙的光晕/毛玻璃效果
