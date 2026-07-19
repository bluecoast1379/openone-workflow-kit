# 外部分发检查清单

发布到公共仓库、package registry、template repository 或文档站点前，使用本清单做最终检查。

## 必须完成

- `npm run check` 通过。
- `npm run build:release` 通过。
- `dist/RELEASE_MANIFEST.md` 的 `source_commit` 等于 reviewed commit、`source_tree` 等于该 commit 的 tree，且 `source_dirty: false`。
- `npm pack --dry-run` 中 package/version/files/bin/repository/homepage/bugs 与 `package.json` 一致。
- `dist/RELEASE_MANIFEST.md` 已人工检查。
- tarball 文件列表已人工检查。
- npm 认证已通过 `npm whoami` 验证，发布命令从 clean reviewed commit 的仓库目录执行，而不是直接发布 `dist/*.tgz`。
- README、INIT、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、LICENSE、NOTICE 已检查。
- 示例数据均为合成数据，不能追溯到真实客户、员工、项目、事故或生产系统。
- 工具 adapter 只指向 workflow core，不削弱硬闸门。
- 初始化器不会执行远程 Git、创建分支、push、构建 / 部署触发、数据库写入或生产配置写入。

## 私有 denylist 扫描

在 starter kit 外部创建私有 denylist 文件，然后运行：

```bash
node bin/check-sanitized.cjs --extra-banned /path/to/private-denylist.txt
```

私有 denylist 应包含公司名、内部仓库前缀、内部系统、客户名、私有域名、敏感业务术语和已知事故名称。不要把该文件提交到 starter kit。

## 人工复核

自动扫描不够。仍需人工检查：

- commit message；
- README 和 docs；
- examples；
- install 脚本；
- workflow core；
- adapter 输出；
- package files 列表；
- tarball 内容。

重点关注：

- 是否出现真实组织、真实仓库、真实 URL；
- 是否包含业务数据、日志、SQL、截图或凭证；
- 是否承诺“所有工具体验完全一致”；
- 是否引导 agent 自动远程操作；
- 是否把私有流程写成通用规则。

## 发布决策

以下事项明确前不要发布：

- license；
- 发布渠道；
- 版本号；
- 支持边界；
- issue / PR 接收方式；
- 私有安全报告渠道；
- 是否允许提交 `dist/` 产物。

## v0.1.0 远程真相源

只有下列验证全部通过，才能宣布正式发布：

- `npm view openone-workflow-kit@latest version` 返回 `0.1.0`。
- `npm view openone-workflow-kit@0.1.0 gitHead` 等于 `RELEASE_MANIFEST.md` 的 `source_commit`。
- `npm view openone-workflow-kit@0.1.0 dist.shasum` 等于本地已验证 tarball 的 SHA-1。
- GitHub Actions 默认分支最新 `Check` workflow 全部成功。
- `refs/tags/v0.1.0` 指向已验证的发布 commit，且没有移动历史 Tag。
- GitHub Release `v0.1.0` 为 non-draft、non-prerelease，正文使用 `docs/releases/v0.1.0.md`，并包含已验证的 tgz 与 `RELEASE_MANIFEST.md` 两个资产。
- 在一个新临时目录中从 npm 安装并生成 `workflow/team-profile.yaml`、`workflow/core/` 与 `AGENTS.md`。
