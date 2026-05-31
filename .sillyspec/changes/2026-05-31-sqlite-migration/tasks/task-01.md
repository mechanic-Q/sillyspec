---
id: task-01
title: 安装 sql.js 依赖，验证 WASM 加载和基础 CRUD
priority: P0
estimated_hours: 0.5
depends_on: []
blocks: [task-02]
allowed_paths:
  - package.json
  - package-lock.json
---

# task-01: 安装 sql.js 依赖，验证 WASM 加载和基础 CRUD

## 背景

sillyspec 当前零 npm 依赖以外的纯 CLI 项目（已有 chalk/ora 等辅助库）。本任务引入 sql.js（SQLite 的 WASM 版本），作为后续 SQLite 存储改造的基础。选择 sql.js 而非 better-sqlite3 是因为纯 JS 包无需编译环境，跨平台安装零障碍（见 design.md AD-02）。

## 修改文件（必填）

- `package.json` — 新增 `sql.js` 依赖
- `package-lock.json` — 安装后自动更新（随 git commit 提交）

## 实现要求

1. 在 sillyspec 项目根目录执行 `npm install sql.js`
2. 确认 package.json 的 dependencies 中新增 `"sql.js": "^<版本号>"`
3. 编写临时验证脚本，验证 sql.js 在 Node.js 22 下正常加载 WASM 并执行 CRUD
4. 验证 sillyspec 原有命令不受影响
5. 验证通过后删除临时验证脚本

## 接口定义（代码类任务必填）

验证脚本 `verify-sqljs.mjs`（临时文件，验证完删除）：

```javascript
// verify-sqljs.mjs — sql.js 验证脚本
// 用法：node verify-sqljs.mjs
// 预期输出：
//   ✅ sql.js WASM 加载成功
//   ✅ CREATE TABLE 成功
//   ✅ INSERT 成功
//   ✅ SELECT 结果: [{"id":1,"name":"hello"}]
//   ✅ UPDATE 成功
//   ✅ DELETE 成功
//   ✅ 事务测试通过
//   ✅ 全部验证通过

import initSqlJs from 'sql.js';

async function main() {
  let db;

  // 1. WASM 加载（Node.js 环境默认自动定位 WASM 文件）
  try {
    const SQL = await initSqlJs();
    console.log('✅ sql.js WASM 加载成功');
    db = new SQL.Database();
  } catch (err) {
    console.error('❌ sql.js WASM 加载失败:', err.message);
    process.exit(1);
  }

  // 2. CREATE TABLE
  try {
    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value REAL)");
    console.log('✅ CREATE TABLE 成功');
  } catch (err) {
    console.error('❌ CREATE TABLE 失败:', err.message);
    db.close();
    process.exit(1);
  }

  // 3. INSERT
  try {
    db.run("INSERT INTO test VALUES (1, 'hello', 3.14)");
    db.run("INSERT INTO test VALUES (2, 'world', 2.72)");
    console.log('✅ INSERT 成功');
  } catch (err) {
    console.error('❌ INSERT 失败:', err.message);
    db.close();
    process.exit(1);
  }

  // 4. SELECT（使用 db.exec）
  try {
    const results = db.exec("SELECT id, name, value FROM test");
    const rows = results[0].values.map(r => ({
      id: r[0], name: r[1], value: r[2]
    }));
    console.log(`✅ SELECT 结果: ${JSON.stringify(rows)}`);
  } catch (err) {
    console.error('❌ SELECT 失败:', err.message);
    db.close();
    process.exit(1);
  }

  // 5. UPDATE
  try {
    db.run("UPDATE test SET name = 'updated' WHERE id = 1");
    const check = db.exec("SELECT name FROM test WHERE id = 1");
    if (check[0].values[0][0] === 'updated') {
      console.log('✅ UPDATE 成功');
    } else {
      console.error('❌ UPDATE 验证失败');
      db.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ UPDATE 失败:', err.message);
    db.close();
    process.exit(1);
  }

  // 6. DELETE
  try {
    db.run("DELETE FROM test WHERE id = 2");
    const count = db.exec("SELECT COUNT(*) FROM test");
    if (count[0].values[0][0] === 1) {
      console.log('✅ DELETE 成功');
    } else {
      console.error('❌ DELETE 验证失败');
      db.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ DELETE 失败:', err.message);
    db.close();
    process.exit(1);
  }

  // 7. 事务（BEGIN / COMMIT）
  try {
    db.run("BEGIN TRANSACTION");
    db.run("INSERT INTO test VALUES (3, 'tx_test', 1.0)");
    db.run("COMMIT");
    const txCheck = db.exec("SELECT COUNT(*) FROM test");
    if (txCheck[0].values[0][0] === 2) {
      console.log('✅ 事务测试通过');
    } else {
      console.error('❌ 事务验证失败');
      db.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ 事务测试失败:', err.message);
    db.close();
    process.exit(1);
  }

  db.close();
  console.log('✅ 全部验证通过');
}

main().catch(err => {
  console.error('❌ 未捕获异常:', err);
  process.exit(1);
});
```

