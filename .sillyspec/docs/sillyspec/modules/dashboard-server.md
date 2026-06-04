---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# dashboard-server
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：packages/dashboard/server/**

## 职责
为 SillySpec Dashboard 提供 HTTP API + WebSocket 后端服务，负责项目发现、文件监控、CLI 命令执行和数据解析。

## 当前设计

dashboard-server 是一个基于 Node.js 原生 `http` 模块 + `ws` 库构建的轻量服务器，默认监听 `127.0.0.1:3456`。它不依赖 Express 等框架，所有路由通过 `if/else` 分发。服务器同时提供 HTTP REST API 和 WebSocket 双向通信，前端通过 WebSocket 接收实时项目状态变更和 CLI 执行输出。

模块分为四个核心文件：`index.js`（服务器入口 + 路由 + WebSocket 协议）、`parser.js`（项目数据解析）、`watcher.js`（文件系统监控与项目扫描）、`executor.js`（CLI 子进程管理）。服务器启动时会自动扫描工作区发现 SillySpec 项目，并使用 chokidar 监控 `.sillyspec` 目录变更来推送实时更新。

安全方面，服务器限制只接受本地来源（`127.0.0.1`）的请求，文件读取 API 只允许访问 `.sillyspec` 路径下的可查看文档类型，CLI 命令执行有白名单校验。

## 对外接口（表格）

### HTTP API
| 端点 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/projects` | GET | 获取所有已发现项目列表 | - |
| `/api/project/:name` | GET | 获取单个项目及其状态 | URL: projectName |
| `/api/projects/:path/overview` | GET | 获取项目概览（技术栈、文档统计等） | URL: projectPath |
| `/api/projects/:path/detail` | GET | 获取项目详情（git/tech/docs） | URL: projectPath, Query: type |
| `/api/docs` | GET | 获取项目的 SillySpec 文档树 | Query: project |
| `/api/docs/content` | GET | 读取指定文档文件内容 | Query: path |

### WebSocket 消息协议
| 消息类型 | 方向 | 说明 | 数据 |
|----------|------|------|------|
| `projects:init` | Server→Client | 连接后发送初始项目列表 | Project[] |
| `projects:updated` | Server→Client | 项目变更时推送更新 | Project[] |
| `cli:execute` | Client→Server | 执行 CLI 命令 | { projectName, command } |
| `cli:started` | Server→Client | 命令开始执行 | { projectName } |
| `cli:output` | Server→Client | 命令输出（stdout/stderr） | { projectName, type, data } |
| `cli:complete` | Server→Client | 命令执行完成 | { projectName, code } |
| `cli:kill` | Client→Server | 终止正在执行的命令 | { projectName } |
| `cli:killed` | Server→Client | 命令已被终止 | { projectName } |
| `scan:add-path` | Client→Server | 添加自定义扫描路径 | { path } |
| `scan:remove-path` | Client→Server | 移除自定义扫描路径 | { path } |
| `scan:get-paths` | Client→Server | 获取当前扫描路径 | - |
| `scan:paths` | Server→Client | 当前扫描路径列表 | string[] |
| `docs:get` | Client→Server | 获取文档树 | { projectPath } |
| `docs:tree` | Server→Client | 文档树数据 | DocsTree |

### 导出函数
| 函数 | 文件 | 说明 | 参数 |
|------|------|------|------|
| `startServer` | index.js | 启动 HTTP + WebSocket 服务器 | { port, open } |
| `broadcast` | index.js | 向所有 WebSocket 客户端广播消息 | data |
| `discoverProjects` | index.js | 扫描发现所有 SillySpec 项目 | - |
| `parseProjectOverview` | parser.js | 解析项目概览信息 | projectPath |
| `parseGitDetail` | parser.js | 解析项目 Git 状态 | projectPath |
| `parseTechStackDetail` | parser.js | 解析项目技术栈详情 | projectPath |
| `parseDocsList` | parser.js | 解析 docs 目录文件列表 | projectPath |
| `parseDocsTree` | parser.js | 解析文档树结构 | projectPath |
| `parseSillyspecDocsTree` | parser.js | 解析 .sillyspec 文档树 | projectPath |
| `parseProjectState` | parser.js | 解析项目当前进度状态 | projectPath |
| `parseSpecFile` | parser.js | 解析单个 spec 文件 | specPath |
| `startWatcher` | watcher.js | 启动文件监控 | callback |
| `stopWatcher` | watcher.js | 停止文件监控 | - |
| `addCustomScanPath` | watcher.js | 添加自定义扫描路径 | path |
| `removeCustomScanPath` | watcher.js | 移除自定义扫描路径 | path |
| `getCustomScanPaths` | watcher.js | 获取自定义扫描路径 | - |
| `getProjectStates` | watcher.js | 获取所有项目状态 | - |
| `getProjectState` | watcher.js | 获取单个项目状态 | projectName |
| `executeCommand` | executor.js | 执行 SillySpec CLI 命令 | projectPath, command, onOutput, onComplete |
| `executeNextStep` | executor.js | 执行 next 命令 | projectPath, onOutput, onComplete |
| `executeProgressStatus` | executor.js | 执行 progress status 命令 | projectPath, onOutput, onComplete |
| `executeReset` | executor.js | 执行 progress reset 命令 | projectPath, stage, onOutput, onComplete |

## 关键数据流

1. **项目发现**：服务器启动 → `discoverProjects()` 扫描工作区 + 自定义路径 → 发现 `.sillyspec` 目录的项目 → 推送给前端
2. **文件监控**：`chokidar` 监控 `.sillyspec` 目录变更 → 触发 `handleFileChange` → 重新解析项目状态 → 广播 `projects:updated`
3. **命令执行**：前端发送 `cli:execute` → `handleCliExecute` 校验命令 → `spawn` 子进程 → 流式输出通过 WebSocket 推送 → 完成后广播 `cli:complete`
4. **进度监控**：每个项目独立 watch `progress.json` → 文件变更时延迟解析 → 广播更新状态
5. **文档读取**：前端请求文档 → 服务器验证路径安全性（`isSillyspecPath` + `isViewableDocPath`）→ 读取文件内容返回

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 使用原生 http 模块而非 Express | 依赖少、启动快、功能简单无需路由框架 | Express / Fastify / Hono |
| WebSocket 使用 ws 库 | 轻量、无额外依赖、满足实时通信需求 | Socket.IO（功能过重） |
| CLI 通过 spawn 子进程执行 | 隔离执行环境、可获取 stdout/stderr 流 | 直接 import 调用（共享进程状态不安全） |
| chokidar 监控文件变更 | 跨平台兼容、支持递归监控、性能好 | fs.watch（平台行为不一致） |
| 命令白名单校验 | 安全性，防止任意命令注入 | 无限制（不安全） |
| 监听 127.0.0.1 而非 0.0.0.0 | 仅本地访问，无需鉴权 | 监听所有接口（需要认证机制） |
| progress.json 轮询而非直接监听 | 避免高频写入导致过多事件 | fs.watch 直接触发（可能过于频繁） |

## 依赖关系
- 内部依赖：
  - `parser.js` → 被 `index.js` 和 `watcher.js` 引用
  - `watcher.js` → 被 `index.js` 引用
  - `executor.js` → 被 `index.js` 引用
- 外部依赖：
  - `ws`（WebSocket 服务器）
  - `chokidar`（文件系统监控）
  - `open`（自动打开浏览器）
  - Node.js 内置：`http`、`child_process`、`fs`、`path`、`os`、`url`

## 注意事项
- 服务器只绑定 `127.0.0.1`，不支持远程访问
- CLI 命令执行有白名单限制，只允许 `sillyspec` 命令及指定 flags
- 文件读取 API 有路径安全检查，只允许 `.sillyspec` 目录下的可查看文档
- `activeProcesses` Map 跟踪所有运行中的子进程，服务器关闭时会全部终止
- `allowedStages` 集合定义了可执行的所有阶段：brainstorm、plan、execute、verify、scan、quick、explore、archive、status、doctor、auto
- 项目发现扫描深度限制为 2 层，且有排除目录列表（node_modules、.git 等）

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
