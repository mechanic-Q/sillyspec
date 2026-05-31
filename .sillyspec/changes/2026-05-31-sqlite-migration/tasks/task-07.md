---
id: task-07
title: 改造 src/progress.js — read/_write 改为 SQL，read() 返回值兼容性验证
priority: P0
estimated_hours: 4
depends_on: [task-02]
blocks: [task-08, task-11, task-13]
allowed_paths:
  - src/progress.js
  - src/db.js
---

# task-07: 改造 src/progress.js — read/_write 改为 SQL，read() 返回值兼容性验证

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/progress.js` | 改造 | `read()` 和 `_write()` 内部改为 SQL |

## 实现要求

这是核心改造任务。将 `read()` 和 `_write()` 从 JSON 文件读写改为 SQL 读写，同时确保 `read()` 返回的 JS 对象结构与现有 progress.json 完全一致。

### read(cwd, changeName) → object | null

**改造后逻辑：**
1. 如果 changeName 为 null，自动检测（从 changes 表查询唯一活跃变更）
2. `SELECT * FROM changes WHERE name = ?` 获取变更基本信息
3. `SELECT * FROM stages WHERE change_id = ?` 获取所有阶段
4. `SELECT * FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?) ORDER BY stage_id, ordering` 获取所有步骤
5. `SELECT * FROM batch_progress WHERE change_id = ?` 获取批量进度
6. 组装为兼容对象

**返回值结构（必须与现有 progress.json 一致）：**
```javascript
{
  _version: 3,                    // 固定值（向后兼容）
  project: 'project-name',
  currentChange: 'change-name',
  currentStage: 'execute',
  lastActive: '2026/5/31 10:00:00',
  stages: {
    scan: { status: 'pending', steps: [{ name: '...', status: 'pending', output: null, completedAt: null }], startedAt: null, completedAt: null },
    brainstorm: { status: 'completed', steps: [...], startedAt: '...', completedAt: '...' },
    // ... 所有 9 个阶段
  },
  batchProgress: { total: 10, completed: 5, failed: 0, skipped: 0 }
}
```

**关键兼容性要求：**
- `_version` 固定返回 3（不迁移到 4，外部代码依赖此值）
- stages 是对象（键为阶段名），不是数组
- steps 中每个元素有 `name`, `status`, `output`, `completedAt` 字段
- 时间格式使用 `zh-CN` locale（与改造前一致）
- 缺失阶段用 `emptyStage()` 填充
- 批量进度字段名：`total`, `completed`, `failed`, `skipped`

### _write(cwd, data, changeName) → void

**改造后逻辑：**
1. 从 data 对象解构出变更名、当前阶段、各阶段数据
2. 使用 `db.transaction()` 保证原子性
3. 更新 `changes` 表：`current_stage`, `last_active`
4. 对于每个 stage：
   - UPSERT `stages` 表（status, started_at, completed_at）
   - 对于每个 step：UPSERT `steps` 表（name, status, output, completed_at, ordering）
   - 删除 data 中存在但 steps 表中不存在的步骤
5. 更新/创建 `batch_progress` 表
6. 写完后调用 `_updateGateStatus(cwd)`

**注意：** `_write` 不再使用 JSON.stringify + 文件写入。

## 接口定义（代码类必填）

### read(cwd, changeName) → ProgressData | null
```typescript
interface StageData {
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  steps: StepData[];
  startedAt: string | null;
  completedAt: string | null;
}

interface StepData {
  name: string;
  status: string;
  output?: string | null;
  completedAt?: string | null;
}

interface ProgressData {
  _version: number;
  project: string;
  currentChange: string | null;
  currentStage: string;
  lastActive: string | null;
  stages: Record<string, StageData>;
  batchProgress?: { total: number; completed: number; failed: number; skipped: number };
}

read(cwd: string, changeName?: string): ProgressData | null
```

### _write(cwd, data, changeName) → void
```typescript
_write(cwd: string, data: ProgressData, changeName?: string): void
```

## 边界处理（≥5条）

1. **changeName 为 null 且无活跃变更**：read 返回 null（与改造前行为一致）
2. **changeName 为 null 且有多个活跃变更**：read 返回 null（与改造前行为一致）
3. **data 中 stages 缺少某个阶段**：read 时用 emptyStage() 填充，_write 时跳过缺失阶段
4. **steps 表有 DB 中的步骤但 data 中没有**：_write 时删除多余步骤（DELETE WHERE name NOT IN）
5. **data.currentChange 为 null**：_write 回退到旧逻辑（不写入 changes 表，打 warning）
6. **_version 字段**：read 固定返回 3，_write 忽略传入的 _version
7. **batchProgress 为 undefined**：read 返回对象不包含 batchProgress 字段（与改造前一致）

## 非目标

- 不修改外部调用方（run.js 等）
- 不修改 show/validate/reset 方法（它们通过 read() 获取数据，read() 兼容则它们无需改动）
- 不删除旧的文件读取代码（task-08 处理）

## TDD 步骤

1. **RED**: read 在有数据时返回完整 ProgressData 对象
2. **GREEN**: 实现 read SQL 查询 + 组装逻辑
3. **RED**: read 返回的 stages 结构与现有 JSON 一致（含所有 9 个阶段）
4. **GREEN**: 实现 emptyStage 填充
5. **RED**: read 返回的 steps 结构与现有 JSON 一致（含 ordering）
6. **GREEN**: 实现 steps 组装
7. **RED**: _write 写入后 read 读回数据一致
8. **GREEN**: 实现 _write 事务写入
9. **RED**: _write 后多余的 steps 被删除
10. **GREEN**: 实现清理逻辑
11. **RED**: _write 后 batch_progress 正确写入
12. **GREEN**: 实现 batch_progress UPSERT
13. **RED**: _version 固定返回 3
14. **GREEN**: 实现 _version 硬编码

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | read() 返回对象结构与现有 progress.json JSON.parse 结果一致 | task-13 详细验证 |
| 2 | read() 包含所有 9 个阶段（含 empty stages） | `Object.keys(result.stages).length === 9` |
| 3 | read() steps 数组按 ordering 排序 | 单元测试 |
| 4 | read() _version === 3 | 单元测试 |
| 5 | _write() 后 read() 读回数据一致（round-trip） | 单元测试 |
| 6 | _write() 事务失败时数据不损坏 | 单元测试（模拟失败） |
| 7 | _write() 后多余 steps 被清理 | SQL 查询验证 |
| 8 | batchProgress 正确读写 | 单元测试 |
| 9 | changeName 自动检测逻辑与改造前一致 | 单元测试 |
| 10 | _write 后调用 _updateGateStatus（gate-status 正确生成） | 文件断言 |
