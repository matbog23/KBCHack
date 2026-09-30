# Architecture

A single Next.js 15 (App Router) app with no backend. The "bank" is an in-memory Zustand store
that books transactions and feeds a pure, two-step rule engine. Product context is in
[PRODUCT.md](PRODUCT.md). How Kate interprets payments is in [DETECTION.md](DETECTION.md).

## Layout

```
src/
├── app/                 # layout.tsx, page.tsx (three-column dashboard), globals.css
├── components/
│   ├── emulator/        # TransactionComposer (form + raw JSON), PersonaSwitch, KateReasoning
│   ├── phone/           # KBC Mobile home screen (from Figma): header, cash overview, accounts &
│   │   │                #   payments, "Voor jou" Kate cards, push notification, Kate sheet
│   │   └── flows/       # ChildAccountFlow, EstatePlannerFlow (full-screen in-app flows)
│   └── ui/              # shadcn/ui primitives (button, card)
├── config/              # static demo data: personas.ts, presets.ts (example payments), mcc.ts
├── psd2/                # berlinGroup.ts: payload types, form → payload builder, parser/validator
├── engine/              # signals.ts (step 1) + kateEngine.ts (step 2): pure, no React/Zustand
├── store/               # useKbcStore.ts: the simulated current account + derived state
├── lib/                 # format.ts (nl-BE money/dates), iban.ts (mod-97), utils.ts (cn)
└── types/               # psd2.ts: domain model (transactions, personas, alerts, MCCs)
```

`page.tsx` shows three columns (stacked below `xl`): **New transaction** (composer),
**How Kate decides** (reasoning trace), and the **phone**.

## Data flow

```
form draft ─► buildBerlinGroupTransaction ─► JSON round-trip ─┐
raw JSON  ────────────────────────────────────────────────────┴► parseBerlinGroupPayload
                                                                   │ validate, map to PSD2Transaction
                                                                   ▼
                                               useKbcStore.ingestPayload ─► derive()
                                                                   │  balances, merged feed,
                                                                   │  evaluateKateRules(…)
                                                                   ▼
                                  phone (push, Kate card, sheet) + KateReasoning (trace, log)
```

1. The form and the raw JSON tab take **the same path**. A form draft is built into a
   payload, serialised and parsed back, so nothing in the form bypasses validation.
2. The store keeps only **inputs** (`SimulationInputs`). Everything else is recomputed by
   `derive()` after each action.
3. The engine is re-run over the **whole** history each time. A moment is pushed to the phone
   only when its signature (rule, evidence, priority) is new.

## The payload (what a bank would really have)

`src/psd2/berlinGroup.ts` models one booked entry on a current account in the Berlin Group
NextGenPSD2 AIS shape (`GET /v1/accounts/{id}/transactions`, v1.3.x):

| Field | Notes |
|---|---|
| `transactionId`, `entryReference` | ids |
| `bookingDate`, `valueDate` | ISO **date** only (`YYYY-MM-DD`) |
| `transactionAmount` | `{ currency: "EUR", amount: "-65.00" }`: a signed **string** |
| `creditorName` / `creditorAccount.iban` | payee (for credits: the account holder) |
| `debtorName` / `debtorAccount.iban` | payer on credits |
| `remittanceInformationUnstructured` | the *mededeling*, ≤ 140 chars |
| `bankTransactionCode` | ISO 20022: `PMNT-CCRD-POSD` card, `PMNT-ICDT-ESCT` transfer out, `PMNT-ICDT-STDO` standing order, `PMNT-RDDT-ESDD` direct debit, `PMNT-RCDT-ESCT` transfer in |
| `kbcCardDetails.merchantCategoryCode` | **KBC extension, card payments only**, see below |

**Why the MCC sits in an extension.** Berlin Group account transactions have no MCC field.
The spec defines `merchantCategoryCode` only on its separate card-account transactions.
KBC does know the MCC of every card payment made with a card it issued, because the card
scheme sends it. We attach it under `kbcCardDetails`, so the rest stays standard and a
plain Berlin Group transaction (e.g. from another bank) still parses. The parser **rejects**
a top-level `merchantCategoryCode`, because no real feed would contain one.

Parser rules: EUR only; a debit needs a `creditorName` and a credit needs a `debtorName`;
IBANs must pass mod-97 (`lib/iban.ts`); the whole payload is rejected if one entry is invalid;
only `transactions.booked` is read, because pending card authorisations can still be
reversed.

## Engine model (`src/types/psd2.ts`)

`PSD2Transaction` is the parser's output. The engine never sees wire JSON:

