#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadCommandManifest } = require('./command-manifest.cjs');

const KIT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_VERSION = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, 'package.json'), 'utf8')).version;
const SUPPORTED_TOOLS = ['codex', 'claude', 'cursor', 'copilot', 'codebuddy', 'kiro', 'trae'];
const TOOL_ALIASES = {
  trea: 'trae',
  claude_code: 'claude',
  'claude-code': 'claude',
  github_copilot: 'copilot',
  'github-copilot': 'copilot'
};
const GENERATED_BY = `openone-workflow-kit ${PACKAGE_VERSION}`;
const MANAGED_ADAPTER_MARKER = 'generated-by: openone-workflow-kit; managed-adapter: true';
const COMMAND_MANIFEST = loadCommandManifest(path.join(KIT_ROOT, 'workflow/core/command-manifest.yaml'));
const COMMANDS = COMMAND_MANIFEST.commands;
const WORKFLOW_POLICY_TEMPLATE = 'workflow/core/templates/workflow-policy.template.yaml';
// Keep the existing tuple consumers small while making the manifest the single source of truth.
const STAGES = COMMANDS.map(({ id, title, description }) => [id, title, description]);

const REQUIRED_SOURCES = [
  {
    key: 'business_intro',
    label: '业务介绍',
    question: '请提供业务介绍或产品概览文件路径',
    match: /(业务介绍|业务概览|产品介绍|company|business|overview|readme)/i
  },
  {
    key: 'project_docs',
    label: '项目资料',
    question: '请提供项目资料、PRD、需求或架构文档目录',
    match: /(项目资料|需求|prd|product|docs|architecture|spec)/i
  },
  {
    key: 'ui_specs',
    label: 'UI 设计文件',
    question: '请提供 UI 规范、设计稿、原型或设计系统文件路径',
    match: /(ui|design|figma|prototype|mockup|原型|设计|视觉|规范)/i
  },
  {
    key: 'frontend_rules',
    label: '前端开发规范',
    question: '请提供前端开发规范目录或文件路径',
    match: /(frontend|front-end|前端|web.*规范|ui.*规范)/i
  },
  {
    key: 'backend_rules',
    label: '后端开发规范',
    question: '请提供后端开发规范目录或文件路径',
    match: /(backend|back-end|server|后端|服务端)/i
  },
  {
    key: 'testing_rules',
    label: '测试规范',
    question: '请提供测试规范、测试用例或 QA 资料路径',
    match: /(test|testing|qa|测试|用例|验收)/i
  },
  {
    key: 'market_research',
    label: '市场与竞品资料',
    question: '请提供市场调研、竞品分析、用户访谈或渠道数据资料路径（商业化轨 B1-B9 使用；暂缺可跳过）',
    match: /(市场|竞品|调研|访谈|获客|营销|渠道|定价|market|competitor|research|gtm|marketing|pricing|persona|icp)/i
  }
];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'target',
  '.idea',
  '.vscode',
  '_worktrees',
  'open-workflow-kit',
  'openone-workflow-kit',
  'workflow'
]);

const CAPABILITY_FILES = [
  'branch-gatekeeper.md',
  'release-safety-checker.md',
  'prd-code-diff-checker.md',
  'contract-tracer.md',
  'worktree-isolator.md',
  'repo-baseline-scanner.md',
  'impact-scope-analyzer.md',
  'security-reviewer.md',
  'verify-app.md',
  'ci-cd-automation-governor.md',
  'personal-git-operator.md',
  'personal-release-checklist.md',
  'knowledge-capture-maintainer.md',
  'deployment-readiness-checker.md',
  'runtime-evidence-triage.md',
  'data-change-safety-checker.md',
  'protocol-state-machine-checker.md',
  'test-evidence-reviewer.md',
  'ui-baseline-reviewer.md',
  'memory-curator.md',
  'rule-extractor.md',
  'market-evidence-grader.md',
  'channel-experiment-tracker.md',
  'definition-lint.md',
  'acceptance-oracle-tracker.md'
];

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}

module.exports = { toPortablePath };

// Paths persisted in generated workflow artifacts are workspace-relative
// identifiers, not host-OS paths. Keep them stable across Windows/macOS/Linux.
function toPortablePath(value) {
  return String(value).replace(/\\/g, '/');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestedTarget = path.resolve(options.target || process.cwd());
  if (!fs.existsSync(requestedTarget) || !fs.statSync(requestedTarget).isDirectory()) {
    throw new Error(`目标目录不存在: ${requestedTarget}`);
  }
  const target = fs.realpathSync(requestedTarget);

  const detectedTools = detectTools(target);
  let enabledTools = options.tools ? normalizeTools(options.tools) : detectedTools;
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !options.yes && !options.dryRun;

  if (!enabledTools.length && interactive) {
    const answer = await promptLine(
      `请选择 AI 工具（${SUPPORTED_TOOLS.join(', ')}）。留空会生成全部本地工具入口: `
    );
    enabledTools = normalizeTools(answer || SUPPORTED_TOOLS.join(','));
  }
  if (!enabledTools.length) enabledTools = SUPPORTED_TOOLS.slice();

  const repos = scanRepos(target);
  const sources = scanRequiredSources(target);
  const missing = REQUIRED_SOURCES.filter((item) => sources[item.key].status === 'missing');

  const profile = {
    target,
    enabledTools,
    detectedTools,
    repos,
    sources,
    missing
  };

  if (interactive && missing.length) {
    for (const item of missing) {
      const answer = await promptLine(`${item.question} (optional, comma separated): `);
      if (answer.trim()) {
        sources[item.key] = {
          status: 'provided_by_user',
          paths: answer.split(',').map((v) => v.trim()).filter(Boolean)
        };
      }
    }
    profile.missing = REQUIRED_SOURCES.filter((item) => sources[item.key].status === 'missing');
  }

  const plannedWrites = buildInstallPlan(target, profile, options);
  const legacyPlan = planLegacyCleanup(target, options, plannedWrites, profile.enabledTools);
  if (options.dryRun) {
    printDryRun(target, profile, plannedWrites, legacyPlan);
    return;
  }

  assertSafeWritePlan(plannedWrites, options, target);
  for (const write of plannedWrites) {
    writeManagedFile(write, options, target);
  }
  executeLegacyCleanup(legacyPlan);

  console.log(`已在 ${target} 初始化 agent 工作流`);
  console.log(`启用工具: ${enabledTools.join(', ')}`);
  if (profile.missing.length) {
    console.log('部分必要资料未找到，请查看 workflow/INITIALIZATION_QUESTIONS.md。');
  }
}

