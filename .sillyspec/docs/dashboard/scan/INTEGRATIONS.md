# Dashboard 外部集成

- author: qinyi
- created_at: 2026-06-03T10:03:30+08:00

## 依赖集成

### 前端框架
| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.5 | 前端 UI 框架（Composition API） |
| `naive-ui` | ^2.44.1 | Vue 3 组件库 |
| `@vicons/ionicons5` | ^0.13.0 | 图标集 |
| `marked` | ^17.0.6 | Markdown 渲染（文档预览） |

### 构建工具
| 包名 | 版本 | 用途 |
|------|------|------|
| `vite` | ^6.0 | 构建工具 |
| `@vitejs/plugin-vue` | ^5.2 | Vite Vue 插件 |
| `tailwindcss` | ^4.0 | CSS 工具类 |
| `@tailwindcss/vite` | ^4.0 | Tailwind Vite 插件 |

### 后端服务
| 包名 | 版本 | 用途 |
|------|------|------|
| `ws` | ^8.18 | WebSocket 服务器 |
| `chokidar` | ^4.0 | 文件系统监控 |
| `open` | ^10.1 | 启动时自动打开浏览器 |

## 外部服务

### SillySpec CLI（进程级集成）
- **集成方式：** `child_process.spawn('npx', ['sillyspec', ...args])`
- **位置：** `server/executor.js`
- **用途：** 通过 dashboard 执行 sillyspec 命令（run、status 等）
- **白名单限制：** 仅允许特定 stage（brainstorm/plan/execute/verify/scan/quick/explore/archive/status/doctor/auto）和 flag

### 文件系统（Node.js fs）
- **集成方式：** `fs.readFileSync`、`fs.readdirSync`、`fs.statSync`、`fs.existsSync`
- **位置：** `server/index.js`、`server/parser.js`、`server/watcher.js`
- **用途：** 读取项目配置（package.json）、解析进度文件（progress.json）、遍历文档树
- **注意：** 全部使用同步 API

### Git 命令行
- **集成方式：** `execSync('git log --oneline -10')` 等
- **位置：** `server/parser.js`
- **用途：** 获取项目最近提交记录

## 平台对接

### WebSocket 实时通信
- **协议：** ws://（标准 WebSocket）
- **服务端：** `ws` 库的 `WebSocketServer`，附加在 HTTP server 上
- **客户端：** 浏览器原生 `WebSocket` API，封装为 `useWebSocket` composable
- **事件类型：**
  - `projects:init` / `projects:updated` — 项目列表广播
  - `project:update` — 单项目状态更新
  - `cli:output` / `cli:complete` / `cli:started` / `cli:killed` — CLI 执行生命周期
  - `scan:paths` — 自定义扫描路径
  - `docs:tree` — 文档树结构
- **安全：** 服务端校验 origin，非允许来源会被拒绝（1008）

### REST API（同源 HTTP）
- **协议：** HTTP（与 WebSocket 同端口）
- **路由：**
  - `GET /api/projects` — 获取所有项目状态
  - `GET /api/docs/content?path=<path>` — 获取文档内容
  - `GET /api/overview?project=<path>` — 项目概览数据
  - `GET /api/git?project=<path>` — Git 详情
  - `GET /api/tech?project=<path>` — 技术栈详情
  - `GET /api/pipeline?project=<path>` — Pipeline 状态
- **CORS：** 设置 `Access-Control-Allow-Origin`
- **调用方：** 前端 `fetch('/api/docs/content?path=...')`（`src/App.vue`）

### 文件监控（chokidar）
- **监控目标：** 用户主目录下所有包含 `.sillyspec/` 目录的项目
- **排除目录：** node_modules、.git、.Trash、.cache、Library 等
- **事件处理：** 检测项目状态文件变更 → 重新解析 → WebSocket 广播
- **自定义路径：** 支持运行时动态添加/移除监控路径
