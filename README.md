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

## Layout

- `src/engine/kateEngine.ts` — pure rules: `evaluateKateRules(transactions, persona, { asOf })`
- `src/store/useKbcStore.ts` — simulated PSD2 account; balances and alerts are derived from
  persona + months elapsed + injected transactions
- `src/config/` — seed personas and God Mode injector payloads
- `src/components/mobile/` — phone mockup; `src/components/godmode/` — control panel
