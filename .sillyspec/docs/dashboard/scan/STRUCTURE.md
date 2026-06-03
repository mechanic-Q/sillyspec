# Dashboard 项目结构

- author: qinyi
- created_at: 2026-06-03T10:03:30+08:00

## 目录结构

```
packages/dashboard/
├── index.html                  # Vite 入口 HTML
├── package.json                # 包配置（ESM, Vue 3 + Vite 6）
├── vite.config.js              # Vite 构建配置
├── public/                     # 静态资源
│   ├── favicon.jpg
│   ├── logo.jpg
│   ├── prototype-dashboard.html   # 原型页面（仪表盘）
│   └── prototype-overview.html    # 原型页面（概览）
├── src/                        # 前端源码（Vue 3 SPA）
│   ├── main.js                 # Vue 应用入口
│   ├── App.vue                 # 根组件（WebSocket 连接、路由、状态）
│   ├── style.css               # 全局样式（Tailwind CSS）
│   ├── components/             # Vue 组件
│   │   ├── ActionBar.vue       # 操作栏（项目级操作按钮）
│   │   ├── CommandPalette.vue  # 命令面板（CLI 命令输入）
│   │   ├── DetailPanel.vue     # 详情面板容器（右侧侧边栏）
│   │   ├── DocPreview.vue      # 文档预览（Markdown 渲染）
│   │   ├── DocTree.vue         # 文档树（目录结构展示）
│   │   ├── HResizeHandle.vue   # 水平拖拽分割条
│   │   ├── LogStream.vue       # CLI 输出日志流
│   │   ├── PipelineStage.vue   # Pipeline 阶段卡片
│   │   ├── PipelineView.vue    # Pipeline 全景视图
│   │   ├── ProjectCard.vue     # 项目卡片（列表项）
│   │   ├── ProjectList.vue     # 项目列表
│   │   ├── ProjectOverview.vue # 项目概览面板
│   │   ├── StageBadge.vue      # 阶段状态徽章
│   │   ├── StepCard.vue        # 步骤卡片
│   │   ├── VResizeHandle.vue   # 垂直拖拽分割条
│   │   └── detail/             # 详情子面板
│   │       ├── DocsDetail.vue  # 文档详情
│   │       ├── GitDetail.vue    # Git 信息详情
│   │       └── TechDetail.vue   # 技术栈详情
│   └── composables/            # Vue 组合式函数
│       ├── useDashboard.js     # 仪表盘状态管理
│       ├── useKeyboard.js      # 键盘快捷键
│       ├── useLayout.js        # 布局状态
│       └── useWebSocket.js    # WebSocket 连接管理
├── server/                     # 后端服务（Node.js ESM）
│   ├── index.js                # HTTP + WebSocket 服务器入口
│   ├── executor.js             # CLI 命令执行器（child_process）
│   ├── parser.js               # 项目状态/文档/Git/技术栈解析
│   └── watcher.js              # 文件系统监控（chokidar）
└── dist/                       # 构建产物（Vite build 输出）
```

## 核心模块说明

### `server/index.js` — 服务端核心
- 创建 HTTP 服务器 + WebSocket 服务器（基于 `http` + `ws`）
- 处理 REST API 路由：`/api/projects`、`/api/docs/content`、`/api/overview`、`/api/git`、`/api/tech`、`/api/pipeline`
- WebSocket 事件广播：项目更新、CLI 输出、扫描路径、文档树
- CLI 命令白名单执行（仅允许 sillyspec 子命令）
- 启动时自动打开浏览器（`open` 库）

### `server/executor.js` — CLI 执行器
- 通过 `child_process.spawn` 执行 `npx sillyspec <args>`
- 实时流式输出 stdout/stderr 到 WebSocket 客户端
- 支持进程终止（kill）

### `server/watcher.js` — 文件监控
- 使用 `chokidar` 监控用户主目录下所有包含 `.sillyspec/` 的项目
- 自动检测新增/移除项目，解析状态变更
- 支持自定义扫描路径注册

### `server/parser.js` — 数据解析
- 解析 `package.json` 检测框架/技术栈
- 解析 `.sillyspec/.runtime/progress.json` 获取 pipeline 状态
- 解析 Git 状态（`git log --oneline`）
- 解析文档树（`.sillyspec/docs/` 目录结构）

### `src/App.vue` — 前端根组件
- WebSocket 连接生命周期管理
- 项目列表/详情视图切换
- CLI 命令发送与输出接收
- 文档内容按需加载（fetch `/api/docs/content`）

### `src/composables/useWebSocket.js` — WebSocket 组合式函数
- 自动连接/断线重连（3s 间隔）
- 事件订阅机制（on/off/emit）
- 连接状态响应式追踪
