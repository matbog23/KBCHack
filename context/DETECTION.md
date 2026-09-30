# How Kate understands payments

This is the heart of Predictive Kate: turning an ordinary bank statement line into "this
customer is about to have a baby" or "this customer is getting their affairs in order". It
takes two steps, both explicit rules with no black box.

```
 one payment ──► STEP 1: what does this payment say?  ──► STEP 2: is a life moment happening? ──► Kate
                 (src/engine/signals.ts)                   (src/engine/kateEngine.ts)
                 "this looks like a maternity bill"        "Emma is 28, had a maternity bill
                                                            this month → new child"
```

## Where the data comes from

KBC sees every payment on its customers' own accounts. The demo represents each one in the
Berlin Group format, the standard KBC already uses to expose account transactions to third
parties under PSD2: amount, date, who was paid, their IBAN and the payment message. How a
payment was made determines what Kate can read:

| How it was paid | What Kate can read | Belgian examples |
|---|---|---|
| **Card** (Bancontact / debit card) | merchant name + **MCC** | supermarket, pharmacy, a doctor's card terminal |
| **Transfer** (overschrijving) | payee name, **IBAN**, **message** | hospital invoice, notary deposit, contractor |
| **Direct debit** (domiciliëring) | creditor name, **IBAN**, **message** | childcare, energy, insurance |
| **Money in** | payer name, **IBAN**, **message** | salary, pension, Groeipakket birth grant |

**What is an MCC?** A Merchant Category Code is a four-digit number the card network gives
each *shop*, describing what kind of business it is: 5411 is a supermarket, 8062 a hospital.
KBC receives it because it issued the customer's card. Two important limits:

1. **Only card payments have one.** Transfers and direct debits (how most bills are paid in
   Belgium) never do.
2. **It describes the shop, not the reason for the visit.** Every doctor shares code 8011, so a
   GP and a gynaecologist look identical by code. Code 8011 alone therefore never tells Kate
   someone is pregnant.

That is why Kate reads the **MCC, the counterparty's name and the payment message together**.

## Step 1: what does this payment say?

Every booked payment is checked against nine *markers*. Most everyday payments match none.

