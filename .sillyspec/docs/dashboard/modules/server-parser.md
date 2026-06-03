---
author: qinyi
created_at: 2026-06-03T10:18:00+08:00
doc_type: module-card
module_id: server-parser
---

# server-parser

## 定位

Dashboard 的数据解析层。封装所有文件系统与 git 的同步读取逻辑，将 sillyspec 项目的原始数据（progress.json、package.json、git log、文档树）转换为前端可直接消费的结构化 JSON。

## 契约摘要

### 导出函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `parseProjectOverview` | `(projectPath: string) => object` | 返回 techStack、lastActive、docStats、git |
| `parseGitDetail` | `(projectPath: string) => object` | 返回 branch、commits（最近5条）、untracked |
| `parseTechStackDetail` | `(projectPath: string) => object` | 返回框架详细信息（版本、类型） |
| `parseDocsList` | `(projectPath: string) => object` | 返回文档列表（按类型分组计数） |
| `parseDocsTree` | `(projectPath: string) => object` | 返回文档树（递归目录结构） |
| `parseSillyspecDocsTree` | `(projectPath: string) => object` | 返回 sillyspec 文档树（含 frontmatter 解析、标题提取） |
| `parseProjectState` | `(projectPath: string) => object\|null` | 返回 currentStage、progress、stages、specs、lastActive |
| `parseSpecFile` | `(specPath: string) => object\|null` | 返回 spec 标题、sections、metadata |

### 内部辅助

| 函数 | 说明 |
|------|------|
| `listFilesRecursive(dir)` | 递归列出目录下所有文件 |
| `countMdFiles(dir)` | 递归统计 .md 文件数量 |
| `sillyspecDocExt(fileName)` | 判断是否为 sillyspec 文档扩展名 |
| `isViewableSillyspecDoc(fileName)` | 判断是否为可预览的 sillyspec 文档 |
| `titleFromSillyspecDoc(filePath, fileName)` | 从文档内容提取标题 |

## 关键逻辑

1. **技术栈检测**：`FRAMEWORK_PATTERNS` 数组定义 16 种框架匹配规则（React、Vue、Next.js 等），通过 `package.json` 依赖名匹配；额外支持 `pom.xml` 检测 Java/Maven 项目。
2. **Git 解析**：`parseGitDetail` 通过 `execSync` 执行 `git log -5 --format=%h|%s|%an|%aI` 和 `git status --porcelain`，解析 pipe 分隔的输出格式。
3. **进度状态**：`parseProjectState` 读取 `.sillyspec/.runtime/progress.json`，提取 currentStage、stages 列表、specs 目录下所有 .md 文件及标题。
4. **文档树**：`parseSillyspecDocsTree` 递归遍历 `.sillyspec/docs` 目录，按文件类型分组（design / plan / archive / changes / scan / quicklog），解析 YAML frontmatter 提取元数据。
5. **Spec 解析**：`parseSpecFile` 按 Markdown 标题（##/###/####）拆分文档为 sections，支持标题层级结构。

## 注意事项

- 所有函数均为**同步**（`readFileSync`、`execSync`），由 HTTP 请求线程直接调用
- 项目不存在 `.sillyspec` 目录时 `parseProjectState` 返回 `null`
- `parseGitDetail` 在非 git 仓库中会抛异常，调用方需 try-catch
- frontmatter 解析为简单正则提取，不支持复杂 YAML 嵌套
- `FRAMEWORK_PATTERNS` 需手动维护，新框架需添加匹配规则

## 人工备注

框架检测和 git 解析可考虑缓存或异步化以提升性能。spec 解析目前仅用于前端展示，未来可扩展为结构化查询。
