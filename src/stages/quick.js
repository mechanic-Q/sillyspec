export const definition = {
  name: 'quick',
  title: '快速任务',
  description: '跳过完整流程，直接做',
  auxiliary: true,
  steps: [
    {
      name: '理解任务',
      prompt: `解析任务参数，加载项目上下文。

### 操作
1. 检查是否携带 \`--change <变更名>\`，确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`（了解项目结构和技术栈）
4. 加载上下文：\`cat .sillyspec/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
5. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`（构建命令、测试命令、环境变量等）
6. 如有 \`--change\`，加载设计文档：\`cat .sillyspec/changes/<变更名>/design.md 2>/dev/null\`（理解设计意图）
7. 如有需要，查询知识库：\`cat .sillyspec/knowledge/INDEX.md 2>/dev/null\`

### 创建任务记录（必须执行）
理解完任务后，立即创建记录文件：
1. \`git config user.name\` 获取用户名
2. 无 \`--change\`：创建 \.sillyspec/quicklog/QUICKLOG-<git用户名>.md\`（已存在则追加），写入：
   \`\`\`
   ## YYYY-MM-DD HH:mm:ss — <一句话任务描述>
   状态：进行中
   文件：<预估要改的文件>
   \`\`\`
3. 有 \`--change\`：在 \`.sillyspec/changes/<变更名>/tasks.md\` 追加未勾选的 task

这样 Gate 检测到 \.sillyspec/\` 下有变更，就不会拦截后续的代码修改。

### 输出
任务理解 + 上下文摘要 + quicklog 已创建`,
      outputHint: '任务理解',
      optional: false
    },
    {
      name: '实现并验证',
      prompt: `实现任务。

### 操作
1. 先读后写：调用已有方法前 \`cat\` 源文件确认签名，\`grep\` 确认方法存在
2. 写代码完成任务
3. 如涉及逻辑变更，建议写单元测试验证（不强制，纯配置/文档/小改动可跳过）
4. **不要编译！** 除非用户明确要求或改动量很大

### 输出
实现摘要 + 修改文件列表

### 铁律
- 不要修改无关文件
- 不要编造不存在的 CLI 子命令
- **Reverse Sync**：如果发现 Bug 是 design.md 遗漏导致的，先修 design.md 再修代码`,
      outputHint: '实现摘要',
      optional: false
    },
    {
      name: '暂存和更新记录',
      prompt: `Git 暂存并更新任务记录。

### 操作
1. \`git add -A\` — 暂存改动文件（不要 commit，由用户通过统一提交工具处理）
2. 更新 Step 1 创建的记录：
   - 无 \`--change\`：更新 QUICKLOG 条目，将「状态：进行中」改为「状态：已完成」，补充实际改动文件和结果摘要
   - 有 \`--change\`：勾选 tasks.md 中对应的 task checkbox
3. QUICKLOG 轮转：超过 500 行则重命名为 \`QUICKLOG-<USER>-YYYY-MM-DD.md\`
4. 如果发现项目特有的坑，追加到 \`.sillyspec/knowledge/uncategorized.md\`
5. 任务比预期复杂 → 建议用完整流程

### 输出
暂存确认 + 记录路径`,
      outputHint: '暂存和记录确认',
      optional: false
    }
  ]
}
