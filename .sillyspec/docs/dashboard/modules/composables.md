---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: composables
---

# composables

## 定位

Vue 组合式函数层。提供 Dashboard 的全局状态管理、布局持久化、键盘快捷键三类核心能力，是所有组件的共享逻辑中枢。

## 契约摘要

### `useDashboard()` — 全局状态

**Reactive state:**
- `projects[]`, `activeProject`, `activeStep`, `logs[]`, `isPanelOpen`, `executingProject`, `isLoading`, `activeTab`, `docs`, `selectedDocFile`, `docContent`, `docLoading`

**Methods:**
- `selectProject(project)` — 按 path 查找并激活项目，重置 logs/step/doc
- `selectStep(step)` — 设置当前选中步骤
- `appendLog(lines)` — 追加日志（自动加时间戳 id），上限 500 条自动裁剪
- `clearLogs()` / `togglePanel()` / `openPanel()` / `closePanel()`
- `updateProjects(projects)` — 批量替换项目列表，自动恢复 activeProject
- `updateProject(project)` — 按 path 合并单个项目更新（浅合并 state/overview）
- `setExecuting(name)` / `isExecuting(name)` — 执行状态标记
- `setActiveTab(tab)`, `updateDocs(docs)`, `selectDocFile(file)`, `setDocContent(content)`, `setDocLoading(loading)`

**Computed:**
- `activeProjectName`, `activeProjectPath`, `activeProjectStage`, `hasProjects`, `activeProjectSteps`（从当前 stage 的 steps 取）

### `useKeyboard(options)` — 通用快捷键

- **快捷键:** Cmd/Ctrl+K, J, K, Escape, Enter, ArrowUp, ArrowDown
- 自动忽略 input/textarea/contentEditable 焦点
- Mac 自动识别 metaKey，其他平台用 ctrlKey
- 返回 `{ disable(), enable() }` 控制开关

### `useDashboardKeyboard(callbacks)` — Dashboard 专用快捷键映射

- 将 `onCmdK → onOpenCommandPalette`, `onJ → onNavigateDown`, `onK → onNavigateUp`, `onEscape → onClose`, `onEnter → onSelect`

### `useLayout()` — 布局管理

- **state:** `layout.overviewHeight` (默认 30%), `layout.columnWidths[3]` (默认等分)
- 持久化到 `localStorage('dashboard-layout-v2')`
- `overviewHeight` 限制 15%-75%，`columnWidth` 最小 10%
- `startDrag(type)` / `endDrag()` — 拖拽控制，自动添加/移除 `.resizing` body class
- `resetLayout()` — 恢复默认值并保存
- `onMounted` 时自动 loadLayout

## 关键逻辑

1. `appendLog` 为每条日志生成 `timestamp-random` 格式 id，超过 500 条裁剪尾部
2. `updateProject` 使用 `splice` 触发 Vue 响应式更新（非直接赋值）
3. `selectProject` 切换时自动从 `proj.state.progress.currentLogs` 恢复历史日志
4. `useKeyboard` 通过 `onMounted/onUnmounted` 管理 window 事件监听，避免内存泄漏
5. 布局值在 set 时自动 clamp + save，读时从 localStorage 恢复

## 注意事项

- `useDashboard` 是函数调用式单例（每次调用创建新 reactive），各组件需在同一上下文共享实例
- `useLayout` 的 `layout.overviewHeight` 和 `columnWidths` 是 reactive 嵌套对象，解构会丢失响应性
- `appendLog` 中 `Math.random()` 不保证唯一性，高并发场景可能 id 重复
- `setActiveTab` 等方法在 return 中以箭头函数形式内联定义（代码风格不一致）

## 人工备注

- 四个 composable 职责分明：状态 / 键盘 / 布局，未发现 useWebSocket（可能已移除或待实现）
- WebSocket 通信逻辑可能在 `useDashboard` 的 WebSocket 插件或其他模块中
