---
name: stripe-interface
description: Provides Stripe payment processing for AntelopeJS modules - payment-intent creation, completion, awaiting terminal states, cluster-aware payment event watching, and access to the raw Stripe SDK client. Use when code imports "@antelopejs/interface-stripe" or uses GetClient, InitializePayment, WaitForPayment, CompletePayment, WatchAllPayments, WatchPayment, or IntentChangeContext, or when a task involves Stripe payments, payment intents, charges, or payment webhooks in an AntelopeJS project.
category: antelopejs-interface
tags: [stripe, payments, payment-intent, webhooks, antelopejs]
---

# Stripe interface

Consumer-facing contract for Stripe payments in AntelopeJS. A separate provider module owns the Stripe SDK client and feeds payment-intent change events (webhooks, cluster broadcasts) into the interface; the actual proxy crossings are the shared client promise and an `EventProxy` of intent changes, both living in the `internal` namespace. Everything a consumer touches — the exported functions below — are consumer-side helpers built on that shared client and event stream. All Stripe types are the official `stripe` SDK types.

## Imports

Single root export, no subpaths:

```ts
import {
  GetClient,
  InitializePayment,
  WaitForPayment,
  CompletePayment,
  WatchAllPayments,
  WatchPayment,
  type IntentChangeContext,
} from "@antelopejs/interface-stripe";
import type Stripe from "stripe"; // for PaymentIntent, Source, etc.
```

## Consuming

```ts
// Create a payment intent linked to your own id (stored in metadata.payload)
const intent = await InitializePayment("order_123", {
  amount: 2500, // smallest currency unit
  currency: "usd",
  payment_method_types: ["card"],
});

// Resolves when status reaches "succeeded"; rejects with cancellation_reason on "canceled"
const completed = await WaitForPayment(intent.id);
```

Reacting to status changes instead of awaiting:

```ts
WatchPayment(intent.id, (payloadId, intent, context) => {
  // payloadId === intent.metadata.payload (the id given to InitializePayment)
});

// Filter at registration: only local events reach the callback
WatchAllPayments((payloadId, intent, context) => {
  // context.local is always true here
}, /* onlyLocal */ true);

// …or filter manually inside the callback
WatchAllPayments((payloadId, intent, context) => {
  if (!context.local) return; // event came from another cluster instance
});
```

Escape hatch for anything the helpers don't cover:

```ts
const stripe = await GetClient(); // raw Stripe SDK client
```

## Gotchas

- Every client-backed helper (`GetClient`, `InitializePayment`, `WaitForPayment`, `CompletePayment`) awaits the shared client, which only resolves once a provider module implementing this interface is loaded; `WatchPayment`/`WatchAllPayments` register synchronously but receive no events until then. Declare `@antelopejs/interface-stripe` in the consuming module's `dependencies` and resolve a provider with `ajs project modules install`. Consumers never touch the `internal` namespace (`SetClient`, `intentChanges`) — that is the provider seam.
- `WaitForPayment` retrieves the intent first: it returns immediately if already `succeeded` and rejects immediately if already `canceled`. On cancellation it rejects with the intent's `cancellation_reason`, not an `Error`.
- The first watcher argument is `intent.metadata.payload` — it is `undefined` for intents created outside `InitializePayment`.
- Per-intent watchers (`WatchPayment` callbacks, pending `WaitForPayment` promises) are cleaned up automatically when the intent reaches a terminal state (`succeeded` or `canceled`). `WatchAllPayments` watchers persist.
- `onlyLocal` filtering exists only on `WatchAllPayments`; `WatchPayment` callbacks fire for both local and cluster events — check `context.local` yourself if you need to deduplicate across instances.
- `CompletePayment` throws unless the source's `status` is `"chargeable"`; it charges the intent's own amount/currency and uses `metadata.payload` (falling back to the payment-intent id) as the idempotency key.
- Providing this interface is not a normal consumer task: a Stripe connector module implements it by wiring the SDK client and webhook events through `internal`.

## Reference

Deeper reference lives in this package's `docs/` — "Payment Processing" (GetClient, InitializePayment, WaitForPayment, CompletePayment) and "Event Monitoring" (IntentChangeContext, IntentWatcher, WatchAllPayments, WatchPayment) — and in the shipped `dist/index.d.ts`. Do not duplicate them here.
