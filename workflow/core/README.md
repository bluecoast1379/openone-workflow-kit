# Workflow Core

`workflow/core` 是工具无关的工作流层，定义阶段、闸门、模板和可复用检查能力。它不得包含公司特定业务事实、内部仓库名、私有 URL、凭证、客户数据或某个工具的私有能力。

工作流分两条轨道：研发轨（`/new-feature`、`/01` 到 `/10`，加上 `/澄清`、`/定义完成`、`/一致性检查`、`/交付至完成`，产物在 `features/{feature}/`）和商业化轨（`/new-product`、`/B1` 到 `/B9`，产物在 `business/{product}/`）。两轨共享同一套授权口径：本地文档和本地 git 动作可由 agent 执行，对外动作必须用户授权。

研发轨的判定核心是《完成合同》：`/定义完成` 把前序结论编译为合同（目标/非目标、数据流、失败路径、质量预算、验收 Oracle、术语表、影响边界），Definition Lint 通过并经用户确认后冻结；宣布完成 = blocking Oracle 全 PASS。`workflow/constitution.md` 存放跨需求不可协商原则，`workflow/standards/` 存放个人代码规范，工作区级 `specs/` 存放已实现行为的 living specs。

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
- M/L 档需求进入实现前，完成合同必须已冻结且 Definition Lint 通过；S 档必须有 ★ 必填节完整的迷你合同。
- 合同冻结后不得静默修改标准、阈值或 blocking 标记；变更走修订记录并经用户确认。
- Oracle 状态只能由 `/交付至完成` 或 `/07-测试执行` 翻转且必须附证据；blocking Oracle 存在 NOT_RUN/FAIL/STALE 时不得宣布完成或进入发布执行。
- constitution 与需求冲突时先修订宪法（经用户确认），不得绕过。

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
