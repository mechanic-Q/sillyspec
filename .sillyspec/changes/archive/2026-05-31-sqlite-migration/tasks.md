# Tasks

author: qinyi
created_at: 2026-05-31 10:51:00

- [ ] task-01: 安装 sql.js 依赖，验证 WASM 加载
- [ ] task-02: 新增 src/db.js — SQLite 初始化、连接管理、事务包装、schema 创建
- [ ] task-03: 改造 src/progress.js — readGlobal/writeGlobal 改为 SQL
- [ ] task-04: 改造 src/progress.js — read/_write 改为 SQL（含 read() 返回值兼容性）
- [ ] task-05: 改造 src/progress.js — listChanges/registerChange/unregisterChange/initChange 改为 SQL
- [ ] task-06: 改造 src/progress.js — setStage/addStep/updateStep/completeStage 改为 SQL
- [ ] task-07: 改造 src/progress.js — _updateGateStatus 从 DB 查询生成 gate-status.json
- [ ] task-08: 改造 src/progress.js — 删除 _parseWithRecovery/_backup/_migrateIfNeeded
- [ ] task-09: 改造 src/init.js — init 时创建 SQLite 而非 global.json
- [ ] task-10: 改造 src/index.js — 新增 sillyspec platform 命令组解析
- [ ] task-11: 新增 src/sync.js — 平台同步模块（connect/disconnect/sync/syncDocuments/checkApproval/status）
- [ ] task-12: 改造 src/run.js — _write 后触发同步、execute 前检查审批
- [ ] task-13: 单元测试 — read() 返回结构与现有 JSON 一致性验证
- [ ] task-14: 集成测试 — sillyspec init + brainstorm → plan → execute → verify → archive 全流程
- [ ] task-15: 更新 docs/sillyspec/file-lifecycle.md 文档
