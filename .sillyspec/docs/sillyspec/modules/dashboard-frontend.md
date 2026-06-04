---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# dashboard-frontend
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：packages/dashboard/src/**

## 职责
SillySpec Dashboard 的前端应用，提供多项目可视化管理界面，实时展示项目进度、流水线状态、文档浏览和 CLI 执行。

## 当前设计

前端是一个 Vue 3 单页应用，使用 Composition API（`<script setup>` 语法）构建。入口 `main.js` 创建 Vue 应用并全局注册 Naive UI 组件库。核心状态管理通过三个组合式函数（composable）实现：`useWebSocket` 管理 WebSocket 连接、`useDashboard` 管理应用状态、`useLayout` 管理布局持久化。

`App.vue` 是唯一的页面级组件，承担了主要的数据协调工作。它连接 WebSocket 消息到 Dashboard 状态，处理项目选择、命令执行、日志收集等核心交互。界面布局为上下分割的响应式设计：上部是项目概览区，下部是三栏（流水线/文档树/文档预览+详情面板）可调整布局。

构建工具使用 Vite 6，UI 使用 Naive UI 组件库，样式使用 Tailwind CSS 4。路径别名 `@` 映射到 `src/`。

## 对外接口（表格）

### 应用入口
| 文件 | 说明 | Props/参数 |
|------|------|-----------|
| `main.js` | 应用入口，创建 Vue 实例并挂载 | - |
| `App.vue` | 根组件，协调全局状态和布局 | - |

### App.vue 关键响应式状态
| 变量 | 类型 | 说明 |
|------|------|------|
| `isCommandPaletteOpen` | ref\<boolean\> | 命令面板开关 |
| `executionResult` | ref\<null\> | 执行结果 |
| `activeProject` | computed | 当前活跃项目 |
| `currentStageLabel` | computed | 当前阶段中文标签 |
| `progressLabel` | computed | 进度百分比文本 |
| `recentLogs` | computed | 最近 50 条日志 |

### App.vue 关键事件处理
| 函数 | 说明 |
|------|------|
| `handleProjectsUpdate` | 处理项目列表更新 |
| `handleSelectProject` | 选择项目并发送文档请求 |
| `handleSelectStage` | 选择阶段 |
| `handleSelectStep` | 选择步骤 |
| `handleSwitchTab` | 切换标签页 |
| `handleSelectDocFile` | 选择文档文件 |
| `handleExecute` | 执行当前阶段的 CLI 命令 |
| `handleKill` | 终止正在执行的命令 |
| `startDragVertical` | 启动垂直拖拽调整布局 |
| `startDragHorizontal` | 启动水平拖拽调整布局 |

## 关键数据流

1. **连接初始化**：应用挂载 → WebSocket 连接 → 接收 `projects:init` → 更新 Dashboard 状态 → 默认选中第一个项目
2. **项目切换**：用户选择项目 → `selectProject()` → 发送 `docs:get` → 接收 `docs:tree` → 更新文档树
3. **命令执行**：用户点击执行 → `handleExecute()` → 发送 `cli:execute` → 接收 `cli:output`（追加日志）→ 接收 `cli:complete` → 刷新项目状态
4. **文件监控更新**：服务端推送 `projects:updated` → `handleProjectsUpdate()` → 更新项目列表和活跃项目状态
5. **布局持久化**：用户拖拽调整 → `useLayout` 更新 reactive state → 自动保存到 `localStorage`

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 使用 Composition API 而非 Options API | 更好的逻辑复用和类型推导 | Options API（逻辑分散） |
| 全局注册 Naive UI 而非按需引入 | 简化开发，dashboard 项目体量小 | unplugin-auto-import（增加构建复杂度） |
| 布局状态存 localStorage | 跨会话保持用户偏好 | Pinia/Vuex（过度设计） |
| 使用 marked 库渲染 Markdown | 成熟、轻量的 Markdown 渲染方案 | markdown-it、自行解析 |
| 根组件协调全局状态 | 应用简单，无需状态管理库 | Pinia（对当前体量不必要） |
| Vite 6 构建 | 快速 HMR、ESM 原生支持 | Webpack（启动慢） |

## 依赖关系
- 内部依赖：
  - `composables/useWebSocket.js` — WebSocket 连接管理
  - `composables/useDashboard.js` — 应用状态管理
  - `composables/useLayout.js` — 布局状态管理
  - `components/**` — 所有 UI 组件
- 外部依赖：
  - `vue`（响应式框架）
  - `naive-ui`（UI 组件库）
  - `marked`（Markdown 渲染）
  - `@vicons/ionicons5`（图标库）

## 注意事项
- App.vue 承担了较多状态协调逻辑，如果继续增长需要考虑拆分
- 全局注册 Naive UI 会增加打包体积，但对 dashboard 工具场景可接受
- WebSocket 断连后有自动重连机制（在 useWebSocket 中实现）
- CLI 命令执行时通过 `allowedStages` 白名单在服务端校验
- 布局使用百分比而非像素，确保不同分辨率下的适配

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
