---
id: task-10
title: 改造 src/index.js — 新增 sillyspec platform 命令组解析
priority: P1
estimated_hours: 1
depends_on: []
blocks: [task-12]
allowed_paths:
  - src/index.js
---

# task-10: 改造 src/index.js — 新增 sillyspec platform 命令组解析

## 修改文件（必填）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/index.js` | 改造 | 新增 `platform` 命令解析分支 |

## 实现要求

在 `src/index.js` 的 `main()` 函数 switch 中新增 `platform` 命令分支。

### CLI 语法设计

```
sillyspec platform <sub-command> [options]

子命令:
  connect <url> [--token <token>]    连接 SillyHub 平台
  disconnect                         断开连接
  sync [--change <name>]            同步指定变更（默认全部活跃变更）
  sync-docs [--change <name>]       同步四件套文档
  status                             查看当前同步状态
  approve <change-name>              审批变更
  reject <change-name> [--reason <reason>]  拒绝变更
```

### 实现方式

在 switch 中新增 case：
```javascript
case 'platform': {
  const { syncModule } = await import('./sync.js');
  const platformSub = filteredArgs[1];
  // 解析子命令和选项，委托给 syncModule
  break;
}
```

**注意：** 此任务只做 CLI 参数解析和路由，不实现 sync.js 的具体功能（task-11 实现）。如果 sync.js 尚未创建，使用占位导出。

### printUsage 更新

在 printUsage() 函数中新增 platform 命令的帮助文本。

## 接口定义（代码类必填）

### CLI 入口
```
sillyspec platform connect <url> [--token <token>]
sillyspec platform disconnect
sillyspec platform sync [--change <name>]
sillyspec platform sync-docs [--change <name>]
sillyspec platform status
sillyspec platform approve <change-name>
sillyspec platform reject <change-name> [--reason <reason>]
```

## 边界处理（≥5条）

1. **`sillyspec platform` 无子命令**：打印 platform 帮助信息
2. **未知子命令**：打印 "未知子命令" + 帮助信息，exit(1)
3. **sync.js 不存在**：import 失败时打印 "平台同步功能不可用"
4. **--token 缺失但 connect 需要**：prompt 用户输入（或报错）
5. **--change 指定不存在的变更**：打印警告，不影响命令执行
6. **--dir 选项与 platform 命令共存**：正确传递 targetDir

## 非目标

- 不实现 sync.js 的具体功能（task-11 负责）
- 不实现 local.yaml 的配置读取
- 不修改现有命令的解析逻辑

## TDD 步骤

1. **RED**: `sillyspec platform` 无子命令时打印帮助
2. **GREEN**: 实现帮助分支
3. **RED**: `sillyspec platform status` 正确路由到 sync.status
4. **GREEN**: 实现路由
5. **RED**: `sillyspec platform unknown` 打印错误
6. **GREEN**: 实现错误处理
7. **RED**: printUsage 包含 platform 命令
8. **GREEN**: 更新 printUsage

## 验收标准（表格）

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | `sillyspec platform` 打印 platform 子命令帮助 | CLI 手动测试 |
| 2 | `sillyspec platform status` 正确路由（不报错） | CLI 手动测试 |
| 3 | `sillyspec platform unknown` 打印错误信息 | CLI 手动测试 |
| 4 | `sillyspec platform connect https://... --token xxx` 正确解析参数 | CLI 手动测试 |
| 5 | `sillyspec --help` 输出包含 platform 命令 | CLI 手动测试 |
| 6 | `--dir` 选项与 platform 共存时正确传递 | CLI 手动测试 |
| 7 | sync.js 不存在时不崩溃 | mock import 失败测试 |
