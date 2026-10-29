---
covers:
  - src/index.ts
docs:
  - docs/1.introduction.md
  - docs/2.payment-processing.md
journeys:
  - initialize-payment
  - complete-payment
  - payment-types
---

# Payments

A server calls `GetClient()` for the shared Stripe client, `InitializePayment(id, params, options?)` to create a payment intent tied to an order (`metadata.payload = id`, other metadata kept, request options passed on), and `CompletePayment(paymentIntentId, source)` to charge a chargeable source for the intent's amount and currency and record the charge id in the intent's metadata.

## Sub-features

- `initialize-payment`: against a recording stand-in for the Stripe client (no key, no network): `metadata.payload` carries the order id, existing metadata survives, `{ idempotencyKey }` reaches `paymentIntents.create` as its second argument, and a call without options passes none.
- `complete-payment`: a source that is not `chargeable` throws `Source is not in chargeable state` before any client call; a chargeable one retrieves the intent, creates a charge for its amount and currency with `metadata.paymentIntentId` and the idempotency key `metadata.payload` (the intent id when there is no payload), then updates the intent's metadata with the charge id.
- `payment-types`: a probe compiled in strict mode against the packed declarations pins `GetClient` to `Promise<Stripe>`, the parameters of `InitializePayment` and `CompletePayment`, an answer assignable to `Stripe.PaymentIntent` (and not `any`), and `void` for `CompletePayment`.

## How to get to it (user POV)

- `const intent = await InitializePayment(orderId, { amount: 2500, currency: "usd" })`, then `CompletePayment(intent.id, source)` once Stripe reports a chargeable source.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" payments
```

## Gotchas

- Nothing reaches Stripe: the client is a recording stand-in. What Stripe does with the amount, currency and idempotency key is Stripe's; the journeys prove what this interface sends.
