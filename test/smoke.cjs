#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const init = path.join(root, 'bin', 'init-workspace.cjs');
const { loadCommandManifest } = require(path.join(root, 'bin/command-manifest.cjs'));
const commands = loadCommandManifest(path.join(root, 'workflow/core/command-manifest.yaml')).commands;
const { toPortablePath } = require(init);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-workflow-smoke-'));

for (const rel of [
  'examples/team-profile.example.yaml',
  'examples/ecommerce/team-profile.example.yaml',
  'examples/education/team-profile.example.yaml',
  'examples/saas-to-b/team-profile.example.yaml'
]) {
  const example = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!example.includes('workflow/policy.yaml')) throw new Error(`${rel} does not use the managed policy`);
  for (const obsolete of [
    'require_stage_gate_for_code',
    'require_feature_branch_for_code',
    'worktree-required-after-implementation-stage',
    'high_risk_files:',
    '- "package.json"',
    '- "lockfiles"'
  ]) {
    if (example.includes(obsolete)) throw new Error(`${rel} still contains obsolete strict default ${obsolete}`);
  }
}

// Windows path.relative() emits backslashes. Generated team-profile paths are
// portable identifiers and must always use POSIX separators.
const windowsRepoPath = path.win32.relative('C:\\workspace', 'C:\\workspace\\apps\\web');
if (toPortablePath(windowsRepoPath) !== 'apps/web') {
  throw new Error(`Windows relative path was not normalized: ${windowsRepoPath}`);
}

function mkdir(rel) {
  fs.mkdirSync(path.join(tmp, rel), { recursive: true });
}

function write(rel, content) {
  const file = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [init, ...args], {
    cwd: tmp,
    encoding: 'utf8',
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`命令执行失败: ${result.stderr || result.stdout}`);
  }
  return result;
}

function runAt(target, args, options = {}) {
  const result = spawnSync(process.execPath, [init, ...args], {
    cwd: target,
    encoding: 'utf8',
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`命令执行失败: ${result.stderr || result.stdout}`);
  }
  return result;
}

function assertFile(rel) {
  const file = path.join(tmp, rel);
  if (!fs.existsSync(file)) throw new Error(`missing file: ${rel}`);
}

function assertNotExists(rel) {
  const file = path.join(tmp, rel);
  if (fs.existsSync(file)) throw new Error(`unexpected file: ${rel}`);
}

function assertContains(rel, text) {
  const file = path.join(tmp, rel);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(text)) throw new Error(`${rel} does not contain ${text}`);
}

function assertNotContains(rel, text) {
  const file = path.join(tmp, rel);
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(text)) throw new Error(`${rel} unexpectedly contains ${text}`);
}

mkdir('docs/product');
write('docs/business-overview.md', '# Business overview\n');
write('docs/frontend-rules.md', '# Frontend rules\n');
write('apps/web/package.json', JSON.stringify({
  dependencies: { vue: 'latest', vite: 'latest', typescript: 'latest' }
}, null, 2));
write('services/api/pom.xml', '<project></project>\n');

run([
  '--target', tmp,
  '--tools', 'codex,claude,cursor,copilot,codebuddy,kiro,trea',
  '--yes'
]);

