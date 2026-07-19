# 手动发布指南

本指南用于维护 OpenOne Workflow Kit 自身。agent 可以准备本地验证和发布说明；远程仓库创建、push、tag push 或 package 发布需要维护者明确授权。

## v0.1.0 本地准入

先运行：

```bash
npm run check
npm run build:release
```

`build:release` 会拒绝存在已修改或未跟踪文件的工作树；生成的 `dist/RELEASE_MANIFEST.md` 必须记录当前 `source_commit`、`source_tree` 与 `source_dirty: false`。任何源码变更都要先形成新的 reviewed commit，再重新构建 tarball。

可分享的本地归档位于：

```text
dist/openone-workflow-kit-<version>.tgz
```

校验信息见：

```text
dist/RELEASE_MANIFEST.md
```

再核对 npm 上没有已发布的同版本：

```bash
npm view openone-workflow-kit@0.1.0 version
```

首次发布前预期 Registry 返回 404/`E404`。只有精确的不存在结果才能解读为“尚未发布”；认证、网络或权限错误都必须先解决。

## 方案 A：直接分享 tarball

适合小范围试用。维护者手动发送 `dist/*.tgz`，接收方按 `docs/shareable-install.md` 安装。

分享前必须：

- 检查 `dist/RELEASE_MANIFEST.md`；
- 用私有 denylist 扫描；
- 人工检查 tarball 文件列表；
- 确认没有私有资料、真实业务数据或凭证。

## 发布 v0.1.0（授权后）

以已验证的 `main` commit 为唯一基线。先 push 该 commit，并等待该 SHA 的 GitHub Actions 全绿：

```bash
git push origin main
```

发布前在同一个 clean checkout 中再次确认工作树、manifest 和本地 tarball SHA-1 都绑定同一 commit，并确认 npm 身份有效：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
source_tree="$(sed -n 's/^- source_tree: //p' dist/RELEASE_MANIFEST.md)"
local_shasum="$(node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha1').update(fs.readFileSync('dist/openone-workflow-kit-0.1.0.tgz')).digest('hex'))")"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$source_commit"
test "$(git rev-parse 'HEAD^{tree}')" = "$source_tree"
npm whoami
```

从这个 clean reviewed commit 的仓库目录发布，而不是直接发布 `dist/*.tgz`。directory publish 会让 npm 把当前 Git commit 写入公开的 `gitHead`；`build:release` 产生的 tarball 用于发布前复验和发布后内容哈希对照：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
local_shasum="$(node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha1').update(fs.readFileSync('dist/openone-workflow-kit-0.1.0.tgz')).digest('hex'))")"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$source_commit"
npm publish --access public
registry_version="$(npm view openone-workflow-kit@0.1.0 version)"
registry_git_head="$(npm view openone-workflow-kit@0.1.0 gitHead)"
registry_shasum="$(npm view openone-workflow-kit@0.1.0 dist.shasum)"
test "$registry_version" = "0.1.0"
test "$registry_git_head" = "$source_commit"
test "$registry_shasum" = "$local_shasum"
```

Registry 刚写入时允许做有上限的短暂重试；任何字段持续为空或不一致都属于发布阻塞，不得创建 Tag/Release 来掩盖。三项公开复验全部通过后，才从 manifest 中记录的同一 commit 创建新 Tag，并把已验证 tarball 与 manifest 一并上传 GitHub Release：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
test -z "$(git tag --list v0.1.0)"
git tag -a v0.1.0 "$source_commit" -m "OpenOne Workflow Kit v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 \
  dist/openone-workflow-kit-0.1.0.tgz \
  dist/RELEASE_MANIFEST.md \
  --title "OpenOne Workflow Kit v0.1.0" \
  --notes-file docs/releases/v0.1.0.md
```

不得移动或覆盖已存在的 Tag，也不得尝试覆盖 npm 中已存在的同版本。上述命令需要维护者明确授权后执行。

发布后公开验收：

```bash
npm view openone-workflow-kit@latest version
npm view openone-workflow-kit@0.1.0 gitHead
npm view openone-workflow-kit@0.1.0 dist.shasum
git ls-remote --tags origin refs/tags/v0.1.0
gh release view v0.1.0 --json tagName,isDraft,isPrerelease,assets,url
```

## 远程发布前必须完成

- 运行 `npm run check`。
- 运行 `npm run build:release`。
- 使用 `bin/check-sanitized.cjs --extra-banned <private-file>` 执行私有 denylist 扫描。
- 检查 `dist/RELEASE_MANIFEST.md`。
- 检查 tarball 内的每个文件。
- 确认 directory publish 后 Registry 的 `gitHead` 等于 manifest `source_commit`，`dist.shasum` 等于本地已验证 tarball 的 SHA-1。
- 确认 GitHub Release 同时包含 `openone-workflow-kit-0.1.0.tgz` 与 `RELEASE_MANIFEST.md` 两个证据资产。
- 检查 README、license、示例和安装脚本。
- push、tag push、npm publish 等远程写入必须有维护者明确授权。
