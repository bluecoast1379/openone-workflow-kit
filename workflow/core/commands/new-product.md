# /new-product

## Goal

初始化商业化工作流: 创建工作区级 `business/{product}/` 容器、商业化状态文件和素材目录，作为 B1-B9 商业化阶段的统一落点。

## Required Inputs

- `AGENTS.md`
- `workflow/team-profile.yaml`
- 产品名称和一句话描述
- 关联仓库和关联 `features/{feature}/`（如已存在）

## Execution Rules

- Read local facts before writing conclusions.
- 默认使用简体中文展示工作流沟通和阶段产物；专有名词、产品名、品牌名、渠道名、代码标识符、命令、文件路径、API、SDK、框架、协议、标准和官方英文术语保留原文。
- 容器已存在时不重复创建，只补齐缺失文件并说明现状。
- 本阶段不授权修改业务代码，也不授权任何对外发布、投放或触达动作。
- 若 team-profile 中 `business_intro` 或 `market_research` 资料缺失，记录到 `workflow/INITIALIZATION_QUESTIONS.md` 或向用户索要，不虚构填充。

## Required Outputs

- 创建工作区级 `business/{product}/` 目录。
- 按 `workflow/core/templates/00-business-status.md` 创建 `business/{product}/00-商业化状态.md`。
- 创建 `business/{product}/素材/` 目录，存放后续渠道素材和截图。
- 在状态文件中登记产品一句话描述、关联仓库、关联 features 和北极星指标（未定义则标注待定）。
- 明确记录缺失资料和待确认项。
