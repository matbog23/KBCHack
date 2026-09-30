# Architecture

Single Next.js 15 (App Router) app. There is no backend. The "bank" is an in-memory Zustand
store that feeds a pure rule engine. Product context: [PRODUCT.md](PRODUCT.md).

## Layout

```
src/
├── app/                 # Next.js App Router: layout.tsx, page.tsx (dual-pane shell), globals.css
├── components/
│   ├── mobile/          # Left pane: PhoneFrame, MobileApp, KbcTopBar, TransactionFeed, KateInterceptor
│   ├── godmode/         # Right pane: GodModePanel (persona, injectors, time jump, inspector, reset)
│   └── ui/              # shadcn/ui primitives (button, card, badge, slider)
├── config/              # Static demo data: personas.ts (seed accounts + history), injectors.ts
├── engine/              # kateEngine.ts: pure rules, no React, no Zustand
├── store/               # useKbcStore.ts: simulated PSD2 account + derived state
├── lib/                 # format.ts (nl-BE money/dates, addMonths), utils.ts (cn)
└── types/               # psd2.ts: domain model (transactions, personas, alerts, MCCs)
```

## Data flow

```
God Mode action ──► useKbcStore action ──► SimulationInputs ──► derive() ──► DerivedState ──► phone UI
 (inject / time jump /                    (personaId, monthsElapsed,         │
  switch persona / dismiss)                injectedTransactions,             └─ evaluateKateRules(...)
                                           dismissedAlerts)
```

1. `page.tsx` is a Server Component. It renders `<MobileApp />` and `<GodModePanel />`
   side by side (stacked below `lg`).
2. Both panes are Client Components reading **one store**, `useKbcStore`. They never talk
   to each other directly.
3. Every action rebuilds the **minimal inputs** (`SimulationInputs`) and calls
   `withDerived()`, which recomputes everything else: the projected balances, the merged and
   sorted transaction list, `allAlerts`, `activeAlerts` and `simulatedNow`.
4. Derived state is **never mutated directly**. If a value can be computed from the inputs,
   compute it in `derive()`. Don't store it separately.

## PSD2 transaction model

`src/types/psd2.ts` is the source of truth. Field names follow the **Berlin Group
NextGenPSD2** `transactionDetails` object, flattened:

| Field | Type | Notes |
|-------|------|-------|
| `transactionId` | `string` | Seed: `emma-0001`; injected: `sim-<persona>-0001` |
| `bookingDate`, `valueDate` | `ISODateTime` | ISO 8601 with offset |
| `bookingStatus` | `"booked" \| "pending"` | |
| `amount` | `number` | **Signed major units**: negative means debit, positive means credit |
| `currency` | `"EUR"` | ISO 4217. The demo is EUR only |
| `creditDebitIndicator` | `"CRDT" \| "DBIT"` | Must agree with the sign of `amount` |
| `creditorName` / `creditorIban` | `string` / `IBAN?` | Payee. For credits, the account holder |
| `debtorName` / `debtorIban` | optional | Payer on credits (e.g. `FONS Groeipakket`) |
| `remittanceInformationUnstructured` | `string` | Free-text *mededeling*. Rules may regex-match it |
| `merchantCategoryCode` | `MerchantCategoryCode?` | ISO 18245. Absent on plain SEPA transfers |
| `isSimulated` | `boolean?` | `true` when injected via God Mode |

**MCCs** live in the `MCC` constant. The ones that trigger rules are `8011` (doctors /
gynaecology), `8351` (child care), `8999` (legal / notary) and `1520` (general contractors).
The rest are background spend used in seed data. `MerchantCategoryCode` accepts any string
but still autocompletes the known codes. Add new codes to `MCC` rather than hard-coding
strings.

**Money** is a JS `number` in euros. Round to cents only at derivation boundaries
(`roundCents`). Format only through `src/lib/format.ts` (`nl-BE`, `Europe/Brussels`).

## Rule engine (`src/engine/kateEngine.ts`)

- The entry point is `evaluateKateRules(transactions, persona, { asOf })`, which returns
  `KateAlert[]`.
