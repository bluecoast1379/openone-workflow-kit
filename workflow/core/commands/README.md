# Core Commands

Each command file is a stage contract. Tools may expose slash commands, prompts, rules, or checklists, but every adapter should point back to these core files.

默认使用简体中文展示阶段沟通和产物；专有名词、产品名、品牌名、代码标识符、命令、文件路径、分支名、API、SDK、框架、协议、标准、错误信息和官方英文术语保留原文。

工作流分两条轨道，共享同一套闸门口径：

- 研发轨（features）：把一个需求从澄清推进到发布和复盘，产物在工作区级 `features/{feature}/`。
- 商业化轨（business）：把一个产品从业务定位推进到渠道执行和策略复盘，产物在工作区级 `business/{product}/`。B 阶段只产出文档和清单；对外发布、投放、outreach 需要用户明确授权，营销工程需求通过 `/new-feature` 回流研发轨。

研发轨 stages:

- `/init-workspace`
- `/new-feature`
- `/01-需求讨论`
- `/02-产品文档`
- `/02B-UI设计`
- `/03-技术架构`
- `/03-06-研发准备`
- `/04-代码实现`
- `/04A-前端代码实现`
- `/04B-后端代码实现`
- `/05-代码审查`
- `/06-测试用例`
- `/07-测试执行`
- `/08-发布准备`
- `/09-发布执行`
- `/10-复盘总结`
- `/workflow-status`

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