for (const rel of [
  'AGENTS.md',
  'CLAUDE.md',
  '.agents/skills/agent-workflow/SKILL.md',
  '.agents/skills/workflow-init-workspace/SKILL.md',
  '.agents/skills/workflow-04-code-implementation/SKILL.md',
  '.agents/skills/workflow-04-code-implementation/agents/openai.yaml',
  '.agents/skills/workflow-new-product/SKILL.md',
  '.agents/skills/workflow-b1-positioning/SKILL.md',
  '.agents/skills/workflow-b9-strategy-review/SKILL.md',
  '.claude/commands/04-代码实现.md',
  '.claude/commands/B1-业务定位.md',
  '.claude/commands/B9-策略复盘.md',
  '.cursor/rules/agent-workflow-core.mdc',
  '.github/copilot-instructions.md',
  '.codebuddy/instructions.md',
  '.kiro/instructions.md',
  '.trae/instructions.md',
  'workflow/team-profile.yaml',
  'workflow/policy.yaml',
  'workflow/core/command-manifest.yaml',
  'workflow/core/tools/resolve-policy.cjs',
  'workflow/INITIALIZATION_QUESTIONS.md',
  'workflow/core/commands/init-workspace.md',
  'workflow/core/commands/04-代码实现.md',
  'workflow/core/commands/定义完成.md',
  'workflow/core/commands/交付至完成.md',
  'workflow/core/commands/澄清.md',
  'workflow/core/commands/一致性检查.md',
  'workflow/core/templates/completion-contract.md',
  'workflow/core/templates/workflow-policy.template.yaml',
  'workflow/core/templates/constitution.template.md',
  'workflow/core/templates/living-spec.md',
  'workflow/core/capabilities/definition-lint.md',
  'workflow/core/capabilities/acceptance-oracle-tracker.md',
  'workflow/constitution.md',
  'workflow/standards/README.md',
  'specs/README.md',
  '.claude/commands/定义完成.md',
  '.claude/commands/交付至完成.md',
  'workflow/core/commands/new-product.md',
  'workflow/core/commands/B1-业务定位.md',
  'workflow/core/commands/B1-B8-商业化准备.md',
  'workflow/core/commands/B5-渠道漏斗映射.md',
  'workflow/core/commands/B9-策略复盘.md',
  'workflow/core/templates/00-business-status.md',
  'workflow/core/templates/business-stage-document.md',
  'workflow/core/capabilities/market-evidence-grader.md',
  'workflow/core/capabilities/channel-experiment-tracker.md',
  'workflow/core/capabilities/branch-gatekeeper.md',
  'workflow/core/capabilities/release-safety-checker.md',
  'workflow/core/capabilities/prd-code-diff-checker.md',
  'workflow/core/capabilities/contract-tracer.md',
  'workflow/core/capabilities/deployment-readiness-checker.md',
  'workflow/core/capabilities/runtime-evidence-triage.md',
  'workflow/core/capabilities/data-change-safety-checker.md',
  'workflow/core/capabilities/protocol-state-machine-checker.md'
]) {
  assertFile(rel);
}

assertNotExists('.codex/prompts');
assertContains('.agents/skills/agent-workflow/SKILL.md', 'name: agent-workflow');
assertContains('.agents/skills/agent-workflow/SKILL.md', '自然语言请求');
assertContains('.agents/skills/agent-workflow/SKILL.md', '轻量处理');
assertContains('.agents/skills/agent-workflow/SKILL.md', '仍需要用户明确授权');
assertContains('workflow/policy.yaml', 'default_profile: adaptive');
assertContains('workflow/policy.yaml', 'missing_policy_fallback: strict');
assertContains('workflow/policy.yaml', 'max_fix_cycles: 2');
const installedResolver = path.join(tmp, 'workflow/core/tools/resolve-policy.cjs');
const resolvedLowRisk = spawnSync(process.execPath, [
  installedResolver, '--workspace', tmp, '--changed-files', 'src/button-label.ts'
], { encoding: 'utf8' });
if (resolvedLowRisk.status !== 0 || JSON.parse(resolvedLowRisk.stdout).resolved_profile !== 'adaptive') {
  throw new Error(`installed policy resolver did not select adaptive: ${resolvedLowRisk.stdout} ${resolvedLowRisk.stderr}`);
}
const resolvedHighRisk = spawnSync(process.execPath, [
  installedResolver, '--workspace', tmp, '--changed-files', 'db/migrations/001.sql'
], { encoding: 'utf8' });
if (resolvedHighRisk.status !== 0 || JSON.parse(resolvedHighRisk.stdout).resolved_profile !== 'strict') {
  throw new Error(`installed policy resolver did not escalate: ${resolvedHighRisk.stdout} ${resolvedHighRisk.stderr}`);
}

