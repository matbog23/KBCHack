/**
 * Domain model for Predictive Kate.
 *
 * `PSD2Transaction` is the engine's normalised view of one booked entry on a KBC current
 * account. It is parsed from a Berlin Group NextGenPSD2 account transaction (see
 * `src/psd2/berlinGroup.ts`) plus, for card payments, the merchant category code that KBC holds
 * as card issuer. Berlin Group account transactions do not carry an MCC themselves: only its
 * separate card-account endpoint does. Amounts are signed: negative = debit, positive = credit.
 */

/** ISO 8601 date-time string, e.g. "2026-09-30T09:15:00+02:00". */
export type ISODateTime = string;

/** ISO 4217 currency code. The demo only books in EUR. */
export type CurrencyCode = "EUR";

/** IBAN, formatted in groups of four, e.g. "BE36 7340 1234 5681". */
export type IBAN = string;

/**
 * ISO 18245 Merchant Category Codes used in the demo. The acquirer assigns one code per
 * merchant, so a code describes the kind of business, never the reason for a payment.
 */
export const MCC = {
  /** "Doctors and physicians, not elsewhere classified": GPs and every specialist alike. */
  DOCTORS: "8011",
  HOSPITALS: "8062",
  CHILD_CARE: "8351",
  GENERAL_CONTRACTORS: "1520",
  LEGAL_SERVICES: "8111",
  INSURANCE: "6300",
  GROCERY: "5411",
  EATING_PLACES: "5812",
  FUEL: "5541",
  PHARMACY: "5912",
  RAILWAYS: "4112",
  STREAMING: "4899",
  BOOKSTORES: "5942",
  GOVERNMENT_SERVICES: "9399",
} as const;

export type KnownMerchantCategoryCode = (typeof MCC)[keyof typeof MCC];

/** Any 4-digit MCC; known codes keep autocomplete while unknown codes stay valid. */
export type MerchantCategoryCode = KnownMerchantCategoryCode | (string & {});

/**
 * How the money moved. Only card payments pass through a card scheme, so only they carry an
 * MCC. Transfers and direct debits carry a counterparty IBAN and a free-text message instead.
 */
export type PaymentChannel = "card" | "transfer" | "direct-debit";

/** Berlin Group booking status. */
export type BookingStatus = "booked" | "pending";

/** ISO 20022 credit-debit indicator, derived from the sign of the amount. */
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
  channel: PaymentChannel;
  /** ISO 20022 Domain-Family-SubFamily, e.g. "PMNT-CCRD-POSD" for a debit card payment. */
  bankTransactionCode?: string;
  /** Payee (for debits) or our own account holder (for credits). */
  creditorName: string;
  creditorIban?: IBAN;
  /** Payer (for credits). */
  debtorName?: string;
  debtorIban?: IBAN;
  /** Free-text remittance information ("mededeling"). */
  remittanceInformationUnstructured: string;
  /** ISO 18245 merchant category code. Only card payments have one. */
  merchantCategoryCode?: MerchantCategoryCode;
  /** True when the transaction was entered on the dashboard rather than seeded. */
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
  /** Snapshot used for the optional 12-month savings growth signal. */
  savingsBalance12MonthsAgo?: number;
  /** Separate permission to use data for proactive estate-planning invitations. */
  estateOutreachConsent?: boolean;
  /** Special-category health inference is never used without explicit permission. */
  healthSignalConsent?: boolean;
  /** Interest explicitly registered by the customer, not inferred from transactions. */
  estatePlanningInterest?: boolean;
  lifeStage: LifeStage;
  /** One-line description shown in the persona selector. */
  tagline: string;
  checkingIban: IBAN;
  savingsIban: IBAN;
  /** Products opened through Kate, so she stops suggesting them. */
  ownedProducts: KateProductId[];
}

export type KateProductId = "child-account" | "estate-advice";

/** What kind of evidence raised an alert, used for the "why am I seeing this?" copy. */
export type KateTriggerSource = "PAYMENT_PATTERN" | "INCOMING_CREDIT" | "LIFE_STAGE";

export type KateActionType =
  | "OPEN_ACCOUNT"
  | "LAUNCH_SIMULATOR"
  | "INSURANCE_QUOTE"
  | "BOOK_ADVISOR";

export type KateProductLine = "bank" | "insurance" | "investment";

export type KatePriority = "high" | "medium" | "low";

export type KateRuleId =
  | "new-child"
  | "childcare-hospitalisation"
  | "home-purchase"
  | "renovation"
  | "successieplanning";

/** What the phone opens when the customer says yes. */
export type KateFlow = "open-child-account" | "estate-planner" | "confirm";

export interface KateAlert {
  /** Stable id: `${ruleId}:${personaId}`, so the same insight is never raised twice. */
  id: string;
  ruleId: KateRuleId;
  triggerSource: KateTriggerSource;
  /** Small uppercase label above the title, e.g. "MOMENT · NIEUW KINDJE". */
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  flow: KateFlow;
  actionType: KateActionType;
  /** Deep link into KBC Mobile (kbc:// scheme) for the product flow. */
  productLink: string;
  productLine: KateProductLine;
  priority: KatePriority;
  /** Transaction ids that caused the alert. */
  evidenceTransactionIds: string[];
  /** When the signal was detected: the booking date of the latest evidence. */
  detectedAt: ISODateTime;
}
