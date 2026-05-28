# stages

> 最后更新：2026-05-28
> 最近变更：module-docs-sync-on-archive
> 模块路径：src/stages/**

## 职责
定义 SillySpec 所有工作流阶段的步骤和 prompt，是 CLI 状态引擎的核心配置层。

## 当前设计
每个阶段由 `export const definition = { name, title, description, steps: [...] }` 导出。steps 数组中每个 step 包含 name、prompt、outputHint、optional 字段。CLI 通过 progress.json 跟踪每个 step 的执行状态。

**核心阶段**（按流程顺序）：brainstorm → propose → plan → execute → verify → archive
**辅助阶段**：scan、quick、explore、status、doctor

### 当前步骤数量
| 阶段 | 步骤数 | 说明 |
|------|--------|------|
| brainstorm | 10 | 需求探索 |
| propose | 7 | 方案设计 |
| plan | 8 | 实现计划 |
| execute | 动态 | 波次执行（步骤由 plan.md 生成） |
| verify | 7 | 验证确认 |
| archive | 5 | 归档变更（含模块文档同步） |
| scan | 10 | 代码扫描（含模块映射生成） |
| quick | 3 | 快速任务（含模块文档同步） |
| explore | 1 | 自由探索 |
| status | 1 | 状态查看 |
| doctor | 3 | 自检修复 |

### archive 阶段流程
1. 任务完成度检查
2. extract-module-impact（分析 git diff + 三重交叉验证 → 生成 module-impact.md）
3. sync-module-docs（生成 patch → 用户确认 → 写入 modules/*.md）
4. 确认归档
5. 更新路线图和提交

## 对外接口
| 接口 | 说明 | 调用方 |
|------|------|--------|
| `definition.steps` | 阶段步骤定义数组 | run.js（getStageSteps） |
| `definition.name` | 阶段名 | stages/index.js（registry） |
| `buildExecuteSteps(planFile)` | 动态生成 execute 步骤 | run.js |
| `buildPlanSteps(changeDir)` | 动态生成 plan 步骤 | run.js |

## 关键数据流
```text
sillyspec run <stage>
  → index.js 解析命令
  → run.js getStageSteps() 从 stages/ 读取步骤定义
  → ensureStageSteps() 同步到 progress.json
  → 输出当前步骤 prompt 给 AI
  → AI 执行 → --done 标记完成 → 推进下一步
```

## 设计决策
| 决策 | 理由 | 来源 |
|------|------|------|
| 阶段定义用纯 JS 对象导出 | 简单、无依赖、易于 AI 读写 | initial-setup |
| execute 步骤动态生成 | 任务数量不固定，需从 plan.md 推导 | run-command-design |
| archive 增加模块文档同步 | 变更后模块设计知识需沉淀回当前文档 | module-docs-sync-on-archive |
| scan 模块映射步骤设为 optional | 不影响自检门控，首次 scan 可能不需要 | module-docs-sync-on-archive |
| quick 直接同步模块文档（不确认） | quick 定位轻量，同步成本极低 | module-docs-sync-on-archive |

## 依赖关系
### 依赖本模块
- run.js — 读取步骤定义，驱动执行流程
- stages/index.js — 注册所有阶段到 stageRegistry

### 本模块依赖
- 无（纯定义层，零外部依赖）

## 注意事项
- 修改阶段步骤数量时，ensureStageSteps 会自动同步到 progress.json（检测 steps.length 不匹配）
- archive 步骤顺序不能乱：extract-module-impact 必须在 sync-module-docs 之前
- quick 的模块同步逻辑与 archive 一致，但跳过用户确认

## 变更索引
| 日期 | 变更 | 摘要 |
|------|------|------|
| 2026-05-28 | module-docs-sync-on-archive | archive 新增模块影响分析和文档同步，scan 新增模块映射，quick 增加同步逻辑 |
