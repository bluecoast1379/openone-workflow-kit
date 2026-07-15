# /new-feature

## Goal

初始化功能工作流: 创建工作区级 `features/{feature}/` 容器、状态文件和截图目录，并完成复杂度分级（S/M/L），决定该需求走全流程还是压缩路径。

## Required Inputs

- `AGENTS.md`
- `workflow/team-profile.yaml`
- `workflow/constitution.md`
- Workspace-level `specs/` 现有行为基线（判断是否触碰既有行为）
- 用户对需求的初始描述

## Execution Rules

- Read local facts before writing conclusions.
- 创建容器后立即做**复杂度分级**，给出建议档位和理由，经用户确认后写入状态文件：
  - **S 档**（bugfix、文案、单文件小改，不改对外契约、不触碰高风险文件）：压缩为三步——`/定义完成`（只填合同 ★ 必填节的迷你合同）→ 实现 → 验证；跳过 02/02B/03/05/06 的独立文档。
  - **M 档**（单仓功能，影响面清晰）：标准路径，可按需豁免 02B（无 UI）等单项并记录。
  - **L 档**（跨仓、动数据/契约、触碰高风险文件、新产品首发）：全流程，不得豁免闸门阶段。
- 分级依据：影响仓库数、是否修改对外契约或 `specs/` 已有行为、是否触碰 team-profile `high_risk_files`、预估改动规模、回滚难度。拿不准时就近上调一档。
- 分级只压缩文档路径，不豁免授权边界：任何档位的远程 push、release、部署、对外动作仍需用户明确授权。
- 默认使用简体中文展示工作流沟通和阶段产物；专有名词、产品名、品牌名、代码标识符、命令、文件路径、分支名、API、SDK、框架、协议、标准、错误信息和官方英文术语保留原文。
- Local branch creation, commit, tag, and local merge may be executed by the agent for personal projects after scope and working-tree checks. Remote Git refresh, push, release, deployment, database write, and production config write require explicit user authorization.
- This stage does not authorize business code changes.

## Required Outputs

- 创建工作区级 `features/{feature}/` 目录和截图目录。
- 按 `workflow/core/templates/00-workflow-status.md` 创建 `features/{feature}/00-工作流状态.md`，写入复杂度档位、分级理由和对应路径。
- 商业化基线存在时登记关联的 `business/{product}/`。
- Record unresolved questions and evidence gaps explicitly.
