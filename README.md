<div align="center">

# 🔮 Predictive Kate

**KBC Kate spots life moments in a customer's payments and offers the right product at the right time.**

*Built for the KBC Hackathon · Next.js · Berlin Group PSD2 format · Explainable rules engine*

[Demo](#-demo) · [Problem](#-the-problem) · [Solution](#-the-solution) · [Run it](#-run-it-locally) · [Tech](#-tech-stack) · [Data & detection](#-data-analysis--detection) · [Bank value](#-what-kbc-gains) · [Next steps](#-next-steps) · [Team](#-team)

</div>

---

> [!IMPORTANT]
> **In one sentence:** Belgian families lose tens of thousands of euros because they plan too late. Parents don't start saving for a new child, and older people don't plan their estate.
> **Predictive Kate** reads the payments KBC already processes, spots the moment (a gynaecologist bill, a notary invoice) and makes Kate *proactive*.
> The customer keeps more money. KBC gets a timely, relevant conversation instead of a cold sales pitch.

---

## 🎬 Demo

<!-- To embed the video: open this README in GitHub's web editor, drag demo.mp4 in on the line below,
     and GitHub turns it into a https://github.com/user-attachments/assets/... link that plays inline. -->

https://github.com/user-attachments/assets/REPLACE-WITH-VIDEO-ID

<details>
<summary><b>🧭 What you see in the demo (3-column dashboard)</b></summary>

| Column | Who it's for | What it does |
|---|---|---|
| **New transaction** | Demo operator | Books a card payment, transfer, direct debit or incoming payment on the customer's KBC account, or takes raw Berlin Group JSON |
| **How Kate decides** | Jury | Shows, for each life moment, which checks pass and what the last payment was recognised as |
| **KBC Mobile** | Customer | The real KBC home screen (from Figma): push notification, Kate card under *Voor jou*, "Waarom zie ik dit?" evidence sheet, product flows |

</details>

---

## 💸 The problem

**People lose money because they act too late, and the bank already sees the signs.**

### For the customer

| | 👶 Young parents | 👴 Older customers |
|---|---|---|
| **Moment** | A baby is on the way | Health or legal changes, getting affairs in order |
| **What goes wrong** | Nobody opens a savings or investment account for the child. Years of compound growth are lost | No estate plan. The heirs pay the full **erfbelasting** (Flemish inheritance tax, up to **27%** per heir in the direct line) |
| **Cost (illustrative)** | €50/month from birth to 18 at 6%/yr ≈ **€19,400**, on **€10,800** paid in. Starting at age 10 instead ≈ **€6,100** | Jan, 75, €458k, 2 children: ≈ **€35,000** inheritance tax. A registered gift is taxed at **3%** |
| **Why it happens** | Busy, not aware of the options, nobody reminds them at the right time | Taboo subject, no trigger to act, advice feels expensive or far away |

### For the bank

| Pain | Effect on KBC |
|---|---|
| **Generic, badly timed campaigns** | Low conversion, and customers learn to ignore messages |
| **Wealth leaves at inheritance** | Heirs often move the money to their own bank. KBC loses assets under management |
| **The next generation is unknown** | No relationship with the child until they turn 18, when a neobank is one tap away |
| **Kate is reactive** | The assistant is already in the app but only answers questions. Its potential is unused |

---

## 💡 The solution

**Kate reads the customer's own KBC transactions, recognises a life moment and suggests one relevant product, with the evidence shown.**

```
 a payment ──►  STEP 1: what does it say?  ──►  STEP 2: is a life moment happening?  ──►  Kate nudge on the phone
               "maternity ward invoice"         "Emma, 28, maternity bill this month"     "Proficiat! Open a child account?"
```

| Life moment | Trigger (example) | Kate suggests |
|---|---|---|
| 👶 **New child** | Gynaecologist, maternity ward, Groeipakket birth grant, childcare | Child savings account |
| 🏥 **Child in care** | Childcare direct debit *after* the child account exists | Add the child to hospitalisation insurance |
| 🏛️ **Estate planning** | Age 65+, assets, notary (will/gift), legal or insurance payments | Gift simulator with indicative erfbelasting + expert call |
| 🏠 **Buying a home** | Notary purchase deposit (≥ €5,000) | Home-loan simulator |
| 🔨 **Renovating** | Building contractor ≥ €1,000 | Update home insurance + green renovation loan |

**Three principles:** *Understanding you can see* (every nudge links to its payments) · *Precision over recall* (a GP visit never triggers a baby nudge) · *Helpful, never creepy* (Kate asks, never states a sensitive conclusion as fact, and can always be dismissed).

---

## 🚀 Run it locally

> Requires **Node ≥ 20.9**. No backend, no database, no API keys. Everything runs in the browser.

```bash
npm install
npm run dev        # → http://localhost:3000
```

<details>
<summary><b>All scripts</b></summary>

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build and serve |
| `npm run verify` | Typecheck + Biome lint + Vitest, run this before pushing |
| `npm test` / `npm run test:watch` | Unit tests only |
| `npm run lint:fix` | Auto-fix lint and formatting |

</details>

<details>
<summary><b>🎭 Demo script (step by step)</b></summary>

| Persona | Action | Kate's response |
|---|---|---|
| Emma (28) | Card payment at a **gynaecologist** (MCC 8011) | *"Een kleintje op komst?"* → child account |
| Emma | Card payment at a **GP** (same MCC 8011) | Nothing. Precision over recall |
| Emma | **Groeipakket** birth grant (+€1,350) | *"Proficiat!"*, high priority (2 signals) |
| Emma | **Kinderdagverblijf** direct debit after opening the account | Add child to hospitalisation insurance |
| Emma | **Notary** purchase deposit | Home-loan simulator |
| Any | **Bouwbedrijf** payment ≥ €1,000 | Home cover review / renovation loan |
| Jan (75) | On load (€458k assets, declared interest) | Successieplanning with indicative Flemish inheritance tax |
| Jan | **Notary** (will/gift), **legal** (MCC 8111) or **insurance** (MCC 6300) | Successieplanning becomes high priority |
| Jan | **Hospital** payment (MCC 8062) | No escalation without separate health-data consent |

Full checks per journey: [`context/TEST-SCENARIOS.md`](context/TEST-SCENARIOS.md).

</details>

---

## 🧱 Tech stack

| Layer | We use | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router), React 19, TypeScript | One app, type-safe from payload to pixel |
| **State** | Zustand (in-memory ledger) | A simulated KBC current account. The demo never depends on a server |
| **UI** | Tailwind CSS 3 + shadcn/ui, Figma-exported assets | Looks like KBC Mobile |
| **Engine** | Pure TypeScript rules (`src/engine/`) | Deterministic, explainable, fully unit-tested |
| **Quality** | Vitest + Biome | `npm run verify` covers types, lint and tests |

