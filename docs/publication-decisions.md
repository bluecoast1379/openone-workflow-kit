# 发布决策

OpenOne Workflow Kit 可以进行本地验证和本地打包。远程发布需要维护者明确授权。

## 必要决策

| 决策 | 选项 | 当前建议 |
| --- | --- | --- |
| License | Apache-2.0 / MIT / proprietary | Apache-2.0 |
| 发布渠道 | GitHub / npm / 内部包仓 / tarball | GitHub + npm + tarball（v1.1.0 已获当前任务授权） |
| 贡献模型 | 关闭 / 仅 issue / 接收 PR / 需要 CLA | 接收 issue 和 PR 模板 |
| 支持范围 | best-effort / paid / internal-only | best-effort |
| 安全报告 | 私有邮箱 / GitHub private advisory / 内部渠道 | GitHub private advisory 或维护者私有渠道 |
| 发布产物 | 只提交源码 / 允许提交 dist | 默认不提交 dist |

## 首次外部试用建议

- 使用 Apache-2.0。
- 在 CI、tarball、Codex adapter conformance 和真实 `skills/list` 验收全部通过后，从 clean reviewed commit 的仓库目录发布 npm `1.1.0`；公开核对 Registry `gitHead` / `dist.shasum` 后，再创建同 commit 的不可变 Git tag `v1.1.0` 和对应 GitHub Release。
- GitHub Release 同时上传已验证 tgz 与 `RELEASE_MANIFEST.md`，让 source commit、source tree、npm 内容哈希和 Release 资产形成可复核证据链。
- 接收 issue 和 PR，但要求脱敏。
- 不承诺生产级支持。
- 公开 README 中明确：初始化器只读本地资料，不执行远程 Git、分支、部署或数据库动作。

## 公开发布前

1. 运行 `npm run check`。
2. 运行 `npm run build:release`。
3. 使用 starter kit 外部的私有 denylist 扫描。
4. 人工检查全部可分发文件和 `dist/RELEASE_MANIFEST.md`。
5. 通过 `npm whoami` 确认发布身份，从 clean reviewed commit directory 发布，并核对 Registry `gitHead` 与 `dist.shasum`。
6. 由维护者手动创建同 commit 的 release tag，并上传 tarball 与 manifest 资产。

未经维护者在当前任务明确授权，agent 不得执行 publish、push、tag 或远程仓库创建动作；获得明确授权后仍必须满足本页和发布清单的全部证据闸门。

手动命令示例维护在 `docs/manual-publish.md`。
