# /workflow-status

## Goal

工作流状态: 汇总 features 下所有需求的阶段状态、阻塞和下一步；工作区存在商业化容器时，一并汇总 business 下各产品的商业化阶段、PMF 判定和下轮复盘时间。

## Required Inputs

- `AGENTS.md`
- `workflow/team-profile.yaml`
- Previous stage documents under workspace-level `features/{feature}/`
- Workspace-level `business/{product}/00-商业化状态.md`（如存在）
- Local code, local docs, and user-provided source materials listed in team-profile

## Execution Rules

- Read local facts before writing conclusions.
- Distinguish verified facts, design intent, assumptions, and missing evidence.
- 默认使用简体中文展示工作流沟通和阶段产物；专有名词、产品名、品牌名、代码标识符、命令、文件路径、分支名、API、SDK、框架、协议、标准、错误信息和官方英文术语保留原文。
- Do not claim tests, builds, screenshots, deployments, or reviews passed unless they were actually executed.
- Local branch creation, commit, tag, and local merge may be executed by the agent for personal projects after scope and working-tree checks. Remote Git refresh, push, release, deployment, database write, and production config write require explicit user authorization.
- This stage does not authorize business code changes unless the current command is an implementation command and all gates pass.
- 汇总必须分别呈现研发轨（features）和商业化轨（business）两张状态表；只统计真实存在的容器，不虚构进度。

## Required Outputs

- 输出研发轨汇总：每个 feature 的当前阶段、状态、复杂度档位、完成合同状态（草稿/已冻结）、blocking Oracle 进度（x/y PASS）、待澄清项数、阻塞和下一步。
- 工作区存在 `business/` 时输出商业化轨汇总：每个产品的当前阶段、PMF 判定、待授权对外动作数量和下轮 B9 复盘时间。
- 标出两轨间待办衔接：待回流研发轨的营销工程需求、待进入 B9 的增长信号。
- Record unresolved questions and evidence gaps explicitly.
