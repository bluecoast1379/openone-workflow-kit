# Knowledge Capture Maintainer

## Purpose

Keep durable knowledge in a maintained Markdown layer instead of scattering high-value lessons across chats and one-off notes.

## Sources

- `features/{feature}/10-复盘总结.md`
- Project README / CHANGELOG / release notes when intended to be public.
- `llm-wiki-pilot/wiki/` or another user-designated Markdown wiki.
- Obsidian Vault notes when the user explicitly asks to use that vault.

## Rules

- Raw source material remains the source of truth; wiki pages are summaries and decision records.
- Update index and log files together when the target wiki has that convention.
- Do not ingest secrets, personal tokens, private URLs, payment details, ticket IDs, QR codes, receipt identifiers, or private chat text.
- Preserve provenance by linking or naming the local source file that supports each reusable lesson.
- Keep project docs and workflow docs under `features/<feature>/` unless they are intentionally public code-facing docs.

## Suggested Outputs

- A concise "Reusable Rules" section in the retrospective.
- A wiki page update for stable lessons that will be useful across projects.
- A follow-up issue or TODO for unstable lessons that need more evidence.

## Failure Modes

- Treating a wiki summary as stronger than the source code, tests, or release evidence.
- Importing raw private content instead of extracting task-relevant lessons.
- Updating a wiki page without updating its index or maintenance log.
