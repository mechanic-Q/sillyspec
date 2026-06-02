---
author: qinyi
created_at: 2026-06-03T06:40:00+08:00
---

# PROJECT — 项目概览

## 简介

SillySpec 是一个**规范驱动开发（Spec-Driven Development）工具包**，通过阶段式状态机让 AI 编码助手（如 Claude Code、Cursor）严格按照预定义步骤执行开发任务。它将软件开发流程拆解为可追踪、可验证的阶段（scan → brainstorm → plan → execute → verify → archive），每一步都有明确的输入/输出和完成条件。

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 18（ESM） |
| 数据库 | sql.js（WASM SQLite） |
| CLI 交互 | @inquirer/prompts、chalk、ora |
| 文件监听 | chokidar |
| 实时通信 | ws（WebSocket） |
| 前端仪表盘 | Vue 3 + Vite（packages/dashboard/） |
| 包管理 | npm（ESM only） |

## 入口文件

```
bin/sillyspec.js          # CLI 入口（#!/usr/bin/env node）
  → src/index.js          # 命令解析与分发（main 函数）
    → src/run.js          # 阶段执行引擎
    → src/init.js         # 项目初始化
    → src/progress.js     # 进度管理（ProgressManager）
    → src/db.js           # 数据库封装（DB 类）
    → src/stages/*.js     # 各阶段实现
    → src/modules.js      # 模块管理
```

## 关键命令

```bash
# 安装与初始化
sillyspec init                    # 初始化项目（自动检测工具）
sillyspec init --tool claude      # 只安装 Claude Code 模板
sillyspec setup                   # 安装推荐 MCP 工具

# 阶段执行（核心）
sillyspec run <stage>             # 执行指定阶段
sillyspec run auto                # 连续推进全流程
sillyspec run execute --done      # 完成当前步骤
sillyspec run plan --status       # 查看阶段进度

# 进度管理
sillyspec progress init           # 初始化项目数据库
sillyspec progress show          # 查看当前进度
sillyspec progress set-stage plan # 设置当前阶段

# 其他阶段
sillyspec run scan                # 项目扫描
sillyspec run brainstorm         # 头脑风暴
sillyspec run explore             # 探索项目
sillyspec run doctor              # 健康检查
sillyspec run status              # 状态总览
sillyspec run archive             # 归档变更
sillyspec run quick               # 快速模式
```

## 项目结构

```
sillyspec/
├── bin/sillyspec.js         # CLI 入口
├── src/                     # 核心源码
│   ├── index.js             # 命令分发
│   ├── init.js              # 初始化
│   ├── db.js                # SQLite 封装
│   ├── progress.js          # 进度管理
│   ├── run.js               # 阶段执行
│   ├── modules.js           # 模块管理
│   ├── sync.js              # 同步（未完成）
│   ├── worktree.js          # Git 工作树
│   ├── change-list.js       # 变更列表解析
│   ├── migrate.js           # 文档迁移
│   ├── setup.js             # MCP 工具安装
│   ├── stages/              # 各阶段实现
│   │   ├── scan.js
│   │   ├── brainstorm.js
│   │   ├── propose.js
│   │   ├── plan.js
│   │   ├── execute.js
│   │   ├── verify.js
│   │   ├── archive.js
│   │   ├── quick.js
│   │   ├── explore.js
│   │   ├── status.js
│   │   └── doctor.js
│   └── hooks/               # Git hooks
│       ├── claude-pre-tool-use.cjs
│       └── worktree-guard.js
├── packages/
│   └── dashboard/           # Vue 3 前端仪表盘
├── .sillyspec/               # 运行时数据（数据库等）
└── package.json
```
