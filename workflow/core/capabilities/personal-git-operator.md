# Personal Git Operator

## Purpose

Allow agents to handle routine local Git mechanics for personal projects without importing team-scale manual-only constraints.

## Applies When

- The target repository is owned and used by the personal developer.
- The task scope is already recorded in the current workflow stage.
- The working tree state has been inspected.
- The operation is local: branch naming/creation, commit, tag, local merge, or worktree creation.

## Agent-Allowed Local Actions

- Create a local branch from `prod`, usually `feature/<short-name>`, `fix/<short-name>`, or `chore/<short-name>`.
- Create an isolated local worktree for same-repo parallel implementation.
- Stage and commit scoped changes after review and verification.
- Create local annotated tags such as `vX.Y.Z` after `/08-发布准备` records version evidence.
- Merge a completed development branch into local `main`, and promote local `main` into local `prod`, when tests and release readiness are recorded.

## Actions Requiring Explicit User Authorization

- `git fetch`, `git pull`, `git push`, `git remote add/set-url`, remote branch creation/deletion, remote tag push, GitHub release creation, npm publish, app store submission, deployment, database write, and production config write.
- Rewriting history, deleting branches, force pushing, or deleting tags.
- Any operation touching a repo that is not clearly personal.

## Checks

1. Inspect `git status --short --branch`.
2. Confirm the current branch and target branch match `workflow/team-profile.yaml#branch_model`.
3. Confirm no unrelated user changes would be staged or overwritten.
4. Run relevant tests/builds before commit, tag, local merge, or release preparation.
5. Record the exact branch/tag/commit in `features/{feature}/`.

## Failure Modes

- Treating "personal project" as permission to push or deploy without authorization.
- Staging unrelated user changes because the working tree was not inspected.
- Creating tags before version, artifact, and release notes are aligned.
- Using a `test` branch when `main` is already the personal integration branch.
