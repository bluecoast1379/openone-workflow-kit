# Definition Lint

## Purpose

Gate contract freezing on an eight-dimension completeness check, and compensate for a solo developer's knowledge blind spots with a per-project-type "definition interview" question bank. A contract that has not passed this lint (or received explicit user waivers) must not be frozen, and implementation must not start on it.

## Sources

- `features/{feature}/00-完成合同.md` draft and its upstream stage documents
- `workflow/constitution.md`, `workflow/standards/`, workspace-level `specs/`
- `workflow/core/templates/completion-contract.md`

## The Eight Dimensions

| # | 维度 | 通过标准 |
| --- | --- | --- |
| 1 | 数据流确定性 | 写清数据来源、去向、唯一真相源；关键实体有状态机与不变量；无"数据大概存一下"式描述 |
| 2 | 失败路径闭环 | 失败路径表覆盖弱网/超时重试与幂等、并发冲突、进程中断、配额耗尽、非法输入、依赖故障；不适用项写明理由 |
| 3 | 质量预算 | 性能/资源/成本/依赖/安全至少各有一条硬数字或显式"无约束+理由"；无"性能要好"式描述 |
| 4 | Oracle 可复现 | 每条目标 ≥1 条 Oracle 覆盖；每条 Oracle 有可复现验证方法；auto 优先；≥1 条 blocking；manual 带步骤与判定标准 |
| 5 | 歧义消融 | 模糊词（快/流畅/稳定/好用/优雅/高性能/健壮/无缝/及时/大量）全部绑定数字或可观察行为；术语表覆盖有歧义风险的词；无未解决 `[待澄清]` |
| 6 | 体验质量线 | 有 UI 的需求：三态（空/错/载）、感知性能、可访问性最低线有可检查表述，且保留 ≥1 条 manual 体验 Oracle（S 档或纯后端可豁免） |
| 7 | 北极星挂钩 | 存在 `business/{product}/` 基线时，写明预期移动的漏斗指标；无基线时记录缺口而非编造 |
| 8 | 影响边界 | 允许改/禁止碰清单明确；引用 constitution 与 standards 适用条款；受影响契约对照 `specs/` 列出 |

清单可扩展：项目发现新维度时，在合同 Lint 表追加行并在复盘时提议回流本能力文件。

## Definition Interview（按项目类型的拷问清单）

逐题回答"已定义 / 不适用+理由 / 待澄清"，不允许跳过。目的：开发者不懂重试、幂等、内存模型没关系——问题清单逼着把它们变成合同条款或显式假设。

**通用（所有类型必问）**
- 最大输入是什么（大小/数量/长度）？超过时发生什么？
- 操作可以被安全地重复执行吗（幂等）？重复会造成什么？
- 进程/页面在操作中途被杀，重启后状态是什么？
- 哪些数据丢了无法恢复？备份/导出口径是什么？
- 单用户/单请求的成本上限是多少？被滥用时怎么止损？

**Web 应用 / API 服务**
- 弱网与超时：客户端重试吗？服务端如何去重？
- 并发写同一资源：最后写赢、锁、还是合并？用户看到什么？
- 鉴权失效瞬间正在进行的操作如何收场？
- P95 延迟与首屏目标是多少？在什么设备/网络下测？

**CLI 工具**
- 非交互环境（CI、管道）下行为如何？退出码约定？
- 中断（Ctrl+C）后留下什么状态？能续跑吗？
- 破坏性操作有没有 dry-run 和确认？

**浏览器扩展**
- 页面结构变化（选择器失效）时的降级行为？
- 权限最小集是什么？商店审核红线检查过吗？
- 存储配额满、跨设备同步冲突怎么办？

**移动应用**
- 离线/弱网下哪些功能可用？数据何时同步、冲突怎么解？
- 被系统杀进程后恢复到哪一步？推送权限被拒的替代路径？
- 冷启动时间与包体上限是多少？

**MCP / Agent 服务**
- 工具调用是否幂等？部分成功如何表达？
- 上游模型/服务超时与限流的重试和退避策略？
- 长任务的进度、取消与状态查询口径？

**静态站点 / 内容**
- 构建失败或数据源缺失时发布什么？
- SEO 元数据与结构化数据的验收标准？

## Rules

- Lint runs before freezing; every dimension gets an explicit conclusion in the contract's Lint table: 通过 / 未过+缺口 / 豁免+用户确认。
- A waiver requires the user's explicit confirmation and a recorded risk note; the agent must not self-waive.
- Interview answers that surface new constraints must be written back into the contract sections, not left in chat.
- S-tier contracts lint only the ★ sections plus dimension 4 and 5 (oracles and ambiguity are never skippable).

## Failure Modes

- Rubber-stamping: marking dimensions 通过 without quoting the contract text that satisfies them.
- Freezing with unresolved `[待澄清]` items "to save time".
- Writing quality budgets as aspirations ("尽量快") instead of numbers.
- Treating the interview as a form to fill instead of constraints to encode into oracles.
