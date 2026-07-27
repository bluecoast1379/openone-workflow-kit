#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadCommandManifest } = require('./command-manifest.cjs');

const root = path.resolve(__dirname, '..');
const manifestFile = path.join(root, 'workflow/core/command-manifest.yaml');
const commandsDir = path.join(root, 'workflow/core/commands');
const errors = [];
let manifest;

try {
  manifest = loadCommandManifest(manifestFile);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const expectedFiles = new Set(manifest.commands.map((command) => `${command.id}.md`));
for (const command of manifest.commands) {
  const file = path.join(commandsDir, `${command.id}.md`);
  if (!fs.existsSync(file)) {
    errors.push(`缺少 core command: ${command.id}.md`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(`# /${command.id}`)) errors.push(`${command.id}.md 缺少匹配标题`);
}

for (const name of fs.readdirSync(commandsDir)) {
  if (!name.endsWith('.md') || name === 'README.md') continue;
  if (!expectedFiles.has(name)) errors.push(`core command 未登记到 manifest: ${name}`);
}

if (errors.length) {
  console.error(`命令清单校验失败（${errors.length} 项）:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`命令清单校验通过：${manifest.commands.length} 个命令，id、slug、core 文件与实现闸门映射一致。`);
