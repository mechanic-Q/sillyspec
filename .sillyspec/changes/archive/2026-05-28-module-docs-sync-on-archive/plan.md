# module-docs-sync-on-archive — 实现计划

author: qinyi
created_at: 2026-05-28 11:22:00

## Wave 1: 基础能力（模块映射 + 步骤骨架）

- [x] task-01: scan 阶段新增模块映射生成步骤 (`src/stages/scan.js`)
- [x] task-02: archive.js 插入 extract-module-impact 步骤 (`src/stages/archive.js`)
- [x] task-03: archive.js 插入 sync-module-docs 步骤 (`src/stages/archive.js`)

## Wave 2: quick 集成 + 降级处理

- [x] task-04: quick.js 增加模块文档同步逻辑 (`src/stages/quick.js`)
- [x] task-05: _module-map.yaml 缺失降级处理 (`src/stages/archive.js` extract-module-impact prompt)

## Wave 3: 验证

- [x] task-06: 验证步骤顺序和流程完整性 (`src/stages/archive.js`, `src/stages/scan.js`, `src/stages/quick.js`)

## 依赖关系

- task-03 依赖 task-02（需要 module-impact.md）
- task-04 依赖 task-03（参考 archive 同步逻辑模板）
- task-05 依赖 task-02（修改 extract-module-impact 的 prompt）
- task-06 依赖 task-01 ~ task-05 全部完成

## 全局验收标准

1. archive 流程从 3 步变为 5 步，原有逻辑不受影响
2. scan 流程从 9 步变为 10 步，原有逻辑不受影响
3. quick 第 3 步增加模块文档同步，不影响原有暂存功能
4. 模块文档正文描述当前状态，底部只有轻量变更索引
5. _module-map.yaml 不存在时 archive 不中断
