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
   (12 months) and assets into a moment on the phone.

The middle column, **How Kate decides**, shows per moment whether the customer qualifies,
which signals are met, and what the last payment was recognised as. The right column is the
KBC Mobile home screen (from Figma), driven by the live ledger.

## Demo script

**Scenario 1: young mum (Emma, 28).** Pay **GP visit** first: nothing happens (same doctor's
MCC, no pregnancy signal). Pay **Gynaecologist**: *"Een kleintje op komst?"*. Pay the
**Maternity bill** or the **Birth grant**: *"Proficiat! Begin vandaag te sparen voor je
kindje."* Tap **Ja, open een rekening** and a new account for the baby appears in Emma's
carousel. After that, a **Childcare** direct debit leads to the follow-up: insure the child.

**Scenario 2: elderly customer (Jan, 75).** Jan has given consent to estate-planning outreach
and declared an interest, so switching to him raises the estate moment at medium priority.
Pay **Notary · estate**, **Lawyer** or **Life insurance**: it escalates to high priority, with
that payment as evidence. Pay **Hospital bill**: nothing changes, because Jan gave no
separate health-signal consent. **Ja, bekijk mijn opties** opens a simulator (heirs, gift
today → inheritance tax saved), then books a call with an expert.

Successieplanning uses a fixed, hand-set demo score, **not a trained ML model**. Five binary
inputs contribute to the score: age >= 65, checking plus savings >= EUR 250,000, a booked
notary (not for a purchase), lawyer or life-insurance debit in the past 12 months (hospital only
with explicit health-signal consent), savings growth >= EUR 25,000 versus a year-old balance,
and customer-declared interest. The score is
`-2.4 + 0.6*age + 0.9*assets + 0.8*payment + 0.5*growth + 0.9*interest`; Kate shows the
suggestion when `1 / (1 + exp(-score)) >= 0.45` and estate outreach consent is present. Missing
annual balance or interest is treated as absent, not guessed. None of these payments proves a
customer needs advice. The calculation and inheritance-tax amount are indicative, and no
product change is automatic.

Full checklist: [context/TEST-SCENARIOS.md](context/TEST-SCENARIOS.md).

## Next steps

These are proposed production directions, not part of the client-side prototype above. In
production the model only supports a suggestion; separate consent, opt-out and contact-frequency
checks must pass before any outreach, and it never drives an automatic product, credit or
insurance decision.

### 1. Replace the hand-set rule with a trained logit model

Swap the fixed coefficients and 0.45 cutoff for a validated, calibrated logistic regression that
estimates the probability an eligible customer accepts an estate-planning conversation within 30
days **after receiving an invitation**. The same five inputs can seed feature selection, but
coefficients and threshold are learned and validated on real, lawfully obtained data rather than
chosen by hand.

Watch for two kinds of drift:

- **Data drift** — the input distribution shifts while the target relationship holds. Example:
  inflation pushes many more customers above the EUR 250,000 asset threshold, so the `assets`
  feature fires far more often than at training time. Address it by monitoring feature
  distributions and missing-value rates against a training baseline and alerting on material
  shifts.
- **Concept drift** — the same inputs map to a different outcome. Example: a change in Flemish
  inheritance-tax rules makes estate planning more attractive, so customers with the same score
  accept far more often than the model predicts. Address it by monitoring calibration and
  acceptance per score band after the outcome window closes, then recalibrating or retraining.

A drift alert triggers investigation, not an automatic model change.

### 2. Add a feedback loop (and manage its bias)

For every eligible scoring opportunity, log a pseudonymous customer ID, timestamp, model and
feature versions, the permitted pre-decision feature snapshot, calibrated probability, decision
threshold, invitation assignment, delivery status and channel. Record distinct subsequent events:
dismissal, simulator open, meeting request and meeting acceptance, with timestamps and a defined
30-day outcome window. An open is not an accepted meeting; an invitation not delivered has no
observable response and must not be labelled as a rejection. Keep the mapping from events to
training labels versioned and auditable, with purpose-bound access and retention limits.

Because only invited customers can respond, training exclusively on invited customers creates
selection bias, and feeding accepted cases straight back reinforces whoever the model already
favours. Do not infer a negative label for customers who were not invited. Log assignment
probabilities so responses can be reweighted, and no individual click updates the live model.

### 3. Evaluate with a treatment-effect analysis

Measure whether inviting customers actually helps, not just whether invited customers convert.
Form two groups with comparable characteristics — one that receives estate-planning invitations
(treatment) and one that does not (control) — and compare an agreed outcome, such as accepted
meetings or a longer-term suitability measure. The difference is the estimated treatment effect.

To determine this well, assign the groups by an approved, consented randomised experiment near
the cutoff rather than comparing self-selected customers; with randomisation the groups are
comparable in both observed and unobserved traits. If full randomisation is not possible, balance
observed characteristics (for example via matching or weighting) and report residual uncertainty.
Pre-register the primary outcome and group sizes, and analyse only after the outcome window
closes, checked per relevant customer group for fairness.

### 4. Scale the model and decide when to retrain

The logit computation itself is cheap even for many customers; the heavy part is assembling the
permitted features (allowed transactions, historical balances, consent, declared interest). Make
that feature computation scalable and reproducible: compute features on a schedule, version the
definitions, and use identical definitions for training and scoring. Daily batch scoring and
batch (re)training are sufficient for periodic estate-planning outreach — no per-session online
model service is needed unless a fresh transaction must immediately trigger a suggestion. Process
customers in restartable batches, avoid duplicate invitations, and skip outreach when scoring or
a data source fails rather than acting on stale inputs.

To decide when to retrain, review: calibration and acceptance per score band, data and concept
drift signals, fairness across customer groups, treatment-effect trend, feature availability and
freshness, and the age of the current model. Retrain when a clear cause is found and a candidate
trained on recent, later data beats the incumbent on out-of-time validation without worse
customer or fairness outcomes. Promote it only after fairness and privacy review, documented
approval and a rollback plan, keeping the previous approved version available.

## Layout

- `src/psd2/berlinGroup.ts`: Berlin Group payload types, form → payload builder, parser/validator
- `src/engine/signals.ts`: step 1, what a single payment says (markers + keywords + MCCs)
- `src/engine/kateEngine.ts`: step 2, pure rules `evaluateKateRules(transactions, persona, { asOf })`
- `src/store/useKbcStore.ts`: in-memory account: booking, balances, alerts, notifications, log
- `src/config/`: seed personas, MCC catalogue, example payments
- `src/components/emulator/`: dashboard columns; `src/components/phone/`: KBC Mobile screen
- `context/`: product, architecture, detection, test scenarios and engineering docs
- `public/figma/kbc-home/`: SVG assets exported from the Figma frame
