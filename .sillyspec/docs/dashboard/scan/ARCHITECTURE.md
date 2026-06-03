---
author: qinyi
created_at: 2026-06-03T10:03:00+08:00
doc_type: architecture
schema_version: 1
---

# Dashboard 技术架构文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API + script setup) |
| UI 组件库 | Naive UI ^2.44 |
| CSS 框架 | Tailwind CSS 4 |
| 构建工具 | Vite 6 + @vitejs/plugin-vue |
| Markdown 渲染 | marked ^17.0 |
| 图标 | @vicons/ionicons5 |
| 后端运行时 | Node.js (ESM) |
| WebSocket | ws ^8.18 |
| 文件监听 | chokidar ^4.0 |
| 浏览器打开 | open ^10.1 |

## 架构概览

Dashboard 采用**前后端一体**架构，内嵌 Node.js HTTP + WebSocket 服务器，与 SillySpec CLI 共享 `.sillyspec/` 数据目录。

### 后端 (server/)

```
packages/dashboard/server/
  index.js       → HTTP + WebSocket 服务器入口（端口 3456）
  watcher.js     → chokidar 监听 .sillyspec/ 文件变更
  executor.js    → 子进程执行 sillyspec CLI 命令
  parser.js      → 解析 CLI 输出为结构化数据
```

### 前端 (src/)

```
packages/dashboard/src/
  main.js              → Vue 应用入口（createApp）
  App.vue              → 根组件（布局骨架）
  style.css            → 全局样式（Tailwind 导入）
  composables/         → 4 个可组合逻辑
    useDashboard.js     → 核心状态管理（项目/变更/阶段/步骤）
    useWebSocket.js    → WebSocket 连接（自动重连）
    useKeyboard.js     → 键盘快捷键
    useLayout.js       → 布局管理（面板折叠/拖拽）
  components/          → 16 个 Vue 组件
    ProjectList.vue     → 项目列表
    ProjectCard.vue     → 项目卡片
    ProjectOverview.vue → 项目概览
    PipelineView.vue    → 流水线视图
    PipelineStage.vue   → 流水线阶段
    StepCard.vue        → 步骤卡片
    StageBadge.vue      → 阶段标签
    CommandPalette.vue  → 命令面板（Ctrl+K）
    ActionBar.vue       → 操作栏
    DetailPanel.vue     → 详情面板
    LogStream.vue       → 日志流
    DocTree.vue         → 文档树
    DocPreview.vue      → 文档预览
    VResizeHandle.vue    → 垂直拖拽分割
    HResizeHandle.vue    → 水平拖拽分割
    detail/             → 详情子面板
      GitDetail.vue     → Git 详情
      TechDetail.vue    → 技术详情
      DocsDetail.vue    → 文档详情
```

### 数据流

```
SillySpec CLI (.sillyspec/)
  → watcher.js (chokidar) 监听文件变更
  → WebSocket 广播事件 (stage:update / scan:paths / docs:tree)
  → useWebSocket.js 接收并更新 useDashboard.js 状态
  → Vue 组件响应式渲染
```

```
用户操作 (CommandPalette / ActionBar)
  → executor.js 执行 sillyspec CLI 命令
  → parser.js 解析输出
  → WebSocket 推送结果
  → 组件更新
```

## 数据模型（摘要）

Dashboard 无独立数据库，数据全部来自 `.sillyspec/` 文件系统和 SillySpec CLI 输出。

### 前端状态 (useDashboard.js)

| 状态 | 类型 | 说明 |
|------|------|------|
| projects | Array | 项目列表 |
| currentProject | Object | 当前选中的项目 |
| changes | Array | 当前项目的变更列表 |
| stages | Array | 当前变更的阶段列表 |
| steps | Array | 当前阶段的步骤列表 |
| logs | Array | CLI 输出日志流 |

### WebSocket 事件协议

| 事件 | 方向 | 说明 |
|------|------|------|
| `stage:update` | Server→Client | 阶段/步骤状态变更 |
| `scan:paths` | Server→Client | 扫描路径更新 |
| `docs:tree` | Server→Client | 文档树更新 |
| 命令输出流 | Server→Client | CLI 执行输出 |
