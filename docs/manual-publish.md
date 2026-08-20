# v1.1.0 手动发布指南

> 本指南用于发布 v1.1.0。v1.0.0 的历史说明保留在 `docs/releases/v1.0.0.md` 和对应 Git Tag 中。

本指南用于维护 OpenOne Workflow Kit 的发布证据。agent 可以准备本地验证和发布说明；远程仓库创建、push、tag push 或 package 发布需要维护者明确授权。

## v1.1.0 本地准入

先运行：

```bash
npm run check
npm run build:release
```

再从 tarball 安装到隔离目录，并用真实 Codex `skills/list` 验证 `agent-workflow` 加 32 个阶段 Skill 均可发现、enabled=true、errors=0。自动结构测试不能代替这一步消费面验收。

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
npm view openone-workflow-kit@1.1.0 version
```

首次发布前预期 Registry 返回 404/`E404`。只有精确的不存在结果才能解读为“尚未发布”；认证、网络或权限错误都必须先解决。

## 方案 A：直接分享 tarball

适合小范围试用。维护者手动发送 `dist/*.tgz`，接收方按 `docs/shareable-install.md` 安装。

分享前必须：

- 检查 `dist/RELEASE_MANIFEST.md`；
- 用私有 denylist 扫描；
- 人工检查 tarball 文件列表；
- 确认没有私有资料、真实业务数据或凭证。

## 发布 v1.1.0（授权后）

先通过 PR 把 reviewed commit 合入 `main`，等待该 `main` SHA 的 GitHub Actions 全绿；随后切换到本地 `main` 并只允许 fast-forward 到远端真相：

```bash
git switch main
git pull --ff-only origin main
npm run check
npm run build:release
```

发布前在同一个 clean `main` checkout 中再次确认工作树、远程 `main`、manifest 和本地 tarball SHA-1 都绑定同一 commit，并确认 npm 身份有效：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
source_tree="$(sed -n 's/^- source_tree: //p' dist/RELEASE_MANIFEST.md)"
local_shasum="$(node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha1').update(fs.readFileSync('dist/openone-workflow-kit-1.1.0.tgz')).digest('hex'))")"
remote_main="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$source_commit"
test "$(git rev-parse 'HEAD^{tree}')" = "$source_tree"
test "$remote_main" = "$source_commit"
test "$(gh run list --commit "$source_commit" --workflow check.yml --limit 1 --json headSha --jq '.[0].headSha')" = "$source_commit"
test "$(gh run list --commit "$source_commit" --workflow check.yml --limit 1 --json status --jq '.[0].status')" = "completed"
test "$(gh run list --commit "$source_commit" --workflow check.yml --limit 1 --json conclusion --jq '.[0].conclusion')" = "success"
npm whoami
```

从这个 clean reviewed commit 的仓库目录发布，而不是直接发布 `dist/*.tgz`。directory publish 会让 npm 把当前 Git commit 写入公开的 `gitHead`；`build:release` 产生的 tarball 用于发布前复验和发布后内容哈希对照：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
local_shasum="$(node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha1').update(fs.readFileSync('dist/openone-workflow-kit-1.1.0.tgz')).digest('hex'))")"
remote_main="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$source_commit"
test "$remote_main" = "$source_commit"
npm publish --access public
registry_version="$(npm view openone-workflow-kit@1.1.0 version)"
registry_git_head="$(npm view openone-workflow-kit@1.1.0 gitHead)"
registry_shasum="$(npm view openone-workflow-kit@1.1.0 dist.shasum)"
test "$registry_version" = "1.1.0"
test "$registry_git_head" = "$source_commit"
test "$registry_shasum" = "$local_shasum"
```

Registry 刚写入时允许做有上限的短暂重试；任何字段持续为空或不一致都属于发布阻塞，不得创建 Tag/Release 来掩盖。三项公开复验全部通过后，才从 manifest 中记录的同一 commit 创建新 Tag，并把已验证 tarball 与 manifest 一并上传 GitHub Release：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
test -z "$(git tag --list v1.1.0)"
git tag -a v1.1.0 "$source_commit" -m "OpenOne Workflow Kit v1.1.0"
git push origin v1.1.0
gh release create v1.1.0 \
  dist/openone-workflow-kit-1.1.0.tgz \
  dist/RELEASE_MANIFEST.md \
  --verify-tag \
  --title "OpenOne Workflow Kit v1.1.0" \
  --notes-file docs/releases/v1.1.0.md
```

不得移动或覆盖已存在的 Tag，也不得尝试覆盖 npm 中已存在的同版本。上述命令需要维护者明确授权后执行。

发布后公开验收：

```bash
source_commit="$(sed -n 's/^- source_commit: //p' dist/RELEASE_MANIFEST.md)"
local_shasum="$(node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha1').update(fs.readFileSync('dist/openone-workflow-kit-1.1.0.tgz')).digest('hex'))")"
test "$(npm view openone-workflow-kit@latest version)" = "1.1.0"
test "$(npm view openone-workflow-kit@1.1.0 gitHead)" = "$source_commit"
test "$(npm view openone-workflow-kit@1.1.0 dist.shasum)" = "$local_shasum"
peeled_tag="$(git ls-remote --tags origin 'refs/tags/v1.1.0^{}' | awk '{print $1}')"
test "$peeled_tag" = "$source_commit"
test "$(gh release view v1.1.0 --json isDraft --jq '.isDraft')" = "false"
test "$(gh release view v1.1.0 --json isPrerelease --jq '.isPrerelease')" = "false"
test "$(gh release view v1.1.0 --json tagName --jq '.tagName')" = "v1.1.0"
test "$(gh release view v1.1.0 --json assets --jq '[.assets[].name] | sort | join(",")')" = \
  "RELEASE_MANIFEST.md,openone-workflow-kit-1.1.0.tgz"
test "$(gh run list --branch main --workflow check.yml --limit 1 --json headSha,status,conclusion --jq '.[0].headSha')" = "$source_commit"
test "$(gh run list --branch main --workflow check.yml --limit 1 --json conclusion --jq '.[0].conclusion')" = "success"
```

这些命令会以非零退出码拒绝 npm 元数据、annotated tag 的 peeled commit、Release 状态/资产或默认分支 CI 与 `source_commit` 的任何漂移。

## 远程发布前必须完成

- 运行 `npm run check`。
- 运行 `npm run build:release`。
- 从 tarball 初始化隔离项目，并用真实 Codex `skills/list` 验证 33 个 repo Skill、0 个错误。
- 使用 `bin/check-sanitized.cjs --extra-banned <private-file>` 执行私有 denylist 扫描。
- 检查 `dist/RELEASE_MANIFEST.md`。
- 检查 tarball 内的每个文件。
- 确认 directory publish 后 Registry 的 `gitHead` 等于 manifest `source_commit`，`dist.shasum` 等于本地已验证 tarball 的 SHA-1。
- 确认 GitHub Release 同时包含 `openone-workflow-kit-1.1.0.tgz` 与 `RELEASE_MANIFEST.md` 两个证据资产。
- 检查 README、license、示例和安装脚本。
- push、tag push、npm publish 等远程写入必须有维护者明确授权。
