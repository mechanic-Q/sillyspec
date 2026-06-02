---
schema_version: 1
doc_type: module-card
module_id: stages
---

# stages

## 定位

定义 SillySpec 所有工作流阶段的步骤和 prompt，是 CLI 状态引擎的核心配置层。

## 契约摘要

| 接口 | 说明 | 调用方 |
|------|------|--------|
| `definition.steps` | 阶段步骤定义数组 | run.js（getStageSteps） |
| `definition.name` | 阶段名 | stages/index.js（registry） |
| `buildExecuteSteps(planFile)` | 动态生成 execute 步骤 | run.js |
| `buildPlanSteps(changeDir)` | 动态生成 plan 步骤 | run.js |

## 关键逻辑

每个阶段由 `export const definition = { name, title, description, steps: [...] }` 导出。steps 数组中每个 step 包含 name、prompt、outputHint、optional 字段。CLI 通过 progress.json 跟踪每个 step 的执行状态。

**核心阶段**（按流程顺序）：brainstorm → propose → plan → execute → verify → archive
**辅助阶段**：scan、quick、explore、status、doctor

## 注意事项

- 修改阶段步骤数量时，ensureStageSteps 会自动同步到 progress.json（检测 steps.length 不匹配）
- archive 步骤顺序不能乱：extract-module-impact 必须在 sync-module-docs 之前
- quick 的模块同步逻辑与 archive 一致，但跳过用户确认

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