- It is **pure and deterministic**: no `Date.now()`, no randomness, no I/O, and no imports
  from React, Zustand or `config/`. The same input always gives the same alerts in the same
  order.
- Each rule is a `KateRule = (ctx: RuleContext) => KateAlert | null` registered in
  `KATE_RULES`. To add a rule, write the function, append it to `KATE_RULES`, extend the
  `KateRuleId` union, and add tests.
- Thresholds live in `KATE_THRESHOLDS` (exported so tests and God Mode can reference them).
  Never inline a magic number in a rule.
- Alert `id` = `${ruleId}:${personaId}`. It is stable, so a rule raises at most one alert per
  persona.
- `evidenceTransactionIds` + `detectedAt` explain every alert. MCC and credit rules use the
  latest evidence booking. Balance and life-stage rules use `asOf`.
- Sort order: newest `detectedAt` first, then priority (`high` > `medium` > `low`), then id.

| Rule | Trigger | Gate | Product |
|------|---------|------|---------|
| `pamperrekening` | debit MCC `8011` | age 18–50 | Pamperrekening |
| `groeipakket-kraamgeld` | credit matching `/kraamgeld\|groeipakket\|geboortepremie/` | none | Child savings |
| `childcare-hospitalisation` | debit MCC `8351` | age 18–50 | Hospitalisation insurance |
| `home-purchase` | debit MCC `8999` | age < 65 | Home-loan simulator |
| `renovation` | debit MCC `1520` ≥ €1,000 | none | Home cover / green loan |
| `successieplanning` | MCC `8999` **or** assets ≥ €250k | age ≥ 65 | Inheritance Tax Simulator |
| `idle-savings-invest` | savings − 6 × fixed costs ≥ €2,500 | age < 65 | Investment plan |

`estimateFlemishInheritanceTax()` applies the Flemish direct-line brackets
(3% / 9% / 27% per heir share). The result is indicative only.

## Store (`src/store/useKbcStore.ts`)

- **Inputs:** `personaId`, `monthsElapsed` (0–`MAX_TIME_JUMP_MONTHS` = 36),
  `injectedTransactions`, and `dismissedAlerts` (alert id → the `detectedAt` at dismissal).
- **Actions:** `setPersona` (resets the simulation), `injectTransaction(template)`,
  `simulateTimeJump(months)` (absolute from the anchor, clamped), `dismissAlert(id)`,
  `resetSimulation()`.
- **Clock:** `simulatedNow = DEMO_ANCHOR_DATE + monthsElapsed`. Each injection is booked
  `sequence × 1 min` after `simulatedNow`, so the feed order is deterministic.
- **Balances:** checking = base + (income − fixed costs − savings contribution) × months +
  net injected amount. Savings = base + contribution × months.
- **Dismissal:** an alert stays hidden until newer evidence arrives (a later `detectedAt`),
  and then it comes back.
- **God Mode injectors** (`config/injectors.ts`) supply only a `TransactionTemplate`
  (amount, names, remittance, MCC). The store fills in the id, dates, status, currency and
  CDI. For credits it also sets the creditor to the active persona.

## Rendering and hydration

- The initial store state is computed at module load from static config and the fixed
  `DEMO_ANCHOR_DATE`. That keeps the SSR and client first renders identical. Anything
  non-deterministic in `derive()` (wall clock, `Math.random`, locale-dependent formatting)
  causes a hydration mismatch.
- Only components that read the store or use hooks are `"use client"`. `page.tsx` and
  `layout.tsx` stay Server Components.

## Styling

Tailwind 3 plus shadcn/ui (`new-york`, CSS variables). The brand tokens in
`tailwind.config.ts` are `kbc-blue` `#00A3E0`, `kbc-navy` `#002D62`, and `kbc.*` (`blue-hover`,
`blue-soft`, `navy-soft`, `gray`, `line`, `muted`). Use tokens, not raw hex or
`bg-blue-500`. Custom shadows are `shadow-phone` and `shadow-kate`, and the animation is
`animate-kate-pulse`.
