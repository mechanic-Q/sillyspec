---
author: qinyi
created_at: 2026-06-03T17:35:00+08:00
updated_at: 2026-06-03T17:35:00+08:00
---

# Worktree 管理模块文档

## 模块信息

| 属性 | 值 |
|------|-----|
| 模块 ID | worktree |
| 文件 | src/worktree.js, src/worktree-apply.js |
| 依赖 | git >= 2.15 |

## 定位

Worktree 管理为 execute 阶段提供代码隔离环境。

**负责什么**：
- 创建 git worktree 作为子代理的隔离工作目录
- overlay 主工作区未提交变更（staged + unstaged + untracked）到 worktree
- 创建 baseline checkpoint commit 区分"前置改动"和"子代理新增改动"
- 生成 task-only diff 和 full diff
- 校验主工作区 baseline 是否在 execute 期间被修改
- 3way apply task patch 回主工作区

**不负责什么**：
- 不启动子代理进程
- 不做代码审查（那是 verify 的职责）
- 不做 CI/CD 集成

## 核心设计原则

1. **用户不需要为了并行子代理强制 commit**。execute 创建 worktree 时会 overlay 主工作区 dirty baseline。
2. **dirty baseline overlay 是 execute 的前置条件，不是 best-effort 优化**。有 dirty baseline 时 overlay 失败必须 fail-fast。
3. **overlay 后创建 baseline checkpoint commit**。这个 commit 不进主分支 git log，只用来做 diff 分界点。
4. **子代理产物从 baselineCommit 开始计算**。task diff 只包含子代理新增改动。
5. **verify 可以看 full diff，但 merge 只合 task diff**。不会重复合并前置 dirty 改动。
6. **merge 前必须校验主工作区 baseline 未变化**。变化则禁止自动 apply。

## 文件

| 文件 | 职责 |
|------|------|
| src/worktree.js | 创建、overlay、checkpoint、cleanup |
| src/worktree-apply.js | diff 生成、校验、3way apply |

## 完整链路

```
主工作区（可能有 dirty baseline）
  ↓
采集 staged / unstaged / untracked
  ↓
创建 worktree（分支：sillyspec/<change-name>）
  ↓
overlay dirty baseline（git diff + git apply）
  ↓
创建 baseline checkpoint commit（有 dirty 时）
  ↓
子代理在 worktree 内执行
  ↓
生成 task.patch（baselineCommit → 工作区）和 full.patch（baseHash → 工作区）
  ↓
merge 前校验主工作区 baseline hash 未变化
  ↓
git apply --3way task.patch 回主工作区
  ↓
cleanup worktree + 删除分支
```

## meta.json 结构

```json
{
  "changeName": "2026-06-03-some-change",
  "branch": "sillyspec/2026-06-03-some-change",
  "baseBranch": "main",
  "baseHash": "abc1234...",
  "actualBaseHash": "def5678...",
  "createdAt": "2026-06-03T17:30:00+08:00",
  "worktreePath": "/path/to/.sillyspec/.runtime/worktrees/...",
  "baselineFiles": ["src/a.js", "src/b.py"],
  "baselineCommit": "ghi9012...",
  "baselineHash": "953c8ed30ac21c88"
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| baseHash | worktree 创建时的 HEAD commit |
| actualBaseHash | fetch+merge 远程后的实际 HEAD |
| baselineFiles | 从主工作区 overlay 过来的文件列表 |
| baselineCommit | overlay 后创建的 checkpoint commit hash；无 dirty baseline 时为 null |
| baselineHash | 主工作区 dirty baseline 的 sha256 摘要（前 16 位），用于 merge 前防漂移校验；无 dirty baseline 时为 null |

**注意**：`baselineCommit: null` 不是异常，表示主工作区创建时是 clean 的，diff 起始点 fallback 到 baseHash。

## CLI 用法

```bash
# 创建 worktree（自动 overlay dirty baseline + 创建 baseline checkpoint）
sillyspec worktree create <change-name>

# 检查 worktree 变更（只输出检查结果）
sillyspec worktree apply <change-name> --check-only

# 应用 worktree 变更到主工作区（只合 task diff）
sillyspec worktree apply <change-name>

# 清理 worktree（删除目录 + 分支）
sillyspec worktree cleanup <change-name>
```

## Baseline Hash 计算

```js
raw = `staged:${git diff --cached}\nunstaged:${git diff}\nuntracked:${git ls-files --others}`
hash = sha256(raw).slice(0, 16)
```

## 回归测试结果

7 个 case 全部通过（2026-06-03）：
`.sillyspec/changes/workflow-system-archive/baseline-checkpoint-test.md`

## 已知约束

- baseline commit 使用临时 git identity（sillyspec / sillyspec@baseline），不影响用户 git config
- overlay 使用 git diff --binary + git apply，理论上覆盖 delete/rename/binary
- worktree 存储在 `.sillyspec/.runtime/worktrees/`，已在 .gitignore 中
- untracked 文件通过逐文件复制，不处理空目录

## 人工备注

<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
