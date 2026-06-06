import { readFileSync, existsSync } from 'fs'

/**
 * 从 design.md 解析文件变更清单
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Set<string>} 文件路径集合（相对路径，如 "src/worktree.js"）
 */
export function parseFileChangeList(designMdPath) {
  const result = new Set()

  if (!designMdPath || !existsSync(designMdPath)) return result

  const content = readFileSync(designMdPath, 'utf8')

  // 定位"文件变更清单"标题
  const sectionRegex = /^#{2,3}\s*文件变更清单/m
  const sectionMatch = content.match(sectionRegex)
  if (!sectionMatch) return result

  // 从标题后开始，截取到下一个 ## 标题或文件末尾
  const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length)
  const nextSectionMatch = afterSection.match(/^##\s/m)
  const relevantContent = nextSectionMatch
    ? afterSection.slice(0, nextSectionMatch.index)
    : afterSection

  // 解析表格行
  const lines = relevantContent.split('\n')
  let headerSkipped = false
  for (const line of lines) {
    // 跳过分隔行和非表格行
    if (!line.startsWith('|') || /^\|[-:\s|]+\|$/.test(line)) continue

    const cells = line.split('|').slice(1, -1) // 去掉首尾空元素
    if (cells.length < 2) continue

    // 跳过 header 行（包含「文件路径」的表头）
 if (!headerSkipped) {
      headerSkipped = true
      continue
    }

    const filePath = cells[1].trim().replace(/^`|`$/g, '')

    // 忽略空路径、注释、.sillyspec/ 内的路径
    if (!filePath || filePath === '—' || filePath === '-' || filePath.startsWith('.sillyspec/')) continue

    result.add(filePath)
  }

  return result
}
