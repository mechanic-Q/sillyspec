---
schema_version: 1
doc_type: module-card
module_id: runtime
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
---
# runtime

## 定位

SQLite 数据库层 + 进度管理 + 迁移。提供 `.sillyspec/.runtime/sillyspec.db` 作为权威状态源，管理项目、变更（change）、阶段（stage）、步骤（step）的全生命周期。不负责 CLI 解析、命令分发或阶段执行逻辑。

## 契约摘要

- **DB** (`src/db.js`) — 基于 sql.js 的内存 SQLite 封装，提供 `init()` / `transaction()` / `query()` / `getDb()` / `_save()`，自动 WAL 模式 + PRAGMA 管理，每次写操作后序列化到磁盘
- **ProgressManager** (`src/progress.js`) — 进度读写入口，通过 DB 实例操作 `project / changes / stages / steps / batch_progress / approvals` 六张表；支持 `read()` / `init()` / `initChange()` / `show()` / `validate()` / `reset()` 等方法
- **migrateDocs** (`src/migrate.js`) — 一次性迁移工具，将旧结构（`codebase/`、`specs/`、`changes/archive/`）迁移到统一的 `docs/<project>/` 布局（`scan/`、`archive/` 等）

## 关键逻辑

```
DB.init()
  → 检查 .db 文件存在 → 加载到 sql.js 内存 / 否则创建新库
  → _createSchema(): CREATE TABLE IF NOT EXISTS (project, changes, stages, steps, batch_progress, approvals)
  → 设置 PRAGMA (WAL, busy_timeout=5000, foreign_keys=ON, synchronous=NORMAL)

DB.transaction(fn)
  → BEGIN → fn(db) → COMMIT / ROLLBACK → _save()
  → _save(): db.export() → Buffer → writeFileSync → 重新设置 PRAGMA（export 会重置）

ProgressManager.read(cwd, changeName?)
  → 从 SQLite 加载指定变更的 stages + steps 状态
  → 合并 global.json 缓存的 activeChanges 列表
```

## 注意事项

- sql.js 是纯内存数据库，每次 `_save()` 都全量序列化；高频写入场景需注意性能
- `_save()` 后必须重新执行 `PRAGMA journal_mode = WAL`（sql.js export 会重置状态）
- `batch_progress` 和 `approvals` 表按 `change_id` UNIQUE，每个变更只能有一条记录
- 历史迁移：v1/v2 使用 `progress.json` 文件，v3 全部迁移至 SQLite（`CURRENT_VERSION = 3`）
- `migrateDocs` 是一次性脚本，不会幂等运行；已存在的文件会被跳过

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
