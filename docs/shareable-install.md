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
npm install "git+https://github.com/bluecoast1379/openone-workflow-kit.git#v0.1.0" --save-dev
npx openone-workflow-init --target . --tools codex,claude,cursor --yes
```

如果使用 fork 或私有 mirror，请替换 URL。公开 Tag 之前请改用已验证的完整 commit SHA，不要把可变的 `main` 当作发布版本。初始化器只在本地工作区运行。

## 从 package registry 安装

先确认 Registry 中的确实存在对应版本：

```bash
cd /path/to/target-workspace
npm view openone-workflow-kit@0.1.0 version
npm install openone-workflow-kit@0.1.0 --save-dev
npx openone-workflow-init --target . --tools codex,claude,cursor --yes
```

预期 `npm view` 输出 `0.1.0`。如果 Registry 尚未返回该版本，不应声称 npm 安装路径可用；请使用上方的已验证 tarball 或不可变 Git 引用。

## 会生成什么

- `workflow/team-profile.yaml`
- `workflow/core/`
- `workflow/adapters/`
- `workflow/INSTALL_REPORT.md`
- 必要资料缺失时生成 `workflow/INITIALIZATION_QUESTIONS.md`
- 选中工具的薄入口，例如 `AGENTS.md`、`CLAUDE.md`、`.cursor/commands/`

## 安全边界

初始化器不会拉取远程代码、push 代码、触发构建、部署、写数据库或修改生产配置。它只读取本地文件，并把工作流文件写入目标工作区。生成后的个人工作流允许 agent 执行本地分支命名、创建、commit、tag 和本地 merge；远程 push、release、部署和生产配置写入需要用户明确授权。

## 验收

安装后按 [维护者交接](./maintainer-handoff.md) 的接收方清单检查。关键点是确认 `workflow/team-profile.yaml`、`workflow/core/` 和选中工具 adapter 已生成；缺失本地资料会记录在 `workflow/INITIALIZATION_QUESTIONS.md`。
