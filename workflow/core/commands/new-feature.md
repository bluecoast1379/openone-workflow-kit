# /new-feature

## Goal

初始化功能工作流: 创建工作区级 features/{feature}/ 容器、状态文件和截图目录。

## Required Inputs

- `AGENTS.md`
- `workflow/team-profile.yaml`
- Previous stage documents under workspace-level `features/{feature}/`
- Local code, local docs, and user-provided source materials listed in team-profile

## Execution Rules

- Read local facts before writing conclusions.
- Distinguish verified facts, design intent, assumptions, and missing evidence.
- 默认使用简体中文展示工作流沟通和阶段产物；专有名词、产品名、品牌名、代码标识符、命令、文件路径、分支名、API、SDK、框架、协议、标准、错误信息和官方英文术语保留原文。
- Do not claim tests, builds, screenshots, deployments, or reviews passed unless they were actually executed.
- Local branch creation, commit, tag, and local merge may be executed by the agent for personal projects after scope and working-tree checks. Remote Git refresh, push, release, deployment, database write, and production config write require explicit user authorization.
- This stage does not authorize business code changes unless the current command is an implementation command and all gates pass.



## Required Outputs

- Update or create the corresponding file under workspace-level `features/{feature}/`.
- Update workspace-level `features/{feature}/00-工作流状态.md` when stage status changes.
- Record unresolved questions and evidence gaps explicitly.
