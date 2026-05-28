# 模块影响分析

author: qinyi
created_at: 2026-05-28 11:42:00

## 变更：module-docs-sync-on-archive

## 模块映射状态
⚠️ `_module-map.yaml` 不存在（未执行 scan 生成模块映射）。建议归档后运行 `sillyspec run scan` 生成初始映射。

## 模块影响矩阵

本次变更无模块映射，无法自动匹配。基于代码结构手动分析：

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 |
|------|----------|----------|-------------|
| stages | 逻辑变更 | src/stages/archive.js | archive 从 3 步扩展为 5 步，新增 extract-module-impact 和 sync-module-docs |
| stages | 逻辑变更 | src/stages/scan.js | 末尾新增"生成模块映射"步骤（optional） |
| stages | 逻辑变更 | src/stages/quick.js | 第 3 步增加模块文档同步逻辑 |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| package.json | npm link 修改（非功能变更） |
| package-lock.json | npm link 锁文件更新 |

## 更新结果
| 模块文档 | 操作 | 状态 |
|----------|------|------|
| stages.md | 新建 | ✅ 已确认写入 |
