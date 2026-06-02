# STRUCTURE.md — 项目目录结构

> author: qinyi | created_at: 2026-06-03T06:30:00+08:00

## 目录结构

```
sillyspec/
├── bin/
│   └── sillyspec.js            # CLI 入口，#!/usr/bin/env node → src/index.js
├── src/
│   ├── index.js                # 主入口，注册所有 stage 命令
│   ├── run.js                  # Stage 运行器，执行 stage 生命周期
│   ├── init.js                 # sillyspec init — 初始化项目配置
│   ├── setup.js                # 环境检查与工具安装（claude/cursor 等）
│   ├── db.js                   # sql.js 封装，SQLite 数据库初始化与操作
│   ├── progress.js             # ProgressManager — 变更/阶段/步骤状态机核心
│   ├── sync.js                 # SyncManager — SillyHub 平台同步（HTTP fetch）
│   ├── modules.js              # 项目模块扫描与描述生成
│   ├── change-list.js          # 变更列表查询与展示
│   ├── migrate.js              # 数据库 schema 迁移
│   ├── worktree.js             # Git worktree 创建与管理
│   ├── worktree-apply.js       # Worktree 变更应用（合并回主分支）
│   ├── stages/                 # 各 stage 命令实现
│   │   ├── index.js            # Stage 注册表
│   │   ├── scan.js             # scan — 项目扫描与文档生成
│   │   ├── explore.js          # explore — 项目探索
│   │   ├── brainstorm.js       # brainstorm — 需求头脑风暴
│   │   ├── plan.js             # plan — 制定实施计划
│   │   ├── propose.js          # propose — 提出变更方案
│   │   ├── execute.js          # execute — 执行变更
│   │   ├── quick.js            # quick — 快速执行（跳过 plan）
│   │   ├── verify.js           # verify — 验证变更
│   │   ├── status.js           # status — 查看当前进度
│   │   ├── doctor.js           # doctor — 诊断与修复
│   │   └── archive.js          # archive — 归档已完成变更
│   └── hooks/                  # Git hooks 与辅助钩子
│       ├── claude-pre-tool-use.cjs  # Claude pre-tool-use hook（CJS 格式）
│       └── worktree-guard.js       # Worktree 保护守卫（读写权限控制）
├── packages/
│   └── dashboard/              # Web Dashboard 子项目（独立 package）
│       ├── package.json
│       ├── vite.config.js      # Vite 构建配置
│       ├── index.html          # SPA 入口
│       ├── public/             # 静态资源
│       │   ├── favicon.jpg
│       │   ├── logo.jpg
│       │   ├── prototype-dashboard.html  # 原型页面
│       │   └── prototype-overview.html   # 原型页面
│       ├── server/             # 后端服务（Node.js）
│       │   ├── index.js        # HTTP + WebSocket 服务器入口
│       │   ├── watcher.js      # 文件监听（chokidar）
│       │   ├── executor.js     # CLI 命令执行器
│       │   └── parser.js       # 输出解析器
│       └── src/                # 前端源码（Vue 3）
│           ├── main.js         # Vue 应用入口
│           ├── App.vue         # 根组件
│           ├── style.css       # 全局样式
│           ├── composables/    # Vue composables
│           │   ├── useDashboard.js   # Dashboard 状态管理
│           │   ├── useWebSocket.js   # WebSocket 连接（自动重连）
│           │   ├── useKeyboard.js    # 键盘快捷键
│           │   └── useLayout.js      # 布局管理
│           └── components/     # Vue 组件
│               ├── ProjectList.vue      # 项目列表
│               ├── ProjectCard.vue      # 项目卡片
│               ├── ProjectOverview.vue  # 项目概览
│               ├── PipelineView.vue     # 流水线视图
│               ├── PipelineStage.vue    # 流水线阶段
│               ├── StepCard.vue         # 步骤卡片
│               ├── StageBadge.vue       # 阶段标签
│               ├── CommandPalette.vue   # 命令面板
│               ├── ActionBar.vue        # 操作栏
│               ├── DetailPanel.vue      # 详情面板
│               ├── LogStream.vue        # 日志流
│               ├── DocTree.vue          # 文档树
│               ├── DocPreview.vue       # 文档预览
│               ├── VResizeHandle.vue    # 垂直拖拽分割
│               ├── HResizeHandle.vue    # 水平拖拽分割
│               └── detail/
│                   ├── GitDetail.vue     # Git 详情
│                   ├── TechDetail.vue    # 技术详情
│                   └── DocsDetail.vue    # 文档详情
├── .claude/skills/             # Claude Code skills 定义
│   ├── sillyspec-scan/SKILL.md
│   ├── sillyspec-explore/SKILL.md
│   ├── ... (共 18+ 个 skill)
│   └── sillyspec-auto/SKILL.md
├── docs/
│   └── sillyspec/
│       ├── scan/               # Scan 阶段生成的文档
│       │   ├── ARCHITECTURE.md
│       │   ├── CONVENTIONS.md
│       │   ├── STRUCTURE.md
│       │   ├── INTEGRATIONS.md
│       │   ├── PROJECT.md
│       │   ├── TESTING.md
│       │   └── CONCERNS.md
│       └── file-lifecycle.md   # 文件生命周期说明
├── .sillyspec/                 # 运行时数据（运行时生成）
├── CLAUDE.md                   # Claude Code 项目指令
├── SKILL.md                    # SillySpec 自身 skill 描述
├── README.md                   # 项目说明文档
├── package.json                # 主包配置（type: module, bin: sillyspec）
└── package-lock.json
```