function parseArgs(argv) {
  const options = { target: '', tools: '', yes: false, force: false, upgrade: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--target') options.target = argv[++i] || '';
    else if (arg === '--tools') options.tools = argv[++i] || '';
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--upgrade') options.upgrade = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    else throw new Error(`未知参数: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`用法: node bin/init-workspace.cjs [options]

选项:
  --target <dir>       目标工作区根目录，默认是当前目录。
  --tools <list>       逗号分隔的工具列表: ${SUPPORTED_TOOLS.join(', ')}。
  --yes, -y            非交互模式，缺失资料会写入问题清单。
  --force              覆盖已生成的入口文件。
  --upgrade            刷新生成文件；存在 team-profile.yaml 时按当前策略处理。
  --dry-run            只展示计划写入的文件，不修改磁盘。
  --help, -h           显示帮助。

该初始化命令不会执行远程 Git 操作、push 代码、触发构建部署或数据库写入。
个人工作流允许后续 agent 在明确任务范围内执行本地分支命名、创建、commit、tag 和本地 merge；远程 push、release、部署和生产配置写入仍需要用户明确授权。`);
}

function normalizeTools(value) {
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const normalized = [];
  for (const item of raw) {
    const input = item.trim().toLowerCase();
    const tool = TOOL_ALIASES[input] || input;
    if (!tool) continue;
    if (!SUPPORTED_TOOLS.includes(tool)) {
      throw new Error(`不支持的工具: ${tool}。支持的工具: ${SUPPORTED_TOOLS.join(', ')}`);
    }
    if (!normalized.includes(tool)) normalized.push(tool);
  }
  return normalized;
}

function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function detectTools(root) {
  const hits = [];
  const exists = (rel) => fs.existsSync(path.join(root, rel));
  if (exists('.codex') || exists('AGENTS.md')) hits.push('codex');
  if (exists('.claude') || exists('CLAUDE.md')) hits.push('claude');
  if (exists('.cursor')) hits.push('cursor');
  if (exists('.github/copilot-instructions.md') || exists('.github/prompts')) hits.push('copilot');
  if (exists('.codebuddy')) hits.push('codebuddy');
  if (exists('.kiro')) hits.push('kiro');
  if (exists('.trae')) hits.push('trae');
  return hits;
}

function scanRepos(root) {
  const repos = [];
  const seen = new Set();

  function visit(dir, depth) {
    if (depth > 2) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const rel = toPortablePath(path.relative(root, dir)) || '.';
    const marker = detectRepoMarker(dir);
    if (marker && !seen.has(rel)) {
      seen.add(rel);
      repos.push({
        path: rel,
        marker,
        tech_stack: detectTechStack(dir),
        current_branch: marker === 'git' ? detectCurrentGitBranch(dir) : 'unknown'
      });
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  }

  visit(root, 0);
  return repos.sort((a, b) => a.path.localeCompare(b.path));
}

function detectRepoMarker(dir) {
  const markers = [
    ['.git', 'git'],
    ['package.json', 'node'],
    ['pom.xml', 'maven'],
    ['build.gradle', 'gradle'],
    ['go.mod', 'go'],
    ['Cargo.toml', 'rust'],
    ['pyproject.toml', 'python'],
    ['requirements.txt', 'python']
  ];
  for (const [file, marker] of markers) {
    if (fs.existsSync(path.join(dir, file))) return marker;
  }
  return '';
}

function detectCurrentGitBranch(dir) {
  const dotGit = path.join(dir, '.git');
  let gitDir = dotGit;
  try {
    const stat = fs.lstatSync(dotGit);
    if (stat.isFile()) {
      const pointer = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)\s*$/m);
      if (!pointer) return 'unknown';
      gitDir = path.resolve(dir, pointer[1]);
    } else if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return 'unknown';
    }
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    const branch = head.match(/^ref:\s+refs\/heads\/(.+)$/);
    if (branch) return branch[1];
    return /^[0-9a-f]{40,64}$/i.test(head) ? `detached:${head.slice(0, 12)}` : 'unknown';
  } catch {
    return 'unknown';
  }
}

function detectTechStack(dir) {
  const stack = [];
  const has = (file) => fs.existsSync(path.join(dir, file));
  if (has('pom.xml')) stack.push('java-maven');
  if (has('build.gradle')) stack.push('java-gradle');
  if (has('package.json')) {
    stack.push('node');
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
      if (deps.vue) stack.push('vue');
      if (deps.react) stack.push('react');
      if (deps.next) stack.push('nextjs');
      if (deps.vite) stack.push('vite');
      if (deps.typescript) stack.push('typescript');
    } catch {
      stack.push('package-json-unreadable');
    }
  }
  if (has('go.mod')) stack.push('go');
  if (has('pyproject.toml') || has('requirements.txt')) stack.push('python');
  return stack.length ? stack : ['unknown'];
}

function scanRequiredSources(root) {
  const candidates = [];
  walkFiles(root, 4, (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!['.md', '.txt', '.docx', '.pdf', '.yaml', '.yml', '.json'].includes(ext)) return;
    candidates.push(toPortablePath(path.relative(root, file)));
  });

  const result = {};
  for (const source of REQUIRED_SOURCES) {
    const matches = candidates.filter((rel) => source.match.test(rel)).slice(0, 20);
    result[source.key] = matches.length
      ? { status: 'detected', paths: matches }
      : { status: 'missing', paths: [] };
  }
  return result;
}

function walkFiles(root, maxDepth, visitor) {
  function visit(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        visit(full, depth + 1);
      } else {
        visitor(full);
      }
    }
  }
  visit(root, 0);
}

function buildInstallPlan(target, profile, options) {
  const writes = [];
  const add = (rel, content, policy = {}) => writes.push({
    file: path.join(target, rel),
    content,
    ...policy
  });

  add('workflow/team-profile.yaml', makeTeamProfileYaml(profile), { preserveOnUpgrade: true });
  add('workflow/README.md', makeWorkflowReadme());
  add('workflow/core/README.md', readKitFile('workflow/core/README.md'));
  add('workflow/core/command-manifest.yaml', readKitFile('workflow/core/command-manifest.yaml'));
  add('workflow/core/tools/resolve-policy.cjs', readKitFile('bin/resolve-policy.cjs'));
  add('workflow/core/commands/README.md', readKitFile('workflow/core/commands/README.md'));
  add('workflow/core/templates/README.md', readKitFile('workflow/core/templates/README.md'));
  add('workflow/core/templates/00-workflow-status.md', readKitFile('workflow/core/templates/00-workflow-status.md'));
  add('workflow/core/templates/stage-document.md', readKitFile('workflow/core/templates/stage-document.md'));
  add('workflow/core/templates/00-business-status.md', readKitFile('workflow/core/templates/00-business-status.md'));
  add('workflow/core/templates/business-stage-document.md', readKitFile('workflow/core/templates/business-stage-document.md'));
  add('workflow/core/templates/completion-contract.md', readKitFile('workflow/core/templates/completion-contract.md'));
  add('workflow/core/templates/constitution.template.md', readKitFile('workflow/core/templates/constitution.template.md'));
  add('workflow/core/templates/living-spec.md', readKitFile('workflow/core/templates/living-spec.md'));
  const policyTemplate = readKitFile(WORKFLOW_POLICY_TEMPLATE);
  add(WORKFLOW_POLICY_TEMPLATE, policyTemplate);
  const targetPolicy = path.join(target, 'workflow/policy.yaml');
  const missingPolicyInExistingWorkflow = !fs.existsSync(targetPolicy) &&
    hasExistingWorkflowFootprint(target);
  const policyProfile = missingPolicyInExistingWorkflow ? 'strict' : 'adaptive';
  add('workflow/policy.yaml', makeWorkflowPolicy(policyTemplate, policyProfile), { preserveOnUpgrade: true });
  add('workflow/constitution.md', readKitFile('workflow/core/templates/constitution.template.md'), { preserveOnUpgrade: true });
  add('workflow/standards/README.md', makeStandardsReadme(), { preserveOnUpgrade: true });
  add('specs/README.md', makeSpecsReadme(), { preserveOnUpgrade: true });
  add('workflow/core/templates/team-profile.template.yaml', readKitFile('workflow/core/templates/team-profile.template.yaml'));
  add('workflow/core/capabilities/README.md', readKitFile('workflow/core/capabilities/README.md'));
  for (const name of CAPABILITY_FILES) {
    add(`workflow/core/capabilities/${name}`, readKitFile(`workflow/core/capabilities/${name}`));
  }
  add('workflow/adapters/README.md', readKitFile('workflow/adapters/README.md'));
  add('workflow/INSTALL_REPORT.md', makeInstallReport(profile, options));
  if (profile.missing.length) add('workflow/INITIALIZATION_QUESTIONS.md', makeQuestions(profile));

  for (const [id] of STAGES) {
    const rel = `workflow/core/commands/${id}.md`;
    add(rel, readKitFile(rel));
  }

  // Keep the globally loaded entry compact. Detailed stage behavior stays in
  // the selected command and policy so small tasks do not pay for all stages.
  add('AGENTS.md', makeAgentsEntry(profile));
  if (profile.enabledTools.includes('codex')) {
    add('.agents/skills/agent-workflow/SKILL.md', makeAgentWorkflowSkill(), { managedAdapter: true });
    add('.agents/skills/agent-workflow/agents/openai.yaml', makeAgentWorkflowSkillMetadata(), { managedAdapter: true });
    for (const command of COMMANDS) {
      const base = `.agents/skills/${command.skill_slug}`;
      add(`${base}/SKILL.md`, makeStageSkill(command), { managedAdapter: true });
      add(`${base}/agents/openai.yaml`, makeStageSkillMetadata(command), { managedAdapter: true });
    }
  }
  if (profile.enabledTools.includes('claude')) {
    add('CLAUDE.md', '先读取 workflow/policy.yaml 和 workflow/team-profile.yaml，再按当前任务读取一个 workflow/core/commands 下的说明。.claude/commands 仅用于定位当前说明。\n');
    for (const [id] of STAGES) add(`.claude/commands/${id}.md`, makeThinCommand('Claude Code', id));
  }
  if (profile.enabledTools.includes('cursor')) {
    add('.cursor/rules/agent-workflow-core.mdc', makeCursorRule());
    // Cursor 1.6+ supports custom slash commands from .cursor/commands/*.md.
    for (const [id] of STAGES) add(`.cursor/commands/${id}.md`, makeThinCommand('Cursor', id));
  }
  if (profile.enabledTools.includes('copilot')) {
    add('.github/copilot-instructions.md', makeGenericInstructions('GitHub Copilot'));
  }
  if (profile.enabledTools.includes('codebuddy')) {
    add('.codebuddy/instructions.md', makeGenericInstructions('CodeBuddy'));
  }
  if (profile.enabledTools.includes('kiro')) {
    add('.kiro/instructions.md', makeGenericInstructions('Kiro'));
  }
  if (profile.enabledTools.includes('trae')) {
    add('.trae/instructions.md', makeGenericInstructions('Trae'));
  }

  return writes;
}

function readKitFile(rel) {
  return fs.readFileSync(path.join(KIT_ROOT, rel), 'utf8');
}

function makeWorkflowPolicy(template, profile) {
  if (profile === 'adaptive') return template;
  if (profile !== 'strict') throw new Error(`未知工作流处理方式: ${profile}`);
  if (!/^default_profile:\s*adaptive\s*$/m.test(template)) {
    throw new Error(`${WORKFLOW_POLICY_TEMPLATE} 缺少 default_profile: adaptive`);
  }
  return template.replace(
    /^default_profile:\s*adaptive\s*$/m,
    'default_profile: strict # 兼容旧工作区：升级前没有策略文件，继续使用完整检查'
  );
}

function hasExistingWorkflowFootprint(target) {
  return [
    'workflow/team-profile.yaml',
    'workflow/core/command-manifest.yaml',
    'workflow/INSTALL_REPORT.md'
  ].some((rel) => fs.existsSync(path.join(target, rel)));
}

function assertSafeWritePlan(writes, options, targetRoot) {
  for (const write of writes) determineManagedWriteAction(write, options, targetRoot);
}

function writeManagedFile(write, options, targetRoot) {
  assertNoManagedPathSymlink(targetRoot, write.file);
  fs.mkdirSync(path.dirname(write.file), { recursive: true });
  // Re-evaluate after mkdir so a path change between the plan and the write is
  // caught as close as possible to the mutation.
  const action = determineManagedWriteAction(write, options, targetRoot);
  const rel = relativeForDisplay(process.cwd(), action.file);
  if (action.type === 'unchanged') {
    console.log(`unchanged ${rel}`);
    return;
  }
  if (action.type === 'preserve') {
    console.log(`preserved ${rel}（升级时保留用户事实/原则文件）`);
    return;
  }
  if (action.type === 'write-alternate') {
    // The action resolver guarantees this path does not exist. `wx` closes the
    // last ordinary race without overwriting an existing merge sidecar.
    fs.writeFileSync(action.file, write.content, { flag: 'wx' });
    console.log(`exists ${relativeForDisplay(process.cwd(), write.file)} -> wrote ${rel}`);
    return;
  }
  fs.writeFileSync(action.file, write.content);
  console.log(`wrote ${rel}`);
}

function determineManagedWriteAction(write, options, targetRoot) {
  const { file, content } = write;
  assertNoManagedPathSymlink(targetRoot, file);
  const existing = readRegularFileIfPresent(file, 'managed path');
  if (existing.exists && existing.content === content) {
    return { type: 'unchanged', file };
  }
  if (existing.exists && options.upgrade && write.preserveOnUpgrade) {
    return { type: 'preserve', file };
  }

  const customAdapter = write.managedAdapter && isUserOwnedSkillPath(targetRoot, file, existing);
  if ((!existing.exists && !customAdapter) || (existing.exists && options.force && !customAdapter)) {
    return { type: 'write', file };
  }

  const alternate = `${file}.agent-workflow-new`;
  assertNoManagedPathSymlink(targetRoot, alternate);
  const alternateExisting = readRegularFileIfPresent(alternate, 'managed merge sidecar');
  if (alternateExisting.exists) {
    if (alternateExisting.content === content) return { type: 'unchanged', file: alternate };
    throw new Error(`拒绝覆盖已有 managed merge sidecar: ${alternate}`);
  }
  return { type: 'write-alternate', file: alternate };
}

function readRegularFileIfPresent(file, label) {
  if (!fs.existsSync(file)) return { exists: false, content: '' };
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} 不是普通文件: ${file}`);
  }
  return { exists: true, content: fs.readFileSync(file, 'utf8') };
}

