---
id: task-11
title: 新增 src/sync.js — 平台同步模块
priority: P1
estimated_hours: 3
depends_on: [task-07]
blocks: [task-12]
allowed_paths:
  - src/sync.js
  - src/progress.js
---

# task-11: 新增 src/sync.js — 平台同步模块

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/sync.js` | 新增 | 平台同步模块，独立于 ProgressManager |

## 实现要求

创建 `src/sync.js`，实现 SillyHub 平台同步功能。这是一个独立模块，由 run.js 和 index.js 调用。

### 模块结构

```javascript
// src/sync.js
class SyncManager {
  constructor(cwd) { ... }
  connect(url, token) { ... }
  disconnect() { ... }
  async sync(changeName) { ... }
  async syncDocuments(changeName) { ... }
  async checkApproval(changeName) { ... }
  status() { ... }
}

export { SyncManager }
export async function syncModule(args, cwd) { ... } // CLI 入口函数
```

### 核心方法说明

#### connect(url, token)
- 保存连接配置到 `.sillyspec/local.yaml`（读取现有 local.yaml，追加 platform 配置段）
- 验证连接：发送 ping 请求到 `{url}/api/health`
- 连接信息包含：url, token, lastConnected

#### disconnect()
- 从 local.yaml 删除 platform 配置段
- 打印 "已断开连接"

#### sync(changeName)
- 读取指定变更的 progress 数据（通过 ProgressManager.read()）
- 将 progress 状态同步到平台：POST `{url}/api/changes/{changeName}/progress`
- 同步步聚状态、阶段状态、批量进度
- 更新 changes 表的 `platform_last_sync` 字段

#### syncDocuments(changeName)
- 同步四件套文档：proposal.md, design.md, requirements.md, tasks.md
- POST `{url}/api/changes/{changeName}/documents`
- 文档内容读取自 `.sillyspec/changes/{changeName}/` 目录

#### checkApproval(changeName)
- GET `{url}/api/changes/{changeName}/approval`
- 返回审批状态：`{ status: 'pending'|'approved'|'rejected', reason?: string }`
- 更新 approvals 表

#### status()
- 读取 local.yaml 中的 platform 配置
- 展示连接状态、上次同步时间、各变更同步状态

### local.yaml 配置格式

```yaml
platform:
  url: https://sillyhub.example.com
  token: xxx
  last_connected: "2026-05-31T10:00:00Z"
```

### HTTP 通信

- 使用 Node.js 内置 `fetch`（Node 22+ 原生支持）
- 超时 10 秒
- 错误处理：网络失败打 warning，不阻塞主流程

## 接口定义（代码类必填）

### SyncManager
```typescript
class SyncManager {
  constructor(cwd: string)

  connect(url: string, token: string): Promise<void>
  disconnect(): void

  sync(changeName?: string): Promise<{ synced: number; errors: string[] }>
  syncDocuments(changeName?: string): Promise<{ synced: number; errors: string[] }>

  checkApproval(changeName: string): Promise<{ status: string; reason?: string }>
  status(): { connected: boolean; url?: string; lastSync?: string }
}
```

### syncModule(args, cwd) → CLI 入口函数
```typescript
export async function syncModule(args: string[], cwd: string): Promise<void>
```

## 边界处理（≥5条）

1. **local.yaml 不存在**：connect 时创建新文件，disconnect 时静默跳过
2. **local.yaml 已有 platform 配置**：connect 时覆盖
3. **网络请求失败（超时/DNS 错误）**：catch 异常，打印 warning，返回错误信息不 crash
4. **changeName 不存在**：sync/syncDocuments 打 warning 跳过该变更
5. **未连接时调用 sync**：打印 "未连接平台，请先 sillyspec platform connect"
6. **platform API 返回非 2xx**：打印错误信息，不重试
7. **checkApproval 返回 rejected**：打印拒绝原因，不自动阻止操作

## 非目标

- 不实现重试机制
- 不实现实时推送（纯请求-响应模式）
- 不实现文档差异对比（全量同步）
- 不修改 ProgressManager 内部逻辑

## TDD 步骤

1. **RED**: SyncManager 构造函数不报错
2. **GREEN**: 基本实现
3. **RED**: connect 写入 local.yaml
4. **GREEN**: 实现 connect
5. **RED**: disconnect 删除 platform 配置
6. **GREEN**: 实现 disconnect
7. **RED**: 未连接时 sync 返回错误
8. **GREEN**: 实现连接检查
9. **RED**: status 返回正确的连接信息
10. **GREEN**: 实现 status
11. **RED**: syncModule CLI 入口正确路由
12. **GREEN**: 实现 CLI 路由

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | `SyncManager` 可正常实例化 | 单元测试 |
| 2 | `connect(url, token)` 后 local.yaml 包含 platform 配置 | 文件内容断言 |
| 3 | `disconnect()` 后 local.yaml 无 platform 配置 | 文件内容断言 |
| 4 | 未连接时 `sync()` 返回错误信息 | 单元测试 |
| 5 | `status()` 正确反映连接状态 | 单元测试 |
| 6 | 网络请求失败时不 crash | mock fetch 失败测试 |
| 7 | `syncModule()` CLI 入口正确路由各子命令 | 单元测试 |
| 8 | local.yaml 格式正确（YAML 语法） | YAML.parse 验证 |
| 9 | 无网络时同步失败打 warning 不阻塞 | mock 测试 |
| 10 | changes 表 platform_last_sync 字段正确更新 | SQL 查询验证 |
