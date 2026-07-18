# Agent Instructions

## Project-Specific Rules

- Most behavior changes belong in `gserver/`; `gclient/` mainly starts the VS Code language client.
- Root `package.json` is the VS Code extension manifest. For every `cucumberautocomplete.*` setting change, keep the manifest schema/defaults, `gserver/src/types.ts`, `gserver/test/data/defaultSettings.ts`, and README documentation consistent.
- Parser, completion, validation, definition, and formatter changes are regression-sensitive. Preserve existing behavior unless the requested change explicitly modifies it.
- Add focused tests for new behavior and for bug fixes, especially when changing step matching, custom parameters, formatting, diagnostics, or fixture parsing.
- Do not modernize dependencies, TypeScript, the VS Code engine, or legacy CI as part of an unrelated change.

## Verification

Run the narrowest useful check during development. Before handing off code that
changes behavior, run:

- `npm test`
- `npm run compile`
- `npm run lint`
- `npm run package`

If a command cannot be run locally, report why and list the checks that did run.
