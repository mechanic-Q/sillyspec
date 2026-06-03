---
author: qinyi
created_at: 2026-06-03T10:50:00+08:00
---

# Workflow 引擎模块文档

## 模块信息

| 属性 | 值 |
|------|-----|
| 模块 ID | workflow |
| 文件 | src/workflow.js |
| 行数 | ~400 |
| 依赖 | js-yaml（YAML 解析） |

## 定位

Workflow 引擎是 SillySpec 阶段内任务的结构化执行协议层。

**负责什么**：
- 加载 `.sillyspec/workflows/*.yaml` 定义文件
- 运行 post_check 验证产物（按角色、按全局两级检查）
- 按角色定位失败，生成带失败证据的重试 prompt
- 根据 role 定义生成子代理 prompt（Level 2）

**不负责什么**：
- 不直接启动子代理/agent 进程（那是 executor adapter 的职责）
- 不管理阶段生命周期（那是 run.js / ProgressManager 的职责）
- 不定义 workflow YAML 内容（那是具体 workflow 文件的职责）

## 契约摘要

### 加载 + 校验

```js
loadWorkflow(cwd, name, validate?) → object|null
// validate=true 时自动校验，失败返回 { _validationErrors: [...], ...wf }
validateWorkflow(wf) → string[]
listWorkflows(cwd) → string[]
```

### 校验规则

- `depends_on` 引用的 role id 必须存在
- `depends_on` 不能形成循环（A→B→A）
- `inputs.from_role` 必须存在且已声明在 `depends_on` 中
- `inputs.output` 必须在源 role 的 outputs 中存在

### 检查

```js
runPostCheck(wf, cwd, projectName, placeholders?) → { passed, roleResults[], workflowFailures[] }
formatCheckReport(result) → string
```

### 重试

```js
generateRetryPrompt(wf, checkResult, projectName) → string
```

### Prompt 生成

```js
generateRolePrompt(wf, roleId, projectName, context?) → string|null
generateAllRolePrompts(wf, projectName, context?) → Array<{roleId, roleName, prompt}>
```

## 检查类型

| 类型 | 参数 | 说明 |
|------|------|------|
| file_exists | — | 文件是否存在 |
| min_lines | min: number | 文件最小行数 |
| no_empty_files | — | 文件非空 |
| contains_sections | sections: string[] | 必须包含的 ## 章节 |
| no_placeholder | patterns?: string[] | 过滤独立成行的 AI 水文（"待补充"/"TODO"/"TBD"等），行内引用不触发 |

## 关键逻辑

```
workflow YAML → 替换 <project>/<change-name> 占位符
  → 按 role 遍历 outputs
    → 按 check 类型执行验证
      → 汇总 role 级 + workflow 级结果
        → 输出报告 + 生成重试 prompt
```

## 注意事项

- `replaceProjectPlaceholder` 用 JSON 序列化做全局替换，性能对当前规模无影响
- `generateRetryPrompt` 只重试失败角色（`retry_scope: failed_role_only`），不重跑成功的
- 占位符只替换 `<project>`（`runPostCheck` 自动）和 `<change-name>`（需调用方手动替换）
- `depends_on` 校验是两层循环检测，不做完整 DAG 拓扑排序
- `no_placeholder` 只匹配独立成行的占位文本，避免误伤文档中行内引用的 TODO/FIXME
- `inputs` 支持两种格式：mapping（推荐，含 from_role）和数组（兼容旧版）

## 人工备注

<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
