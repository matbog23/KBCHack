# Predictive Kate

Hackathon prototype for KBC Mobile: an engine that reads the transactions on a customer's KBC
account, recognises life events (a baby on the way, estate planning) and turns them into
proactive banking and insurance suggestions from Kate.

Runs entirely client-side (Zustand in-memory ledger), so the demo never depends on a backend.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # typecheck + Biome + Vitest
```

## How it works

The left column books a transaction on the customer's KBC current account. Pick a customer, a
payment type (**card**, **transfer**, **direct debit** or **money in**), fill in amount and
counterparty, then press **Pay**, or pick an example. Card payments carry the merchant's MCC.
Transfers and direct debits carry an IBAN and a payment message, just like a real Belgian
statement. The form becomes a Berlin Group transaction payload, which is serialised, parsed,
validated, booked and read by Kate. The **Raw JSON** tab accepts a hand-written payload
(single transaction or a full `transactions.booked` response).

Kate works in two steps ([context/DETECTION.md](context/DETECTION.md)):

1. **What does this payment say?** The merchant code, the payee's name and the message are
   read together. A gynaecologist is recognised by name, not by MCC 8011, which every doctor
   shares, so a GP visit triggers nothing.
2. **Is a life moment happening?** The recognised signals are combined with age, recency
   (12 months for family, 6 for estate) and assets into a moment on the phone.

The middle column, **How Kate decides**, shows per moment whether the customer qualifies,
which signals are met, and what the last payment was recognised as. The right column is the
KBC Mobile home screen (from Figma), driven by the live ledger.

## Demo script

**Scenario 1: young mum (Emma, 28).** Pay **GP visit** first: nothing happens (same doctor's
MCC, no pregnancy signal). Pay **Gynaecologist**: *"Een kleintje op komst?"*. Pay the
**Maternity bill** or the **Birth grant**: *"Proficiat! Begin vandaag te sparen voor je
kindje."* Tap **Ja, open een rekening** and a new account for the baby appears in Emma's
carousel. After that, a **Childcare** direct debit leads to the follow-up: insure the child.

**Scenario 2: elderly customer (Jan, 75).** Nothing happens on age and €458k of assets
alone. Pay the **Hospital bill** or **Notary · estate** example: Kate raises estate planning,
without ever mentioning the hospital. **Ja, bekijk mijn opties** opens a simulator (heirs,
gift today → inheritance tax saved), then books a call with an expert.

Full checklist: [context/TEST-SCENARIOS.md](context/TEST-SCENARIOS.md).

## Layout

- `src/psd2/berlinGroup.ts`: Berlin Group payload types, form → payload builder, parser/validator
- `src/engine/signals.ts`: step 1, what a single payment says (markers + keywords + MCCs)
- `src/engine/kateEngine.ts`: step 2, pure rules `evaluateKateRules(transactions, persona, { asOf })`
- `src/store/useKbcStore.ts`: in-memory account: booking, balances, alerts, notifications, log
- `src/config/`: seed personas, MCC catalogue, example payments
- `src/components/emulator/`: dashboard columns; `src/components/phone/`: KBC Mobile screen
- `context/`: product, architecture, detection, test scenarios and engineering docs
- `public/figma/kbc-home/`: SVG assets exported from the Figma frame
