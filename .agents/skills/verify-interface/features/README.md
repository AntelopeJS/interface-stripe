# Feature map

One file per feature. `covers:` lists the source globs it owns, `docs:` the pages a verdict judges, `journeys:` the journeys it runs, and `seeded-breaks/<feature>.patch` the break its journeys must catch. `pnpm exec antelopejs-verify map` checks that every user-facing file is covered.

| Feature | What the user does | Journeys |
|---|---|---|
| [payments](payments.md) | A server creates a payment intent for an order, and completes it with a chargeable source. | initialize-payment, complete-payment, payment-types |
| [await-payment](await-payment.md) | A server waits for a payment intent to succeed or be canceled. | wait-for-payment, wait-types |
| [watchers](watchers.md) | A module reacts to payment intent changes, for one intent or all. | watch-payments, watcher-types |
| [smoke](smoke.md) | The fixed journeys every verdict runs: load the packed interface with a stand-in client and call every function. | every-function, minor-bump |
