# module-docs-sync-on-archive — 需求

author: qinyi
created_at: 2026-05-28 11:12:00

## 功能需求

### FR-1: 模块映射配置

系统应维护一个"文件路径 → 模块"的映射配置，使归档阶段能稳定识别变更涉及的模块。

- FR-1.1: 映射配置文件路径为 `.sillyspec/docs/<project>/modules/_module-map.yaml`
- FR-1.2: 每个 module 条目包含 name、paths(glob)、description
- FR-1.3: scan 阶段末尾自动生成初始版本
- FR-1.4: 用户可手动调整映射

### FR-2: 模块影响分析

归档阶段应自动分析本次变更影响的模块。

- FR-2.1: 综合三个信息源：proposal.md/design.md 的声明范围、tasks.md 的实际任务、git diff 的真实修改文件
- FR-2.2: 根据 `_module-map.yaml` 将文件路径匹配到模块
- FR-2.3: 生成结构化的 `module-impact.md`（包含模块影响矩阵）
- FR-2.4: 对未匹配路径归入 unmapped 类别并提示

### FR-3: 模块文档同步

归档阶段应在用户确认后更新模块设计文档。

- FR-3.1: 模块文档路径为 `.sillyspec/docs/<project>/modules/<module>.md`
- FR-3.2: 模块文档正文始终描述当前状态（快照模式）
- FR-3.3: 底部只保留轻量变更索引（日期、变更名、一句话摘要）
- FR-3.4: 支持新建模块文档和更新已有模块文档
- FR-3.5: 更新前生成 patch 展示给用户确认
- FR-3.6: 用户拒绝时不写入

### FR-4: quick 任务模块文档同步

quick 任务不走 archive 流程，但应在完成时直接同步模块文档（成本极低）。

- FR-4.1: 在「暂存和更新记录」步骤中，读取 _module-map.yaml
- FR-4.2: 对比 git diff 修改的文件与模块映射
- FR-4.3: 如果命中模块 → 直接更新对应模块文档（与 archive 的 sync-module-docs 相同逻辑）
- FR-4.4: 如果未命中任何模块或映射文件不存在 → 跳过，不中断

### FR-5: 独立预览命令

支持在归档前单独预览模块文档更新。

- FR-5.1: 命令 `silly sync-modules <change>` 或等价方式
- FR-5.2: 仅预览，不自动写入
- FR-5.3: 支持重复执行时重新生成

### FR-6: 模块映射缺失时的降级处理

当 _module-map.yaml 不存在时，archive 流程不应中断。

- FR-6.1: extract-module-impact 步骤检测映射文件是否存在
- FR-6.2: 不存在时提示用户跑 scan 或手动创建
- FR-6.3: 所有文件归入 unmapped，不中断 archive

## 用户场景

### UC-1: 单模块变更归档

**Given** 一个变更只涉及 auth-service 模块
**When** 用户执行 archive 流程
**Then** 系统识别出 1 个受影响模块，生成 module-impact.md，更新 auth-service.md

### UC-2: 多模块变更归档

**Given** 一个变更涉及 auth-service、user-model、api-gateway 三个模块
**When** 用户执行 archive 流程
**Then** 系统识别出 3 个受影响模块，生成包含完整影响矩阵的 module-impact.md，分别更新三个模块文档

### UC-3: 未匹配路径

**Given** git diff 中有文件路径不在 _module-map.yaml 的任何模块映射中
**When** 系统执行模块影响分析
**Then** 将这些路径标记为 unmapped，提示用户补充模块映射

### UC-4: quick 任务自动同步

**Given** 用户通过 quick 任务修改了 auth-service 模块的代码
**When** quick 执行「暂存和更新记录」步骤
**Then** 系统检测到改动命中 auth-service 模块映射，直接更新 auth-service.md

### UC-5: quick 任务未命中模块

**Given** 用户通过 quick 任务修改了配置文件，不涉及任何已映射模块
**When** quick 执行「暂存和更新记录」步骤
**Then** 跳过模块文档同步，正常结束

### UC-6: 用户拒绝更新（archive 流程）

**Given** 系统在 archive 流程中生成了模块文档更新 patch
**When** 用户选择不确认
**Then** 不写入模块文档，但 module-impact.md 仍然保留

### UC-7: 首次归档（无模块文档）

## 非功能需求

- NFR-1: 模块映射匹配必须基于配置文件，不允许 AI 自由推断模块名
- NFR-2: 模块文档正文不超过 200 行，保持精炼
- NFR-3: 所有文件操作需要 author + created_at 元数据
