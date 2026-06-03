/**
 * SillySpec WorktreeManager — git worktree 生命周期管理
 *
 * 封装 git worktree 的 create/list/cleanup/getMeta 操作，
 * 为 execute 阶段提供代码隔离环境。
 *
 * worktree 存储目录：.sillyspec/.runtime/worktrees/<change-name>/
 * 分支命名：sillyspec/<change-name>
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

const WORKTREES_REL = '.sillyspec/.runtime/worktrees';
const BRANCH_PREFIX = 'sillyspec/';
const META_FILE = 'meta.json';

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function gitQuiet(cwd, args) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function validateChangeName(changeName) {
  if (!changeName || typeof changeName !== 'string' || changeName.trim() === '') {
    throw new Error('changeName 不能为空');
  }
  const trimmed = changeName.trim();
  // 禁止路径穿越
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error(`changeName 不合法: "${changeName}"，不能包含 ..、/ 或 \\`);
  }
  return trimmed;
}

/**
 * 检测 git worktree 是否可用
 * @param {string} cwd
 * @returns {{ supported: boolean, version: string|null, reason?: string }}
 */
export function isGitWorktreeSupported(cwd = process.cwd()) {
  try {
    const raw = execSync('git --version', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const match = raw.match(/git version (\d+)\.(\d+)/);
    if (!match) return { supported: false, version: raw, reason: 'cannot parse version' };
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major > 2 || (major === 2 && minor >= 15)) {
      return { supported: true, version: raw };
    }
    return { supported: false, version: raw, reason: 'git version < 2.15' };
  } catch {
    return { supported: false, version: null, reason: 'git not found' };
  }
}

export class WorktreeManager {
  constructor({ cwd, worktreeDir } = {}) {
    this.cwd = cwd || process.cwd();
    this.worktreeBase = worktreeDir || resolve(this.cwd, WORKTREES_REL);
  }

  /**
   * 获取 worktree 目录绝对路径
   * @param {string} changeName
   * @returns {string}
   */
  getWorktreePath(changeName) {
    return resolve(this.worktreeBase, changeName);
  }

  /**
   * 读取 worktree 元数据
   * @param {string} changeName
   * @returns {object|null} meta.json 内容，不存在或损坏返回 null
   */
  getMeta(changeName) {
    const name = validateChangeName(changeName);
    const metaPath = join(this.getWorktreePath(name), META_FILE);
    if (!existsSync(metaPath)) return null;
    return parseJSON(readFileSync(metaPath, 'utf8'));
  }

  /**
   * 创建 worktree
   * @param {string} changeName - 变更名
   * @param {{ base?: string }} opts - base: 基础分支，默认当前 HEAD
   * @returns {{ branch: string, worktreePath: string, baseHash: string }}
   * @throws {Error} worktree 已存在、git 不可用、changeName 为空
   */
  create(changeName, { base } = {}) {
    const name = validateChangeName(changeName);
    const worktreePath = this.getWorktreePath(name);
    const branch = BRANCH_PREFIX + name;

    // 1. 检查 worktree 是否已存在
    if (existsSync(worktreePath)) {
      // 目录在但 meta.json 不存在（幽灵状态），自动清理
      if (!this.getMeta(name)) {
        console.log(`⚠️  检测到幽灵 worktree 目录（无 meta.json），自动清理...`);
        try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}
      } else {
        throw new Error(`worktree already exists: ${name}. Run cleanup first.`);
      }
    }

    // 2. 检查分支是否已存在
    if (gitQuiet(this.cwd, `rev-parse --verify refs/heads/${branch}`)) {
      throw new Error(`branch already exists: ${branch}. Run cleanup first.`);
    }

    // 3. 解析 base 分支
    let baseBranch = base;
    let baseHash;
    if (baseBranch) {
      baseHash = git(this.cwd, `rev-parse ${baseBranch}`);
    } else {
      // 默认用当前 HEAD
      baseBranch = gitQuiet(this.cwd, `symbolic-ref --short HEAD`) || git(this.cwd, `rev-parse HEAD`);
      baseHash = git(this.cwd, `rev-parse HEAD`);
    }

    // 4. 创建 worktree 根目录
    if (!existsSync(this.worktreeBase)) {
      mkdirSync(this.worktreeBase, { recursive: true });
    }

    // 5. 创建 worktree（含版本检测）
    try {
      git(this.cwd, `worktree add ${worktreePath} -b ${branch} ${baseHash}`);
    } catch (e) {
      const check = isGitWorktreeSupported(this.cwd);
      if (!check.supported) {
        throw new Error(`git worktree add 失败: ${e.stderr || e.message}\n\n${check.reason ? `原因: ${check.reason}` : ''}\n建议: 使用 --no-worktree 标志跳过隔离，或升级 git 到 >= 2.15`);
      }
      throw new Error(`git worktree add 失败: ${e.stderr || e.message}`);
    }

    // 5.5 自动同步远程最新代码（防止 worktree 基于过时的 commit）
    try {
      // 先 fetch origin
      gitQuiet(worktreePath, 'fetch origin');

      // 尝试 merge origin/main（或 origin/master）到 worktree 分支
      const defaultBranch = gitQuiet(this.cwd, 'symbolic-ref refs/remotes/origin/HEAD --short')?.replace('origin/', '')
        || gitQuiet(this.cwd, 'rev-parse --abbrev-ref origin/main') ? 'main'
        : gitQuiet(this.cwd, 'rev-parse --abbrev-ref origin/master') ? 'master'
        : null;

      if (defaultBranch) {
        // 检查 worktree 是否落后于远程
        const localHead = gitQuiet(worktreePath, 'rev-parse HEAD');
        const remoteHead = gitQuiet(worktreePath, `rev-parse origin/${defaultBranch}`);

        if (localHead && remoteHead && localHead !== remoteHead) {
 // 检查是否有共同祖先（避免完全不相关的分支强行 merge）
          const mergeBase = gitQuiet(worktreePath, `merge-base ${localHead} origin/${defaultBranch}`);
          if (mergeBase) {
            git(worktreePath, `merge origin/${defaultBranch} --ff-only`);
          }
        }
      }
    } catch {
 // fetch/merge 失败不影响 worktree 创建，只记录警告
    }

