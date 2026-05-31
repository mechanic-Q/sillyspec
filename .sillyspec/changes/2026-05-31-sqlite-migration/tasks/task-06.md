---
id: task-06
title: 改造 src/progress.js — _updateGateStatus 从 DB 查询生成 gate-status.json
priority: P0
estimated_hours: 1
depends_on: [task-02]
blocks: []
allowed_paths:
  - src/progress.js
  - src/db.js
---

# task-06: 改造 src/progress.js — _updateGateStatus 从 DB 查询生成 gate-status.json

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 改造 | `_updateGateStatus()` 内部查询改为 SQL |

## 实现要求

将 `_updateGateStatus()` 的变更扫描逻辑从 `listChanges()` + `read()` 改为直接 SQL 查询。

**改造前逻辑：**
1. `listChanges()` 获取所有活跃变更名
2. 逐个 `read()` 获取 currentStage
3. 判断是否有 execute/quick 阶段
4. 写入/删除 `gate-status.json`

**改造后逻辑：**
1. SQL 查询：`SELECT name, current_stage, no_worktree FROM changes WHERE status = 'active' AND current_stage IN ('execute', 'quick')`
2. 优先取 execute，其次 quick（与改造前逻辑一致）
3. noWorktree 从 changes 表的 `no_worktree` 字段读取（design.md 中 changes 表已有此字段）
4. 生成 gate-status.json 文件（保持文件系统输出不变，hook 需要读这个文件）

**注意：** changes 表需要读取 `current_stage` 和 `no_worktree` 字段。`current_stage` 在 design schema 中已有。`no_worktree` 也在 schema 中（`no_worktree INTEGER DEFAULT 0`）。

## 接口定义（代码类必填）

### _updateGateStatus(cwd) → void
```typescript
_updateGateStatus(cwd: string): void
```

- 从 DB 批量查询所有处于 execute/quick 阶段的活跃变更
- 生成/删除 gate-status.json（文件路径不变：`.sillyspec/.runtime/gate-status.json`）
- 保持原子写入（先写 .tmp 再 rename）

**gate-status.json 格式（不变）：**
```json
{
  "stage": "execute",
  "changes": ["change-a", "change-b"],
  "updatedAt": "2026-05-31T10:00:00.000Z",
  "noWorktree": true
}
```

## 边界处理（≥5条）

1. **无活跃变更**：删除 gate-status.json（如果存在），不创建空文件
2. **有活跃变更但无 execute/quick 阶段**：删除 gate-status.json
3. **execute 和 quick 同时存在**：优先取 execute（gateStage 优先级）
4. **changes 表 current_stage 为 NULL**：忽略该变更，不参与判断
5. **文件系统写入失败**：try-catch 打 warning，不阻塞主流程
6. **SQL 查询返回空结果集**：等同于"无 execute/quick 阶段"，删除文件

## 非目标

- 不修改 gate-status.json 的输出格式
- 不修改读取 gate-status.json 的 hook 代码
- 不修改 noWorktree 的设置逻辑（设置方保持不变）

## TDD 步骤

1. **RED**: 无活跃变更时 gate-status.json 不存在
2. **GREEN**: 实现删除逻辑
3. **RED**: 变更处于 execute 阶段时生成 gate-status.json，stage = 'execute'
4. **GREEN**: 实现 SQL 查询 + 文件写入
5. **RED**: execute 和 quick 同时存在时，stage 优先取 execute
6. **GREEN**: 实现优先级逻辑
7. **RED**: noWorktree 字段正确写入 gate-status.json
8. **GREEN**: 从 changes 表读取 no_worktree

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | 无 execute/quick 阶段时 gate-status.json 不存在 | 文件不存在断言 |
| 2 | execute 阶段时生成文件且 stage = 'execute' | 文件内容断言 |
| 3 | quick 阶段时生成文件且 stage = 'quick' | 文件内容断言 |
| 4 | execute + quick 同时存在时 stage = 'execute' | 文件内容断言 |
| 5 | changes 数组包含所有处于 execute/quick 的变更名 | 文件内容断言 |
| 6 | updatedAt 为 ISO 8601 格式 | 正则断言 |
| 7 | noWorktree = true 时文件包含该字段 | 文件内容断言 |
| 8 | noWorktree = false 时文件不包含 noWorktree 字段 | 文件内容断言 |
