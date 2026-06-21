# Workflow Split Notes

This kit is the personal-developer split of the shared workflow.

It keeps the reusable workflow core, concrete command contracts, `/02B-UI设计` design gate, test/review evidence discipline, and multi-tool adapters from the team workflow, then removes team-only acceptance, training, and release-notification stages.

## Personal Workflow Outcome

The personal kit uses this shorter sequence:

`/01-需求讨论` -> `/02-产品文档` -> `/02B-UI设计` -> `/03-技术架构` -> `/04-代码实现` -> `/05-代码审查` -> `/06-测试用例` -> `/07-测试执行` -> `/08-发布准备` -> `/09-发布执行` -> `/10-复盘总结`.

## Migrated Independent-Developer Practices

- Use `prod` as the published baseline and `main` as integration/testing.
- Let agents create local development branch names, local branches, commits, tags, and local merges when the repo is personal, the scope is clear, and the working tree has been inspected.
- Keep remote push, GitHub release, package publication, store submission, deployment, database writes, and production config changes behind explicit user authorization.
- Align semantic tags such as `vX.Y.Z` with package, app, extension, or store versions.
- Preserve release artifacts, release notes, rollback points, and verification evidence in workflow documents.
- Capture durable lessons in Markdown knowledge layers without copying private chats, tokens, URLs, receipts, QR codes, or other sensitive identifiers.

