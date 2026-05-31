# Design

author: qinyi
created_at: 2026-05-31 10:51:00

## 架构决策

### AD-01: 最小化 SQLite（方案 B）

只替代 progress.json 和 global.json，不迁移 artifacts/history/user-inputs。

理由：artifacts 是大文本文件不适合 SQL 存储；history 是归档快照文件系统更直观；user-inputs 是追加型日志文件 append 比 insert 无优势。全量入库改动面太大，回归风险高。

### AD-02: 使用 sql.js（WASM 版）

不使用 better-sqlite3（native binding）。

理由：sillyspec 是零 npm 依赖的纯 CLI，引入 native binding 会破坏安装体验（需要编译环境，Windows 容易出问题）。sql.js 纯 JS 包，`npm install sql.js` 即可，跨平台零障碍。性能差距（几毫秒级）对 CLI 场景完全可接受。

### AD-03: 原地改造 ProgressManager

不新建 ProgressManager2，在现有 progress.js 上改造。

理由：外部调用方（run.js、index.js、init.js）约 20+ 处调用，保持 API 签名不变可以最小化改动范围。run.js 调用的 `pm._write()` 是"伪私有"方法，需要提升为正式方法或保持现有调用方式。

### AD-04: 平台同步独立于 ProgressManager

sync.js 独立模块，不在 ProgressManager 内部触发。

理由：ProgressManager 应保持纯粹的本地状态管理。同步由 run.js 在状态变更后判断是否触发。

## 数据模型

### SQLite 文件位置

`.sillyspec/.runtime/sillyspec.db`（已被 `.sillyspec/.runtime/` gitignore 规则覆盖）

### Schema

```sql
CREATE TABLE project (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL,
    schema_version INTEGER DEFAULT 4,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    current_stage TEXT DEFAULT 'scan',
    status TEXT DEFAULT 'active',           -- active / archived
    no_worktree INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_active TEXT NOT NULL,
    platform_change_id INTEGER,             -- SillyHub 关联（预留）
    platform_workspace_id INTEGER,
    platform_last_sync TEXT,
    platform_sync_enabled INTEGER DEFAULT 0
);

CREATE TABLE stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT DEFAULT 'pending',           -- pending / in-progress / completed / failed
    started_at TEXT,
    completed_at TEXT,
    UNIQUE(change_id, stage)
);

CREATE TABLE steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',           -- pending / completed / skipped / failed
    output TEXT,
    completed_at TEXT,
    ordering INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE batch_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
    total INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    UNIQUE(change_id)
);

CREATE TABLE approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_required',     -- pending / approved / rejected / not_required
    requested_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    UNIQUE(change_id)
);

CREATE INDEX idx_changes_current_stage ON changes(current_stage);
CREATE INDEX idx_changes_status ON changes(status);
CREATE INDEX idx_stages_change ON stages(change_id);
CREATE INDEX idx_steps_stage ON steps(stage_id);
```

### SQLite 配置

```javascript
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA busy_timeout = 5000');
db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA synchronous = NORMAL');
```

## 模块设计

### db.js（新增）

封装 sql.js 初始化和连接管理。

```
class DB
  constructor(dbPath)
  init()                    — 创建表结构
  close()                   — 关闭连接
  transaction(fn)            — 事务包装
```

- db.js 被 progress.js 导入
- 每个 ProgressManager 实例持有一个 DB 实例
- 数据库文件不存在时自动创建

### progress.js（改造）

保持公开 API 不变，内部实现从文件 I/O 改为 SQL。

