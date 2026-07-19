#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  assertCleanReleaseSource,
  readReleaseSourceState,
  releaseSourceManifestLines
} = require('../scripts/release-source-state.cjs');

const root = path.resolve(__dirname, '..');
const pkg = readJson('package.json');
const failures = [];

expect(pkg.name === 'openone-workflow-kit', 'package name must be openone-workflow-kit');
expect(pkg.version === '0.1.0', 'package version must be 0.1.0');
expect(pkg.private === false, 'package must be publishable');
expect(pkg.license === 'Apache-2.0', 'package license must be Apache-2.0');
expect(pkg.engines && pkg.engines.node === '>=18', 'Node.js support must start at 18');
expect(pkg.publishConfig && pkg.publishConfig.access === 'public', 'npm access must be public');
expect(
  pkg.repository && pkg.repository.url === 'git+https://github.com/bluecoast1379/openone-workflow-kit.git',
  'repository URL must point to the public GitHub repository'
);
expect(
  pkg.homepage === 'https://github.com/bluecoast1379/openone-workflow-kit#readme',
  'homepage must point to the repository README'
);
expect(
  pkg.bugs && pkg.bugs.url === 'https://github.com/bluecoast1379/openone-workflow-kit/issues',
  'bugs URL must point to GitHub Issues'
);

for (const required of [
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'NOTICE',
  'bin/',
  'scripts/',
  'workflow/',
  'templates/',
  'examples/',
  'docs/',
  'test/'
]) {
  expect(pkg.files.includes(required), `package files must include ${required}`);
}

for (const [name, relative] of Object.entries(pkg.bin || {})) {
  const file = path.join(root, relative);
  expect(fs.existsSync(file), `bin ${name} must exist at ${relative}`);
  if (fs.existsSync(file)) {
    expect(fs.readFileSync(file, 'utf8').startsWith('#!/usr/bin/env node'), `bin ${name} must have a Node.js shebang`);
  }
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
for (const marker of [
  './docs/assets/hero.svg',
  './docs/assets/quick-demo.svg',
  './docs/assets/architecture.svg',
  '## 30 秒 Quick Demo',
  'openone-workflow-kit@0.1.0',
  'open-workflow-kit',
  'business-agent'
]) {
  expect(readme.includes(marker), `README must include ${marker}`);
}

const manifest = readJson('docs/assets/visual-manifest.json');
for (const asset of manifest.assets || []) {
  const file = path.join(root, 'docs', 'assets', asset.file);
  expect(fs.existsSync(file), `visual asset must exist: ${asset.file}`);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file);
  const text = content.toString('utf8');
  const svgStart = text.match(/<svg\b[^>]*>/);
  expect(Boolean(svgStart), `${asset.file} must contain an SVG root`);
  if (svgStart) {
    expect(new RegExp(`width=["']${asset.width}["']`).test(svgStart[0]), `${asset.file} width must be ${asset.width}`);
    expect(new RegExp(`height=["']${asset.height}["']`).test(svgStart[0]), `${asset.file} height must be ${asset.height}`);
    expect(
      new RegExp(`viewBox=["']0 0 ${asset.width} ${asset.height}["']`).test(svgStart[0]),
      `${asset.file} viewBox must match its dimensions`
    );
  }
  expect(content.length <= 250 * 1024, `${asset.file} must be no larger than 250 KB`);
  expect(text.includes('<title'), `${asset.file} must include an accessible title`);
  expect(text.includes('<desc'), `${asset.file} must include an accessible description`);
  expect(
    crypto.createHash('sha256').update(content).digest('hex') === asset.sha256,
    `${asset.file} checksum must match visual-manifest.json`
  );
}