## 边界处理（必填）

1. **WASM 文件定位**：sql.js 在 Node.js 环境下默认能自动定位 `sql-wasm.wasm`（从 node_modules/sql.js/dist/ 加载），但如果遇到 `locateFile` 报错，需手动指定：`initSqlJs({ locateFile: file => path.join(import.meta.dirname, 'node_modules/sql.js/dist', file) })`。
2. **ESM 兼容性**：package.json 已声明 `"type": "module"`，验证脚本使用 `.mjs` 后缀确保 ESM 加载。如果 `import initSqlJs from 'sql.js'` 失败，尝试 `import initSqlJs from 'sql.js/dist/sql-wasm.js'`。
3. **package-lock.json 提交**：sql.js 是新依赖，package-lock.json 会变更。确认变更后随 package.json 一起 commit，确保 CI 可复现安装。
4. **安装体积**：sql.js 约 1MB（主要是 WASM 文件），确认安装后 `node_modules/sql.js` 目录大小合理（不超过 3MB），不影响 `npm install` 速度。
5. **原有命令兼容**：安装 sql.js 后执行 `node bin/sillyspec.js --version`，确认 CLI 正常启动且版本号输出正确，排除 sql.js 导致的启动冲突。
6. **Node.js 22 兼容**：当前 package.json 声明 `"engines": { "node": ">=18" }`，确认 sql.js 在 Node 22 下 WASM 加载无弃用警告或错误。
7. **WASM 加载失败明确报错**：如果 sql.js WASM 加载失败（如 Node.js 不支持 WASM 或文件缺失），错误信息应明确包含 `sql.js` 和 `WASM` 关键字，而非静默失败或产生难以追溯的错误。

## 非目标（本任务不做的事）

- 不写 `src/db.js` 封装（task-02 负责）
- 不改造 `src/progress.js`（后续 task 负责）
- 不配置 CI/CD 或 CI 环境验证
- 不做 sql.js vs better-sqlite3 性能对比
- 不处理 `.npmrc` 或发布配置

## 参考

- [sql.js GitHub](https://github.com/sql-js/sql.js)
- [sql.js npm](https://www.npmjs.com/package/sql.js)
- design.md AD-02：选择 sql.js（WASM 版）的架构决策
- plan.md Wave 1：task-01 与 task-02 并行，task-01 是 spike-01 的产出

## TDD 步骤

1. **安装依赖**：`cd ~/Desktop/sillyspec && npm install sql.js`
2. **写验证脚本**：将上方接口定义中的代码保存为项目根目录 `verify-sqljs.mjs`
3. **运行验证**：`node verify-sqljs.mjs`，确认全部 ✅ 通过
4. **回归验证**：`node bin/sillyspec.js --version`，确认原有 CLI 正常
5. **清理**：删除 `verify-sqljs.mjs`

## 验收标准

| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | `npm install sql.js` | 退出码 0，package.json dependencies 新增 sql.js |
| AC-02 | 运行 `node verify-sqljs.mjs` | 终端输出全部 ✅，无任何 ❌，进程退出码 0 |
| AC-03 | 检查 WASM 加载 | 输出包含 "✅ sql.js WASM 加载成功"，无 locateFile 相关错误 |
| AC-04 | 检查 CRUD 结果 | SELECT 输出 `[{"id":1,"name":"hello","value":3.14},{"id":2,"name":"world","value":2.72}]`，UPDATE/DELETE 验证通过 |
| AC-05 | `node bin/sillyspec.js --version` | 输出 sillyspec 版本号（当前 3.11.11），无报错 |
| AC-06 | package-lock.json 已更新 | 包含 sql.js 及其依赖树 |
| AC-07 | `verify-sqljs.mjs` 已删除 | 文件不存在于项目根目录 |
