---
author: qinyi
created_at: 2026-06-03T06:40:00+08:00
---

# CONVENTIONS — 代码约定

## 框架隐形规则

- **ESM 优先**：项目 `"type": "module"`，所有 `.js` 文件使用 ES Module 语法（`import`/`export`），禁止 CJS `require()`（`.cjs` 文件除外，如 hooks）
- **Node ≥ 18**：运行时最低要求 Node.js 18，可安全使用 `fs/promises`、`structuredClone`、`fetch` 等原生 API
- **SQLite 驱动状态**：使用 `sql.js`（WASM SQLite），数据存储在 `.sillyspec/sillyspec.db`，所有状态查询通过 `src/db.js` 的 `DB` 类
- **CLI 单入口**：`bin/sillyspec.js` → `src/index.js`，所有命令通过 `main()` 函数分发
- **零配置 init**：`sillyspec init` 自动检测开发工具（Claude Code、Cursor 等），非交互式默认

## 代码风格

### 命名
- **文件命名**：kebab-case（`change-list.js`、`worktree-guard.js`）
- **函数命名**：camelCase（`parseFileChangeList`、`ensureStageSteps`）
- **导出类**：PascalCase（`DB`、`ProgressManager`）
- **常量/配置**：UPPER_SNAKE_CASE 或小写字符串常量

### 错误处理
- CLI 层：`process.exit(1)` 终止并打印错误信息
- 业务逻辑层：抛出具体错误消息字符串，由调用方捕获处理
- 数据库操作：`DB` 类封装了错误处理，调用方通过 try/catch 处理
- 无自定义 Error 类，使用原生 `Error` 或字符串消息

### 日志
- 使用 `console.log` / `console.error` / `console.warn` 直接输出
- 用户友好提示使用 `chalk` 库着色
- 进度展示使用 `ora`（spinner）
- 交互式提示使用 `@inquirer/prompts`

### 模块组织
- `src/index.js` — CLI 入口，命令分发
- `src/init.js` — 初始化与工具安装
- `src/db.js` — SQLite 数据库封装
- `src/progress.js` — 进度管理
- `src/run.js` — 阶段执行引擎
- `src/modules.js` — 模块管理
- `src/stages/*.js` — 各阶段独立模块（scan、brainstorm、plan、execute 等）
- `src/hooks/` — Git hooks 和工作树守卫
- `packages/dashboard/` — Vue 3 前端仪表盘（子包）

## 典型模式

### 1. 阶段步骤模式
每个阶段（stage）对应 `src/stages/` 下的独立模块，导出阶段步骤数组。`run.js` 的 `getStageSteps()` 动态加载步骤并逐步执行，支持 `--done`/`--skip`/`--status` 控制。

### 2. 数据库先行模式
项目数据（进度、变更记录）全部存储在 SQLite 中。`ProgressManager` 类封装所有 CRUD，代码不直接操作文件状态（除文件扫描阶段外）。

### 3. 模板指令模式
每个阶段的步骤通过 markdown 模板文件（`.sillyspec/docs/` 下）定义，包含 `@` 指令（如 `@read`、`@exec`、`@write`）供 AI 执行器解析。阶段执行器读取模板后按指令顺序驱动 AI。

### 4. 自动检测模式
`init.js` 中的 `detectTools()` 自动扫描项目目录检测开发工具，无需用户手动配置。类似的自动检测在 `run.js` 的 `autoDetectChange()` 中也有体现。

### 5. 子包隔离模式
`packages/dashboard/` 作为独立子包存在，使用 Vue 3 + Vite 构建。与 CLI 核心松耦合，通过共享数据库文件（`sillyspec.db`）进行数据交互。
