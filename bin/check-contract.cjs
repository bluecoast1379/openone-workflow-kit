#!/usr/bin/env node
// 完成标准结构校验器：兼容旧版「完成合同 / Oracle / Definition Lint」名称。
const fs = require('fs');
const path = require('path');

const STAR_SECTIONS = ['★ 目标与非目标', '★ 术语表', '★ 验收项', '★ 待确认项'];
const FULL_SECTIONS = [
  ...STAR_SECTIONS,
  '数据流与状态机',
  '失败路径闭环',
  '质量预算',
  '影响边界',
  '完成标准检查结果',
  '修订记录'
];
const SECTION_ALIASES = new Map([
  ['★ 目标与非目标', ['★ 目标与非目标', '★ 目标与不做的事']],
  ['★ 术语表', ['★ 术语表', '★ 需要精确说明的词']],
  ['★ 验收项', ['★ 验收项', '★ 验收 Oracle']],
  ['★ 待确认项', ['★ 待确认项', '★ 待澄清项']],
  ['数据流与状态机', ['数据流与状态机', '数据怎样流动、状态怎样变化']],
  ['失败路径闭环', ['失败路径闭环', '出错时如何收场']],
  ['质量预算', ['质量预算', '质量上限与下限']],
  ['影响边界', ['影响边界', '这次会改什么、不会改什么']],
  ['完成标准检查结果', ['完成标准检查结果', '完成标准检查', 'Definition Lint 结果']]
]);
const ACCEPTANCE_STATES = new Set([
  'NOT_RUN', 'PASS', 'FAIL', 'STALE', 'WAIVED',
  '未检查', '已通过', '未通过', '改动后需重查', '已确认跳过',
  // Older plain-language variants remain readable for existing workspaces.
  '未验证', '需要复验', '改后需重验', '已确认例外'
]);
const FUZZY_WORDS = /(流畅|稳定|好用|优雅|高性能|健壮|无缝|丝滑|尽快|大量)/;

