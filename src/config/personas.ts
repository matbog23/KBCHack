import { BANK_TRANSACTION_CODES } from "@/psd2/berlinGroup";
import {
  MCC,
  type PaymentChannel,
  type PersonaId,
  type PSD2Transaction,
  type UserPersona,
} from "@/types/psd2";

/** Fixed "today" for the demo, so seeded data and SSR output are deterministic. */
export const DEMO_ANCHOR_DATE = "2026-09-30T09:00:00+02:00";

export interface PersonaProfile {
  persona: UserPersona;
  /** Seed history, newest first. None of these should trigger a Kate alert on their own. */
  transactions: PSD2Transaction[];
}

/** SEPA standing order ("doorlopende opdracht"), as used for rent and monthly savings. */
const STANDING_ORDER = "PMNT-ICDT-STDO";

type SeedInput = Pick<
  PSD2Transaction,
  "transactionId" | "bookingDate" | "amount" | "creditorName" | "remittanceInformationUnstructured"
> &
  Partial<
    Pick<
      PSD2Transaction,
      "merchantCategoryCode" | "debtorName" | "debtorIban" | "creditorIban" | "bankTransactionCode"
    >
  >;

function card(input: SeedInput & { merchantCategoryCode: string }): PSD2Transaction {
  return seed("card", { bankTransactionCode: BANK_TRANSACTION_CODES.card, ...input });
}

function transfer(input: SeedInput): PSD2Transaction {
  const code =
    input.amount < 0
      ? BANK_TRANSACTION_CODES["transfer-out"]
      : BANK_TRANSACTION_CODES["transfer-in"];
  return seed("transfer", { bankTransactionCode: code, ...input });
}

function directDebit(input: SeedInput): PSD2Transaction {
  return seed("direct-debit", {
    bankTransactionCode: BANK_TRANSACTION_CODES["direct-debit"],
    ...input,
  });
}

function seed(channel: PaymentChannel, input: SeedInput): PSD2Transaction {
  return {
    valueDate: input.bookingDate,
    bookingStatus: "booked",
    currency: "EUR",
    creditDebitIndicator: input.amount < 0 ? "DBIT" : "CRDT",
    channel,
    ...input,
  };
}

// Fictional customers. Every IBAN in this file passes the checksum but belongs to nobody.
const EMMA: UserPersona = {
  id: "emma",
  name: "Emma Claes",
  age: 28,
  checkingBalance: 2_184.37,
  savingsBalance: 12_000,
  lifeStage: "starter",
  tagline: "Age 28 · Young mum · €12k savings",
  checkingIban: "BE36 7340 1234 5681",
  savingsIban: "BE89 7350 9876 5485",
  ownedProducts: [],
};

const JAN: UserPersona = {
  id: "jan",
  name: "Jan Vermeulen",
  age: 75,
  checkingBalance: 8_412.9,
  savingsBalance: 450_000,
  savingsBalance12MonthsAgo: 445_000,
  estateOutreachConsent: true,
  estatePlanningInterest: true,
  lifeStage: "retired",
  tagline: "Age 75 · Retired · €450k savings",
  checkingIban: "BE81 7330 5566 7724",
  savingsIban: "BE82 7360 1122 3368",
  ownedProducts: [],
};

const EMMA_TRANSACTIONS: PSD2Transaction[] = [
  card({
    transactionId: "emma-0009",
    bookingDate: "2026-09-29T18:42:00+02:00",
    amount: -64.18,
    creditorName: "Delhaize Leuven",
    remittanceInformationUnstructured: "Bancontact-betaling 29/09 Delhaize Leuven",
    merchantCategoryCode: MCC.GROCERY,
  }),
  card({
    transactionId: "emma-0008",
    bookingDate: "2026-09-28T12:05:00+02:00",
    amount: -18.5,
    creditorName: "Café Commerce",
    remittanceInformationUnstructured: "Bancontact-betaling 28/09 Café Commerce",
    merchantCategoryCode: MCC.EATING_PLACES,
  }),
  card({
    transactionId: "emma-0007",
    bookingDate: "2026-09-26T08:10:00+02:00",
    amount: -49,
    creditorName: "NMBS/SNCB",
    remittanceInformationUnstructured: "Bancontact-betaling 26/09 NMBS Leuven",
    merchantCategoryCode: MCC.RAILWAYS,
  }),
  transfer({
    transactionId: "emma-0006",
    bookingDate: "2026-09-25T09:00:00+02:00",
    amount: 2_650,
    creditorName: "Emma Claes",
    debtorName: "Proximus NV",
    debtorIban: "BE03 2100 4433 2284",
    remittanceInformationUnstructured: "Loon september 2026",
  }),
  transfer({
    transactionId: "emma-0005",
    bookingDate: "2026-09-25T09:05:00+02:00",
    amount: -450,
    creditorName: "Emma Claes",
    creditorIban: "BE89 7350 9876 5485",
    remittanceInformationUnstructured: "Doorlopende opdracht sparen",
    bankTransactionCode: STANDING_ORDER,
  }),
  card({
    transactionId: "emma-0004",
    bookingDate: "2026-09-22T19:30:00+02:00",
    amount: -12.99,
    creditorName: "Netflix",
    remittanceInformationUnstructured: "Kaartbetaling 22/09 Netflix.com",
    merchantCategoryCode: MCC.STREAMING,
  }),
  card({
    transactionId: "emma-0003",
    bookingDate: "2026-09-20T10:14:00+02:00",
    amount: -22.4,
    creditorName: "Apotheek De Linde",
    remittanceInformationUnstructured: "Bancontact-betaling 20/09 Apotheek De Linde",
    merchantCategoryCode: MCC.PHARMACY,
  }),
  card({
    transactionId: "emma-0002",
    bookingDate: "2026-09-18T07:55:00+02:00",
    amount: -58.2,
    creditorName: "TotalEnergies Heverlee",
    remittanceInformationUnstructured: "Bancontact-betaling 18/09 TotalEnergies",
    merchantCategoryCode: MCC.FUEL,
  }),
  transfer({
    transactionId: "emma-0001",
    bookingDate: "2026-09-01T06:00:00+02:00",
    amount: -950,
    creditorName: "Immo Vandenberghe",
    creditorIban: "BE71 0961 2345 6769",
    remittanceInformationUnstructured: "Huur appartement oktober",
    bankTransactionCode: STANDING_ORDER,
  }),
];

