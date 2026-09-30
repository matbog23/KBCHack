import { MCC, type PSD2Transaction } from "@/types/psd2";

/** Test-only builders for engine inputs. Each returns a booked transaction paid the Belgian way. */

const BOOKED_AT = "2026-09-30T10:00:00+02:00";

function base(overrides: Partial<PSD2Transaction>): PSD2Transaction {
  const amount = overrides.amount ?? -10;
  return {
    transactionId: "test-tx",
    bookingDate: BOOKED_AT,
    valueDate: BOOKED_AT,
    bookingStatus: "booked",
    amount,
    currency: "EUR",
    creditDebitIndicator: amount < 0 ? "DBIT" : "CRDT",
    channel: "transfer",
    creditorName: "Test Beneficiary",
    remittanceInformationUnstructured: "",
    ...overrides,
  };
}

export function cardPayment(
  merchant: string,
  mcc: string,
  amount: number,
  overrides: Partial<PSD2Transaction> = {},
): PSD2Transaction {
  return base({
    channel: "card",
    bankTransactionCode: "PMNT-CCRD-POSD",
    amount: -Math.abs(amount),
    creditorName: merchant,
    merchantCategoryCode: mcc,
    remittanceInformationUnstructured: `Bancontact-betaling 30/09 ${merchant}`,
    ...overrides,
  });
}

export function transferOut(
  beneficiary: string,
  message: string,
  amount: number,
  overrides: Partial<PSD2Transaction> = {},
): PSD2Transaction {
  return base({
    bankTransactionCode: "PMNT-ICDT-ESCT",
    amount: -Math.abs(amount),
    creditorName: beneficiary,
    creditorIban: "BE71 0961 2345 6769",
    remittanceInformationUnstructured: message,
    ...overrides,
  });
}

export function directDebit(
  creditor: string,
  message: string,
  amount: number,
  overrides: Partial<PSD2Transaction> = {},
): PSD2Transaction {
  return transferOut(creditor, message, amount, {
    channel: "direct-debit",
    bankTransactionCode: "PMNT-RDDT-ESDD",
    ...overrides,
  });
}

export function transferIn(
  payer: string,
  message: string,
  amount: number,
  overrides: Partial<PSD2Transaction> = {},
): PSD2Transaction {
  return base({
    bankTransactionCode: "PMNT-RCDT-ESCT",
    amount: Math.abs(amount),
    creditorName: "Account holder",
    debtorName: payer,
    debtorIban: "BE91 0017 7654 3276",
    remittanceInformationUnstructured: message,
    ...overrides,
  });
}

/** The demo's headline payments, as the presets book them. */
export const SAMPLE = {
  gynaecologist: cardPayment("Dr. Peeters Gynaecologie", MCC.DOCTORS, 65, {
    transactionId: "tx-gyn",
  }),
  gpVisit: cardPayment("Huisartsenpraktijk De Linde", MCC.DOCTORS, 30, { transactionId: "tx-gp" }),
  maternity: transferOut("AZ Sint-Jan Brugge", "Factuur 2026/48213 kraamafdeling", 420, {
    transactionId: "tx-maternity",
  }),
  birthGrant: transferIn("FONS Groeipakket", "Groeipakket startbedrag geboorte", 1_350, {
    transactionId: "tx-grant",
  }),
  childcare: directDebit("Kinderdagverblijf Het Nestje", "Opvang oktober", 540, {
    transactionId: "tx-creche",
  }),
  hospital: transferOut("UZ Leuven", "Factuur 2026/77120 opname cardiologie", 1_280, {
    transactionId: "tx-hospital",
  }),
  notaryEstate: transferOut("Notariskantoor Van Damme", "Provisie testament en schenking", 250, {
    transactionId: "tx-notary-estate",
  }),
  notaryHome: transferOut(
    "Notariskantoor Van Damme",
    "Voorschot 10% aankoop appartement Leuven",
    29_500,
    { transactionId: "tx-notary-home" },
  ),
  contractor: transferOut("Bouwbedrijf Maes BV", "Voorschot renovatie badkamer 30%", 4_800, {
    transactionId: "tx-contractor",
  }),
} as const;

/** Moves a transaction `days` back from the default booking moment. */
export function daysEarlier(transaction: PSD2Transaction, days: number): PSD2Transaction {
  const bookingDate = new Date(Date.parse(BOOKED_AT) - days * 86_400_000).toISOString();
  return { ...transaction, bookingDate, valueDate: bookingDate };
}

export const AS_OF = BOOKED_AT;
