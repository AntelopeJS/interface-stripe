# interface-stripe

The AntelopeJS contract for Stripe payments, published as `@antelopejs/interface-stripe`. The whole interface is `src/index.ts`. `@antelopejs/stripe` (AntelopeJS/stripe) implements it.

## Layout

- The callers' API is the exported functions (`GetClient`, `InitializePayment`, `WaitForPayment`, `CompletePayment`, `WatchAllPayments`, `WatchPayment`) and `IntentChangeContext`. The payment functions wait on `internal.client`; the watchers listen on `internal.intentChanges`.
- The implementation side is the `internal` namespace: the implementing module resolves the client through `internal.SetClient`, resets it with `internal.UnsetClient`, and emits webhook payment-intent changes on the `internal.intentChanges` event proxy. Renaming or retyping any `internal` member breaks `@antelopejs/stripe`.
- `skills/` and `docs/` ship in the npm package. `docs/` is the source of interfaces.antelopejs.com/docs/stripe; Markdown fences tagged `ts docs-check` type-check through `docs/tsconfig.json`, which maps the package name onto `src/index.ts`; untagged fences are not checked (one tagged fence today, in `docs/2.payment-processing.md`). When a public contract changes, update the matching doc page and `skills/stripe-interface/SKILL.md`.

## Versioning

- `@antelopejs/stripe` depends on this package with a range capped below the next minor (`>=0.0.6 <0.1.0` today). A breaking change to the exported functions or to `internal` ships as a new minor (`0.x.0`), never a patch.
- `@antelopejs/interface-core` is a peer dependency with the range `>=0.5.1 <0.6.0`, mirrored in `devDependencies`. The README compatibility tables are checked against `package.json`; change all three together.
- Every 0.x `@antelopejs/*` range stops below the next minor, and every 1.x range uses `~`. The `dependency:ranges` step of `pnpm run checks` rejects any other range.

## Checks

- The package has no test suites. `pnpm test` only builds `dist` with `tsc`, so `pnpm run checks` proves the package compiles and emits.
- `pnpm run checks` does not run the docs check (Markdown links, the README compatibility tables, and the `ts docs-check` fences). Only CI runs it, through the `docs-files` and `docs-typescript-project` inputs of `.github/workflows/ci.yml`; no local script runs it.
- Webhook handling is tested in AntelopeJS/stripe. Nothing tests the watcher, `WaitForPayment` or `CompletePayment` logic in `src/index.ts`.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

CI runs `pnpm run checks` in full on every pull request and reports what failed. The commit hook formats and lints the staged files. Locally, check only what you touched, one test file and not the suite, as the [`verify-changes`](.agents/skills/verify-changes/SKILL.md) skill says.

### Comments

Say it in code: a constraint in a type, a lint rule or a test, a public item's contract in TSDoc. Other comments are lint directives naming their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, and license or tool directives. A reason states what the code does now.

### Tests

Each test names the wrong implementation it fails on, or is deleted. Drive behaviour through the public interface. An invariant over many files is a lint rule.

### Review

No tool checks these:

- A type guard checks the nested elements and values it claims.
- A no-upward import rule rejects same-tier peers; probe it with an import.
- A finding only an evasion or a patched internal can trigger goes under Attention and never blocks.

### Suppressions

`guardrails.suppressions.json` caps lint directives, `@ts-expect-error`, `SAFETY:` comments and rules a lint config turns off. Over a cap, fix the code or remove another suppression of that kind; only the operator raises a number. After removing suppressions, run `pnpm run suppressions:update` and commit the file.

<!-- antelopejs-guardrails:end -->
