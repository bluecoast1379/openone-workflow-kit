# Workflow Core

`workflow/core` 是工具无关的工作流层，定义阶段、闸门、模板和可复用检查能力。它不得包含公司特定业务事实、内部仓库名、私有 URL、凭证、客户数据或某个工具的私有能力。

工作流分两条轨道：研发轨（`/new-feature`、`/01` 到 `/10`，产物在 `features/{feature}/`）和商业化轨（`/new-product`、`/B1` 到 `/B9`，产物在 `business/{product}/`）。两轨共享同一套授权口径：本地文档和本地 git 动作可由 agent 执行，对外动作必须用户授权。

## Core 规则

- 同一套 core，多个工具 adapter 分层增强。
- 不承诺所有工具体验完全一致。
- 业务代码修改必须通过功能分支闸门和实现阶段闸门。
- 个人项目允许 agent 在范围明确且工作树已检查后执行本地分支命名、创建、commit、tag 和本地 merge。
- 远程 Git、push、GitHub release、商店提交、部署、数据库写入和生产配置写入必须获得用户明确授权。
- 同仓多需求进入实现阶段后必须使用独立 worktree。
- adapter 可以增强或降级体验，但不能削弱 core 闸门。
- 商业化轨只产出文档和清单：对外发布内容、投放广告、cold outreach、联系合作方必须用户明确授权或自行执行；营销工程需求通过 `/new-feature` 回流研发轨，不在 B 阶段直接改代码。
- 商业化结论必须做证据分级（一手/二手/推断），不得编造市场数据、用户评价或竞品价格。

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
