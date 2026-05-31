---
id: task-04
title: 改造 src/progress.js — listChanges/registerChange/unregisterChange/initChange 改为 SQL
priority: P0
estimated_hours: 2
depends_on: [task-02]
blocks: []
allowed_paths:
  - src/progress.js
  - src/db.js
---

# task-04: 改造 src/progress.js — listChanges/registerChange/unregisterChange/initChange 改为 SQL

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 改造 | 4 个方法内部改为 SQL |

## 实现要求

将变更管理相关方法从文件系统操作改为 SQL 操作。

### listChanges(cwd) → string[]
- 改为 `SELECT name FROM changes WHERE status = 'active' ORDER BY name`
- 不再扫描文件系统目录

### registerChange(cwd, changeName) → void
- 改为 `INSERT OR IGNORE INTO changes (name, created_at, last_active) VALUES (?, datetime('now'), datetime('now'))`
- 确保 status 默认为 'active'
- 如果变更已存在（status='archived'），UPDATE status='active', last_active=datetime('now')

### unregisterChange(cwd, changeName) → void
- 改为 `UPDATE changes SET status = 'archived', last_active = datetime('now') WHERE name = ?`
- 不物理删除行，保留归档记录

### initChange(cwd, changeName) → object
- `INSERT INTO changes` 创建变更记录
- 批量 `INSERT INTO stages` 创建所有 9 个阶段（scan/brainstorm/propose/plan/execute/verify/archive/quick/explore）
- 调用 registerChange 确保变更在活跃列表
- 调用 `_write` 保存变更的完整 progress 数据
- 返回 `read(cwd, changeName)` 的结果

**注意：** initChange 需要在 changes 表和 stages 表中都创建记录，同时保持 read() 返回的 progress 对象格式。由于 read() 尚未改造（task-07），此处 initChange 内部的 _write 仍需写入兼容的数据。

## 接口定义（代码类必填）

### listChanges(cwd) → string[]
```typescript
listChanges(cwd: string): string[]
```

### registerChange(cwd, changeName) → void
```typescript
registerChange(cwd: string, changeName: string): void
```

### unregisterChange(cwd, changeName) → void
```typescript
unregisterChange(cwd: string, changeName: string): void
```

### initChange(cwd, changeName) → object | null
```typescript
initChange(cwd: string, changeName: string): ProgressData | null
```

## 边界处理（≥5条）

1. **changeName 为空字符串或 null**：registerChange/unregisterChange 打 warning 并 return，不崩溃
2. **registerChange 重复注册同名变更**：INSERT OR IGNORE 静默跳过，不报错
3. **unregisterChange 不存在的变更名**：UPDATE 影响行数为 0，静默跳过
4. **initChange 同名变更已存在**：跳过 INSERT，直接返回 read() 结果
5. **listChanges 无数据**：返回空数组 []
6. **数据库被其他进程锁**：依赖 db.js 的 busy_timeout 等待，超时后抛异常而非静默失败

## 非目标

- 不修改外部调用方
- 不处理 archive 子目录的文件系统迁移
- 不修改 _write 实现（task-07 负责）

## TDD 步骤

1. **RED**: listChanges 空 DB 返回 []
2. **GREEN**: 实现 SELECT 查询
3. **RED**: registerChange 后 listChanges 包含该变更名
4. **GREEN**: 实现 INSERT OR IGNORE
5. **RED**: registerChange 重复调用不报错
6. **GREEN**: 实现 INSERT OR IGNORE
7. **RED**: unregisterChange 后 listChanges 不包含该变更
8. **GREEN**: 实现 UPDATE status='archived'
9. **RED**: initChange 创建变更后 read() 返回完整 progress 对象
10. **GREEN**: 实现 initChange 逻辑
11. **RED**: initChange 已存在时返回已有数据不报错
12. **GREEN**: 实现 EXISTS 检查

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | listChanges 返回活跃变更名数组 | 单元测试 |
| 2 | registerChange 注册后立即可被 listChanges 发现 | 单元测试 |
| 3 | registerChange 重复注册同名变更不报错 | 单元测试 |
| 4 | unregisterChange 后变更不再出现在 listChanges 中 | 单元测试 |
| 5 | initChange 创建变更后返回完整 progress 对象（含所有阶段） | 单元测试 |
| 6 | initChange 重复创建同名变更返回已有数据 | 单元测试 |
| 7 | 空字符串/null changeName 不导致崩溃 | 单元测试 |
| 8 | unregisterChange 不存在的变更名静默跳过 | 单元测试 |
