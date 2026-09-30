import { compactIban, formatIban, isValidIban } from "@/lib/iban";
import type { CurrencyCode, ISODateTime, PaymentChannel, PSD2Transaction } from "@/types/psd2";

/**
 * Wire format of one booked entry on a KBC current account, in the shape of the Berlin Group
 * NextGenPSD2 Account Information Service (v1.3.x),
 * `GET /v1/accounts/{account-id}/transactions`. Amounts travel as signed decimal strings and
 * dates as ISO dates without a time.
 *
 * Berlin Group account transactions have no merchant category code: the spec only defines
 * `merchantCategoryCode` on its separate card-account transactions. KBC, as the issuer of the
 * customer's debit card, does receive the MCC from the card scheme for every card payment. We
 * attach it in `kbcCardDetails`, a clearly marked bank-internal extension, so the rest of the
 * payload stays standard.
 */
export interface BerlinGroupAmount {
  currency: string;
  amount: string;
}

export interface BerlinGroupAccountReference {
  iban?: string;
}

/** KBC-internal card data for a card payment. Not part of the Berlin Group standard. */
export interface KbcCardDetails {
  /** ISO 18245, four digits, as received from the card scheme. */
  merchantCategoryCode: string;
}

export interface BerlinGroupTransaction {
  transactionId: string;
  entryReference?: string;
  /** ISO date, "YYYY-MM-DD". */
  bookingDate: string;
  /** ISO date, "YYYY-MM-DD". */
  valueDate?: string;
  transactionAmount: BerlinGroupAmount;
  creditorName?: string;
  creditorAccount?: BerlinGroupAccountReference;
  debtorName?: string;
  debtorAccount?: BerlinGroupAccountReference;
  remittanceInformationUnstructured?: string;
  /** ISO 20022 Domain-Family-SubFamily, e.g. "PMNT-CCRD-POSD". */
  bankTransactionCode?: string;
  kbcCardDetails?: KbcCardDetails;
}

export interface BerlinGroupTransactionsResponse {
  account: BerlinGroupAccountReference;
  transactions: {
    booked: BerlinGroupTransaction[];
    pending?: BerlinGroupTransaction[];
  };
}

/**
 * The four ways money moves on a Belgian current account in the demo. Each maps to one
 * ISO 20022 bank transaction code.
 */
export type PaymentType = "card" | "transfer-out" | "direct-debit" | "transfer-in";

export const BANK_TRANSACTION_CODES: Record<PaymentType, string> = {
  /** Payment with the debit card at a terminal (Bancontact / Debit Mastercard). */
  card: "PMNT-CCRD-POSD",
  /** SEPA credit transfer the customer sent. */
  "transfer-out": "PMNT-ICDT-ESCT",
  /** SEPA direct debit collected from the customer's account. */
  "direct-debit": "PMNT-RDDT-ESDD",
  /** SEPA credit transfer the customer received. */
  "transfer-in": "PMNT-RCDT-ESCT",
};

/** What a person fills in on the dashboard form, before it becomes a payload. */
export interface TransactionDraft {
  paymentType: PaymentType;
  /** Free-form user input: "65", "65,50", "1.350,00" and "1350.00" are all accepted. */
  amount: string;
  /** Merchant (card), payee (transfer out, direct debit) or payer (transfer in). */
  counterpartyName: string;
  /** Required for transfers and direct debits; card payments have no counterparty IBAN. */
  counterpartyIban: string;
  /** Required for card payments, four digits. Ignored for other payment types. */
  merchantCategoryCode: string;
  /** Payment message. Card payments get a generated statement line instead. */
  remittanceInformation: string;
}

export type DraftField = keyof TransactionDraft;

export interface AccountHolder {
  name: string;
  iban: string;
}

export type Psd2ParseResult =
  | { ok: true; transactions: PSD2Transaction[] }
  | { ok: false; errors: string[] };

