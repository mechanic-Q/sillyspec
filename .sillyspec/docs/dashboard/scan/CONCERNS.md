# Dashboard - 技术债务

> author: qinyi | created_at: 2026-06-03T10:03:00+08:00

## 代码质量

### 🔴 严重

- **无测试覆盖** — 整个项目没有任何测试文件或测试框架，核心逻辑（parser、executor、watcher）全靠人工验证
- **server 代码存在阻塞式调用** — `server/parser.js` 中直接使用 `execSync('git status')` 和 `execSync('git log')`，在 API 请求中同步执行 shell 命令，会阻塞 Node.js 事件循环

### 🟡 中等

- **未完成的 TODO** — `src/components/ProjectOverview.vue:45` 有 `// TODO: 实现刷新逻辑`
- **无 TypeScript** — 项目纯 JS，无类型检查，大型组件维护风险较高
- **无 Vue Router / Pinia** — 没有 `createRouter` 或 `defineStore` 引用，状态管理全靠 composables，随复杂度增长可能难以维护
- **HTML 原型残留** — `public/` 下有 `prototype-dashboard.html` 和 `prototype-overview.html`，应清理

### 🟢 低优先级

- **Tailwind v4 + 内联样式混用** — `index.html` 中有 `style="background-color: #0A0A0B"` 硬编码，与 Tailwind v4 共存
- **server 目录无统一错误处理** — `server/index.js`、`executor.js`、`parser.js` 各自处理错误，缺乏统一中间件

## 依赖风险

### 🟡 中等

| 依赖 | 风险说明 |
|------|---------|
| `naive-ui` ^2.44.1 | 体积较大（~1MB+），未配置按需导入，bundle 体积偏高 |
| `chokidar` ^4.0 | v4 相对较新，API 与 v3 有 breaking changes |
| `marked` ^17.0.6 | 用于 Markdown 渲染，需注意 XSS（需配置 sanitizer） |
| `ws` ^8.18 | 自建 WebSocket 服务，无心跳/重连机制 |

### 🟢 低优先级

- `open` ^10.1 — 仅用于 dev 环境打开浏览器，影响极小
- `@vicons/ionicons5` — 图标库，可通过 tree-shaking 优化

## 架构隐患

### 🟡 中等

- **前后端耦合** — `packages/dashboard/server/` 包含完整 Node.js 后端（HTTP API + WebSocket + 文件监控），与前端源码同包管理，部署时需注意分离
- **单入口大组件** — `App.vue` 直接导入多个组件和 composables，无路由分层，随功能扩展将变得臃肿
- **无 API 抽象层** — 前端通过 `useWebSocket` composable 直接与 WebSocket 通信，无请求/响应类型定义或 mock 能力
