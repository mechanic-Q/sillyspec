---
id: task-15
title: 更新 docs/sillyspec/file-lifecycle.md 文档
priority: P2
estimated_hours: 1
depends_on: [task-08]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
---

# task-15: 更新 docs/sillyspec/file-lifecycle.md 文档

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `docs/sillyspec/file-lifecycle.md` | 更新 | 反映 SQLite 迁移后的文件结构变化 |

## 实现要求

更新 file-lifecycle.md 文档，反映以下变化：

### 需要修改的章节

#### 1. 目录结构总览
- `.sillyspec/.runtime/` 下：
  - **新增** `sillyspec.db` — SQLite 数据库文件（替代 global.json + progress.json）
  - **删除** `global.json` — 不再使用
  - **保留** `gate-status.json` — 仍由 _updateGateStatus 生成
  - **删除** `progress.json.bak` — 不再需要
- `.sillyspec/changes/<change-name>/` 下：
  - **删除** `progress.json` — 不再使用（数据在 SQLite 中）

#### 2. 全局状态文件章节
- 将 `global.json` 的描述改为 `sillyspec.db` 的描述
- 更新创建时机：`sillyspec init` 时由 DB.init() 创建
- 更新写入方：ProgressManager 各方法通过 SQL 写入
- 更新读取方：ProgressManager 各方法通过 SQL 读取
- 新增 schema 说明（引用 design.md 中的表定义）

#### 3. 变更级状态章节
- 将 `progress.json` 的描述改为 SQLite `changes/stages/steps` 表的描述
- 更新数据模型说明
- 保留 artifacts/history/user-inputs.md 的描述（不变）

#### 4. 补充说明
- 新增"数据存储迁移"章节，说明：
  - 旧版使用 JSON 文件（global.json + progress.json）
  - 新版使用 SQLite（sillyspec.db）
  - 不兼容旧版数据（不迁移）
  - artifacts/history/user-inputs.md 保持文件系统不变

### 文件头部元数据

```markdown
---
author: <git 用户名>
created_at: 2026-05-31 11:00:00
updated_at: 2026-05-31 11:00:00
---
```

## 接口定义（代码类必填）

无新增接口。纯文档任务。

## 边界处理（≥5条）

1. **目录树中的文件列表**：确保新增 sillyspec.db、删除 global.json 和 progress.json
2. **描述中的路径**：确保所有路径引用正确（.sillyspec/.runtime/sillyspec.db）
3. **创建时机描述**：确保与实际代码行为一致（DB.init 在 init 时调用）
4. **向后兼容说明**：明确标注"不兼容旧版 global.json/progress.json"
5. **artifacts/history/user-inputs.md**：确保这些文件的描述未被误删
6. **版本号**：文档头部更新为当前版本

## 非目标

- 不修改其他文档（如 ARCHITECTURE.md, CONVENTIONS.md）
- 不添加新章节（只更新现有内容 + 新增数据存储迁移章节）
- 不修改 CLI 帮助文本

## TDD 步骤

纯文档任务，无 TDD。按以下步骤执行：

1. 阅读现有 file-lifecycle.md 完整内容
2. 列出所有需要修改的位置
3. 逐处修改
4. 审查修改后的文档一致性
5. 确认目录树与实际文件结构匹配

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | 目录结构总览包含 `sillyspec.db` | 文档审查 |
| 2 | 目录结构总览不包含 `global.json` 和 `progress.json` | 文档审查 |
| 3 | 全局状态文件章节描述 sillyspec.db | 文档审查 |
| 4 | 变更级状态章节描述 SQL 表而非 progress.json | 文档审查 |
| 5 | 新增"数据存储迁移"章节 | 文档审查 |
| 6 | artifacts/history/user-inputs.md 描述未被改动 | diff 审查 |
| 7 | 文档头部有 author 和 created_at | 文档审查 |
| 8 | 文档内无残留的 "progress.json" 引用（除历史说明外） | grep 确认 |
