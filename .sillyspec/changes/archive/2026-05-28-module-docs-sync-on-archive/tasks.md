# module-docs-sync-on-archive — 任务

author: qinyi
created_at: 2026-05-28 11:14:00

## 1. scan 阶段模块映射生成
- [ ] `src/stages/scan.js` — 在 steps 数组末尾新增步骤：生成 _module-map.yaml
- [ ] 步骤应分析项目目录结构自动推导模块
- [ ] 生成路径：`.sillyspec/docs/<project>/modules/_module-map.yaml`
- [ ] YAML 包含模块名、路径 glob、描述

## 2. archive 步骤插入：extract-module-impact
- [ ] `src/stages/archive.js` — 在 steps 数组 index 1 位置插入新步骤
- [ ] 步骤 prompt 指导 AI 综合三个信息源（proposal/design/tasks + git diff）分析模块影响
- [ ] 输出 `changes/<change>/module-impact.md`

## 3. archive 步骤插入：sync-module-docs
- [ ] `src/stages/archive.js` — 在 steps 数组 index 2 位置插入新步骤
- [ ] 步骤 prompt 指导 AI 根据 module-impact.md 生成模块文档 patch
- [ ] 展示 patch 给用户确认
- [ ] 确认后写入 `.sillyspec/docs/<project>/modules/*.md`

## 4. 模块文档模板
- [ ] 设计模块文档的标准模板结构（见 design.md D3）
- [ ] 在 `src/stages/archive.js` sync-module-docs 步骤 prompt 中嵌入模板
- [ ] 模板支持新建（全量生成）和更新（只改相关章节）两种场景

## 5. quick 阶段模块文档同步
- [ ] `src/stages/quick.js` — 在「暂存和更新记录」步骤 prompt 中增加模块文档同步逻辑
- [ ] 读取 `_module-map.yaml`，匹配 git diff 文件到模块
- [ ] 命中模块时直接更新模块文档（与 archive 同步逻辑一致）
- [ ] 未命中或映射文件不存在时跳过，不中断

## 6. _module-map.yaml 缺失时的降级处理
- [ ] `src/stages/archive.js` extract-module-impact 步骤 prompt 中处理映射文件不存在的情况
- [ ] 映射为空时所有文件归入 unmapped，不中断 archive

## 7. 验证
- [ ] 确认 `src/stages/archive.js` 步骤顺序正确（5步）
- [ ] 确认 `src/stages/scan.js` 新步骤不影响现有流程
- [ ] 确认 `src/stages/quick.js` 提示逻辑不影响快速任务流程
- [ ] 确认 `module-impact.md` 格式符合 design.md 定义
- [ ] 确认模块文档模板可落地
