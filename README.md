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

- `src/engine/kateEngine.ts` — pure rules: `evaluateKateRules(transactions, persona, { asOf })`
- `src/store/useKbcStore.ts` — simulated PSD2 account; balances and alerts are derived from
  persona + months elapsed + injected transactions
- `src/config/` — seed personas and God Mode injector payloads
- `src/components/mobile/` — phone mockup; `src/components/godmode/` — control panel
