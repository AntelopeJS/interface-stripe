import { equal } from "@antelopejs/tooling-configs/verify";
import type { Journey, VerifyConfig } from "@antelopejs/tooling-configs/verify";

import type * as StripeInterface from "../../../src/index.ts";

/** An intent as the hook client answers it, already paid. */
const HOOK_INTENT = { id: "pi_hook", status: "succeeded", amount: 2500, currency: "usd", metadata: { payload: "order-1" }, cancellation_reason: null };

/** The stand-in Stripe client the stub provider hands to `internal.SetClient`: no network, no key. */
const hookClient = {
  paymentIntents: {
    create: async (params: { metadata?: object }) => ({ ...HOOK_INTENT, id: "pi_created", metadata: params.metadata }),
    retrieve: async (id: string) => ({ ...HOOK_INTENT, id }),
    update: async () => HOOK_INTENT,
  },
  charges: { create: async () => ({ id: "ch_hook" }) },
};

/** The setup every scenario shares: the packed interface, a recording stand-in for the Stripe client, and small helpers. */
const SCENARIO_PRELUDE = `
const dist = process.argv[2];
const stripe = require(dist);
const calls = [];
const intents = new Map();
const addIntent = (id, status, extra = {}) => intents.set(id, { id, status, amount: 0, currency: "usd", metadata: {}, cancellation_reason: null, ...extra });
const client = {
  paymentIntents: {
    create: async (params, options) => {
      calls.push(["paymentIntents.create", params, options ?? null]);
      const intent = { id: "pi_1", status: "requires_payment_method", amount: params.amount, currency: params.currency, metadata: params.metadata ?? {}, cancellation_reason: null };
      intents.set(intent.id, intent);
      return intent;
    },
    retrieve: async (id) => { calls.push(["paymentIntents.retrieve", id]); return intents.get(id); },
    update: async (id, params) => { calls.push(["paymentIntents.update", id, params]); return intents.get(id); },
  },
  charges: { create: async (params, options) => { calls.push(["charges.create", params, options ?? null]); return { id: "ch_1" }; } },
};
stripe.internal.SetClient(client);
const emit = (intent, local = true) => stripe.internal.intentChanges.emit(intent, { local });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rejection = async (promise) => { try { await promise; return null; } catch (error) { return error.message; } };
`;

const SCENARIO_TAIL = `
main().then((out) => { console.log(JSON.stringify(out)); process.exit(0); }, (error) => { console.error(error); process.exit(1); });
`;

/** The probe header: `Assert<Same<A, B>>` fails to compile when A and B are not assignable both ways. */
const PROBE_HEADER = `
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Extends<A, B> = [A] extends [B] ? true : false;
type NotAny<T> = 0 extends 1 & T ? false : true;
type Assert<T extends true> = T;
type Answer<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>;
`;

/** Runs a scenario against the packed interface and a recording stand-in for the Stripe client, then checks what it printed: the answers and the exact calls the client received. */
function scenario(title: string, body: string, printed: string): Journey {
  return {
    title,
    entryPoint: "the packed interface driven from a Node process with a stand-in Stripe client handed to internal.SetClient",
    async run(context) {
      const file = `${context.work}/scenario.js`;
      context.edit("write the scenario", file, `${SCENARIO_PRELUDE}\nasync function main() {\n${body}\n}\n${SCENARIO_TAIL}`);
      const ran = await context.command("run the scenario", "node", [file, `${context.repo}/dist/index.js`], { timeoutMs: 60_000 });
      context.expect(ran.folder, [
        { name: "the scenario ended cleanly", pass: ran.exitCode === 0, detail: ran.stderr.slice(-300) },
        equal("the answers and the client calls are what the docs promise", ran.stdout.trim().split("\n").at(-1) ?? "", printed),
      ]);
    },
  };
}

/** Compiles a probe against the packed declarations in the consumer's strict mode. */
function declared(title: string, probe: string): Journey {
  return {
    title,
    entryPoint: "a TypeScript consumer compiling against the packed declarations",
    async run(context) {
      const file = `${context.work}/probe.ts`;
      const imports = `import type * as Api from "${context.repo}/dist/index";\nimport type Stripe from "stripe";`;
      await context.command("link the repository's dependencies", "ln", ["-s", `${context.repo}/node_modules`, `${context.work}/node_modules`]);
      context.edit("write the signature probe", file, `${imports}\n${PROBE_HEADER}\n${probe}`);
      const compiled = await context.command("compile the signature probe", "node", [
        `${context.repo}/node_modules/typescript/bin/tsc`,
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--target",
        "es2022",
        "--module",
        "commonjs",
        "--moduleResolution",
        "node",
        "--typeRoots",
        `${context.repo}/node_modules/@types`,
        "--types",
        "node",
        file,
      ]);
      context.expect(compiled.folder, [
        { name: "every export has the documented signature", pass: compiled.exitCode === 0, detail: compiled.stdout.slice(0, 400) },
      ]);
    },
  };
}

