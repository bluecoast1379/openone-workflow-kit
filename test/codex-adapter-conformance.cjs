#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  loadCommandManifest,
  parseCommandManifest,
  validateCommandManifest
} = require('../bin/command-manifest.cjs');
const { resolveWorkflowProfile } = require('../bin/resolve-policy.cjs');

const root = path.resolve(__dirname, '..');
const init = path.join(root, 'bin/init-workspace.cjs');
const manifestFile = path.join(root, 'workflow/core/command-manifest.yaml');
const manifestSource = fs.readFileSync(manifestFile, 'utf8');
const commands = loadCommandManifest(manifestFile).commands;
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-conformance-'));

const result = spawnSync(
  process.execPath,
  [init, '--target', target, '--tools', 'codex', '--yes'],
  { cwd: target, encoding: 'utf8' }
);
if (result.status !== 0) {
  throw new Error(`Codex adapter 初始化失败:\n${result.stdout}\n${result.stderr}`);
}

const errors = validateCodexAdapter(target, commands);
if (errors.length) throw new Error(`Codex adapter conformance 失败:\n- ${errors.join('\n- ')}`);

const installedResolver = spawnSync(
  process.execPath,
  [path.join(target, 'workflow/core/tools/resolve-policy.cjs'), '--workspace', target],
  { cwd: target, encoding: 'utf8' }
);
if (installedResolver.status !== 0 || JSON.parse(installedResolver.stdout).resolved_profile !== 'adaptive') {
  throw new Error(`安装后的策略解析器不可用：${installedResolver.stdout}\n${installedResolver.stderr}`);
}

const defaultResolution = resolveWorkflowProfile({ workspace: target });
if (defaultResolution.resolved_profile !== 'adaptive') {
  throw new Error('新安装没有默认使用 adaptive（自动选择）');
}
const escalatedResolution = resolveWorkflowProfile({
  workspace: target,
  escalationSignals: ['auth_or_permissions']
});
if (escalatedResolution.resolved_profile !== 'strict') {
  throw new Error('adaptive 命中升级条件后没有切换为 strict（完整检查）');
}
const requestedStrict = resolveWorkflowProfile({ workspace: target, requestedProfile: 'strict' });
if (requestedStrict.resolved_profile !== 'strict') {
  throw new Error('显式 strict 没有优先于默认处理方式');
}
const migrationResolution = resolveWorkflowProfile({
  workspace: target,
  changedFiles: ['db/migrations/001.sql']
});
if (!migrationResolution.escalation_signals.includes('migration')) {
  throw new Error('迁移文件没有映射到 policy 已声明的 migration 条件');
}
const schemaResolution = resolveWorkflowProfile({
  workspace: target,
  changedFiles: ['db/schema.prisma']
});
if (!schemaResolution.escalation_signals.includes('data_schema')) {
  throw new Error('数据结构文件没有映射到 policy 已声明的 data_schema 条件');
}
let unknownSignalMessage = '';
try {
  resolveWorkflowProfile({ workspace: target, escalationSignals: ['auth_typo'] });
} catch (error) {
  unknownSignalMessage = error.message;
}
if (!unknownSignalMessage.includes('无法识别升级条件')) {
  throw new Error('拼错的升级条件没有被拒绝');
}
const missingPolicyTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-missing-'));
const missingResolution = resolveWorkflowProfile({ workspace: missingPolicyTarget });
if (missingResolution.resolved_profile !== 'strict') {
  throw new Error('缺少 workflow/policy.yaml 时没有回退到 strict');
}

const legacyUpgradeTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-upgrade-'));
fs.mkdirSync(path.join(legacyUpgradeTarget, 'workflow'), { recursive: true });
fs.writeFileSync(
  path.join(legacyUpgradeTarget, 'workflow/team-profile.yaml'),
  'schema_version: "1.0"\n# existing openone workspace\n'
);
const legacyUpgrade = spawnSync(
  process.execPath,
  [init, '--target', legacyUpgradeTarget, '--tools', 'codex', '--upgrade', '--force', '--yes'],
  { cwd: legacyUpgradeTarget, encoding: 'utf8' }
);
if (legacyUpgrade.status !== 0) {
  throw new Error(`旧工作区升级失败：${legacyUpgrade.stdout}\n${legacyUpgrade.stderr}`);
}
if (resolveWorkflowProfile({ workspace: legacyUpgradeTarget }).resolved_profile !== 'strict') {
  throw new Error('旧工作区升级时缺少 policy，没有保持 strict');
}

const invalidPolicyTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-invalid-'));
fs.mkdirSync(path.join(invalidPolicyTarget, 'workflow'), { recursive: true });
const validPolicy = fs.readFileSync(path.join(target, 'workflow/policy.yaml'), 'utf8');
fs.writeFileSync(
  path.join(invalidPolicyTarget, 'workflow/policy.yaml'),
  validPolicy.replace('max_fix_cycles: 2', 'max_fix_cycles: 3')
);
expectPolicyFailure(invalidPolicyTarget, 'max_fix_cycles');
fs.writeFileSync(
  path.join(invalidPolicyTarget, 'workflow/policy.yaml'),
  validPolicy.replace(
    'remote_write_requires_explicit_user_authorization: true',
    'remote_write_requires_explicit_user_authorization: false'
  )
);
expectPolicyFailure(invalidPolicyTarget, '安全底线');

const removedRel = `.agents/skills/${commands[0].skill_slug}/agents/openai.yaml`;
const removed = path.join(target, removedRel);
fs.unlinkSync(removed);
const negativeErrors = validateCodexAdapter(target, commands);
if (!negativeErrors.some((message) => message.includes(removedRel))) {
  throw new Error('删除一个阶段 metadata 后，conformance 未捕获缺失入口');
}

expectManifestFailure(
  manifestSource.replace('command_count: 32', 'command_count: 31'),
  'command_count'
);
expectManifestFailure(
  manifestSource
    .replace('command_count: 32', 'command_count: 31')
    .replace(/\n  - id: "workflow-status"[\s\S]*$/, '\n'),
  '必须为 32'
);
expectManifestFailure(
  manifestSource
    .replace('id: "workflow-status"', 'id: "unexpected-stage"')
    .replace('skill_slug: "workflow-status"', 'skill_slug: "workflow-unexpected-stage"'),
  'command 集合不完整'
);
expectManifestFailure(
  manifestSource.replace('skill_slug: "workflow-new-feature"', 'skill_slug: "workflow-init-workspace"'),
  '重复 skill_slug'
);
expectManifestFailure(
  manifestSource.replace('skill_slug: "workflow-new-feature"', 'skill_slug: "Workflow New Feature"'),
  'ASCII kebab-case'
);
expectManifestFailure(
  manifestSource.replace('id: "new-feature"', 'id: "CON"'),
  '安全文件名'
);
expectManifestFailure(
  manifestSource.replace('id: "new-feature"', 'id: "stage:name"'),
  '安全文件名'
);
expectManifestFailure(
  manifestSource.replace('id: "new-feature"', 'id: "stage*name"'),
  '安全文件名'
);
expectManifestFailure(
  manifestSource.replace('id: "new-feature"', 'id: "stage."'),
  '安全文件名'
);
expectManifestFailure(
  manifestSource.replace('skill_slug: "workflow-new-feature"', 'skill_slug: "agent-workflow"'),
  '保留的总入口 slug'
);
expectManifestFailure(
  manifestSource.replace(
    /(- id: "09-发布执行"[\s\S]*?implementation_gate:) false/,
    '$1 true'
  ),
  'implementation_gate'
);
expectManifestFailure(
  manifestSource.replace(/\n    user_title: "开始一个改动"/, ''),
  '缺少 user_title'
);
expectManifestFailure(
  manifestSource.replace('user_description: "记录这次要改什么，并根据影响范围选择合适的处理方式。"', 'user_description: ""'),
  'user_description 必须为非空字符串'
);
expectManifestFailure(
  manifestSource.replace('user_title: "开始一个改动"', 'user_title: "准备工作区"'),
  '重复 user_title'
);

