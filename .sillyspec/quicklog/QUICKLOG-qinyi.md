
### [2026-05-13] 修复 ProjectOverview.vue resetLayout 重复声明
- author: qinyi
- created_at: 2026-05-13T09:59:00Z
**问题**：Vue 编译错误 "Identifier 'resetLayout' has already been declared"
**原因**：第 40 行从 useLayout 解构 resetLayout，第 51 行又定义同名函数
**修复**：删除解构声明，保留本地函数（含确认对话框）
**文件**：packages/dashboard/src/components/ProjectOverview.vue


### [2026-05-13] 修复 dashboard 项目扫描数据格式不一致
- author: qinyi
- created_at: 2026-05-13T10:15:00Z
**问题**：dashboard 显示"0 个项目"
**原因**：watcher.js 发送的项目数据缺少 overview 字段，与 server/index.js 的 projects:init 格式不一致
**修复**：watcher.js 添加 parseProjectOverview 导入和调用，所有发送的数据现在包含 state 和 overview
**文件**：packages/dashboard/server/watcher.js

## ql-20260604-001-7a4c | 2026-06-04 16:47:41 | 对齐文件生命周期文档与工具实现
状态：已完成
文件：src/stages/brainstorm.js, src/stages/propose.js, src/stages/scan.js, src/run.js, src/progress.js, src/hooks/worktree-guard.js, test/*.mjs, docs/sillyspec/file-lifecycle*.md, .sillyspec/docs/sillyspec/modules/{stages,runtime}.md
结果：修复阶段步骤丢失、local.yaml 口径、archive confirm、sync/approval 参数接线和 worktree guard 登记校验；更新生命周期文档与剩余差异清单；新增回归测试并通过 lint/test。
