# Channel Experiment Tracker

## Purpose

Run every marketing channel as an explicit experiment with a hypothesis, budget cap, time box, and predefined kill criteria, so solo developers avoid open-ended spend of money and attention.

## Sources

- `business/{product}/B5-渠道漏斗映射.md`, `B6-营销获客策略.md`, `B7-营销预算.md`, `B8-渠道执行策略.md`
- Channel analytics, spend records, and time logs kept by the user
- `business/{product}/B9-策略复盘.md` history

## Rules

- Each experiment records: channel, funnel position, hypothesis, action cadence, money cap, time cap, time box, primary metric, decision threshold, and notes.
- Define kill / keep / scale criteria before the experiment starts, not after seeing results.
- Time cost counts: hours-heavy channels are not "free" just because no cash was spent.
- Results use real numbers with date ranges; missing data is recorded as a collection gap, never silently estimated.
- Every experiment ends with an explicit verdict — validated / invalidated / inconclusive — feeding `/B9-策略复盘`.
- Outbound actions inside an experiment (posting, sending, spending) still require explicit user authorization or user execution.

## Suggested Outputs

- An experiment ledger table in `B8-渠道执行策略.md`, one row per experiment per cycle.
- Per-cycle verdicts and channel disposal recommendations (scale / keep / reduce / kill) for `/B9-策略复盘`.

## Failure Modes

- Running a channel "to see how it goes" with no metric or end date.
- Moving the decision threshold after results arrive.
- Running several overlapping experiments that share one primary metric window, making attribution impossible.
- Letting an inconclusive experiment run indefinitely instead of re-scoping or ending it.
