import type { TransactionDraft } from "@/psd2/berlinGroup";
import { MCC, type PersonaId } from "@/types/psd2";

export interface DraftPreset {
  id: string;
  label: string;
  /** Which customers the example makes sense for. */
  personas: readonly PersonaId[];
  draft: TransactionDraft;
}

/**
 * Example payments that pre-fill the dashboard form, each paid the way it is paid in Belgium.
 * Nothing is booked until "Pay" is pressed. All names and IBANs are fictional.
 */
export const DRAFT_PRESETS: readonly DraftPreset[] = [
  {
    id: "gynecology",
    personas: ["emma"],
    label: "Gynaecologist",
    draft: {
      paymentType: "card",
      amount: "65,00",
      counterpartyName: "Dr. Peeters Gynaecologie",
      counterpartyIban: "",
      merchantCategoryCode: MCC.DOCTORS,
      remittanceInformation: "",
    },
  },
  {
    id: "gp",
    personas: ["emma", "jan"],
    label: "GP visit",
    draft: {
      paymentType: "card",
      amount: "30,00",
      counterpartyName: "Huisartsenpraktijk De Linde",
      counterpartyIban: "",
      merchantCategoryCode: MCC.DOCTORS,
      remittanceInformation: "",
    },
  },
  {
    id: "maternity",
    personas: ["emma"],
    label: "Maternity bill",
    draft: {
      paymentType: "transfer-out",
      amount: "420,00",
      counterpartyName: "AZ Sint-Jan Brugge",
      counterpartyIban: "BE60 4730 2123 4570",
      merchantCategoryCode: "",
      remittanceInformation: "Factuur 2026/48213 kraamafdeling, opname 26/09",
    },
  },
  {
    id: "kraamgeld",
    personas: ["emma"],
    label: "Birth grant",
    draft: {
      paymentType: "transfer-in",
      amount: "1.350,00",
      counterpartyName: "FONS Groeipakket",
      counterpartyIban: "BE91 0017 7654 3276",
      merchantCategoryCode: "",
      remittanceInformation: "Groeipakket startbedrag geboorte",
    },
  },
  {
    id: "childcare",
    personas: ["emma"],
    label: "Childcare",
    draft: {
      paymentType: "direct-debit",
      amount: "540,00",
      counterpartyName: "Kinderdagverblijf Het Nestje",
      counterpartyIban: "BE88 0635 5443 3241",
      merchantCategoryCode: "",
      remittanceInformation: "Opvang oktober + inschrijvingsgeld",
    },
  },
  {
    id: "notary-home",
    personas: ["emma"],
    label: "Notary · home",
    draft: {
      paymentType: "transfer-out",
      amount: "29.500,00",
      counterpartyName: "Notariskantoor Van Damme",
      counterpartyIban: "BE96 0689 0123 4505",
      merchantCategoryCode: "",
      remittanceInformation: "Voorschot 10% aankoop appartement Leuven",
    },
  },
  {
    id: "contractor",
    personas: ["emma", "jan"],
    label: "Contractor",
    draft: {
      paymentType: "transfer-out",
      amount: "4.800,00",
      counterpartyName: "Bouwbedrijf Maes BV",
      counterpartyIban: "BE23 3630 9871 2391",
      merchantCategoryCode: "",
      remittanceInformation: "Voorschot renovatie badkamer 30%",
    },
  },
  {
    id: "hospital",
    personas: ["jan"],
    label: "Hospital bill",
    draft: {
      paymentType: "transfer-out",
      amount: "1.280,00",
      counterpartyName: "UZ Leuven",
      counterpartyIban: "BE70 7340 4567 8925",
      merchantCategoryCode: "",
      remittanceInformation: "Factuur 2026/77120 opname cardiologie",
    },
  },
  {
    id: "notary-estate",
    personas: ["jan"],
    label: "Notary · estate",
    draft: {
      paymentType: "transfer-out",
      amount: "250,00",
      counterpartyName: "Notariskantoor Van Damme",
      counterpartyIban: "BE96 0689 0123 4505",
      merchantCategoryCode: "",
      remittanceInformation: "Provisie consultatie testament en schenking",
    },
  },
  {
    id: "legal",
    personas: ["jan"],
    label: "Lawyer",
    draft: {
      paymentType: "transfer-out",
      amount: "180,00",
      counterpartyName: "Advocatenkantoor Peeters",
      counterpartyIban: "BE05 0017 1122 3375",
      merchantCategoryCode: "",
      remittanceInformation: "Ereloon juridisch advies",
    },
  },
  {
    id: "insurance",
    personas: ["jan"],
    label: "Life insurance",
    draft: {
      paymentType: "direct-debit",
      amount: "120,00",
      counterpartyName: "Atlas Verzekeringen NV",
      counterpartyIban: "BE05 0689 3344 5575",
      merchantCategoryCode: "",
      remittanceInformation: "Premie levensverzekering tak 21",
    },
  },
  {
    id: "pharmacy",
    personas: ["jan"],
    label: "Pharmacy",
    draft: {
      paymentType: "card",
      amount: "38,60",
      counterpartyName: "Apotheek Sint-Jan",
      counterpartyIban: "",
      merchantCategoryCode: MCC.PHARMACY,
      remittanceInformation: "",
    },
  },
  {
    id: "groceries",
    personas: ["emma", "jan"],
    label: "Groceries",
    draft: {
      paymentType: "card",
      amount: "42,17",
      counterpartyName: "Delhaize Leuven",
      counterpartyIban: "",
      merchantCategoryCode: MCC.GROCERY,
      remittanceInformation: "",
    },
  },
];

export function presetsFor(personaId: PersonaId): DraftPreset[] {
  return DRAFT_PRESETS.filter((preset) => preset.personas.includes(personaId));
}

export const EMPTY_DRAFT: TransactionDraft = {
  paymentType: "card",
  amount: "",
  counterpartyName: "",
  counterpartyIban: "",
  merchantCategoryCode: "",
  remittanceInformation: "",
};
