---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: server-executor
---

# server-executor

## 定位

CLI 命令执行层。在 Server 端通过 `child_process.spawn` 调用 `npx sillyspec` 子进程，为 Dashboard 的 WebSocket API 提供命令执行能力。是前后端交互的底层桥梁。

## 契约摘要

### `executeCommand(projectPath, command, onOutput, onComplete) → killFn`

- **入参**
  - `projectPath: string` — 项目目录绝对路径
  - `command: string` — CLI 命令字符串（如 `'progress status --json'`）
  - `onOutput({ type, data })` — stdout/stderr/error 实时回调
  - `onComplete({ code, signal })` — 进程退出回调
- **返回** `() => void` — 调用 `proc.kill('SIGTERM')` 终止进程

### `executeNextStep(projectPath, onOutput, onComplete) → killFn`

委托 `executeCommand(projectPath, 'next', ...)` 执行下一步。

### `executeProgressStatus(projectPath, onOutput, onComplete) → killFn`

委托 `executeCommand(projectPath, 'progress status --json', ...)` 获取进度状态。

### `executeReset(projectPath, stage, onOutput, onComplete) → killFn`

委托 `executeCommand(projectPath, 'progress reset --stage ${stage}', ...)` 重置指定阶段。

## 关键逻辑

1. 命令字符串按空白符 split 为参数数组，前缀 `npx sillyspec`
2. 子进程 cwd 设为 `projectPath`，继承父进程 env
3. stdout / stderr 分别回调 `onOutput`，携带 `type: 'stdout' | 'stderr'`
4. 进程 `error` 事件同时触发 onOutput（`type: 'error'`）和 onComplete（`code: -1`）
5. 所有包装函数（nextStep / progressStatus / reset）都是 `executeCommand` 的单行委托

## 注意事项

- `executeReset` 的 stage 参数直接拼入命令字符串，未做转义，如果 stage 名含空格可能出问题
- 返回的 kill 函数固定用 `SIGTERM`，无超时强杀兜底
- `onComplete` 中 `signal` 始终为 `null`（close 事件不传 signal，error 事件中传了 `err.signal` 但 err.signal 可能是 undefined）

## 人工备注

- 目前只有 4 个导出函数，职责清晰，无需拆分
- 如需增加命令（如 `sillyspec doctor`），按相同模式添加委托即可
