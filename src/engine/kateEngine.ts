import {
  type LifeEventMarker,
  markerLabel,
  notaryPurpose,
  recogniseTransaction,
  SIGNAL_THRESHOLDS,
} from "@/engine/signals";
import { formatEuroRounded } from "@/lib/format";
import type {
  ISODateTime,
  KateAlert,
  KatePriority,
  KateRuleId,
  PSD2Transaction,
  UserPersona,
} from "@/types/psd2";

/**
 * Step 2 of Kate: combine the markers that `signals.ts` recognised in individual payments with
 * who the customer is, and decide whether a life moment is happening.
 */

/** Thresholds are exported so tests and the dashboard can reason about them. */
export const KATE_THRESHOLDS = {
  /** Age range for family-formation signals. */
  familyMinAge: 18,
  familyMaxAge: 50,
  /** Age from which estate planning becomes a relevant conversation. */
  estatePlanningMinAge: 65,
  /** Assets from which an estate conversation is worth prioritising. */
  estatePlanningMinAssets: 250_000,
  /** Heirs assumed for the indicative inheritance-tax estimate. */
  assumedHeirs: 2,
  /** How far back a family signal still counts: a pregnancy plus the first months. */
  familyLookbackDays: 365,
  /** Savings growth over 12 months that counts as an estate-planning signal. */
  estatePlanningMinSavingsGrowth: 25_000,
  /** How far back an estate payment signal still counts. */
  estatePlanningSignalMonths: 12,
  /** Minimum demo-score probability before Kate suggests estate planning. */
  estatePlanningCutoff: 0.45,
  /** Home and renovation moments are about what is happening now. */
  homeLookbackDays: 180,
} as const;

/**
 * Fixed, hand-set weights for the estate-planning demo score. This is not a trained model:
 * five binary inputs, a logistic squash, and a cutoff. See context/GOVERNANCE.md.
 */
export const ESTATE_SCORE_WEIGHTS = {
  bias: -2.4,
  age: 0.6,
  assets: 0.9,
  payment: 0.8,
  savingsGrowth: 0.5,
  interest: 0.9,
} as const;

/** Flemish inheritance tax, direct line (children/partner), per heir. */
const FLEMISH_DIRECT_LINE_BRACKETS: ReadonlyArray<{ upTo: number; rate: number }> = [
  { upTo: 50_000, rate: 0.03 },
  { upTo: 250_000, rate: 0.09 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.27 },
];

/** Flemish gift tax on a registered gift of movable assets, direct line. */
export const FLEMISH_GIFT_TAX_RATE = 0.03;

const PRIORITY_WEIGHT: Record<KatePriority, number> = { high: 3, medium: 2, low: 1 };

const DAY_MS = 86_400_000;

const EPOCH: ISODateTime = "1970-01-01T00:00:00.000Z";

export interface KateEvaluationOptions {
  /** Evaluation moment that the lookback windows count back from. Defaults to the latest booking. */
  asOf?: ISODateTime;
}

/** One observable fact Kate uses to recognise a life moment. */
export interface KateSignal {
  id: string;
  label: string;
  met: boolean;
  evidence: PSD2Transaction[];
}

export type LifeMomentId = "new-child" | "estate";

export type LifeMomentStatus = "not-eligible" | "watching" | "detected" | "handled";

/** Everything Kate considered for one life moment: shown on the dashboard as-is. */
export interface LifeMomentTrace {
  id: LifeMomentId;
  label: string;
  eligibility: { label: string; met: boolean };
  requirement: string;
  signals: KateSignal[];
  status: LifeMomentStatus;
}

interface RuleContext {
  transactions: readonly PSD2Transaction[];
  persona: UserPersona;
  asOf: ISODateTime;
}

type KateRule = (context: RuleContext) => KateAlert | null;

/** Indicative Flemish direct-line inheritance tax for an estate split equally among heirs. */
export function estimateFlemishInheritanceTax(estate: number, heirs: number): number {
  if (estate <= 0 || heirs <= 0) return 0;
  let remaining = estate / heirs;
  let lowerBound = 0;
  let taxPerHeir = 0;
  for (const bracket of FLEMISH_DIRECT_LINE_BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, bracket.upTo - lowerBound);
    taxPerHeir += slice * bracket.rate;
    remaining -= slice;
    lowerBound = bracket.upTo;
  }
  return Math.round(taxPerHeir * heirs);
}

/**
 * Indicative total tax when part of the estate is given away today as a registered gift
 * (3% gift tax) and the rest is inherited later.
 */
