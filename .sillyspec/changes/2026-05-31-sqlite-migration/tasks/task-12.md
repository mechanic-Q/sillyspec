---
id: task-12
title: 改造 src/run.js — _write 后触发同步、execute 前检查审批
priority: P1
estimated_hours: 2
depends_on: [task-11, task-07]
blocks: [task-14]
allowed_paths:
  - src/run.js
  - src/progress.js
---

# task-12: 改造 src/run.js — _write 后触发同步、execute 前检查审批

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/run.js` | 改造 | _write 后触发同步、execute 前检查审批 |

## 实现要求

在 run.js 的两个关键位置集成同步模块：

### 1. _write 后触发同步

在所有 `pm._write(cwd, progress, changeName)` 调用后，检查是否需要触发平台同步。

**实现方式：**
```javascript
// 在 _write 调用后
if (syncEnabled) {
  try {
    const { SyncManager } = await import('./sync.js');
    const sync = new SyncManager(cwd);
    await sync.sync(changeName);
  } catch (e) {
    console.warn('⚠️ 同步失败:', e.message);
  }
}
```

**触发条件：**
- `changes` 表中 `platform_sync_enabled = 1`
- 可通过读取 local.yaml 的 `platform` 配置判断是否已连接

**注意：** 同步是 best-effort，失败不阻塞主流程。

### 2. execute 阶段启动前检查审批

在 `runStage()` 中，当 stageName === 'execute' 时，先检查平台审批状态。

**实现位置：** `runStage()` 函数开头，在 `outputStep()` 之前

**逻辑：**
```javascript
if (stageName === 'execute') {
  try {
    const { SyncManager } = await import('./sync.js');
    const sync = new SyncManager(cwd);
    const approval = await sync.checkApproval(changeName);
    if (approval.status === 'rejected') {
      console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`);
      process.exit(1);
    }
    if (approval.status === 'pending') {
      console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`);
      console.log('  提示：使用 --skip-approval 跳过审批检查');
    }
  } catch (e) {
    // 同步模块不可用时静默跳过
  }
}
```

**--skip-approval 选项：**
新增 CLI 标志 `--skip-approval`，跳过审批检查（用于本地开发/测试）。

## 接口定义（代码类必填）

### 新增 CLI 选项
```
sillyspec run execute --skip-approval    跳过平台审批检查
```

### 同步触发位置
所有 `pm._write()` 调用后检查并触发同步，涉及以下位置：
- `runStage()` 中 `pm._write()`
- `completeStep()` 中 `pm._write()`（共 2 处）
- `resetStage()` 中 `pm._write()`
- `ensureStageSteps()` 后的 `pm._write()`
- `runAutoMode()` 中 `pm._write()`

## 边界处理（≥5条）

1. **sync.js 不存在（task-11 未完成）**：import 失败 catch 静默跳过，不影响 run 流程
2. **同步超时**：fetch 超时 10 秒，catch 打 warning
3. **checkApproval 返回 pending**：打印提示但不阻塞 execute
4. **checkApproval 返回 rejected**：exit(1) 阻止执行
5. **--skip-approval 标志**：跳过审批检查，不调用 sync
6. **同步触发频繁（auto 模式）**：每次 _write 都触发同步，需要考虑节流（首次实现不做节流，后续优化）

## 非目标

- 不修改 ProgressManager 内部逻辑
- 不修改 sync.js 的实现（task-11 负责）
- 不实现同步节流/防抖（首次实现不做）
- 不修改 auto 模式的核心流程

## TDD 步骤

1. **RED**: execute 阶段启动时调用 checkApproval
2. **GREEN**: 实现 checkApproval 集成
3. **RED**:审批 rejected 时 exit(1)
4. **GREEN**: 实现拒绝逻辑
5. **RED**: --skip-approval 跳过审批
6. **GREEN**: 实现标志解析
7. **RED**: _write 后触发同步
8. **GREEN**: 实现同步触发
9. **RED**: 同步失败不阻塞主流程
10. **GREEN**: 实现 try-catch

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | execute 阶段启动时检查审批（已连接时） | mock 测试 |
| 2 | 审批 rejected 时 exit(1) | mock 测试 |
| 3 | 审批 pending 时打印提示不阻塞 | mock 测试 |
| 4 | `--skip-approval` 跳过审批检查 | CLI 测试 |
| 5 | _write 后触发同步（已连接时） | mock 测试 |
| 6 | 同步失败时打 warning 不崩溃 | mock fetch 抛异常测试 |
| 7 | sync.js 不存在时静默跳过 | mock import 失败测试 |
| 8 | --help 包含 --skip-approval 说明 | CLI 测试 |
| 9 | auto 模式正常执行不受同步影响 | 集成测试 |
