---
author: qinyi
created_at: 2026-06-03T06:30:00+08:00
doc_type: architecture
schema_version: 1
---

# SillySpec 技术架构文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 18 (ESM) |
| 语言 | 纯 JavaScript，无编译步骤 |
| CLI 交互 | @inquirer/prompts |
| 终端 UI | chalk, ora |
| 数据库 | SQLite (sql.js — 纯 WASM，无 native 依赖) |
| 文件监听 | chokidar |
| 实时通信 | ws (WebSocket) |
| 外部打开 | open (浏览器/编辑器) |
| Dashboard 子项目 | Vue 3 + Naive UI + Vite + Tailwind CSS 4 + marked |

## 架构概览

### 核心模块

```
bin/sillyspec.js          → CLI 入口，引导至 src/index.js
src/
  index.js                → 主入口：init / setup / progress 子命令
  db.js                   → DB 类：SQLite 初始化、迁移、CRUD（sql.js WASM）
  progress.js             → ProgressManager 类：变更阶段状态查询/推进
  sync.js                 → SyncManager 类：与外部平台同步（chokidar + ws）
  worktree.js             → WorktreeManager 类：Git worktree 生命周期管理
  worktree-apply.js       → worktree 变更应用逻辑
  change-list.js          → 变更列表查询/展示
  init.js                 → init 命令：安装命令模板到 .sillyspec/
  setup.js                → setup 命令：安装 MCP 工具配置
  migrate.js              → 数据库 schema 迁移
  run.js                  → 阶段运行器（调用 stageRegistry）
  hooks/
    worktree-guard.js     → worktree 守卫钩子
  stages/
    index.js              → stageRegistry：注册所有阶段定义
    brainstorm.js         → 头脑风暴阶段
    propose.js            → 方案提议阶段
    plan.js               → 方案规划阶段
    execute.js            → 方案执行阶段
    verify.js             → 验证阶段
    scan.js               → 扫描阶段（辅助）
    quick.js              → 快速模式（辅助）
    explore.js            → 探索阶段（辅助）
    archive.js            → 归档阶段（辅助）
    status.js             → 状态查询（辅助）
    doctor.js             → 健康检查（辅助）

packages/dashboard/       → Vue 3 Web 面板（Vite 构建），实时查看项目状态
```

### 主流程：阶段状态机

SillySpec 核心是一个**阶段状态机**，驱动 AI 按固定流程完成变更：

```
brainstorm → propose → plan → execute → verify → archive
```

辅助阶段（`scan`, `quick`, `explore`, `status`, `doctor`）可在任意时刻独立执行。

### 数据流

1. **CLI 入口** → 解析子命令（init / setup / progress / run）
2. **DB (db.js)** → 从 `.sillyspec/.runtime/sillyspec.db` 读取/写入状态（SQLite WAL 模式）
3. **run.js** → 从 `stageRegistry` 查找阶段定义，生成 prompt 并执行
4. **各阶段** → 读取项目源码，产出 Markdown 文档到 `.sillyspec/docs/`
5. **SyncManager (sync.js)** → 通过 WebSocket 将变更同步到外部平台
6. **Dashboard** → 通过 ws 连接实时展示项目/变更/阶段状态

## 数据模型（摘要）

存储位置：`.sillyspec/.runtime/sillyspec.db`（SQLite，由 sql.js 驱动）

| 表名 | 说明 | 字段数 |
|------|------|--------|
| `project` | 项目信息（单行，id 固定为 1） | 5 |
| `changes` | 变更记录（一个变更 = 一次任务） | 11 |
| `stages` | 变更的阶段状态（每个变更多条） | 6 |
| `steps` | 阶段内的具体步骤（每个阶段多个步骤） | 7 |
| `batch_progress` | 批量操作进度统计 | 6 |
| `approvals` | 人工审批记录（每个变更最多一条） | 7 |

### 关系

- `project` (1) → `changes` (N)
- `changes` (1) → `stages` (N) → `steps` (N)
- `changes` (1) → `batch_progress` (0..1)
- `changes` (1) → `approvals` (0..1)