export function estimateTaxWithGift(estate: number, gift: number, heirs: number): number {
  const given = Math.min(Math.max(gift, 0), Math.max(estate, 0));
  return (
    Math.round(given * FLEMISH_GIFT_TAX_RATE) + estimateFlemishInheritanceTax(estate - given, heirs)
  );
}

function toTime(iso: ISODateTime): number {
  return Date.parse(iso);
}

function latestBooking(transactions: readonly PSD2Transaction[]): ISODateTime | undefined {
  let latest: PSD2Transaction | undefined;
  for (const transaction of transactions) {
    if (!latest || toTime(transaction.bookingDate) > toTime(latest.bookingDate)) {
      latest = transaction;
    }
  }
  return latest?.bookingDate;
}

/** Transactions booked no more than `days` before `asOf`. */
function within(
  transactions: readonly PSD2Transaction[],
  asOf: ISODateTime,
  days: number,
): PSD2Transaction[] {
  const from = toTime(asOf) - days * DAY_MS;
  return transactions.filter((transaction) => toTime(transaction.bookingDate) >= from);
}

function withMarker(
  transactions: readonly PSD2Transaction[],
  marker: LifeEventMarker,
): PSD2Transaction[] {
  return transactions.filter((transaction) =>
    recogniseTransaction(transaction).some((match) => match.marker === marker),
  );
}

function signal(marker: LifeEventMarker, evidence: PSD2Transaction[], label?: string): KateSignal {
  return { id: marker, label: label ?? markerLabel(marker), met: evidence.length > 0, evidence };
}

function alertId(ruleId: KateRuleId, persona: UserPersona): string {
  return `${ruleId}:${persona.id}`;
}

function fromEvidence(transactions: readonly PSD2Transaction[]): {
  evidenceTransactionIds: string[];
  detectedAt: ISODateTime;
} {
  return {
    evidenceTransactionIds: transactions.map((transaction) => transaction.transactionId),
    detectedAt: latestBooking(transactions) ?? EPOCH,
  };
}

function totalAssets(persona: UserPersona): number {
  return persona.checkingBalance + persona.savingsBalance;
}

// ─── Scenario 1: a new child ───────────────────────────────────────────────────────────────

function isFamilyAge(persona: UserPersona): boolean {
  return persona.age >= KATE_THRESHOLDS.familyMinAge && persona.age <= KATE_THRESHOLDS.familyMaxAge;
}

function familySignals(transactions: readonly PSD2Transaction[], asOf: ISODateTime) {
  const recent = within(transactions, asOf, KATE_THRESHOLDS.familyLookbackDays);
  return {
    gynaecology: signal("gynaecology", withMarker(recent, "gynaecology")),
    maternity: signal("maternity", withMarker(recent, "maternity")),
    birthGrant: signal("birth-grant", withMarker(recent, "birth-grant")),
    childcare: signal("childcare", withMarker(recent, "childcare")),
  };
}