function isUserOwnedSkillPath(targetRoot, file, existing) {
  if (existing.exists && !existing.content.includes(MANAGED_ADAPTER_MARKER)) return true;
  const skillsRoot = path.join(path.resolve(targetRoot), '.agents', 'skills');
  const relative = path.relative(skillsRoot, path.resolve(file));
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return false;
  const [slug] = relative.split(path.sep);
  if (!slug) return false;
  const owner = path.join(skillsRoot, slug, 'SKILL.md');
  if (path.resolve(owner) === path.resolve(file) || !fs.existsSync(owner)) return false;
  assertNoManagedPathSymlink(targetRoot, owner);
  const ownerFile = readRegularFileIfPresent(owner, 'Skill owner');
  return ownerFile.exists && !ownerFile.content.includes(MANAGED_ADAPTER_MARKER);
}

function assertNoManagedPathSymlink(targetRoot, file) {
  const root = path.resolve(targetRoot);
  const resolved = path.resolve(file);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`拒绝写入目标工作区外的 managed path: ${resolved}`);
  }
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`拒绝通过 symbolic link 写入 managed path: ${current}`);
    if (current !== resolved && !stat.isDirectory()) {
      throw new Error(`managed path 的父路径不是目录: ${current}`);
    }
  }
}

function printDryRun(target, profile, writes, legacyPlan) {
  console.log(`Dry run 目标目录: ${target}`);
  console.log(`已识别工具: ${profile.detectedTools.join(', ') || '(无)'}`);
  console.log(`启用工具: ${profile.enabledTools.join(', ')}`);
  console.log(`已识别仓库: ${profile.repos.length}`);
  console.log(`缺失资料组: ${profile.missing.map((item) => item.key).join(', ') || '(无)'}`);
  console.log('计划写入:');
  for (const write of writes) console.log(`- ${relativeForDisplay(target, write.file)}`);
  if (legacyPlan && (legacyPlan.remove.length || legacyPlan.keep.length)) {
    console.log('旧版 Codex adapter 清理计划（--upgrade 时执行）:');
    for (const item of legacyPlan.remove) {
      console.log(`- 将删除 ${relativeForDisplay(target, item.file)}（kit 指纹匹配；${item.reason}）`);
    }
    for (const item of legacyPlan.keep) {
      console.log(`- 保留 ${relativeForDisplay(target, item.file)}（内容不匹配 kit 指纹或路径不可安全遍历）`);
    }
  }
}

