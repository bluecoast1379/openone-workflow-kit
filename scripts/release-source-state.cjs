const { spawnSync } = require('child_process');

function readReleaseSourceState(root) {
  const commit = gitOutput(root, ['rev-parse', 'HEAD']);
  const tree = gitOutput(root, ['rev-parse', 'HEAD^{tree}']);
  const status = gitOutput(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  return Object.freeze({ commit, tree, status, dirty: status.length > 0 });
}

function assertCleanReleaseSource(state) {
  if (!state || state.dirty || state.status) {
    const detail = state && state.status ? `\n${state.status}` : '';
    throw new Error(`发布构建只允许从 clean reviewed commit 生成；请先审查并提交本地变更，再重跑 npm run build:release${detail}`);
  }
}

function releaseSourceManifestLines(state) {
  assertCleanReleaseSource(state);
  return [
    `- source_commit: ${state.commit}`,
    `- source_tree: ${state.tree}`,
    '- source_dirty: false'
  ];
}

function gitOutput(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} 执行失败: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

module.exports = {
  assertCleanReleaseSource,
  readReleaseSourceState,
  releaseSourceManifestLines
};