| 方法 | 改造方式 |
|------|---------|
| constructor() | 初始化 DB 连接 |
| readGlobal() | → SELECT FROM project |
| writeGlobal() | → UPDATE project |
| read() | → SELECT changes + stages + steps，组装为兼容对象 |
| _write() | → 事务写入 changes + stages + steps |
| listChanges() | → SELECT name FROM changes WHERE status='active' |
| registerChange() | → INSERT INTO changes |
| unregisterChange() | → DELETE FROM changes 或 UPDATE status='archived' |
| initChange() | → INSERT changes + 批量 INSERT stages |
| setStage() | → UPDATE changes.current_stage + UPDATE stages.status |
| addStep() | → INSERT INTO steps |
| updateStep() | → UPDATE steps |
| completeStage() | → UPDATE stages + 写 history 文件 |
| _updateGateStatus() | → 从 DB 查询，生成 gate-status.json |
| _parseWithRecovery() | → 删除 |
| _backup() | → 删除 |
| show() | 保持不变（从 read() 获取数据，格式化输出） |
| validate() | → 改为检查 SQLite 完整性 |

**read() 返回值兼容性：** 为了最小化外部改动，read() 仍然返回与当前 progress.json 结构一致的 JS 对象（含 stages 嵌套结构）。这样 run.js 等调用方无需改动。

### sync.js（新增）

独立模块，CLI 平台同步。

```
sync.connect(url, token)           — 连接平台
sync.disconnect()                  — 断开连接
sync.sync(changeName)               — 增量同步变更状态
sync.syncDocuments(changeName)      — 同步四件套文档
sync.checkApproval(changeName)      — 检查审批状态
sync.status()                       — 查看同步状态
```

### index.js（改造）

新增 `sillyspec platform` 命令组解析。

### run.js（改造）

- `_write()` 调用后检查是否需要同步（通过 sync.js）
- execute 阶段启动前检查审批（通过 sync.checkApproval）

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/db.js` | SQLite 初始化和连接管理 |
| 新增 | `src/sync.js` | 平台同步模块 |
| 改造 | `src/progress.js` | ProgressManager 内部从文件 I/O 改为 SQL |
| 改造 | `src/index.js` | 新增 `sillyspec platform` 命令 |
| 改造 | `src/run.js` | _write 后触发同步、execute 前检查审批 |
| 改造 | `src/init.js` | init 时创建 SQLite 而非 global.json |
| 删除 | `src/progress.js` 中的 _parseWithRecovery | SQLite 不需要 JSON 修复 |
| 删除 | `src/progress.js` 中的 _backup | SQLite WAL 已有数据保护 |
| 删除 | `src/progress.js` 中的 _migrateIfNeeded | 不做旧版迁移 |

## 兼容策略

- **不兼容旧版 progress.json** — 新版 CLI 不读取/迁移旧数据
- **外部 API 不变** — ProgressManager 的所有公开方法签名保持一致
- **run.js 的 `pm._write()` 调用** — 保持现有调用方式（_write 提升为正式写入方法）
- **gate-status.json** — hook 不改，从 SQLite 生成
- **artifacts/ / history/ / user-inputs.md** — 保持文件系统，逻辑不变

## 风险登记

| 风险 | 等级 | 缓解 |
|------|------|------|
| sql.js WASM 加载慢 | 低 | 首次加载约 1-2s，CLI 总运行时间远大于此 |
| read() 返回值兼容性 | 中 | 编写单元测试验证返回结构与现有 JSON 一致 |
| run.js 依赖 _write 内部行为 | 中 | _write 保持原子写入语义，测试覆盖 |
| 同步失败阻塞 CLI | 低 | best effort，失败打 warning 不阻塞 |

## 自审

- ✅ 所有表名/字段名与 spec-alignment.md 一致（去掉了 stage_history 和 user_inputs 表，保持文件系统）
- ✅ changes.status 字段明确为 active/archived（生命周期），与 stages.status（pending/completed 等，执行状态）语义不重叠
- ✅ archive 阶段行为明确：UPDATE changes.status='archived' + 物理移动目录 + 写 history 文件
- ✅ --skip-approval 权限验证明确：CLI 端不做权限校验，调用平台 API 由平台侧控制
- ✅ local.yaml 的 platform 配置扩展在 sync.js 中读取，不改动 local.yaml 的加载逻辑
- ⚠️ sillyspec archive --confirm 中的 --confirm 是 spec-alignment 误写，当前代码无此参数，本次不改
