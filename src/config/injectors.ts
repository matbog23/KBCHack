import { MCC, type PSD2Transaction } from "@/types/psd2";

/** A God Mode button: the part of a PSD2 payload the operator chooses; the store fills the rest. */
export type TransactionTemplate = Pick<
  PSD2Transaction,
  | "amount"
  | "creditorName"
  | "debtorName"
  | "remittanceInformationUnstructured"
  | "merchantCategoryCode"
  | "creditorIban"
>;

export interface TransactionInjector {
  id: string;
  label: string;
  /** Which demo storyline the injector belongs to, used to group buttons. */
  storyline: "family" | "estate" | "home";
  template: TransactionTemplate;
}

export const TRANSACTION_INJECTORS: readonly TransactionInjector[] = [
  {
    id: "gynecology",
    label: "Dr. Peeters Gynecology",
    storyline: "family",
    template: {
      amount: -65,
      creditorName: "Dr. Peeters Gynaecologie",
      remittanceInformationUnstructured: "Consultatie gynaecologie + echografie",
      merchantCategoryCode: MCC.DOCTORS_GYNECOLOGY,
    },
  },
  {
    id: "kraamgeld",
    label: "Kraamgeld Grant",
    storyline: "family",
    template: {
      amount: 1_350,
      creditorName: "Account holder",
      debtorName: "FONS Groeipakket",
      remittanceInformationUnstructured: "Groeipakket startbedrag kraamgeld",
    },
  },
  {
    id: "childcare",
    label: "Kinderdagverblijf Het Nestje",
    storyline: "family",
    template: {
      amount: -540,
      creditorName: "Kinderdagverblijf Het Nestje",
      remittanceInformationUnstructured: "Opvang oktober + inschrijvingsgeld",
      merchantCategoryCode: MCC.CHILD_CARE,
    },
  },
  {
    id: "notary",
    label: "Notary Van Damme",
    storyline: "estate",
    template: {
      amount: -250,
      creditorName: "Notariskantoor Van Damme",
      remittanceInformationUnstructured: "Ereloon consultatie nalatenschap",
      merchantCategoryCode: MCC.LEGAL_NOTARY,
    },
  },
  {
    id: "contractor",
    label: "Bouwbedrijf Maes Renovations",
    storyline: "home",
    template: {
      amount: -4_800,
      creditorName: "Bouwbedrijf Maes BV",
      remittanceInformationUnstructured: "Voorschot renovatie badkamer 30%",
      merchantCategoryCode: MCC.GENERAL_CONTRACTORS,
    },
  },
];