function relativeForDisplay(base, file) {
  return toPortablePath(path.relative(base, file));
}

function planLegacyCleanup(target, options, plannedWrites = [], enabledTools = []) {
  const plan = { remove: [], keep: [], dirs: [], targetRoot: target };
  if (!options.upgrade || !enabledTools.includes('codex')) return plan;

  const legacyRoot = path.join(target, '.codex/prompts');
  planLegacyCodexPrompts(target, legacyRoot, plan);
  planOrphanCodexSkills(target, plannedWrites, plan);
  return plan;
}

function planLegacyCodexPrompts(target, root, plan) {
  try {
    assertNoManagedPathSymlink(target, root);
  } catch {
    plan.keep.push({ file: root, reason: '旧版 Codex adapter 路径含 symbolic link，拒绝遍历或删除' });
    return;
  }
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  const reason = 'Codex 不加载项目级 .codex/prompts；1.0.0 起迁移到 .agents/skills';
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    plan.keep.push({ file: root, reason: `${reason}；路径不是可安全遍历的普通目录` });
    return;
  }

  // 0.1.0 only generated the 32 direct children below `.codex/prompts`.
  // Nested directories are user-owned, even when a copied file still has an
  // exact historical template fingerprint.
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || stat.isDirectory() || !stat.isFile()) {
      plan.keep.push({ file, reason: `${reason}；只迁移 0.1.0 生成的根层普通文件` });
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    const id = path.basename(file, '.md');
    const command = COMMANDS.find((item) => item.id === id);
    const generated = path.extname(file) === '.md' && command &&
      normalizeManagedText(text) === normalizeManagedText(makeHistoricalCodexPrompt(id));
    if (generated) {
      plan.remove.push({ file, reason, content: text });
      plan.dirs.push(path.dirname(file));
    } else {
      plan.keep.push({ file, reason });
    }
  }
  plan.dirs.push(root, path.dirname(root));
}

