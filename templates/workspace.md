## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改子项目目录下的任何文件
- ❌ 写非法 YAML
- ❌ 使用绝对路径（必须是相对路径）

## 用户指令
$ARGUMENTS

---

## 流程

### Step 1: 检查配置

```bash
ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .
```

不存在 → 询问是否初始化工作区。

### Step 2: 解析指令

- 无参数 / `status` → 显示状态
- `add` → 添加子项目

**添加流程：**
1. AskUserQuestion 询问子项目名称、目录路径、角色描述
2. **自动检测 git 远程地址：**
```bash
git -C <path> remote get-url origin 2>/dev/null
```
检测到则写入 repo 字段，检测不到则留空
3. 创建 `.sillyspec/projects/<name>.yaml` 文件
- `remove` → 删除 `.sillyspec/projects/<name>.yaml` 文件
- `sync` → 同步子项目（clone 缺失的，检查冲突）

### Step 3: 执行操作

**初始化工作区：** 询问名称 → 逐个添加子项目（名称、路径、角色描述，验证路径存在）→ 共享规范 → 创建 `projects/*.yaml` + `.sillyspec/shared/`

**添加/移除子项目：** 创建或删除 `projects/<name>.yaml`，Git 提交。

**状态显示：** 读取每个子项目的 `.sillyspec/` 内容（PROJECT.md、docs/<project>/scan/ 文档数、进行中变更），输出格式：

```
🏢 工作区：<name>
📦 子项目（N 个）：
  ✅ frontend  ./frontend    前端 - Vue3+TS    已扫描（7 份文档）
  ⚠️ backend   ./backend     后端 - Node.js     已初始化（未扫描）
📄 共享规范：2 份
💡 操作：/sillyspec:workspace add | /sillyspec:init | /sillyspec:scan
```

### 读取子项目信息

```bash
for f in .sillyspec/projects/*.yaml; do
  [ -f "$f" ] || continue
  proj_name=$(basename "$f" .yaml)
  proj_path=$(grep '^path:' "$f" | head -1 | sed 's/^path:[[:space:]]*//')
  proj_role=$(grep '^role:' "$f" | head -1 | sed 's/^role:[[:space:]]*//')
  proj_repo=$(grep '^repo:' "$f" | head -1 | sed 's/^repo:[[:space:]]*//')
  # 检查文档数、变更数等
  doc_count=$(ls "$proj_path"/.sillyspec/docs/$proj_name/scan/*.md 2>/dev/null | wc -l)
  echo "  $proj_name  $proj_path    $proj_role    docs:$doc_count"
done
```
