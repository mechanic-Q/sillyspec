---
id: task-03
title: 改造 src/progress.js — readGlobal/writeGlobal 改为 SQL
priority: P0
estimated_hours: 1
depends_on: [task-02]
blocks: [task-09]
allowed_paths:
  - src/progress.js
  - src/db.js
---

# task-03: 改造 src/progress.js — readGlobal/writeGlobal 改为 SQL

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 改造 | `readGlobal()`/`writeGlobal()` 内部改为 SQL |
| `src/db.js` | 只读依赖 | 使用 task-02 创建的 DB 封装层 |

## 实现要求

将 `ProgressManager.readGlobal()` 和 `ProgressManager.writeGlobal()` 的内部实现从 JSON 文件 I/O 改为 SQLite 读写。

**核心改造点：**

1. `constructor()` 或首次访问时初始化 DB 实例（通过 `db.js`）
2. `readGlobal()` → `SELECT * FROM project WHERE id = 1`
3. `writeGlobal()` → `UPDATE project SET ... WHERE id = 1`
4. 返回值格式保持不变：`{ _version, project, activeChanges }`
5. `activeChanges` 需要从 `changes` 表中 `SELECT name FROM changes WHERE status = 'active'` 动态查询组装

**readGlobal 返回值兼容：**
```javascript
{
  _version: 4,
  project: 'project-name',
  activeChanges: ['change-a', 'change-b']
}
```

## 接口定义（代码类必填）

### readGlobal(cwd) → object | null

```typescript
readGlobal(cwd: string): { _version: number; project: string; activeChanges: string[] } | null
```

- 读取 `project` 表 id=1 的行
- 从 `changes` 表动态查询 activeChanges 列表
- project 表不存在时返回 null（兼容新项目首次 init 前的场景）

### writeGlobal(cwd, data) → void

```typescript
writeGlobal(cwd: string, data: { project: string; activeChanges?: string[] }): void
```

- 更新 `project` 表 id=1 的 `project` 和 `updated_at` 字段
- **注意：** activeChanges 不再由 writeGlobal 写入 project 表，改为从 changes 表动态查询
- 调用方传入 activeChanges 时忽略该字段（不报错，保持向后兼容）

## 边界处理（≥5条）

1. **project 表不存在**：readGlobal 返回 null，不抛异常（兼容 init 前场景）
2. **data.project 为空字符串**：writeGlobal 正常写入空字符串，不替换为 basename
3. **data 为 null**：writeGlobal 打 warning 并 return，不崩溃
4. **data.activeChanges 字段存在但类型不是数组**：忽略该字段，不写入 changes 表
5. **DB 连接未初始化**：首次调用时自动初始化 DB，不要求提前初始化
6. **并发写入**：SQLite WAL + busy_timeout 已在 db.js 配置，writeGlobal 依赖事务保证原子性

## 非目标

- 不改动 readGlobal/writeGlobal 的外部调用方签名
- 不处理旧版 global.json 的读取（task-09 处理 init 流程）
- 不删除 _migrateIfNeeded（task-08 处理）

## TDD 步骤

1. **RED**: 编写测试 — readGlobal 在 DB 无数据时返回 null
2. **GREEN**: 实现 — readGlobal 查询 project 表
3. **RED**: 编写测试 — writeGlobal 写入后 readGlobal 可读回
4. **GREEN**: 实现 — writeGlobal UPDATE project 表
5. **RED**: 编写测试 — activeChanges 从 changes 表动态查询
6. **GREEN**: 实现 — readGlobal 内联查询 changes 表
7. **RED**: 编写测试 — data.activeChanges 传入数组时被忽略
8. **GREEN**: 实现 — writeGlobal 忽略 activeChanges 字段

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | readGlobal 返回 `{ _version, project, activeChanges }` 结构 | 单元测试断言 |
| 2 | readGlobal 在空 DB 返回 null | 单元测试 |
| 3 | writeGlobal 写入后 readGlobal 读回数据一致 | 单元测试 |
| 4 | activeChanges 从 changes 表动态生成（注册变更后立即可见） | 单元测试 |
| 5 | writeGlobal 传入 activeChanges 字段不报错、不影响 changes 表 | 单元测试 |
| 6 | data 为 null 时 writeGlobal 打 warning 不崩溃 | 单元测试 |
| 7 | 返回值 _version 为整数（从 schema_version 读取） | 单元测试 |