function planOrphanCodexSkills(target, plannedWrites, plan) {
  const root = path.join(target, '.agents/skills');
  try {
    assertNoManagedPathSymlink(target, root);
  } catch {
    plan.keep.push({ file: root, reason: 'Codex Skills 路径含 symbolic link，拒绝遍历或删除' });
    return;
  }
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    plan.keep.push({ file: root, reason: 'Codex Skills 根路径不是可安全遍历的普通目录' });
    return;
  }

  const expected = new Set(plannedWrites.map((item) => path.resolve(item.file)));
  const { files, unsafe } = listRegularFiles(root);
  for (const file of unsafe) {
    plan.keep.push({ file, reason: '拒绝跟随 Codex Skill 目录中的 symbolic link' });
  }
  for (const file of files) {
    if (expected.has(path.resolve(file))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes(MANAGED_ADAPTER_MARKER)) {
      plan.remove.push({
        file,
        reason: '当前 command manifest 已删除或重命名该 openone 管理的 Codex Skill',
        content: text
      });
      let directory = path.dirname(file);
      while (directory.startsWith(path.resolve(root))) {
        plan.dirs.push(directory);
        if (directory === path.resolve(root)) break;
        directory = path.dirname(directory);
      }
    } else {
      plan.keep.push({ file, reason: '不含 openone managed marker，按用户自定义 Skill 保留' });
    }
  }
}

function listRegularFiles(root) {
  const files = [];
  const unsafe = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) {
        unsafe.push(file);
      } else if (stat.isDirectory()) {
        visit(file);
      } else if (stat.isFile()) {
        files.push(file);
      }
    }
  }
  visit(root);
  return { files, unsafe };
}

