# Testing strategy

## Goals

The test suite should protect the language features users rely on while keeping
most feedback fast and local. The target shape is:

1. Many unit and fixture tests for parsing and transformation logic.
2. Focused integration tests at handler boundaries.
3. A small Extension Host E2E suite for client/server wiring and VS Code behavior.

Coverage is enforced per source file. Ownership, thresholds, and exclusions are
defined below.

## Commands

| Command | Purpose | Report |
| --- | --- | --- |
| `npm test` | Fast Jest suite | None |
| `npm run test:coverage:jest` | Jest with coverage | `coverage/jest` |
| `npm run test:e2e` | Extension Host E2E suite | None |
| `npm run test:e2e:coverage` | E2E suite with `server.ts` coverage | `coverage/e2e` |
| `npm run test:coverage` | Both coverage suites, merge, and enforcement | `coverage/combined` |

Use `npm test` for local feedback and `npm run test:coverage` before merging a
behavior change. The first E2E run downloads VS Code. Set `VSCODE_TEST_VERSION`
to select a release; the default is stable. On headless Linux, prefix the E2E
command with `xvfb-run -a`. The `Extension Tests` launch configuration supports
running and debugging the suite from VS Code and compiles the E2E sources first.

The workspace recommends the official VS Code Extension Test Runner. Before
using its Test view, run `npm run compile:e2e` so the JavaScript files referenced
by `.vscode-test.mjs` are current. The recommendation is optional: contributors
can keep using the npm commands without installing it.

## Choosing the test level

### Jest

Tests under `gserver/test` should cover behavior that does not require VS Code:

- parsing, Cucumber expressions, custom parameters, and malformed input;
- completion, validation, definition, and formatting details;
- settings normalization, utilities, and page-object lookup;
- exact fallback, diagnostic, and error behavior.

For a regression, add the smallest fixture or table-driven case that reproduces
it. Edit shared fixtures carefully because they can affect completion,
validation, definition, and usage-count expectations together.

### Extension Host E2E

Tests under `gclient/test/suite` launch a real Extension Development Host
against a disposable fixture workspace. Use them only when the VS Code/LSP
boundary matters, such as:

- activation, language selection, configuration, and provider routing;
- diagnostics and completion resolution, including its observable usage-order
  effect, as exposed by VS Code;
- document, range, and on-type edit application;
- configuration or file-watcher reloads;
- standalone and workspace lifecycle behavior.

Keep this suite small. Use representative success and failure paths instead of
repeating Jest's input matrices. Wait for observable provider results rather
than using fixed multi-second sleeps.

VS Code describes tests in an Extension Development Host as integration tests.
See [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
and [Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration).

## Coverage ownership

- The combined checker enforces 100% statements, branches, functions, and lines
  for each Jest-owned non-type file under `gserver/src`.
- Legacy `pages.handler.ts`, `types.ts`, and declaration files are excluded from
  the threshold.
- E2E owns the `server.ts` coverage map. Its coverage is reported without a
  percentage threshold and its behavior is gated by representative scenarios.
- The process-bound `gclient/src/extension.ts` is outside the percentage gate;
  cover meaningful client/server wiring through E2E tests.

The checker requires the expected files in each coverage map, rejects overlap,
and generates the authoritative local report in `coverage/combined`. Coverage
is a regression floor, not a reason to add low-value assertions.

## Known limitations

- Page-object E2E coverage is deferred until the future of legacy page-object
  support is decided.
- The server advertises workspace-folder support, but its change callback only
  logs the event; it does not rebuild the server root or handlers.
- CI does not currently test the minimum supported VS Code version or operating
  systems beyond Linux and Windows.

## CI

The build job runs compile, lint, Jest, and VSIX packaging. The Linux E2E job
runs the complete coverage workflow through `xvfb-run`, while the Windows E2E
job runs the same smoke suite without coverage to catch platform-sensitive glob,
URI, and path behavior. Linux uploads the combined JSON summary for three days;
full HTML reports remain local.
