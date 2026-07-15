# /B3-PMF与客户画像

## Goal

PMF 与客户画像: 用定义好的信号验证产品市场匹配度，确定可操作的理想客户画像 ICP 和负面画像。

## Required Inputs

- `AGENTS.md`
- `workflow/team-profile.yaml`
- Workspace-level `business/{product}/B1-业务定位.md`、`B2-商业模式.md`
- 用户访谈记录、支持对话、公开评论和反馈
- 使用与留存数据、waitlist / 预售 / landing 转化数据（如有）

## Execution Rules

- Read local facts before writing conclusions.
- PMF 判定必须基于事先定义的信号阈值，不得凭感觉宣布达到 PMF；证据不足时明确记录"未验证"。
- 访谈和调研结论必须注明样本量、招募渠道和时间；小样本结论标注置信限制。
- ICP 和负面画像都必须可操作：给出识别信号，而不是空泛描述。
- 未达 PMF 信号前，`/B5-渠道漏斗映射` 到 `/B8-渠道执行策略` 的投放建议保持最小实验档。
- 区分一手证据、二手证据和推断；不得编造用户反馈。
- 默认使用简体中文展示工作流沟通和阶段产物；专有名词、产品名、品牌名、渠道名、代码标识符、命令、文件路径、API、SDK、框架、协议、标准和官方英文术语保留原文。
- 本阶段只产出分析和文档，不授权修改业务代码；验证实验涉及的对外动作（发问卷、发帖招募、预售页上线）需要用户明确授权或自行执行。

## Required Outputs

- Create or update workspace-level `business/{product}/B3-PMF与客户画像.md`.
- Update workspace-level `business/{product}/00-商业化状态.md`（含 PMF 判定结论）。
- Record unvalidated assumptions and evidence gaps explicitly.

## Suggested Structure

1. **PMF 信号定义**：留存曲线是否走平、Sean Ellis "非常失望"占比（参考阈值 40%）、付费转化率、自然增长与口碑推荐占比；早期可用替代信号（访谈复购意愿、waitlist 转化、预售定金）。
2. **验证实验**：问题访谈、landing 冒烟测试、预售、MVP 留存测量——每个实验记录假设、样本、判定标准、真实结果。
3. **当前判定**：未验证 / 弱信号 / 达标，附证据列表和下一步验证计划。
4. **理想客户画像 ICP**：角色与场景、触发事件、预算与付费能力、技术水平、聚集渠道、识别信号、优先级排序。
5. **负面画像**：明确不服务的对象、原因（支持成本高 / 需求偏离路线图 / 流失快 / 价格错配）、识别信号、礼貌拒绝与引导话术。
6. **对研发轨的影响**：ICP 修正带来的需求优先级调整建议，回流 `/01-需求讨论` 和 `/02-产品文档`。
