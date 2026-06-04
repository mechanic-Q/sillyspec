---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-06-04 16:55:00
---

# 剩余实现差异清单

本页只记录当前代码仍存在的实现差异。已修复的条目不再保留为缺口，包括：

- `brainstorm` / `propose` 重复 object key 导致步骤丢失。
- scan prompt 写 `.sillyspec/.runtime/local.yaml`。
- hook 只读根目录 `local.yaml`。
- archive 第 4 步正常流程不触发自动归档。
- 自动 sync / approval 参数顺序不匹配。
- `ProgressManager._updatePlatformLastSync()` / `_updateApprovalStatus()` 缺失。

## workflow-runs 平台路径支持未从 run.js 接通

代码位置：`src/workflow.js`、`src/run.js`

现象：

- `saveWorkflowRun()` 支持传 `runtimeRoot`。
- `run.js` scan/archive post-check 调用时没有传 `runtimeRoot` / `scanRunId`。

影响：

- 自动 post-check 的 workflow run 当前写本地 `.sillyspec/.runtime/workflow-runs/`。
- 平台模式下不能按旧文档断言它会写入 `<runtime-root>/scan-runs/<scan-run-id>/workflow-runs/`。

## `--no-worktree` 未作为 run flag 接通

代码位置：`src/run.js`、`src/stages/execute.js`、`src/worktree.js`、`src/hooks/worktree-guard.js`

现象：

- execute prompt 和 worktree 错误信息提到 `--no-worktree`。
- `buildExecuteSteps()` 也有 `noWorktree` option。
- `runCommand()` 的 known flags 不包含 `--no-worktree`。
- CLI usage 也没有列出 `--no-worktree`。

影响：

- 文档不能把 `--no-worktree` 描述成已可用的公开 run 参数。
- `changes.no_worktree` / gate `noWorktree` 字段存在，但当前没有清晰 CLI 生命周期入口。

## DB schema version 口径不统一

代码位置：`src/db.js`、`src/progress.js`

现象：

- `db.js` 的 `project.schema_version` 默认值是 4。
- `progress.js` 的 `CURRENT_VERSION` 是 3。
- `ProgressManager.init()` 写 project 行时使用 `CURRENT_VERSION`。

影响：

- 文档只描述表结构，不把当前状态存储称为明确 v4 schema。

## `global.json` 是遗留口径

代码位置：`src/progress.js`

现象：

- 注释和常量还提到 `.sillyspec/.runtime/global.json`。
- 实际 `readGlobal()` / `writeGlobal()` 已经走 SQL。

影响：

- 文档应写成“当前没有实际 global.json 生命周期”。

## workflow archive 固定 project 为 `sillyspec`

代码位置：`src/run.js`

现象：

- archive `extract-module-impact` post-check 调用 `runPostCheck(resolved, cwd, 'sillyspec')`。
- 不按当前项目注册表动态选择 project。

影响：

- 文档不能写成 archive impact workflow 对所有项目自动按 project 维度检查。

## platform approve / reject 尚未实现

代码位置：`src/sync.js`

现象：

- `sillyspec platform approve <change-name>` 和 `reject <change-name>` 有 CLI 分支。
- 当前实现只打印 “尚未实现” warning。

影响：

- 本地 `checkApproval()` 能读取并记录平台审批状态，但 CLI 端还不能主动向平台发起 approve/reject。