| Marker | Recognised when… | Code alone enough? |
|---|---|---|
| **Gynaecologist or midwife** | name or message contains *gynaecoloog/gynécologue, vroedvrouw, verloskunde, echografie, prenataal…* | No: 8011 covers every doctor, it only adds confidence |
| **Maternity ward** | *kraam(afdeling), materniteit, bevalling, maternité…* | No: 8062 is any hospital |
| **Birth grant** | money **in**, message/payer mentions *Groeipakket, startbedrag, kraamgeld, geboortepremie…*, and **≥ €1,000** | n/a (it's a transfer) |
| **Childcare** | *kinderdagverblijf, kinderopvang, crèche, onthaalouder…* | Yes: 8351 is only childcare |
| **Hospital bill** | *ziekenhuis, kliniek, hôpital*, or a hospital acronym (*AZ, UZ, ZNA, GZA, CHU…*) | Yes: 8062 |
| **Notary** | *notaris, notariskantoor, notaire* | No: 8111 is any legal service |
| **Lawyer** | *advocaat, advocatenkantoor, juridisch, rechtsbijstand, avocat* | Yes: 8111 legal services |
| **Life or funeral insurance** | *levensverzekering, overlijdens-/uitvaartverzekering, tak 21/23, assurance-vie* | Yes: 6300 insurance |
| **Building contractor** | *aannemer, bouwbedrijf, renovatie, dakwerken, isolatie, warmtepomp…* and **≥ €1,000** | Yes: 1520, still ≥ €1,000 |

Extra rules that keep it honest:

- **Direction matters.** A birth grant must be money in. Everything else must be money out, so
  a refund from a hospital is not a hospital bill.
- **An MCC only counts on a card payment.** If one shows up on a transfer, it's ignored.
- **Amounts filter noise.** The one-off birth grant is well above €1,000, while the monthly
  child benefit is a few hundred at most. A €300 roof repair is not a renovation.
- **Notary purpose.** Kate reads the notary payment's message: *testament, schenking,
  nalatenschap, erfenis* → estate; *aankoop, compromis, woning, appartement, krediet* → buying
  a home. With no clear message, a sum of **€5,000 or more** is read as a purchase deposit.

## Step 2: is a life moment happening?

Markers become a moment only for the right person, recently enough, and if the customer
hasn't already been helped.

### New child → child savings account (Emma, 28)

| Check | Rule |
|---|---|
| Who | age **18–50** |
| Signals | gynaecologist · maternity ward · birth grant · childcare: **any one** is enough |
| Recent | within the last **12 months** (a pregnancy plus the first months) |
| Priority | 1 signal = medium, **2 or more = high** |
| Wording | only a gynaecologist → *"Een kleintje op komst?"*; any of the others → *"Proficiat!"* |
| Stops when | the customer opened the child account. A childcare payment *after* that leads to the follow-up: add the child to hospitalisation insurance |

### Estate planning → inheritance-tax simulator (Jan, 75)

Estate planning is a consent-gated **fixed demo score**, not a trained model (see
[GOVERNANCE.md](GOVERNANCE.md)).

| Check | Rule |
|---|---|
| Gate | the customer gave **estate-planning outreach consent**. Without it, nothing |
| Five inputs | age ≥ **65** (+0.6) · assets at KBC ≥ **€250,000** (+0.9) · a payment signal (+0.8) · savings grew ≥ **€25,000** in a year (+0.5) · declared interest (+0.9) |
| Score | `-2.4 + sum`, squashed with `1 / (1 + e^-score)`. Kate speaks at **≥ 45%** |
| Payment signals | booked debits in the last **12 months**: notary about a will, gift or inheritance (**not** a purchase), lawyer, life or funeral insurance. Hospital bills **only** with separate health-signal consent |
| Priority | a payment signal = high, otherwise medium |
| Jan in the demo | consent + interest + age + assets = exactly 50% → medium on load. A notary, lawyer or insurance payment → high. A hospital bill changes nothing (no health consent) |
| Tax figure | Flemish direct-line brackets 3% / 9% / 27% per heir, 2 heirs assumed, labelled *indicative* |
| Tone | the customer-facing text never mentions the hospital |

### Other moments

| Moment | Rule |
|---|---|
| **Buying a home** → home-loan simulator | under 65, a notary payment for a purchase (by message, or ≥ €5,000) in the last 6 months |
| **Renovating** → update home insurance, green loan | a contractor payment ≥ €1,000 in the last 6 months |

## Explaining every decision

Every alert carries the IDs of the payments that caused it. The phone's *"Waarom zie ik
dit?"* sheet shows each one with how it was paid and the exact words Kate recognised
(*Overschrijving · herkend aan „kraamafdeling”*). The dashboard's **How Kate decides**
panel shows, per moment, which checks passed. For the last payment it shows what it was
recognised as, and why when it wasn't (*"everyday spending · MCC 8011 Doctors"*).

## All thresholds in one place

| Threshold | Value | Constant |
|---|---|---|
| Family age | 18–50 | `KATE_THRESHOLDS.familyMinAge/MaxAge` |
| Estate-planning age | 65+ | `KATE_THRESHOLDS.estatePlanningMinAge` |
| Assets input of the estate score | €250,000 | `KATE_THRESHOLDS.estatePlanningMinAssets` |
| Heirs assumed in the tax estimate | 2 | `KATE_THRESHOLDS.assumedHeirs` |
| Family lookback | 365 days | `KATE_THRESHOLDS.familyLookbackDays` |
| Estate payment window | 12 months | `KATE_THRESHOLDS.estatePlanningSignalMonths` |
| Estate savings growth | €25,000 | `KATE_THRESHOLDS.estatePlanningMinSavingsGrowth` |
| Estate score cutoff | 45% | `KATE_THRESHOLDS.estatePlanningCutoff` (weights: `ESTATE_SCORE_WEIGHTS`) |
| Home / renovation lookback | 180 days | `KATE_THRESHOLDS.homeLookbackDays` |
| Birth grant minimum | €1,000 | `SIGNAL_THRESHOLDS.birthGrantMinAmount` |
| Renovation minimum | €1,000 | `SIGNAL_THRESHOLDS.renovationMinAmount` |
| Notary deposit that means "purchase" | €5,000 | `SIGNAL_THRESHOLDS.homePurchaseMinNotaryAmount` |

The values are demo choices, meant to be tuned with real data and not treated as facts about
Belgian payments. The keyword lists live next to each marker in `src/engine/signals.ts`.

## Known limits (say them before the jury does)

- **Keywords can miss or misfire.** A gynaecologist whose practice name is only a surname,
  with no message, is invisible, and an unrelated "AZ" in a name could look like a hospital.
  A production version would add a curated list of known payee IBANs (hospitals, notaries,
  Groeipakket payers) and measure precision on real, consented data.
- **Health inferences are sensitive data** under GDPR Article 9. See [SECURITY.md](SECURITY.md).
  They need explicit consent, tentative wording and a one-tap opt-out.
- **Pending card payments are ignored** until booked, because they can still be reversed.
