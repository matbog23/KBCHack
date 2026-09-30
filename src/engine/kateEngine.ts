import { formatEuroRounded } from "@/lib/format";
import {
  type ISODateTime,
  type KateAlert,
  type KatePriority,
  type KateRuleId,
  MCC,
  type MerchantCategoryCode,
  type PSD2Transaction,
  type UserPersona,
} from "@/types/psd2";

/** Thresholds are exported so tests and the God Mode panel can reason about them. */
export const KATE_THRESHOLDS = {
  /** Upper age bound for family-formation signals (pregnancy, childcare). */
  familyMaxAge: 50,
  /** Age from which estate planning becomes a relevant conversation. */
  estatePlanningMinAge: 65,
  /** Total assets from which estate planning is raised without any other signal. */
  estatePlanningMinAssets: 250_000,
  /** Months of fixed costs a customer should keep liquid before investing. */
  safetyBufferMonths: 6,
  /** Savings above the safety buffer that justify an investment conversation. */
  idleSavingsMinExcess: 2_500,
  /** Smallest contractor payment that counts as a renovation signal. */
  renovationMinAmount: 1_000,
  /** Heirs assumed for the indicative inheritance-tax estimate. */
  assumedHeirs: 2,
} as const;

/** Flemish inheritance tax, direct line (children/partner), per heir. */
const FLEMISH_DIRECT_LINE_BRACKETS: ReadonlyArray<{ upTo: number; rate: number }> = [
  { upTo: 50_000, rate: 0.03 },
  { upTo: 250_000, rate: 0.09 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.27 },
];

const PRIORITY_WEIGHT: Record<KatePriority, number> = { high: 3, medium: 2, low: 1 };

const KRAAMGELD_PATTERN = /kraamgeld|groeipakket|geboortepremie|prime de naissance/i;

const EPOCH: ISODateTime = "1970-01-01T00:00:00.000Z";

