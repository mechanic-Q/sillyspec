import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['src']
const files = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full)
      continue
    }
    if (/\.(js|cjs|mjs)$/.test(entry)) files.push(full)
  }
}

for (const root of roots) walk(root)

for (const file of files.sort()) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

console.log(`Checked ${files.length} JavaScript files`)
