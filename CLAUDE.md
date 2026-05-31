# Claude Code 指引

## 文件生命周期文档同步
每次修改 `src/stages/` 下的阶段定义（prompt、步骤、输出文件名等）或 `src/run.js`、`src/progress.js` 等影响文件生命周期的代码后，**必须同步更新** `docs/sillyspec/file-lifecycle.md`，确保文档与代码一致。

### 触发更新的典型改动
- 新增/删除/重命名阶段步骤
- 修改步骤 prompt 中的输出文件名（如 verify-result.md）
- 修改阶段间的流转逻辑（如 archive 归档方式）
- 新增/删除运行时文件类型（如 gate-status.json）
- 修改 ProgressManager 的数据存储方式（如 SQLite 表结构变更）

### 更新检查清单
- [ ] 文件名引用一致（prompt 输出的文件名 == validateFileLocations 期望的文件名）
- [ ] 阶段步骤描述与 `src/stages/*.js` 一致
- [ ] 归档/清理流程描述与实际代码逻辑一致
- [ ] 数据库 Schema 描述与 `src/db.js` 一致
- [ ] 更新文档头部 `updated_at` 时间戳
