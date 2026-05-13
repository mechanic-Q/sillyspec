export const definition = {
  name: 'explore',
  title: '自由探索',
  description: '讨论、调研、画图，不写实现代码',
  auxiliary: true,
  steps: [
    {
      name: '自由探索',
      prompt: `围绕用户给出的话题做技术探索，不进入实现。

### 操作
1. 明确探索边界：这次只讨论、调研、画图和识别风险
2. 如果需要代码库上下文，可以读取：
   - \`.sillyspec/projects/*.yaml\`
   - \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
   - \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
   - \`.sillyspec/changes/<change-name>/design.md\`
3. 可以用 \`rg\` / \`ls\` / \`cat\` 调查已有结构和集成点
4. 输出 2-3 个有价值方向、关键风险和下一步建议
5. 如果用户要求保存结论，先明确保存位置，再写入对应文档

### 输出
探索结论、选项对比、风险清单或 ASCII 图

### 铁律
- 不写实现代码
- 不安装依赖
- 不修改文件，除非用户明确要求保存探索结论
- 不强行推进到 brainstorm/plan/execute`,
      outputHint: '探索结论',
      optional: false
    }
  ]
}
