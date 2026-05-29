/**
 * SillySpec ProgressManager — 进度恢复管理
 *
 * 纯 Node.js，无外部依赖。支持多变更并行。
 *
 * 存储结构（v3）：
 *   .sillyspec/.runtime/global.json          — 全局状态（项目名、活跃变更列表）
 *   .sillyspec/changes/<name>/progress.json  — 每个变更独立的阶段/步骤状态
 *
 * 向后兼容：如果存在旧的 .sillyspec/.runtime/progress.json，自动迁移。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, unlinkSync, readdirSync } from 'fs';
import { join, basename, resolve } from 'path';

const RUNTIME_DIR = '.sillyspec/.runtime';
const CHANGES_DIR = '.sillyspec/changes';
const GLOBAL_FILE = 'global.json';
const PROGRESS_FILE = 'progress.json';
const BACKUP_SUFFIX = '.bak';

const CURRENT_VERSION = 3;
const VALID_STAGES = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore'];
const VALID_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked'];

const STAGE_LABELS = {
  brainstorm: '🧠 需求探索',
  plan: '📐 实现计划',
  execute: '⚡ 波次执行',
  verify: '🔍 验证确认',
  scan: '🔍 代码扫描',
  quick: '⚡ 快速任务',
  explore: '🧭 自由探索',
  archive: '📦 归档变更',
};

function emptyStage() {
  return { status: 'pending', steps: [], startedAt: null, completedAt: null };
}

function makeInitialProgress(project) {
  const stages = {};
  for (const s of VALID_STAGES) stages[s] = emptyStage();
  return { _version: CURRENT_VERSION, project: project || '', currentStage: '', currentChange: null, stages, lastActive: null };
}

function makeInitialGlobal(project) {
  return { _version: CURRENT_VERSION, project: project || '', activeChanges: [] };
}

// ── ProgressManager ──

export class ProgressManager {
  // ── 路径工具 ──

  _runtimePath(cwd, ...parts) {
    return join(cwd, RUNTIME_DIR, ...parts);
  }

  _changePath(cwd, changeName, ...parts) {
    return join(cwd, CHANGES_DIR, changeName, ...parts);
  }

  _ensureRuntimeDir(cwd) {
    const runtimeDir = this._runtimePath(cwd);
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
      for (const d of ['artifacts', 'history', 'logs', 'templates']) {
        mkdirSync(join(runtimeDir, d), { recursive: true });
      }
    }
  }

  _ensureChangeDir(cwd, changeName) {
    const dir = this._changePath(cwd, changeName);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ── 向后兼容：检测并迁移旧版 progress.json ──

  _migrateIfNeeded(cwd) {
    const oldPath = this._runtimePath(cwd, PROGRESS_FILE);
    const globalPath = this._runtimePath(cwd, GLOBAL_FILE);

    // 新版已存在，不迁移
    if (existsSync(globalPath)) return;

    // 旧版不存在，不迁移
    if (!existsSync(oldPath)) return;

    const oldData = this._parseWithRecovery(readFileSync(oldPath, 'utf8'));
    if (!oldData) return;

    console.log('🔄 检测到旧版 progress.json，正在迁移到按变更隔离存储...');

    // 提取变更名
    const changeName = oldData.currentChange || 'default';

    // 迁移：将旧 progress.json 复制到变更目录
    this._ensureChangeDir(cwd, changeName);
    const newChangePath = this._changePath(cwd, changeName, PROGRESS_FILE);
    if (!existsSync(newChangePath)) {
      writeFileSync(newChangePath, JSON.stringify(oldData, null, 2) + '\n');
    }

    // 创建全局文件
    const globalData = makeInitialGlobal(oldData.project);
    globalData.activeChanges = [changeName];
    if (!existsSync(globalPath)) {
      writeFileSync(globalPath, JSON.stringify(globalData, null, 2) + '\n');
    }

    // 备份旧文件
    const backupPath = oldPath + BACKUP_SUFFIX;
    if (!existsSync(backupPath)) copyFileSync(oldPath, backupPath);
    unlinkSync(oldPath);

    console.log(`  ✅ 已迁移到 .sillyspec/changes/${changeName}/progress.json`);
    console.log(`  📦 旧文件已备份到 .sillyspec/.runtime/progress.json.bak`);
  }

  // ── 全局状态 ──

  readGlobal(cwd) {
    this._migrateIfNeeded(cwd);
    const globalPath = this._runtimePath(cwd, GLOBAL_FILE);
    if (!existsSync(globalPath)) return null;
    return this._parseWithRecovery(readFileSync(globalPath, 'utf8'));
  }

  writeGlobal(cwd, data) {
    this._ensureRuntimeDir(cwd);
    const globalPath = this._runtimePath(cwd, GLOBAL_FILE);
    const tmpPath = globalPath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
    renameSync(tmpPath, globalPath);
  }

  // ── 变更级别状态 ──

  /**
   * 读取指定变更的 progress
   * @param {string} cwd
   * @param {string|null} changeName - 变更名，null 时尝试自动检测
   */
  read(cwd, changeName = null) {
    // 向后兼容：如果没有 changeName，尝试读旧版路径
    if (!changeName) {
      // 先看新版全局文件
      const global = this.readGlobal(cwd);
      if (global && global.activeChanges && global.activeChanges.length === 1) {
        changeName = global.activeChanges[0];
      } else {
        // fallback：扫描 changes 目录
        const changes = this.listChanges(cwd);
        if (changes.length === 1) {
          changeName = changes[0];
        } else {
          // 最后尝试旧版路径
          const oldPath = this._runtimePath(cwd, PROGRESS_FILE);
          if (existsSync(oldPath)) {
            return this._parseWithRecovery(readFileSync(oldPath, 'utf8'));
          }
          return null;
        }
      }
    }

    const progressPath = this._changePath(cwd, changeName, PROGRESS_FILE);
    const backupPath = progressPath + BACKUP_SUFFIX;

    for (const p of [progressPath, backupPath]) {
      if (!existsSync(p)) continue;
      const parsed = this._parseWithRecovery(readFileSync(p, 'utf8'));
      if (parsed) {
        if (p === backupPath) {
          console.log('⚠️  progress.json 损坏，已从备份恢复');
          writeFileSync(progressPath, JSON.stringify(parsed, null, 2) + '\n');
        }
        return parsed;
      }
    }
    return null;
  }

  /**
   * 写入指定变更的 progress
   * @param {string} cwd
   * @param {object} data
   * @param {string|null} changeName - 从 data.currentChange 推导，或显式传入
   */
  _write(cwd, data, changeName = null) {
    const cn = changeName || data.currentChange;
    if (!cn) {
      // 无变更名时 fallback 到旧路径（不应该发生，但保底）
      const progressPath = this._runtimePath(cwd, PROGRESS_FILE);
      this._ensureRuntimeDir(cwd);
      const tmpPath = progressPath + '.tmp';
      writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
      renameSync(tmpPath, progressPath);
      this._updateGateStatus(cwd);
      return;
    }

    this._ensureChangeDir(cwd, cn);
    const progressPath = this._changePath(cwd, cn, PROGRESS_FILE);
    const tmpPath = progressPath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n');
    renameSync(tmpPath, progressPath);
    this._updateGateStatus(cwd);
  }

  _backup(cwd, data) {
    const cn = data?.currentChange;
    if (!cn) return;
    const p = this._changePath(cwd, cn, PROGRESS_FILE);
    if (existsSync(p)) copyFileSync(p, this._changePath(cwd, cn, PROGRESS_FILE + BACKUP_SUFFIX));
  }

  // ── 变更管理 ──

  /**
   * 列出所有变更名（不含 archive 子目录）
   */
  listChanges(cwd) {
    const changesDir = join(cwd, CHANGES_DIR);
    if (!existsSync(changesDir)) return [];
    return readdirSync(changesDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'archive')
      .map(e => e.name);
  }

  /**
   * 注册变更到全局活跃列表
   */
  registerChange(cwd, changeName) {
    let global = this.readGlobal(cwd);
    if (!global) {
      global = makeInitialGlobal(basename(cwd));
    }
    if (!global.activeChanges.includes(changeName)) {
      global.activeChanges.push(changeName);
      this.writeGlobal(cwd, global);
    }
  }

  /**
   * 从全局活跃列表移除变更（归档时调用）
   */
  unregisterChange(cwd, changeName) {
    const global = this.readGlobal(cwd);
    if (!global) return;
    global.activeChanges = global.activeChanges.filter(c => c !== changeName);
    this.writeGlobal(cwd, global);
  }

  // ── CLI 命令 ──

  init(cwd) {
    this._migrateIfNeeded(cwd);
    this._ensureRuntimeDir(cwd);

    const globalPath = this._runtimePath(cwd, GLOBAL_FILE);
    if (!existsSync(globalPath)) {
      const data = makeInitialGlobal(basename(cwd));
      this.writeGlobal(cwd, data);
      console.log(`✅ 已创建全局状态文件`);
    } else {
      console.log(`ℹ️  全局状态文件已存在，跳过`);
    }

    // 创建 user-inputs.md
    const inputsPath = this._runtimePath(cwd, 'user-inputs.md');
    if (!existsSync(inputsPath)) {
      writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
    }

    this._ensureGitignore(cwd);
    return this.readGlobal(cwd);
  }

  /**
   * 初始化指定变更的 progress
   */
  initChange(cwd, changeName) {
    this._ensureChangeDir(cwd, changeName);
    this.registerChange(cwd, changeName);

    const progressPath = this._changePath(cwd, changeName, PROGRESS_FILE);
    if (!existsSync(progressPath)) {
      const data = makeInitialProgress(basename(cwd));
      data.currentChange = changeName;
      this._write(cwd, data, changeName);
      console.log(`✅ 已创建变更 ${changeName} 的 progress.json`);
    }

    return this.read(cwd, changeName);
  }

  setStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return;
    }

    const data = this._readOrInit(cwd, changeName);
    if (!data) return;

    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    const stageData = data.stages[stage];

    data.currentStage = stage;
    if (stageData.status === 'pending') {
      stageData.status = 'in-progress';
      stageData.startedAt = new Date().toLocaleString('zh-CN',{hour12:false});
    }
    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    this._backup(cwd, data);
    this._write(cwd, data);
    console.log(`✅ 当前阶段已设为: ${STAGE_LABELS[stage] || stage} (${stageData.status})`);
  }

  addStep(cwd, stage, stepName, changeName = null) {
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }
    const data = this._requireStage(cwd, stage, changeName);
    if (!data) return;

    const stageData = data.stages[stage];
    if (stageData.steps.some(s => s.name === stepName)) {
      console.log(`ℹ️  步骤 "${stepName}" 已存在于 ${stage}`);
      return;
    }

    stageData.steps.push({ name: stepName, status: 'pending' });
    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    this._backup(cwd, data);
    this._write(cwd, data);
    console.log(`✅ 已添加步骤: ${stage}/${stepName}`);
  }

  updateStep(cwd, stage, stepName, options = {}, changeName = null) {
    const { status, output } = options;
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }
    const data = this._requireStage(cwd, stage, changeName);
    if (!data) return;

    const stageData = data.stages[stage];
    const step = stageData.steps.find(s => s.name === stepName);
    if (!step) { console.log(`❌ 步骤不存在: ${stage}/${stepName}`); return; }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        console.log(`❌ 无效状态: ${status}，可选: ${VALID_STATUSES.join(', ')}`);
        return;
      }
      step.status = status;
    }
    if (output !== undefined) step.output = output;

    // 检查是否所有步骤都 completed
    if (stageData.steps.length > 0 && stageData.steps.every(s => s.status === 'completed')) {
      stageData.status = 'completed';
      stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false});
      console.log(`✅ 阶段 ${stage} 所有步骤已完成，阶段已标记为 completed`);
    }

    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
    this._backup(cwd, data);
    this._write(cwd, data);
    console.log(`✅ 步骤已更新: ${stage}/${stepName} → ${status || step.status}`);
  }

  completeStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}`);
      return;
    }

    const data = this._readOrInit(cwd, changeName);
    if (!data) return;

    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    const stageData = data.stages[stage];
    stageData.status = 'completed';
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false});

    // 标记所有未完成步骤为 completed
    for (const step of stageData.steps) {
      if (step.status === 'pending') step.status = 'completed';
    }

    data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});

    // 归档到 history/（ISO 时间戳）
    const historyDir = this._runtimePath(cwd, 'history');
    mkdirSync(historyDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.TZ-]/g, '');
    const cn = data.currentChange || 'unknown';
    writeFileSync(join(historyDir, `${cn}-${stage}-${ts}.json`), JSON.stringify({ change: cn, stage, data: stageData, completedAt: stageData.completedAt }, null, 2) + '\n');

    this._backup(cwd, data);
    this._write(cwd, data);

    console.log(`✅ 阶段 ${stage} 已标记为完成（不自动推进，下一步由你决定）`);
  }

  show(cwd, changeName = null) {
    // 如果指定了变更名，只显示该变更
    if (changeName) {
      return this._showChange(cwd, changeName);
    }

    // 否则显示所有变更
    const changes = this.listChanges(cwd);
    if (changes.length === 0) {
      console.log('ℹ️  没有活跃的变更');
      return;
    }

    if (changes.length === 1) {
      return this._showChange(cwd, changes[0]);
    }

    // 多个变更：汇总显示
    const global = this.readGlobal(cwd);
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  项目: ${(global?.project) || basename(cwd) || '(未命名)'}`);
    console.log(`  活跃变更: ${changes.length} 个`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    for (const cn of changes) {
      const data = this.read(cwd, cn);
      if (!data) {
        console.log(`  📂 ${cn} — (无法读取)`);
        continue;
      }
      const currentStage = data.currentStage || '(无)';
      const stageLabel = STAGE_LABELS[data.currentStage] || currentStage;
      const lastActive = data.lastActive ? this._timeAgo(data.lastActive) : '未知';

      console.log(`  📂 ${cn}`);
      console.log(`     当前阶段: ${stageLabel}  最近活跃: ${lastActive}`);
      console.log('');
    }

    console.log(`  💡 查看详情：sillyspec progress show --change <name>`);
    console.log('');
  }

  _showChange(cwd, changeName) {
    const data = this.read(cwd, changeName);
    if (!data) {
      console.log(`❌ 未找到变更 ${changeName} 的 progress.json`);
      return;
    }

    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  变更:     ${changeName}`);
    console.log(`  项目:     ${data.project || '(未命名)'}`);
    console.log(`  当前阶段: ${STAGE_LABELS[data.currentStage] || data.currentStage || '(无)'}`);
    console.log(`  最近活跃: ${data.lastActive ? this._timeAgo(data.lastActive) : '未知'}`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    const statusIcons = { pending: '⬜', 'in-progress': '🔵', completed: '✅', failed: '❌', blocked: '🚫' };

    for (const stage of VALID_STAGES) {
      const stageData = data.stages[stage] || emptyStage();
      const label = STAGE_LABELS[stage] || stage;
      const icon = statusIcons[stageData.status] || '⬜';
      const isCurrent = data.currentStage === stage ? ' ◀' : '';

      console.log(`  ${icon} ${label}${isCurrent}`);

      if (stageData.steps && stageData.steps.length > 0) {
        for (const step of stageData.steps) {
          const si = statusIcons[step.status] || '○';
          const out = step.output ? ` — ${step.output.slice(0, 60)}` : '';
          console.log(`    ${si} ${step.name}${out}`);
        }
      }

      if (stageData.startedAt) {
        console.log(`    开始: ${new Date(stageData.startedAt).toLocaleString('zh-CN')}`);
      }
      if (stageData.completedAt) {
        console.log(`    完成: ${new Date(stageData.completedAt).toLocaleString('zh-CN')}`);
      }
    }

    // 批量进度
    if (data.batchProgress) {
      const batchLine = this._renderBatchProgress(data.batchProgress);
      if (batchLine) {
        console.log('');
        console.log(`  ${batchLine}`);
      }
    }

    console.log('');
  }

  status(cwd, changeName = null) {
    this.show(cwd, changeName);
  }

  async validate(cwd, changeName = null) {
    const data = this.read(cwd, changeName);
    if (!data) { console.log('❌ 无法读取 progress.json'); return false; }

    const errors = [];
    if (!data._version || !Number.isInteger(data._version) || data._version < 1) {
      errors.push(`_version 缺失或无效（期望正整数，实际为 ${JSON.stringify(data._version)}）`);
    }
    if (!data.stages || typeof data.stages !== 'object') errors.push('缺少 stages');
    if (!VALID_STAGES.every(s => data.stages[s])) errors.push('缺少阶段定义');

    if (errors.length === 0) { console.log('✅ progress.json 格式正确'); return true; }

    console.log(`⚠️  发现问题，尝试修复...`);
    let fixed = { ...data, stages: { ...data.stages } };
    let changed = false;
    if (!fixed.project) {
      fixed.project = basename(cwd);
      changed = true;
    }
    if (!fixed._version || !Number.isInteger(fixed._version) || fixed._version < 1) {
      fixed._version = CURRENT_VERSION;
      changed = true;
    }
    for (const s of VALID_STAGES) {
      if (!fixed.stages[s]) { fixed.stages[s] = emptyStage(); changed = true; }
    }
    if (changed) {
      this._backup(cwd, fixed);
      this._write(cwd, fixed);
      console.log('✅ 已修复并备份');
    }

    return true;
  }

  reset(cwd, stage, changeName = null) {
    if (stage) {
      const data = this.read(cwd, changeName);
      if (!data) { console.log('❌ 无法读取 progress.json'); return; }
      this._backup(cwd, data);
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }
      data.stages[stage] = emptyStage();
      data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
      this._write(cwd, data);
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      // 重置所有变更或指定变更
      if (changeName) {
        const p = this._changePath(cwd, changeName, PROGRESS_FILE);
        const backup = this._changePath(cwd, changeName, PROGRESS_FILE + BACKUP_SUFFIX);
        let didReset = false;
        if (existsSync(p)) { unlinkSync(p); didReset = true; }
        if (existsSync(backup)) { unlinkSync(backup); didReset = true; }
        if (didReset) console.log(`✅ 已重置变更 ${changeName} 的进度`);
        else console.log('ℹ️  无进度文件可重置');
      } else {
        const changes = this.listChanges(cwd);
        for (const cn of changes) {
          const p = this._changePath(cwd, cn, PROGRESS_FILE);
          const backup = this._changePath(cwd, cn, PROGRESS_FILE + BACKUP_SUFFIX);
          if (existsSync(p)) unlinkSync(p);
          if (existsSync(backup)) unlinkSync(backup);
        }
        console.log('✅ 已重置所有变更的进度');
      }
    }
  }

  // ── 内部辅助 ──

  _readOrInit(cwd, changeName = null) {
    let data = this.read(cwd, changeName);
    if (!data) {
      // 尝试自动检测变更名
      if (!changeName) {
        const changes = this.listChanges(cwd);
        if (changes.length === 1) changeName = changes[0];
      }
      if (changeName) {
        this._ensureChangeDir(cwd, changeName);
        const progressPath = this._changePath(cwd, changeName, PROGRESS_FILE);
        if (!existsSync(progressPath)) {
          data = makeInitialProgress(basename(cwd));
          data.currentChange = changeName;
          this._write(cwd, data, changeName);
          this.registerChange(cwd, changeName);
        }
      }
      if (!data) {
        data = this.read(cwd, changeName);
      }
      if (!data) {
        console.log('❌ 无法确定当前变更，请指定 --change <name>');
        return null;
      }
    }
    return data;
  }

  _requireStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return null;
    }
    const data = this._readOrInit(cwd, changeName);
    if (!data) return null;
    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    return data;
  }

  _parseWithRecovery(jsonString) {
    try { return JSON.parse(jsonString); } catch {}

    let fixed = jsonString.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
    fixed = fixed.replace(/:\s*'([^']*)'([,}\]])/g, ':"$1"$2');
    try { return JSON.parse(fixed); } catch {}

    const lastBrace = fixed.lastIndexOf('}');
    if (lastBrace > 0) {
      let open = 0;
      for (const ch of fixed.substring(0, lastBrace + 1)) {
        if (ch === '{') open++;
        if (ch === '}') open--;
      }
      try { return JSON.parse(fixed.substring(0, lastBrace + 1) + '}'.repeat(Math.max(0, open))); } catch {}
    }
    return null;
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '未知';
    let ts = Date.parse(dateStr);
    if (isNaN(ts)) {
      const m = dateStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (m) ts = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)).getTime();
    }
    if (isNaN(ts)) return dateStr;
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  // ── 批量进度 ──

  updateBatchProgress(cwd, batchData, changeName = null) {
    const data = this._readOrInit(cwd, changeName);
    if (!data) return;

    if (!data.batchProgress) {
      data.batchProgress = { total: 0, completed: 0, failed: 0, skipped: 0 };
    }
    if (batchData.total !== undefined) data.batchProgress.total = batchData.total;
    if (batchData.completed !== undefined) data.batchProgress.completed = batchData.completed;
    if (batchData.failed !== undefined) data.batchProgress.failed = batchData.failed;
    if (batchData.skipped !== undefined) data.batchProgress.skipped = batchData.skipped;

    data.lastActive = new Date().toLocaleString('zh-CN', { hour12: false });
    this._backup(cwd, data);
    this._write(cwd, data);
  }

  readBatchProgress(cwd, changeName = null) {
    const data = this.read(cwd, changeName);
    return data?.batchProgress || null;
  }

  _renderBatchProgress(batchProgress) {
    if (!batchProgress || !batchProgress.total) return null;
    const { total, completed = 0, failed = 0, skipped = 0 } = batchProgress;
    const barLen = 20;
    const filled = Math.round((completed / total) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const parts = [];
    if (failed > 0) parts.push(`${failed} 失败`);
    if (skipped > 0) parts.push(`${skipped} 跳过`);
    const suffix = parts.length ? ` (${parts.join(', ')})` : '';
    return `📊 批量进度: ${bar} ${completed}/${total}${suffix}`;
  }

  /**
   * 更新 gate-status.json，供 worktree-guard hook 读取
   * 扫描所有活跃变更的 currentStage，任一为 execute/quick 则 stage 设为该值
   */
  _updateGateStatus(cwd) {
    const changes = this.listChanges(cwd);
    if (changes.length === 0) {
      // 无活跃变更，删除 gate-status（如果存在）
      const gatePath = this._runtimePath(cwd, 'gate-status.json');
      if (existsSync(gatePath)) {
        try { unlinkSync(gatePath); } catch {}
      }
      return;
    }

    let gateStage = null;
    let hasNoWorktree = false;
    const activeChanges = [];

    for (const cn of changes) {
      const data = this.read(cwd, cn);
      if (!data || !data.currentStage) continue;
      const stage = data.currentStage;
      if (['execute', 'quick'].includes(stage)) {
        // 优先取 execute，其次 quick
        if (gateStage !== 'execute' || stage === 'execute') {
          gateStage = stage;
        }
        activeChanges.push(cn);
        if (data.noWorktree) hasNoWorktree = true;
      }
    }

    const gatePath = this._runtimePath(cwd, 'gate-status.json');

    if (gateStage) {
      this._ensureRuntimeDir(cwd);
      const gateData = {
        stage: gateStage,
        changes: activeChanges,
        updatedAt: new Date().toISOString(),
        ...(hasNoWorktree ? { noWorktree: true } : {}),
      };
      const tmpPath = gatePath + '.tmp';
      writeFileSync(tmpPath, JSON.stringify(gateData, null, 2) + '\n');
      renameSync(tmpPath, gatePath);
    } else {
      // 无 execute/quick 阶段，删除 gate-status
      if (existsSync(gatePath)) {
        try { unlinkSync(gatePath); } catch {}
      }
    }
  }

  _ensureGitignore(cwd) {
    const gitignorePath = join(cwd, '.gitignore');
    const rule = '.sillyspec/.runtime/';
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      if (content.includes(rule)) return;
      writeFileSync(gitignorePath, content.trimEnd() + '\n' + rule + '\n');
    } else {
      writeFileSync(gitignorePath, rule + '\n');
    }
  }
}
