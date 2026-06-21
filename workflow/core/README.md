# Workflow Core

`workflow/core` 是工具无关的工作流层，定义阶段、闸门、模板和可复用检查能力。它不得包含公司特定业务事实、内部仓库名、私有 URL、凭证、客户数据或某个工具的私有能力。

## Core 规则

- 同一套 core，多个工具 adapter 分层增强。
- 不承诺所有工具体验完全一致。
- 业务代码修改必须通过功能分支闸门和实现阶段闸门。
- 个人项目允许 agent 在范围明确且工作树已检查后执行本地分支命名、创建、commit、tag 和本地 merge。
- 远程 Git、push、GitHub release、商店提交、部署、数据库写入和生产配置写入必须获得用户明确授权。
- 同仓多需求进入实现阶段后必须使用独立 worktree。
- adapter 可以增强或降级体验，但不能削弱 core 闸门。

## 目录地图

- `commands/`: 每个阶段的契约。
- `templates/`: 通用文档模板。
- `capabilities/`: 可复用检查能力。

## 项目特化

不要为了加入单个项目事实而修改 core 文件。项目特化内容应放在：

- `workflow/team-profile.yaml`
- `features/{feature}/`
- 目标项目自己的规范和本地资料
- 工具 adapter 的薄入口
