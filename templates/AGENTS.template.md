# Agent Workflow

本工作区使用 OpenOne Workflow Kit 生成的个人开发者工作流。

## 事实源

- 项目配置：`workflow/team-profile.yaml`
- Core 工作流：`workflow/core/`
- 可复用能力：`workflow/core/capabilities/`
- 工具 adapter：只作为生成的薄入口

## 硬闸门

- 功能分支闸门和实现阶段闸门通过前，不得修改业务代码。
- 个人项目允许 agent 在范围明确且工作树已检查后执行本地分支命名、创建、commit、tag 和本地 merge。
- 远程 push、release、部署、数据库写入和生产配置写入需要用户明确授权。
- 进入实现阶段后，同仓多需求并行必须使用独立 worktree。
- 缺失本地资料时，必须向用户索要或记录到 `workflow/INITIALIZATION_QUESTIONS.md`。

## 工具策略

只能使用当前工具自己的 adapter。不要承诺所有工具体验完全一致。

## 开始

先读取 `workflow/team-profile.yaml`，再按 `workflow/core/commands/` 执行对应阶段。