function joinDutch(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} en ${parts[parts.length - 1]}`;
}

const newChildRule: KateRule = ({ transactions, persona, asOf }) => {
  if (!isFamilyAge(persona) || persona.ownedProducts.includes("child-account")) return null;
  const signals = familySignals(transactions, asOf);
  const met = Object.values(signals).filter((candidate) => candidate.met);
  if (met.length === 0) return null;

  const evidence = met.flatMap((candidate) => candidate.evidence);
  const isBorn = signals.maternity.met || signals.birthGrant.met || signals.childcare.met;
  const seen: string[] = [];
  if (signals.gynaecology.met) seen.push("bezoeken aan een gynaecoloog");
  if (signals.maternity.met) seen.push("een factuur van de kraamafdeling");
  if (signals.birthGrant.met) seen.push("je startbedrag van het Groeipakket");
  if (signals.childcare.met) seen.push("een eerste betaling aan de kinderopvang");
  const birthGrant = signals.birthGrant.evidence.reduce((sum, tx) => sum + tx.amount, 0);
  const onlyIncoming = met.length === 1 && signals.birthGrant.met;

  return {
    id: alertId("new-child", persona),
    ruleId: "new-child",
    triggerSource: onlyIncoming ? "INCOMING_CREDIT" : "PAYMENT_PATTERN",
    eyebrow: isBorn ? "Moment · Nieuw kindje" : "Moment · Kindje op komst",
    title: isBorn ? "Proficiat! Begin vandaag te sparen voor je kindje." : "Een kleintje op komst?",
    description: isBorn
      ? `We zagen ${joinDutch(seen)}. Open op jouw naam een rekening voor je kindje en zet er elke maand automatisch iets opzij.${birthGrant > 0 ? ` Je startbedrag van ${formatEuroRounded(birthGrant)} kan er meteen op.` : ""}`
      : "We zagen bezoeken aan een gynaecoloog. Wie nu start met € 25 per maand, heeft tegen de 18de verjaardag al € 5.400 opzij voor zijn of haar kind.",
    ctaText: "Ja, open een rekening",
    flow: "open-child-account",
    actionType: "OPEN_ACCOUNT",
    productLink: "kbc://products/savings/child-account",
    productLine: "bank",
    priority: met.length >= 2 ? "high" : "medium",
    ...fromEvidence(evidence),
  };
};

/** Follow-up once the child account exists: cover the child on the family's health insurance. */
const childcareRule: KateRule = ({ transactions, persona, asOf }) => {
  if (!isFamilyAge(persona) || !persona.ownedProducts.includes("child-account")) return null;
  const payments = familySignals(transactions, asOf).childcare.evidence;
  if (payments.length === 0) return null;
  return {
    id: alertId("childcare-hospitalisation", persona),
    ruleId: "childcare-hospitalisation",
    triggerSource: "PAYMENT_PATTERN",
    eyebrow: "Moment · Nieuw kindje",
    title: "Is je kleintje ook verzekerd?",
    description:
      "Je kindje gaat naar de opvang. Voeg het toe aan je KBC-hospitalisatieverzekering, zodat dokters- en ziekenhuiskosten vanaf dag één gedekt zijn.",
    ctaText: "Voeg mijn kind toe",
    flow: "confirm",
    actionType: "INSURANCE_QUOTE",
    productLink: "kbc://products/insurance/hospitalisation?add=child",
    productLine: "insurance",
    priority: "medium",
    ...fromEvidence(payments),
  };
};

// ─── Scenario 2: planning an estate ────────────────────────────────────────────────────────

export interface EstateScore {
  inputs: {
    age: boolean;
    assets: boolean;
    payment: boolean;
    savingsGrowth: boolean;
    interest: boolean;
  };
  score: number;
  probability: number;
  /** Booked debits in the signal window that count as estate evidence. */
  payments: PSD2Transaction[];
}

/** Booked debits in the 12 months up to (and including) `asOf`. */
function estatePaymentWindow(
  transactions: readonly PSD2Transaction[],
  asOf: ISODateTime,
): PSD2Transaction[] {
  const start = new Date(asOf);
  start.setUTCMonth(start.getUTCMonth() - KATE_THRESHOLDS.estatePlanningSignalMonths);
  return transactions.filter(
    (tx) =>
      tx.bookingStatus === "booked" &&
      tx.amount < 0 &&
      toTime(tx.bookingDate) >= start.getTime() &&
      toTime(tx.bookingDate) <= toTime(asOf),
  );
}

function flag(id: string, label: string, met: boolean): KateSignal {
  return { id, label, met, evidence: [] };
}

function estateSignals(
  transactions: readonly PSD2Transaction[],
  persona: UserPersona,
  asOf: ISODateTime,
) {
  const recent = estatePaymentWindow(transactions, asOf);
  // A notary for a purchase is about a new home, not about passing wealth on.
  const notary = withMarker(recent, "notary").filter((tx) => notaryPurpose(tx) !== "purchase");
  // Hospital bills are health data: they only count with separate, explicit consent.
  const hospital = persona.healthSignalConsent ? withMarker(recent, "hospital") : [];
  const growth =
    persona.savingsBalance12MonthsAgo !== undefined &&
    persona.savingsBalance - persona.savingsBalance12MonthsAgo >=
      KATE_THRESHOLDS.estatePlanningMinSavingsGrowth;
  return {
    notary: signal("notary", notary, "Notary (estate, gift or will)"),
    legal: signal("legal", withMarker(recent, "legal")),
    insurance: signal("insurance", withMarker(recent, "insurance")),
    hospital: signal("hospital", hospital, "Hospital bill (needs health consent)"),
    age: flag(
      "age",
      `Age ${KATE_THRESHOLDS.estatePlanningMinAge}+`,
      persona.age >= KATE_THRESHOLDS.estatePlanningMinAge,
    ),
    assets: flag(
      "assets",
      `Assets at KBC ≥ ${formatEuroRounded(KATE_THRESHOLDS.estatePlanningMinAssets)}`,
      totalAssets(persona) >= KATE_THRESHOLDS.estatePlanningMinAssets,
    ),
    savingsGrowth: flag(
      "savings-growth",
      `Savings grew ≥ ${formatEuroRounded(KATE_THRESHOLDS.estatePlanningMinSavingsGrowth)} in a year`,
      growth,
    ),
    interest: flag(
      "interest",
      "Customer declared interest",
      persona.estatePlanningInterest === true,
    ),
  };
}

/** The fixed demo score behind the estate-planning suggestion. */
export function estatePlanningScore(
  transactions: readonly PSD2Transaction[],
  persona: UserPersona,
  asOf: ISODateTime,
): EstateScore {
  const signals = estateSignals(transactions, persona, asOf);
  const payments = [
    ...new Set([
      ...signals.notary.evidence,
      ...signals.legal.evidence,
      ...signals.insurance.evidence,
      ...signals.hospital.evidence,
    ]),
  ].sort((a, b) => toTime(b.bookingDate) - toTime(a.bookingDate));
  const inputs = {
    age: signals.age.met,
    assets: signals.assets.met,
    payment: payments.length > 0,
    savingsGrowth: signals.savingsGrowth.met,
    interest: signals.interest.met,
  };
  const w = ESTATE_SCORE_WEIGHTS;
  const score =
    w.bias +
    (inputs.age ? w.age : 0) +
    (inputs.assets ? w.assets : 0) +
    (inputs.payment ? w.payment : 0) +
    (inputs.savingsGrowth ? w.savingsGrowth : 0) +
    (inputs.interest ? w.interest : 0);
  return { inputs, score, probability: 1 / (1 + Math.exp(-score)), payments };
}

const successieplanningRule: KateRule = ({ transactions, persona, asOf }) => {
  if (!persona.estateOutreachConsent) return null;
  if (persona.ownedProducts.includes("estate-advice")) return null;
  const { probability, payments } = estatePlanningScore(transactions, persona, asOf);
  if (probability < KATE_THRESHOLDS.estatePlanningCutoff) return null;

  const assets = totalAssets(persona);
  const heirs = KATE_THRESHOLDS.assumedHeirs;
  const estimatedTax = estimateFlemishInheritanceTax(assets, heirs);
  const lead = persona.estatePlanningInterest
    ? "Je gaf aan dat je interesse hebt in successieplanning."
    : "Successieplanning kan voor jouw situatie de moeite waard zijn.";
  const hasPayments = payments.length > 0;

  return {
    id: alertId("successieplanning", persona),
    ruleId: "successieplanning",
    triggerSource: hasPayments ? "PAYMENT_PATTERN" : "LIFE_STAGE",
    eyebrow: "Moment · Je nalatenschap",
    title: "Regel vandaag wat je later wil doorgeven.",
    description: `${lead} Je vermogen bij KBC bedraagt ${formatEuroRounded(assets)}. Zonder planning betalen je ${heirs} kinderen later samen ongeveer ${formatEuroRounded(estimatedTax)} erfbelasting (indicatieve schatting). Met een schenking vandaag kan dat een stuk minder.`,
    ctaText: "Ja, bekijk mijn opties",
    flow: "estate-planner",
    actionType: "LAUNCH_SIMULATOR",
    productLink: "kbc://simulators/successieplanning",
    productLine: "investment",
    priority: hasPayments ? "high" : "medium",
    evidenceTransactionIds: payments.map((tx) => tx.transactionId),
    detectedAt: latestBooking(payments) ?? asOf,
  };
};

// ─── Other moments ─────────────────────────────────────────────────────────────────────────

/** A notary payment that looks like buying a home: a telling message, or a deposit-sized sum. */
export function isHomePurchaseNotaryPayment(transaction: PSD2Transaction): boolean {
  const purpose = notaryPurpose(transaction);
  if (purpose === "purchase") return true;
  return (
    purpose === "unknown" &&
    Math.abs(transaction.amount) >= SIGNAL_THRESHOLDS.homePurchaseMinNotaryAmount
  );
}

const homePurchaseRule: KateRule = ({ transactions, persona, asOf }) => {
  if (persona.age >= KATE_THRESHOLDS.estatePlanningMinAge) return null;
  const recent = within(transactions, asOf, KATE_THRESHOLDS.homeLookbackDays);
  const notaryFees = withMarker(recent, "notary").filter(isHomePurchaseNotaryPayment);
  if (notaryFees.length === 0) return null;
  return {
    id: alertId("home-purchase", persona),
    ruleId: "home-purchase",
    triggerSource: "PAYMENT_PATTERN",
    eyebrow: "Moment · Een eigen huis",
    title: "Plannen om een woning te kopen?",
    description:
      "Je betaalde onlangs een notaris voor een aankoop. Bereken hoeveel je kunt lenen en wat je maandelijks afbetaalt, en regel meteen je woningverzekering.",
    ctaText: "Simuleer mijn woonkrediet",
    flow: "confirm",
    actionType: "LAUNCH_SIMULATOR",
    productLink: "kbc://simulators/home-loan",
    productLine: "bank",
    priority: "high",
    ...fromEvidence(notaryFees),
  };
};

const renovationRule: KateRule = ({ transactions, asOf, persona }) => {
  const recent = within(transactions, asOf, KATE_THRESHOLDS.homeLookbackDays);
  const works = withMarker(recent, "contractor");
  if (works.length === 0) return null;
  const total = works.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  return {
    id: alertId("renovation", persona),
    ruleId: "renovation",
    triggerSource: "PAYMENT_PATTERN",
    eyebrow: "Moment · Verbouwen",
    title: "Aan het verbouwen? Hou je verzekering mee.",
    description: `Je betaalde ${formatEuroRounded(total)} aan een aannemer. Pas je brandverzekering aan de nieuwe waarde van je woning aan, en bekijk een groene renovatielening voor isolatie of een warmtepomp.`,
    ctaText: "Bekijk mijn woningverzekering",
    flow: "confirm",
    actionType: "INSURANCE_QUOTE",
    productLink: "kbc://products/insurance/home?reason=renovation",
    productLine: "insurance",
    priority: "medium",
    ...fromEvidence(works),
  };
};

export const KATE_RULES: readonly KateRule[] = [
  newChildRule,
  childcareRule,
  successieplanningRule,
  homePurchaseRule,
  renovationRule,
];

/** Newest signal first; ties broken by priority, then by id for stable output. */
function compareAlerts(a: KateAlert, b: KateAlert): number {
  return (
    toTime(b.detectedAt) - toTime(a.detectedAt) ||
    PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
    a.id.localeCompare(b.id)
  );
}

function contextFor(
  transactions: readonly PSD2Transaction[],
  persona: UserPersona,
  options: KateEvaluationOptions,
): RuleContext {
  return { transactions, persona, asOf: options.asOf ?? latestBooking(transactions) ?? EPOCH };
}

/**
 * Evaluates every Kate rule against a persona's transaction history.
 * Pure: the same input always yields the same alerts, in the same order.
 */
export function evaluateKateRules(
  transactions: readonly PSD2Transaction[],
  persona: UserPersona,
  options: KateEvaluationOptions = {},
): KateAlert[] {
  const context = contextFor(transactions, persona, options);
  return KATE_RULES.map((rule) => rule(context))
    .filter((alert): alert is KateAlert => alert !== null)
    .sort(compareAlerts);
}

/** Explains, for both headline scenarios, which signals Kate has seen and what she concluded. */
export function traceLifeMoments(
  transactions: readonly PSD2Transaction[],
  persona: UserPersona,
  options: KateEvaluationOptions = {},
): LifeMomentTrace[] {
  const { asOf } = contextFor(transactions, persona, options);
  const family = familySignals(transactions, asOf);
  const familyEligible = isFamilyAge(persona);
  const familyMet = Object.values(family).some((candidate) => candidate.met);

  const estate = estateSignals(transactions, persona, asOf);
  const estateEligible = persona.estateOutreachConsent === true;
  const estateMet =
    estatePlanningScore(transactions, persona, asOf).probability >=
    KATE_THRESHOLDS.estatePlanningCutoff;

  const status = (eligible: boolean, handled: boolean, met: boolean): LifeMomentStatus => {
    if (!eligible) return "not-eligible";
    if (handled) return "handled";
    return met ? "detected" : "watching";
  };

  return [
    {
      id: "new-child",
      label: "New child",
      eligibility: {
        label: `Age ${KATE_THRESHOLDS.familyMinAge}–${KATE_THRESHOLDS.familyMaxAge}`,
        met: familyEligible,
      },
      requirement: "Any one of these in the last 12 months; two or more makes it high priority",
      signals: [family.gynaecology, family.maternity, family.birthGrant, family.childcare],
      status: status(familyEligible, persona.ownedProducts.includes("child-account"), familyMet),
    },
    {
      id: "estate",
      label: "Estate planning",
      eligibility: { label: "Consent to estate-planning outreach", met: estateEligible },
      requirement: `Fixed demo score over five inputs ≥ ${KATE_THRESHOLDS.estatePlanningCutoff * 100}%; a payment signal makes it high priority`,
      signals: [
        estate.age,
        estate.assets,
        estate.interest,
        estate.savingsGrowth,
        estate.notary,
        estate.legal,
        estate.insurance,
        estate.hospital,
      ],
      status: status(estateEligible, persona.ownedProducts.includes("estate-advice"), estateMet),
    },
  ];
}