## 核心模块说明

### CLI 核心 (`src/`)

| 模块 | 职责 |
|---|---|
| `index.js` | 程序入口，解析命令行参数并路由到对应 stage |
| `run.js` | Stage 运行器，管理 stage 执行生命周期 |
| `db.js` | 基于 sql.js（WebAssembly SQLite）的数据库层，提供初始化与查询接口 |
| `progress.js` | **核心状态机**，管理变更（change）→ 阶段（stage）→ 步骤（step）的完整生命周期 |
| `sync.js` | SillyHub 平台同步模块，通过 HTTP fetch 实现变更/文档/审批的云端同步 |
| `init.js` | 项目初始化，创建 `.sillyspec/` 目录结构、检测 git 信息 |
| `setup.js` | 环境检查与 AI 工具（Claude/Cursor）安装引导 |
| `worktree.js` | Git worktree 管理，为变更创建隔离工作环境 |
| `worktree-apply.js` | 将 worktree 中的变更应用回主分支 |
| `modules.js` | 扫描项目结构，生成模块描述（供 Claude 理解项目） |
| `change-list.js` | 查询和展示变更列表 |
| `migrate.js` | 数据库 schema 版本迁移 |

### Stages (`src/stages/`)

每个文件对应一个 `sillyspec <stage>` 子命令，遵循统一的 stage 接口。流水线顺序：

**scan → explore → brainstorm → plan → propose → execute → verify → archive**

另有工具型 stage：`status`（进度查看）、`doctor`（诊断修复）、`quick`（快速执行）。

### Hooks (`src/hooks/`)

| Hook | 职责 |
|---|---|
| `claude-pre-tool-use.cjs` | Claude pre-tool-use hook，在 Claude 调用工具前进行拦截检查 |
| `worktree-guard.js` | Worktree 保护守卫，控制文件读写权限，防止越界操作 |

### Dashboard (`packages/dashboard/`)

独立的 Web Dashboard 子项目，提供 SillySpec 可视化界面：

- **后端**：Node.js HTTP + WebSocket 服务器，集成 CLI 命令执行、文件监听、输出解析
- **前端**：Vue 3 + Naive UI + Tailwind CSS，实时展示流水线进度、文档树、日志流
- **通信**：WebSocket 双向通信，自动重连机制
