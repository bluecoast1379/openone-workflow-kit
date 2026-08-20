# Personal Release Checklist

## Purpose

Capture the independent-developer release discipline migrated from the local gstack guide: local integration, version alignment, tags, artifacts, channel-specific checks, documentation, and rollback.

## Required Evidence

- Release scope and excluded changes.
- Clean or intentionally staged working tree.
- Release candidate commit.
- Test/build/lint/browser or platform-specific verification.
- Version number and tag plan.
- Artifact path, package path, or deployment target.
- Rollback point and rollback command.

## Branch And Tag Model

- Read the repository's existing rules and `workflow/team-profile.yaml#branch_model` before naming a production, integration, testing, or development branch.
- If branch roles are unknown, report the missing configuration and do not guess `prod`, `main`, or `test`.
- A local development branch may be created from the configured base after scope and dirty-tree checks.
- Use the repository's tag convention; if none is defined, propose a version-aligned annotated tag and record that it is a proposal rather than an existing rule.

## Channel Checks

### Web / SaaS

- Build and smoke test the production bundle.
- Confirm environment variables and secrets are not committed.
- Record deployment provider, preview URL, production URL, and rollback method.

### Browser Extension

- Bump `manifest.json` version.
- Validate permissions and host permissions.
- Ensure 16 / 48 / 128 icons exist.
- Package a zip whose root contains `manifest.json`.
- Exclude `.git`, `node_modules`, tests, docs, zip files, `.DS_Store`, and private notes.
- Prepare store listing, screenshots, privacy statement, and "no remote code" answer when true.

### CLI / Desktop / Mobile

- Align binary/app version, release notes, and tag.
- Record packaging command and artifact checksum when practical.
- Record notarization, signing, app store, or platform-specific pending review state.

## Authorization Boundary

Agents may prepare local artifacts and local tags for personal projects. Remote push, release creation, store submission, deployment, and production config writes require explicit user authorization in the current task.
