---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# dashboard-composables
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：packages/dashboard/src/composables/**

## 职责
Dashboard 前端的组合式函数（composables），封装 WebSocket 连接、应用状态、布局管理和键盘快捷键等可复用逻辑。

## 当前设计

模块包含 4 个 composable 文件，每个导出一个以 `use` 开头的函数，遵循 Vue 3 Composition API 约定。这些 composable 在 `App.vue` 中组合使用，通过闭包和 Vue 响应式 API（`ref`、`reactive`、`computed`）管理各自的状态域。

`useWebSocket` 封装了 WebSocket 连接生命周期，提供基于事件类型的消息订阅机制（`on`/`off`/`send`），内置自动重连。`useDashboard` 管理全局应用状态（项目列表、活跃项目、日志、执行状态等），提供计算属性和操作方法。`useLayout` 管理可拖拽布局的持久化，使用 `localStorage` 保存/恢复布局配置。`useKeyboard` 提供键盘快捷键注册，`useDashboardKeyboard` 是其高阶封装，绑定 dashboard 特定的快捷键映射。

所有 composable 均为单例模式（模块级变量），在应用生命周期内共享同一状态实例。

## 对外接口（表格）

| 函数 | 文件 | 说明 | 参数 | 返回值 |
|------|------|------|------|--------|
| `useWebSocket()` | useWebSocket.js | WebSocket 连接管理 | - | { connected, on, send, disconnect } |
| `useDashboard()` | useDashboard.js | 应用状态管理 | - | { state, getProject, selectProject, selectStep, appendLog, clearLogs, togglePanel, openPanel, closePanel, updateProjects, updateProject, setExecuting, isExecuting, activeProjectName, activeProjectPath, activeProjectStage, hasProjects, activeProjectSteps, setActiveTab, updateDocs } |
| `useLayout()` | useLayout.js | 布局状态管理 | - | { layout, isDragging, dragType, loadLayout, saveLayout, resetLayout, setOverviewHeight, setColumnWidth, startDrag, endDrag } |
| `useKeyboard(options)` | useKeyboard.js | 通用键盘快捷键 | { bindings, onEscape } | { destroy } |
| `useDashboardKeyboard(callbacks)` | useKeyboard.js | Dashboard 快捷键绑定 | { onCommandPalette, onExecute, onKill, onTogglePanel, onNavigateProject } | { destroy } |

### useWebSocket 返回方法
| 方法 | 说明 |
|------|------|
| `connected` | ref\<boolean\> — 连接状态 |
| `on(type, handler)` | 注册消息类型监听，返回取消函数 |
| `send(data)` | 发送 JSON 消息 |
| `disconnect()` | 断开连接 |

### useDashboard.state 结构
| 属性 | 类型 | 说明 |
|------|------|------|
| `projects` | Array | 项目列表 |
| `activeProject` | Object/null | 当前活跃项目 |
| `selectedStep` | Object/null | 当前选中步骤 |
| `activeTab` | String | 当前活跃标签页 |
| `logs` | Array | 日志条目列表（带时间戳） |
| `panelOpen` | Boolean | 详情面板是否展开 |
| `executingProject` | String/null | 正在执行命令的项目名 |
| `docs` | Object | 当前项目文档树数据 |

### useLayout.layout 结构
| 属性 | 类型 | 说明 |
|------|------|------|
| `overviewHeight` | Number | 概览区域高度百分比（默认 30） |
| `columnWidths` | Number[3] | 三栏宽度百分比（默认 [33.33, 33.33, 33.33]） |

### useDashboardKeyboard 快捷键映射
| 快捷键 | 动作 |
|--------|------|
| Ctrl/Cmd + K | 打开命令面板 |
| Ctrl/Cmd + Enter | 执行命令 |
| Ctrl/Cmd + C | 终止命令 |
| Ctrl/Cmd + J | 切换面板 |
| Ctrl/Cmd + Up/Down | 切换项目 |

## 关键数据流

1. **WebSocket 消息**：`useWebSocket.connect()` → 接收消息 → 按类型分发到注册的 handler → App.vue 中 `ws.on()` 注册各类型处理
2. **状态更新**：`useDashboard.updateProjects()` → 更新 projects 数组 → 如果活跃项目在更新列表中则同步更新 → 触发 computed 重算
3. **布局持久化**：用户拖拽 → App.vue 调用 layout setter → reactive 对象变化 → `saveLayout()` 写入 localStorage（key: `dashboard-layout-v2`）
4. **键盘快捷键**：用户按键 → `useKeyboard.handleKeyDown` → 匹配 bindings → 执行回调 → App.vue 中 `useDashboardKeyboard` 绑定的各动作

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 模块级单例（非工厂模式） | 全局共享状态，所有组件引用同一实例 | 每次调用创建新实例（状态不共享） |
| WebSocket 基于事件类型的发布订阅 | 解耦消息处理逻辑，App.vue 按类型注册 | switch-case 分发（扩展性差） |
| localStorage 存储布局 | 简单直接，无需后端持久化 | IndexedDB（过度设计） |
| 布局使用百分比 | 响应式适配不同屏幕 | 像素值（需要额外计算） |
| useKeyboard + useDashboardKeyboard 分层 | 通用键盘逻辑可复用，dashboard 快捷键独立配置 | 全部写在 App.vue（不可复用） |
| 日志追加带时间戳 | 便于调试和追踪 | 无时间戳（信息不完整） |

## 依赖关系
- 内部依赖：
  - `useDashboard` 被 App.vue 使用
  - `useWebSocket` 被 App.vue 使用
  - `useLayout` 被 App.vue 和 ProjectOverview 使用
  - `useKeyboard` 被 App.vue 间接使用（通过 useDashboardKeyboard）
- 外部依赖：
  - `vue`（ref, reactive, computed, onMounted, onUnmounted）

## 注意事项
- 所有 composable 是模块级单例，不要在不同组件中期望独立状态
- `useWebSocket` 的 `on()` 方法返回取消函数，App.vue 在 onMounted 中注册但未在 onUnmounted 中取消（单页应用无影响，但如果有路由切换需要注意）
- `useLayout` 的 localStorage key 为 `dashboard-layout-v2`，修改布局结构时需要更新版本号避免旧数据冲突
- `useDashboard.state.logs` 没有上限保护，长时间运行可能导致内存增长（App.vue 中 recentLogs computed 限制了显示为 50 条，但 state.logs 本身无限增长）
- `useDashboardKeyboard` 区分 Mac（metaKey）和 Windows/Linux（ctrlKey）

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
