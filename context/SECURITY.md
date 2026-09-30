# Security, privacy & compliance

Predictive Kate is a **client-side hackathon prototype** that works with **synthetic
payment data only**. The rules below keep it that way, and they describe what a production
version would have to respect so the demo never shows a pattern a bank couldn't ship.

## Data handling (prototype)

- **Synthetic data only.** Personas, IBANs, merchants and transactions in `src/config/` are
  fictional. Never import, paste or commit real customer data, real account statements,
  real IBANs or production PSD2 exports. Not even "anonymised" ones.
- **Processing stays on the client.** All transaction processing happens in the browser, in
  the Zustand store and the pure engine. No API routes, server actions, databases or
  third-party calls receive transaction data.
- **No persistence of transaction logs.** Don't add Zustand `persist`, `localStorage`,
  `sessionStorage`, IndexedDB or cookies for transactions, balances or alerts. A page
  reload wipes the simulation, and that is intended.
- **No telemetry on payment data.** Don't send transactions, alerts or persona data to
  analytics, error trackers or logging services. Don't `console.log` transaction payloads
  in committed code.
- **No external AI or enrichment services** in the detection path. MCC classification and
  rules run locally.

## GDPR and banking principles to model

Kate's UX and rules should be defensible under these, even in a demo:

- **Lawful basis and purpose limitation (GDPR Art. 5–6).** Payment data obtained through
  PSD2 is processed to provide the payment service. Using it for proactive product offers
  needs a separate basis (typically explicit opt-in consent) and must match the purpose
  stated to the customer.
- **Special category data (GDPR Art. 9).** A gynaecology payment (MCC `8011`) can reveal
  **health** data such as a pregnancy. Treat inferences from medical MCCs as special
  category: they require explicit consent, the copy must stay tentative ("Getting ready for a
  little one?"), and the inference must never be shared, stored or used for pricing or credit
  decisions.
- **Data minimisation.** Rules read only the fields they need (amount, MCC, remittance text
  pattern, age). Don't widen what the engine consumes without a reason.
- **Transparency and explainability.** Every alert carries `evidenceTransactionIds` and a
  plain-language reason. The customer must be able to see *why* Kate spoke.
- **Right to object (GDPR Art. 21) and automated decisions (Art. 22).** Nudges are
  suggestions, never automatic product changes. Dismissal must always be available and must
  be respected (`dismissAlert`). A real product would also offer a global opt-out.
- **Vulnerable customers.** Estate-planning nudges for seniors must be neutral and
  non-pressuring, and must label tax figures as *indicative* (MiFID II / IDD suitability
  applies to real investment and insurance advice).
- **Bank secrecy and PSD2 security.** A production version would process data inside KBC's
  own perimeter, under Strong Customer Authentication and PSD2 RTS rules. The prototype
  doesn't simulate authentication and must not pretend to.

## Environment variables

None are required. If any are ever added, provide a `.env.example`, never commit `.env*`,
and never expose secrets through `NEXT_PUBLIC_*`.

## Rules

- Never commit secrets, tokens or API keys.
- Never log personal or payment data (names, IBANs, amounts, remittance text) outside the
  in-memory demo UI.
- Validate God Mode input at the store boundary (sign ↔ CDI, known persona, clamped time).
- Never show stack traces or internal errors in the customer pane.
- Don't use real KBC credentials, logos or production URLs beyond the brand colours. CTAs
  are placeholder `kbc://` deep links.
- Keep dependencies minimal and mainstream. New packages need approval
  ([CONVENTIONS.md](CONVENTIONS.md#git)).
