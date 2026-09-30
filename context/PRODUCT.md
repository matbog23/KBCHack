# Product Sense

Opinionated guidance for agents building **KBC Predictive Kate**, a hackathon prototype.
Read before making UX decisions: it explains who we serve and what "good" means here.

## Why this product exists

Banks see life events in payment data long before customers ask for help. A first visit to
a gynaecologist or a notary invoice often marks a moment when a customer needs a specific
product (a child savings account, estate planning), but today the customer has to find it
on their own. Kate is the digital assistant already inside KBC Mobile, the KBC bank and
insurance super-app for Belgium. Predictive Kate makes her **proactive**: she reads the
transactions on the customer's own KBC account (card payments with their merchant category
code, transfers and direct debits with payee, IBAN and message), recognises life events,
and offers the right product at the right moment.

**The showcase is the understanding**: how an ordinary statement line becomes "a baby is on
the way". See [DETECTION.md](DETECTION.md). Everything else exists to make that visible.

This is a **hackathon demo**, not a production system. It has to tell the story convincingly
in a few minutes on a laptop, with no backend and no real customer data, and the payment data
has to be realistic enough to hold up under questions from bankers.

## Users

| Role | Who | Interface |
|------|-----|-----------|
| **Customer** (simulated) | A KBC Mobile user. Two personas ship: **Emma Claes, 28**, a young mother-to-be with €12k savings, and **Jan Vermeulen, 75**, retired with €458k at KBC. | Right: iPhone frame with the KBC Mobile home screen (from Figma) |
| **Demo operator** | The hackathon presenter driving the story live. | Left: **New transaction** form (or raw JSON). Middle: **How Kate decides** |
| **Jury / audience** | Watches all three at once and needs to see *cause* (a payment) lead to *understanding* (a recognised signal) lead to *effect* (Kate's nudge). | The whole dashboard |

## Product principles

1. **Understanding you can see.** Every Kate moment traces back to specific payments and the
   exact words or codes Kate recognised in them. Nothing unexplained appears on the phone.
2. **Precision over recall.** A GP visit must not trigger a pregnancy nudge. Generic signals
   (a doctor's MCC, a legal-services MCC) only ever *support* a specific one. A missed
   moment costs nothing, while a wrong one costs trust.
3. **Helpful, never creepy.** Kate asks and suggests ("Een kleintje op komst?"). She never
   states a sensitive conclusion as fact, never mentions a hospital to a senior, and can
   always be dismissed.
4. **Realistic data.** Payments look like they do on a Belgian statement: cards have an MCC,
   transfers and direct debits have an IBAN and a message, and IBANs pass the checksum.
5. **Deterministic demo.** The same clicks always produce the same screen: a fixed anchor
   date, no randomness, no wall clock.
6. **KBC look and feel.** The phone reads as KBC Mobile. The dashboard is allowed to look
   like a tool.

## Tone of voice

- **Phone (customer-facing): Dutch (Flemish)**, informal *je*, warm and short. This covers
  Kate's copy, flows and push notifications. Belgian product names as-is (*Groeipakket,
  startbedrag, successieplanning*).
- **Dashboard (operator-facing): English**, plain and technical where needed (MCC, IBAN,
  bank transaction code).
- Amounts are formatted `nl-BE` (`€ 1.350`). Tax figures are always labelled *indicatief /
  indicative*.
- Kate card pattern: **eyebrow** (*Moment · Nieuw kindje*) → **title** → **one-line why** →
  **one yes-CTA**.

## Core user journeys

1. **New child (Emma).** A **Gynaecologist** card payment → *"Een kleintje op komst?"*. A
   **Maternity bill** transfer or the **Birth grant** (Groeipakket) → *"Proficiat!"*, high
   priority once two signals are seen. **Ja, open een rekening** opens the child-account flow,
   and the new account appears in Emma's carousel. A later **Childcare** direct debit →
   *add the child to hospitalisation insurance*. A **GP visit** proves precision: same MCC,
   no nudge.
2. **Estate planning (Jan).** Nothing on age and wealth alone. A **Hospital bill** or a
   **Notary · estate** payment → *"Regel vandaag wat je later wil doorgeven."* with an
   indicative inheritance-tax figure. **Ja, bekijk mijn opties** opens the gift simulator and
   books an expert call.
3. **Other moments.** **Notary · home** (a purchase deposit) → home-loan simulator.
   **Contractor** ≥ €1,000 → update home insurance and look at a green renovation loan.
4. **Reset / switch persona** returns everything to a clean, deterministic start.

Step-by-step checks for each journey are in [TEST-SCENARIOS.md](TEST-SCENARIOS.md).

## Feature scope (v1 must-haves)

- A three-column dashboard: the transaction composer (form with payment type: card /
  transfer / direct debit / money in, plus a raw Berlin Group JSON tab), the reasoning panel,
  and the phone.
- Phone: KBC home screen, balances, recent payments, push notification, Kate cards under
  *Voor jou*, the "Waarom zie ik dit?" sheet with evidence, and the child-account and estate
  flows.
- Engine: payment recognition (7 markers) plus 5 moments (new child, childcare insurance,
  estate planning, home purchase, renovation), all covered by Vitest.

## What this product is NOT

- **Not a PSD2 client.** Kate reads KBC's *own* customers' transactions. We only borrow the
  Berlin Group format. Data from other banks' accounts linked via PSD2 may only be used for
  the service the customer asked for (PSD2 Art. 67(2)(f)), so it is out of scope for nudges.
- **Not a backend.** There are no databases, API routes or server-side persistence of
  transactions.
- **Not ML.** Explicit, tested rules only. Don't add models, embeddings or LLM calls to the
  detection path.
- **Not a time simulator.** Kate reacts to payments as they are booked. There is no time
  machine and no balance projection.
- **Not a real product flow.** The flows end in a confirmation. Nothing is actually opened
  or sold.
- **Not multi-user or authenticated.** There is no login, and the personas are fictional.
- **Not financial or tax advice.** The inheritance tax figure is an indicative estimate.