main();

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: node bin/check-contract.cjs <完成标准文件路径>');
    process.exit(1);
  }
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error(`文件不存在: ${file}`);
    process.exit(1);
  }
  const text = fs.readFileSync(full, 'utf8');
  const errors = [];
  const warnings = [];

  const tier = pickTableValueAny(text, ['改动类型', '复杂度档位']);
  const normalizedTier = normalizeChangeType(tier);
  const tierChosen = Boolean(normalizedTier);
  if (!tierChosen) {
    errors.push(`改动类型未选择（当前: ${tier || '缺失'}；应为 轻量改动、常规改动 或 高风险改动）`);
  }

  const status = pickTableValue(text, '状态');
  const statusChosen = status && /^(草稿|已确认|已冻结|修订中)$/.test(status.trim());
  if (!statusChosen) errors.push(`完成标准状态未选择（当前: ${status || '缺失'}；应为 草稿、已确认 或 修订中）`);
  const frozen = statusChosen && /^(已确认|已冻结)$/.test(status.trim());

  const sections = splitSections(text);
  const required = tierChosen && normalizedTier === 'S' ? STAR_SECTIONS : FULL_SECTIONS;
  for (const name of required) {
    if (findSection(sections, name) === null) errors.push(`缺少必填章节: ## ${name}`);
  }

  const oracleBody = findSection(sections, '★ 验收项') || '';
  const rows = oracleBody.split(/\r?\n/).filter((line) => /^\|\s*(?:O|A)-\d+/.test(line.trim()));
  if (!rows.length) {
    errors.push('验收项表为空：至少需要一条以 O- 或 A- 编号的验收项');
  } else {
    let blockingCount = 0;
    for (const row of rows) {
      const cells = row.split('|').map((cell) => cell.trim());
      // ['', ID, 标准, 验证方法, 类型, blocking, 状态, 证据, 时间, '']
      if (cells.length < 9) {
        errors.push(`验收项行列数不足: ${cells[1] || row.slice(0, 30)}`);
        continue;
      }
      const [id, criteria, method, type, blocking, state] = cells.slice(1, 7);
      if (!criteria || /待填写/.test(criteria)) errors.push(`${id} 验收标准未填写`);
      if (!method || method === '-' || /待填写/.test(method)) errors.push(`${id} 缺少可复现验证方法`);
      if (!/^(auto|manual|自动|人工)$/.test(type)) errors.push(`${id} 检查方式应为 自动 或 人工（当前: ${type}）`);
      if (blocking === '是') blockingCount++;
      if (!ACCEPTANCE_STATES.has(state)) errors.push(`${id} 状态无法识别（当前: ${state}）`);
      if (frozen === false && /^(PASS|FAIL|已通过|未通过)$/.test(state)) {
        warnings.push(`${id} 在完成标准确认前已有检查结果 ${state}，请确认证据对应当前草稿`);
      }
      if (FUZZY_WORDS.test(criteria) && !/\d/.test(criteria)) {
        warnings.push(`${id} 验收标准包含模糊词且未绑定数字，请确认已在术语表消歧`);
      }
    }
    if (!blockingCount) errors.push('没有必须通过的验收项：至少一条标记为「是」');
  }

  const clarifySection = findSection(sections, '★ 待确认项') || '';
  const pendingMarks = (text.match(/\[(?:待澄清|待确认)/g) || []).length;
  const pendingItems = clarifySection
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\S/.test(line) && !/^\s*-\s+待填写/.test(line) && !/^\s*-\s+无/.test(line)).length;
  if (frozen && (pendingMarks > 0 || pendingItems > 0)) {
    errors.push(`已确认的完成标准仍存在待确认项（标记 ${pendingMarks} 处，条目 ${pendingItems} 条）：确认前必须处理或记录为已确认假设`);
  }

  if (frozen) {
    const lint = pickTableValueAny(text, ['完成标准检查', 'Definition Lint']);
    if (!lint || !/^(通过|已通过)$/.test(lint.trim())) {
      errors.push(`已确认的完成标准必须通过检查（当前: ${lint || '缺失'}）`);
    }
    const confirm = pickTableValueAny(text, ['确认记录', '冻结确认']);
    if (!confirm || /待用户确认|待确认/.test(confirm)) errors.push('已确认的完成标准缺少用户确认记录');
  }

  const goalsBody = findSection(sections, '★ 目标与非目标') || '';
  for (const line of goalsBody.split(/\r?\n/)) {
    if (/^\s*-\s+\S/.test(line) && FUZZY_WORDS.test(line) && !/\d/.test(line)) {
      warnings.push(`目标含模糊词且无数字约束: ${line.trim().slice(0, 50)}`);
    }
  }

  for (const w of warnings) console.log(`警告 ${w}`);
  for (const e of errors) console.error(`错误 ${e}`);
  if (errors.length) {
    console.error(`完成标准检查未通过：${errors.length} 个错误，${warnings.length} 个警告。`);
    process.exit(1);
  }
  console.log(`完成标准检查通过：0 个错误，${warnings.length} 个警告。`);
}

function pickTableValue(text, key) {
  const re = new RegExp(`^\\|\\s*${key}\\s*\\|([^|]+)\\|`, 'm');
  const match = text.match(re);
  return match ? match[1].trim() : null;
}

function pickTableValueAny(text, keys) {
  for (const key of keys) {
    const value = pickTableValue(text, key);
    if (value !== null) return value;
  }
  return null;
}

function normalizeChangeType(value) {
  if (!value) return '';
  const normalized = value.trim();
  if (normalized === 'S' || normalized === '轻量改动' || normalized === '轻量') return 'S';
  if (normalized === 'M' || normalized === '常规改动' || normalized === '常规') return 'M';
  if (normalized === 'L' || normalized === '高风险改动' || normalized === '高风险') return 'L';
  return '';
}

function splitSections(text) {
  const map = new Map();
  const parts = text.split(/^## /m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    const title = (newline === -1 ? part : part.slice(0, newline)).trim();
    map.set(title, newline === -1 ? '' : part.slice(newline + 1));
  }
  return map;
}

// 章节按前缀匹配：允许用户在标题后加说明后缀，例如「★ 术语表（歧义消融）」。
function findSection(sections, name) {
  const aliases = SECTION_ALIASES.get(name) || [name];
  for (const alias of aliases) {
    if (sections.has(alias)) return sections.get(alias);
    for (const [title, body] of sections) {
      if (title.startsWith(alias)) return body;
    }
  }
  return null;
}
