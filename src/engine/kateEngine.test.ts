import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/config/personas";
import {
  estimateFlemishInheritanceTax,
  evaluateKateRules,
  KATE_THRESHOLDS,
} from "@/engine/kateEngine";
import { MCC, type PSD2Transaction, type UserPersona } from "@/types/psd2";

const emma = PERSONAS.emma.persona;
const jan = PERSONAS.jan.persona;

function transaction(overrides: Partial<PSD2Transaction>): PSD2Transaction {
  const amount = overrides.amount ?? -10;
  return {
    transactionId: "test-tx",
    bookingDate: "2026-10-01T10:00:00+02:00",
    valueDate: "2026-10-01T10:00:00+02:00",
    bookingStatus: "booked",
    amount,
    currency: "EUR",
    creditDebitIndicator: amount < 0 ? "DBIT" : "CRDT",
    creditorName: "Test Merchant",
    remittanceInformationUnstructured: "Test",
    ...overrides,
  };
}

const gynecologyVisit = transaction({
  transactionId: "tx-gyn",
  amount: -65,
  creditorName: "Dr. Peeters Gynaecologie",
  merchantCategoryCode: MCC.DOCTORS_GYNECOLOGY,
});

const notaryFee = transaction({
  transactionId: "tx-notary",
  amount: -250,
  creditorName: "Notariskantoor Van Damme",
  merchantCategoryCode: MCC.LEGAL_NOTARY,
});

function ruleIds(transactions: PSD2Transaction[], persona: UserPersona): string[] {
  return evaluateKateRules(transactions, persona).map((alert) => alert.ruleId);
}

