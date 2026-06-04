---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# bin
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：bin/**

## 职责
CLI 入口文件，将命令行调用转发到 `src/index.js` 主模块。

## 当前设计
`bin/sillyspec.js` 是整个 SillySpec CLI 的可执行入口，仅包含 shebang 行和一行 import。实际命令解析和分发逻辑完全在 `src/index.js` 中完成。这种设计将入口与逻辑分离，便于：
- npm 通过 `package.json` 的 `bin` 字段指向此文件
- 入口文件保持极简，所有业务逻辑在 src 下维护
- 便于未来扩展（如添加 preload 脚本、环境检测等）

## 对外接口（表格）
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `import '../src/index.js'` | 转发到主模块 | 无（隐式接收 `process.argv`） |

## 关键数据流
1. 用户执行 `npx sillyspec` 或 `sillyspec` 命令
2. Node.js 加载 `bin/sillyspec.js`（通过 `package.json` 的 `bin` 字段）
3. shebang `#!/usr/bin/env node` 确保以 Node.js 执行
4. `import '../src/index.js'` 将控制权交给主模块
5. `src/index.js` 解析 `process.argv`，分发到对应子命令

## 设计决策（表格）
| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 入口文件极简化（单行 import） | 职责单一，入口不承载业务逻辑 | 在入口中做参数预处理 |
| 使用 ESM import | 项目整体采用 ESM 规范 | CommonJS require |
| shebang 指定 env node | 跨平台兼容，不硬编码 node 路径 | 硬编码 `/usr/bin/node` |

## 依赖关系
- 内部依赖：`src/index.js`（主模块，命令解析与分发）
- 外部依赖：无

## 注意事项
- 文件需要有可执行权限（`chmod +x`），npm install 时会自动处理
- `package.json` 的 `bin` 字段必须指向此文件
- 由于是 ESM import，`src/index.js` 也必须是 ESM 格式或支持 ESM 导入
- 此文件不应添加任何业务逻辑，保持纯粹的转发职责

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
