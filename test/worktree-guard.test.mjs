import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { shouldBlock } from '../src/hooks/worktree-guard.js'

const root = join(tmpdir(), `sillyspec-guard-test-${Date.now()}`)
const changeName = '2026-06-04-guard-test'
const runtimeDir = join(root, '.sillyspec', '.runtime')
const registeredWorktree = join(runtimeDir, 'worktrees', changeName)
const unregisteredWorktree = join(runtimeDir, 'worktrees', 'other-change')

mkdirSync(registeredWorktree, { recursive: true })
mkdirSync(unregisteredWorktree, { recursive: true })
writeFileSync(join(runtimeDir, 'gate-status.json'), JSON.stringify({
  stage: 'execute',
  changes: [changeName],
  updatedAt: new Date().toISOString(),
}, null, 2))
writeFileSync(join(registeredWorktree, 'meta.json'), JSON.stringify({
  changeName,
  worktreePath: registeredWorktree,
  mode: 'worktree',
}, null, 2))

try {
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(registeredWorktree, 'src', 'ok.js'), cwd: root }).blocked,
    false,
    'registered worktree writes should be allowed'
  )

  assert.equal(
    shouldBlock({ tool: 'Bash', command: 'npm run build', cwd: registeredWorktree }).blocked,
    false,
    'bash commands from a registered worktree cwd should be allowed'
  )

  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(unregisteredWorktree, 'src', 'blocked.js'), cwd: root }).blocked,
    true,
    'unregistered worktree storage writes should be blocked'
  )

  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, '.sillyspec', 'docs', 'note.md'), cwd: root }).blocked,
    false,
    'ordinary .sillyspec docs should remain writable'
  )

  rmSync(join(runtimeDir, 'gate-status.json'), { force: true })
  writeFileSync(join(root, '.sillyspec', 'local.yaml'), [
    'worktreeHook:',
    '  readonlyCommands:',
    '    - custom-read',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Bash', command: 'custom-read status', cwd: root }).blocked,
    false,
    '.sillyspec/local.yaml readonlyCommands should extend the bash whitelist'
  )

  writeFileSync(join(runtimeDir, 'gate-status.json'), JSON.stringify({
    stage: 'quick',
    changes: [changeName],
    updatedAt: new Date().toISOString(),
  }, null, 2))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, 'src', 'quick.js'), cwd: root }).blocked,
    false,
    'quick writes should still be allowed in the main workspace'
  )

  console.log('✅ worktree guard regression checks passed')
} finally {
  rmSync(root, { recursive: true, force: true })
}
