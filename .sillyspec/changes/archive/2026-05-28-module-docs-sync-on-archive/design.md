# module-docs-sync-on-archive — 设计

author: qinyi
created_at: 2026-05-28 11:13:00

## 设计决策

### D1: 模块映射配置格式

选择 YAML 格式的 `_module-map.yaml`，原因：
- 支持通配符路径匹配
- 人类可读可编辑
- 与 SillySpec 其他配置文件风格一致

```yaml
modules:
  auth-service:
    paths:
      - src/auth/**
      - src/middleware/auth/**
    description: 用户认证与授权服务
  
  user-model:
    paths:
      - src/models/user.*
      - src/entities/user/**
    description: 用户数据模型
```

### D2: 模块影响分析的信息源交叉验证

不依赖单一信息源，使用三重交叉：
1. proposal.md / design.md 中声明的变更范围
2. tasks.md 中实际完成的任务
3. `git diff --name-only` 的真实文件变更

三者取并集，以 git diff 为准（真实 > 声明）。

### D3: 模块文档模板

```markdown
# <module-name>

> 最后更新：YYYY-MM-DD
> 最近变更：<change-name>
> 模块路径：<glob patterns>

## 职责
（一句话）

## 当前设计
（架构、数据流、关键逻辑 — 每次归档时重写为当前状态）

## 对外接口
| 接口 | 说明 | 调用方 |

## 关键数据流
（text 格式的流程图）

## 设计决策
| 决策 | 理由 | 来源 |

## 依赖关系
### 依赖本模块
### 本模块依赖

## 注意事项
（维护提醒、已知限制）

## 变更索引
| 日期 | 变更 | 摘要 |
```

### D4: archive 步骤顺序

```
现有步骤 1: 任务完成度检查
新增步骤 2: extract-module-impact  ← 新增
新增步骤 3: sync-module-docs       ← 新增
现有步骤 2→4: 确认归档
现有步骤 3→5: 更新路线图和提交
```

插入在"任务完成度检查"之后、"确认归档"之前，确保模块文档更新在物理归档（移动目录）之前完成。

### D5: sync-module-docs 的确认机制

使用 archive 步骤的标准流程：AI 生成 patch → 展示给用户 → 用户通过 `--done --output "确认/拒绝"` 反馈。这与现有 archive 步骤的交互模式一致，不需要额外的确认机制。

## 文件变更清单

### 修改
| 文件 | 变更说明 |
|------|---------|
| `src/stages/archive.js` | 在 steps 数组中插入 2 个新步骤（index 1 和 2） |
| `src/stages/scan.js` | 在 steps 数组末尾新增 1 个步骤（生成 _module-map.yaml） |
| `src/stages/quick.js` | 在「暂存和更新记录」步骤 prompt 中增加模块文档同步逻辑 |

### 不变
| 文件 | 原因 |
|------|------|
| `src/progress.js` | 步骤由 stage 定义自动注册，无需改代码 |
| `src/stages/index.js` | registry 不变，archive 和 scan 注册方式不变 |
| `src/index.js` | 独立命令暂不在此次实现（见 D6） |
| `src/run.js` | run 逻辑不变 |

### 新增（运行时生成，非源码）
| 文件 | 说明 |
|------|------|
| `docs/<project>/modules/_module-map.yaml` | scan 生成 |
| `docs/<project>/modules/_index.md` | 模块总览（可选） |
| `docs/<project>/modules/<module>.md` | 模块文档 |
| `changes/<change>/module-impact.md` | 影响分析 |

### D6: 独立命令延期

`silly sync-modules <change>` 需要在 index.js 中新增子命令解析，涉及 CLI 架构改动。本次通过在 archive 步骤中实现完整逻辑，独立命令作为后续优化。

### D7: quick 任务与模块文档同步

quick 不走 archive 流程，直接结束。但 quick 改了代码后模块文档不能不更新。

同步成本极低（只读写几个 md/yaml 文件，不涉及编译/测试/网络），所以直接在 quick 的「暂存和更新记录」步骤中同步：
1. 读取 `_module-map.yaml`（不存在则跳过，不中断）
2. 对比本次 git diff 修改的文件
3. 如果命中模块映射 → 直接更新对应模块文档（与 archive 的 sync-module-docs 相同逻辑）
4. 如果未命中任何模块 → 跳过，不做额外操作

这样 quick 保持轻量（多花几秒读写文件），同时保证模块文档始终是最新的。

### D8: _module-map.yaml 的初始化时机

scan 阶段生成初稿，但如果用户还没跑过 scan 就直接 archive 怎么办？

处理方式：extract-module-impact 步骤中，如果 `_module-map.yaml` 不存在，先提示用户跑 scan 或手动创建，不强制中断 archive。模块映射为空时，module-impact.md 中所有文件都归入 unmapped。

## 数据模型

### module-impact.md 结构

```markdown
# 模块影响分析

## 变更：<change-name>

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 |
|------|----------|----------|-------------|
| auth-service | 逻辑变更 | src/auth/** | 重构 token 校验 |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|

## 更新结果
| 模块文档 | 操作 | 状态 |
|----------|------|------|
| auth-service.md | 更新 | ✅ 已确认 |
```

## 代码风格参照

遵循现有 SillySpec 阶段定义模式：
- `export const definition = { name, title, description, steps: [...] }`
- 每个 step 包含 name、prompt、outputHint、optional
- prompt 中使用 markdown 格式的操作指令