const sourceCheckout = fs.existsSync(path.join(root, '.git'));
if (sourceCheckout) {
  const attributesFile = path.join(root, '.gitattributes');
  expect(fs.existsSync(attributesFile), 'source checkout must pin release-evidence line endings');
  if (fs.existsSync(attributesFile)) {
    const attributes = fs.readFileSync(attributesFile, 'utf8');
    expect(
      /^\*\.svg\s+text\s+eol=lf$/m.test(attributes),
      'source checkout must keep SVG checksum evidence on LF line endings'
    );
  }
  const workflowFile = path.join(root, '.github', 'workflows', 'check.yml');
  expect(fs.existsSync(workflowFile), 'source checkout must include .github/workflows/check.yml');
  if (fs.existsSync(workflowFile)) {
    const workflow = fs.readFileSync(workflowFile, 'utf8');
    expect(/permissions:\s*\n\s+contents: read/.test(workflow), 'CI permissions must be read-only');
    for (const action of workflow.matchAll(/uses:\s*([^\s]+)/g)) {
      expect(/@[0-9a-f]{40}$/.test(action[1]), `CI action must be pinned by commit SHA: ${action[1]}`);
    }
    for (const expected of [
      'Ubuntu / Node 18',
      'Ubuntu / Node 20',
      'Ubuntu / Node 22',
      'Windows / Node 20',
      'macOS / Node 20'
    ]) {
      expect(workflow.includes(expected), `CI matrix must include ${expected}`);
    }
  }
}

expect(fs.existsSync(path.join(root, 'docs', 'releases', 'v0.1.0.md')), 'v0.1.0 release notes must exist');
const manualPublish = fs.readFileSync(path.join(root, 'docs', 'manual-publish.md'), 'utf8');
for (const marker of [
  'npm publish --access public',
  'npm view openone-workflow-kit@0.1.0 gitHead',
  'npm view openone-workflow-kit@0.1.0 dist.shasum',
  'dist/openone-workflow-kit-0.1.0.tgz',
  'dist/RELEASE_MANIFEST.md'
]) {
  expect(manualPublish.includes(marker), `manual publish guide must include ${marker}`);
}
expect(!manualPublish.includes('npm publish ./dist/'), 'npm publication must run from the clean reviewed commit directory');
verifyReleaseSourceBinding();

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release readiness checks passed.');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function verifyReleaseSourceBinding() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'openone-release-source-'));
  try {
    runGit(fixture, ['init']);
    runGit(fixture, ['config', 'user.name', 'OpenOne Release Test']);
    runGit(fixture, ['config', 'user.email', 'release-test@example.invalid']);
    fs.writeFileSync(path.join(fixture, 'fixture.txt'), 'reviewed\n');
    runGit(fixture, ['add', 'fixture.txt']);
    runGit(fixture, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'Create reviewed fixture']);

    const clean = readReleaseSourceState(fixture);
    expect(clean.dirty === false && clean.status === '', 'release source preflight must accept a clean commit');
    expect(/^[0-9a-f]{40,64}$/.test(clean.commit), 'release source preflight must capture the source commit');
    expect(/^[0-9a-f]{40,64}$/.test(clean.tree), 'release source preflight must capture the source tree');
    expect(
      JSON.stringify(releaseSourceManifestLines(clean)) === JSON.stringify([
        `- source_commit: ${clean.commit}`,
        `- source_tree: ${clean.tree}`,
        '- source_dirty: false'
      ]),
      'release manifest must bind the clean source commit and tree'
    );

    fs.writeFileSync(path.join(fixture, 'unreviewed.txt'), 'dirty\n');
    const dirty = readReleaseSourceState(fixture);
    let rejected = false;
    try {
      assertCleanReleaseSource(dirty);
    } catch (error) {
      rejected = /clean reviewed commit/.test(String(error && error.message));
    }
    expect(dirty.dirty === true && dirty.status.includes('unreviewed.txt'), 'release source preflight must detect untracked changes');
    expect(rejected, 'release source preflight must reject a dirty worktree');

    fs.rmSync(path.join(fixture, 'unreviewed.txt'));
    fs.writeFileSync(path.join(fixture, 'fixture.txt'), 'modified after review\n');
    const modified = readReleaseSourceState(fixture);
    let modifiedRejected = false;
    try {
      assertCleanReleaseSource(modified);
    } catch (error) {
      modifiedRejected = /clean reviewed commit/.test(String(error && error.message));
    }
    expect(modified.dirty === true && modified.status.includes('fixture.txt'), 'release source preflight must detect tracked changes');
    expect(modifiedRejected, 'release source preflight must reject tracked changes');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
}
