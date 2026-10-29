---
covers:
  - src/index.ts
docs:
  - docs/2.payment-processing.md
  - docs/3.event-monitoring.md
journeys:
  - wait-for-payment
  - wait-types
---

# Await payment

`WaitForPayment(paymentIntentId)` resolves with the intent once it has succeeded and rejects with its `cancellation_reason` once it is canceled. An intent already terminal answers at once; a pending one settles on the next terminal change event, and concurrent calls for the same intent share one promise.

## Sub-features

- `wait-for-payment`: against the recording stand-in client: a `succeeded` intent resolves immediately, a `canceled` one throws `duplicate` (its reason), two calls for a `processing` intent stay pending through a non-terminal event and both resolve with the same intent object on the `succeeded` event, a pending one rejects with `abandoned` on a `canceled` event, and the client was asked to retrieve the intent once per call (five times).
- `wait-types`: a probe compiled against the packed declarations pins the parameter (`paymentIntentId: string`) and an answer assignable to `Stripe.PaymentIntent`.

## How to get to it (user POV)

- `const paid = await WaitForPayment(intent.id)` after `InitializePayment`, with the stripe module delivering webhook events.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" await-payment
```

## Gotchas

- The terminal events are emitted into `internal.intentChanges` by the journey, as the stripe module does for a webhook.
