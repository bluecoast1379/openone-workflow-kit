# Visual asset provenance

The assets in this directory are deterministic, reviewable SVG source files created for OpenOne Workflow Kit. They are based only on this repository's public product concepts and visual specification.

## Sources and boundaries

- No external image, icon, font, screenshot, customer data, telemetry, or private URL is embedded.
- All shapes and diagrams are authored as SVG primitives; all fonts use a local system stack.
- Product names, commands, version numbers, workflow stages, and expected results are written explicitly and remain reviewable as text.
- The images make no performance, adoption, production-certification, or community-size claims.
- README text provides an accessible equivalent for every critical command and architectural concept.

## Reproduction and verification

1. Validate syntax with `xmllint --noout docs/assets/*.svg`.
2. Run `npm run check` to verify dimensions, file-size limits, accessibility elements, and SHA-256 checksums against `visual-manifest.json`.
3. Render the SVGs with a standards-compliant browser for visual review.
4. Export `social-preview.svg` to an untracked 1280×640 `social-preview.png` before uploading it in GitHub repository settings; the SVG keeps all critical content inside a 64 px safe area. The PNG checksum is recorded in `visual-manifest.json`, while the binary stays outside the source package.

If any SVG changes, update its checksum in `visual-manifest.json` and repeat both machine and visual QA.
