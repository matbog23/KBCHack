import { MCC, type MerchantCategoryCode, type PSD2Transaction } from "@/types/psd2";

/**
 * Step 1 of Kate: read one booked transaction and recognise what it says about the customer's
 * life. The life-moment rules in `kateEngine.ts` only ever look at these markers, never at raw
 * fields, so every decision can be explained as "this payment looked like X because Y".
 */

/** A life-event fact a single payment can reveal. */
export type LifeEventMarker =
  | "gynaecology"
  | "maternity"
  | "birth-grant"
  | "childcare"
  | "hospital"
  | "notary"
  | "contractor";

/** Where in the payment the evidence was found. */
export type MatchSource = "mcc" | "counterparty" | "remittance";

export interface MarkerMatch {
  marker: LifeEventMarker;
  /** Every part of the payment that supported the match, strongest first. */
  sources: MatchSource[];
  /** The words that matched, for the "why" explanation, e.g. "Gynaecologie". */
  matchedText: string[];
}

interface MarkerDefinition {
  marker: LifeEventMarker;
  label: string;
  direction: "debit" | "credit";
  /** Words that identify the event in the counterparty name or the payment message. */
  keywords: RegExp;
  /** Codes that on their own prove the event (the whole code is about it). */
  decisiveMccs?: readonly MerchantCategoryCode[];
  /**
   * Codes that fit the event but also cover much more, e.g. 8011 covers every doctor. They add
   * confidence to a keyword match but never trigger on their own.
   */
  supportingMccs?: readonly MerchantCategoryCode[];
  /** Smallest amount (in euro, unsigned) that still counts. */
  minAmount?: number;
}

/** Tuning knobs for recognition, exported for tests and the dashboard. */
export const SIGNAL_THRESHOLDS = {
  /** The one-off Groeipakket birth grant is well above this; monthly child benefit is not. */
  birthGrantMinAmount: 1_000,
  /** Contractor payments below this are repairs, not a renovation. */
  renovationMinAmount: 1_000,
  /** A notary payment this large is a purchase deposit, even without a telling message. */
  homePurchaseMinNotaryAmount: 5_000,
} as const;

export const MARKERS: readonly MarkerDefinition[] = [
  {
    marker: "gynaecology",
    label: "Gynaecologist or midwife",
    direction: "debit",
    keywords:
      /gyn(?:ae|e|é)colo\w*|verloskund\w*|vroedvrouw\w*|echografie|prenata\w*|obst[eé]tri\w*|sage-femme/i,
    supportingMccs: [MCC.DOCTORS],
  },
  {
    marker: "maternity",
    label: "Maternity ward",
    direction: "debit",
    keywords: /kraam\w*|materniteit|bevalling|maternit[eé]\w*|accouchement/i,
    supportingMccs: [MCC.HOSPITALS],
  },
  {
    marker: "birth-grant",
    label: "Birth grant received",
    direction: "credit",
    keywords:
      /groeipakket|startbedrag|kraamgeld|geboortepremie|geboortetoelage|prime de naissance|allocation de naissance/i,
    minAmount: SIGNAL_THRESHOLDS.birthGrantMinAmount,
  },
  {
    marker: "childcare",
    label: "Childcare",
    direction: "debit",
    keywords: /kinderdagverblijf|kinderopvang|peuteropvang|onthaalouder\w*|kribbe|cr[eè]che/i,
    decisiveMccs: [MCC.CHILD_CARE],
  },
  {
    marker: "hospital",
    label: "Hospital bill",
    direction: "debit",
    // Belgian hospitals are mostly known by their acronym: AZ, UZ, ZNA, GZA, CHU, …
    keywords: /ziekenhuis|kliniek|h[oô]pital|clinique|\b(?:AZ|UZ|ZNA|GZA|CHU|CHR)\b/i,
    decisiveMccs: [MCC.HOSPITALS],
  },
  {
    marker: "notary",
    label: "Notary",
    direction: "debit",
    keywords: /notari\w*|notaire|notary/i,
    supportingMccs: [MCC.LEGAL_SERVICES],
  },
  {
    marker: "contractor",
    label: "Building contractor",
    direction: "debit",
    keywords:
      /aannemer\w*|bouwbedrijf|bouwonderneming|renovatie\w*|verbouw\w*|dakwerk\w*|isolatie\w*|warmtepomp\w*|schrijnwerk\w*/i,
    decisiveMccs: [MCC.GENERAL_CONTRACTORS],
    minAmount: SIGNAL_THRESHOLDS.renovationMinAmount,
  },
];

