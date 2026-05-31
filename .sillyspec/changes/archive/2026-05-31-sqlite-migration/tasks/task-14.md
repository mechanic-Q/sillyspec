---
id: task-14
title: 集成测试 — init + brainstorm → plan → execute → verify → archive 全流程
priority: P0
estimated_hours: 3
depends_on: [task-09, task-12]
blocks: []
allowed_paths:
  - tests/
  - src/
---

# task-14: 集成测试 — init + brainstorm → plan → execute → verify → archive 全流程

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `tests/integration-full-flow.test.js` | 新增 | 全流程集成测试 |

## 实现要求

编写端到端集成测试，验证 SQLite 改造后的完整流程与改造前行为一致。

### 测试流程

```
1. 创建临时目录
2. sillyspec init
3. sillyspec run brainstorm --change test-integration
4. sillyspec run brainstorm --done --output "需求已澄清" --input "原始需求"
5. sillyspec run plan --change test-integration
6. sillyspec run plan --done --output "计划完成"（模拟全部步骤完成）
7. sillyspec run execute --change test-integration
8. sillyspec run execute --done --output "执行完成"（模拟全部步骤完成）
9. sillyspec run verify --change test-integration
10. sillyspec run verify --done --output "验证通过"
11. sillyspec run archive --change test-integration
12. 验证各阶段数据和文件
```

### 验证点

#### init 阶段
- [ ] `.sillyspec/.runtime/sillyspec.db` 存在
- [ ] `.sillyspec/.runtime/` 子目录存在（artifacts, history, logs, templates）
- [ ] `user-inputs.md` 存在
- [ ] `.gitignore` 包含 `.sillyspec/.runtime/`
- [ ] **不** 存在 `global.json`
- [ ] **不** 存在 `progress.json`（新版本无此文件）

#### brainstorm 阶段
- [ ] progress 数据可通过 read() 正确读取
- [ ] currentStage === 'brainstorm'
- [ ] stages.brainstorm.status === 'in-progress' 或 'completed'

#### plan 阶段
- [ ] currentStage === 'plan'
- [ ] steps 包含计划相关步骤

#### execute 阶段
- [ ] currentStage === 'execute'
- [ ] `gate-status.json` 存在且 stage === 'execute'
- [ ] steps 包含执行相关步骤

#### verify 阶段
- [ ] currentStage === 'verify'
- [ ] steps 完成后 stage status === 'completed'

#### archive 阶段
- [ ] 变更目录被移到 `archive/` 下
- [ ] history 目录有归档快照
- [ ] `gate-status.json` 被删除
- [ ] listChanges() 不再包含该变更

#### 全局验证
- [ ] 全流程无 crash、无未捕获异常
- [ ] `user-inputs.md` 有追加记录
- [ ] DB 文件完整性（可通过 SQLite 命令行验证）

### 测试实现方式

- 使用 `child_process.exec` 或 `execFile` 执行 CLI 命令
- 使用 `tmpdir()` 创建临时目录
- 测试结束后清理临时目录
- mock 同步模块（不依赖外部网络）

## 接口定义（代码类必填）

无新增接口。纯测试任务。

### 测试辅助
```typescript
async function runCLI(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }>
function createTempProject(): string  // 创建临时项目目录
function cleanupTempProject(dir: string): void  // 清理
```

## 边界处理（≥5条）

1. **brainstorm 自动创建变更**：未指定 --change 时自动创建日期前缀变更名
2. **execute 步骤未实际执行**：只验证 --done 能正确推进，不验证 AI 执行
3. **gate-status.json 生命周期**：execute 前不存在，execute 中存在，archive 后删除
4. **archive 后 listChanges 不含已归档变更**：确认 unregisterChange 正常工作
5. **重复运行全流程**：init 后重复运行不报错
6. **CLI 输出中的中文**：不验证 console.log 内容（易变），只验证状态数据

## 非目标

- 不测试 AI 步骤的实际执行（prompt 输出）
- 不测试 sync.js 的网络通信
- 不测试性能
- 不测试并发场景

## TDD 步骤

此任务本身就是测试，按以下顺序编写：

1. 创建测试辅助函数（runCLI, createTempProject, cleanup）
2. 编写 init 阶段测试
3. 编写 brainstorm 阶段测试
4. 编写 plan 阶段测试
5. 编写 execute 阶段测试（含 gate-status）
6. 编写 verify 阶段测试
7. 编写 archive 阶段测试
8. 编写全流程串行测试
9. 运行并修复

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | init 后 DB 文件存在且无 global.json/progress.json | 文件断言 |
| 2 | 全流程 CLI 命令执行无 exit code != 0 | 进程退出码断言 |
| 3 | read() 在每个阶段返回正确数据 | DB 查询验证 |
| 4 | gate-status.json 在 execute 阶段存在 | 文件存在断言 |
| 5 | gate-status.json 在 archive 后不存在 | 文件不存在断言 |
| 6 | archive 后变更目录在 archive/ 下 | 目录存在断言 |
| 7 | archive 后 listChanges 不含已归档变更 | 数据断言 |
| 8 | user-inputs.md 有追加记录 | 文件内容断言 |
| 9 | DB 完整性验证通过 | SQLite integrity_check |
| 10 | 测试可重复运行（cleanup 后再次运行通过） | 重复运行验证 |
