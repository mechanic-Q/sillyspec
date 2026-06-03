---
author: qinyi
created_at: 2026-06-03T06:40:00+08:00
---

# CONCERNS — 技术债务

## 代码质量

- **整体评价**：代码结构清晰，模块职责分明，但缺少类型检查和自动化测试
- **优点**：ESM 统一模块系统、错误处理较完善、日志系统规范
- **待改进**：同步文件操作偏多（见债务项 #2）、缺少 lint 配置

## 依赖风险

- **sql.js (WASM)**：核心依赖，体积较大（~1MB），但 SQLite 兼容性好，风险可控
- **@inquirer/prompts**：活跃维护，API 稳定
- **chokidar**：成熟文件监听库，跨平台支持好
- **ws**：WebSocket 标准实现，无重大安全漏洞
- **总依赖数**：生产依赖较少，供应链风险低

## 🔴 严重

### 1. 零测试覆盖
- **影响**：核心模块（db.js、progress.js、run.js）无任何自动化测试，回归风险极高
- **位置**：全项目
- **详情**：`package.json` 无 `scripts.test`，无测试框架依赖。唯一的测试文件在工作树临时目录中

### 2. 同步文件操作阻塞
- **影响**：`init.js` 中 `copyDirSync()` 使用同步 `fs` 操作，初始化时阻塞事件循环
- **位置**：`src/init.js:12`（`copyDirSync`）
- **详情**：初始化阶段大量使用 `readFileSync`、`statSync`、`readdirSync`，对于大项目可能导致明显的 CLI 卡顿

## 🟡 中等

### 3. SillyHub 同步未实现
- **影响**：`sync.js` 中两处 TODO 标记平台同步功能未实现
- **位置**：`src/sync.js:406,411`（`// TODO: SillyHub 平台侧实现后启用`）
- **详情**：同步功能骨架已存在但核心逻辑被注释，影响跨设备协作能力

### 4. token 交互式输入未完成
- **影响**：CLI 的 token 认证流程未完全实现
- **位置**：`src/index.js:427`（`TODO: task-11`）
- **详情**：错误提示暗示交互式 token 输入是临时方案，缺少持久化存储

### 5. Dashboard 刷新逻辑缺失
- **影响**：前端仪表盘数据刷新功能未实现
- **位置**：`packages/dashboard/src/components/ProjectOverview.vue:45`
- **详情**：`// TODO: 实现刷新逻辑`，用户需手动刷新页面获取最新数据

### 6. 无构建/CI 配置
- **影响**：`package.json` 无 `scripts` 字段，缺少 build、lint、test、CI 配置
- **详情**：项目依赖直接引用源码，无构建产物管理，发布流程手动

## 🟢 低优先级

### 7. stage 模板硬编码路径
- **影响**：阶段步骤模板的路径引用散布在各 stage 文件中，修改目录结构需多处同步更新
- **位置**：`src/stages/*.js`
- **建议**：集中管理路径常量

### 8. 过时文档引用
- **影响**：`migrate.js` 注释中提到 `specs/` 目录已废弃，但旧文档可能仍引用
- **位置**：`src/migrate.js:51`（`specs/ is deprecated`）
- **建议**：确认所有旧文档引用已清理

### 9. 缺少 TypeScript 类型
- **影响**：纯 JavaScript 项目无类型检查，重构时缺少类型安全保障
- **建议**：可考虑引入 JSDoc 类型注解或渐进迁移 TypeScript