const JAN_TRANSACTIONS: PSD2Transaction[] = [
  card({
    transactionId: "jan-0008",
    bookingDate: "2026-09-29T10:20:00+02:00",
    amount: -87.35,
    creditorName: "Colruyt Brugge",
    remittanceInformationUnstructured: "Bancontact-betaling 29/09 Colruyt Brugge",
    merchantCategoryCode: MCC.GROCERY,
  }),
  card({
    transactionId: "jan-0007",
    bookingDate: "2026-09-27T12:45:00+02:00",
    amount: -64,
    creditorName: "Restaurant De Visscherie",
    remittanceInformationUnstructured: "Bancontact-betaling 27/09 De Visscherie",
    merchantCategoryCode: MCC.EATING_PLACES,
  }),
  card({
    transactionId: "jan-0006",
    bookingDate: "2026-09-24T09:30:00+02:00",
    amount: -31.8,
    creditorName: "Apotheek Sint-Jan",
    remittanceInformationUnstructured: "Bancontact-betaling 24/09 Apotheek Sint-Jan",
    merchantCategoryCode: MCC.PHARMACY,
  }),
  card({
    transactionId: "jan-0005",
    bookingDate: "2026-09-20T15:10:00+02:00",
    amount: -26.9,
    creditorName: "Standaard Boekhandel",
    remittanceInformationUnstructured: "Bancontact-betaling 20/09 Standaard Boekhandel",
    merchantCategoryCode: MCC.BOOKSTORES,
  }),
  directDebit({
    transactionId: "jan-0004",
    bookingDate: "2026-09-15T07:00:00+02:00",
    amount: -142.6,
    creditorName: "Luminus",
    creditorIban: "BE50 3100 4561 2318",
    remittanceInformationUnstructured: "Voorschotfactuur energie september",
  }),
  transfer({
    transactionId: "jan-0003",
    bookingDate: "2026-09-10T08:00:00+02:00",
    amount: -900,
    creditorName: "Jan Vermeulen",
    creditorIban: "BE82 7360 1122 3368",
    remittanceInformationUnstructured: "Doorlopende opdracht sparen",
    bankTransactionCode: STANDING_ORDER,
  }),
  transfer({
    transactionId: "jan-0002",
    bookingDate: "2026-09-10T06:00:00+02:00",
    amount: 2_980,
    creditorName: "Jan Vermeulen",
    debtorName: "Federale Pensioendienst",
    debtorIban: "BE80 6790 0022 1177",
    remittanceInformationUnstructured: "Rustpensioen september 2026",
  }),
  transfer({
    transactionId: "jan-0001",
    bookingDate: "2026-09-02T11:00:00+02:00",
    amount: -210,
    creditorName: "Thuiszorg Brugge vzw",
    creditorIban: "BE65 0012 2334 4596",
    remittanceInformationUnstructured: "Poetshulp augustus",
  }),
];

export const PERSONAS: Record<PersonaId, PersonaProfile> = {
  emma: { persona: EMMA, transactions: EMMA_TRANSACTIONS },
  jan: { persona: JAN, transactions: JAN_TRANSACTIONS },
};

export const PERSONA_IDS: readonly PersonaId[] = ["emma", "jan"];

export const DEFAULT_PERSONA_ID: PersonaId = "emma";
