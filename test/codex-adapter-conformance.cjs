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

console.log(`Codex adapter conformance passed: 1 umbrella + ${commands.length} stage Skills; negative cases covered.`);

function validateCodexAdapter(workspace, commandList) {
  const failures = [];
  const required = [
    'AGENTS.md',
    'workflow/core/command-manifest.yaml',
    '.agents/skills/agent-workflow/SKILL.md'
  ];
  for (const rel of required) {
    if (!isFile(workspace, rel)) failures.push(`缺少 ${rel}`);
  }
  if (fs.existsSync(path.join(workspace, '.codex/prompts'))) {
    failures.push('不得生成项目级 .codex/prompts');
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
      command.description,
      command.argument_hint,
      'generated-by: openone-workflow-kit; managed-adapter: true'
    ]) {
      if (!skill.includes(marker)) failures.push(`${skillRel} 缺少 ${marker}`);
    }
    for (const marker of [
      `display_name: "${command.id} ${command.title}"`,
      `执行 /${command.id} 阶段`,
      'allow_implicit_invocation: false',
      'generated-by: openone-workflow-kit; managed-adapter: true'
    ]) {
      if (!metadata.includes(marker)) failures.push(`${metadataRel} 缺少 ${marker}`);
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

function isFile(workspace, rel) {
  try {
    return fs.statSync(path.join(workspace, rel)).isFile();
  } catch {
    return false;
  }
}
