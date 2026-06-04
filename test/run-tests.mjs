import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(testDir)
  .filter(file => file.endsWith('.test.mjs'))
  .sort()

if (files.length === 0) {
  console.log('No test files found')
  process.exit(0)
}

for (const file of files) {
  console.log(`\nRunning ${file}`)
  await import(pathToFileURL(join(testDir, file)).href)
}

console.log(`\nAll ${files.length} test file(s) passed`)
