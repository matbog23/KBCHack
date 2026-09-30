# Zustand — app cheatsheet

> Version: zustand@^5.0 | Last checked: 2026-09-30
>
> This file documents how **this app** uses Zustand. The store is the in-memory PSD2 engine.
> See [ARCHITECTURE.md](../ARCHITECTURE.md#store-srcstoreusekbcstorets).

## What / when to use

There is **one store**, `useKbcStore` (`src/store/useKbcStore.ts`). It is the simulated bank
account: persona, booked transactions, dismissals, accounts opened through Kate, and
everything derived from them (balances, merged feed, Kate alerts, push notification).

| State kind | Tool |
|---|---|
| Simulation state shared by both panes | `useKbcStore` |
| Local component glue (hover, expanded row) | `useState` |
| Server / URL state | none in this app |

Decision rule: if the phone *and* the dashboard care about it, or it changes what Kate says, it
goes in the store. Otherwise use `useState`.

## Store shape: inputs → derived

```ts
type KbcState = SimulationInputs & DerivedState & KbcActions;

// SimulationInputs — the only real state
{ personaId, ingestedTransactions, dismissedAlerts, kateAccounts, estateAdvice }

// DerivedState — always recomputed from inputs via derive()
{ activePersona, transactions, allAlerts, activeAlerts, kateAccountBalances, simulatedNow }

// SessionState — bookkeeping for the UI
{ sequence, lastPayload, notification, log }
```

Every action builds new inputs and hands them to `commit()`, which re-derives, works out
which alerts are genuinely new, and queues a push for the first one:

```ts
requestEstateAdvice: (input) => {
  const state = get();
  const sequence = state.sequence + 1;
  commit(
    { ...inputsOf(state), estateAdvice: input },
    { sequence, lastPayload: state.lastPayload, log: state.log },
    () => ({ id: `log-${sequence}`, kind: "product", at: state.simulatedNow, summary: "…" }),
  );
},
```

To add a new piece of simulation state:

1. Add it to `SimulationInputs` and `initialInputs()`.
2. Include it in `inputsOf()`.
3. Use it in `derive()` if it affects derived values.
4. Add an action that calls `commit({ ...inputsOf(state), newField }, …)`.
5. Test it in `useKbcStore.test.ts`.

## Selecting

```ts
// One selector per value. Primitives and stable references need no useShallow.
const activeAlerts = useKbcStore((state) => state.activeAlerts);
const submitDraft = useKbcStore((state) => state.submitDraft);
const alertCount = useKbcStore((state) => state.activeAlerts.length);
```

Derived arrays are replaced wholesale on each action, so selecting them directly is safe.
If you need several values in one call, wrap the selector in `useShallow`:

```ts
import { useShallow } from "zustand/react/shallow";
const { personaId, simulatedNow } = useKbcStore(
  useShallow((state) => ({ personaId: state.personaId, simulatedNow: state.simulatedNow })),
);
```

## Testing the store

```ts
import { beforeEach, expect, it } from "vitest";
import { useKbcStore } from "@/store/useKbcStore";

beforeEach(() => {
  useKbcStore.getState().setPersona("emma");
  useKbcStore.getState().resetSimulation();
});

it("books a card payment", () => {
  const result = useKbcStore.getState().submitDraft(groceriesDraft);
  expect(result.ok).toBe(true);
  expect(useKbcStore.getState().transactions[0]?.channel).toBe("card");
});
```

Call actions through `getState()`. No React renderer is needed.

## Gotchas (v5)

- **Selectors don't shallow-compare automatically.** A selector that returns a new
  `{ a, b }` or `[a, b]` without `useShallow` re-renders on every change and can loop
  forever.
- **`useShallow` comes from `zustand/react/shallow`.** `zustand/shallow` exports the
  equality function, not the hook.
- **`create<State>()(…)` double-call is intentional** (it's there for TypeScript inference).
- **Don't `set()` derived fields by hand.** They drift from the inputs. Always go through
  `derive()` / `commit()`.
- **Keep actions synchronous.** There's no async work, so there's nothing to await.

## Anti-patterns

```ts
// BAD: persisting payment data (see SECURITY.md)
create(persist((set) => ({ ... }), { name: "kbc", storage: createJSONStorage(() => localStorage) }));

// BAD: Kate rule logic inside an action — belongs in src/engine/
submitDraft: (d) => { if (d.merchantCategoryCode === "8011") set({ showPregnancy: true }); }

// BAD: mutating state in place
state.ingestedTransactions.push(tx);

// BAD: wall-clock time in derive() (breaks determinism + hydration)
const simulatedNow = new Date().toISOString();

// BAD: a second store for one column — dashboard and phone must read the same simulation
const useDashboardStore = create(...);
```