export interface KateEvaluationOptions {
  /** Evaluation moment, used as detectedAt for balance/life-stage signals. */
  asOf?: ISODateTime;
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
  const sharePerHeir = estate / heirs;
  let remaining = sharePerHeir;
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

function debitsWithMcc(
  transactions: readonly PSD2Transaction[],
  mcc: MerchantCategoryCode,
): PSD2Transaction[] {
  return transactions.filter(
    (transaction) => transaction.amount < 0 && transaction.merchantCategoryCode === mcc,
  );
}

function alertId(ruleId: KateRuleId, persona: UserPersona): string {
  return `${ruleId}:${persona.id}`;
}

function evidence(transactions: readonly PSD2Transaction[]): {
  evidenceTransactionIds: string[];
  detectedAt: ISODateTime;
} {
  return {
    evidenceTransactionIds: transactions.map((transaction) => transaction.transactionId),
    detectedAt: latestBooking(transactions) ?? EPOCH,
  };
}

function isFamilyAge(persona: UserPersona): boolean {
  return persona.age >= 18 && persona.age <= KATE_THRESHOLDS.familyMaxAge;
}

const pamperrekeningRule: KateRule = ({ transactions, persona }) => {
  if (!isFamilyAge(persona)) return null;
  const visits = debitsWithMcc(transactions, MCC.DOCTORS_GYNECOLOGY);
  if (visits.length === 0) return null;
  return {
    id: alertId("pamperrekening", persona),
    ruleId: "pamperrekening",
    triggerSource: "MCC_PATTERN",
    title: "Getting ready for a little one?",
    description:
      "Kate noticed recent visits to a gynaecologist. If a baby is on the way, a KBC Pamperrekening lets you set money aside for nappies, childcare and the first years, with its own savings goal.",
    ctaText: "Open a Pamperrekening",
    actionType: "OPEN_ACCOUNT",
    productLink: "kbc://products/savings/pamperrekening",
    productLine: "bank",
    priority: "high",
    ...evidence(visits),
  };
};

const kraamgeldRule: KateRule = ({ transactions, persona }) => {
  const grants = transactions.filter(
    (transaction) =>
      transaction.amount > 0 &&
      KRAAMGELD_PATTERN.test(
        `${transaction.remittanceInformationUnstructured} ${transaction.debtorName ?? ""}`,
      ),
  );
  if (grants.length === 0) return null;
  const total = grants.reduce((sum, transaction) => sum + transaction.amount, 0);
  return {
    id: alertId("groeipakket-kraamgeld", persona),
    ruleId: "groeipakket-kraamgeld",
    triggerSource: "INCOMING_CREDIT",
    title: "Congratulations on your baby!",
    description: `Your Groeipakket birth grant of ${formatEuroRounded(total)} has arrived. Move it to a savings account in your child's name so it grows with them, separate from your day-to-day money.`,
    ctaText: "Save it for my child",
    actionType: "OPEN_ACCOUNT",
    productLink: "kbc://products/savings/child-savings",
    productLine: "bank",
    priority: "medium",
    ...evidence(grants),
  };
};

const childcareRule: KateRule = ({ transactions, persona }) => {
  if (!isFamilyAge(persona)) return null;
  const payments = debitsWithMcc(transactions, MCC.CHILD_CARE);
  if (payments.length === 0) return null;
  return {
    id: alertId("childcare-hospitalisation", persona),
    ruleId: "childcare-hospitalisation",
    triggerSource: "MCC_PATTERN",
    title: "Is your little one insured too?",
    description:
      "Your first childcare payment has gone out. Add your child to your KBC hospitalisation insurance so doctor and hospital bills are covered from day one.",
    ctaText: "Add my child",
    actionType: "INSURANCE_QUOTE",
    productLink: "kbc://products/insurance/hospitalisation?add=child",
    productLine: "insurance",
    priority: "medium",
    ...evidence(payments),
  };
};

const homePurchaseRule: KateRule = ({ transactions, persona }) => {
  if (persona.age >= KATE_THRESHOLDS.estatePlanningMinAge) return null;
  const notaryFees = debitsWithMcc(transactions, MCC.LEGAL_NOTARY);
  if (notaryFees.length === 0) return null;
  return {
    id: alertId("home-purchase", persona),
    ruleId: "home-purchase",
    triggerSource: "MCC_PATTERN",
    title: "Planning to buy a home?",
    description:
      "You paid a notary recently. If a home purchase is coming, see what you could borrow and what your monthly repayment would be, then add home insurance in the same flow.",
    ctaText: "Simulate my home loan",
    actionType: "LAUNCH_SIMULATOR",
    productLink: "kbc://simulators/home-loan",
    productLine: "bank",
    priority: "high",
    ...evidence(notaryFees),
  };
};

const renovationRule: KateRule = ({ transactions, persona }) => {
  const works = debitsWithMcc(transactions, MCC.GENERAL_CONTRACTORS).filter(
    (transaction) => Math.abs(transaction.amount) >= KATE_THRESHOLDS.renovationMinAmount,
  );
  if (works.length === 0) return null;
  const total = works.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  return {
    id: alertId("renovation", persona),
    ruleId: "renovation",
    triggerSource: "MCC_PATTERN",
    title: "Renovating? Keep your cover up to date",
    description: `You've paid ${formatEuroRounded(total)} to a contractor. Update your fire insurance to the new value of your home, and look at a green renovation loan for insulation or heat-pump work.`,
    ctaText: "Review my home cover",
    actionType: "INSURANCE_QUOTE",
    productLink: "kbc://products/insurance/home?reason=renovation",
    productLine: "insurance",
    priority: "medium",
    ...evidence(works),
  };
};

const successieplanningRule: KateRule = ({ transactions, persona, asOf }) => {
  if (persona.age < KATE_THRESHOLDS.estatePlanningMinAge) return null;
  const totalAssets = persona.checkingBalance + persona.savingsBalance;
  const notaryFees = debitsWithMcc(transactions, MCC.LEGAL_NOTARY);
  const hasNotarySignal = notaryFees.length > 0;
  if (!hasNotarySignal && totalAssets < KATE_THRESHOLDS.estatePlanningMinAssets) return null;

  const heirs = KATE_THRESHOLDS.assumedHeirs;
  const estimatedTax = estimateFlemishInheritanceTax(totalAssets, heirs);
  const lead = hasNotarySignal
    ? "Kate saw you visited a notary."
    : `Your assets at KBC total ${formatEuroRounded(totalAssets)}.`;

  return {
    id: alertId("successieplanning", persona),
    ruleId: "successieplanning",
    triggerSource: hasNotarySignal ? "MCC_PATTERN" : "LIFE_STAGE",
    title: "Plan your estate, protect your heirs",
    description: `${lead} Without planning, ${heirs} children could owe about ${formatEuroRounded(estimatedTax)} in Flemish inheritance tax (indicative estimate). See how gifts and estate planning could reduce that.`,
    ctaText: "Launch estate tax simulator",
    actionType: "LAUNCH_SIMULATOR",
    productLink: "kbc://simulators/successieplanning",
    productLine: "investment",
    priority: hasNotarySignal ? "high" : "medium",
    evidenceTransactionIds: notaryFees.map((transaction) => transaction.transactionId),
    detectedAt: hasNotarySignal ? (latestBooking(notaryFees) ?? asOf) : asOf,
  };
};

const idleSavingsRule: KateRule = ({ persona, asOf }) => {
  if (persona.age >= KATE_THRESHOLDS.estatePlanningMinAge) return null;
  const buffer = persona.monthlyFixedCosts * KATE_THRESHOLDS.safetyBufferMonths;
  const excess = persona.savingsBalance - buffer;
  if (excess < KATE_THRESHOLDS.idleSavingsMinExcess) return null;
  return {
    id: alertId("idle-savings-invest", persona),
    ruleId: "idle-savings-invest",
    triggerSource: "BALANCE_THRESHOLD",
    title: "Your savings could work harder",
    description: `You have ${formatEuroRounded(excess)} beyond a ${KATE_THRESHOLDS.safetyBufferMonths}-month safety buffer. A monthly KBC investment plan spreads your risk and starts from as little as €25 a month.`,
    ctaText: "Start an investment plan",
    actionType: "START_INVESTMENT_PLAN",
    productLink: "kbc://products/investments/investment-plan",
    productLine: "investment",
    priority: "low",
    evidenceTransactionIds: [],
    detectedAt: asOf,
  };
};

export const KATE_RULES: readonly KateRule[] = [
  pamperrekeningRule,
  kraamgeldRule,
  childcareRule,
  homePurchaseRule,
  renovationRule,
  successieplanningRule,
  idleSavingsRule,
];

/** Newest signal first; ties broken by priority, then by id for stable output. */
function compareAlerts(a: KateAlert, b: KateAlert): number {
  return (
    toTime(b.detectedAt) - toTime(a.detectedAt) ||
    PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
    a.id.localeCompare(b.id)
  );
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
  const context: RuleContext = {
    transactions,
    persona,
    asOf: options.asOf ?? latestBooking(transactions) ?? EPOCH,
  };
  return KATE_RULES.map((rule) => rule(context))
    .filter((alert): alert is KateAlert => alert !== null)
    .sort(compareAlerts);
}
