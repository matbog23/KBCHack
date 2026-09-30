# Test scenarios

What must work, and how to check it. **Automated** marks scenarios already covered by Vitest
(`npm test`). **Manual** marks ones to click through on the dashboard before a demo. **To do**
marks tests worth adding later. Detection rules: [DETECTION.md](DETECTION.md).

Every manual scenario starts from **Reset** with the named persona selected.

## A. Demo storylines (run all before presenting)

| # | Persona | Do | Expect on the phone | Expect in "How Kate decides" | Status |
|---|---|---|---|---|---|
| A1 | Emma | Nothing | No push, no Kate card | New child: *Watching*, all signals open. Estate: *Not applicable* | Automated + Manual |
| A2 | Emma | Pay **Gynaecologist** (card, MCC 8011) | Push *"Een kleintje op komst?"*, medium priority | Gynaecologist ✓. Last payment: *Gynaecologist or midwife (MCC + name)* | Automated + Manual |
| A3 | Emma | Pay **GP visit** (card, same MCC 8011) | **Nothing** | Last payment: *everyday spending · MCC 8011 Doctors* | Automated + Manual |
| A4 | Emma | Pay **Maternity bill** (transfer to AZ Sint-Jan, "kraamafdeling") | Push *"Proficiat!…"* | Maternity ward ✓ | Automated + Manual |
| A5 | Emma | A4, then **Birth grant** (money in, €1,350) | Re-notifies, now **high** priority; copy mentions *startbedrag van € 1.350* | Two signals ✓ | Partly automated + Manual |
| A6 | Emma | A4, tap **Ja, open een rekening**, finish the flow | New child account in the carousel; checking balance drops by the deposit; moment disappears | New child: *Done* | Automated + Manual |
| A7 | Emma | A6, then **Childcare** (direct debit) | New moment: *"Is je kleintje ook verzekerd?"* | n/a | Automated + Manual |
| A8 | Emma | Pay **Notary · home** (€29,500, "aankoop appartement") | *"Plannen om een woning te kopen?"* | n/a | Automated + Manual |
| A9 | Emma / Jan | Pay **Contractor** (€4,800) | *"Aan het verbouwen?"* | n/a | Automated + Manual |
| A10 | Jan | Nothing | No push, even with €458k in assets | Estate: *Watching*, assets ✓, others open | Automated + Manual |
| A11 | Jan | Pay **Hospital bill** (transfer to UZ Leuven) | Push *"Regel vandaag wat je later wil doorgeven."*, high priority. Text never says "ziekenhuis" | Hospital bill ✓ | Automated + Manual |
| A12 | Jan | Pay **Notary · estate** ("testament en schenking") | Same estate moment | Notary ✓ | Automated + Manual |
| A13 | Jan | A11, tap **Ja, bekijk mijn opties**, move heirs/gift | Tax without planning vs. with gift updates live; booking a call closes the moment | Estate: *Done* | Automated (store) + Manual (flow UI) |
| A14 | Any | Tap a Kate card's **"Waarom zie ik dit?"** | Each evidence payment shows how it was paid (*Kaartbetaling / Overschrijving / Domiciliëring*) and *herkend aan „…”* | n/a | Manual · To do: component test |

## B. Detection precision (the "does it really understand?" questions)

| # | Input | Expected | Status |
|---|---|---|---|
| B1 | Card, MCC 8011, "Huisartsenpraktijk" | no marker | Automated |
| B2 | Transfer, no MCC, message "Consultatie gynaecologie + echografie" | gynaecology (from message) | Automated |
| B3 | "Gynécologue Dr. Dubois", "Vroedvrouwenpraktijk", "Verloskunde AZ Delta" | gynaecology | Automated |
| B4 | Transfer carrying an MCC field (8351) but no childcare words | ignored: MCC only counts on cards | Automated |
| B5 | Card, MCC 8062, merchant "Kassa 3" | hospital (code alone) | Automated |
| B6 | Groeipakket **€180** monthly benefit | no birth-grant marker | Automated |
| B7 | "kraamgeld" on an **outgoing** payment | no birth-grant marker | Automated |
| B8 | Card, MCC 8111, "Advocatenkantoor" | not a notary | Automated |
| B9 | Notary, "Ereloon dossier", **€350**, Emma | no home-purchase | Automated |
| B10 | Notary, no clear message, **€25,000**, Emma | home-purchase | Automated |
| B11 | Notary "aankoop appartement", **Jan** | no estate moment | Automated |
| B12 | Notary "nalatenschap", **Emma** | no home-purchase | Automated |
| B13 | Contractor €300 "herstelling dakgoot" | no renovation | Automated |
| B14 | Hospital bill for Emma (no birth words) | no new-child moment | Automated |
| B15 | All seeded everyday payments for both personas | no markers at all | Automated |

