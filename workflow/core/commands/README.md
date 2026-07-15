# Core Commands

Each command file is a stage contract. Tools may expose slash commands, prompts, rules, or checklists, but every adapter should point back to these core files.

默认使用简体中文展示阶段沟通和产物；专有名词、产品名、品牌名、代码标识符、命令、文件路径、分支名、API、SDK、框架、协议、标准、错误信息和官方英文术语保留原文。

工作流分两条轨道，共享同一套闸门口径：

- 研发轨（features）：把一个需求从澄清、完成合同冻结推进到实现、发布和复盘，产物在工作区级 `features/{feature}/`。
- 商业化轨（business）：把一个产品从业务定位推进到渠道执行和策略复盘，产物在工作区级 `business/{product}/`。B 阶段只产出文档和清单；对外发布、投放、outreach 需要用户明确授权，营销工程需求通过 `/new-feature` 回流研发轨。

研发轨核心机制：`/new-feature` 时按 S/M/L 分级复杂度；`/定义完成` 把 01-06 结论编译成《完成合同》（数据流、失败路径、质量预算、验收 Oracle、术语表、影响边界），通过 Definition Lint 并经用户确认后冻结；**宣布完成 = blocking Oracle 全 PASS 的机器判定**。实现可走手动分阶段（04→05→07），也可用 `/交付至完成` 在合同范围内自主循环到全绿或精确阻塞。`workflow/constitution.md`（原则）、`workflow/standards/`（规范）与工作区级 `specs/`（行为真相）是所有阶段的共享事实源。

研发轨 stages:

- `/init-workspace`
- `/new-feature`（含 S/M/L 复杂度分级）
- `/01-需求讨论`
- `/澄清`（按需：≤5 问消融歧义，答案写回文档）
- `/02-产品文档`
- `/02B-UI设计`（含体验预算）
- `/03-技术架构`（含数据流/状态机草案与规范提取）
- `/03-06-研发准备`
- `/06-测试用例`（风险驱动，Oracle-ready）
- `/定义完成`（编译并冻结完成合同）
- `/一致性检查`（实现前只读交叉检查）
- `/04-代码实现`
- `/04A-前端代码实现`
- `/04B-后端代码实现`
- `/05-代码审查`
- `/07-测试执行`（翻转 Oracle 状态）
- `/交付至完成`（可替代手动 04→07：循环至 blocking 全绿）
- `/08-发布准备`（准入=blocking Oracle 全绿）
- `/09-发布执行`
- `/10-复盘总结`（回写 specs 行为基线）
- `/workflow-status`

推荐执行顺序（M/L 档）：`/new-feature` → `/01` →（`/澄清`）→ `/02` → `/02B` → `/03` → `/06` → `/定义完成`（冻结）→ `/一致性检查` → `/交付至完成` 或 `/04`→`/05`→`/07` → `/08` → `/09` → `/10`。S 档：`/new-feature` → `/定义完成`（迷你合同）→ 实现 → 验证。

商业化轨 stages:

- `/new-product`
- `/B1-业务定位`
- `/B1-B8-商业化准备`
- `/B2-商业模式`
- `/B3-PMF与客户画像`
- `/B4-场景与购买旅程`
- `/B5-渠道漏斗映射`
- `/B6-营销获客策略`
- `/B7-营销预算`
- `/B8-渠道执行策略`
- `/B9-策略复盘`（周期执行）

两轨衔接点：`/01`、`/02` 读取 B1/B2/B3/B4 的定位、商业模式、ICP 与场景基线；`/08`、`/09` 对照 B5/B8 准备发布营销材料和分发清单；`/10` 的增长信号回流 `/B9`；B8 的营销工程需求通过 `/new-feature` 进入研发轨。

The initializer writes concrete command files into the target workspace.