const stageSkillDirectories = fs.readdirSync(path.join(tmp, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'agent-workflow');
if (stageSkillDirectories.length !== commands.length) {
  throw new Error(`expected ${commands.length} stage Skill directories, found ${stageSkillDirectories.length}`);
}

for (const command of commands) {
  const base = `.agents/skills/${command.skill_slug}`;
  const skill = `${base}/SKILL.md`;
  const metadata = `${base}/agents/openai.yaml`;
  const coreCommand = `workflow/core/commands/${command.id}.md`;
  assertFile(skill);
  assertFile(metadata);
  assertContains(skill, `name: ${command.skill_slug}`);
  assertContains(skill, `workflow/core/commands/${command.id}.md`);
  assertContains(skill, command.user_title);
  assertContains(skill, command.user_description);
  assertContains(skill, command.argument_hint);
  assertNotContains(skill, 'AGENTS.md');
  assertNotContains(skill, 'workflow/core/command-manifest.yaml');
  assertContains(metadata, `display_name: \"${command.user_title}\"`);
  assertContains(metadata, command.user_description);
  assertContains(metadata, `请${command.user_title}`);
  assertContains(metadata, 'allow_implicit_invocation: false');
  assertNotContains(coreCommand, 'AGENTS.md');
  assertNotContains(coreCommand, 'workflow/core/command-manifest.yaml');
}

const plainLanguageSurfaces = [
  'AGENTS.md',
  'CLAUDE.md',
  'workflow/README.md',
  'workflow/constitution.md',
  'workflow/team-profile.yaml',
  'workflow/core/templates/00-workflow-status.md',
  'workflow/core/templates/completion-contract.md',
  'specs/README.md',
  '.agents/skills/agent-workflow/SKILL.md',
  '.cursor/rules/agent-workflow-core.mdc',
  '.github/copilot-instructions.md',
  '.codebuddy/instructions.md',
  '.kiro/instructions.md',
  '.trae/instructions.md',
  ...commands.map((command) => `.agents/skills/${command.skill_slug}/SKILL.md`),
  ...commands.map((command) => `.claude/commands/${command.id}.md`),
  ...commands.map((command) => `.cursor/commands/${command.id}.md`)
];
const internalTerms = [
  'feature 容器',
  '完成合同',
  '冻结合同',
  'Oracle',
  'Definition Lint',
  'blocking',
  'STALE',
  'WAIVED',
  '状态账本',
  'implementation_gate'
];
for (const rel of plainLanguageSurfaces) {
  const content = fs.readFileSync(path.join(tmp, rel), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const term of internalTerms) {
    if (content.includes(term)) throw new Error(`${rel} exposes internal term ${term}`);
  }
}

const defaultCoreTerms = [
  ...internalTerms,
  '歧义消融',
  '质量预算',
  '精确阻塞',
  '闸门',
  '容器',
  '漂移',
  '准入'
];
for (const command of commands) {
  const rel = `workflow/core/commands/${command.id}.md`;
  const content = fs.readFileSync(path.join(tmp, rel), 'utf8')
    .replace(/^## 内部兼容详情[\s\S]*$/m, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/`[^`]*`/g, '');
  for (const term of defaultCoreTerms) {
    if (content.includes(term)) throw new Error(`${rel} exposes internal term ${term} outside technical details`);
  }
}

for (const id of ['new-product', 'B1-业务定位', 'B1-B8-商业化准备', 'B9-策略复盘']) {
  const command = commands.find((item) => item.id === id);
  assertContains(`.agents/skills/${command.skill_slug}/SKILL.md`, 'business/<product>/');
}
const statusCommand = commands.find((item) => item.id === 'workflow-status');
assertContains(`.agents/skills/${statusCommand.skill_slug}/SKILL.md`, '`features/*/00-工作流状态.md`');
assertContains(`.agents/skills/${statusCommand.skill_slug}/SKILL.md`, '`business/*/00-商业化状态.md`');
assertContains(`.agents/skills/${statusCommand.skill_slug}/SKILL.md`, '不读取本地代码');

assertContains('workflow/team-profile.yaml', '- trae');
assertContains('workflow/team-profile.yaml', 'apps/web');
assertContains('workflow/team-profile.yaml', 'services/api');
assertContains('workflow/INSTALL_REPORT.md', '初始化器没有执行远程 Git 命令');
assertContains('workflow/team-profile.yaml', 'agent-allowed-after-scope-check');

// The globally loaded entry must stay compact and must not duplicate the 32-stage catalog.
const agentsContent = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
const agentsBytes = Buffer.byteLength(agentsContent, 'utf8');
if (agentsBytes > 3072) {
  throw new Error(`AGENTS.md should stay within 3 KiB, found ${agentsBytes} bytes`);
}
for (const marker of [
  'workflow/policy.yaml',
  '自动选择',
  '完整检查',
  '轻量处理',
  '最多进行两轮修复',
  '真实执行过的检查',
  '远程推送'
]) {
  if (!agentsContent.includes(marker)) throw new Error(`AGENTS.md does not contain ${marker}`);
}
for (const marker of [
  '/04-代码实现',
  '/B1-业务定位',
  'Oracle',
  'Definition Lint',
  '完成合同',
  '状态账本'
]) {
  if (agentsContent.includes(marker)) throw new Error(`AGENTS.md unexpectedly contains ${marker}`);
}

// The business track must remain discoverable through generated adapters and profile data.
assertContains('workflow/team-profile.yaml', 'business_dir');
assertContains('workflow/team-profile.yaml', 'outbound_marketing_actions');
assertContains('workflow/team-profile.yaml', 'market_research');
assertContains('workflow/team-profile.yaml', 'policy: "workflow/policy.yaml"');
assertContains('workflow/team-profile.yaml', 'user_facing_profiles');
assertContains('workflow/team-profile.yaml', 'completion_language');
for (const marker of ['S/M/L', 'frozen-contract', 'blocking-oracles', 'require_stage_gate_for_code']) {
  assertNotContains('workflow/team-profile.yaml', marker);
}
for (const marker of [
  'production_branch: "prod"',
  'integration_branch: "main"',
  '.github/workflows/**',
  '**/migrations/**',
  'application*.yml',
  'application*.yaml',
  'bootstrap*.yml',
  'bootstrap*.yaml',
  '**/*prod*.yml',
  '**/*prod*.yaml',
  '**/*production*.yml',
  '**/*production*.yaml',
  '**/config/**/prod*.yml',
  '**/config/**/prod*.yaml',
  '**/application-prod*.yml',
  '**/application-prod*.yaml',
  '.env.prod*',
  '.env.production*'
]) {
  assertNotContains('workflow/team-profile.yaml', marker);
}
assertContains('workflow/team-profile.yaml', 'high_risk_detection: "use workflow/policy.yaml and workflow/core/tools/resolve-policy.cjs"');
assertNotContains('workflow/team-profile.yaml', 'high_risk_files:');
assertContains('.cursor/commands/B1-业务定位.md', 'workflow/core/commands/B1-业务定位.md');
assertContains('.cursor/rules/agent-workflow-core.mdc', 'workflow/policy.yaml');
assertContains('.cursor/rules/agent-workflow-core.mdc', '自然语言');
// Completion mechanics must remain wired through profile and compatibility adapters.
assertContains('workflow/team-profile.yaml', 'specs_dir');
assertContains('.cursor/rules/agent-workflow-core.mdc', '完整检查');
assertContains('.cursor/commands/定义完成.md', 'workflow/core/commands/定义完成.md');

// Contract checker: a well-formed frozen contract passes, a broken one fails.
const checker = path.join(root, 'bin', 'check-contract.cjs');
const goodContract = `# 完成合同：demo

## 合同状态

| 项 | 内容 |
| --- | --- |
| 需求名称 | demo |
| 复杂度档位 | S |
| 状态 | 已冻结 |
| 冻结时间 | 2026-01-01 |
| 冻结确认 | 用户于会话中确认 |
| Definition Lint | 通过 |

## ★ 目标与非目标

- WHEN 用户提交空表单 THE SYSTEM SHALL 阻止提交

## ★ 术语表

| 术语 | 本合同内的精确定义 | 被替代的模糊说法 |
| --- | --- | --- |
| 提交成功 | 服务端返回 201 且列表可见 | 提交成功 |

## ★ 验收 Oracle

| ID | 验收标准 | 验证方法 | 类型 | blocking | 状态 | 证据 | 更新时间 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O-001 | WHEN 提交空表单 THE SYSTEM SHALL 阻止并提示 | npm test -- form.spec | auto | 是 | PASS | 输出片段 | 2026-01-01 |

## ★ 待澄清项

- 无

## 修订记录

| 时间 | 修订内容 | 原因 | 用户确认 |
| --- | --- | --- | --- |
`;
write('features/demo/00-完成合同.md', goodContract);
const goodRun = spawnSync(process.execPath, [checker, path.join(tmp, 'features/demo/00-完成合同.md')], { encoding: 'utf8' });
if (goodRun.status !== 0) {
  throw new Error(`check-contract should pass a valid contract: ${goodRun.stdout} ${goodRun.stderr}`);
}
const plainContract = `# 完成标准：plain-demo

## 完成标准状态

| 项 | 内容 |
| --- | --- |
| 改动名称 | plain-demo |
| 改动类型 | 常规改动 |
| 状态 | 已确认 |
| 确认时间 | 2026-01-01 |
| 确认记录 | 用户于会话中确认 |
| 完成标准检查 | 已通过 |

## ★ 目标与不做的事

- WHEN 用户提交空表单 THE SYSTEM SHALL 阻止提交

## ★ 需要精确说明的词

| 术语 | 明确定义 | 替代的模糊说法 |
| --- | --- | --- |
| 提交成功 | 服务端返回 201 且列表可见 | 提交成功 |

## 数据怎样流动、状态怎样变化

- 表单数据只在校验通过后发送到服务端。

## 出错时如何收场

- 校验失败时保留输入并显示可操作的错误。

## 质量上限与下限

- 相关定向测试必须通过。

## 这次会改什么、不会改什么

- 只修改表单校验，不改对外接口。

## ★ 验收项

| ID | 完成条件 | 检查方法 | 类型 | 必须通过 | 状态 | 证据 | 更新时间 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | WHEN 提交空表单 THE SYSTEM SHALL 阻止并提示 | npm test -- form.spec | auto | 是 | 已通过 | 输出片段 | 2026-01-01 |

## 完成标准检查

| # | 检查内容 | 结论 | 缺口与处理 |
| --- | --- | --- | --- |
| 1 | 范围与验收方法 | 已通过 | - |

## ★ 待确认项

- 无

## 修订记录

| 时间 | 修订内容 | 原因 | 用户确认 |
| --- | --- | --- | --- |
`;
write('features/plain-demo/00-完成合同.md', plainContract);
const plainRun = spawnSync(process.execPath, [checker, path.join(tmp, 'features/plain-demo/00-完成合同.md')], { encoding: 'utf8' });
if (plainRun.status !== 0) {
  throw new Error(`check-contract should pass the plain-language format: ${plainRun.stdout} ${plainRun.stderr}`);
}
const badContract = goodContract
  .replace('| Definition Lint | 通过 |', '| Definition Lint | 未运行 |')
  .replace('npm test -- form.spec', '待填写');
write('features/demo-bad/00-完成合同.md', badContract);
const badRun = spawnSync(process.execPath, [checker, path.join(tmp, 'features/demo-bad/00-完成合同.md')], { encoding: 'utf8' });
if (badRun.status === 0) {
  throw new Error('check-contract should fail a frozen contract without lint pass and verification method');
}

// The Cursor rule must explain how to run a stage via Cursor custom commands.
assertContains('.cursor/rules/agent-workflow-core.mdc', '.cursor/commands/');
assertContains('.cursor/rules/agent-workflow-core.mdc', '低风险改动采用“轻量处理”');
// Cursor custom slash command adapters must be generated for every stage.
assertFile('.cursor/commands/04-代码实现.md');
assertFile('.cursor/commands/10-复盘总结.md');
assertContains('.cursor/commands/04-代码实现.md', 'workflow/core/commands/04-代码实现.md');

run(['--target', tmp, '--tools', 'codex', '--yes']);
assertFile('workflow/team-profile.yaml.agent-workflow-new');

const beforeDryRun = fs.readdirSync(tmp).sort().join('\n');
run(['--target', tmp, '--tools', 'codex', '--dry-run']);
const afterDryRun = fs.readdirSync(tmp).sort().join('\n');
if (beforeDryRun !== afterDryRun) {
  throw new Error('dry-run changed top-level files');
}

// Upgrade path: --upgrade --force should overwrite in place without writing new
// .agent-workflow-new files. Clean up stale .agent-workflow-new files left by
// previous non-force runs before measuring.
for (const stale of fs.readdirSync(path.join(tmp, 'workflow'))) {
  if (stale.endsWith('.agent-workflow-new')) {
    fs.unlinkSync(path.join(tmp, 'workflow', stale));
  }
}
const profileBefore = fs.readFileSync(path.join(tmp, 'workflow/team-profile.yaml'), 'utf8');
fs.writeFileSync(path.join(tmp, 'workflow/team-profile.yaml'), profileBefore + '\n# user note\n');
const policyFile = path.join(tmp, 'workflow/policy.yaml');
const policyBefore = fs.readFileSync(policyFile, 'utf8');
fs.writeFileSync(policyFile, policyBefore + '\n# user policy note\n');
const constitutionFile = path.join(tmp, 'workflow/constitution.md');
const constitutionBefore = fs.readFileSync(constitutionFile, 'utf8');
fs.writeFileSync(constitutionFile, constitutionBefore + '\n# user constitution note\n');
run(['--target', tmp, '--tools', 'codex,claude,cursor', '--upgrade', '--force', '--yes']);
const profileAfter = fs.readFileSync(path.join(tmp, 'workflow/team-profile.yaml'), 'utf8');
if (!profileAfter.includes('# user note')) {
  throw new Error('upgrade --force overwrote user facts in team-profile.yaml');
}
if (!fs.readFileSync(constitutionFile, 'utf8').includes('# user constitution note')) {
  throw new Error('upgrade --force overwrote user principles in constitution.md');
}
if (!fs.readFileSync(policyFile, 'utf8').includes('# user policy note')) {
  throw new Error('upgrade --force overwrote user policy in workflow/policy.yaml');
}
const upgradeStrayFiles = fs
  .readdirSync(path.join(tmp, 'workflow'))
  .filter((name) => name.endsWith('.agent-workflow-new'));
if (upgradeStrayFiles.length) {
  throw new Error(`upgrade --force should not produce new .agent-workflow-new files, found: ${upgradeStrayFiles.join(',')}`);
}

// Passing --upgrade in a genuinely fresh directory must not turn a new install
// into a legacy workspace. Fresh installs always start with automatic selection.
const freshUpgradeTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-fresh-upgrade-'));
runAt(freshUpgradeTmp, [
  '--target', freshUpgradeTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
const freshUpgradePolicy = fs.readFileSync(path.join(freshUpgradeTmp, 'workflow/policy.yaml'), 'utf8');
if (!/^default_profile:\s*adaptive(?:\s|#|$)/m.test(freshUpgradePolicy)) {
  throw new Error('fresh install with --upgrade should still default to adaptive');
}

// A recognizable legacy workspace upgraded without a policy must keep the old strict behavior.
const legacyPolicyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-legacy-policy-'));
fs.mkdirSync(path.join(legacyPolicyTmp, 'workflow'), { recursive: true });
fs.writeFileSync(
  path.join(legacyPolicyTmp, 'workflow/team-profile.yaml'),
  'schema_version: "1.0"\n# existing openone workspace\n'
);
runAt(legacyPolicyTmp, [
  '--target', legacyPolicyTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
const legacyPolicyFile = path.join(legacyPolicyTmp, 'workflow/policy.yaml');
const legacyPolicy = fs.readFileSync(legacyPolicyFile, 'utf8');
if (!/^default_profile:\s*strict(?:\s|#|$)/m.test(legacyPolicy)) {
  throw new Error('upgrade without workflow/policy.yaml did not preserve strict behavior');
}
fs.writeFileSync(legacyPolicyFile, `${legacyPolicy}\n# user legacy policy note\n`);
runAt(legacyPolicyTmp, [
  '--target', legacyPolicyTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
if (!fs.readFileSync(legacyPolicyFile, 'utf8').includes('# user legacy policy note')) {
  throw new Error('repeated upgrade overwrote the legacy workspace policy');
}

// Re-running the initializer in a recognizable old workspace must also stay
// strict even when the caller forgot --upgrade.
const legacyRerunTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-legacy-rerun-'));
fs.mkdirSync(path.join(legacyRerunTmp, 'workflow'), { recursive: true });
fs.writeFileSync(
  path.join(legacyRerunTmp, 'workflow/team-profile.yaml'),
  'schema_version: "1.0"\n# existing openone workspace\n'
);
runAt(legacyRerunTmp, [
  '--target', legacyRerunTmp, '--tools', 'codex', '--yes'
]);
const rerunPolicy = fs.readFileSync(path.join(legacyRerunTmp, 'workflow/policy.yaml'), 'utf8');
if (!/^default_profile:\s*strict(?:\s|#|$)/m.test(rerunPolicy)) {
  throw new Error('recognizable old workspace without --upgrade did not preserve strict behavior');
}

// Codex 0.1.0 migration: exact generated prompts are removed, while custom,
// edited and symlinked content is preserved. Dry-run must remain side-effect free.
const migrationTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-migration-'));
const promptsRoot = path.join(migrationTmp, '.codex/prompts');
fs.mkdirSync(promptsRoot, { recursive: true });
for (const [index, command] of commands.entries()) {
  let content = historicalCodexPrompt(command.id);
  if (index === 0) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(path.join(promptsRoot, `${command.id}.md`), content);
}
fs.writeFileSync(path.join(promptsRoot, 'my-custom-prompt.md'), '# 用户自定义 prompt\n');
const nestedLegacyCopy = path.join(promptsRoot, 'archive/01-需求讨论.md');
fs.mkdirSync(path.dirname(nestedLegacyCopy), { recursive: true });
fs.writeFileSync(nestedLegacyCopy, historicalCodexPrompt('01-需求讨论'));
const orphanManaged = path.join(migrationTmp, '.agents/skills/workflow-removed-stage/SKILL.md');
fs.mkdirSync(path.dirname(orphanManaged), { recursive: true });
fs.writeFileSync(orphanManaged, '<!-- generated-by: openone-workflow-kit; managed-adapter: true -->\n# removed\n');
const customSkill = path.join(migrationTmp, '.agents/skills/my-custom-skill/SKILL.md');
fs.mkdirSync(path.dirname(customSkill), { recursive: true });
fs.writeFileSync(customSkill, '---\nname: my-custom-skill\ndescription: user owned\n---\n');

const dryRun = runAt(migrationTmp, [
  '--target', migrationTmp, '--tools', 'codex', '--upgrade', '--force', '--dry-run'
]);
if (!dryRun.stdout.includes('将删除 .codex/prompts/01-需求讨论.md')) {
  throw new Error('upgrade dry-run did not report a generated legacy prompt');
}
for (const command of commands) {
  if (!fs.existsSync(path.join(promptsRoot, `${command.id}.md`))) {
    throw new Error(`upgrade dry-run deleted ${command.id}.md`);
  }
}

runAt(migrationTmp, [
  '--target', migrationTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
for (const command of commands) {
  if (fs.existsSync(path.join(promptsRoot, `${command.id}.md`))) {
    throw new Error(`upgrade did not remove generated prompt ${command.id}.md`);
  }
}
if (!fs.existsSync(path.join(promptsRoot, 'my-custom-prompt.md'))) {
  throw new Error('upgrade removed a user custom prompt');
}
if (!fs.existsSync(nestedLegacyCopy)) {
  throw new Error('upgrade removed a nested user backup with a historical fingerprint');
}
if (fs.existsSync(orphanManaged)) throw new Error('upgrade did not remove an orphan managed Skill');
if (!fs.existsSync(customSkill)) throw new Error('upgrade removed a user custom Skill');

const customCollisionTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-custom-skill-collision-'));
const collidingSkill = path.join(customCollisionTmp, '.agents/skills/workflow-init-workspace/SKILL.md');
fs.mkdirSync(path.dirname(collidingSkill), { recursive: true });
fs.writeFileSync(collidingSkill, '---\nname: workflow-init-workspace\ndescription: user owned\n---\n');
runAt(customCollisionTmp, [
  '--target', customCollisionTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
if (!fs.readFileSync(collidingSkill, 'utf8').includes('description: user owned')) {
  throw new Error('upgrade overwrote a same-name user-owned Skill');
}
const collidingSkillSidecar = `${collidingSkill}.agent-workflow-new`;
if (!fs.readFileSync(collidingSkillSidecar, 'utf8').includes('managed-adapter: true')) {
  throw new Error('upgrade did not write a merge sidecar for a same-name user-owned Skill');
}
const collidingMetadata = path.join(customCollisionTmp, '.agents/skills/workflow-init-workspace/agents/openai.yaml');
if (fs.existsSync(collidingMetadata)) {
  throw new Error('upgrade mixed generated metadata into a user-owned Skill directory');
}
if (!fs.existsSync(`${collidingMetadata}.agent-workflow-new`)) {
  throw new Error('upgrade did not sidecar generated metadata for a user-owned Skill directory');
}

const sidecarCollisionTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-sidecar-collision-'));
fs.writeFileSync(path.join(sidecarCollisionTmp, 'AGENTS.md'), '# user entry\n');
fs.writeFileSync(path.join(sidecarCollisionTmp, 'AGENTS.md.agent-workflow-new'), '# merge in progress\n');
const sidecarCollision = spawnSync(process.execPath, [
  init, '--target', sidecarCollisionTmp, '--tools', 'codex', '--yes'
], { cwd: sidecarCollisionTmp, encoding: 'utf8' });
if (sidecarCollision.status === 0 ||
    !`${sidecarCollision.stdout}\n${sidecarCollision.stderr}`.includes('managed merge sidecar')) {
  throw new Error('initializer overwrote or ignored an occupied regular merge sidecar');
}
if (fs.existsSync(path.join(sidecarCollisionTmp, 'workflow'))) {
  throw new Error('write-plan preflight left partial workflow files before a sidecar collision');
}

const editedTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-edited-'));
const editedPrompt = path.join(editedTmp, '.codex/prompts/01-需求讨论.md');
fs.mkdirSync(path.dirname(editedPrompt), { recursive: true });
fs.writeFileSync(editedPrompt, `${historicalCodexPrompt('01-需求讨论')}\n# 用户追加规则\n`);
runAt(editedTmp, ['--target', editedTmp, '--tools', 'codex', '--upgrade', '--force', '--yes']);
if (!fs.existsSync(editedPrompt)) throw new Error('upgrade removed an edited historical prompt');

const cleanMigrationTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-clean-migration-'));
for (const command of commands) {
  const file = path.join(cleanMigrationTmp, `.codex/prompts/${command.id}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, historicalCodexPrompt(command.id));
}
runAt(cleanMigrationTmp, [
  '--target', cleanMigrationTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
if (fs.existsSync(path.join(cleanMigrationTmp, '.codex'))) {
  throw new Error('upgrade should remove the empty legacy .codex directory');
}
runAt(cleanMigrationTmp, [
  '--target', cleanMigrationTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
]);
if (fs.existsSync(path.join(cleanMigrationTmp, '.codex'))) {
  throw new Error('a repeated upgrade recreated the legacy .codex directory');
}

if (process.platform !== 'win32') {
  const symlinkTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-symlink-'));
  const externalPrompts = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-external-prompts-'));
  const externalFile = path.join(externalPrompts, '01-需求讨论.md');
  fs.writeFileSync(externalFile, historicalCodexPrompt('01-需求讨论'));
  fs.mkdirSync(path.join(symlinkTmp, '.codex'), { recursive: true });
  fs.symlinkSync(externalPrompts, path.join(symlinkTmp, '.codex/prompts'), 'dir');
  runAt(symlinkTmp, ['--target', symlinkTmp, '--tools', 'codex', '--upgrade', '--force', '--yes']);
  if (!fs.existsSync(externalFile)) throw new Error('upgrade followed a legacy prompts symlink');

  const parentSymlinkTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-codex-parent-symlink-'));
  const externalCodex = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-external-codex-'));
  const externalParentFile = path.join(externalCodex, 'prompts/01-需求讨论.md');
  fs.mkdirSync(path.dirname(externalParentFile), { recursive: true });
  fs.writeFileSync(externalParentFile, historicalCodexPrompt('01-需求讨论'));
  fs.symlinkSync(externalCodex, path.join(parentSymlinkTmp, '.codex'), 'dir');
  runAt(parentSymlinkTmp, [
    '--target', parentSymlinkTmp, '--tools', 'codex', '--upgrade', '--force', '--yes'
  ]);
  if (!fs.existsSync(externalParentFile)) {
    throw new Error('upgrade followed a parent symlink above legacy prompts');
  }

  const writeSymlinkTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-skill-write-symlink-'));
  const externalSkillDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-external-skill-'));
  fs.mkdirSync(path.join(writeSymlinkTmp, '.agents/skills'), { recursive: true });
  fs.symlinkSync(
    externalSkillDir,
    path.join(writeSymlinkTmp, '.agents/skills/workflow-init-workspace'),
    'dir'
  );
  const unsafeWrite = spawnSync(process.execPath, [
    init, '--target', writeSymlinkTmp, '--tools', 'codex', '--force', '--yes'
  ], { cwd: writeSymlinkTmp, encoding: 'utf8' });
  if (unsafeWrite.status === 0 || !`${unsafeWrite.stdout}\n${unsafeWrite.stderr}`.includes('symbolic link')) {
    throw new Error('initializer did not reject a managed Skill path symlink');
  }
  if (fs.readdirSync(externalSkillDir).length !== 0) {
    throw new Error('initializer wrote through a managed Skill path symlink');
  }
  if (fs.existsSync(path.join(writeSymlinkTmp, 'workflow'))) {
    throw new Error('write-plan preflight left partial workflow files before a Skill symlink failure');
  }

  const alternateTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-alternate-symlink-'));
  const alternateExternal = path.join(os.tmpdir(), `openone-alternate-external-${process.pid}.txt`);
  fs.writeFileSync(path.join(alternateTmp, 'AGENTS.md'), '# 用户现有说明\n');
  fs.writeFileSync(alternateExternal, 'must remain unchanged\n');
  fs.symlinkSync(alternateExternal, path.join(alternateTmp, 'AGENTS.md.agent-workflow-new'));
  const alternateWrite = spawnSync(process.execPath, [
    init, '--target', alternateTmp, '--tools', 'codex', '--yes'
  ], { cwd: alternateTmp, encoding: 'utf8' });
  if (alternateWrite.status === 0 || !`${alternateWrite.stdout}\n${alternateWrite.stderr}`.includes('symbolic link')) {
    throw new Error('initializer did not reject an alternate managed-file symlink');
  }
  if (fs.readFileSync(alternateExternal, 'utf8') !== 'must remain unchanged\n') {
    throw new Error('initializer wrote through an .agent-workflow-new symlink');
  }
  if (fs.existsSync(path.join(alternateTmp, 'workflow'))) {
    throw new Error('write-plan preflight left partial workflow files before a sidecar symlink failure');
  }
}

// Cursor-only install must still generate the compact tool-neutral entry,
// even though Codex is not selected.
const cursorTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-workflow-cursor-'));
spawnSync(process.execPath, [init, '--target', cursorTmp, '--tools', 'cursor', '--yes'], {
  cwd: cursorTmp,
  encoding: 'utf8'
});
for (const rel of [
  'AGENTS.md',
  '.cursor/rules/agent-workflow-core.mdc',
  '.cursor/commands/04-代码实现.md'
]) {
  if (!fs.existsSync(path.join(cursorTmp, rel))) {
    throw new Error(`cursor-only install missing file: ${rel}`);
  }
}
const cursorAgents = fs.readFileSync(path.join(cursorTmp, 'AGENTS.md'), 'utf8');
if (!cursorAgents.includes('workflow/policy.yaml') || !cursorAgents.includes('自动选择')) {
  throw new Error('cursor-only AGENTS.md missing the compact policy guidance');
}

console.log('Smoke test passed.');

function historicalCodexPrompt(id) {
  return `# ${id}\n\n读取 \`AGENTS.md\`、\`workflow/team-profile.yaml\` 和 \`workflow/core/commands/${id}.md\`。\n\n优先使用本地证据。必要资料缺失时，更新 \`workflow/INITIALIZATION_QUESTIONS.md\` 或向用户索要缺失路径。\n`;
}
