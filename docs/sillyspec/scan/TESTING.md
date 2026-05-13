---
author: qinyi
created_at: 2026-05-13T08:38:50
---

# 测试现状

## 测试结构

### 当前状态
**无自动化测试**

项目中未发现传统的测试文件（*.test.js, *.spec.js 等）。

### 测试策略

SillySpec 采用文档驱动的验证方式，而非传统单元测试：

1. **设计文档验证** (`verify` 阶段)
   - 对照 `design.md` 检查实现一致性
   - `design.md` 是唯一 truth source
   - 不符合 `design.md` 的实现 = Bug

2. **任务验收** (`task-N.md`)
   - 每个任务有明确的验收标准
   - 执行后逐项检查验收标准是否满足

3. **代码质量扫描**
   - Lint 检查（如 `local.yaml` 中配置）
   - 搜索技术债务（TODO/FIXME/HACK/XXX）

4. **构建/测试**
   - 优先使用 `local.yaml` 中配置的命令
   - 未配置时根据项目类型选择默认命令

### verify 阶段测试流程

1. 运行 `sillyspec progress show`
2. 加载项目配置和 `local.yaml`
3. 对照 `tasks.md` 检查每个任务
4. 对照 `design.md` 检查实现一致性
5. 检查任务验收标准
6. 运行测试和代码质量扫描
7. 生成完整验证报告

### QA 角色定义

execute 阶段引入 QA 专家角色：
> "你是一位吹毛求疵的 QA 专家。假设所有代码都有 bug，用最坏情况测试。关注边界、异常、并发。"

## 测试建议

### 建议添加的测试
- [ ] CLI 命令测试
- [ ] ProgressManager 单元测试
- [ ] 阶段定义验证测试
- [ ] Dashboard 集成测试
