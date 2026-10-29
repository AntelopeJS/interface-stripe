---
covers:
docs:
  - docs/1.introduction.md
journeys:
  - every-function
  - minor-bump
---

# Smoke

The fixed journeys every verdict runs, whatever the diff touches: pack the interface, load it in `ajs project dev` with a stub provider (a stand-in Stripe client behind `internal.SetClient`) and a consumer, call every declared function through core, and compare the declared functions with the published version.

## Sub-features

- `every-function`: `GetClient`, `InitializePayment`, `WaitForPayment`, `CompletePayment`, `WatchAllPayments` and `WatchPayment` each answer through core with the value `verify.config.ts` expects; `internal.SetClient`, `internal.UnsetClient` and `internal.intentChanges` are provider-side.
- `minor-bump`: an added, changed or removed function releases as at least a new minor.

## How to get to it (user POV)

- A project with the stripe module and a module that imports `@antelopejs/interface-stripe`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" smoke
```

## Gotchas

- The smoke feature covers no glob, so it never marks a file as mapped.
- `minor-bump` needs the npm registry; without it the journey is not verified.
