# Changelog

All notable changes to OpenOne Workflow Kit are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-08-24

### Changed

- Add managed `workflow/policy.yaml` profiles: new installations default to automatic selection, while upgraded workspaces without a policy retain full checks.
- Let low-risk local changes use a bounded lightweight path with at most two repair cycles, diff review before final targeted verification, and one end-of-run record.
- Shrink generated `AGENTS.md` and stage Skill read sets so a small task does not load the complete command catalog.
- Separate stable internal command metadata from plain-language titles and descriptions shown by generated adapters.
- Replace default protocol jargon with user-facing terms such as completion standard, acceptance item, check result, and explicit blocker; legacy IDs and contract formats remain compatible.

### Added

- Add `openone-workflow-resolve-policy` for deterministic policy validation and risk escalation.
- Add policy, upgrade, adapter-display, context-size, and legacy-compatibility regression coverage.

## [1.0.0] - 2026-07-27

### Changed

- Replace the unsupported project-level `.codex/prompts/` adapter with one umbrella Skill and 32 manifest-driven stage Skills under `.agents/skills/`.
- Give every development and commercialization stage a stable ASCII Skill slug, localized Codex display metadata, and explicit-only invocation policy.
- Make `workflow/core/command-manifest.yaml` the single source of truth for command IDs, descriptions, argument hints, implementation gates, and Codex Skill paths.
- Document the actual Codex surfaces: Desktop Skills search via `/`, and `/skills` or `$<skill-slug>` in CLI/IDE; literal Claude-style project commands such as `/01-需求讨论` are not claimed.

### Migration

- `--upgrade` now removes only direct `.codex/prompts/` children whose content exactly matches the 0.1.0 generated template, including CRLF checkouts; nested directories remain user-owned.
- User-authored or edited prompts, workspace facts and principles, custom Skills, and symbolic links are preserved; same-name custom Skills receive merge sidecars, and orphan Skills are removed only when they carry the OpenOne managed marker.
- `--dry-run` reports the migration plan without changing the target workspace.

### Verification

- Add all-32-stage Codex adapter conformance, negative manifest cases, safe migration fixtures, and installed-package coverage to the release checks.
- Require a real Codex `skills/list` acceptance check before publication.

## [0.1.0] - 2026-07-19

### Added

- Tool-neutral workflow core for a solo developer's delivery and commercialization tracks.
- Completion Contract, Definition Lint, Acceptance Oracle, and `/交付至完成` workflow.
- Adapters for Claude Code, Codex, Cursor, GitHub Copilot, CodeBuddy, Kiro, and Trae.
- Local workspace scanner, generated team profile, release-safety boundaries, and sanitized-content checker.
- Cross-platform release packaging with an installed-tarball smoke test.
- GitHub Actions coverage for Ubuntu on Node.js 18/20/22, Windows on Node.js 20, and macOS on Node.js 20.

### Security

- The initializer reads and writes only local workspace files; it does not upload source material or perform remote Git, publishing, deployment, database, or production-configuration writes.
- Release checks scan for common credential assignments, private-key markers, and private-network URLs; maintainers can add an external private denylist.

[0.1.0]: https://github.com/bluecoast1379/openone-workflow-kit/releases/tag/v0.1.0
[1.0.0]: https://github.com/bluecoast1379/openone-workflow-kit/releases/tag/v1.0.0
[1.1.0]: https://github.com/bluecoast1379/openone-workflow-kit/compare/v1.0.0...v1.1.0
[Unreleased]: https://github.com/bluecoast1379/openone-workflow-kit/compare/v1.1.0...HEAD
