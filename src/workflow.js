/**
 * SillySpec Workflow Engine
 * 
 * 定义、检查和执行结构化工作流。
 * 职责：
 *   - 加载 .sillyspec/workflows/*.yaml
 *   - 运行 post_check 验证产物
 *   - 按角色定位失败 + 生成重试 prompt
 *   - 根据 role 定义生成 role prompts（Level 2）
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, resolve, basename } from 'path'
import jsYaml from 'js-yaml'

// ─── Workflow 加载 ───

/**
 * 查找并加载指定名称的 workflow YAML
 * @param {string} cwd - 项目根目录
 * @param {string} name - workflow 名称（如 'scan-docs'）
 * @returns {object|null} workflow 定义，或 null
 */
export function loadWorkflow(cwd, name) {
  const wfDir = join(cwd, '.sillyspec', 'workflows')
  if (!existsSync(wfDir)) return null

  // 优先找 <name>.yaml，其次找 <name>.yml
  for (const ext of ['.yaml', '.yml']) {
    const f = join(wfDir, `${name}${ext}`)
    if (existsSync(f)) {
      const raw = readFileSync(f, 'utf8')
      return jsYaml.load(raw)
    }
  }
  return null
}

/**
 * 列出所有可用 workflow
 */
export function listWorkflows(cwd) {
  const wfDir = join(cwd, '.sillyspec', 'workflows')
  if (!existsSync(wfDir)) return []
  const files = readdirSync(wfDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
  return files.map(f => f.replace(/\.(yaml|yml)$/, ''))
}

// ─── 占位符替换 ───

/**
 * 替换 workflow YAML 中的 <project> 占位符
 * @param {object} wf - workflow 定义（会被修改）
 * @param {string} projectName - 项目名
 */
function replaceProjectPlaceholder(wf, projectName) {
  const json = JSON.stringify(wf)
  const replaced = json.replace(/<project>/g, projectName)
  return JSON.parse(replaced)
}

// ─── Post Check ───

/**
 * 检查结果项
 * @typedef {{ role: string, output: string, path: string, check: string, passed: boolean, detail?: string }} CheckResult
 */

/**
 * 对单个 output 运行检查
 * @param {object} outputDef - output 定义
 * @param {string} basePath - 被检查的文件所在目录
 * @param {string} cwd - 项目根目录
 * @returns {CheckResult}
 */
function checkOutput(outputDef, projectName, cwd) {
  // 将 <project> 替换为实际项目名
  const rawPath = (outputDef.path || '').replace(/<project>/g, projectName)
  const fullPath = resolve(cwd, rawPath)
  const checks = outputDef.checks || []
  const results = []

  for (const check of checks) {
    switch (check.type) {
      case 'file_exists': {
        const exists = existsSync(fullPath)
        results.push({ passed: exists, check: 'file_exists', detail: exists ? '' : `文件不存在: ${rawPath}` })
        break
      }
      case 'no_empty_files': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const empty = content.trim().length === 0
          results.push({ passed: !empty, check: 'no_empty_files', detail: empty ? `文件为空: ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'no_empty_files', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'min_lines': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const lines = content.split('\n').length
          const min = check.min || 1
          results.push({ passed: lines >= min, check: `min_lines(${min})`, detail: lines >= min ? '' : `文件只有 ${lines} 行，要求至少 ${min} 行: ${rawPath}` })
        } else {
          results.push({ passed: false, check: `min_lines(${check.min || 1})`, detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'contains_sections': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const sections = check.sections || []
          const missing = sections.filter(s => !content.includes(`## ${s}`))
          results.push({ passed: missing.length === 0, check: 'contains_sections', detail: missing.length > 0 ? `缺少章节: ${missing.join(', ')} — ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'contains_sections', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'no_placeholder': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const patterns = check.patterns || ['待补充', 'TODO', 'TBD', '未分析', '根据项目情况', '根据实际情况', '按需填写']
          const matches = patterns.filter(p => content.includes(p))
          results.push({ passed: matches.length === 0, check: 'no_placeholder', detail: matches.length > 0 ? `包含占位文本: ${matches.map(m => `"${m}"`).join(', ')} — ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'no_placeholder', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      default:
        results.push({ passed: true, check: check.type, detail: `未知检查类型，跳过: ${check.type}` })
    }
  }

  return results
}

/**
 * 运行 workflow 的 post_check
 * @param {object} wf - workflow 定义
 * @param {string} cwd - 项目根目录
 * @param {string} projectName - 项目名
 * @returns {{ passed: boolean, roleResults: Array<{ roleId: string, roleName: string, passed: boolean, failures: string[] }>, workflowFailures: string[] }}
 */
export function runPostCheck(wf, cwd, projectName, placeholders = {}) {
  let resolved = replaceProjectPlaceholder(wf, projectName)
  // 额外占位符替换
  if (Object.keys(placeholders).length > 0) {
    let json = JSON.stringify(resolved)
    for (const [key, value] of Object.entries(placeholders)) {
      json = json.replace(new RegExp(`<${key}>`, 'g'), value)
    }
    resolved = JSON.parse(json)
  }

  const workflowChecks = resolved.checks?.workflow_level || []
  const roleResults = []
  const workflowFailures = []

  // 1. 角色级别检查
  for (const role of resolved.roles || []) {
    const roleId = role.id
    const roleName = role.name || roleId
    const outputs = role.outputs || []
    const failures = []

    for (const output of outputs) {
      const results = checkOutput(output, projectName, cwd)
      for (const r of results) {
        if (!r.passed) {
          failures.push(`${r.detail}`)
        }
      }
    }

    roleResults.push({
      roleId,
      roleName,
      passed: failures.length === 0,
      failures
    })
  }

  // 2. 工作流级别检查
  for (const check of workflowChecks) {
    switch (check.type) {
      case 'file_count': {
        const scanDir = join(cwd, '.sillyspec', 'docs', projectName, check.path || 'scan/')
        if (existsSync(scanDir)) {
          const files = readdirSync(scanDir).filter(f => f.endsWith('.md'))
          const min = check.min || 0
          if (files.length < min) {
            workflowFailures.push(`文件数不足: ${scanDir} 有 ${files.length} 个 .md 文件，要求至少 ${min} 个`)
          }
        } else {
          workflowFailures.push(`目录不存在: ${scanDir}`)
        }
        break
      }
      case 'no_empty_files': {
        const scanDir = join(cwd, '.sillyspec', 'docs', projectName, check.path || 'scan/')
        if (existsSync(scanDir)) {
          const files = readdirSync(scanDir).filter(f => f.endsWith('.md'))
          for (const f of files) {
            const content = readFileSync(join(scanDir, f), 'utf8')
            if (content.trim().length === 0) {
              workflowFailures.push(`空文件: ${join(scanDir, f)}`)
            }
          }
        }
        break
      }
      case 'no_duplicates': {
        // TODO: 按需实现
        break
      }
    }
  }

  return {
    passed: roleResults.every(r => r.passed) && workflowFailures.length === 0,
    roleResults,
    workflowFailures
  }
}

/**
 * 格式化 post_check 结果为人类可读报告
 */
export function formatCheckReport(result) {
  const lines = []
  lines.push('\n📋 Workflow Post-Check 报告\n')

  for (const r of result.roleResults) {
    const icon = r.passed ? '✅' : '❌'
    lines.push(`${icon} ${r.roleName} (${r.roleId})`)
    for (const f of r.failures) {
      lines.push(`   └─ ${f}`)
    }
  }

  if (result.workflowFailures.length > 0) {
    lines.push('')
    for (const f of result.workflowFailures) {
      lines.push(`❌ 全局检查失败: ${f}`)
    }
  }

  if (result.passed) {
    lines.push('\n✅ 全部检查通过')
  } else {
    lines.push('\n❌ 存在失败项，请根据以下重试提示修复：')
  }

  return lines.join('\n')
}

// ─── 重试 Prompt 生成 ───

/**
 * 根据检查失败结果生成重试 prompt
 * @param {object} wf - workflow 定义
 * @param {object} checkResult - runPostCheck 的返回值
 * @param {string} projectName - 项目名
 * @returns {string} 重试 prompt
 */
export function generateRetryPrompt(wf, checkResult, projectName) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const lines = []
  lines.push('上一次 workflow 执行存在失败项，请重试。\n')

  const roles = resolved.roles || []
  for (const r of checkResult.roleResults) {
    if (r.passed) continue
    const role = roles.find(rl => rl.id === r.roleId)
    if (!role) continue

    lines.push(`### 失败角色：${r.roleName} (${r.roleId})`)
    lines.push(`失败原因：`)
    for (const f of r.failures) {
      lines.push(`- ${f}`)
    }
    lines.push('')

    // 输出目标文件
    for (const output of (role.outputs || [])) {
      lines.push(`目标文件：\`${output.path}\``)
    }

    // 约束
    if (role.constraints && role.constraints.length > 0) {
      lines.push('约束：')
      for (const c of role.constraints) {
        lines.push(`- ${c}`)
      }
    }

    lines.push('')
    lines.push('⚠️ 你必须确保文件写入指定路径。不要只报告完成，请用 write 工具实际写入。')
    lines.push('')
  }

  return lines.join('\n')
}

// ─── Role Prompt 生成（Level 2）───

/**
 * 根据 workflow role 定义生成子代理 prompt
 * @param {object} wf - workflow 定义
 * @param {string} roleId - 角色ID
 * @param {string} projectName - 项目名
 * @param {object} context - 额外上下文（envSummary, missingDocs 等）
 * @returns {string|null} 生成的 prompt，或 null（角色不存在）
 */
export function generateRolePrompt(wf, roleId, projectName, context = {}) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const role = (resolved.roles || []).find(r => r.id === roleId)
  if (!role) return null

  const lines = []
  lines.push(`## 子代理任务：${role.name} (${roleId})`)
  lines.push('')
  lines.push(`项目：${projectName}`)

  // 任务描述
  if (role.task) {
    lines.push(`任务：${role.task}`)
  }

  // 输入提示
  const inputs = role.inputs || {}
  if (inputs.paths && inputs.paths.length > 0) {
    lines.push('')
    lines.push('搜索范围：')
    for (const p of inputs.paths) {
      lines.push(`- ${p}`)
    }
  }
  if (inputs.hints && inputs.hints.grep_patterns && inputs.hints.grep_patterns.length > 0) {
    lines.push('')
    lines.push('搜索关键词：')
    lines.push(`- ${inputs.hints.grep_patterns.join(', ')}`)
  }

  // 额外上下文
  if (context.envSummary) {
    lines.push('')
    lines.push('环境探测结果：')
    lines.push(context.envSummary)
  }
  if (context.missingDocs) {
    lines.push('')
    lines.push('缺失文档列表：')
    lines.push(context.missingDocs)
  }

  // 输出目标
  const outputs = role.outputs || []
  lines.push('')
  lines.push('目标文件：')
  for (const o of outputs) {
    lines.push(`- \`${o.path}\``)
  }

  // 约束
  if (role.constraints && role.constraints.length > 0) {
    lines.push('')
    lines.push('约束：')
    for (const c of role.constraints) {
      lines.push(`- ${c}`)
    }
  }

  // 检查要求（告诉子代理需要满足什么）
  for (const o of outputs) {
    const checks = o.checks || []
    for (const check of checks) {
      if (check.type === 'contains_sections' && check.sections) {
        lines.push('')
        lines.push(`必须包含章节：${check.sections.map(s => `"## ${s}"`).join(', ')}`)
      }
      if (check.type === 'min_lines') {
        lines.push(`文件长度要求：至少 ${check.min} 行`)
      }
    }
  }

  lines.push('')
  lines.push('⚠️ 必须用 write 工具将文件写入磁盘！写完后用 read 工具确认文件存在！')

  return lines.join('\n')
}

/**
 * 为 workflow 的所有角色生成 role prompts
 * @param {object} wf - workflow 定义
 * @param {string} projectName - 项目名
 * @param {object} context - 额外上下文
 * @returns {Array<{ roleId: string, roleName: string, prompt: string }>}
 */
export function generateAllRolePrompts(wf, projectName, context = {}) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const roles = resolved.roles || []
  return roles.map(role => ({
    roleId: role.id,
    roleName: role.name || role.id,
    prompt: generateRolePrompt(resolved, role.id, projectName, context)
  }))
}