const MARKER_BY_ID = new Map(MARKERS.map((definition) => [definition.marker, definition]));

export function markerLabel(marker: LifeEventMarker): string {
  return MARKER_BY_ID.get(marker)?.label ?? marker;
}

/** What a notary payment is about, read from its message. */
export type NotaryPurpose = "estate" | "purchase" | "unknown";

const ESTATE_WORDS =
  /nalatenschap|erfenis|testament|schenking|successie|erfopvolging|succession|donation/i;
const PURCHASE_WORDS =
  /aankoop|koopakte|compromis|verkoopovereenkomst|woning|appartement|hypothe\w*|krediet|achat|acte d'achat/i;

export function notaryPurpose(transaction: PSD2Transaction): NotaryPurpose {
  const text = transaction.remittanceInformationUnstructured;
  if (ESTATE_WORDS.test(text)) return "estate";
  if (PURCHASE_WORDS.test(text)) return "purchase";
  return "unknown";
}

function counterpartyName(transaction: PSD2Transaction): string {
  return transaction.amount > 0 ? (transaction.debtorName ?? "") : transaction.creditorName;
}

function firstMatch(pattern: RegExp, text: string): string | undefined {
  return pattern.exec(text)?.[0];
}

function matchOne(definition: MarkerDefinition, transaction: PSD2Transaction): MarkerMatch | null {
  const isDebit = transaction.amount < 0;
  if ((definition.direction === "debit") !== isDebit) return null;
  if (definition.minAmount !== undefined && Math.abs(transaction.amount) < definition.minAmount) {
    return null;
  }

  const mcc = transaction.channel === "card" ? transaction.merchantCategoryCode : undefined;
  const inName = firstMatch(definition.keywords, counterpartyName(transaction));
  // A card payment's statement line only repeats the merchant name: it is not a message.
  const inMessage =
    transaction.channel === "card"
      ? undefined
      : firstMatch(definition.keywords, transaction.remittanceInformationUnstructured);
  const decisiveMcc = mcc !== undefined && (definition.decisiveMccs ?? []).includes(mcc);
  const supportingMcc = mcc !== undefined && (definition.supportingMccs ?? []).includes(mcc);
  const hasKeyword = inName !== undefined || inMessage !== undefined;

  // A generic code alone (a GP also has MCC 8011) is never enough: Kate needs a decisive code
  // or words that name the event.
  if (!decisiveMcc && !hasKeyword) return null;

  const sources: MatchSource[] = [];
  if (decisiveMcc || supportingMcc) sources.push("mcc");
  if (inName !== undefined) sources.push("counterparty");
  if (inMessage !== undefined) sources.push("remittance");
  const matchedText = [inName, inMessage].filter((text): text is string => text !== undefined);
  return { marker: definition.marker, sources, matchedText: [...new Set(matchedText)] };
}

/** All life-event markers one transaction carries. Most everyday payments carry none. */
export function recogniseTransaction(transaction: PSD2Transaction): MarkerMatch[] {
  return MARKERS.map((definition) => matchOne(definition, transaction)).filter(
    (match): match is MarkerMatch => match !== null,
  );
}

export function hasMarker(transaction: PSD2Transaction, marker: LifeEventMarker): boolean {
  return recogniseTransaction(transaction).some((match) => match.marker === marker);
}
