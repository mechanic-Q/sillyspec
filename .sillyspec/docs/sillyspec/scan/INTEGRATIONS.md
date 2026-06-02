# INTEGRATIONS.md — 外部集成文档

> author: qinyi | created_at: 2026-06-03T06:30:00+08:00

## 依赖集成

### Node.js 运行时依赖

| 包名 | 用途 | 集成位置 |
|---|---|---|
| `@inquirer/prompts` ^7.10 | 交互式 CLI 提示（选择、确认、输入） | `src/stages/` 各 stage 的用户交互 |
| `chalk` ^5.6 | 终端彩色输出 | 全局 — 日志、状态展示、错误提示 |
| `chokidar` ^4.0 | 文件系统监听（实时监控变更） | `packages/dashboard/server/watcher.js` |
| `open` ^10.1 | 用默认浏览器打开 URL | `packages/dashboard/server/index.js`（启动时打开 dashboard） |
| `ora` ^9.3 | 终端 spinner 动画 | 各 stage 的加载/等待状态 |
| `sql.js` ^1.14 | WebAssembly SQLite，嵌入式数据库 | `src/db.js` — 数据库初始化与查询 |
| `ws` ^8.18 | WebSocket 服务器/客户端 | `packages/dashboard/` 前后端通信 |

### Dashboard 子项目额外依赖

| 包名 | 用途 |
|---|---|
| `vue` ^3.5 | 前端框架 |
| `naive-ui` ^2.44 | UI 组件库 |
| `marked` ^17.0 | Markdown 渲染（文档预览） |
| `@vicons/ionicons5` ^0.13 | 图标库 |
| `tailwindcss` ^4.0 | 原子化 CSS 框架 |
| `vite` ^6.0 | 构建工具与开发服务器 |

## 外部服务

### SillyHub 平台同步

**模块：** `src/sync.js`

通过 Node.js 原生 `fetch`（Node 22+）与 SillyHub 后端 API 通信：

| 接口 | 方法 | 用途 |
|---|---|---|
| Health check | GET | 检查平台可用性 |
| Sync | POST | 同步变更信息到平台 |
| Doc sync | POST | 同步文档内容 |
| Approval | POST | 提交/查询审批状态 |

**配置来源：** `.sillyspec/local.yaml` 中的 `platform` 段

**容错策略：** Best effort — 所有网络失败 `console.warn`，不抛错，不阻塞主流程。

### WebSocket 实时通信（Dashboard）

**后端：** `packages/dashboard/server/index.js`  
**前端：** `packages/dashboard/src/composables/useWebSocket.js`

- 协议：WebSocket（ws 库）
- 后端广播消息类型：`stage:update`、`scan:paths`、`docs:tree`、命令执行输出流
- 前端自动重连机制
- Origin 校验（`127.0.0.1`）

## 平台对接

### AI 编码工具集成

通过 `src/setup.js` 和 hooks 与以下 AI 编码工具集成：

| 工具 | 集成方式 | 说明 |
|---|---|---|
| Claude Code | `.claude/skills/` 目录下的 SKILL.md | 为 Claude Code 提供每个 stage 的技能定义，引导 AI 按 SillySpec 流程工作 |
| Claude Code | `src/hooks/claude-pre-tool-use.cjs` | pre-tool-use hook，在 Claude 执行工具前拦截检查 |
| Cursor | CLAUDE.md / CLAUDE.md 等配置 | 通过项目级指令文件引导 Cursor 遵循流程 |
| 通用 AI | `.claude/skills/` SKILL.md | 18+ 个 skill 文件覆盖全部 stage，供任意支持 skill 格式的 AI 工具加载 |

### Git 集成

| 功能 | 集成位置 | 说明 |
|---|---|---|
| Worktree 管理 | `src/worktree.js`, `src/worktree-apply.js` | 为每个变更创建隔离 git worktree |
| Worktree 保护 | `src/hooks/worktree-guard.js` | 控制文件读写权限，防止跨 worktree 越界操作 |
| Git 信息检测 | `src/init.js`, `src/modules.js` | 读取 remote URL、HEAD commit 等信息 |
| Git 操作执行 | `src/stages/doctor.js` | 直接调用 sqlite3 命令行工具 |

### 文件系统集成

| 功能 | 集成位置 | 说明 |
|---|---|---|
| 文件监听 | `packages/dashboard/server/watcher.js` | chokidar 监控 `.sillyspec/` 下文件变更，实时推送 WebSocket 更新 |
| 嵌入式数据库 | `src/db.js` | sql.js 将 SQLite 运行在内存/文件中，无需外部数据库服务 |

### 操作系统集成

| 功能 | 集成位置 | 说明 |
|---|---|---|
| 浏览器打开 | `packages/dashboard/server/index.js` | 使用 `open` 包在 dashboard 启动时自动打开浏览器 |
| 终端 spinner | 全局 ora 调用 | 在长时间操作时显示加载动画 |
| 子进程执行 | `src/setup.js`, `src/run.js` 等 | 通过 `child_process.execSync` 执行 git、npm 等系统命令 |
