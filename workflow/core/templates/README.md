# Templates

These templates are intentionally generic. Target teams should specialize them through `workflow/team-profile.yaml` and feature documents, not by hard-coding private company data into core files.

- `00-workflow-status.md`: 研发轨需求状态文件模板，落在 `features/{feature}/00-工作流状态.md`。
- `stage-document.md`: 研发轨阶段文档模板。
- `completion-contract.md`: 完成合同模板，落在 `features/{feature}/00-完成合同.md`；S 档只填 ★ 节，可用 `openone-workflow-check-contract` 校验。
- `constitution.template.md`: 工作区宪法模板，实例化为 `workflow/constitution.md`（跨需求不可协商原则）。
- `living-spec.md`: living spec 模板，落在工作区级 `specs/`（已实现行为的当前真相）。
- `00-business-status.md`: 商业化轨状态文件模板，落在 `business/{product}/00-商业化状态.md`。
- `business-stage-document.md`: 商业化轨阶段文档模板（证据分级 + 对外动作边界）。
- `team-profile.template.yaml`: 工作区配置模板。
