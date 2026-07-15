#!/usr/bin/env node
// 完成合同结构校验器：node bin/check-contract.cjs <features/xxx/00-完成合同.md>
// 校验分档必填节、Oracle 表、冻结前置条件与模糊词，退出码 0=通过 1=存在错误。
const fs = require('fs');
const path = require('path');

const STAR_SECTIONS = ['★ 目标与非目标', '★ 术语表', '★ 验收 Oracle', '★ 待澄清项'];
const FULL_SECTIONS = [
  ...STAR_SECTIONS,
  '数据流与状态机',
  '失败路径闭环',
  '质量预算',
  '影响边界',
  'Definition Lint 结果',
  '修订记录'
];
const ORACLE_STATES = new Set(['NOT_RUN', 'PASS', 'FAIL', 'STALE', 'WAIVED']);
const FUZZY_WORDS = /(流畅|稳定|好用|优雅|高性能|健壮|无缝|丝滑|尽快|大量)/;

main();

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: node bin/check-contract.cjs <完成合同.md 路径>');
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

  const tier = pickTableValue(text, '复杂度档位');
  const tierChosen = tier && /^(S|M|L)$/.test(tier.trim());
  if (!tierChosen) errors.push(`复杂度档位未选择（当前: ${tier || '缺失'}；应为 S、M 或 L 单值）`);

  const status = pickTableValue(text, '状态');
  const statusChosen = status && /^(草稿|已冻结|修订中)$/.test(status.trim());
  if (!statusChosen) errors.push(`合同状态未选择（当前: ${status || '缺失'}；应为 草稿、已冻结 或 修订中 单值）`);
  const frozen = statusChosen && status.trim() === '已冻结';

  const sections = splitSections(text);
  const required = tierChosen && tier.trim() === 'S' ? STAR_SECTIONS : FULL_SECTIONS;
  for (const name of required) {
    if (findSection(sections, name) === null) errors.push(`缺少必填章节: ## ${name}`);
  }

  const oracleBody = findSection(sections, '★ 验收 Oracle') || '';
  const rows = oracleBody.split(/\r?\n/).filter((line) => /^\|\s*O-\d+/.test(line.trim()));
  if (!rows.length) {
    errors.push('验收 Oracle 表为空：至少需要一条以 O- 编号的 Oracle');
  } else {
    let blockingCount = 0;
    for (const row of rows) {
      const cells = row.split('|').map((cell) => cell.trim());
      // ['', ID, 标准, 验证方法, 类型, blocking, 状态, 证据, 时间, '']
      if (cells.length < 9) {
        errors.push(`Oracle 行列数不足: ${cells[1] || row.slice(0, 30)}`);
        continue;
      }
      const [id, criteria, method, type, blocking, state] = cells.slice(1, 7);
      if (!criteria || /待填写/.test(criteria)) errors.push(`${id} 验收标准未填写`);
      if (!method || method === '-' || /待填写/.test(method)) errors.push(`${id} 缺少可复现验证方法`);
      if (!/^(auto|manual)$/.test(type)) errors.push(`${id} 类型应为 auto 或 manual（当前: ${type}）`);
      if (blocking === '是') blockingCount++;
      if (!ORACLE_STATES.has(state)) errors.push(`${id} 状态非法（当前: ${state}；应为 ${[...ORACLE_STATES].join('/')}）`);
      if (frozen === false && (state === 'PASS' || state === 'FAIL')) {
        warnings.push(`${id} 在合同冻结前已有执行状态 ${state}，请确认证据对应当前草稿`);
      }
      if (FUZZY_WORDS.test(criteria) && !/\d/.test(criteria)) {
        warnings.push(`${id} 验收标准包含模糊词且未绑定数字，请确认已在术语表消歧`);
      }
    }
    if (!blockingCount) errors.push('没有任何 blocking Oracle：至少一条 blocking=是');
  }

  const clarifySection = findSection(sections, '★ 待澄清项') || '';
  const pendingMarks = (text.match(/\[待澄清/g) || []).length;
  const pendingItems = clarifySection
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\S/.test(line) && !/^\s*-\s+待填写/.test(line) && !/^\s*-\s+无/.test(line)).length;
  if (frozen && (pendingMarks > 0 || pendingItems > 0)) {
    errors.push(`已冻结合同仍存在待澄清项（标记 ${pendingMarks} 处，条目 ${pendingItems} 条）：冻结前必须清零或降级为已记录假设`);
  }

  if (frozen) {
    const lint = pickTableValue(text, 'Definition Lint');
    if (!lint || lint.trim() !== '通过') errors.push(`已冻结合同的 Definition Lint 必须为「通过」（当前: ${lint || '缺失'}）`);
    const confirm = pickTableValue(text, '冻结确认');
    if (!confirm || /待用户确认/.test(confirm)) errors.push('已冻结合同缺少用户冻结确认记录');
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
    console.error(`合同校验未通过：${errors.length} 个错误，${warnings.length} 个警告。`);
    process.exit(1);
  }
  console.log(`合同校验通过：0 个错误，${warnings.length} 个警告。`);
}

function pickTableValue(text, key) {
  const re = new RegExp(`^\\|\\s*${key}\\s*\\|([^|]+)\\|`, 'm');
  const match = text.match(re);
  return match ? match[1].trim() : null;
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
  if (sections.has(name)) return sections.get(name);
  for (const [title, body] of sections) {
    if (title.startsWith(name)) return body;
  }
  return null;
}
