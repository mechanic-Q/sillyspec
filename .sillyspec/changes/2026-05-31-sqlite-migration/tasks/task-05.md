---
id: task-05
title: 改造 src/progress.js — setStage/addStep/updateStep/completeStage 改为 SQL
priority: P0
estimated_hours: 3
depends_on: [task-02]
blocks: []
allowed_paths:
  - src/progress.js
  - src/db.js
---

# task-05: 改造 src/progress.js — setStage/addStep/updateStep/completeStage 改为 SQL

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 改造 | 4 个方法内部改为 SQL |

## 实现要求

将阶段/步骤的 CRUD 操作从文件 I/O 改为 SQL。

### setStage(cwd, stage, changeName) → void
- `UPDATE changes SET current_stage = ? WHERE name = ?`
- `UPDATE stages SET status = 'in-progress', started_at = datetime('now') WHERE change_id = (SELECT id FROM changes WHERE name = ?) AND stage = ? AND status = 'pending'`
- `UPDATE changes SET last_active = datetime('now') WHERE name = ?`
- 阶段行不存在时先 INSERT

### addStep(cwd, stage, stepName, changeName) → void
- 查找 stage_id：`SELECT s.id FROM stages s JOIN changes c ON s.change_id = c.id WHERE c.name = ? AND s.stage = ?`
- `INSERT INTO steps (stage_id, name, ordering) VALUES (?, ?, (SELECT COALESCE(MAX(ordering), 0) + 1 FROM steps WHERE stage_id = ?))`
- 重复步骤名检查：先 SELECT 查询 steps 表

### updateStep(cwd, stage, stepName, options, changeName) → void
- 查找 step_id：通过 changes → stages → steps JOIN 查询
- `UPDATE steps SET status = ?, output = ?, completed_at = datetime('now') WHERE id = ? AND name = ?`
- 步骤不存在时打印错误并 return
- 自动完成检测：同 stage_id 下所有 steps status = 'completed' 时，UPDATE stages SET status = 'completed'

### completeStage(cwd, stage, changeName) → void
- `UPDATE stages SET status = 'completed', completed_at = datetime('now') WHERE change_id = (SELECT id FROM changes WHERE name = ?) AND stage = ?`
- 将该阶段所有 pending 步骤标记为 completed
- 写 history 文件（保持文件系统，不变）
- `UPDATE changes SET last_active = datetime('now') WHERE name = ?`

**所有方法仍需通过 _write() 持久化 read() 返回值所需的完整对象**（因为 read() 尚未改造，见 task-07）。

## 接口定义（代码类必填）

### setStage(cwd, stage, changeName)
```typescript
setStage(cwd: string, stage: string, changeName?: string): void
```

### addStep(cwd, stage, stepName, changeName)
```typescript
addStep(cwd: string, stage: string, stepName: string, changeName?: string): void
```

### updateStep(cwd, stage, stepName, options, changeName)
```typescript
updateStep(cwd: string, stage: string, stepName: string, options: { status?: string; output?: string }, changeName?: string): void
```

### completeStage(cwd, stage, changeName)
```typescript
completeStage(cwd: string, stage: string, changeName?: string): void
```

## 边界处理（≥5条）

1. **setStage 传入无效阶段名**：保持现有行为，打印错误并 return
2. **addStep 步骤名已存在**：保持现有行为，打印 "已存在" 并 return
3. **addStep stepName 为空**：保持现有行为，打印错误并 return
4. **updateStep 步骤不存在**：保持现有行为，打印错误并 return
5. **updateStep status 传入无效值**：保持现有行为，打印错误并 return
6. **completeStage 阶段不存在**：先自动创建 stages 行，再标记 completed
7. **steps 表 ordering 字段冲突**：使用 COALESCE(MAX(ordering), 0) + 1 避免冲突

## 非目标

- 不修改 _write 实现（task-07）
- 不修改 show/validate/reset 方法（本次不涉及）
- 不修改 history 文件写入逻辑

## TDD 步骤

1. **RED**: setStage 设置后可通过 SQL 查询确认 stages 行 status = 'in-progress'
2. **GREEN**: 实现 setStage SQL 逻辑
3. **RED**: addStep 添加后 steps 表有对应行
4. **GREEN**: 实现 addStep SQL
5. **RED**: addStep 重复步骤名不报错
6. **GREEN**: 实现重复检查
7. **RED**: updateStep 更新 status 和 output
8. **GREEN**: 实现 updateStep SQL
9. **RED**: updateStep 自动完成检测：所有步骤 completed 时 stage 也 completed
10. **GREEN**: 实现自动完成逻辑
11. **RED**: completeStage 标记完成并写 history 文件
12. **GREEN**: 实现 completeStage

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | setStage 设置后 changes.current_stage 更新 | SQL 查询验证 |
| 2 | setStage 首次设置时 stages.status 从 pending 变为 in-progress | SQL 查询验证 |
| 3 | addStep 添加后 steps 表有对应行且 ordering 递增 | SQL 查询验证 |
| 4 | addStep 重复步骤名静默跳过 | 日志断言 |
| 5 | updateStep 更新后 steps.status 和 steps.output 正确 | SQL 查询验证 |
| 6 | updateStep 所有步骤 completed 时 stage 自动 completed | 单元测试 |
| 7 | completeStage 标记完成且 pending 步骤也标记 completed | SQL 查询验证 |
| 8 | completeStage 写入 history 文件（文件系统） | 文件存在断言 |
| 9 | 无效阶段名/空步骤名保持现有错误处理 | 单元测试 |
| 10 | 所有方法的 console.log 输出与改造前一致 | 快照测试 |
