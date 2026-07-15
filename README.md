# OpenOne Workflow Kit

一个面向个人开发者的 agent 工作流 kit，包含两条共享闸门口径的轨道：

- 研发轨：把个人产品从构思、设计、实现、审查、测试、发布到复盘沉淀串成一套可复用流程。
- 商业化轨：把同一个产品从业务定位、商业模式、PMF 验证、客户画像、购买旅程，推进到渠道漏斗映射、营销策略、预算、渠道执行和周期性策略复盘。

双轨如何衔接见 [双轨工作流设计](./docs/dual-track-workflow.md)。

- `workflow/core`: 工具无关的流程、阶段、闸门、模板和检查能力。
- `workflow/team-profile.yaml`: 目标个人项目或个人工作区的机器可读配置，由初始化器根据本地资料生成。
- `workflow/adapters`: 各智能体工具的薄入口，只调用当前工具自己的能力。

核心原则：同一套 workflow core，多工具 adapter 分层增强；不承诺所有工具体验完全一致。

## 一键初始化

在个人项目根目录运行：

```bash
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target .
```

也可以使用 shell wrapper：

```bash
/path/to/openone-workflow-kit/install.sh . --tools codex,claude,cursor
```

如果你拿到的是 Git 地址或 npm 包地址，见 [可分享安装方式](./docs/shareable-install.md)。

常用参数：

```bash
# 指定工具入口
node /path/to/openone-workflow-kit/bin/init-workspace.cjs --target . --tools codex,claude,cursor

# GitHub 包安装方式
npx --yes --package "git+https://github.com/bluecoast1379/openone-workflow-kit.git" openone-workflow-init --target . --tools codex,claude,cursor

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
   - Codex: `AGENTS.md`、`.codex/prompts/`
   - Claude Code: `CLAUDE.md`、`.claude/commands/`
   - Cursor: `.cursor/rules/` 和 `.cursor/commands/`
   - Copilot: `.github/copilot-instructions.md`
   - CodeBuddy / Kiro / Trae: 各自 `instructions.md`
5. 初始化器本身不执行远程 Git、push、构建部署或数据库写入。生成后的个人工作流允许 agent 在范围明确且工作树干净时执行本地分支命名、创建、commit、tag 和本地 merge；远程 push、release、部署和生产配置写入需要用户明确授权。

## 隐私与脱敏边界

本 kit 自身不应包含任何真实客户字段、内部系统地址、真实 URL 或凭证。对外分发前运行：

```bash
node openone-workflow-kit/bin/check-sanitized.cjs
```

个人项目的业务介绍、项目资料、代码、UI 文件、前后端规范和测试规范只在本地被引用；初始化器不把这些资料发送到外部服务。

## 生成后的工作方式

初始化完成后，个人项目按 `AGENTS.md` 和 `workflow/core/commands/` 推进。

研发轨（每个需求一轮）：

1. `/new-feature`
2. `/01-需求讨论`
3. `/02-产品文档`
4. `/02B-UI设计`
5. `/03-技术架构`
6. `/04-代码实现`、`/04A-前端代码实现`、`/04B-后端代码实现`
7. `/05-代码审查`
8. `/06-测试用例`
9. `/07-测试执行`
10. `/08-发布准备`
11. `/09-发布执行`
12. `/10-复盘总结`

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

业务代码修改必须先通过功能分支闸门、阶段闸门和并行开发隔离检查。涉及 UI 或前端的功能必须先完成 `/02B-UI设计`，或记录用户明确授权的范围有限设计豁免。文档分析和初始化不等于授权实现代码。商业化轨只产出文档和清单：对外发布、投放、cold outreach 必须由用户明确授权或自行执行，市场结论必须做证据分级、不得编造数据。

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