const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ["EUR"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_AMOUNT = /^-?\d{1,12}(\.\d{1,2})?$/;
const MCC_PATTERN = /^\d{4}$/;
const BANK_TRANSACTION_CODE = /^[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/;
/** SEPA caps unstructured remittance information at 140 characters. */
export const REMITTANCE_MAX_LENGTH = 140;
export const MAX_AMOUNT = 1_000_000;

export function isDebitPaymentType(paymentType: PaymentType): boolean {
  return paymentType !== "transfer-in";
}

/**
 * Normalises a user-typed amount to a positive decimal string with two decimals.
 * Belgian input ("1.350,50") and plain input ("1350.50") are both understood.
 */
export function normalizeAmount(input: string): string | null {
  const trimmed = input.replace(/[\s\u00A0\u202F€]/g, "");
  if (trimmed === "") return null;
  const canonical = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!/^\d+(\.\d{1,2})?$/.test(canonical)) return null;
  const value = Number(canonical);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;
  return value.toFixed(2);
}

/** Field-level validation for the dashboard form. An empty object means the draft is valid. */
export function validateDraft(draft: TransactionDraft): Partial<Record<DraftField, string>> {
  const errors: Partial<Record<DraftField, string>> = {};
  const isCard = draft.paymentType === "card";
  if (normalizeAmount(draft.amount) === null) {
    errors.amount = `Enter an amount between €0.01 and €${MAX_AMOUNT.toLocaleString("en-GB")}.`;
  }
  if (draft.counterpartyName.trim() === "") {
    errors.counterpartyName = isCard
      ? "Which merchant was paid?"
      : isDebitPaymentType(draft.paymentType)
        ? "Who is being paid?"
        : "Who is sending the money?";
  }
  if (isCard) {
    if (!MCC_PATTERN.test(draft.merchantCategoryCode)) {
      errors.merchantCategoryCode = "Every card payment carries a four-digit MCC.";
    }
  } else if (!isValidIban(draft.counterpartyIban)) {
    errors.counterpartyIban =
      draft.counterpartyIban.trim() === ""
        ? "A SEPA payment always has a counterparty IBAN."
        : "Not a valid IBAN (checksum failed).";
  }
  if (!isCard && draft.remittanceInformation.length > REMITTANCE_MAX_LENGTH) {
    errors.remittanceInformation = `SEPA allows at most ${REMITTANCE_MAX_LENGTH} characters.`;
  }
  return errors;
}

/** The statement line a card payment gets, e.g. "Bancontact-betaling 30/09 Delhaize Leuven". */
function cardStatementLine(merchant: string, bookingDate: string): string {
  const [, month, day] = bookingDate.split("-");
  return `Bancontact-betaling ${day}/${month} ${merchant}`;
}

/** Turns a validated form draft into the payload the bank's transaction feed would carry. */
export function buildBerlinGroupTransaction(
  draft: TransactionDraft,
  context: { transactionId: string; bookingDate: string; accountHolder: AccountHolder },
): BerlinGroupTransaction {
  const amount = normalizeAmount(draft.amount);
  if (amount === null) throw new Error(`Invalid amount "${draft.amount}"`);
  const counterpartyName = draft.counterpartyName.trim();
  const isCard = draft.paymentType === "card";
  const isDebit = isDebitPaymentType(draft.paymentType);
  const counterparty: BerlinGroupAccountReference | undefined =
    !isCard && draft.counterpartyIban.trim() !== ""
      ? { iban: compactIban(draft.counterpartyIban) }
      : undefined;
  const ownAccount: BerlinGroupAccountReference = { iban: compactIban(context.accountHolder.iban) };
  const remittance = isCard
    ? cardStatementLine(counterpartyName, context.bookingDate)
    : draft.remittanceInformation.trim();

  return {
    transactionId: context.transactionId,
    entryReference: context.transactionId.toUpperCase(),
    bookingDate: context.bookingDate,
    valueDate: context.bookingDate,
    transactionAmount: { currency: "EUR", amount: isDebit ? `-${amount}` : amount },
    ...(isDebit
      ? { creditorName: counterpartyName, ...(counterparty && { creditorAccount: counterparty }) }
      : {
          creditorName: context.accountHolder.name,
          creditorAccount: ownAccount,
          debtorName: counterpartyName,
          ...(counterparty && { debtorAccount: counterparty }),
        }),
    ...(remittance ? { remittanceInformationUnstructured: remittance } : {}),
    bankTransactionCode: BANK_TRANSACTION_CODES[draft.paymentType],
    ...(isCard ? { kbcCardDetails: { merchantCategoryCode: draft.merchantCategoryCode } } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  label: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    errors.push(`${label}: "${key}" must be a string.`);
    return undefined;
  }
  return value;
}

function accountIban(
  record: Record<string, unknown>,
  key: "creditorAccount" | "debtorAccount",
  errors: string[],
  label: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push(`${label}: "${key}" must be an account reference object.`);
    return undefined;
  }
  const iban = optionalString(value, "iban", errors, `${label}.${key}`);
  if (iban !== undefined && !isValidIban(iban)) {
    errors.push(`${label}: "${key}.iban" is not a valid IBAN.`);
    return undefined;
  }
  return iban === undefined ? undefined : formatIban(iban);
}

/** Card if KBC attached card data or the code says so; direct debit by code; else a transfer. */
function channelOf(
  bankTransactionCode: string | undefined,
  hasCardDetails: boolean,
): PaymentChannel {
  if (hasCardDetails || bankTransactionCode?.includes("-CCRD-")) return "card";
  if (bankTransactionCode?.includes("-RDDT-")) return "direct-debit";
  return "transfer";
}

function cardMcc(
  raw: Record<string, unknown>,
  errors: string[],
  label: string,
): { present: boolean; mcc?: string } {
  if ("merchantCategoryCode" in raw) {
    errors.push(
      `${label}: "merchantCategoryCode" is not a field of a Berlin Group account transaction. Card data goes in "kbcCardDetails".`,
    );
  }
  const details = raw.kbcCardDetails;
  if (details === undefined) return { present: false };
  if (!isRecord(details)) {
    errors.push(`${label}: "kbcCardDetails" must be an object.`);
    return { present: false };
  }
  const mcc = optionalString(details, "merchantCategoryCode", errors, `${label}.kbcCardDetails`);
  if (mcc === undefined || !MCC_PATTERN.test(mcc)) {
    errors.push(`${label}: "kbcCardDetails.merchantCategoryCode" must be four digits.`);
    return { present: true };
  }
  return { present: true, mcc };
}

function parseOne(
  raw: unknown,
  label: string,
  context: { accountHolder: AccountHolder; receivedAt: ISODateTime },
): { transaction?: PSD2Transaction; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) return { errors: [`${label}: expected a transaction object.`] };

  const transactionId = raw.transactionId;
  if (typeof transactionId !== "string" || transactionId.trim() === "") {
    errors.push(`${label}: "transactionId" is required.`);
  }

  const bookingDate = raw.bookingDate;
  if (typeof bookingDate !== "string" || !ISO_DATE.test(bookingDate)) {
    errors.push(`${label}: "bookingDate" must be an ISO date (YYYY-MM-DD).`);
  }
  const valueDate = optionalString(raw, "valueDate", errors, label);
  if (valueDate !== undefined && !ISO_DATE.test(valueDate)) {
    errors.push(`${label}: "valueDate" must be an ISO date (YYYY-MM-DD).`);
  }

  let amount = Number.NaN;
  const transactionAmount = raw.transactionAmount;
  if (!isRecord(transactionAmount)) {
    errors.push(`${label}: "transactionAmount" is required.`);
  } else {
    const { currency, amount: rawAmount } = transactionAmount;
    if (typeof currency !== "string" || !SUPPORTED_CURRENCIES.includes(currency as CurrencyCode)) {
      errors.push(`${label}: only EUR transactions are supported.`);
    }
    if (typeof rawAmount !== "string" || !DECIMAL_AMOUNT.test(rawAmount)) {
      errors.push(`${label}: "transactionAmount.amount" must be a decimal string like "-65.00".`);
    } else {
      amount = Number(rawAmount);
      if (amount === 0) errors.push(`${label}: amount cannot be zero.`);
    }
  }

  const creditorName = optionalString(raw, "creditorName", errors, label);
  const debtorName = optionalString(raw, "debtorName", errors, label);
  const creditorIban = accountIban(raw, "creditorAccount", errors, label);
  const debtorIban = accountIban(raw, "debtorAccount", errors, label);
  const remittance = optionalString(raw, "remittanceInformationUnstructured", errors, label) ?? "";
  if (remittance.length > REMITTANCE_MAX_LENGTH) {
    errors.push(`${label}: remittance information exceeds ${REMITTANCE_MAX_LENGTH} characters.`);
  }
  const bankTransactionCode = optionalString(raw, "bankTransactionCode", errors, label);
  if (bankTransactionCode !== undefined && !BANK_TRANSACTION_CODE.test(bankTransactionCode)) {
    errors.push(`${label}: "bankTransactionCode" must look like "PMNT-CCRD-POSD".`);
  }
  const card = cardMcc(raw, errors, label);
  const channel = channelOf(bankTransactionCode, card.present);

  const isDebit = amount < 0;
  if (!Number.isNaN(amount) && isDebit && !creditorName) {
    errors.push(`${label}: a debit needs a "creditorName".`);
  }
  if (!Number.isNaN(amount) && !isDebit && !debtorName) {
    errors.push(`${label}: a credit needs a "debtorName".`);
  }

  if (errors.length > 0 || typeof transactionId !== "string" || typeof bookingDate !== "string") {
    return { errors };
  }

  // Berlin Group books by date only; the emulator keeps the arrival time so the feed stays ordered.
  const timeOfDay = context.receivedAt.slice(10);
  return {
    errors,
    transaction: {
      transactionId,
      bookingDate: `${bookingDate}${timeOfDay}`,
      valueDate: `${valueDate ?? bookingDate}${timeOfDay}`,
      bookingStatus: "booked",
      amount,
      currency: "EUR",
      creditDebitIndicator: isDebit ? "DBIT" : "CRDT",
      channel,
      bankTransactionCode,
      creditorName: creditorName ?? context.accountHolder.name,
      creditorIban: creditorIban ?? (isDebit ? undefined : formatIban(context.accountHolder.iban)),
      debtorName,
      debtorIban,
      remittanceInformationUnstructured: remittance,
      merchantCategoryCode: card.mcc,
      isSimulated: true,
    },
  };
}

/**
 * Validates and maps an incoming payload into the engine's transaction model.
 * Accepts a single transaction or a full `transactions` response (only `booked` is read:
 * pending card authorisations can still be reversed, so Kate waits until they are booked).
 * All-or-nothing: one invalid transaction rejects the whole payload.
 */
export function parseBerlinGroupPayload(
  payload: unknown,
  context: { accountHolder: AccountHolder; receivedAt: ISODateTime },
): Psd2ParseResult {
  let items: unknown[];
  if (isRecord(payload) && isRecord(payload.transactions)) {
    const booked = payload.transactions.booked;
    if (!Array.isArray(booked)) {
      return { ok: false, errors: ['"transactions.booked" must be an array.'] };
    }
    items = booked;
  } else {
    items = [payload];
  }
  if (items.length === 0) return { ok: false, errors: ["The payload contains no transactions."] };

  const transactions: PSD2Transaction[] = [];
  const errors: string[] = [];
  items.forEach((item, index) => {
    const label = items.length === 1 ? "transaction" : `booked[${index}]`;
    const result = parseOne(item, label, context);
    errors.push(...result.errors);
    if (result.transaction) transactions.push(result.transaction);
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, transactions };
}
