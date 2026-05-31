---
id: task-13
title: 单元测试 — read() 返回结构与现有 JSON 一致性验证
priority: P0
estimated_hours: 2
depends_on: [task-07]
blocks: [task-14]
allowed_paths:
  - tests/
  - src/progress.js
---

# task-13: 单元测试 — read() 返回结构与现有 JSON 一致性验证

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `tests/progress-read-compat.test.js` | 新增 | read() 兼容性测试 |

## 实现要求

编写全面的单元测试，验证 `ProgressManager.read()` 返回的 JS 对象结构与现有 progress.json 的 JSON.parse 结果完全一致。

### 测试策略

1. **准备参考数据**：基于现有 `makeInitialProgress()` 函数生成参考 progress 对象
2. **SQL 写入**：通过 _write() 将参考数据写入 SQLite
3. **read 读回**：通过 read() 从 SQLite 读回数据
4. **结构比对**：逐字段比对读回数据与参考数据

### 测试用例清单

#### A. 顶层结构
1. 返回对象是 plain object（非 null）
2. `_version` 字段 === 3
3. `project` 字段 === 预期项目名
4. `currentChange` 字段 === 预期变更名
5. `currentStage` 字段 === 预期当前阶段
6. `lastActive` 字段格式正确（zh-CN locale）

#### B. stages 结构
7. stages 是 object，不是 array
8. stages 包含所有 9 个阶段：scan, brainstorm, propose, plan, execute, verify, archive, quick, explore
9. 每个阶段有 `status`, `steps`, `startedAt`, `completedAt` 字段
10. 阶段 status 默认为 'pending'

#### C. steps 结构
11. 添加步骤后 steps 数组正确反映
12. 步骤有 `name`, `status` 字段
13. 步骤 status 更新后正确反映
14. 步骤 `output` 和 `completedAt` 字段正确反映
15. steps 按 ordering 排序

#### D. 完整流程一致性
16. initChange → read 返回初始结构
17. setStage → read 返回正确的 currentStage
18. addStep → read 返回正确的 steps
19. updateStep → read 返回更新后的 step
20. completeStage → read 返回 completed 状态
21. updateBatchProgress → read 返回 batchProgress

#### E. 边界场景
22. read(null) 自动检测唯一变更
23. read(null) 多变更时返回 null
24. read(null) 无变更时返回 null
25. read 不存在的变更名返回 null

### 参考数据结构（从现有代码提取）

```javascript
// 现有 makeInitialProgress 生成的结构
{
  _version: 3,
  project: 'test-project',
  currentChange: 'test-change',
  currentStage: '',
  stages: {
    scan: { status: 'pending', steps: [], startedAt: null, completedAt: null },
    brainstorm: { status: 'pending', steps: [], startedAt: null, completedAt: null },
    // ... 9 个阶段
  },
  lastActive: null
}
```

### 测试框架

- 使用 Node.js 内置 `node:test` 模块（或项目现有测试框架）
- 测试文件位于 `tests/` 目录
- 每个测试使用独立的临时 DB 文件（`mkdtemp`）

## 接口定义（代码类必填）

无新增接口。纯测试任务。

### 测试辅助函数
```typescript
function createTestDB(cwd: string): ProgressManager  // 创建测试用 DB
function cleanupTestDB(cwd: string): void              // 清理测试 DB
function assertDeepEqual(actual: any, expected: any): void  // 深度比较
```

## 边界处理（≥5条）

1. **时间格式差异**：read() 返回的时间格式必须与 makeInitialProgress 一致（zh-CN locale），测试需精确比对格式
2. **字段顺序**：JSON.parse 保持插入顺序，read() 返回对象也需保持相同字段顺序（非严格要求，但 keySet 必须一致）
3. **undefined vs null**：确保不返回 undefined（JSON 中不存在此概念）
4. **空 steps 数组**：确保返回 `[]` 而非 null/undefined
5. **batchProgress 缺失**：无批量数据时，返回对象不包含 batchProgress 字段

## 非目标

- 不测试 sync.js 功能
- 不测试 CLI 命令行
- 不测试并发场景（首次测试不做）
- 不测试性能

## TDD 步骤

此任务本身就是测试，按以下顺序编写：

1. 编写测试辅助函数（createTestDB, cleanupTestDB）
2. 编写顶层结构测试（A 组）
3. 编写 stages 结构测试（B 组）
4. 编写 steps 结构测试（C 组）
5. 编写完整流程测试（D 组）
6. 编写边界场景测试（E 组）
7. 运行全部测试，确保通过
8. 修复发现的兼容性问题（如有）

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | 所有 25 个测试用例通过 | `npm test` |
| 2 | read() 返回的 keySet 与参考数据一致 | `assertDeepEqual(Object.keys(read), Object.keys(ref))` |
| 3 | stages 的 keySet 包含全部 9 个阶段 | `assert.deepStrictEqual(Object.keys(stages), VALID_STAGES)` |
| 4 | steps 按 ordering 排序 | 逐项断言 |
| 5 | _version 固定为 3 | `assert.strictEqual(data._version, 3)` |
| 6 | 无 undefined 字段 | `Object.values(data).every(v => v !== undefined)` |
| 7 | 测试文件独立可运行 | `node --test tests/progress-read-compat.test.js` |
| 8 | 测试不残留临时文件 | 测试后 cleanup |
