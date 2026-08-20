#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROFILE_VALUES = new Set(['adaptive', 'strict']);
const DEFAULT_ESCALATION_SIGNAL_IDS = [
  'public_api_or_external_contract',
  'data_schema',
  'auth_or_permissions',
  'migration',
  'ci_cd',
  'deployment',
  'production_config',
  'cross_repo',
  'irreversible',
  'out_of_scope_diff',
  'pre_merge_or_release'
];
const REQUIRED_TRUE_PATHS = [
  'profiles.adaptive.low_risk_fast_path.enabled',
  'profiles.adaptive.low_risk_fast_path.user_change_request_is_local_implementation_authorization',
  'profiles.adaptive.low_risk_fast_path.diff_review_before_final_verification',
  'profiles.strict.require_feature_record',
  'profiles.strict.require_confirmed_completion_standard',
  'profiles.strict.require_completion_standard_check',
  'profiles.strict.require_cross_document_consistency_check',
  'profiles.strict.require_full_verification',
  'profiles.strict.require_terminal_acceptance_record',
  'safety_invariants.remote_write_requires_explicit_user_authorization',
  'safety_invariants.truthful_test_and_runtime_evidence',
  'safety_invariants.inspect_dirty_tree_and_preserve_unrelated_changes',
  'safety_invariants.real_same_repo_concurrency_requires_worktree',
  'safety_invariants.destructive_or_irreversible_actions_require_explicit_user_authorization',
  'safety_invariants.no_silent_scope_expansion'
];
const REQUIRED_FALSE_PATHS = [
  'profiles.adaptive.low_risk_fast_path.create_feature_record',
  'profiles.adaptive.low_risk_fast_path.require_confirmed_completion_standard_file',
  'profiles.adaptive.low_risk_fast_path.per_round_document_sync'
];
const REQUIRED_ENUM_VALUES = new Map([
  ['profiles.adaptive.low_risk_fast_path.terminal_record_mode', 'batch'],
  ['profiles.adaptive.low_risk_fast_path.final_verification', 'targeted'],
  ['profiles.adaptive.escalation.action', 'switch_to_strict'],
  ['profiles.adaptive.escalation.timing', 'immediate']
]);
const BOOLEAN_PATHS = [
  'safety_invariants.local_branch_creation_allowed_after_scope_and_dirty_tree_checks',
  ...REQUIRED_TRUE_PATHS,
  ...REQUIRED_FALSE_PATHS
];

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = resolveWorkflowProfile({
      workspace: options.workspace,
      requestedProfile: options.profile,
      escalationSignals: options.signals,
      changedFiles: options.changedFiles
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

function parseArgs(argv) {
  const options = { workspace: process.cwd(), profile: '', signals: [], changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--workspace') options.workspace = argv[++index] || '';
    else if (arg === '--profile') options.profile = argv[++index] || '';
    else if (arg === '--signal') options.signals.push(...splitList(argv[++index] || ''));
    else if (arg === '--changed-files') options.changedFiles.push(...splitList(argv[++index] || ''));
    else if (arg === '--help' || arg === '-h') {
      console.log(`用法: node bin/resolve-policy.cjs [选项]

选项:
  --workspace <目录>       工作区根目录，默认当前目录
  --profile <处理方式>     adaptive 或 strict；显式 strict 始终优先
  --signal <条件>          已命中的升级条件，可重复或用逗号分隔
  --changed-files <路径>   计划或已经修改的文件，可重复或用逗号分隔

输出 JSON。工作区没有 workflow/policy.yaml 时采用 strict。`);
      process.exit(0);
    } else {
      throw new Error(`无法识别的参数：${arg}`);
    }
  }
  if (!options.workspace) throw new Error('请提供有效的工作区目录。');
  if (options.profile && !PROFILE_VALUES.has(options.profile)) {
    throw new Error('处理方式只能是 adaptive（自动选择）或 strict（完整检查）。');
  }
  return options;
}

function splitList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function loadWorkflowPolicy(workspace) {
  const root = path.resolve(workspace || process.cwd());
  const file = path.join(root, 'workflow', 'policy.yaml');
  if (!fs.existsSync(file)) {
    return {
      exists: false,
      file,
      source: 'missing_policy_fallback',
      values: {
        schema_version: '1.0',
        default_profile: 'strict',
        missing_policy_fallback: 'strict',
        escalation_trigger_ids: DEFAULT_ESCALATION_SIGNAL_IDS.slice()
      }
    };
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`工作流策略文件不是可读取的普通文件：${file}`);
  }
  const source = fs.readFileSync(file, 'utf8');
  const values = parseSimpleYamlScalars(source, file);
  values.escalation_trigger_ids = extractEscalationTriggerIds(source, file);
  validateWorkflowPolicy(values, file);
  return { exists: true, file, source: 'workflow/policy.yaml', values };
}

function validateWorkflowPolicy(values, file = 'workflow/policy.yaml') {
  const errors = [];
  if (values.schema_version !== '1.0') {
    errors.push('schema_version 必须是 "1.0"');
  }
  if (!PROFILE_VALUES.has(values.default_profile)) {
    errors.push('default_profile 必须是 adaptive（自动选择）或 strict（完整检查）');
  }
  if (values.missing_policy_fallback !== 'strict') {
    errors.push('missing_policy_fallback 必须是 strict（完整检查）');
  }
  for (const key of BOOLEAN_PATHS) {
    if (typeof values[key] !== 'boolean') {
      errors.push(`${key} 必须明确写成 true 或 false`);
    }
  }
  for (const key of REQUIRED_TRUE_PATHS) {
    if (values[key] === false) {
      errors.push(`${key} 是流程约束或安全底线，不能关闭`);
    }
  }
  for (const key of REQUIRED_FALSE_PATHS) {
    if (values[key] === true) {
      errors.push(`${key} 必须保持 false，不能增加轻量处理的固定流程`);
    }
  }
  for (const [key, expected] of REQUIRED_ENUM_VALUES) {
    if (values[key] !== expected) {
      errors.push(`${key} 必须是 ${expected}`);
    }
  }
  const maxFixCycles = values['profiles.adaptive.low_risk_fast_path.max_fix_cycles'];
  if (!Number.isInteger(maxFixCycles) || maxFixCycles < 0 || maxFixCycles > 2) {
    errors.push('profiles.adaptive.low_risk_fast_path.max_fix_cycles 必须是 0 到 2 之间的整数');
  }
  const triggerIds = values.escalation_trigger_ids;
  if (!Array.isArray(triggerIds) || !triggerIds.length) {
    errors.push('profiles.adaptive.escalation.triggers 至少要声明一个升级条件');
  } else {
    const seenTriggerIds = new Set();
    for (const id of triggerIds) {
      if (typeof id !== 'string' || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) {
        errors.push(`升级条件 ID 格式不正确：${String(id)}`);
      } else if (seenTriggerIds.has(id)) {
        errors.push(`升级条件 ID 重复：${id}`);
      } else {
        seenTriggerIds.add(id);
      }
    }
  }
  if (errors.length) {
    throw new Error(`${file} 无法使用：\n- ${errors.join('\n- ')}`);
  }
  return values;
}

function resolveWorkflowProfile({
  workspace = process.cwd(),
  requestedProfile = '',
  escalationSignals = [],
  changedFiles = []
} = {}) {
  if (requestedProfile && !PROFILE_VALUES.has(requestedProfile)) {
    throw new Error('处理方式只能是 adaptive（自动选择）或 strict（完整检查）。');
  }
  const policy = loadWorkflowPolicy(workspace);
  const explicitSignals = escalationSignals.map(String).map((item) => item.trim()).filter(Boolean);
  const declaredSignals = new Set(policy.values.escalation_trigger_ids || DEFAULT_ESCALATION_SIGNAL_IDS);
  const unknownSignals = explicitSignals.filter((signal) => !declaredSignals.has(signal));
  if (unknownSignals.length) {
    throw new Error(`无法识别升级条件：${unique(unknownSignals).join('、')}。可用条件：${[...declaredSignals].join('、')}`);
  }
  const inferredSignals = inferEscalationSignals(changedFiles);
  const undeclaredInferredSignals = inferredSignals.filter((signal) => !declaredSignals.has(signal));
  if (undeclaredInferredSignals.length) {
    throw new Error(`策略文件缺少自动识别所需的升级条件：${unique(undeclaredInferredSignals).join('、')}`);
  }
  const signals = unique([
    ...explicitSignals,
    ...inferredSignals
  ]);
  const defaultProfile = policy.values.default_profile;
  let resolvedProfile;
  let reason;

  if (!policy.exists) {
    resolvedProfile = 'strict';
    reason = '工作区没有策略文件，按兼容规则使用完整检查';
  } else if (requestedProfile === 'strict') {
    resolvedProfile = 'strict';
    reason = '已明确选择完整检查';
  } else {
    const candidate = requestedProfile || defaultProfile;
    if (candidate === 'adaptive' && signals.length) {
      resolvedProfile = 'strict';
      reason = '发现需要升级处理的风险条件';
    } else {
      resolvedProfile = candidate;
      reason = candidate === 'adaptive' ? '符合自动选择条件' : '策略默认使用完整检查';
    }
  }

  return {
    requested_profile: requestedProfile || null,
    default_profile: defaultProfile,
    resolved_profile: resolvedProfile,
    display_name: resolvedProfile === 'adaptive' ? '自动选择' : '完整检查',
    policy_source: policy.source,
    policy_path: policy.file,
    escalation_signals: signals,
    reason
  };
}

function inferEscalationSignals(files) {
  const signals = [];
  for (const raw of files || []) {
    const file = String(raw).replace(/\\/g, '/').toLowerCase();
    if (!file) continue;
    const basename = file.slice(file.lastIndexOf('/') + 1);
    const documentationOnly = /(^|\/)(?:docs?|documentation)(?:\/|$)/.test(file);
    const migrationPath = /(^|\/)(?:migrations?|migrate)(?:\/|$)/.test(file) ||
      /(^|\/)alembic\/versions(?:\/|$)/.test(file) ||
      /(^|\/)(?:liquibase|flyway)(?:\/|$)/.test(file) ||
      /(?:^|[._-])migrations?(?:[._-]|$).*\.sql$/.test(basename);
    if (!documentationOnly && migrationPath) {
      signals.push('migration');
    }
    const schemaPath = /(^|\/)schemas?(?:\/|$)/.test(file) ||
      /(^|\/)(?:db|database)\/schema(?:[._-]|$)/.test(file) ||
      /(?:^|[._-])schema(?:[._-].+)?\.(?:prisma|sql|graphql|gql|json|ya?ml|avsc)$/.test(basename) ||
      /^schema\.(?:prisma|sql|graphql|gql|json|ya?ml|avsc)$/.test(basename);
    if (!documentationOnly && schemaPath) {
      signals.push('data_schema');
    }
    const authPath = /(^|\/)(?:auth|authentication|authorization|permissions?|security)(?:\/|$)/.test(file) ||
      /^(?:auth|authentication|authorization|permissions?|security)(?:[._-].+)?\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|swift)$/.test(basename);
    if (!documentationOnly && authPath) {
      signals.push('auth_or_permissions');
    }
    const ciPath = /(^|\/)\.github\/workflows\//.test(file) ||
      /(^|\/)\.circleci\//.test(file) ||
      /(^|\/)\.buildkite\//.test(file) ||
      /(^|\/)(?:ci|cd)(?:\/|$)/.test(file) ||
      /^(?:\.gitlab-ci\.ya?ml|azure-pipelines?\.ya?ml|jenkinsfile|\.woodpecker\.ya?ml)$/.test(basename);
    if (!documentationOnly && ciPath) {
      signals.push('ci_cd');
    }
    const deploymentPath = /(^|\/)(?:deploy|deployment|infrastructure|infra|terraform|k8s|kubernetes|helm|kustomize)(?:\/|$)/.test(file) ||
      /(^|\/)scripts?\/(?:deploy|deployment)(?:[._-]|$)/.test(file) ||
      /^dockerfile(?:[._-].+)?$/.test(basename) ||
      /^(?:docker-)?compose(?:[._-].+)?\.ya?ml$/.test(basename);
    if (!documentationOnly && deploymentPath) {
      signals.push('deployment');
    }
    const productionDirectory = /(^|\/)(?:prod|production)(?:\/|$)/.test(file);
    const productionName = /(^|[._-])(?:prod|production)(?:[._-]|$)/.test(basename);
    const configurationContext = /(^|\/)(?:config|configs|settings|environments?|helm|k8s|kubernetes|deploy|deployment|infrastructure|infra|terraform)(?:\/|$)/.test(file) ||
      /(?:application|bootstrap|config|settings|values|\.env)/.test(basename) ||
      /^(?:prod|production)\.(?:ya?ml|json|toml|properties)$/.test(basename);
    if (!documentationOnly && (productionDirectory || productionName) && configurationContext) {
      signals.push('production_config');
    }
    const contractFile = /(?:^|[._-])(?:openapi|swagger)(?:[._-]|$)/.test(basename) &&
      /\.(?:ya?ml|json)$/.test(basename);
    const protocolFile = /\.proto$/.test(basename);
    if (contractFile || protocolFile) {
      signals.push('public_api_or_external_contract');
    }
  }
  return unique(signals);
}