const INITIALIZE_BODY = `
  const created = await stripe.InitializePayment("order-7", { amount: 2500, currency: "usd", metadata: { cart: "c1" } }, { idempotencyKey: "k1" });
  const plain = await stripe.InitializePayment("order-8", { amount: 100, currency: "eur" });
  return { metadata: created.metadata, plainMetadata: plain.metadata, calls };
`;

const COMPLETE_BODY = `
  addIntent("pi_a", "requires_payment_method", { amount: 4200, currency: "eur", metadata: { payload: "order-9" } });
  addIntent("pi_b", "requires_payment_method", { amount: 10, currency: "usd" });
  const notChargeable = await rejection(stripe.CompletePayment("pi_a", { id: "src_x", status: "consumed" }));
  const callsAfterRefusal = calls.length;
  await stripe.CompletePayment("pi_a", { id: "src_1", status: "chargeable" });
  await stripe.CompletePayment("pi_b", { id: "src_2", status: "chargeable" });
  return { notChargeable, callsAfterRefusal, calls: calls.slice(callsAfterRefusal) };
`;

const WAIT_BODY = `
  addIntent("pi_ok", "succeeded");
  addIntent("pi_no", "canceled", { cancellation_reason: "duplicate" });
  addIntent("pi_wait", "processing");
  addIntent("pi_fail", "processing");
  const ok = (await stripe.WaitForPayment("pi_ok")).id;
  const canceled = await stripe.WaitForPayment("pi_no").then(() => null, (reason) => reason);
  const first = stripe.WaitForPayment("pi_wait");
  const second = stripe.WaitForPayment("pi_wait");
  const failing = stripe.WaitForPayment("pi_fail").then(() => null, (reason) => reason);
  await sleep(50);
  emit({ id: "pi_wait", status: "processing", metadata: {} });
  await sleep(20);
  emit({ id: "pi_wait", status: "succeeded", metadata: {} });
  emit({ id: "pi_fail", status: "canceled", cancellation_reason: "abandoned", metadata: {} });
  const [a, b] = await Promise.all([first, second]);
  const failed = await failing;
  return { ok, canceled, same: a === b, settled: a.id, failed, retrieves: calls.filter((call) => call[0] === "paymentIntents.retrieve").length };
`;

const WATCH_BODY = `
  const all = [];
  const local = [];
  const one = [];
  stripe.WatchAllPayments((id, intent, context) => all.push([id, intent.status, context.local]));
  stripe.WatchAllPayments((id, intent) => local.push([id, intent.status]), true);
  stripe.WatchPayment("pi_w", (id, intent, context) => one.push([id, intent.status, context.local]));
  emit({ id: "pi_w", status: "processing", metadata: { payload: "order-1" } }, true);
  emit({ id: "pi_w", status: "processing", metadata: { payload: "order-1" } }, false);
  emit({ id: "pi_w", status: "succeeded", metadata: { payload: "order-1" } }, true);
  emit({ id: "pi_w", status: "processing", metadata: {} }, true);
  return { all, local, one };
`;

const PAYMENT_TYPES = `
type _Client = Assert<Same<Answer<typeof Api.GetClient>, Stripe>>;
type _InitParams = Assert<Same<Parameters<typeof Api.InitializePayment>, [id: string, params: Stripe.PaymentIntentCreateParams, options?: Stripe.RequestOptions]>>;
type _InitAnswer = Assert<Extends<Answer<typeof Api.InitializePayment>, Stripe.PaymentIntent>>;
type _InitKnown = Assert<NotAny<Answer<typeof Api.InitializePayment>>>;
type _CompleteParams = Assert<Same<Parameters<typeof Api.CompletePayment>, [paymentIntentId: string, source: Stripe.Source]>>;
type _CompleteAnswer = Assert<Same<Answer<typeof Api.CompletePayment>, void>>;
`;

const AWAIT_TYPES = `
type _WaitParams = Assert<Same<Parameters<typeof Api.WaitForPayment>, [paymentIntentId: string]>>;
type _WaitAnswer = Assert<Extends<Answer<typeof Api.WaitForPayment>, Stripe.PaymentIntent>>;
type _WaitKnown = Assert<NotAny<Answer<typeof Api.WaitForPayment>>>;
`;

const WATCHER_TYPES = `
type Context = { local: boolean };
type Watcher = (id: string | undefined, intent: Stripe.PaymentIntent, context: Context) => void;
type _Context = Assert<Same<Api.IntentChangeContext, Context>>;
type _All = Assert<Same<Parameters<typeof Api.WatchAllPayments>, [callback: Watcher, onlyLocal?: boolean]>>;
type _One = Assert<Same<Parameters<typeof Api.WatchPayment>, [paymentIntentId: string, callback: Watcher]>>;
type _AllReturn = Assert<Same<ReturnType<typeof Api.WatchAllPayments>, void>>;
type _OneReturn = Assert<Same<ReturnType<typeof Api.WatchPayment>, void>>;
`;

