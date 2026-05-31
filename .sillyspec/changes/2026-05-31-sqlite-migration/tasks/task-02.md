---
id: task-02
title: 新增 src/db.js — SQLite 初始化、连接管理、事务包装、schema 创建
priority: P0
estimated_hours: 2
depends_on: [task-01]
blocks: [task-03, task-04, task-05, task-06, task-07]
allowed_paths:
  - src/db.js
---

# task-02: 新增 src/db.js — SQLite 初始化、连接管理、事务包装、schema 创建

## 目标

新增 `src/db.js`，封装 sql.js 初始化和连接管理，提供 DB 类供 ProgressManager 使用。

## 背景

当前 ProgressManager 基于 JSON 文件 I/O（global.json + per-change progress.json）。需要引入 SQLite 作为替代存储。db.js 是最底层的基础设施，被 progress.js 直接导入。

## 实现蓝图

### 新增文件

**`src/db.js`**

```javascript
import initSqlJs from 'sql.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export class DB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    // 1. 确保父目录存在
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // 2. 初始化 sql.js
    const SQL = await initSqlJs();

    // 3. 加载已有数据库或创建新库
    if (existsSync(this.dbPath)) {
      const buf = readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    // 4. 设置 PRAGMA
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA busy_timeout = 5000');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA synchronous = NORMAL');

    // 5. 创建表结构
    this._createSchema();

    // 6. 保存到磁盘
    this._save();
  }

  close() {
    if (this.db) {
      this._save();
      this.db.close();
      this.db = null;
    }
  }

  transaction(fn) {
    this.db.run('BEGIN');
    try {
      const result = fn(this.db);
      this.db.run('COMMIT');
      return result;
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }
  }

  /** 获取底层 db 对象（供 progress.js 直接使用） */
  getDb() {
    return this.db;
  }

  /** 将内存中的数据库持久化到磁盘 */
  _save() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.dbPath, buffer);
  }

  _createSchema() {
    // project 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL,
        schema_version INTEGER DEFAULT 4,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // changes 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        current_stage TEXT DEFAULT 'scan',
        status TEXT DEFAULT 'active',
        no_worktree INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL,
        platform_change_id INTEGER,
        platform_workspace_id INTEGER,
        platform_last_sync TEXT,
        platform_sync_enabled INTEGER DEFAULT 0
      )
    `);

    // stages 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        UNIQUE(change_id, stage)
      )
    `);

    // steps 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        output TEXT,
        completed_at TEXT,
        ordering INTEGER NOT NULL DEFAULT 0
      )
    `);

    // batch_progress 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS batch_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        total INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0,
        UNIQUE(change_id)
      )
    `);

    // approvals 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'not_required',
        requested_at TEXT,
        approved_by TEXT,
        approved_at TEXT,
        rejection_reason TEXT,
        UNIQUE(change_id)
      )
    `);

    // 索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_changes_current_stage ON changes(current_stage)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_stages_change ON stages(change_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_steps_stage ON steps(stage_id)');
  }
}
```

### 关键设计决策

1. **`init()` 是 async** — sql.js 的 WASM 加载是异步的，ProgressManager 构造时需 await db.init()
2. **`_save()` 主动持久化** — sql.js 是纯内存模式，每次写入后需显式 export 到文件（transaction 完成后由调用方决定何时 save，或在 transaction 中自动 save）
3. **`getDb()` 暴露底层 db** — progress.js 需要直接执行 SQL，避免在 DB 类上包装所有 CRUD
4. **`transaction(fn)` 回调接收 db 参数** — 让调用方在回调中自由执行多条 SQL
5. **构造函数不做异步操作** — 只保存 dbPath，实际初始化在 init() 中完成

### 数据库文件位置

默认路径：`.sillyspec/.runtime/sillyspec.db`

由 ProgressManager 在构造时确定具体路径并传入：
```javascript
// 在 progress.js 中
const dbPath = join(cwd, '.sillyspec/.runtime', 'sillyspec.db');
const db = new DB(dbPath);
await db.init();
```

### SQLite 配置

| PRAGMA | 值 | 说明 |
|--------|-----|------|
| journal_mode | WAL | 并发读取性能更好，CLI 场景下减少锁等待 |
| busy_timeout | 5000 | 锁等待 5 秒，防止瞬时冲突失败 |
| foreign_keys | ON | 启用外键约束，级联删除依赖数据 |
| synchronous | NORMAL | 性能与安全平衡，WAL 模式下推荐值 |

### 6 张表 Schema

| 表名 | 主键 | 关键字段 | 说明 |
|------|------|----------|------|
| project | id (DEFAULT 1) | name, schema_version | 单行表，项目全局状态 |
| changes | id (AUTO) | name (UNIQUE), current_stage, status | 变更定义，对应原来的 global.json.activeChanges |
| stages | id (AUTO) | change_id (FK), stage (UNIQUE per change) | 变更的阶段状态 |
| steps | id (AUTO) | stage_id (FK), name, status, ordering | 阶段内的步骤 |
| batch_progress | id (AUTO) | change_id (FK, UNIQUE) | 批量执行进度 |
| approvals | id (AUTO) | change_id (FK, UNIQUE) | 审批状态 |

### 索引

| 索引名 | 表.字段 | 用途 |
|--------|---------|------|
| idx_changes_current_stage | changes.current_stage | 按 stage 查询变更 |
| idx_changes_status | changes.status | 按 active/archived 筛选 |
| idx_stages_change | stages.change_id | 按变更查阶段 |
| idx_steps_stage | steps.stage_id | 按阶段查步骤 |

## 边界处理

| # | 场景 | 处理方式 |
|---|------|----------|
| 1 | dbPath 父目录不存在 | `mkdirSync(dir, { recursive: true })` 自动创建 |
| 2 | db 文件不存在（首次 init） | `new SQL.Database()` 创建空库，然后 _createSchema |
| 3 | db 文件已存在（再次 init） | `readFileSync` 读入 buffer → `new SQL.Database(buf)` 加载，`IF NOT EXISTS` 保证 schema 幂等 |
| 4 | transaction 中 SQL 抛错 | catch 后 `ROLLBACK`，re-throw 错误给调用方 |
| 5 | close() 被多次调用 | 检查 `this.db` 是否为 null，已 close 则跳过 |
| 6 | init() 前调用 getDb()/transaction() | getDb() 返回 null；transaction() 抛错 "DB not initialized" |
| 7 | sql.js WASM 加载失败（网络/路径问题） | initSqlJs() 抛错，不 catch，由调用方（ProgressManager）处理并降级提示 |

## 验收标准

| # | 标准 | 验证方式 |
|---|------|----------|
| 1 | `new DB(path)` 不抛错，不执行 I/O | 单元测试：构造后 db 属性为 null |
| 2 | `await db.init()` 首次调用创建 db 文件 + 6 张表 + 4 个索引 | 检查文件存在，`SELECT name FROM sqlite_master WHERE type='table'` 返回 6 行 |
| 3 | `await db.init()` 二次调用不报错，schema 幂等 | 再次 init 后表数不变，数据不丢 |
| 4 | `db.transaction(fn)` 正常提交时执行 fn 并返回结果 | 在 fn 中 INSERT，事务外 SELECT 能查到 |
| 5 | `db.transaction(fn)` fn 抛错时 ROLLBACK，数据不写入 | fn 中 INSERT 后 throw，事务外 SELECT 查不到 |
| 6 | `db.close()` 后 db 为 null，再次 close 不报错 | 连续两次 close() 不抛错 |
| 7 | PRAGMA 设置生效 | 查询 `PRAGMA journal_mode` 返回 "wal" |
| 8 | dbPath 为相对路径时正常工作 | 使用 `join(cwd, '.sillyspec/.runtime', 'sillyspec.db')` 测试 |
| 9 | 外键约束生效 | INSERT steps 引用不存在的 stage_id 应失败 |

## 完成后产出

- `src/db.js` — 约 120 行，导出 `DB` 类
- 后续 task-03 ~ task-07 的 progress.js 改造依赖此文件
