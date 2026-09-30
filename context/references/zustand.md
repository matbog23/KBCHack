# Zustand — app cheatsheet

> Version: zustand@^5.0 | Last checked: 2026-09-30
>
> This file documents how **this app** uses Zustand. The store is the in-memory PSD2 engine.
> See [ARCHITECTURE.md](../ARCHITECTURE.md#store-srcstoreusekbcstorets).

## What / when to use

There is **one store**, `useKbcStore` (`src/store/useKbcStore.ts`). It is the simulated bank
account: persona, clock, injected transactions, dismissals, and everything derived from
them (balances, merged feed, Kate alerts).

| State kind | Tool |
|---|---|
| Simulation state shared by both panes | `useKbcStore` |
| Local component glue (hover, expanded row) | `useState` |
| Server / URL state | none in this app |

Decision rule: if the phone *and* God Mode care about it, or it changes what Kate says, it
goes in the store. Otherwise use `useState`.

## Store shape: inputs → derived

```ts
type KbcState = SimulationInputs & DerivedState & KbcActions;

// SimulationInputs — the only real state
{ personaId, monthsElapsed, injectedTransactions, dismissedAlerts }

// DerivedState — always recomputed from inputs via derive()
{ activePersona, transactions, allAlerts, activeAlerts, simulatedNow }
```

Every action follows the same pattern:

```ts
simulateTimeJump: (months) => {
  const clamped = Math.min(MAX_TIME_JUMP_MONTHS, Math.max(0, Math.round(months)));
  const state = get();
  if (clamped === state.monthsElapsed) return; // no-op: skip re-render
  set(withDerived({ ...inputsOf(state), monthsElapsed: clamped }));
},
```

To add a new piece of simulation state:

1. Add it to `SimulationInputs` and `initialInputs()`.
2. Include it in `inputsOf()`.
3. Use it in `derive()` if it affects derived values.
4. Add an action that returns `set(withDerived({ ...inputsOf(state), newField }))`.
5. Test it in `useKbcStore.test.ts`.

## Selecting

```ts
// One selector per value. Primitives and stable references need no useShallow.
const activeAlerts = useKbcStore((state) => state.activeAlerts);
const injectTransaction = useKbcStore((state) => state.injectTransaction);
const alertCount = useKbcStore((state) => state.activeAlerts.length);
```

Derived arrays are replaced wholesale on each action, so selecting them directly is safe.
If you need several values in one call, wrap the selector in `useShallow`:

```ts
import { useShallow } from "zustand/react/shallow";
const { monthsElapsed, simulatedNow } = useKbcStore(
  useShallow((state) => ({ monthsElapsed: state.monthsElapsed, simulatedNow: state.simulatedNow })),
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

it("clamps time jumps", () => {
  useKbcStore.getState().simulateTimeJump(99);
  expect(useKbcStore.getState().monthsElapsed).toBe(36);
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
  `withDerived()`.
- **Keep actions synchronous.** There's no async work, so there's nothing to await.

## Anti-patterns

```ts
// BAD: persisting payment data (see SECURITY.md)
create(persist((set) => ({ ... }), { name: "kbc", storage: createJSONStorage(() => localStorage) }));

// BAD: Kate rule logic inside an action — belongs in src/engine/kateEngine.ts
injectTransaction: (t) => { if (t.merchantCategoryCode === "8011") set({ showPamper: true }); }

// BAD: mutating state in place
state.injectedTransactions.push(tx);

// BAD: wall-clock time in derive() (breaks determinism + hydration)
const simulatedNow = new Date().toISOString();

// BAD: a second store for one pane — both panes must read the same simulation
const useGodModeStore = create(...);
```
