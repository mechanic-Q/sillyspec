# Dashboard - 项目概览

> author: qinyi | created_at: 2026-06-03T10:03:00+08:00

## 项目简介

SillySpec Dashboard 是 SillySpec 的可视化仪表盘，提供项目扫描流程的可视化展示、文档预览和命令执行功能。采用前后端一体化架构，内嵌 Node.js 后端提供 API 和 WebSocket 实时通信。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| 构建 | Vite 6 |
| UI 库 | Naive UI ^2.44.1 |
| CSS | Tailwind CSS v4 |
| 图标 | @vicons/ionicons5 |
| Markdown | marked ^17.0.6 |
| 后端 | Node.js HTTP + WebSocket (ws) |
| 文件监控 | chokidar ^4.0 |
| 包管理 | npm (ESM) |

## 入口文件

| 文件 | 用途 |
|------|------|
| `src/main.js` | Vue 应用入口，挂载 App + 导入全局样式 |
| `src/App.vue` | 根组件，组合所有 composables 和子组件 |
| `index.html` | HTML 模板，引入 Google Fonts (DM Sans, JetBrains Mono) |
| `vite.config.js` | Vite 配置，端口 3456，`@` 别名指向 src |
| `server/index.js` | 后端入口，HTTP API + WebSocket 服务 |

## 关键命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 3456） |
| `npm run build` | 构建生产版本至 `dist/` |
| `npm run preview` | 预览生产构建 |

## 目录结构

```
packages/dashboard/
├── src/
│   ├── App.vue              # 根组件
│   ├── main.js              # 应用入口
│   ├── style.css            # 全局样式
│   ├── components/          # UI 组件 (15 个)
│   │   ├── ActionBar.vue    # 操作栏
│   │   ├── CommandPalette.vue # ⌘K 命令面板
│   │   ├── DetailPanel.vue  # 详情面板
│   │   ├── PipelineView.vue # 流水线视图
│   │   ├── ProjectList.vue  # 项目列表
│   │   ├── ProjectCard.vue  # 项目卡片
│   │   ├── ProjectOverview.vue # 项目概览
│   │   ├── LogStream.vue    # 日志流
│   │   ├── DocTree.vue      # 文档树
│   │   ├── DocPreview.vue   # 文档预览
│   │   ├── HResizeHandle.vue / VResizeHandle.vue # 拖拽调整
│   │   ├── PipelineStage.vue / StepCard.vue / StageBadge.vue
│   │   └── detail/DocsDetail.vue
│   └── composables/         # 组合式函数 (4 个)
│       ├── useDashboard.js  # 核心数据状态
│       ├── useWebSocket.js  # WebSocket 连接
│       ├── useLayout.js     # 布局状态
│       └── useKeyboard.js   # 键盘快捷键
├── server/
│   ├── index.js             # HTTP + WebSocket 服务
│   ├── parser.js            # Git/文件解析
│   ├── executor.js          # 命令执行
│   └── watcher.js           # 文件监控
├── public/
│   ├── favicon.jpg
│   ├── logo.jpg
│   └── prototype-*.html     # 原型文件（可清理）
├── package.json
├── vite.config.js
└── index.html
```
