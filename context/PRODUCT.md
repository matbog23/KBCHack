# Product Sense

Opinionated guidance for agents building **KBC Predictive Kate**, a hackathon prototype.
Read before making UX decisions: it explains who we serve and what "good" means here.

## Why this product exists

Banks see life events in payment data long before customers ask for help. A first visit to
a gynaecologist or a notary invoice often marks a moment when a customer needs a specific
product (a child savings account, estate planning), but today the customer has to find it
on their own. Kate is the digital assistant already inside KBC Mobile, the KBC bank and
insurance super-app for Belgium. Predictive Kate makes her **proactive**: she reads PSD2
transaction data and Merchant Category Codes (MCCs), spots life events, and nudges the
customer toward the right product at the right moment.

This is a **hackathon demo**, not a production system. It has to tell the story convincingly
in a few minutes on a laptop, with no backend and no real customer data.

## Users

| Role | Who | Interface |
|------|-----|-----------|
| **Customer** (simulated) | A KBC Mobile user. Two personas ship: **Emma Claes, 28**, a young mother-to-be with €12k savings, and **Jan Vermeulen, 75**, retired with €450k savings. | Left pane: iPhone frame running a mock KBC Mobile UI |
| **Demo operator** | The hackathon presenter driving the story live. | Right pane: the "God Mode" debug panel |
| **Jury / audience** | Watches both panes at once and needs to see *cause* (a transaction) lead to *effect* (Kate's nudge) immediately. | The whole dashboard |

## Product principles

1. **Cause and effect you can see.** Every Kate alert must trace back to evidence: the
   transaction IDs or the balance/life-stage signal that fired it. Nothing unexplained
   should appear on the phone.
2. **Helpful, never creepy.** Kate asks and suggests ("Getting ready for a little one?").
   She never states a sensitive conclusion as fact. Medical or bereavement signals are
   phrased tentatively and can always be dismissed.
3. **Deterministic demo.** The same clicks always produce the same screen. There is a fixed
   anchor date and no randomness or wall-clock time in the engine or store.
4. **Rules over magic.** Detection comes from explicit, unit-tested rules with named
   thresholds (`KATE_THRESHOLDS`), not opaque scoring. A jury member should be able to read
   a rule and understand it.
5. **KBC look and feel.** The phone pane should read as KBC Mobile: KBC Cyan `#00A3E0`,
   Navy `#002D62`, and a clean banking layout. God Mode is allowed to look like a tool.

## Tone of voice

- Language: **English** for the UI and Kate copy. Belgian product names stay in Dutch
  (*Pamperrekening*, *Successieplanning*, *Groeipakket*, *kraamgeld*). Seed remittance text
  is Dutch, because that is what real Belgian statements look like.
- Register: warm, short, second person. One idea per sentence. Amounts are formatted
  `nl-BE` (`€ 1.350`).
- Kate copy pattern: **title** (a question or a benefit) → **one-line why** (the signal she
  saw) → **one CTA** (a verb plus the product).
- Tax figures are always labelled *indicative*.

## Core user journeys

1. **Newborn / life start (Emma).** The operator injects `Dr. Peeters Gynecology` (MCC
   `8011`). Kate slides down with a *Pamperrekening* offer. The operator then injects the
   `Kraamgeld Grant` credit (+€1,350, matched on remittance text) and Kate suggests a child
   savings account. `Kinderdagverblijf` (MCC `8351`) leads to adding the child to
   hospitalisation insurance.
2. **Estate / wealth transfer (Jan).** When the persona loads, Jan's assets exceed the
   estate threshold, so *Successieplanning* appears with an indicative Flemish inheritance
   tax figure. Injecting `Notary Van Damme` (MCC `8999`) escalates the alert to high
   priority and names the notary as the signal. The CTA launches the Inheritance Tax
   Simulator.
3. **Time jump.** The operator moves the time slider (0–36 months). Balances project
   forward, and rules that depend on balances (idle savings → investment plan) fire when
   their thresholds are crossed.
4. **Reset / switch persona.** Switching persona or pressing reset returns the app to a
   clean, deterministic starting state.

## Feature scope (v1 must-haves)

- Dual-pane Next.js dashboard: phone mockup on the left, God Mode on the right. It stacks
  vertically on narrow screens.
- Phone: KBC top bar, balances, a transaction feed that marks the evidence transactions,
  and the Kate slide-down interceptor plus an insight list.
- God Mode: persona switcher, transaction injectors grouped by storyline
  (family / estate / home), a time-jump slider, an alert inspector, and reset.
- Rule engine: the Pamperrekening, kraamgeld, childcare, home purchase, renovation,
  successieplanning and idle-savings rules, all covered by Vitest.

## What this product is NOT

- **Not connected to real banking.** There are no PSD2/XS2A API calls, no OAuth/consent
  flow, and no real accounts. All data is seeded or injected in memory.
- **Not a backend.** There are no databases, API routes or server-side persistence of
  transactions.
- **Not ML.** Explicit rules only. Don't add models, embeddings or LLM calls to the
  detection path.
- **Not a real product flow.** CTAs are `kbc://` deep links shown for the story. Don't build
  the account-opening or simulator flows behind them.
- **Not multi-user or authenticated.** There is no login, and the personas are fictional.
- **Not financial or tax advice.** The inheritance tax figure is an indicative estimate for
  the demo.
