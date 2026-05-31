---
id: task-09
title: 改造 src/init.js — init 时创建 SQLite 而非 global.json
priority: P0
estimated_hours: 1
depends_on: [task-03]
blocks: [task-14]
allowed_paths:
  - src/init.js
  - src/progress.js
  - src/db.js
---

# task-09: 改造 src/init.js — init 时创建 SQLite 而非 global.json

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/init.js` | 改造 | init 流程改为创建 SQLite DB |
| `src/progress.js` | 改造 | `ProgressManager.init()` 内部改为创建 DB |

## 实现要求

将 init 流程从"创建 global.json 文件"改为"创建 SQLite 数据库"。

### ProgressManager.init(cwd) 改造

**改造前：**
1. `_migrateIfNeeded(cwd)` → 已被 task-08 删除
2. `_ensureRuntimeDir(cwd)` → 保留（创建 artifacts/history/logs/templates）
3. 检查 global.json 是否存在，不存在则创建
4. 创建 user-inputs.md
5. `_ensureGitignore(cwd)` → 保留

**改造后：**
1. 初始化 DB 实例（通过 db.js）
2. `db.init()` 创建表结构（如果 DB 不存在则自动创建）
3. `INSERT INTO project (name, created_at, updated_at) VALUES (... , datetime('now'), datetime('now'))`（project 表 id=1）
4. 创建 user-inputs.md（保持不变）
5. `_ensureGitignore(cwd)` → 保留

### init.js doInstall() 改造

- `pm.init(projectDir)` 调用保持不变（内部行为已改变）
- 不再依赖 global.json 文件存在

### init.js cmdInit() 改造

- 无需改动（通过 pm.init 间接使用）

## 接口定义（代码类必填）

### ProgressManager.init(cwd) → object
```typescript
init(cwd: string): { _version: number; project: string; activeChanges: string[] }
```

- 返回值与 readGlobal 兼容（{ _version, project, activeChanges: [] }）
- DB 文件路径：`.sillyspec/.runtime/sillyspec.db`

## 边界处理（≥5条）

1. **init 重复调用**：检查 project 表 id=1 是否已存在，存在则跳过 INSERT，打印 "已存在"
2. **DB 初始化失败（WASM 加载失败）**：catch 异常，打印明确错误信息，提示检查 sql.js 安装
3. **project 目录名含特殊字符**：作为 project name 正常写入，不报错
4. **.sillyspec/.runtime/ 目录权限不足**：mkdirSync 抛异常，向上传递
5. **init 后 readGlobal 立即可用**：确认 DB 写入后 readGlobal 可正确读取
6. **user-inputs.md 已存在**：保持现有行为，跳过创建

## 非目标

- 不修改 _ensureRuntimeDir 逻辑（保持创建子目录）
- 不修改 _ensureGitignore 逻辑
- 不修改 doInstall 中的 skills 复制、指令注入等逻辑
- 不处理旧版 global.json 的迁移（不兼容）

## TDD 步骤

1. **RED**: init 后 DB 文件存在于 `.sillyspec/.runtime/sillyspec.db`
2. **GREEN**: 实现 init 创建 DB
3. **RED**: init 后 project 表有 id=1 的记录
4. **GREEN**: 实现 INSERT INTO project
5. **RED**: init 后 readGlobal 返回正确数据
6. **GREEN**: 确认 readGlobal 可读 DB
7. **RED**: init 重复调用不报错
8. **GREEN**: 实现 EXISTS 检查

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | `sillyspec init` 后 `.sillyspec/.runtime/sillyspec.db` 存在 | 文件存在断言 |
| 2 | init 后不再创建 `global.json` | 文件不存在断言 |
| 3 | init 后 `pm.readGlobal()` 返回正确数据 | 单元测试 |
| 4 | init 重复调用不报错、不覆盖已有数据 | 单元测试 |
| 5 | init 创建 `.sillyspec/.runtime/` 子目录（artifacts/history/logs/templates） | 目录存在断言 |
| 6 | init 创建 `user-inputs.md` | 文件存在断言 |
| 7 | init 更新 `.gitignore` | 文件内容断言 |
| 8 | init.js 中 doInstall 正常执行无报错 | 集成测试 |