| Field | Type | Notes |
|---|---|---|
| `amount` | `number` | signed euros: negative = debit |
| `creditDebitIndicator` | `"CRDT" \| "DBIT"` | derived from the sign |
| `channel` | `"card" \| "transfer" \| "direct-debit"` | derived from `kbcCardDetails` / bank transaction code |
| `merchantCategoryCode?` | `string` | set **only** when `channel === "card"` |
| `creditorName`, `creditorIban?`, `debtorName?`, `debtorIban?` | | IBANs formatted in groups of four |
| `remittanceInformationUnstructured` | `string` | card payments get a generated statement line |
| `bookingDate` | `ISODateTime` | booking date plus the arrival time, so the feed stays ordered |

Known MCCs are in the `MCC` constant. Add new codes there rather than as strings.

## Engine: two steps

**Step 1: `signals.ts`, `recogniseTransaction(tx)`** returns the life-event *markers* one
payment carries (gynaecology, maternity, birth-grant, childcare, hospital, notary, legal,
insurance, contractor). Each marker lists where the evidence came from (`mcc`, `counterparty`,
`remittance`) and the matched words. `notaryPurpose(tx)` classifies notary payments as
estate, purchase or unknown.

**Step 2: `kateEngine.ts`, `evaluateKateRules(transactions, persona, { asOf })`** combines
markers inside a lookback window with the customer's age, assets and owned products into
alerts. Estate planning is a consent-gated fixed demo score (`estatePlanningScore()`,
`ESTATE_SCORE_WEIGHTS`). `traceLifeMoments()` returns the same reasoning as data for the
dashboard.

Rules: `new-child`, `childcare-hospitalisation`, `successieplanning`, `home-purchase`,
`renovation`. The full rule and threshold table is in [DETECTION.md](DETECTION.md).

Engine invariants:

- **Pure and deterministic.** No `Date.now()`, randomness or I/O, and no imports from React,
  Zustand or `config/`. `asOf` defaults to the latest booking.
- **Thresholds are named constants** (`KATE_THRESHOLDS`, `SIGNAL_THRESHOLDS`). Never inline
  a number in a rule.
- **Rules read markers, not raw fields.** To add a signal, add a `MarkerDefinition` in
  `signals.ts`. To add a moment, add a rule to `KATE_RULES`, extend `KateRuleId`, and add
  tests.
- Alert `id` = `${ruleId}:${personaId}` (at most one per rule per persona).
  `evidenceTransactionIds` plus `detectedAt` (latest evidence) explain every alert.
- Sort: newest evidence first, then priority, then id.

## Store (`src/store/useKbcStore.ts`)

- **Inputs:** `personaId`, `ingestedTransactions`, `dismissedAlerts` (id → `detectedAt` at
  dismissal), `kateAccounts` (opened through Kate), `estateAdvice`.
- **Derived:** `activePersona` (checking = seed balance + booked net − money moved to Kate
  accounts; `ownedProducts` includes products opened through Kate), `transactions`
  (seed + booked, newest first), `allAlerts`, `activeAlerts`, `kateAccountBalances`,
  `simulatedNow` (= `DEMO_ANCHOR_DATE`, fixed).
- **Session:** `sequence` (ids and booking minutes), `lastPayload`, `notification`, `log`
  (last 40 events: ingested, rejected, persona, product).
- **Actions:** `setPersona`, `submitDraft`, `ingestPayload`, `dismissAlert`,
  `openChildAccount`, `requestEstateAdvice`, `clearNotification`, `resetSimulation`.
- Each booking is dated one simulated minute after the previous one, from
  `DEMO_ANCHOR_DATE`. A dismissed alert returns only when newer evidence arrives.

There is deliberately **no time simulation**. Kate reacts to payments as they are booked, and
the lookback windows are tested in the engine with explicit `asOf` dates.

## Rendering and hydration

- The initial store state is computed at module load from static config and the fixed
  anchor date, so the SSR and client first renders match. Anything non-deterministic in
  `derive()` or render (wall clock, `Math.random`, locale-less formatting) causes a hydration
  mismatch.
- Components that read the store are `"use client"`. `layout.tsx` stays a Server Component.

## Styling

Tailwind 3 plus shadcn/ui. The KBC tokens are `kbc-blue` `#00A3E0` and `kbc-navy` `#002D62`,
plus `kbc.*`. The phone uses `app-*` tokens from the Figma file and the dashboard uses
`dash-*`. Use tokens, not raw hex. Figma assets live in `public/figma/`.