function parseSimpleYamlScalars(source, file) {
  const values = {};
  const parents = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#') || /^\s*-\s/.test(line)) return;
    const match = line.match(/^(\s*)([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (!match) return;
    const indent = match[1].length;
    if (indent % 2 !== 0) {
      throw new Error(`${file}:${index + 1} 缩进必须使用两个空格。`);
    }
    const depth = indent / 2;
    parents.length = depth;
    const key = match[2];
    const raw = stripYamlComment(match[3] || '').trim();
    if (!raw) {
      parents[depth] = key;
      return;
    }
    const fullKey = [...parents.slice(0, depth), key].join('.');
    values[fullKey] = parseYamlScalar(raw, file, index + 1);
  });
  return values;
}

function extractEscalationTriggerIds(source, file = 'workflow/policy.yaml') {
  const ids = [];
  let triggerIndent = -1;
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (triggerIndent < 0) {
      const start = line.match(/^(\s*)triggers:\s*(?:#.*)?$/);
      if (start) triggerIndent = start[1].length;
      continue;
    }
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= triggerIndent) break;
    const id = line.match(/^\s*-\s+id:\s*(.+?)\s*(?:#.*)?$/);
    if (!id) continue;
    const parsed = parseYamlScalar(id[1].trim(), file, index + 1);
    ids.push(parsed);
  }
  return ids;
}

function stripYamlComment(value) {
  let quote = '';
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== '\\') {
      quote = quote === char ? '' : (quote || char);
    }
    if (char === '#' && !quote && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }
  return value;
}

function parseYamlScalar(raw, file, lineNumber) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`${file}:${lineNumber} 双引号字符串格式不正确。`);
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  loadWorkflowPolicy,
  validateWorkflowPolicy,
  resolveWorkflowProfile,
  inferEscalationSignals,
  parseSimpleYamlScalars,
  extractEscalationTriggerIds
};
