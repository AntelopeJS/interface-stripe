# @antelopejs/interface-stripe

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/interface-stripe"><img alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-stripe?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-stripe?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/sjK28QHrA7"><img alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a>
<a href="https://interfaces.antelopejs.com/docs/stripe"><img alt="Docs" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a>
</div>

Stripe payments for AntelopeJS: create payment intents tied to your own records, and react when Stripe reports that they succeed or fail.

## What it offers

- `GetClient()` resolves to the project's configured [Stripe SDK](https://github.com/stripe/stripe-node) client.
- `InitializePayment` creates a payment intent and stores your own identifier, such as an order ID, in its metadata.
- `WaitForPayment` resolves when a payment intent succeeds and rejects when it is canceled.
- `WatchPayment` and `WatchAllPayments` call you on every status change, with a flag that tells whether this instance received the event.

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

export async function startCheckout(orderId: string, amountInCents: number) {
  const intent = await InitializePayment(orderId, {
    amount: amountInCents,
    currency: "eur",
    payment_method_types: ["card"],
  });
  return intent.client_secret;
}

WatchAllPayments((orderId, intent, context) => {
  if (context.local && intent.status === "succeeded") {
    markOrderPaid(orderId);
  }
});
```

`orderId` is the identifier passed to `InitializePayment`. `markOrderPaid` stands for your own code.

## Documentation

- [Introduction](https://interfaces.antelopejs.com/docs/stripe/introduction)
- [Payment processing](https://interfaces.antelopejs.com/docs/stripe/payment-processing)
- [Event monitoring](https://interfaces.antelopejs.com/docs/stripe/event-monitoring)

## Compatibility

| Package                             | Range            |
| ----------------------------------- | ---------------- |
| `@antelopejs/interface-core` (peer) | `>=0.0.3 <1.0.0` |
| `stripe` SDK (dependency)           | `^18.5.0`        |
| `@antelopejs/core`                  | `1.x`            |

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm lint
pnpm build
```

## License

[Apache-2.0](./LICENSE)
