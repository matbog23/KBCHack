import { MCC, type MerchantCategoryCode } from "@/types/psd2";

export interface MccOption {
  code: MerchantCategoryCode;
  label: string;
  /** True for codes that can contribute to one of Kate's life-event signals. */
  isKateSignal: boolean;
}

/** ISO 18245 codes offered in the dashboard's MCC picker for card payments. */
export const MCC_OPTIONS: readonly MccOption[] = [
  { code: MCC.DOCTORS, label: "Doctors (GPs and specialists)", isKateSignal: true },
  { code: MCC.HOSPITALS, label: "Hospitals", isKateSignal: true },
  { code: MCC.CHILD_CARE, label: "Child care services", isKateSignal: true },
  { code: MCC.GENERAL_CONTRACTORS, label: "General contractors", isKateSignal: true },
  { code: MCC.LEGAL_SERVICES, label: "Legal services", isKateSignal: true },
  { code: MCC.INSURANCE, label: "Insurance", isKateSignal: true },
  { code: MCC.GROCERY, label: "Grocery stores & supermarkets", isKateSignal: false },
  { code: MCC.EATING_PLACES, label: "Restaurants", isKateSignal: false },
  { code: MCC.FUEL, label: "Service stations", isKateSignal: false },
  { code: MCC.PHARMACY, label: "Pharmacies", isKateSignal: false },
  { code: MCC.RAILWAYS, label: "Passenger railways", isKateSignal: false },
  { code: MCC.STREAMING, label: "Cable & streaming services", isKateSignal: false },
  { code: MCC.BOOKSTORES, label: "Bookstores", isKateSignal: false },
  { code: MCC.GOVERNMENT_SERVICES, label: "Government services", isKateSignal: false },
];

export function mccLabel(code: MerchantCategoryCode | undefined): string | undefined {
  return MCC_OPTIONS.find((option) => option.code === code)?.label;
}
