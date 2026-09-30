# Predictive Kate

Hackathon prototype for KBC Mobile: an event-driven engine that turns PSD2 transactions and
life-stage signals into proactive banking and insurance interventions.

Runs entirely client-side (Zustand in-memory ledger), so the demo never depends on a backend.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # typecheck + Biome + Vitest
```

## Demo script

| Persona | Action (God Mode) | Kate response |
| --- | --- | --- |
| Emma (28) | Inject Dr. Peeters Gynecology (MCC 8011) | Pamperrekening |
| Emma | Inject Kraamgeld Grant (+€1,350) | Child savings account |
| Emma | Inject Kinderdagverblijf (MCC 8351) | Add child to hospitalisation insurance |
| Emma | Inject Notary (MCC 8999) | Home-loan simulator |
| Any | Inject Bouwbedrijf Maes (MCC 1520) | Home cover review / renovation loan |
| Emma | Time machine → +9 months | Investment plan (savings exceed 6-month buffer) |
| Jan (75) | On load (€458k assets) | Successieplanning, with indicative Flemish inheritance tax |
| Jan | Inject Notary Van Damme (MCC 8999) | Successieplanning escalates to high priority |
| Jan | Inject Legal services (MCC 8111) or Insurance premium (MCC 6300) | Successieplanning escalates to high priority |
| Jan | Inject Hospital payment (MCC 8062) | No escalation without separate health-signal consent |

Successieplanning uses a fixed, hand-set demo score, **not a trained ML model**. Five binary
inputs contribute to the score: age >= 65, checking plus savings >= EUR 250,000, a booked
legal/notary/insurance debit in the past 12 months (hospital only with explicit health-signal
consent), savings growth >= EUR 25,000 versus a year-old balance, and customer-declared
interest. The score is `-2.4 + 0.6*age + 0.9*assets + 0.8*payment + 0.5*growth + 0.9*interest`;
Kate shows the suggestion when `1 / (1 + exp(-score)) >= 0.45` and estate outreach consent is
present. Missing annual balance or interest is treated as absent, not guessed. MCCs are merchant
categories, not bank account numbers; none of these payments proves a customer needs advice.
Jan's initial suggestion uses his declared interest, age and assets. The calculation and
inheritance-tax amount are indicative, and no product change is automatic.

## Layout

- `src/engine/kateEngine.ts` — pure rules: `evaluateKateRules(transactions, persona, { asOf })`
- `src/store/useKbcStore.ts` — simulated PSD2 account; balances and alerts are derived from
  persona + months elapsed + injected transactions
- `src/config/` — seed personas and God Mode injector payloads
- `src/components/mobile/` — phone mockup; `src/components/godmode/` — control panel
