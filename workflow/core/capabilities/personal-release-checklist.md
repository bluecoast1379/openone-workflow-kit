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

- `prod`: production or last-published branch.
- `main`: integration/testing branch.
- Development branch: created from `prod`, usually `feature/<short-name>` or `fix/<short-name>`.
- Tag: annotated `vX.Y.Z`, aligned with package, app, extension, or store version.

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
