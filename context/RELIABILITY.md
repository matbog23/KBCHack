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

- **Every Kate rule** (`src/engine/kateEngine.test.ts`), with both a positive case (the
  signal fires the alert) and the gates (the wrong age, the wrong sign, below threshold,
  a missing MCC).
- **Seed invariants:** Emma's untouched history raises no alerts, and Jan's raises only
  `successieplanning`. If a seed change breaks this, the demo story breaks.
- **Determinism and ordering:** same input gives the same output. Also cover sort order
  (newest → priority → id) and stable alert ids.
- **Money maths:** `estimateFlemishInheritanceTax` bracket edges, rounding, and zero or
  negative inputs.
- **Store behaviour** (`src/store/useKbcStore.test.ts`): injection builds a valid PSD2
  transaction (CDI matches the sign, credits go to the persona), time-jump clamping and
  balance projection, dismissal plus resurfacing on newer evidence, and reset / persona
  switch.
- **Formatting helpers** whose output appears in the UI (`addMonths` month-end behaviour,
  signed euros).

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
  optional fields (`merchantCategoryCode`, `debtorName`) are normal PSD2 data and must be
  handled.
- Store actions ignore invalid input instead of corrupting state: an unknown alert id is a
  no-op, and time jumps are clamped to `0…MAX_TIME_JUMP_MONTHS`.
- Never show stack traces or raw transaction payloads in the customer (phone) pane. God Mode
  may show technical detail.

### Loading and feedback

- There's no network, so there are no spinners. Every God Mode action must produce an
  **immediate** visible change: a new feed row, a Kate slide-down, or an updated inspector.
- If an injection fires no rule, God Mode must say so ("no Kate signal") rather than look
  broken.
