# Agent Instructions

- Behavior lives primarily in `gserver/`; `gclient/` mainly starts the language client.
- When changing a `cucumberautocomplete.*` setting, keep `package.json`, `gserver/src/types.ts`, `gserver/test/data/defaultSettings.ts`, and README documentation consistent.
- Parser, completion, validation, definition, and formatter changes are regression-sensitive. Preserve existing behavior unless the requested change explicitly modifies it.
- Malformed user configuration, feature files, or step definitions must not crash the extension or server; use deterministic fallbacks or diagnostics.
- Treat `gserver/src/pages.handler.ts` as legacy compatibility code and change it only when required.
- Do not modernize dependencies, TypeScript, the VS Code engine, or CI during unrelated work.

## Testing

- Add focused regression tests for behavior changes and malformed input. Be careful when editing shared fixtures: they may affect completion, validation, definition, and usage-count tests together.
- Use Jest for detailed logic and input matrices. Use small E2E tests only for meaningful VS Code/LSP boundary behavior.
- Enforce 100% coverage for Jest-owned non-type files under `gserver/src`. Exclude legacy `pages.handler.ts`; collect `server.ts` through representative E2E tests without a threshold.
- Use `npm test` for fast feedback. Before handing off behavior changes, run `npm run test:coverage`, `npm run compile`, `npm run lint`, and `npm run package`; report any checks that could not run.
