import { MCC, type PersonaId, type PSD2Transaction, type UserPersona } from "@/types/psd2";

/** Fixed "today" for the demo, so seeded data and SSR output are deterministic. */
export const DEMO_ANCHOR_DATE = "2026-09-30T09:00:00+02:00";

export interface PersonaProfile {
  persona: UserPersona;
  /** Seed history, newest first. None of these should trigger a Kate alert on their own. */
  transactions: PSD2Transaction[];
}

type SeedInput = Pick<
  PSD2Transaction,
  "transactionId" | "bookingDate" | "amount" | "creditorName" | "remittanceInformationUnstructured"
> &
  Partial<Pick<PSD2Transaction, "merchantCategoryCode" | "debtorName" | "creditorIban">>;

function seed(input: SeedInput): PSD2Transaction {
  return {
    valueDate: input.bookingDate,
    bookingStatus: "booked",
    currency: "EUR",
    creditDebitIndicator: input.amount < 0 ? "DBIT" : "CRDT",
    ...input,
  };
}

const EMMA: UserPersona = {
  id: "emma",
  name: "Emma Claes",
  age: 28,
  checkingBalance: 2_184.37,
  savingsBalance: 12_000,
  lifeStage: "starter",
  tagline: "Age 28 · Young mother-to-be · €12k savings",
  checkingIban: "BE68 7340 1234 5678",
  savingsIban: "BE12 7350 9876 5432",
  monthlySavingsContribution: 450,
  monthlyNetIncome: 2_650,
  monthlyFixedCosts: 2_200,
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
  checkingIban: "BE43 7330 5566 7788",
  savingsIban: "BE97 7360 1122 3344",
  monthlySavingsContribution: 900,
  monthlyNetIncome: 2_980,
  monthlyFixedCosts: 2_080,
};

const EMMA_TRANSACTIONS: PSD2Transaction[] = [
  seed({
    transactionId: "emma-0009",
    bookingDate: "2026-09-29T18:42:00+02:00",
    amount: -64.18,
    creditorName: "Delhaize Leuven",
    remittanceInformationUnstructured: "Bancontact 29/09 Delhaize Leuven",
    merchantCategoryCode: MCC.GROCERY,
  }),
  seed({
    transactionId: "emma-0008",
    bookingDate: "2026-09-28T12:05:00+02:00",
    amount: -18.5,
    creditorName: "Café Commerce",
    remittanceInformationUnstructured: "Bancontact 28/09 Café Commerce",
    merchantCategoryCode: MCC.EATING_PLACES,
  }),
  seed({
    transactionId: "emma-0007",
    bookingDate: "2026-09-26T08:10:00+02:00",
    amount: -49,
    creditorName: "NMBS/SNCB",
    remittanceInformationUnstructured: "Maandabonnement Leuven-Brussel",
    merchantCategoryCode: MCC.TRANSIT,
  }),
  seed({
    transactionId: "emma-0006",
    bookingDate: "2026-09-25T09:00:00+02:00",
    amount: 2_650,
    creditorName: "Emma Claes",
    debtorName: "Proximus NV",
    remittanceInformationUnstructured: "Loon september 2026",
  }),
  seed({
    transactionId: "emma-0005",
    bookingDate: "2026-09-25T09:05:00+02:00",
    amount: -450,
    creditorName: "KBC Spaarrekening",
    creditorIban: "BE12 7350 9876 5432",
    remittanceInformationUnstructured: "Doorlopende opdracht sparen",
  }),
  seed({
    transactionId: "emma-0004",
    bookingDate: "2026-09-22T19:30:00+02:00",
    amount: -12.99,
    creditorName: "Netflix",
    remittanceInformationUnstructured: "Netflix.com abonnement",
    merchantCategoryCode: MCC.STREAMING,
  }),
  seed({
    transactionId: "emma-0003",
    bookingDate: "2026-09-20T10:14:00+02:00",
    amount: -22.4,
    creditorName: "Apotheek De Linde",
    remittanceInformationUnstructured: "Bancontact 20/09 Apotheek De Linde",
    merchantCategoryCode: MCC.PHARMACY,
  }),
  seed({
    transactionId: "emma-0002",
    bookingDate: "2026-09-18T07:55:00+02:00",
    amount: -58.2,
    creditorName: "TotalEnergies Heverlee",
    remittanceInformationUnstructured: "Bancontact 18/09 TotalEnergies",
    merchantCategoryCode: MCC.FUEL,
  }),
  seed({
    transactionId: "emma-0001",
    bookingDate: "2026-09-01T06:00:00+02:00",
    amount: -950,
    creditorName: "Immo Vandenberghe",
    creditorIban: "BE71 0961 2345 6769",
    remittanceInformationUnstructured: "Huur appartement oktober",
  }),
];