const config: VerifyConfig<typeof StripeInterface> = {
  doors: {
    data: null,
    format: null,
    contract: {
      globs: ["src/index.ts", "package.json"],
      funnels: [],
      containments: [],
      why: "the six functions and IntentChangeContext are what every payment flow imports",
    },
    outbound: {
      globs: ["src/index.ts"],
      funnels: [],
      containments: [],
      why: "CompletePayment creates a Stripe charge and InitializePayment creates a payment intent; the amount, currency and idempotency key leave this file for Stripe",
    },
    exposure: null,
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
      containments: [],
      why: "the package name and release workflow claim @antelopejs/interface-stripe on npm",
    },
  },
  interface: {
    provide(api) {
      // SAFETY: the hook calls reach only paymentIntents.create, retrieve, update and charges.create, the methods hookClient implements.
      api.internal.SetClient(hookClient as never);
    },
    calls: {
      ".:GetClient": { call: async (api) => Object.keys(await api.GetClient()).sort().join(","), expect: "charges,paymentIntents" },
      ".:InitializePayment": {
        call: async (api) => {
          const created = await api.InitializePayment("order-1", { amount: 2500, currency: "usd", metadata: { k: "v" } });
          return created.metadata;
        },
        expect: { k: "v", payload: "order-1" },
      },
      ".:WaitForPayment": { call: async (api) => (await api.WaitForPayment("pi_done")).id, expect: "pi_done" },
      ".:CompletePayment": {
        // SAFETY: CompletePayment reads only id and status from the source.
        call: async (api) => (await api.CompletePayment("pi_1", { id: "src_1", status: "chargeable" } as never), "completed"),
        expect: "completed",
      },
      ".:WatchAllPayments": { call: async (api) => (api.WatchAllPayments(() => undefined), "registered"), expect: "registered" },
      ".:WatchPayment": { call: async (api) => (api.WatchPayment("pi_never", () => undefined), "registered"), expect: "registered" },
    },
    providerSide: {
      ".:internal.SetClient": "the stripe module calls it once its Stripe client is configured; consumers only call GetClient",
      ".:internal.UnsetClient": "the stripe module calls it when it stops; consumers never do",
      ".:internal.intentChanges": "the stripe module emits it when a webhook reports a payment intent change; consumers watch through WatchPayment and WatchAllPayments",
    },
  },
  journeys: {
    "initialize-payment": scenario(
      "InitializePayment stores the order id in metadata.payload, keeps other metadata and passes the request options on",
      INITIALIZE_BODY,
      '{"metadata":{"cart":"c1","payload":"order-7"},"plainMetadata":{"payload":"order-8"},"calls":[["paymentIntents.create",{"amount":2500,"currency":"usd","metadata":{"cart":"c1","payload":"order-7"}},{"idempotencyKey":"k1"}],["paymentIntents.create",{"amount":100,"currency":"eur","metadata":{"payload":"order-8"}},null]]}',
    ),
    "complete-payment": scenario(
      "CompletePayment refuses an unchargeable source untouched, charges the intent's amount with the payload as idempotency key, and records the charge",
      COMPLETE_BODY,
      '{"notChargeable":"Source is not in chargeable state","callsAfterRefusal":0,"calls":[["paymentIntents.retrieve","pi_a"],["charges.create",{"source":"src_1","amount":4200,"currency":"eur","metadata":{"paymentIntentId":"pi_a"}},{"idempotencyKey":"order-9"}],["paymentIntents.update","pi_a",{"metadata":{"charge":"ch_1"}}],["paymentIntents.retrieve","pi_b"],["charges.create",{"source":"src_2","amount":10,"currency":"usd","metadata":{"paymentIntentId":"pi_b"}},{"idempotencyKey":"pi_b"}],["paymentIntents.update","pi_b",{"metadata":{"charge":"ch_1"}}]]}',
    ),
    "payment-types": declared("GetClient, InitializePayment and CompletePayment have the documented signatures", PAYMENT_TYPES),
    "wait-for-payment": scenario(
      "WaitForPayment returns a paid intent, throws a canceled intent's reason, and settles a pending one on its terminal event through one shared promise",
      WAIT_BODY,
      '{"ok":"pi_ok","canceled":"duplicate","same":true,"settled":"pi_wait","failed":"abandoned","retrieves":5}',
    ),
    "wait-types": declared("WaitForPayment has the documented signature", AWAIT_TYPES),
    "watch-payments": scenario(
      "WatchAllPayments sees every change (only local ones with onlyLocal), WatchPayment sees its intent until it is terminal",
      WATCH_BODY,
      '{"all":[["order-1","processing",true],["order-1","processing",false],["order-1","succeeded",true],[null,"processing",true]],"local":[["order-1","processing"],["order-1","succeeded"],[null,"processing"]],"one":[["order-1","processing",true],["order-1","processing",false],["order-1","succeeded",true]]}',
    ),
    "watcher-types": declared("the watcher functions and IntentChangeContext have the documented signatures", WATCHER_TYPES),
  },
};

export default config;