    // 5.6 Dirty baseline overlay：将主工作区未提交变更同步到 worktree
    const baselineFiles = this._overlayBaseline(this.cwd, worktreePath);

    // 6. 写入 meta.json
    const meta = {
      changeName: name,
      branch,
      baseBranch,
      baseHash,
      actualBaseHash: gitQuiet(worktreePath, 'rev-parse HEAD') || baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      baselineFiles,
    };

    const metaPath = join(worktreePath, META_FILE);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

    return { branch, worktreePath, baseHash };
  }

  /**
   * 列出所有活跃 worktree
   * @returns {Array<{ changeName: string, branch: string, baseHash: string, createdAt: string, worktreePath: string }>}
   */
  list() {
    const results = [];
    if (!existsSync(this.worktreeBase)) return results;

    const entries = readdirSync(this.worktreeBase, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = join(this.worktreeBase, entry.name, META_FILE);
      if (!existsSync(metaPath)) continue;
      const meta = parseJSON(readFileSync(metaPath, 'utf8'));
      if (!meta) continue;
      results.push({
        changeName: meta.changeName,
        branch: meta.branch,
        baseHash: meta.baseHash,
        baseBranch: meta.baseBranch,
        createdAt: meta.createdAt,
        worktreePath: meta.worktreePath,
      });
    }

    return results;
  }

  /**
   * 清理 worktree（强制删除，不 apply）
   * @param {string} changeName
   * @throws {Error} worktree 不存在
   */
  cleanup(changeName) {
    const name = validateChangeName(changeName);
    const meta = this.getMeta(name);
    const worktreePath = this.getWorktreePath(name);

    if (!meta && !existsSync(worktreePath)) {
      throw new Error(`worktree not found: ${name}。meta.json 不存在，目录也不存在，可能已被清理或从未创建。`);
    }

    // 1. 尝试 git worktree remove
    try {
      git(this.cwd, `worktree remove ${worktreePath} --force`);
    } catch {
      // git worktree remove 失败，尝试直接删除目录
    }
    const branch = (meta && meta.branch) || BRANCH_PREFIX + name;

    // 2. 确保目录已删除
    try {
      if (existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    } catch (e) {
      throw new Error(`清理 worktree 目录失败: ${e.message}`);
    }

    // 3. 删除分支（忽略分支不存在的错误）
    gitQuiet(this.cwd, `branch -D ${branch}`);

    // 4. 确保目录已删除
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }
  }

  /**
   * 将主工作区未提交变更同步到 worktree（dirty baseline overlay）
   * 覆盖 staged + unstaged 的文件变更，以及 untracked 文件。
   * 使用 git diff + git apply 确保正确处理删除/rename/binary。
   * @param {string} mainCwd - 主工作区路径
   * @param {string} worktreePath - worktree 路径
   * @returns {Array<string>} overlay 的文件列表
   */
  _overlayBaseline(mainCwd, worktreePath) {
    const files = [];
    const errors = [];

    try {
      // staged 变更
      const staged = gitQuiet(mainCwd, 'diff --cached --name-only') || '';
      if (staged) {
        try {
          const patchContent = execSync(`git diff --cached --binary`, { cwd: mainCwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
          if (patchContent) {
            const patchFile = join(worktreePath, '.sillyspec-baseline-staged.patch');
            writeFileSync(patchFile, patchContent);
            git(worktreePath, `apply --binary ${patchFile}`);
            rmSync(patchFile, { force: true });
          }
        } catch (e) {
          errors.push(`staged: ${e.message}`);
        }
        files.push(...staged.split('\n').filter(Boolean));
      }

      // unstaged 变更
      const unstaged = gitQuiet(mainCwd, 'diff --name-only') || '';
      if (unstaged) {
        try {
          const patchContent = execSync(`git diff --binary`, { cwd: mainCwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
          if (patchContent) {
            const patchFile = join(worktreePath, '.sillyspec-baseline-unstaged.patch');
            writeFileSync(patchFile, patchContent);
            git(worktreePath, `apply --binary ${patchFile}`);
            rmSync(patchFile, { force: true });
          }
        } catch (e) {
          errors.push(`unstaged: ${e.message}`);
        }
        files.push(...unstaged.split('\n').filter(Boolean));
      }

      // untracked 文件（排除 .sillyspec/.runtime 等）
      const untracked = gitQuiet(mainCwd, 'ls-files --others --exclude-standard') || '';
      if (untracked) {
        for (const f of untracked.split('\n').filter(Boolean)) {
          const src = join(mainCwd, f);
          const dst = join(worktreePath, f);
          if (existsSync(src)) {
            mkdirSync(dirname(dst), { recursive: true });
            try { writeFileSync(dst, readFileSync(src)); files.push(f); } catch {}
          }
        }
      }

      if (files.length > 0) {
        console.log(`📁 baseline overlay: ${files.length} 个未提交文件已同步到 worktree`);
      }
    } catch (e) {
      errors.push(`unexpected: ${e.message}`);
    }

    // 有 pending 文件但 overlay 部分失败 → fail-fast
    if (errors.length > 0) {
      throw new Error(`baseline overlay 失败 (${errors.length} 个错误): ${errors.join('; ')}`);
    }

    return [...new Set(files)];
  }
}