const JAN_TRANSACTIONS: PSD2Transaction[] = [
  seed({
    transactionId: "jan-0008",
    bookingDate: "2026-09-29T10:20:00+02:00",
    amount: -87.35,
    creditorName: "Colruyt Brugge",
    remittanceInformationUnstructured: "Bancontact 29/09 Colruyt",
    merchantCategoryCode: MCC.GROCERY,
  }),
  seed({
    transactionId: "jan-0007",
    bookingDate: "2026-09-27T12:45:00+02:00",
    amount: -64,
    creditorName: "Restaurant De Visscherie",
    remittanceInformationUnstructured: "Bancontact 27/09 De Visscherie",
    merchantCategoryCode: MCC.EATING_PLACES,
  }),
  seed({
    transactionId: "jan-0006",
    bookingDate: "2026-09-24T09:30:00+02:00",
    amount: -31.8,
    creditorName: "Apotheek Sint-Jan",
    remittanceInformationUnstructured: "Bancontact 24/09 Apotheek",
    merchantCategoryCode: MCC.PHARMACY,
  }),
  seed({
    transactionId: "jan-0005",
    bookingDate: "2026-09-20T15:10:00+02:00",
    amount: -26.9,
    creditorName: "Standaard Boekhandel",
    remittanceInformationUnstructured: "Bancontact 20/09 Standaard Boekhandel",
    merchantCategoryCode: MCC.BOOKSTORES,
  }),
  seed({
    transactionId: "jan-0004",
    bookingDate: "2026-09-15T07:00:00+02:00",
    amount: -142.6,
    creditorName: "Luminus",
    remittanceInformationUnstructured: "Voorschotfactuur energie september",
    merchantCategoryCode: MCC.UTILITIES,
  }),
  seed({
    transactionId: "jan-0003",
    bookingDate: "2026-09-10T08:00:00+02:00",
    amount: -900,
    creditorName: "KBC Spaarrekening",
    creditorIban: "BE97 7360 1122 3344",
    remittanceInformationUnstructured: "Doorlopende opdracht sparen",
  }),
  seed({
    transactionId: "jan-0002",
    bookingDate: "2026-09-10T06:00:00+02:00",
    amount: 2_980,
    creditorName: "Jan Vermeulen",
    debtorName: "Federale Pensioendienst",
    remittanceInformationUnstructured: "Rustpensioen september 2026",
  }),
  seed({
    transactionId: "jan-0001",
    bookingDate: "2026-09-02T11:00:00+02:00",
    amount: -210,
    creditorName: "Thuiszorg Brugge vzw",
    remittanceInformationUnstructured: "Poetshulp augustus",
  }),
];

export const PERSONAS: Record<PersonaId, PersonaProfile> = {
  emma: { persona: EMMA, transactions: EMMA_TRANSACTIONS },
  jan: { persona: JAN, transactions: JAN_TRANSACTIONS },
};

export const PERSONA_IDS: readonly PersonaId[] = ["emma", "jan"];

export const DEFAULT_PERSONA_ID: PersonaId = "emma";
