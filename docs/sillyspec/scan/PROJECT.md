---
author: qinyi
created_at: 2026-05-13T08:39:05
---

# 项目信息

## 基本信息

| 字段 | 值 |
|------|-----|
| **名称** | SillySpec |
| **版本** | 3.9.1 |
| **描述** | SillySpec CLI — 流程状态机，让 AI 严格按步骤来 |
| **类型** | 规范驱动开发工具包 |
| **许可** | MIT |
| **主页** | https://sillyspec.ppdmq.top/ |
| **仓库** | https://github.com/q512426816/sillyspec.git |

## 核心理念

> **Code is Cheap, Context is Expensive.**
>
> 文档是核心资产，代码是文档的产物。没有文档就没有代码——文档是 AI 的记忆，是团队协作的基础，是后续维护的唯一依据。

## 技术要求

- **Node.js**: >= 18
- **类型**: ES Module

## 主要功能

### 核心流程
1. **brainstorm**: 需求探索 — 结构化头脑风暴
2. **propose**: 生成结构化规范（proposal + design + tasks）
3. **plan**: 编写实现计划（2-5 分钟粒度）
4. **execute**: 波次执行（子代理并行 + 强制 TDD + 两阶段审查）
5. **verify**: 验证实现（对照规范检查 + 测试套件）

### 辅助命令
- **scan**: 代码扫描（分析结构、约定、架构）
- **quick**: 快速任务（跳过完整流程）
- **archive**: 归档变更（规范沉淀）
- **status**: 查看项目状态
- **doctor**: 项目自检（CLI、配置、构建环境）
- **init**: 项目初始化
- **workspace**: 工作区管理

## 支持的 AI 工具

| 工具 | `--tool` 参数 | 输出目录 | 格式 |
|------|---------------|----------|------|
| Claude Code (commands) | `claude` | `.claude/commands/sillyspec/` | slash commands |
| Claude Code (skills) | `claude_skills` | `.claude/skills/sillyspec-<name>/` | SKILL.md |
| Cursor | `cursor` | `.cursor/commands/` | custom commands |
| Codex | `codex` | `~/.agents/skills/sillyspec-<name>/` | SKILL.md |
| OpenCode | `opencode` | `.opencode/skills/sillyspec-<name>/` | SKILL.md |
| OpenClaw | `openclaw` | `.openclaw/skills/sillyspec-<name>/` | SKILL.md |

## 项目结构

```
sillyspec/
├── src/              # CLI 核心源码
├── packages/
│   └── dashboard/    # Vue 3 可视化面板
├── .claude/
│   └── skills/       # Claude Code 技能定义（20+）
└── .sillyspec/       # 运行时和文档存储
```

## 关键词

ai, claude, cursor, spec-driven, workflow, documentation-first

## 开发阶段

**活跃开发中**

当前版本：3.9.1
