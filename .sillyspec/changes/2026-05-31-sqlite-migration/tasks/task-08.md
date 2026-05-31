---
id: task-08
title: 改造 src/progress.js — 删除 _parseWithRecovery/_backup/_migrateIfNeeded
priority: P0
estimated_hours: 0.5
depends_on: [task-07]
blocks: [task-15]
allowed_paths:
  - src/progress.js
---

# task-08: 改造 src/progress.js — 删除 _parseWithRecovery/_backup/_migrateIfNeeded

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 删除代码 | 移除 3 个废弃方法及其所有调用点 |

## 实现要求

SQLite 不需要 JSON 修复、备份和旧版迁移。删除以下方法及所有调用点：

### 待删除方法

1. **`_parseWithRecovery(jsonString)`** — JSON 修复逻辑，SQLite 无需
2. **`_backup(cwd, data)`** — 备份 progress.json 文件，SQLite WAL 已有数据保护
3. **`_migrateIfNeeded(cwd)`** — 旧版 progress.json 迁移，不兼容旧数据

### 待清理的调用点

1. `readGlobal()` 中的 `this._migrateIfNeeded(cwd)` 调用 → 删除
2. `read()` 中的 `this._parseWithRecovery()` 调用 → 删除
3. `read()` 中的 backup 文件 fallback 逻辑 → 删除
4. `_write()` 中的 `this._backup(cwd, data)` 调用 → 删除
5. `setStage()` 中的 `this._backup(cwd, data)` 调用 → 删除
6. `addStep()` 中的 `this._backup(cwd, data)` 调用 → 删除
7. `updateStep()` 中的 `this._backup(cwd, data)` 调用 → 删除
8. `completeStage()` 中的 `this._backup(cwd, data)` 调用 → 删除
9. `validate()` 中的 `this._backup(cwd, fixed)` 调用 → 删除
10. `init()` 中的 `this._migrateIfNeeded(cwd)` 调用 → 删除
11. `index.js` 中 `pm._migrateIfNeeded(dir)` 调用 → 删除
12. `run.js` 中 `pm._migrateIfNeeded(cwd)` 调用 → 删除

### 待清理的常量和导入

- `BACKUP_SUFFIX = '.bak'` → 删除（如无其他引用）
- `CURRENT_VERSION = 3` → 保留（read() 返回值仍需使用）

## 接口定义（代码类必填）

无新增接口。纯删除任务。

## 边界处理（≥5条）

1. **`_parseWithRecovery` 在 read() 中的调用被删除后**：确认 read() 不再有 JSON.parse 逻辑
2. **`_backup` 在所有写入路径中的调用被删除**：确认 setStage/addStep/updateStep/completeStage/_write 中无 backup 调用
3. **`_migrateIfNeeded` 在 init/readGlobal/index.js/run.js 中的调用被删除**：全项目 grep 确认无残留
4. **BACKUP_SUFFIX 常量删除**：确认无其他地方引用此常量
5. **导入语句清理**：确认 progress.js 顶部的 `copyFileSync`, `unlinkSync` 如不再需要则移除
6. **index.js 和 run.js 的改动**：只删除 `_migrateIfNeeded` 调用，不改动其他逻辑

## 非目标

- 不修改 read/write 的 SQL 逻辑（task-07 已完成）
- 不删除 `.sillyspec/.runtime/progress.json.bak` 文件（留待用户手动清理）

## TDD 步骤

1. **验证**: 全项目 grep `_parseWithRecovery` 确认只有 progress.js 中有定义
2. **验证**: 全项目 grep `_backup` 确认所有调用点
3. **验证**: 全项目 grep `_migrateIfNeeded` 确认所有调用点
4. **执行**: 删除 3 个方法
5. **执行**: 删除所有调用点
6. **执行**: 清理无用导入和常量
7. **验证**: 全项目 grep 确认无残留引用
8. **验证**: `npm run lint`（如果有）无错误

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | `_parseWithRecovery` 方法已删除 | grep 确认 |
| 2 | `_backup` 方法已删除 | grep 确认 |
| 3 | `_migrateIfNeeded` 方法已删除 | grep 确认 |
| 4 | 3 个方法的所有调用点已清理 | grep 确认 |
| 5 | `BACKUP_SUFFIX` 常量已删除（或确认无引用） | grep 确认 |
| 6 | progress.js 无用 import 已清理 | 代码审查 |
| 7 | index.js 中 _migrateIfNeeded 调用已删除 | grep 确认 |
| 8 | run.js 中 _migrateIfNeeded 调用已删除 | grep 确认 |
