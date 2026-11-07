# `@antelopejs/interface-stripe`

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/interface-stripe"><img data-illustration alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-stripe?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img data-illustration alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-stripe?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/g4pFt6eXqu"><img data-illustration alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a>
<a href="./docs/1.introduction.md"><img data-illustration alt="Docs" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a>
</div>

The AntelopeJS interface for Stripe payments. You create payment intents tied to your own records, and your code reacts when Stripe reports that they succeed or fail.

Part of [AntelopeJS](https://github.com/AntelopeJS/antelopejs), the TypeScript framework where modules depend on contracts and the application chooses the provider. Built by the team behind [AntelopeJS DMS](https://github.com/AntelopeJS/dms).

## What it offers

- `GetClient()` resolves to the project's configured [Stripe SDK](https://github.com/stripe/stripe-node) client.
- `InitializePayment` creates a payment intent and stores your own identifier, such as an order ID, in its metadata.
- `WaitForPayment` resolves when a payment intent succeeds and rejects when it is canceled.
- `WatchPayment` and `WatchAllPayments` call your callback on every payment intent event, with a flag that tells whether this instance received the webhook.
- `CompletePayment` charges a chargeable Stripe Source for the amount of a payment intent.

## Implementations

| Module                                                       | Notes                                              |
| ------------------------------------------------------------ | -------------------------------------------------- |
| [`@antelopejs/stripe`](https://github.com/AntelopeJS/stripe) | Configures the client and receives Stripe webhooks |

## Install

Add the interface to the module that takes payments:

```bash
pnpm add @antelopejs/interface-stripe
```

Then add the implementation to the project:

```bash
ajs project modules add @antelopejs/stripe
```

## Quick start

```ts
import {
  InitializePayment,
  WatchAllPayments,
} from "@antelopejs/interface-stripe";

declare function markOrderPaid(orderId: string): void;

export async function startCheckout(orderId: string, amountInCents: number) {
  const intent = await InitializePayment(orderId, {
    amount: amountInCents,
    currency: "eur",
    payment_method_types: ["card"],
  });
  return intent.client_secret;
}

WatchAllPayments((orderId, intent, context) => {
  if (orderId && context.local && intent.status === "succeeded") {
    markOrderPaid(orderId);
  }
});
```

`orderId` is the identifier passed to `InitializePayment`. Return the client secret to the authenticated payer before you wait for completion, so Stripe.js can confirm the payment. `markOrderPaid` stands for your own idempotent order update, and its `declare` line only gives it a type. Handle webhook redelivery even when `context.local` is true. Configure the Stripe credentials and the webhook endpoint of the implementation before you call these functions.

## Documentation

- [Introduction](./docs/1.introduction.md)
- [Payment processing](./docs/2.payment-processing.md)
- [Event monitoring](./docs/3.event-monitoring.md)

## Compatibility

Peer requirement:

<!-- antelopejs-docs-compat:start -->

| Package                      | Supported        | Tested with |
| ---------------------------- | ---------------- | ----------- |
| `@antelopejs/interface-core` | `>=0.2.4 <1.0.0` | `0.2.4`     |

<!-- antelopejs-docs-compat:end -->

Runtime dependency:

The package depends on the `stripe` SDK at runtime. `dependencies` in `package.json` holds its range. The package declares no `@antelopejs/core` peer range, so check the requirements of the implementing module too.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## License

[Apache-2.0](./LICENSE)
