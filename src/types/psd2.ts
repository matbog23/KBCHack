/**
 * Domain model for Predictive Kate.
 *
 * Transaction fields follow the Berlin Group NextGenPSD2 "transactionDetails" naming
 * (bookingDate, creditorName, remittanceInformationUnstructured, merchantCategoryCode…),
 * flattened for in-memory use. Amounts are signed: negative = debit, positive = credit.
 */

/** ISO 8601 date-time string, e.g. "2026-09-30T09:15:00+02:00". */
export type ISODateTime = string;

/** ISO 4217 currency code. The demo only books in EUR. */
export type CurrencyCode = "EUR";

/** Belgian IBAN, formatted in groups of four, e.g. "BE68 7340 1234 5678". */
export type IBAN = string;

/** ISO 18245 Merchant Category Codes that Kate's rules react to. */
export const MCC = {
  DOCTORS_GYNECOLOGY: "8011",
  LEGAL_NOTARY: "8999",
  CHILD_CARE: "8351",
  GENERAL_CONTRACTORS: "1520",
  GROCERY: "5411",
  EATING_PLACES: "5812",
  FUEL: "5541",
  UTILITIES: "4900",
  PHARMACY: "5912",
  TRANSIT: "4111",
  STREAMING: "4899",
  BOOKSTORES: "5942",
  GOVERNMENT_SERVICES: "9399",
} as const;

export type KnownMerchantCategoryCode = (typeof MCC)[keyof typeof MCC];

/** Any 4-digit MCC; known codes keep autocomplete while unknown codes stay valid. */
export type MerchantCategoryCode = KnownMerchantCategoryCode | (string & {});

/** Berlin Group booking status. */
export type BookingStatus = "booked" | "pending";

/** Berlin Group / ISO 20022 credit-debit indicator. */
export type CreditDebitIndicator = "CRDT" | "DBIT";

export interface PSD2Transaction {
  /** Unique ASPSP transaction identifier. */
  transactionId: string;
  /** Moment the transaction was booked on the account. */
  bookingDate: ISODateTime;
  /** Moment the funds became (un)available. */
  valueDate: ISODateTime;
  bookingStatus: BookingStatus;
  /** Signed amount in major units: negative = money out, positive = money in. */
  amount: number;
  currency: CurrencyCode;
  creditDebitIndicator: CreditDebitIndicator;
  /** Payee (for debits) or our own account holder (for credits). */
  creditorName: string;
  creditorIban?: IBAN;
  /** Payer (for credits). */
  debtorName?: string;
  debtorIban?: IBAN;
  /** Free-text remittance information ("mededeling"). */
  remittanceInformationUnstructured: string;
  /** ISO 18245 merchant category code; absent for plain SEPA transfers. */
  merchantCategoryCode?: MerchantCategoryCode;
  /** True when the transaction was injected via God Mode rather than seeded. */
  isSimulated?: boolean;
}

export type PersonaId = "emma" | "jan";

export type LifeStage =
  | "starter"
  | "young-family"
  | "established-family"
  | "pre-retirement"
  | "retired";

export interface UserPersona {
  id: PersonaId;
  name: string;
  age: number;
  /** Current balance of the KBC Plus Account (zichtrekening). */
  checkingBalance: number;
  /** Current balance of the KBC savings account (spaarrekening). */
  savingsBalance: number;
  lifeStage: LifeStage;
  /** One-line description shown in the persona selector. */
  tagline: string;
  checkingIban: IBAN;
  savingsIban: IBAN;
  /** Net amount that lands on the savings account each month. */
  monthlySavingsContribution: number;
  /** Net monthly income (salary or pension) credited to checking. */
  monthlyNetIncome: number;
  /** Average monthly spend debited from checking. */
  monthlyFixedCosts: number;
}

export type KateTriggerSource =
  | "MCC_PATTERN"
  | "INCOMING_CREDIT"
  | "LIFE_STAGE"
  | "BALANCE_THRESHOLD";

export type KateActionType =
  | "OPEN_ACCOUNT"
  | "LAUNCH_SIMULATOR"
  | "INSURANCE_QUOTE"
  | "START_INVESTMENT_PLAN"
  | "BOOK_ADVISOR";

export type KateProductLine = "bank" | "insurance" | "investment";

export type KatePriority = "high" | "medium" | "low";

export type KateRuleId =
  | "pamperrekening"
  | "groeipakket-kraamgeld"
  | "childcare-hospitalisation"
  | "home-purchase"
  | "renovation"
  | "successieplanning"
  | "idle-savings-invest";

export interface KateAlert {
  /** Stable id: `${ruleId}:${personaId}`, so the same insight is never raised twice. */
  id: string;
  ruleId: KateRuleId;
  triggerSource: KateTriggerSource;
  title: string;
  description: string;
  ctaText: string;
  actionType: KateActionType;
  /** Deep link into KBC Mobile (kbc:// scheme) for the product flow. */
  productLink: string;
  productLine: KateProductLine;
  priority: KatePriority;
  /** Transaction ids that caused the alert; empty for balance/life-stage triggers. */
  evidenceTransactionIds: string[];
  /** When the signal was detected (latest evidence booking, or evaluation time). */
  detectedAt: ISODateTime;
}