describe("evaluateKateRules", () => {
  describe("seed data", () => {
    it("raises no alerts for Emma's untouched history", () => {
      expect(evaluateKateRules(PERSONAS.emma.transactions, emma)).toEqual([]);
    });

    it("raises only the estate-planning alert for Jan's untouched history", () => {
      expect(ruleIds(PERSONAS.jan.transactions, jan)).toEqual(["successieplanning"]);
    });
  });

  describe("Pamperrekening (MCC 8011)", () => {
    it("generates the Pamperrekening alert when a gynecology payment is injected", () => {
      const alerts = evaluateKateRules([gynecologyVisit, ...PERSONAS.emma.transactions], emma);
      const pamper = alerts.find((alert) => alert.ruleId === "pamperrekening");

      expect(pamper).toBeDefined();
      expect(pamper).toMatchObject({
        id: "pamperrekening:emma",
        triggerSource: "MCC_PATTERN",
        actionType: "OPEN_ACCOUNT",
        productLink: "kbc://products/savings/pamperrekening",
        priority: "high",
        evidenceTransactionIds: ["tx-gyn"],
        detectedAt: gynecologyVisit.bookingDate,
      });
      expect(pamper?.title.length).toBeGreaterThan(0);
      expect(pamper?.ctaText).toMatch(/Pamperrekening/);
    });

    it("puts the freshly detected Pamperrekening alert first", () => {
      const [first] = evaluateKateRules([gynecologyVisit, ...PERSONAS.emma.transactions], emma);
      expect(first?.ruleId).toBe("pamperrekening");
    });

    it("raises a single alert however many visits there are", () => {
      const secondVisit = { ...gynecologyVisit, transactionId: "tx-gyn-2" };
      const alerts = evaluateKateRules([gynecologyVisit, secondVisit], emma);
      const pampers = alerts.filter((alert) => alert.ruleId === "pamperrekening");

      expect(pampers).toHaveLength(1);
      expect(pampers[0]?.evidenceTransactionIds).toEqual(["tx-gyn", "tx-gyn-2"]);
    });

    it("ignores refunds from a gynecologist", () => {
      const refund = { ...gynecologyVisit, amount: 65, creditDebitIndicator: "CRDT" as const };
      expect(ruleIds([refund], emma)).not.toContain("pamperrekening");
    });

    it("does not target customers outside family-formation age", () => {
      expect(ruleIds([gynecologyVisit], jan)).not.toContain("pamperrekening");
    });
  });

  describe("Successieplanning (five fixed signals)", () => {
    it("generates the Successieplanning alert for a 65+ customer with a high balance", () => {
      const alerts = evaluateKateRules([], jan, { asOf: "2026-09-30T09:00:00+02:00" });
      const estate = alerts.find((alert) => alert.ruleId === "successieplanning");

      expect(estate).toMatchObject({
        id: "successieplanning:jan",
        triggerSource: "LIFE_STAGE",
        actionType: "LAUNCH_SIMULATOR",
        productLink: "kbc://simulators/successieplanning",
        priority: "medium",
        evidenceTransactionIds: [],
        detectedAt: "2026-09-30T09:00:00+02:00",
      });
    });

    it("uses the age and asset thresholds as two of the five signals", () => {
      const borderline: UserPersona = {
        ...jan,
        age: KATE_THRESHOLDS.estatePlanningMinAge,
        checkingBalance: 0,
        savingsBalance: KATE_THRESHOLDS.estatePlanningMinAssets,
      };
      expect(ruleIds([], borderline)).toContain("successieplanning");
    });

    it("stays silent for a 65+ customer with modest assets and no payment signal", () => {
      const modest: UserPersona = { ...jan, checkingBalance: 3_000, savingsBalance: 40_000 };
      expect(ruleIds([], modest)).not.toContain("successieplanning");
    });

    it("stays silent for a wealthy customer under 65 with only declared interest", () => {
      const wealthyYoung: UserPersona = { ...jan, age: 28, savingsBalance: 900_000 };
      expect(ruleIds([], wealthyYoung)).not.toContain("successieplanning");
    });

    it("requires outreach consent even when all five signals are present", () => {
      expect(ruleIds([notaryFee], { ...jan, estateOutreachConsent: false })).not.toContain(
        "successieplanning",
      );
    });

    it("does not treat the fixed demo score as a trained model or an age-only gate", () => {
      const noInterest = { ...jan, estatePlanningInterest: false };
      expect(ruleIds([], noInterest)).not.toContain("successieplanning");
      expect(ruleIds([notaryFee], noInterest)).toContain("successieplanning");
      expect(ruleIds([], { ...jan, age: 28, savingsBalance: 40_000 })).not.toContain(
        "successieplanning",
      );
    });

    it("counts savings growth only with a known year-old balance", () => {
      const persona = { ...jan, age: 64, savingsBalance12MonthsAgo: 425_000 };
      expect(ruleIds([], persona)).toContain("successieplanning");
      expect(ruleIds([], { ...persona, savingsBalance12MonthsAgo: undefined })).not.toContain(
        "successieplanning",
      );
    });

    it("escalates to high priority and cites the notary once a notary is paid", () => {
      const alerts = evaluateKateRules([notaryFee, ...PERSONAS.jan.transactions], jan);
      const estate = alerts.find((alert) => alert.ruleId === "successieplanning");

      expect(estate).toMatchObject({
        triggerSource: "MCC_PATTERN",
        priority: "high",
        evidenceTransactionIds: ["tx-notary"],
        detectedAt: notaryFee.bookingDate,
      });
    });

    it("does not fire on a notary visit alone with modest assets", () => {
      const modest: UserPersona = { ...jan, checkingBalance: 3_000, savingsBalance: 40_000 };
      expect(ruleIds([notaryFee], modest)).not.toContain("successieplanning");
    });

    it.each([MCC.LEGAL_NOTARY, MCC.LEGAL_SERVICES, MCC.INSURANCE])(
      "counts a recent booked debit with MCC %s as a transaction signal",
      (merchantCategoryCode) => {
        const payment = { ...notaryFee, merchantCategoryCode };
        const alerts = evaluateKateRules([payment], jan);
        expect(alerts.find((alert) => alert.ruleId === "successieplanning")).toMatchObject({
          priority: "high",
          triggerSource: "MCC_PATTERN",
          evidenceTransactionIds: ["tx-notary"],
        });
      },
    );

    it("ignores hospital payments without separate health-signal consent", () => {
      const hospital = { ...notaryFee, merchantCategoryCode: MCC.HOSPITALS };
      expect(evaluateKateRules([hospital], jan).find((alert) => alert.ruleId === "successieplanning"))
        .toMatchObject({ priority: "medium", evidenceTransactionIds: [] });
      expect(
        evaluateKateRules([hospital], { ...jan, healthSignalConsent: true }).find(
          (alert) => alert.ruleId === "successieplanning",
        ),
      ).toMatchObject({ priority: "high", evidenceTransactionIds: ["tx-notary"] });
    });

    it("ignores future, stale, pending and refunded payments", () => {
      const asOf = "2026-10-02T10:00:00+02:00";
      const ignored = [
        { ...notaryFee, bookingDate: "2025-09-01T10:00:00+02:00" },
        { ...notaryFee, bookingDate: "2026-10-03T10:00:00+02:00" },
        { ...notaryFee, bookingStatus: "pending" as const },
        { ...notaryFee, amount: 250, creditDebitIndicator: "CRDT" as const },
      ];
      for (const payment of ignored) {
        expect(
          evaluateKateRules([payment], jan, { asOf }).find(
            (alert) => alert.ruleId === "successieplanning",
          ),
        ).toMatchObject({ priority: "medium", evidenceTransactionIds: [] });
      }
    });

    it("routes a younger customer's notary visit to the home-loan simulator instead", () => {
      const ids = ruleIds([notaryFee], emma);
      expect(ids).toContain("home-purchase");
      expect(ids).not.toContain("successieplanning");
    });
  });

  describe("other life events", () => {
    it("detects a Groeipakket kraamgeld credit", () => {
      const grant = transaction({
        transactionId: "tx-kraamgeld",
        amount: 1_350,
        debtorName: "FONS Groeipakket",
        remittanceInformationUnstructured: "Groeipakket startbedrag kraamgeld",
      });
      expect(ruleIds([grant], emma)).toContain("groeipakket-kraamgeld");
    });

    it("detects a first childcare payment (MCC 8351)", () => {
      const creche = transaction({ amount: -540, merchantCategoryCode: MCC.CHILD_CARE });
      expect(ruleIds([creche], emma)).toContain("childcare-hospitalisation");
    });

    it("detects renovation works above the threshold only (MCC 1520)", () => {
      const small = transaction({ amount: -300, merchantCategoryCode: MCC.GENERAL_CONTRACTORS });
      const large = transaction({ amount: -4_800, merchantCategoryCode: MCC.GENERAL_CONTRACTORS });
      expect(ruleIds([small], emma)).not.toContain("renovation");
      expect(ruleIds([large], emma)).toContain("renovation");
    });

    it("suggests investing once savings exceed the safety buffer", () => {
      const buffer = emma.monthlyFixedCosts * KATE_THRESHOLDS.safetyBufferMonths;
      const justBelow: UserPersona = {
        ...emma,
        savingsBalance: buffer + KATE_THRESHOLDS.idleSavingsMinExcess - 1,
      };
      const above: UserPersona = {
        ...emma,
        savingsBalance: buffer + KATE_THRESHOLDS.idleSavingsMinExcess,
      };
      expect(ruleIds([], justBelow)).not.toContain("idle-savings-invest");
      expect(ruleIds([], above)).toContain("idle-savings-invest");
    });
  });

  it("is pure: identical input yields identical output and inputs are not mutated", () => {
    const input = [gynecologyVisit, notaryFee];
    const snapshot = structuredClone(input);
    expect(evaluateKateRules(input, emma)).toEqual(evaluateKateRules(input, emma));
    expect(input).toEqual(snapshot);
  });
});

describe("estimateFlemishInheritanceTax", () => {
  it("applies 3% / 9% / 27% direct-line brackets per heir", () => {
    // One heir, €300k: 50k × 3% + 200k × 9% + 50k × 27% = 1,500 + 18,000 + 13,500
    expect(estimateFlemishInheritanceTax(300_000, 1)).toBe(33_000);
  });

  it("splits the estate across heirs before applying brackets", () => {
    // Two heirs of €50k each stay entirely in the 3% bracket.
    expect(estimateFlemishInheritanceTax(100_000, 2)).toBe(3_000);
  });

  it("returns zero for empty estates or no heirs", () => {
    expect(estimateFlemishInheritanceTax(0, 2)).toBe(0);
    expect(estimateFlemishInheritanceTax(100_000, 0)).toBe(0);
  });
});