## C. Timing, eligibility and state

| # | Scenario | Expected | Status |
|---|---|---|---|
| C1 | Gynaecologist 360 days ago vs. 370 days ago | counts vs. ignored (12-month window) | Automated |
| C2 | Hospital bill 175 vs. 185 days ago for Jan | counts vs. ignored (6-month window) | Automated |
| C3 | Family signals for a 75-year-old; estate signals for a 60-year-old | nothing | Automated |
| C4 | Refund (money in) from childcare | not a childcare payment | Automated |
| C5 | Dismiss a moment, then pay another signal for it | stays hidden until the new evidence, then returns | Automated |
| C6 | An unrelated payment after a moment | no second push for the same moment | Automated |
| C7 | Switch persona / Reset | ledger, Kate accounts, log and notifications cleared | Automated |
| C8 | Same engine input twice | identical output, input not mutated | Automated |

## D. Payload realism and validation

| # | Scenario | Expected | Status |
|---|---|---|---|
| D1 | Card payment from the form | `bankTransactionCode: PMNT-CCRD-POSD`, MCC only inside `kbcCardDetails`, generated statement line | Automated |
| D2 | Transfer out / direct debit / money in | `PMNT-ICDT-ESCT` / `PMNT-RDDT-ESDD` / `PMNT-RCDT-ESCT`, counterparty IBAN, message kept | Automated |
| D3 | Raw JSON with a top-level `merchantCategoryCode` | rejected with an explanation | Automated |
| D4 | Plain Berlin Group transaction without KBC extension (e.g. from another bank) | accepted as a transfer; detection works on name/message | Automated |
| D5 | IBAN with a wrong check digit (e.g. `BE68 7340 1234 5678`) | form and parser reject it | Automated |
| D6 | Every IBAN in personas and presets | passes mod-97 | Automated |
| D7 | Amounts `65`, `65,5`, `1.350,00`, `€ 42,17`, `2.222,22`, non-breaking space | parsed correctly; `0`, `-5`, `12.345` rejected | Automated |
| D8 | Card payment without MCC; SEPA payment without IBAN | form shows a field error, nothing is booked | Automated (validation) + Manual (UI) |
| D9 | Full `transactions.booked` response with one bad entry | whole payload rejected, error names `booked[i]` | Automated |
| D10 | Duplicate `transactionId` | rejected, ledger unchanged | Automated |
| D11 | Raw JSON tab: paste the previewed payload unchanged | books identically to the form | Manual |

## E. To add later

1. **Component tests** (needs React Testing Library + jsdom, which is a dependency change that
   needs approval): the "why" sheet renders channel + matched words (A14), and the form hides
   the MCC for transfers and the IBAN for cards.
2. **End-to-end demo run** (Playwright): A2 → A6 and A11 → A13 click-through, with a
   screenshot of each push, so every demo storyline has a regression check.
3. **Precision set:** a table of 50+ realistic Belgian statement lines (real merchant naming
   patterns, French and Dutch) with the expected marker for each, run as one parameterised
   test. This is the best evidence for the jury that detection is not tuned to our presets.
4. **Keyword false positives:** payee names containing "AZ" or "UZ" that are not hospitals,
   and "opvang" outside childcare.
5. **Hydration:** render the page on the server and client with the same store state and
   assert no mismatch warnings.
6. **Accessibility:** keyboard-only path through the payment-type picker, Pay, the push and
   the Kate sheet.
