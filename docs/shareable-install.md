# 可分享安装方式

本文面向拿到 OpenOne Workflow Kit 地址或发布归档的个人开发者。

## 从本地 tarball 安装

```bash
cd /path/to/target-workspace
npm install /path/to/openone-workflow-kit-<version>.tgz --save-dev
npx openone-workflow-init --target . --tools codex,claude,cursor --yes
```

## 从 Git 地址安装

```bash
cd /path/to/target-workspace
npm install "git+https://github.com/bluecoast1379/openone-workflow-kit.git#v1.1.0" --save-dev
npx openone-workflow-init --target . --tools codex,claude,cursor --yes
```

如果使用 fork 或私有 mirror，请替换 URL。公开 Tag 之前请改用已验证的完整 commit SHA，不要把可变的 `main` 当作发布版本。初始化器只在本地工作区运行。

## 从 package registry 安装

先确认 Registry 中的确实存在对应版本：

```bash
cd /path/to/target-workspace
npm view openone-workflow-kit@1.1.0 version
npm install openone-workflow-kit@1.1.0 --save-dev
npx openone-workflow-init --target . --tools codex,claude,cursor --yes
```

预期 `npm view` 输出 `1.1.0`。如果 Registry 尚未返回该版本，不应声称 npm 安装路径可用；请使用上方的已验证 tarball 或不可变 Git 引用。

## 1.1.0 会生成什么

- `workflow/team-profile.yaml`
- `workflow/policy.yaml`（新安装默认使用自动选择）
- `workflow/core/`
- `workflow/adapters/`
- `workflow/INSTALL_REPORT.md`
- 必要资料缺失时生成 `workflow/INITIALIZATION_QUESTIONS.md`
- 选中工具的薄入口，例如 Codex 的 `AGENTS.md` 与 `.agents/skills/`、Claude 的 `CLAUDE.md`、Cursor 的 `.cursor/commands/`

自动选择会让低风险小改走轻量路径，发现接口、数据、权限、安全、迁移、生产配置等风险时自动提高检查强度。用户也可以明确要求完整检查。两种方式都不会放宽远程和生产动作的授权边界。

## 从旧版本升级到 1.1.0

先预览迁移：

```bash
npx --yes --package openone-workflow-kit@1.1.0 openone-workflow-init \
  --target . --tools codex --upgrade --force --dry-run
```

确认后执行：

```bash
npx --yes --package openone-workflow-kit@1.1.0 openone-workflow-init \
  --target . --tools codex --upgrade --force --yes
```

升级会继续迁移 0.1.0 的旧 Codex prompts，并保留子目录、用户自定义或被编辑的 prompt、symbolic link、`team-profile.yaml`、项目基本规则、个人规范和同名用户 Skill；需要合并的新版 Skill 写入 `.agent-workflow-new`，不会静默覆盖。

旧工作区没有 `workflow/policy.yaml` 时，1.1.0 会补充默认值为“完整检查”的策略，避免升级后静默放宽规则；已有且被修改的策略文件会保留。真正的全新工作区默认使用“自动选择”。

## 安全边界

初始化器不会拉取远程代码、push 代码、触发构建、部署、写数据库或修改生产配置。它只读取本地文件，并把工作流文件写入目标工作区。生成后的个人工作流允许 agent 执行本地分支命名、创建、commit、tag 和本地 merge；远程 push、release、部署和生产配置写入需要用户明确授权。

## 验收

安装后按 [维护者交接](./maintainer-handoff.md) 的接收方清单检查。1.1.0 应生成 `workflow/team-profile.yaml`、`workflow/policy.yaml`、`workflow/core/` 和选中工具入口。缺失本地资料会记录在 `workflow/INITIALIZATION_QUESTIONS.md`。