function executeLegacyCleanup(plan) {
  for (const item of plan.remove) {
    let current;
    try {
      assertNoManagedPathSymlink(plan.targetRoot, item.file);
      const stat = fs.lstatSync(item.file);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('not a regular file');
      current = fs.readFileSync(item.file, 'utf8');
    } catch {
      console.log(`kept-changed ${item.file}（清理前路径状态已变化，拒绝删除）`);
      continue;
    }
    if (current !== item.content) {
      console.log(`kept-changed ${item.file}（清理计划生成后内容已变化，拒绝删除）`);
      continue;
    }
    try {
      assertNoManagedPathSymlink(plan.targetRoot, item.file);
    } catch {
      console.log(`kept-changed ${item.file}（清理前父路径状态已变化，拒绝删除）`);
      continue;
    }
    fs.unlinkSync(item.file);
    console.log(`removed-legacy ${item.file}（${item.reason}）`);
  }
  for (const item of plan.keep) {
    console.log(`kept-unrecognized ${item.file}（${item.reason}）`);
  }

  const directories = [...new Set(plan.dirs.map((dir) => path.resolve(dir)))]
    .sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
  for (const directory of directories) {
    try {
      assertNoManagedPathSymlink(plan.targetRoot, directory);
      const stat = fs.lstatSync(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
      if (fs.readdirSync(directory).length === 0) {
        fs.rmdirSync(directory);
        console.log(`removed-legacy-dir ${directory}`);
      }
    } catch {
      // Directory removal is best-effort; files are protected by exact fingerprints above.
    }
  }
}

function normalizeManagedText(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function makeTeamProfileYaml(profile) {
  const lines = [];
  lines.push('schema_version: "1.0"');
  lines.push(`generated_at: "${new Date().toISOString()}"`);
  lines.push(`generated_by: "${GENERATED_BY}"`);
  lines.push('');
  lines.push('team:');
  lines.push('  name: "<TODO: 团队名称>"');
  lines.push('  business_definition: "<TODO: 简短业务描述>"');
  lines.push('  target_users: []');
  lines.push('');
  lines.push('enabled_tools:');
  for (const tool of profile.enabledTools) lines.push(`  - ${tool}`);
  lines.push('');
  lines.push('detected_tools:');
  if (profile.detectedTools.length) for (const tool of profile.detectedTools) lines.push(`  - ${tool}`);
  else lines.push('  []');
  lines.push('');
  lines.push('source_materials:');
  for (const item of REQUIRED_SOURCES) {
    const source = profile.sources[item.key];
    lines.push(`  ${item.key}:`);
    lines.push(`    label: ${yamlString(item.label)}`);
    lines.push(`    status: ${yamlString(source.status)}`);
    lines.push('    paths:');
    if (source.paths.length) for (const p of source.paths) lines.push(`      - ${yamlString(p)}`);
    else lines.push('      []');
  }
  lines.push('');
  lines.push('repos:');
  if (profile.repos.length) {
    for (const repo of profile.repos) {
      lines.push(`  - path: ${yamlString(repo.path)}`);
      lines.push(`    marker: ${yamlString(repo.marker)}`);
      lines.push(`    current_branch: ${yamlString(repo.current_branch || 'unknown')}`);
      lines.push('    tech_stack:');
      for (const tech of repo.tech_stack) lines.push(`      - ${yamlString(tech)}`);
      lines.push('    family: "<TODO: 项目族分类>"');
      lines.push('    role: "<TODO: 服务或产品角色>"');
    }
  } else {
    lines.push('  []');
  }
  lines.push('');
  lines.push('branch_model:');
  lines.push('  type: "use-existing-repository-strategy"');
  lines.push('  production_branch: "unknown"');
  lines.push('  integration_branch: "unknown"');
  lines.push('  local_branch_rule: "agent may create a scoped local branch after inspecting uncommitted changes"');
  lines.push('');
  lines.push('risk_policy:');
  lines.push('  local_git_operations: "agent-allowed-after-scope-check"');
  lines.push('  branch_creation: "agent-allowed-for-personal-repos"');
  lines.push('  commit_tag_local_merge: "agent-allowed-after-verification"');
  lines.push('  remote_git_operations: "explicit-user-authorization-required"');
  lines.push('  push_and_release: "explicit-user-authorization-required"');
  lines.push('  outbound_marketing_actions: "explicit-user-authorization-required"');
  lines.push('  paid_ad_spend: "manual-only"');
  lines.push('  database_writes: "explicit-user-authorization-required"');
  lines.push('  production_config_writes: "explicit-user-authorization-required"');
  lines.push('  local_project_config_writes: "agent-allowed-after-scope-check"');
  lines.push('  high_risk_detection: "use workflow/policy.yaml and workflow/core/tools/resolve-policy.cjs"');
  lines.push('');
  lines.push('workflow:');
  lines.push('  policy: "workflow/policy.yaml"');
  lines.push('  features_dir: "features"');
  lines.push('  business_dir: "business"');
  lines.push('  specs_dir: "specs"');
  lines.push('  standards_dir: "workflow/standards"');
  lines.push('  constitution: "workflow/constitution.md"');
  lines.push('  core_dir: "workflow/core"');
  lines.push('  adapters_dir: "workflow/adapters"');
  lines.push('  processing_profile_source: "workflow/policy.yaml"');
  lines.push('  user_facing_profiles: "自动选择 / 完整检查；低风险时为轻量处理"');
  lines.push('  completion_language: "完成标准 / 验收项 / 检查结果 / 明确卡点"');
  lines.push('  business_review_cadence: "weekly-metrics, monthly-strategy, quarterly-positioning"');
  lines.push('');
  return lines.join('\n');
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function makeWorkflowReadme() {
  return `# Workflow

本目录由 ${GENERATED_BY} 生成，用来保存当前工作区的协作设置和按需说明。

- \`policy.yaml\`：决定使用“自动选择”还是“完整检查”。新安装默认自动选择；旧工作区升级时若原来没有该文件，继续使用完整检查。
- \`team-profile.yaml\`：项目位置、已有资料和本地操作范围。
- \`constitution.md\`：所有任务都不能违背的项目原则。
- \`standards/\`：从现有代码中整理出的编写约定。
- \`core/commands/\`：每类任务的详细说明，只按当前任务读取一个。
- \`INITIALIZATION_QUESTIONS.md\`：仍需补充的资料。

## 默认处理

低风险本地改动采用“轻量处理”：确认范围、批量修改、检查完整改动、运行一次针对性验证，最后统一记录结果。涉及对外接口、数据结构、登录权限、迁移、持续集成、部署、生产配置、跨项目或不可逆操作时，自动改用“完整检查”。详细条件见 \`policy.yaml\`。

默认用简体中文说明“这次改动、完成标准、验收项、检查结果、明确卡点和需要用户确认的事项”。阶段编号和英文状态仅用于兼容、搜索或技术排障。

本次改动资料放在 \`features/<name>/\`，商业规划资料放在 \`business/<name>/\`，已经发布的实际行为放在 \`specs/\`。代码仓库只保留源码、运行与构建所需内容以及必要的公开说明。

## 安全范围

- 本地修改和本地版本管理可在检查范围与现有改动后执行。
- 远程推送、发布、部署、数据库写入、生产配置写入、公开内容、营销投放和对外联系必须先得到用户明确授权。
- 只记录真实执行过的检查，不得把计划执行写成已经通过。

不要把凭证、真实客户秘密或私有地址写入通用规则文件。
`;
}

function makeStandardsReadme() {
  return `# 代码规范

本目录存放**从既有代码库提取的可复用规范**：命名、目录结构、错误处理、依赖选型、提交信息等模式。原则放 \`workflow/constitution.md\`，事实与路径放 \`workflow/team-profile.yaml\`，本目录只放"怎么写代码"的规范。

- 来源：\`/03-技术架构\` 阶段从现有代码中提取；\`/10-复盘总结\` 沉淀新规则。
- 用法：\`/定义完成\` 的影响边界、\`/04\` 实现和 \`/05\` 审查都以本目录为基准；已有规范直接引用，不重复发明。
- 格式：每个主题一个 Markdown 文件（例：\`naming.md\`、\`error-handling.md\`），写清规则、正例、反例和适用范围。
- 空目录是正常状态：规范应随真实需求逐步沉淀，不要一次性凭空编写。
`;
}

function makeSpecsReadme() {
  return `# 已上线功能说明

本目录记录**当前已经实现并发布**的功能表现。修改现有项目时，先以这里的真实行为为起点。

- 与 \`features/\` 的关系：features 记录每次改了什么，specs 记录产品现在怎样工作。
- 读取：改动触及已有功能时，只读取本次相关的说明，并写清会改变哪些现有行为。
- 更新：发布完成并确认结果后，再把已验证的新行为合并进来；尚未发布的计划不要写入。
- 格式：每个领域或模块一个文件，按 \`workflow/core/templates/living-spec.md\` 记录行为、数据、对外约定和边界。
- 空目录是正常状态：首个需求发布后开始沉淀。
`;
}

function makeInstallReport(profile, options) {
  return `# 安装报告

- 生成器: ${GENERATED_BY}
- 生成时间: ${new Date().toISOString()}
- 启用工具: ${profile.enabledTools.join(', ')}
- 已识别工具: ${profile.detectedTools.join(', ') || '(无)'}
- 已识别仓库: ${profile.repos.length}
- 强制覆盖: ${options.force ? '是' : '否'}
- 升级模式: ${options.upgrade ? '是' : '否'}

## 缺失资料组

${profile.missing.length ? profile.missing.map((item) => `- ${item.label} (${item.key})`).join('\n') : '- 无'}

## 安全边界

初始化器没有执行远程 Git 命令、创建分支、push 代码、触发构建 / 部署任务，也没有执行数据库写入。
`;
}

function makeQuestions(profile) {
  return `# 初始化待补资料

初始化器未找到全部必要本地资料。请补充路径后重新运行初始化器，或手动更新 \`workflow/team-profile.yaml\`。

${profile.missing.map((item) => `## ${item.label}\n\n${item.question}\n\n- path: <TODO>\n`).join('\n')}
`;
}

function makeAgentsEntry(profile) {
  return `# 工作区协作说明

本工作区由 ${GENERATED_BY} 准备。小改动快速完成，风险升高时自动增加检查。默认用简体中文；内部编号和英文状态只在技术详情中展示。

## 接到任务时

1. 读取 \`workflow/policy.yaml\`，确定采用“自动选择”还是“完整检查”。旧工作区没有该文件时按“完整检查”处理。
2. 读取 \`workflow/team-profile.yaml\`，确认项目位置、现有资料和本地操作范围。
3. 只读取与当前任务对应的 \`workflow/core/commands/<阶段>.md\` 及直接相关的代码和资料。不要为了一个小任务预读全部阶段或完整命令清单。
4. 用户已经明确要求修复、修改或实现本地内容时，可以在其范围内直接开始；不要求用户先选择阶段编号，也不重复索要已经给出的确认。

## 选择处理方式

- “自动选择”是新安装的默认方式。范围清楚、可本地恢复且未触及高风险内容时，走“轻量处理”：确认影响范围，批量修改，检查完整改动，再做一次针对性验证，最后统一记录结果。最多进行两轮修复。
- 涉及对外接口、数据结构、登录与权限、数据迁移、持续集成或发布配置、生产环境、跨项目修改、不可逆操作，或发现改动超出原范围时，立即改用“完整检查”。合并和正式发布前也采用完整检查。
- 具体判定以 \`workflow/policy.yaml\` 为准。

## 始终遵守

- 只把真实执行过的检查（测试、构建、运行和截图）写成已通过；无法验证时直接说明原因和剩余风险。
- 修改前检查未提交内容，保留用户已有改动；不得顺手扩大任务范围。
- 本地分支、提交、标签和本地合并可在范围与现状检查后执行。
- 远程推送、创建远程发布、部署、数据库写入、生产配置写入、公开发布、营销投放、对外联系以及破坏性或难恢复的操作，必须先得到用户明确授权。
- 用户要求查看、解释或审查时默认只读；用户要求修改或开发时才实施本地变更。

## 默认表达

对用户优先说“这次改动、完成标准、验收项、检查结果、明确卡点、需要你确认”。不要默认展示内部状态码、规则编号或文件结构。汇报应先给结果，再给验证情况和仍未完成的事项。

## 按需查找

- 当前设置：\`workflow/policy.yaml\`、\`workflow/team-profile.yaml\`
- 不可违背的项目原则：\`workflow/constitution.md\`
- 当前阶段说明：\`workflow/core/commands/\`
- 已上线行为：\`specs/\`
- 本次改动资料：\`features/<name>/\`
- 商业规划资料：\`business/<name>/\`
- 旧阶段编号与兼容名称：\`workflow/core/command-manifest.yaml\`
`;
}

function makeThinCommand(toolName, id) {
  const command = COMMANDS.find((item) => item.id === id);
  return `# ${command ? command.user_title : id}

${command ? command.user_description : '按当前任务说明继续。'}

1. 读取 \`workflow/policy.yaml\` 和 \`workflow/team-profile.yaml\`。
2. 读取 \`workflow/core/commands/${id}.md\`。
3. 只补充与本次任务直接相关的代码和资料。

兼容阶段标识：\`/${id}\`。${toolName} 入口不改变用户给出的任务范围，也不扩大远程或生产写入授权。
`;
}

function makeHistoricalCodexPrompt(id) {
  return `# ${id}

读取 \`AGENTS.md\`、\`workflow/team-profile.yaml\` 和 \`workflow/core/commands/${id}.md\`。

优先使用本地证据。必要资料缺失时，更新 \`workflow/INITIALIZATION_QUESTIONS.md\` 或向用户索要缺失路径。
`;
}

function makeStageSkill(command) {
  const priorContext = command.id === 'init-workspace'
    ? '目标工作区中的本地事实与资料路径'
    : command.id === 'workflow-status'
      ? '\`features/*/00-工作流状态.md\` 与 \`business/*/00-商业化状态.md\`；只有汇总所需字段缺失时，再定向读取一份直接相关记录，不读取本地代码'
      : isBusinessCommand(command.id)
        ? '\`business/<product>/\` 下的前序阶段文档'
        : command.implementation_gate
          ? '与本次改动直接相关的代码和现有资料；仅在采用“完整检查”或 \`features/<feature>/\` 已存在时，读取其中相关的前序资料'
          : '\`features/<feature>/\` 下与当前阶段相关的已有资料，以及本次任务直接相关的代码或资料';
  const authorizationNote = isBusinessCommand(command.id)
    ? '本入口只负责整理商业规划和清单；公开发布、投放、对外联系或付费动作仍需用户明确授权。'
    : '选择本入口不会扩大用户原本要求的范围；远程推送、发布、部署、数据库或生产配置写入仍需用户明确授权。';

  return `---
name: ${command.skill_slug}
description: ${yamlQuote(`${command.user_title}：${command.user_description}`)}
---

<!-- ${MANAGED_ADAPTER_MARKER} -->

# ${command.user_title}

${command.user_description}

- 高级兼容信息：旧阶段标识为 \`/${command.id}\`，供旧说明和搜索使用
- 参数提示：\`${command.argument_hint}\`

开始时只读取：

1. \`workflow/policy.yaml\`；文件缺失时采用“完整检查”
2. \`workflow/team-profile.yaml\`
3. \`workflow/core/commands/${command.id}.md\`
4. ${priorContext}

信息足够时直接继续；只有缺少会改变结果的关键内容时才询问用户。

${authorizationNote}
`;
}

function makeStageSkillMetadata(command) {
  return `# ${MANAGED_ADAPTER_MARKER}
interface:
  display_name: ${yamlQuote(command.user_title)}
  short_description: ${yamlQuote(shortDescription(command.user_description))}
  default_prompt: ${yamlQuote(`请${command.user_title}。${command.user_description} 按当前工作区设置选择合适的处理方式，读取本阶段说明和直接相关资料；信息足够时直接继续。`)}
policy:
  allow_implicit_invocation: false
`;
}

function makeAgentWorkflowSkill() {
  return `---
name: agent-workflow
description: 根据用户的自然语言请求选择最短且安全的处理方式，完成本地修改、检查、发布准备或商业规划。低风险改动可直接轻量处理，不要求先选择阶段编号。
---

<!-- ${MANAGED_ADAPTER_MARKER} -->

# 自动安排工作

本 Skill 根据用户要达成的结果选择合适的处理方式。用户明确要求修复、修改或实现本地内容时，可按“自动选择”直接实施范围内的低风险改动，无需先选择阶段编号或再次确认本地实现。自动加载不会扩大用户请求的范围。

开始时按需读取：

1. \`workflow/policy.yaml\`；缺失时采用“完整检查”
2. \`workflow/team-profile.yaml\`
3. 与用户目标最相关的一个 \`workflow/core/commands/<阶段>.md\`
4. 与本次任务直接相关的代码和资料

用户给出旧阶段编号时直接读取同名说明；自然语言任务无需转换成用户可见的内部编号。

规则：

- 低风险本地改动走“轻量处理”；命中策略中的升级条件时立即改用“完整检查”。
- 用户要求查看、解释或审查时保持只读；用户要求修改或开发时才实施本地变更。
- 商业规划不授权公开发布、投放、对外联系或付费动作。
- 远程推送、发布、部署、数据库写入和生产配置写入仍需要用户明确授权。
- 只报告真实执行过的检查；资料缺失时说明明确卡点。
`;
}

function makeAgentWorkflowSkillMetadata() {
  return `# ${MANAGED_ADAPTER_MARKER}
interface:
  display_name: "自动安排工作"
  short_description: "根据任务风险选择轻量处理或完整检查，并直接推进范围内的工作。"
  default_prompt: "请根据我的目标自动选择合适的处理方式。信息足够时直接推进范围内的本地工作；需要远程或生产写入时先征得我的明确同意。"
policy:
  allow_implicit_invocation: true
`;
}

function isBusinessCommand(id) {
  return id === 'new-product' || /^B\d/.test(id);
}

function shortDescription(value) {
  return value.length <= 60 ? value : `${value.slice(0, 59)}…`;
}

function yamlQuote(value) {
  return JSON.stringify(String(value));
}

function makeCursorRule() {
  return `---
description: "根据改动风险自动选择轻量处理或完整检查。"
alwaysApply: true
---

# 工作区协作方式

先读取 \`workflow/policy.yaml\` 和 \`workflow/team-profile.yaml\`，再读取与当前任务对应的一个 \`workflow/core/commands/<阶段>.md\`。

用户明确要求修复、修改或实现本地内容时，可直接在其范围内开始，不要求先选择阶段编号。低风险改动采用“轻量处理”；命中策略中的风险条件时改用“完整检查”。

## 可选的兼容入口

\`.cursor/commands/\` 提供旧阶段编号，适合明确指定高级流程；普通任务直接用自然语言描述目标、限制和检查方法即可。

## 安全范围

- 只报告真实执行过的检查，保留用户已有改动，不扩大任务范围。
- 远程推送、发布、部署、数据库写入、生产配置写入、公开发布、投放和对外联系必须得到用户明确授权。
- 商业规划默认只整理资料和清单。
`;
}

function makeGenericInstructions(toolName) {
  return `# ${toolName} 工作流说明

先读取 \`workflow/policy.yaml\` 和 \`workflow/team-profile.yaml\`，再按当前任务读取一个 \`workflow/core/commands/\` 下的说明。

用户明确要求本地修改时可在范围内直接开始。远程推送、发布、部署、数据库写入和生产配置写入仍需要用户明确授权。
`;
}
