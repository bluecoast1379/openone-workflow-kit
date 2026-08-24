#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  loadWorkflowPolicy,
  resolveWorkflowProfile,
  inferEscalationSignals
} = require('../bin/resolve-policy.cjs');
const { loadCommandManifest } = require('../bin/command-manifest.cjs');

const root = path.resolve(__dirname, '..');
const templateFile = path.join(root, 'workflow/core/templates/workflow-policy.template.yaml');
const template = fs.readFileSync(templateFile, 'utf8');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-'));
const workflowDir = path.join(workspace, 'workflow');
const policyFile = path.join(workflowDir, 'policy.yaml');
fs.mkdirSync(workflowDir, { recursive: true });
fs.writeFileSync(policyFile, template);

const policy = loadWorkflowPolicy(workspace);
assertEqual(policy.values.default_profile, 'adaptive', '新策略默认应为自动选择');
assertEqual(policy.values.missing_policy_fallback, 'strict', '缺失策略必须回退完整检查');
assertEqual(
  policy.values['profiles.adaptive.low_risk_fast_path.max_fix_cycles'],
  2,
  '轻量处理最多只能有两轮修复'
);
assertEqual(
  policy.values['profiles.adaptive.low_risk_fast_path.diff_review_before_final_verification'],
  true,
  '必须先审阅改动再做最终检查'
);
assertEqual(
  policy.values['profiles.adaptive.low_risk_fast_path.per_round_document_sync'],
  false,
  '轻量处理不得逐轮同步文档'
);
assertContainsInOrder(template, [
  '批量完成范围内修改',
  '先审查完整 diff',
  '再运行一次最终的定向验证',
  '最后一次性记录'
]);

const lowRisk = resolveWorkflowProfile({ workspace, changedFiles: ['src/button-label.ts'] });
assertEqual(lowRisk.resolved_profile, 'adaptive', '普通本地小改应保持自动选择');
assertEqual(lowRisk.display_name, '自动选择', '自动选择显示名称不一致');

const explicitStrict = resolveWorkflowProfile({
  workspace,
  requestedProfile: 'strict',
  changedFiles: ['src/button-label.ts']
});
assertEqual(explicitStrict.resolved_profile, 'strict', '显式完整检查不得自动降级');