### 🏦 PSD2 and the Berlin Group format: what it means

<details open>
<summary><b>In banking terms</b></summary>

- **PSD2** (the EU's second Payment Services Directive) forces banks to open account data and payments to licensed third parties through APIs.
- **Berlin Group NextGenPSD2** is the European API standard most banks, including KBC, use for this. It defines exactly what a transaction looks like: amount, dates, counterparty name and IBAN, the payment message (*mededeling*) and an ISO 20022 bank transaction code.
- **We use the format, not the channel.** Kate only reads KBC's **own** customers' transactions. Data from other banks pulled in via PSD2 may only be used for the service the customer asked for (PSD2 Art. 67(2)(f)), so it is not used for nudges.

**Why it matters:** a real KBC transaction feed can be plugged in without rewriting the engine. The payloads hold up when bankers ask questions.

</details>

<details>
<summary><b>How the payload is modelled</b></summary>

`src/psd2/berlinGroup.ts` models a booked entry from `GET /v1/accounts/{id}/transactions` (v1.3.x):

| Field | Notes |
|---|---|
| `transactionAmount` | `{ currency: "EUR", amount: "-65.00" }`, a signed **string** as in the spec |
| `creditorName` / `creditorAccount.iban` | Payee. IBANs must pass the **mod-97** checksum |
| `remittanceInformationUnstructured` | The *mededeling*, ≤ 140 chars |
| `bankTransactionCode` | `PMNT-CCRD-POSD` card · `PMNT-ICDT-ESCT` transfer · `PMNT-RDDT-ESDD` direct debit · `PMNT-RCDT-ESCT` money in |
| `kbcCardDetails.merchantCategoryCode` | **KBC extension.** Berlin Group account transactions have no MCC, but KBC knows it for every card it issues |

**Validation:** EUR only · debits need a creditor, credits a debtor · one invalid entry rejects the whole payload · only `booked` is read (pending card payments can still be reversed). The form and the Raw JSON tab go through the **same** parser.

</details>

---

## 🔍 Data analysis & detection

**Kate uses two explicit steps. Every decision can be traced to specific payments and the exact words that matched.**

<details open>
<summary><b>Step 1: what does this payment say?</b> (<code>src/engine/signals.ts</code>)</summary>

Kate reads **the MCC, the counterparty name and the payment message together**. An MCC describes the *shop*, not the *reason*: every doctor shares 8011, so a code alone never means "pregnant".

| Marker | Recognised when… | MCC alone enough? |
|---|---|---|
| Gynaecologist / midwife | *gynaecoloog, vroedvrouw, echografie, prenataal…* | ❌ (8011 = any doctor) |
| Maternity ward | *kraamafdeling, materniteit, bevalling…* | ❌ (8062 = any hospital) |
| Birth grant | money **in**, *Groeipakket, startbedrag, kraamgeld…*, **≥ €1,000** | n/a |
| Childcare | *kinderdagverblijf, kinderopvang, crèche…* | ✅ 8351 |
| Hospital bill | *ziekenhuis, kliniek*, AZ / UZ / ZNA… | ✅ 8062 |
| Notary | *notaris, notaire*. The message decides estate vs. purchase | ❌ (8111 = any legal) |
| Contractor | *aannemer, renovatie, warmtepomp…*, **≥ €1,000** | ✅ 1520 |

**Guard rails:** direction matters (a hospital refund is not a bill) · MCCs only count on card payments · amount floors filter noise (monthly child benefit ≠ birth grant, €300 roof fix ≠ renovation).

</details>

<details>
<summary><b>Step 2: is a life moment happening, and when do we notify?</b> (<code>src/engine/kateEngine.ts</code>)</summary>

A marker becomes a notification only if **the right person**, **recently enough**, **not already helped** and **consent** all check out.

| Moment | Who | Lookback | Priority | Stops when |
|---|---|---|---|---|
| New child | age 18–50 | 12 months | 1 signal = medium, 2+ = high | child account opened |
| Childcare → hospitalisation | has child account | 12 months | medium | covered |
| Estate planning | outreach consent | 12 months | payment signal = high | advice requested |
| Home purchase | under 65 | 6 months | medium | n/a |
| Renovation | anyone | 6 months | medium | n/a |

**Estate score (hand-set demo weights, not a trained model):**

```
score = −2.4 + 0.6·age≥65 + 0.9·assets≥€250k + 0.8·legal/notary/insurance payment
             + 0.5·savings grew ≥€25k + 0.9·declared interest
notify when  1 / (1 + e^−score) ≥ 0.45   AND   estate-outreach consent
```

Hospital payments only count with **explicit health-data consent** (GDPR Art. 9). Missing data counts as *absent*, never guessed.

**When a push is sent:** the engine re-runs over the full history after every booking. A push goes out only when an alert's *signature* (rule + evidence + priority) is new. A dismissed alert comes back only when **newer** evidence arrives.

**Explainability:** every alert carries `evidenceTransactionIds`. The phone's *"Waarom zie ik dit?"* sheet shows the payment and the matched words (*Overschrijving · herkend aan "kraamafdeling"*).

All thresholds are named constants (`KATE_THRESHOLDS`, `SIGNAL_THRESHOLDS`). Full tables: [`context/DETECTION.md`](context/DETECTION.md).

</details>

<details>
<summary><b>How we check it's right</b></summary>

- **Unit tests for every rule and marker**, including negative cases (GP visit, hospital refund, small contractor bill).
- **Deterministic engine:** no wall clock, no randomness. The same clicks give the same screen, and lookback windows are tested with explicit `asOf` dates.
- **Realistic test data:** checksum-valid Belgian IBANs, real MCCs, real ISO 20022 codes (`src/engine/testTransactions.ts`).
- **Known limits we state openly:** keywords can miss a practice named only by surname. Production would add curated payee-IBAN lists and measure precision on consented data.

</details>

---

## 📈 What KBC gains

| Benefit | How |
|---|---|
| 🎯 **Higher conversion** | One relevant offer at the moment of need, instead of broad campaigns |
| 👨‍👩‍👧 **Next-generation customers** | A child account at birth starts an 18-year relationship before any neobank gets involved |
| 🏛️ **Keeps assets in the family, and at KBC** | Estate planning and gifts keep wealth inside KBC across generations |
| 🧩 **Cross-sell across bank + insurance** | Savings, investing, hospitalisation, home and loan products all come from one signal engine. This fits KBC's bank-insurer model |
| 🤝 **Trust and loyalty** | Customers see Kate saving them money, with the evidence shown, not a hidden profile |
| ⚖️ **Compliance by design** | Explainable rules, consent gates, no automatic product/credit decisions. Ready for EU AI Act and GDPR scrutiny ([`context/GOVERNANCE.md`](context/GOVERNANCE.md)) |
| 🧠 **Better use of Kate** | Turns an existing assistant from reactive Q&A into a proactive advisor. No new app needed |

---

## 🛣️ Next steps

<details>
<summary><b>🔧 Technical</b></summary>

1. **Replace the hand-set score with a trained, calibrated logit model**: predict the chance a customer accepts an advice conversation within 30 days of an invite. Monitor **data drift** (e.g. inflation pushes more people over €250k) and **concept drift** (e.g. a tax reform changes acceptance). A drift alert starts an investigation, not an automatic change.
2. **Feedback loop with bias control**: log feature snapshot, probability, assignment and outcome events (dismiss, open, meeting). Never label a customer who wasn't invited as negative, and reweight by assignment probability.
3. **Measure real impact**: a randomised treatment/control test near the cutoff, with pre-registered outcomes and fairness checks per customer group.
4. **Scale**: scheduled, versioned feature pipelines on KBC's transaction data. Daily batch scoring is enough, and outreach is skipped when a data source fails.
5. **Better recognition**: curated payee-IBAN lists (hospitals, notaries, Groeipakket payers) on top of keywords.

</details>

<details>
<summary><b>🌍 In real life</b></summary>

- Pilot inside KBC Mobile with an opt-in group, with consent screens and a one-tap opt-out.
- Validate the Dutch copy and tone with real customers (*helpful, never creepy*).
- Hand over to real advisors: the estate flow books an actual call with a KBC expert.
- Legal and privacy review (GDPR Art. 9 for health signals, EU AI Act transparency).

</details>

<details>
<summary><b>💰 Expanding for more revenue</b></summary>

| New moment | Signal | Product |
|---|---|---|
| First job | First salary deposit | Investment plan, pension savings |
| Moving in together | Two names on rent / shared bills | Joint account, home insurance |
| Car purchase | Dealer payment, fuel pattern change | Car loan, car insurance |
| Studying | Tuition payment | Student account, kot insurance |
| Pension | Salary stops, pension starts | Wealth advice, estate planning earlier |
| Business owner | Recurring B2B income | KBC business account, cyber insurance |

Also: extend to **KBC Group markets** (CZ, SK, HU, BG) with local tax rules, and let customers **opt in** to have other banks' PSD2 data included for a full picture.

</details>

---

## 🗂️ Project structure

<details>
<summary><b>Show layout</b></summary>

```
src/
├── app/          # Next.js page: three-column dashboard
├── components/
│   ├── emulator/ # Transaction composer, persona switch, "How Kate decides"
│   ├── phone/    # KBC Mobile home screen, Kate cards, flows
│   └── ui/       # shadcn/ui primitives
├── config/       # Personas, MCC catalogue, example payments
├── psd2/         # Berlin Group payload builder + parser/validator
├── engine/       # signals.ts (step 1) + kateEngine.ts (step 2), pure and tested
├── store/        # Zustand in-memory KBC account
└── lib/          # nl-BE formatting, IBAN mod-97
context/          # Product, architecture, detection, governance, security, test docs
```

</details>

---

## 👥 Team

| | Name | Role | LinkedIn |
|---|---|---|---|
| 🧑‍💻 | Mathieu Boogaerts | *Role* | [LinkedIn](https://www.linkedin.com/in/REPLACE) |
| 🧑‍💻 | *Name* | *Role* | [LinkedIn](https://www.linkedin.com/in/REPLACE) |
| 🧑‍💻 | *Name* | *Role* | [LinkedIn](https://www.linkedin.com/in/REPLACE) |
| 🧑‍💻 | *Name* | *Role* | [LinkedIn](https://www.linkedin.com/in/REPLACE) |

---

<sub>⚠️ Hackathon prototype. Personas are fictional, nothing is actually opened or sold, and tax figures are indicative estimates, not financial or tax advice.</sub>
