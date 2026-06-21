# 手动发布指南

本指南用于维护 OpenOne Workflow Kit 自身。agent 可以准备本地验证和发布说明；远程仓库创建、push、tag push 或 package 发布需要维护者明确授权。

## 当前本地发布

先运行：

```bash
npm run check
npm run build:release
```

可分享的本地归档位于：

```text
dist/openone-workflow-kit-<version>.tgz
```

校验信息见：

```text
dist/RELEASE_MANIFEST.md
```

## 方案 A：直接分享 tarball

适合小范围试用。维护者手动发送 `dist/*.tgz`，接收方按 `docs/shareable-install.md` 安装。

分享前必须：

- 检查 `dist/RELEASE_MANIFEST.md`；
- 用私有 denylist 扫描；
- 人工检查 tarball 文件列表；
- 确认没有私有资料、真实业务数据或凭证。

## 方案 B：发布到 Git 仓库

人工步骤：

```bash
git status
git add .
git commit -m "release: v<version>"
git tag v<version>
git push origin main
git push origin v<version>
```

以上命令需要维护者明确授权后执行。agent 可以准备说明、核查本地状态和记录执行结果。

## 方案 C：发布到 package registry

人工步骤示例：

```bash
npm publish --access public
```

发布前确认：

- package 名称、license、README、files 列表正确；
- `dist/RELEASE_MANIFEST.md` 通过人工复核；
- 私有 denylist 扫描通过；
- 版本号未与已发布版本冲突。

## 远程发布前必须完成

- 运行 `npm run check`。
- 运行 `npm run build:release`。
- 使用 `bin/check-sanitized.cjs --extra-banned <private-file>` 执行私有 denylist 扫描。
- 检查 `dist/RELEASE_MANIFEST.md`。
- 检查 tarball 内的每个文件。
- 检查 README、license、示例和安装脚本。
- push、tag push、npm publish 等远程写入必须有维护者明确授权。
