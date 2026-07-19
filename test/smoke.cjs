#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const init = path.join(root, 'bin', 'init-workspace.cjs');
const { toPortablePath } = require(init);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-workflow-smoke-'));

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

function assertFile(rel) {
  const file = path.join(tmp, rel);
  if (!fs.existsSync(file)) throw new Error(`missing file: ${rel}`);
}

function assertContains(rel, text) {
  const file = path.join(tmp, rel);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(text)) throw new Error(`${rel} does not contain ${text}`);
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
  '.codex/prompts/init-workspace.md',
  '.codex/prompts/04-代码实现.md',
  '.codex/prompts/05-代码审查.md',
  '.codex/prompts/10-复盘总结.md',
  '.codex/prompts/new-product.md',
  '.codex/prompts/B1-业务定位.md',
  '.claude/commands/04-代码实现.md',
  '.claude/commands/B1-业务定位.md',
  '.claude/commands/B9-策略复盘.md',
  '.cursor/rules/agent-workflow-core.mdc',
  '.github/copilot-instructions.md',
  '.codebuddy/instructions.md',
  '.kiro/instructions.md',
  '.trae/instructions.md',
  'workflow/team-profile.yaml',
  'workflow/INITIALIZATION_QUESTIONS.md',
  'workflow/core/commands/init-workspace.md',
  'workflow/core/commands/04-代码实现.md',
  'workflow/core/commands/定义完成.md',
  'workflow/core/commands/交付至完成.md',
  'workflow/core/commands/澄清.md',
  'workflow/core/commands/一致性检查.md',
  'workflow/core/templates/completion-contract.md',
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

assertContains('workflow/team-profile.yaml', '- trae');
assertContains('workflow/team-profile.yaml', 'apps/web');
assertContains('workflow/team-profile.yaml', 'services/api');
assertContains('workflow/INSTALL_REPORT.md', '初始化器没有执行远程 Git 命令');
assertContains('workflow/team-profile.yaml', 'agent-allowed-after-scope-check');

// AGENTS.md must contain the comprehensive usage guide, not just hard gates.
assertContains('AGENTS.md', '## 快速开始');
assertContains('AGENTS.md', '## 工作流命令');
assertContains('AGENTS.md', '## 任务描述模板');
assertContains('AGENTS.md', '## 工具使用方式');
assertContains('AGENTS.md', '### Cursor');
assertContains('AGENTS.md', '/04-代码实现');
// The command table must list every stage.
assertContains('AGENTS.md', '/08-发布准备');
assertContains('AGENTS.md', '/09-发布执行');
assertContains('AGENTS.md', '/10-复盘总结');
// The business track must be wired into the guide, profile, and adapters.
assertContains('AGENTS.md', '/new-product');
assertContains('AGENTS.md', '/B1-业务定位');
assertContains('AGENTS.md', '/B9-策略复盘');
assertContains('workflow/team-profile.yaml', 'business_dir');
assertContains('workflow/team-profile.yaml', 'outbound_marketing_actions');
assertContains('workflow/team-profile.yaml', 'market_research');
assertContains('.cursor/commands/B1-业务定位.md', 'workflow/core/commands/B1-业务定位.md');
assertContains('.cursor/rules/agent-workflow-core.mdc', 'B9-策略复盘');
// Definition-of-done mechanics must be wired through guide, profile, and adapters.
assertContains('AGENTS.md', '/定义完成');
assertContains('AGENTS.md', '/交付至完成');
assertContains('AGENTS.md', '完成合同');
assertContains('workflow/team-profile.yaml', 'specs_dir');
assertContains('workflow/team-profile.yaml', 'done_verdict');
assertContains('.cursor/rules/agent-workflow-core.mdc', '定义完成');
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
assertContains('.cursor/rules/agent-workflow-core.mdc', 'workflow/core/commands/04-代码实现.md');
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
run(['--target', tmp, '--tools', 'codex,claude,cursor', '--upgrade', '--force', '--yes']);
const profileAfter = fs.readFileSync(path.join(tmp, 'workflow/team-profile.yaml'), 'utf8');
if (profileAfter.includes('# user note')) {
  throw new Error('upgrade --force did not overwrite team-profile.yaml');
}
const upgradeStrayFiles = fs
  .readdirSync(path.join(tmp, 'workflow'))
  .filter((name) => name.endsWith('.agent-workflow-new'));
if (upgradeStrayFiles.length) {
  throw new Error(`upgrade --force should not produce new .agent-workflow-new files, found: ${upgradeStrayFiles.join(',')}`);
}

// Cursor-only install must still generate AGENTS.md (the tool-neutral usage guide),
// even though codex is not selected.
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
if (!cursorAgents.includes('### Cursor')) {
  throw new Error('cursor-only AGENTS.md missing the Cursor usage section');
}

console.log('Smoke test passed.');