const escalationSignals = [
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
for (const signal of escalationSignals) {
  const result = resolveWorkflowProfile({ workspace, escalationSignals: [signal] });
  assertEqual(result.resolved_profile, 'strict', `${signal} 必须升级为完整检查`);
  if (!result.escalation_signals.includes(signal)) {
    throw new Error(`${signal} 未出现在升级原因中`);
  }
}

let unknownSignalMessage = '';
try {
  resolveWorkflowProfile({ workspace, escalationSignals: ['auth_permission_typo'] });
} catch (error) {
  unknownSignalMessage = error && error.message ? error.message : String(error);
}
if (!unknownSignalMessage.includes('无法识别升级条件')) {
  throw new Error(`未知升级条件没有清楚报错：${unknownSignalMessage || '未失败'}`);
}

const inferredCases = new Map([
  ['db/migrations/001.sql', 'migration'],
  ['db/migrate/20260820_add_users.rb', 'migration'],
  ['alembic/versions/20260820_add_users.py', 'migration'],
  ['db/schema.prisma', 'data_schema'],
  ['src/schemas/user.schema.json', 'data_schema'],
  ['src/auth/permissions.ts', 'auth_or_permissions'],
  ['src/auth-middleware.ts', 'auth_or_permissions'],
  ['src/authorization.service.ts', 'auth_or_permissions'],
  ['src/permissions-service.ts', 'auth_or_permissions'],
  ['.github/workflows/check.yml', 'ci_cd'],
  ['.gitlab-ci.yml', 'ci_cd'],
  ['.circleci/config.yml', 'ci_cd'],
  ['infra/terraform/main.tf', 'deployment'],
  ['Dockerfile.production', 'deployment'],
  ['docker-compose.yml', 'deployment'],
  ['helm/values-prod.yaml', 'deployment'],
  ['config/application-production.yml', 'production_config'],
  ['config/values-prod.yaml', 'production_config'],
  ['api/openapi.yaml', 'public_api_or_external_contract']
]);
for (const [file, expectedSignal] of inferredCases) {
  const inferred = inferEscalationSignals([file]);
  if (!inferred.includes(expectedSignal)) {
    throw new Error(`${file} 未推断出 ${expectedSignal}: ${inferred.join(', ')}`);
  }
  const result = resolveWorkflowProfile({ workspace, changedFiles: [file] });
  assertEqual(result.resolved_profile, 'strict', `${file} 必须升级为完整检查`);
}

for (const file of [
  'package.json',
  'package-lock.json',
  'pom.xml',
  'src/config.ts',
  'test/fixtures/sample.sql',
  'src/production/parser.ts',
  'docs/openapi-guide.md',
  'docs/ci-guide.md',
  'docs/deployment-guide.md',
  'src/components/deployment-card.tsx',
  'docs/schema.md',
  'config/product.yaml',
  'test/reproduction.yml',
  'test/fixtures/sample-prod.json',
  'src/components/prod-card.json',
  'i18n/messages-prod.json'
]) {
  const result = resolveWorkflowProfile({ workspace, changedFiles: [file] });
  assertEqual(result.resolved_profile, 'adaptive', `${file} 不应仅凭文件名自动升级`);
}

const legacyWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-missing-'));
const legacy = resolveWorkflowProfile({
  workspace: legacyWorkspace,
  requestedProfile: 'adaptive',
  changedFiles: ['src/button-label.ts']
});
assertEqual(legacy.resolved_profile, 'strict', '旧工作区没有策略文件时必须保持完整检查');
assertEqual(legacy.policy_source, 'missing_policy_fallback', '缺失策略来源标记不正确');

assertInvalidPolicy(
  template.replace('default_profile: adaptive', 'default_profile: relaxed'),
  'default_profile'
);
assertInvalidPolicy(
  template.replace('max_fix_cycles: 2', 'max_fix_cycles: 3'),
  'max_fix_cycles'
);
assertInvalidPolicy(
  template.replace(
    'remote_write_requires_explicit_user_authorization: true',
    'remote_write_requires_explicit_user_authorization: false'
  ),
  '不能关闭'
);
assertInvalidPolicy(
  template.replace('diff_review_before_final_verification: true', 'diff_review_before_final_verification: false'),
  '不能关闭'
);
assertInvalidPolicy(
  template.replace('per_round_document_sync: false', 'per_round_document_sync: true'),
  '必须保持 false'
);
assertInvalidPolicy(
  template.replace('terminal_record_mode: batch', 'terminal_record_mode: per_round'),
  '必须是 batch'
);
assertInvalidPolicy(
  template.replace('final_verification: targeted', 'final_verification: full'),
  '必须是 targeted'
);
assertInvalidPolicy(
  template.replace('require_full_verification: true', 'require_full_verification: false'),
  '不能关闭'
);

const manifest = loadCommandManifest(path.join(root, 'workflow/core/command-manifest.yaml'));
assertEqual(manifest.commands.length, 32, '不能为轻量处理新增第 33 个阶段');

console.log('Adaptive policy tests passed: defaults, escalation, loop budget, safety and legacy fallback covered.');

function assertInvalidPolicy(source, expectedMessage) {
  const invalidWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-policy-invalid-'));
  const invalidWorkflow = path.join(invalidWorkspace, 'workflow');
  fs.mkdirSync(invalidWorkflow, { recursive: true });
  fs.writeFileSync(path.join(invalidWorkflow, 'policy.yaml'), source);
  let message = '';
  try {
    loadWorkflowPolicy(invalidWorkspace);
  } catch (error) {
    message = error && error.message ? error.message : String(error);
  }
  if (!message.includes(expectedMessage)) {
    throw new Error(`无效策略未按预期失败（需要包含 ${expectedMessage}）：${message || '未失败'}`);
  }
}

function assertContainsInOrder(source, markers) {
  let cursor = -1;
  for (const marker of markers) {
    const found = source.indexOf(marker, cursor + 1);
    if (found < 0) throw new Error(`策略模板缺少顺序标记：${marker}`);
    cursor = found;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
