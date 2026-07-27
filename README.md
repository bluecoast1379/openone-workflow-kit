# OpenOne Workflow Kit

[![CI](https://img.shields.io/github/actions/workflow/status/bluecoast1379/openone-workflow-kit/check.yml?branch=main&label=CI)](https://github.com/bluecoast1379/openone-workflow-kit/actions/workflows/check.yml)
[![npm](https://img.shields.io/npm/v/openone-workflow-kit?label=npm)](https://www.npmjs.com/package/openone-workflow-kit)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933)](./package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

![OpenOne Workflow Kit：独立开发者的研发与商业化双轨工作流](./docs/assets/hero.svg)

面向独立开发者的工具无关 agent 工作流：把产品研发和商业化放进同一个可验证闭环。核心不是更长的 prompt，而是把“什么叫完成”编译成可冻结的《完成合同》：**blocking 验收 Oracle 全部 PASS，才能宣布完成。**

- **研发轨**：需求 → 完成合同 → 实现/审查/测试 → 发布 → 复盘。
- **商业化轨**：定位 → 商业模式/PMF/ICP → 渠道/预算 → 策略复盘。
- **本地优先**：只读本地上下文并生成工作流文件；不上传资料，不自动 push、发布、部署或写生产数据。

## 如何选择

| 项目 | 服务对象 | 选它的理由 |
| --- | --- | --- |
| [open-workflow-kit](https://github.com/bluecoast1379/open-workflow-kit) | AI Coding 团队 | 需要完成合同、证据账本和跨工具交付治理 |
| [business-agent](https://github.com/bluecoast1379/business-agent) | 企业业务 Agent | 需要从业务规划、网关脚手架到评测与运行边界 |
| **openone-workflow-kit（本项目）** | **独立开发者** | **需要个人研发 + 商业化双轨，同时控制流程税** |

## 30 秒 Quick Demo

前置条件：Node.js 18+；首次下载时间不计入 30 秒。在一个空目录中执行：

```bash
mkdir openone-demo && cd openone-demo
npx --yes --package openone-workflow-kit@1.0.0 openone-workflow-init --target . --tools codex,cursor --yes
node -e "for (const f of ['workflow/team-profile.yaml','AGENTS.md']) require('node:fs').accessSync(f); console.log('OpenOne ready')"
```

预期结果：终端输出 `OpenOne ready`，并生成 `workflow/team-profile.yaml`、`workflow/core/`、`AGENTS.md` 与所选工具 adapter。如果 npm 网络不可用，参考 [Git 或本地 tarball 安装](./docs/shareable-install.md)。

![OpenOne Workflow Kit 30 秒体验：创建目录、运行 v1.0.0、验证产物](./docs/assets/quick-demo.svg)

## 架构：一套 Core，两条轨道

![OpenOne Workflow Kit 双轨架构：上下文、定义、执行、验证与复盘共享治理闸门](./docs/assets/architecture.svg)

1. `workflow/team-profile.yaml` 记录本地事实与路径；`specs/` 记录已发布行为真相。
2. `workflow/core/` 提供工具无关的阶段、完成合同、闸门、模板和 Oracle 能力。
3. `workflow/adapters/` 为 Claude、Codex、Cursor、Copilot、CodeBuddy、Kiro 和 Trae 生成薄入口；共享 core，但不承诺工具体验完全相同。

深入阅读：[定义完成指南](./docs/definition-of-done.md) · [双轨工作流设计](./docs/dual-track-workflow.md) · [v1.0.0 Release Notes](./docs/releases/v1.0.0.md)

## 一键初始化

从 npm 的不可变版本运行（Node.js 18+）：

```bash
npx --yes --package openone-workflow-kit@1.0.0 openone-workflow-init --target . --tools codex,claude,cursor --yes
```

从源码 checkout 本地运行：

```bash
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target .
```

也可以使用 shell wrapper：

```bash
/path/to/openone-workflow-kit/install.sh . --tools codex,claude,cursor
```

如果你拿到的是 Git 地址或本地 tarball，见 [可分享安装方式](./docs/shareable-install.md)。该文档也说明了如何先验证 Registry 中的 `1.0.0` 再安装，避免把尚未发布的版本当作可用事实。

常用参数：

```bash
# 指定工具入口
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target . --tools codex,claude,cursor

# GitHub 包安装方式
npx --yes --package "git+https://github.com/bluecoast1379/openone-workflow-kit.git#v1.0.0" openone-workflow-init --target . --tools codex,claude,cursor

# 工具名支持 trea 别名，会自动归一为 trae
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target . --tools codex,trea,codebuddy

# 非交互模式，缺失资料会写入 workflow/INITIALIZATION_QUESTIONS.md
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target . --yes

# 只查看会生成什么，不写文件
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target . --dry-run
```

## 初始化器会做什么

1. 扫描目标工作区本地文件和目录，识别代码仓库、技术栈线索、项目资料、UI 规范、前后端规范和测试规范。
2. 生成 `workflow/team-profile.yaml`，只记录本地路径、工具选择、技术栈和缺失项，不上传任何资料。
3. 如果必要资料缺失：
   - 交互式终端：逐项提问。
   - 非交互模式：生成 `workflow/INITIALIZATION_QUESTIONS.md`。
4. 生成跨工具入口：
   - Codex: `AGENTS.md`、`.agents/skills/agent-workflow/` 与 32 个 `.agents/skills/<skill-slug>/`
   - Claude Code: `CLAUDE.md`、`.claude/commands/`
   - Cursor: `.cursor/rules/` 和 `.cursor/commands/`
   - Copilot: `.github/copilot-instructions.md`
   - CodeBuddy / Kiro / Trae: 各自 `instructions.md`
5. 初始化器本身不执行远程 Git、push、构建部署或数据库写入。生成后的个人工作流允许 agent 在范围明确且工作树干净时执行本地分支命名、创建、commit、tag 和本地 merge；远程 push、release、部署和生产配置写入需要用户明确授权。

### Codex 调用方式与 0.1.0 迁移

Codex Desktop 输入 `/01`、`/B1` 等关键词后，从 `/` 面板的 Skills 分组选择中文阶段；CLI/IDE 使用 `/skills` 或 `$workflow-...`。这是 Skill 选择，不是 Claude 式字面项目命令 `/01-需求讨论`。

从 0.1.0 升级时执行：

```bash
npx --yes --package openone-workflow-kit@1.0.0 openone-workflow-init \
  --target . --tools codex --upgrade --force --yes
```

升级会用精确的 0.1.0 模板指纹识别旧 `.codex/prompts/` 根层文件：只删除未改动的 kit 生成文件，保留子目录、用户自定义或编辑过的文件，并生成当前 Codex 可发现的 `.agents/skills/`。已有 `team-profile.yaml`、工作区宪法和个人规范不会被 `--force` 覆盖；同名用户 Skill 会保留原文件并输出 `.agent-workflow-new` 合并副本。可先追加 `--dry-run` 查看迁移计划。

## 隐私与脱敏边界

本 kit 自身不应包含任何真实客户字段、内部系统地址、真实 URL 或凭证。对外分发前运行：

```bash
node openone-workflow-kit/bin/check-sanitized.cjs
```

个人项目的业务介绍、项目资料、代码、UI 文件、前后端规范和测试规范只在本地被引用；初始化器不把这些资料发送到外部服务。

## 生成后的工作方式

初始化完成后，个人项目按 `AGENTS.md` 和 `workflow/core/commands/` 推进。

研发轨（每个需求一轮；`/new-feature` 时按 S/M/L 分级，S 档压缩为 定义完成→实现→验证 三步）：

1. `/new-feature`（S/M/L 复杂度分级）
2. `/01-需求讨论`（存量行为先读 `specs/`）
3. `/澄清`（按需：≤5 问消融歧义，答案写回文档）
4. `/02-产品文档`
5. `/02B-UI设计`（含体验预算）
6. `/03-技术架构`（含数据流/状态机草案、规范提取到 `workflow/standards/`）
7. `/06-测试用例`（风险驱动，Oracle-ready）
8. `/定义完成`（把 01-06 编译成完成合同：数据流、失败路径、质量预算、验收 Oracle、术语表、影响边界；Definition Lint 通过并经用户确认后冻结）
9. `/一致性检查`（实现前只读交叉检查）
10. `/交付至完成`（在合同范围内自主循环 实现→验证→修复→复验 直到 blocking Oracle 全绿或精确阻塞），或手动 `/04-代码实现`、`/04A`、`/04B` → `/05-代码审查` → `/07-测试执行`
11. `/08-发布准备`（发布准入 = blocking Oracle 全 PASS）
12. `/09-发布执行`
13. `/10-复盘总结`（行为增量回写 `specs/` living specs）

商业化轨（每个产品一份基线 + 周期复盘）：

1. `/new-product`
2. `/B1-业务定位`（可用 `/B1-B8-商业化准备` 一次性串联 B1 到 B8）
3. `/B2-商业模式`
4. `/B3-PMF与客户画像`
5. `/B4-场景与购买旅程`
6. `/B5-渠道漏斗映射`
7. `/B6-营销获客策略`
8. `/B7-营销预算`
9. `/B8-渠道执行策略`
10. `/B9-策略复盘`（周期执行：建议周检视指标、月度策略复盘、季度定位校准）

两轨衔接：`/01`、`/02` 读取定位、ICP 与场景基线；`/08`、`/09` 对照 B5/B8 准备发布营销材料和分发清单；`/10` 的增长信号回流 `/B9`；B8 的营销工程需求（landing、SEO 页面、埋点）通过 `/new-feature` 进入研发轨。

业务代码修改必须先通过功能分支闸门、阶段闸门和并行开发隔离检查；M/L 档需求还必须有已冻结且 Definition Lint 通过的完成合同（S 档为迷你合同）。涉及 UI 或前端的功能必须先完成 `/02B-UI设计`，或记录用户明确授权的范围有限设计豁免。文档分析和初始化不等于授权实现代码。商业化轨只产出文档和清单：对外发布、投放、cold outreach 必须由用户明确授权或自行执行，市场结论必须做证据分级、不得编造数据。

完成合同可用内置校验器检查结构：

```bash
node openone-workflow-kit/bin/check-contract.cjs features/<feature>/00-完成合同.md
```

初始化器还会在目标工作区生成 `workflow/constitution.md`（跨需求不可协商原则）、`workflow/standards/`（个人规范层）和 `specs/`（已实现行为的 living specs）。

个人版迁移了 gstack 指南中的独立开发者发布经验：`main` / `prod` 双分支、本地集成、语义化 tag、扩展/CLI/桌面应用发布清单、发布后文档和复盘。agent 可以执行本地 git 分支、commit、tag、merge；远程 push、GitHub release、商店提交、部署和生产配置写入需要用户明确授权。

## 维护建议

- 通用规则只改 `workflow/core`。
- 个人项目特化配置只改 `workflow/team-profile.yaml`。
- 工具入口由初始化器或 adapter 生成，不把业务规则硬编码到单个工具里。
- 对外发布前先跑脱敏检查，再由人工复核许可证、示例和文档。

## 开源协作

- 贡献说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 安全报告说明见 [SECURITY.md](./SECURITY.md)。
- 行为准则见 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
- GitHub issue 和 PR 模板位于 `.github/`。

## 本地验证

```bash
cd /path/to/openone-workflow-kit
npm run check
```

该命令会执行脚本语法检查、starter kit 脱敏检查和临时目录 smoke test。

## 本地打包

```bash
cd /path/to/openone-workflow-kit
npm run build:release
```

该命令会在 `dist/` 下生成本地 tarball 和 `RELEASE_MANIFEST.md`。它不创建远程仓库、不 push、不打 tag、不执行 npm publish。

远程发布步骤见 [手动发布指南](./docs/manual-publish.md)。维护本 kit 自身时，push、tag、npm publish 仍应由维护者明确授权。

维护者发布、接收方验收和支持边界见 [维护者交接](./docs/maintainer-handoff.md)。
