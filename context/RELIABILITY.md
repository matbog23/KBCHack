# Reliability

Testing and error-handling baseline for Predictive Kate.

## Testing strategy

### Stack

| Scope | Runner | Environment | Config |
|-------|--------|-------------|--------|
| Engine, store, lib | Vitest | `node` (no DOM) | [vitest.config.ts](../vitest.config.ts) |

- Tests match `src/**/*.test.ts`. `globals: false`, so import `describe` / `it` / `expect`
  from `vitest` explicitly.
- The `@/` alias is mirrored in `vitest.config.ts`. Keep it in sync with `tsconfig.json`.
- There are no component tests and no coverage setup. Adding React Testing Library, jsdom or
  coverage is a dependency plus config change, so it needs approval first.

### What to test

The full scenario list, with what is automated and what is still manual, is in
[TEST-SCENARIOS.md](TEST-SCENARIOS.md).

- **Every marker** (`src/engine/signals.test.ts`): what it recognises, and above all what it
  must *not* recognise (a GP with MCC 8011, the monthly child benefit, a legal-services MCC
  without the word "notaris").
- **Every Kate rule** (`src/engine/kateEngine.test.ts`), with both a positive case and the
  gates: wrong age, wrong direction, below threshold, outside the lookback window, product
  already owned.
- **Seed invariants:** neither persona's untouched history raises anything, and no seeded
  payment carries a marker. If a seed change breaks this, the demo story breaks.
- **Determinism and ordering:** same input gives the same output. Also cover sort order
  (newest → priority → id) and stable alert ids.
- **Money maths:** `estimateFlemishInheritanceTax` bracket edges, rounding, and zero or
  negative inputs.
- **Payload realism** (`src/psd2/berlinGroup.test.ts`, `src/lib/iban.test.ts`): each payment
  type gets its bank transaction code, the MCC appears only in `kbcCardDetails`, IBANs pass
  mod-97, and malformed payloads are rejected with readable reasons.
- **Store behaviour** (`src/store/useKbcStore.test.ts`): a booking builds a valid transaction
  (CDI matches the sign, credits go to the persona), push only on genuinely new evidence,
  dismissal plus resurfacing, product flows, and reset / persona switch.
- **Formatting helpers** whose output appears in the UI (signed euros, `nl-BE` amounts).

### What NOT to test

- CSS / visual styling, and Tailwind classes.
- shadcn/ui primitives and third-party internals (Next, Zustand, Radix).
- Static components with no logic.

### Conventions

- Put test files next to the file they test: `<file>.test.ts`.
- Build transactions with a small factory (`transaction(overrides)`) and override only the
  fields the test cares about.
- Reference `KATE_THRESHOLDS` and `MCC` in tests instead of repeating magic numbers.
- Reset the store between store tests (`useKbcStore.getState().resetSimulation()` or
  `setPersona`). Tests must not depend on execution order.
- Use fixed ISO dates only. Never `new Date()` without an argument, and never `Date.now()`.

### Running tests

```sh
npm test              # vitest run
npm run test:watch    # vitest (watch)
npm run verify        # typecheck + Biome + Vitest: the gate before every commit
```

## Error handling

### Error boundaries

- Use one root `app/error.tsx` (it must be `"use client"`; it doesn't exist yet, so add it
  before the demo) so a render error in either pane shows a recoverable message instead of
  a blank dashboard during a live demo.
- Don't wrap individual components in boundaries.

### Errors

- Handle errors gracefully and **never silently swallow them**.
- Engine rules return `null` for "no signal". They never throw on unexpected data. Missing
  optional fields (`merchantCategoryCode` on transfers, `debtorName` on debits) are normal
  and must be handled.
- Store actions ignore invalid input instead of corrupting state: an unknown alert id is a
  no-op, and a rejected payload leaves the ledger untouched and is logged.
- Never show stack traces or raw transaction payloads in the customer (phone) pane. The
  dashboard may show technical detail.

### Loading and feedback

- There's no network. The only delay is the short "Booking…" pause, so the payment visibly
  travels. Every booking must then produce an immediate visible change: a new payment row,
  a push, or an updated reasoning panel.
- If a payment raises no moment, the dashboard must say so ("no Kate rule matched",
  "everyday spending · MCC …") rather than look broken.
