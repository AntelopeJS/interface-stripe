---
covers:
  - src/index.ts
docs:
  - docs/3.event-monitoring.md
journeys:
  - watch-payments
  - watcher-types
---

# Watchers

`WatchAllPayments(callback, onlyLocal?)` calls the callback on every payment intent change (only on this instance's own with `onlyLocal`); `WatchPayment(paymentIntentId, callback)` does so for one intent, local or forwarded, until the intent is terminal. Callbacks receive the `metadata.payload` id (or `undefined`), the intent and an `IntentChangeContext` with `local`.

## Sub-features

- `watch-payments`: events emitted into `internal.intentChanges`: a global watcher sees a `processing` change, a forwarded one and the `succeeded` one, then a later change of another intent without payload (id `undefined`); an `onlyLocal` watcher skips the forwarded change; the per-intent watcher sees the same three changes and none after the intent succeeded.
- `watcher-types`: a probe compiled against the packed declarations pins `IntentChangeContext` to `{ local: boolean }` and the exact signatures of both watcher functions (`void` returns, no unsubscribe handle).

## How to get to it (user POV)

- `WatchAllPayments((id, intent) => audit(id, intent.status), true)` at startup; `WatchPayment(intent.id, handler)` after creating an intent.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" watchers
```

## Gotchas

- Global watchers stay registered for the life of the process (documented); the journey does not exercise removal.
