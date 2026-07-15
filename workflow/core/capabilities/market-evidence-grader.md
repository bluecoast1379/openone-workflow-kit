# Market Evidence Grader

## Purpose

Keep market, competitor, and customer conclusions anchored to graded evidence instead of fabricated or unsourced claims, so solo developers do not build positioning, pricing, or channel plans on invented data.

## Sources

- `business/{product}/B1-业务定位.md` through `B9-策略复盘.md` drafts
- User interviews, support threads, and usage analytics owned by the user
- Public competitor pages, pricing pages, changelogs, and community discussions
- Public reports and search or trend data

## Rules

- Grade every market claim as first-hand (own interviews or data), second-hand (public sources), or inference; unlabeled claims are treated as inference.
- Every second-hand claim carries a source name and collection date; every first-hand claim carries sample size and time range.
- Never fabricate market size, user quotes, competitor prices, reviews, or channel benchmarks; unknown stays unknown and goes to the evidence-gap list.
- Order-of-magnitude market estimates are allowed only with the estimation method and inputs written out.
- Downgrade or re-verify conclusions when evidence is stale; check capture dates before reusing claims across stages.
- PMF, ICP, pricing, and channel decisions must cite the evidence rows they depend on.

## Suggested Outputs

- An evidence table (claim, grade, source, date, confidence) inside the stage document.
- An explicit evidence-gap and unvalidated-assumption list feeding `/B3-PMF与客户画像` and `/B9-策略复盘`.

## Failure Modes

- Writing "the market is huge" style conclusions with no source or method.
- Treating one enthusiastic user quote as PMF evidence.
- Copying competitor pricing without a capture date, then reusing it after it changed.
- Backfilling numbers to justify a channel or budget decision that was already made.
