# Changelog

All notable changes to OpenOne Workflow Kit are documented here. The project follows [Semantic Versioning](https://semver.org/).

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
