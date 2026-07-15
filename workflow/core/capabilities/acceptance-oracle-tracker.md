# Acceptance Oracle Tracker

## Purpose

Make "done" a machine-checkable verdict instead of a feeling: every acceptance criterion is an oracle bound to a reproducible verification method, tracked through an explicit state machine. Declaring completion means all blocking oracles are PASS (or user-confirmed WAIVED) — nothing else counts.

## Sources

- `features/{feature}/00-完成合同.md` oracle table
- `features/{feature}/交付至完成.md` or `07-测试执行.md` execution evidence
- Local test/build/browser/manual-check outputs

## Oracle Format

| 字段 | 要求 |
| --- | --- |
| ID | `O-###`，稳定不复用 |
| 验收标准 | EARS（WHEN/WHILE/IF…THEN/WHERE + SHALL）或 Given/When/Then；绑定数字或可观察行为 |
| 验证方法 | auto：可复现命令/脚本/测试名；manual：编号步骤 + 明确判定标准 |
| 类型 | auto / manual（auto 优先；manual 用于体验直觉与无法自动化的检查） |
| blocking | 是/否；发布准入只看 blocking 集合 |
| 状态 | NOT_RUN / PASS / FAIL / STALE / WAIVED |
| 证据 | 命令输出、退出码、截图路径、日志片段；manual 附执行人与时间 |

## State Machine

- 初始一律 `NOT_RUN`；只有真实执行过验证方法才能进入 `PASS` 或 `FAIL`。
- `PASS` 之后，其覆盖的代码或配置再次变更 → 立即置 `STALE`，必须复验；`STALE` 不等于 `PASS`。
- `WAIVED` 只能由用户书面确认产生，必须记录理由与风险；agent 不得自我豁免。
- 状态只能由 `/交付至完成` 或 `/07-测试执行` 翻转，且逐次附证据；其他阶段只读。
- 冻结后不得修改标准、阈值、blocking 标记或删除 Oracle；确需变更走合同修订记录 + 用户确认。

## Verdict Rules

- 宣布完成 = blocking 全部 `PASS` 或 `WAIVED`（带确认）；存在 `NOT_RUN`/`FAIL`/`STALE` 的 blocking 项时，任何"基本完成/差不多了"表述都是违规。
- 非 blocking 项不阻塞发布，但终态汇总必须如实列出其状态。
- 无法执行的验证方法（缺环境/凭据）记为 `NOT_RUN` + 精确阻塞说明，不得凭推测标 `PASS`。

## Failure Modes

- 把"代码写完了"当成 PASS 的证据。
- 复用旧运行结果糊弄复验（证据必须对应当前 commit）。
- 修改测试或阈值使其通过，而不是修复实现。
- manual Oracle 没有步骤和判定标准，执行时临场发挥。
- STALE 项在发布前被悄悄当作 PASS 统计。
