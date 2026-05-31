# Proposal

author: qinyi
created_at: 2026-05-31 10:51:00

## 动机

SillySpec CLI 当前的状态管理基于 JSON 文件（global.json + changes/*/progress.json），随着功能增长暴露出以下问题：

1. **多 change 并行查询低效** — 需要遍历目录才能知道有哪些活跃变更
2. **JSON 损坏风险** — 依赖正则修复 + .bak 备份兜底，数据保护薄弱
3. **history/artifacts 散落** — 状态和产出物混在文件系统中，查询不灵活

## 关键问题

为什么现有 JSON 方案不够？

- **progress.json 是嵌套 3 层的 JSON**（stages → steps → output），任意一层写入失败都会损坏整个文件
- **`_parseWithRecovery` 有 4 层 fallback**（直接解析 → 去尾逗号 → 单引号替换 → 截断修复），说明 JSON 损坏是真实存在的常见问题
- **`listChanges` 靠文件系统扫描**，每次调用都要 `readdirSync` + `existsSync`，多变更时效率低
- **备份机制靠 rename 原子性**，但 progress.json 和 global.json 之间没有事务保证

## 变更范围

- 引入 sql.js（SQLite WASM 版），替代 global.json 和 changes/*/progress.json
- 原地改造 ProgressManager，公开 API 不变
- 新增 `src/db.js`（SQLite 初始化和连接管理）
- 新增 `src/sync.js`（SillyHub 平台同步，best effort）
- gate-status.json 从 SQLite 生成（物化视图，hook 不改）
- 新增 `sillyspec platform` CLI 命令组（connect/disconnect/sync/status）

## 不在范围内

- 旧版 progress.json 迁移（不做向后兼容迁移）
- artifacts/history/user-inputs 文件迁移到 SQLite（保持文件系统）
- SillyHub 平台侧改造（本次只做 CLI 侧）
- 审批门禁的平台实现（CLI 只预留 approvals 表和检查入口）
- Dashboard 改造（dashboard 独立迭代）
- sql.js 的 native addon 替代方案（统一用 WASM 版）

## 成功标准

- `sillyspec init` 创建 SQLite 数据库而非 global.json
- `sillyspec progress show` 从 SQLite 读取，输出格式不变
- `sillyspec run` 全流程（brainstorm → plan → execute → verify → archive）正常工作
- gate-status.json 在 execute 阶段自动生成、非 execute 阶段自动删除
- 无 global.json 和 progress.json 文件残留（新项目）
- `sillyspec platform connect/sync/status` 命令可用
- npm install 无需编译环境（纯 JS 包）
