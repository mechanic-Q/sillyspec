---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: server-index
---

# server-index

## 定位

Dashboard 的 HTTP + WebSocket 服务器入口。负责启动 HTTP 服务（静态文件 + REST API）和 WebSocket 实时推送，并接受前端 CLI 执行请求、转发 sillyspec 命令。

## 契约摘要

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `startServer` | `(opts?: { port?, open? }) => void` | 启动 HTTP + WebSocket 服务器，默认端口 3456 |

### HTTP API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET | 发现并返回所有 sillyspec 项目列表 |
| `/api/projects/:path/detail?type=` | GET | 获取项目详情（git / tech / docs） |
| `/api/projects/:path/overview` | GET | 获取项目概览（techStack、docStats、git） |
| `/api/project/:name` | GET | 按名称查找项目并返回 state |
| `/api/docs/content?path=` | GET | 读取指定 .sillyspec 文档内容（仅限白名单路径） |

### WebSocket 消息类型

| 方向 | type | 说明 |
|------|------|------|
| client→server | `cli_execute` | 执行 sillyspec CLI 命令（白名单校验） |
| server→client | `cli_output` | CLI 进程 stdout 实时推送 |
| server→client | `cli_complete` | CLI 进程结束（exitCode + output） |
| server→client | `progress_update` | progress.json 变更推送 |

### 内部模块

- `isAllowedCliCommand(command)` — 命令白名单校验，仅允许 `run <stage>` 和 `progress <sub>` 两类
- `startProgressWatch / stopProgressWatch` — progress.json 文件监听（引用计数管理）
- `broadcast(data)` — 向所有 WebSocket 客户端广播 JSON 消息
- `scanDirectory(baseDir, seen, maxDepth)` — 递归扫描目录发现 sillyspec 项目

## 关键逻辑

1. **命令安全**：`isAllowedCliCommand` 严格白名单校验 CLI 命令，仅允许 `run {brainstorm|plan|execute|verify|scan|quick|explore|archive|status|doctor|auto}` 和 `progress {show|status|validate|reset}` 及有限 flag。
2. **CORS 限制**：`isLocalOrigin` 仅允许 localhost / 127.0.0.1 来源，非本地请求返回 403。
3. **文档安全**：`isSillyspecPath` + `isViewableDocPath` 双重校验，确保只能读取 .sillyspec 目录下的可查看文档。
4. **进程管理**：`activeProcesses` Map 按项目名管理 CLI 子进程，同名项目先 kill 再启动。
5. **进度监听**：`progressWatchers` 按项目路径管理 fs.watch 实例，使用引用计数 + debounce 避免重复监听。

## 注意事项

- 默认端口 3456，启动后自动 `open()` 浏览器
- 项目发现使用同步 I/O（`readdirSync`），扫描深度默认 2 层
- WebSocket 广播无缓冲，断连客户端直接丢弃
- `cli_execute` 请求需包含 `projectName` 和 `command` 字段
- 不支持 HTTPS，设计为本地开发工具

## 人工备注

单文件包含 HTTP 路由、WebSocket 处理、项目发现、进程管理等多个职责，后续可考虑拆分路由层和业务层。
