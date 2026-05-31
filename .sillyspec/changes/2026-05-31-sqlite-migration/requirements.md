# Requirements

author: qinyi
created_at: 2026-05-31 10:51:00

## 角色

| 角色 | 说明 |
|---|---|
| CLI 用户 | 使用 sillyspec 命令行的开发者 |
| AI Agent | 执行 sillyspec run 的 AI（Claude/GPT 等） |
| 平台管理员 | SillyHub 上的审批操作者 |

## 功能需求

### FR-01: SQLite 初始化

Given 项目目录下运行 `sillyspec init`
When .sillyspec/.runtime/sillyspec.db 不存在
Then 创建 SQLite 数据库文件，执行 schema 初始化（建表 + 建索引）

Given 项目目录下运行 `sillyspec init`
When .sillyspec/.runtime/sillyspec.db 已存在
Then 跳过创建，输出"已存在"提示

### FR-02: 变更管理

Given 运行 `sillyspec run brainstorm`（或任何流程入口阶段）
When 未指定 `--change`
Then 自动生成变更名（YYYY-MM-DD-new-change），INSERT INTO changes + 批量 INSERT stages

Given 运行 `sillyspec run brainstorm --change <name>`
When changes 表中不存在该 name
Then INSERT INTO changes + 批量 INSERT stages

Given 运行 `sillyspec run brainstorm --change <name>`
When changes 表中已存在该 name
Then 读取现有记录，继续执行

### FR-03: 阶段和步骤 CRUD

Given 运行 `sillyspec run <stage> --done --output "..."`
When 当前步骤已完成
Then UPDATE steps SET status='completed', output=..., completed_at=...
And 如果该阶段所有步骤都完成，UPDATE stages SET status='completed', completed_at=...

Given 运行 `sillyspec run <stage>`
When CLI 输出当前步骤 prompt
Then steps 表中该步骤状态为 pending 或 in-progress

### FR-04: 进度查看

Given 运行 `sillyspec progress show`
When 无活跃变更
Then 输出"没有活跃的变更"

Given 运行 `sillyspec progress show`
When 有多个活跃变更
Then 列出所有变更的 name、current_stage、last_active

Given 运行 `sillyspec progress show --change <name>`
When 变更存在
Then 输出变更详情（阶段列表、步骤状态、批量进度）

### FR-05: gate-status.json 生成

Given 任意活跃变更进入 execute 或 quick 阶段
When ProgressManager 写入状态
Then 自动生成 .sillyspec/.runtime/gate-status.json

Given 所有活跃变更都不在 execute 或 quick 阶段
When ProgressManager 写入状态
Then 自动删除 .sillyspec/.runtime/gate-status.json

### FR-06: 平台连接

Given 运行 `sillyspec platform connect --url <url> --token <token>`
When API 可达
Then 测试连通性 → 查找/创建 workspace → 匹配已有 changes → 全量同步一次

Given 运行 `sillyspec platform connect`
When API 不可达
Then 输出错误信息，不阻塞 CLI 其他命令

### FR-07: 平台同步

Given 平台已连接且 `platform.sync: true`
When 任意状态变更（step 完成、阶段切换等）
Then 自动调用 sync.js 增量同步当前变更状态到平台

Given 平台同步失败
When 网络异常或 API 错误
Then 输出 warning，不阻塞 CLI 执行

### FR-08: 审批检查

Given 平台已连接且当前阶段为 execute
When 调用 `sillyspec run execute`
Then 先调用 `sync.checkApproval()`，approved/not_required 才放行

Given 离线模式或未连接平台
When 调用 `sillyspec run execute`
Then 跳过审批检查

### FR-09: archive 阶段

Given 变更完成 verify 并进入 archive
When 执行 archive
Then UPDATE changes SET status='archived' + 物理移动 changes/<name>/ 到 changes/archive/ + 写 history 文件

## 非功能需求

- **零编译依赖**：npm install 后可直接运行，无需编译环境
- **API 兼容**：ProgressManager 公开方法签名与改造前完全一致
- **回退安全**：SQLite 损坏时，sillyspec doctor 能检测并提示重建
- **性能**：单次 read/write 操作 < 50ms
