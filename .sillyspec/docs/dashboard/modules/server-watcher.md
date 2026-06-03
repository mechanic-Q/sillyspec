---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: server-watcher
---

# server-watcher

## 定位

Dashboard 的文件监听层。使用 chokidar 持续监控 sillyspec 项目目录变化，实时更新项目状态并通过回调通知上层，实现 Dashboard 的实时数据刷新。

## 契约摘要

### 导出

| 函数 / 变量 | 签名 | 说明 |
|------|------|------|
| `customScanPaths` | `Set<string>` | 可动态添加的自定义扫描路径集合 |
| `startWatcher` | `(callback: function) => watcher` | 初始化 chokidar 监听，发现所有项目并开始监控 |
| `stopWatcher` | `() => void` | 关闭监听器，清空项目状态缓存 |
| `addCustomScanPath` | `(path: string) => void` | 添加自定义扫描路径并触发重新扫描 |
| `removeCustomScanPath` | `(path: string) => void` | 移除自定义扫描路径 |
| `getCustomScanPaths` | `() => string[]` | 返回当前自定义扫描路径列表 |
| `getProjectStates` | `() => object[]` | 返回所有已监控项目的当前状态快照 |
| `getProjectState` | `(name: string) => object\|undefined` | 按项目名获取单个项目状态 |

### 内部模块

| 函数 | 说明 |
|------|------|
| `buildScanDirs()` | 构建扫描目录列表（cwd、父目录、祖父目录、Desktop、Documents、Projects 等） |
| `scanDirectory(baseDir, seen, maxDepth, currentDepth)` | 递归扫描目录发现 .sillyspec 项目（深度默认 2 层） |
| `scanSelf(seen)` | 将 cwd 自身作为项目检测 |
| `discoverAll()` | 组合扫描逻辑，返回 projects + watchPaths |
| `handleFileChange(filePath)` | 文件变更处理器：重新解析项目状态并触发回调 |
| `rescanProjects()` | 完整重新扫描，发现新增项目 |

## 关键逻辑

1. **项目发现**：`buildScanDirs` 自动扫描 cwd、父级、祖父级目录及常见工作目录（~/Desktop、~/Documents 等），递归深度 2 层，通过 `.sillyspec` 目录存在判定为 sillyspec 项目。
2. **排除规则**：`excludeDirs` 内置 20+ 常见系统/缓存目录（node_modules、.git、Library 等），`shouldExclude` 还额外过滤隐藏目录（cwd 本身除外）和通配符模式。
3. **实时监控**：chokidar 监听所有 `.sillyspec` 目录，`awaitWriteFinish` 配置 300ms 稳定阈值 + 100ms 轮询间隔，避免写入过程中的中间状态触发。
4. **状态更新流程**：文件变更 → `handleFileChange` → 匹配项目名 → 重新调用 `parseProjectState` + `parseProjectOverview` → 更新 `projectStates` Map → 触发 `updateCallback` 通知上层。
5. **新项目发现**：变更文件无法匹配已有项目时触发 `rescanProjects`，完整重新扫描所有目录并注册新项目。
6. **自定义路径**：运行时通过 `addCustomScanPath` 动态添加监控目录，调用后自动触发重新扫描。

## 注意事项

- `startWatcher` 如果已有 watcher 实例会先 `stopWatcher`，支持热重载
- `stopWatcher` 会清空 `projectStates` 缓存，重新 `startWatcher` 时需重新初始化
- `getProjectStates` 返回的是数组快照，不是实时引用
- 文件监听深度为 5 层（chokidar depth 配置），足够覆盖 .sillyspec 内部结构
- `handleFileChange` 中的项目名匹配使用 `startsWith` 路径前缀，可能存在嵌套项目名冲突

## 人工备注

当前排除列表硬编码，如果用户有特殊目录结构可能漏扫。`rescanProjects` 没有频率限制，高频文件变更可能导致频繁完整扫描。考虑增加 debounce 或 cooldown。