const oldManifestSource = manifestSource
  .replace('schema_version: "1.1"', 'schema_version: "1.0"')
  .replace(/^    user_(?:title|description):.*\n/gm, '');
const oldManifest = parseCommandManifest(oldManifestSource, 'legacy-v1.yaml');
validateCommandManifest(oldManifest, 'legacy-v1.yaml');
if (oldManifest.commands.some((command) =>
  command.user_title !== command.title || command.user_description !== command.description)) {
  throw new Error('schema 1.0 没有回退到旧 title/description 显示文本');
}

console.log(`Codex adapter conformance passed: 1 umbrella + ${commands.length} stage Skills; negative cases covered.`);

function validateCodexAdapter(workspace, commandList) {
  const failures = [];
  const required = [
    'AGENTS.md',
    'workflow/policy.yaml',
    'workflow/core/command-manifest.yaml',
    'workflow/core/tools/resolve-policy.cjs',
    'workflow/core/templates/workflow-policy.template.yaml',
    '.agents/skills/agent-workflow/SKILL.md',
    '.agents/skills/agent-workflow/agents/openai.yaml'
  ];
  for (const rel of required) {
    if (!isFile(workspace, rel)) failures.push(`缺少 ${rel}`);
  }
  if (fs.existsSync(path.join(workspace, '.codex/prompts'))) {
    failures.push('不得生成项目级 .codex/prompts');
  }
  if (isFile(workspace, 'AGENTS.md')) {
    const agents = fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf8');
    const bytes = Buffer.byteLength(agents);
    if (bytes < 2048 || bytes > 3000) failures.push(`AGENTS.md 应为约 2–3KB，当前 ${bytes} bytes`);
    for (const hiddenTerm of ['Oracle', 'Definition Lint', 'blocking', 'STALE', 'WAIVED', 'worktree', 'adaptive', 'strict']) {
      if (agents.includes(hiddenTerm)) failures.push(`AGENTS.md 默认表面不应出现 ${hiddenTerm}`);
    }
    if (agents.includes('| `/init-workspace` |') || agents.includes('| `/workflow-status` |')) {
      failures.push('AGENTS.md 不应包含完整命令表');
    }
    for (const requiredText of [
      '用户已经明确要求修复、修改或实现本地内容时',
      '立即改用“完整检查”',
      '真实执行过的检查',
      '修改前检查未提交内容',
      '必须先得到用户明确授权'
    ]) {
      if (!agents.includes(requiredText)) failures.push(`AGENTS.md 缺少关键边界：${requiredText}`);
    }
  }

  const umbrellaRel = '.agents/skills/agent-workflow/SKILL.md';
  if (isFile(workspace, umbrellaRel)) {
    const umbrella = fs.readFileSync(path.join(workspace, umbrellaRel), 'utf8');
    for (const marker of ['自然语言请求', '低风险改动', '无需先选择阶段编号', 'workflow/policy.yaml']) {
      if (!umbrella.includes(marker)) failures.push(`${umbrellaRel} 缺少 ${marker}`);
    }
  }
  const umbrellaMetadataRel = '.agents/skills/agent-workflow/agents/openai.yaml';
  if (isFile(workspace, umbrellaMetadataRel)) {
    const metadata = fs.readFileSync(path.join(workspace, umbrellaMetadataRel), 'utf8');
    for (const marker of [
      'display_name: "自动安排工作"',
      'short_description: "根据任务风险选择轻量处理或完整检查',
      'allow_implicit_invocation: true',
      '需要远程或生产写入时先征得我的明确同意'
    ]) {
      if (!metadata.includes(marker)) failures.push(`${umbrellaMetadataRel} 缺少 ${marker}`);
    }
  }

  const expectedSlugs = new Set(commandList.map((command) => command.skill_slug));
  const actualSlugs = new Set(
    fs.readdirSync(path.join(workspace, '.agents/skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'agent-workflow')
      .map((entry) => entry.name)
  );
  if (actualSlugs.size !== expectedSlugs.size || [...expectedSlugs].some((slug) => !actualSlugs.has(slug))) {
    failures.push('阶段 Skill 目录集合与 command manifest 不一致');
  }

  for (const command of commandList) {
    const skillRel = `.agents/skills/${command.skill_slug}/SKILL.md`;
    const metadataRel = `.agents/skills/${command.skill_slug}/agents/openai.yaml`;
    for (const rel of [skillRel, metadataRel]) {
      if (!isFile(workspace, rel)) failures.push(`缺少 ${rel}`);
    }
    if (!isFile(workspace, skillRel) || !isFile(workspace, metadataRel)) continue;
    const skill = fs.readFileSync(path.join(workspace, skillRel), 'utf8');
    const metadata = fs.readFileSync(path.join(workspace, metadataRel), 'utf8');
    for (const marker of [
      `name: ${command.skill_slug}`,
      `workflow/core/commands/${command.id}.md`,
      command.user_title,
      command.user_description,
      command.argument_hint,
      `高级兼容信息：旧阶段标识为 \`/${command.id}\``,
      'workflow/policy.yaml',
      'generated-by: openone-workflow-kit; managed-adapter: true'
    ]) {
      if (!skill.includes(marker)) failures.push(`${skillRel} 缺少 ${marker}`);
    }
    for (const unexpected of ['AGENTS.md', 'workflow/core/command-manifest.yaml']) {
      if (skill.includes(unexpected)) failures.push(`${skillRel} 不应要求读取 ${unexpected}`);
    }
    if (command.implementation_gate && !skill.includes('仅在采用“完整检查”或 `features/<feature>/` 已存在时')) {
      failures.push(`${skillRel} 没有把前序改动资料改为条件读取`);
    }
    const frontmatter = skill.split('---', 3)[1] || '';
    const pickerDescription = frontmatter.split(/\r?\n/).find((line) => line.startsWith('description:')) || '';
    if (pickerDescription.includes(`/${command.id}`)) {
      failures.push(`${skillRel} 的 picker description 不应显示旧阶段编号`);
    }
    for (const marker of [
      `display_name: "${command.user_title}"`,
      `short_description: "${command.user_description}"`,
      `default_prompt: "请${command.user_title}。`,
      'allow_implicit_invocation: false',
      'generated-by: openone-workflow-kit; managed-adapter: true'
    ]) {
      if (!metadata.includes(marker)) failures.push(`${metadataRel} 缺少 ${marker}`);
    }
    for (const unexpected of [command.id, '严格读取', 'AGENTS.md', 'Definition Lint', 'Oracle']) {
      if (metadata.includes(unexpected)) failures.push(`${metadataRel} 默认显示不应出现 ${unexpected}`);
    }
  }

  return failures;
}

function expectManifestFailure(source, expectedMessage) {
  let message = '';
  try {
    validateCommandManifest(parseCommandManifest(source, 'negative.yaml'), 'negative.yaml');
  } catch (error) {
    message = error.message;
  }
  if (!message.includes(expectedMessage)) {
    throw new Error(`manifest 反例未按预期失败（需要包含 ${expectedMessage}）: ${message || '未失败'}`);
  }
}

function expectPolicyFailure(workspace, expectedMessage) {
  let message = '';
  try {
    resolveWorkflowProfile({ workspace });
  } catch (error) {
    message = error.message;
  }
  if (!message.includes(expectedMessage)) {
    throw new Error(`policy 反例未按预期失败（需要包含 ${expectedMessage}）：${message || '未失败'}`);
  }
}

function isFile(workspace, rel) {
  try {
    return fs.statSync(path.join(workspace, rel)).isFile();
  } catch {
    return false;
  }
}
