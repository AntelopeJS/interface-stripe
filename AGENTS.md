# interface-stripe

The AntelopeJS contract for Stripe payments, published as `@antelopejs/interface-stripe`. The whole interface is `src/index.ts`. `@antelopejs/stripe` (AntelopeJS/stripe) implements it.

## Layout

- The callers' API is the exported functions (`GetClient`, `InitializePayment`, `WaitForPayment`, `CompletePayment`, `WatchAllPayments`, `WatchPayment`) and `IntentChangeContext`. They run in this package and wait on `internal.client`.
- The implementation side is the `internal` namespace: the implementing module resolves the client through `internal.SetClient`, resets it with `internal.UnsetClient`, and emits webhook payment-intent changes on the `internal.intentChanges` event proxy. Renaming or retyping any `internal` member breaks `@antelopejs/stripe`.
- `skills/` and `docs/` ship in the npm package. `docs/` is the source of interfaces.antelopejs.com/docs/stripe; its snippets type-check through `docs/tsconfig.json`, which maps the package name onto `src/index.ts`. When a public contract changes, update the matching doc page and `skills/stripe-interface/SKILL.md`.

## Versioning

- `@antelopejs/stripe` depends on this package with a range capped below the next minor (`>=0.0.6 <0.1.0` today). A breaking change to the exported functions or to `internal` ships as a new minor (`0.x.0`), never a patch.
- `@antelopejs/interface-core` is a peer dependency with the range `>=0.2.4 <1.0.0`, mirrored in `devDependencies`. The README compatibility tables are checked against `package.json`; change all three together.

## Checks

- The package has no test suites. `pnpm test` only builds `dist` with `tsc`, so `pnpm run checks` proves the package compiles and emits.
- `pnpm run checks` does not run the docs check (Markdown links, the README compatibility tables, and the `docs/` snippets type-checked through `docs/tsconfig.json`). Only CI runs it, through the `docs-files` and `docs-typescript-project` inputs of `.github/workflows/ci.yml`. To type-check the snippets locally, run `pnpm exec tsc -p docs/tsconfig.json`.
- The runtime behaviour (webhooks, watchers, payment completion) is tested in AntelopeJS/stripe, not here.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

Finish every change with `pnpm run checks`. It runs typecheck, lint, format, knip, tests, size, ratchet, and sync, and prints only what failed. The change is done when it prints no failure.

The tools enforce most rules, listed in the table at the end. The sections below hold the rules no tool checks.

### Comments

Say it in code. A constraint belongs in a type, a lint rule, or a test. A public item's contract belongs in TSDoc (`/** */`) on that item. The only other comments are lint directives that name their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, `/*!` license headers, and bundler or formatter directives.

### Tests

Hold every test you write or keep to this checklist:

- Name the wrong implementation this test fails on. A test with no answer is deleted, not kept.
- No test reads the file it tests. Drive the behaviour through the public interface.
- An invariant over many files is a lint rule, not a test.

### Debt

`guardrails.ratchet.json` records the lint findings and oversize files this repository already had. Its numbers only go down. After you remove debt, run `pnpm run ratchet:update` and commit the lowered file. A rule listed there is off for `oxlint`. The ratchet counts it instead, and the pre-commit hook rejects it on every line you add.

### What enforces what

| Rule                                                                           | Enforced by                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Formatting                                                                     | oxfmt                                     |
| Lint findings are errors; no rule warns                                        | oxlint preset                             |
| Comments are TSDoc, directives, or `SAFETY:` only                              | `antelopejs/no-comments`                  |
| Every test asserts                                                             | `antelopejs/require-assertion`            |
| Tests read no files outside fixtures, helpers, locales                         | `antelopejs/no-fs-read-in-tests`          |
| No assertion that restates a constant                                          | `antelopejs/no-constant-value-assertion`  |
| No test whose only check is "is a function"                                    | `antelopejs/no-typeof-function-only-test` |
| Params ≤ 5, function ≤ 120 lines, file ≤ 500 lines, depth ≤ 4, complexity ≤ 20 | `eslint/max-*`, `eslint/complexity`       |
| Files ≤ 20,000 bytes, tests included                                           | `antelopejs-check-size` (pre-commit)      |
| Existing debt only shrinks                                                     | `antelopejs-ratchet`                      |
| Types check                                                                    | `tsc` (pre-push)                          |
| No dead files, exports, or dependencies                                        | knip                                      |
| Managed files match the pack                                                   | `antelopejs-sync --check`                 |
| A test names the wrong implementation it catches                               | review; no tool                           |

<!-- antelopejs-guardrails:end -->
