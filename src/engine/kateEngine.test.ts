import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/config/personas";
import {
  estatePlanningScore,
  estimateFlemishInheritanceTax,
  estimateTaxWithGift,
  evaluateKateRules,
  KATE_THRESHOLDS,
  traceLifeMoments,
} from "@/engine/kateEngine";
import { AS_OF, daysEarlier, directDebit, SAMPLE, transferOut } from "@/engine/testTransactions";
import type { PSD2Transaction, UserPersona } from "@/types/psd2";

const emma = PERSONAS.emma.persona;
const jan = PERSONAS.jan.persona;

function evaluate(transactions: PSD2Transaction[], persona: UserPersona) {
  return evaluateKateRules(transactions, persona, { asOf: AS_OF });
}

function ruleIds(transactions: PSD2Transaction[], persona: UserPersona): string[] {
  return evaluate(transactions, persona).map((alert) => alert.ruleId);
}

describe("seed data", () => {
  it("raises nothing for Emma, and only Jan's consented, declared-interest estate moment", () => {
    expect(evaluateKateRules(PERSONAS.emma.transactions, emma)).toEqual([]);
    expect(evaluateKateRules(PERSONAS.jan.transactions, jan)).toEqual([
      expect.objectContaining({ ruleId: "successieplanning", priority: "medium" }),
    ]);
  });
});

describe("scenario 1: a young mum and a new child", () => {
  it.each([
    ["gynaecologist visit", SAMPLE.gynaecologist],
    ["maternity-ward invoice", SAMPLE.maternity],
    ["Groeipakket birth grant", SAMPLE.birthGrant],
    ["childcare direct debit", SAMPLE.childcare],
  ])("a %s alone raises the new-child moment", (_, tx) => {
    expect(ruleIds([tx], emma)).toEqual(["new-child"]);
  });

  it("a GP visit with the same doctor's MCC raises nothing", () => {
    expect(ruleIds([SAMPLE.gpVisit], emma)).toEqual([]);
  });

  it("a hospital bill without anything about a birth is not a new-child signal", () => {
    expect(ruleIds([SAMPLE.hospital], emma)).toEqual([]);
  });

  it("offers to open an account for the child, high priority on two signals", () => {
    const [alert] = evaluate([SAMPLE.maternity, SAMPLE.childcare], emma);
    expect(alert).toMatchObject({
      id: "new-child:emma",
      flow: "open-child-account",
      actionType: "OPEN_ACCOUNT",
      triggerSource: "PAYMENT_PATTERN",
      priority: "high",
      evidenceTransactionIds: ["tx-maternity", "tx-creche"],
    });
  });

  it("speaks of a baby on the way when only a gynaecologist was seen", () => {
    const [alert] = evaluate([SAMPLE.gynaecologist], emma);
    expect(alert?.eyebrow).toBe("Moment · Kindje op komst");
    expect(alert?.priority).toBe("medium");
  });

  it("mentions the birth grant amount and marks it as an incoming credit", () => {
    const [alert] = evaluate([SAMPLE.birthGrant], emma);
    expect(alert?.triggerSource).toBe("INCOMING_CREDIT");
    expect(alert?.description).toMatch(/startbedrag van €\s1\.350/);
  });

  it("stops once the child account is open, and moves on to insurance", () => {
    const withAccount: UserPersona = { ...emma, ownedProducts: ["child-account"] };
    expect(ruleIds([SAMPLE.maternity], withAccount)).toEqual([]);
    expect(ruleIds([SAMPLE.childcare], withAccount)).toEqual(["childcare-hospitalisation"]);
  });

  it("ignores refunds and customers outside family age", () => {
    const refund = { ...SAMPLE.childcare, amount: 540, creditDebitIndicator: "CRDT" as const };
    expect(ruleIds([refund], emma)).toEqual([]);
    expect(ruleIds([SAMPLE.childcare], jan)).not.toContain("new-child");
  });

  it("counts family signals for 12 months, not forever", () => {
    const days = KATE_THRESHOLDS.familyLookbackDays;
    expect(ruleIds([daysEarlier(SAMPLE.gynaecologist, days - 5)], emma)).toEqual(["new-child"]);
    expect(ruleIds([daysEarlier(SAMPLE.gynaecologist, days + 5)], emma)).toEqual([]);
  });
});

describe("scenario 2: estate planning (consent + fixed demo score)", () => {
  const lawyer = transferOut("Advocatenkantoor Peeters", "Ereloon juridisch advies", 180, {
    transactionId: "tx-lawyer",
  });
  const lifeInsurance = directDebit(
    "Atlas Verzekeringen NV",
    "Premie levensverzekering tak 21",
    120,
    {
      transactionId: "tx-insurance",
    },
  );

  function estate(transactions: PSD2Transaction[], persona: UserPersona) {
    return evaluate(transactions, persona).find((alert) => alert.ruleId === "successieplanning");
  }

  it("fires for Jan on consent, age, assets and declared interest, at medium priority", () => {
    expect(estate([], jan)).toMatchObject({
      id: "successieplanning:jan",
      flow: "estate-planner",
      triggerSource: "LIFE_STAGE",
      priority: "medium",
      evidenceTransactionIds: [],
    });
    expect(estatePlanningScore([], jan, AS_OF).probability).toBeCloseTo(0.5, 5);
  });

  it("requires outreach consent even when every signal is present", () => {
    expect(estate([SAMPLE.notaryEstate], { ...jan, estateOutreachConsent: false })).toBeUndefined();
  });

  it("without declared interest, age and assets alone stay silent; a payment tips it", () => {
    const noInterest = { ...jan, estatePlanningInterest: false };
    expect(estate([], noInterest)).toBeUndefined();
    expect(estate([SAMPLE.notaryEstate], noInterest)).toMatchObject({ priority: "high" });
  });

  it("a young customer with modest assets stays silent", () => {
    expect(estate([], { ...jan, age: 28, savingsBalance: 40_000 })).toBeUndefined();
  });

  it("counts savings growth only with a known year-old balance", () => {
    const persona = { ...jan, age: 64, savingsBalance12MonthsAgo: 425_000 };
    expect(estate([], persona)).toBeDefined();
    expect(estate([], { ...persona, savingsBalance12MonthsAgo: undefined })).toBeUndefined();
  });

  it.each([
    ["notary about a will", SAMPLE.notaryEstate],
    ["lawyer", lawyer],
    ["life-insurance premium", lifeInsurance],
  ])("a %s is a payment signal that makes it high priority", (_, payment) => {
    expect(estate([payment], jan)).toMatchObject({
      priority: "high",
      triggerSource: "PAYMENT_PATTERN",
      evidenceTransactionIds: [payment.transactionId],
    });
  });

  it("ignores hospital bills without separate health-signal consent", () => {
    expect(estate([SAMPLE.hospital], jan)).toMatchObject({
      priority: "medium",
      evidenceTransactionIds: [],
    });
    expect(estate([SAMPLE.hospital], { ...jan, healthSignalConsent: true })).toMatchObject({
      priority: "high",
      evidenceTransactionIds: ["tx-hospital"],
    });
  });

  it("never mentions the hospital in the customer-facing copy", () => {
    const alert = estate([SAMPLE.hospital], { ...jan, healthSignalConsent: true });
    expect(`${alert?.title} ${alert?.description}`).not.toMatch(/ziekenhuis|hospital/i);
  });

  it("a notary for a purchase is not estate evidence", () => {
    expect(estate([SAMPLE.notaryHome], jan)?.evidenceTransactionIds).toEqual([]);
  });

  it("ignores stale, future, pending and refunded payments", () => {
    const ignored: PSD2Transaction[] = [
      daysEarlier(SAMPLE.notaryEstate, 400),
      daysEarlier(SAMPLE.notaryEstate, -2),
      { ...SAMPLE.notaryEstate, bookingStatus: "pending" },
      { ...SAMPLE.notaryEstate, amount: 250, creditDebitIndicator: "CRDT" },
    ];
    for (const payment of ignored) {
      expect(estate([payment], jan)?.evidenceTransactionIds).toEqual([]);
    }
  });

  it("stops once an estate conversation was requested", () => {
    expect(
      estate([SAMPLE.notaryEstate], { ...jan, ownedProducts: ["estate-advice"] }),
    ).toBeUndefined();
  });

  // Open decisions from the incoming model: both cases score -0.1 (47.5%), above the 45% cutoff,
  // yet were meant to stay silent. A higher cutoff would break the savings-growth case above.
  it.todo("decide: a wealthy customer under 65 with only declared interest should stay silent");
  it.todo("decide: a notary payment alone with modest assets should stay silent");
});

describe("home purchase (notary under 65)", () => {
  it("a deposit to a notary for an apartment raises the home-loan moment", () => {
    expect(ruleIds([SAMPLE.notaryHome], emma)).toEqual(["home-purchase"]);
  });

  it("a notary about an inheritance does not", () => {
    expect(ruleIds([SAMPLE.notaryEstate], emma)).toEqual([]);
  });

  it("with an unclear message, only a deposit-sized amount counts", () => {
    const fee = transferOut("Notaris Claes", "Ereloon dossier 2026/118", 350);
    const deposit = transferOut("Notaris Claes", "Dossier 2026/118", 25_000);
    expect(ruleIds([fee], emma)).toEqual([]);
    expect(ruleIds([deposit], emma)).toEqual(["home-purchase"]);
  });
});

describe("renovation", () => {
  it("detects contractor works above the threshold only", () => {
    const repair = transferOut("Bouwbedrijf Maes BV", "Herstelling dakgoot", 300);
    expect(ruleIds([repair], emma)).toEqual([]);
    expect(ruleIds([SAMPLE.contractor], emma)).toEqual(["renovation"]);
  });
});

describe("engine properties", () => {
  it("is pure: identical input yields identical output and inputs are not mutated", () => {
    const input = [SAMPLE.gynaecologist, SAMPLE.notaryHome];
    const snapshot = structuredClone(input);
    expect(evaluate(input, emma)).toEqual(evaluate(input, emma));
    expect(input).toEqual(snapshot);
  });

  it("orders alerts by newest evidence, then priority", () => {
    const older = daysEarlier(SAMPLE.contractor, 10);
    expect(ruleIds([older, SAMPLE.gynaecologist], emma)).toEqual(["new-child", "renovation"]);
  });
});

describe("traceLifeMoments", () => {
  it("shows Emma watching for family signals and ineligible for estate planning", () => {
    const [child, estate] = traceLifeMoments([], emma);
    expect(child).toMatchObject({ id: "new-child", status: "watching" });
    expect(child?.signals.every((s) => !s.met)).toBe(true);
    expect(estate).toMatchObject({ id: "estate", status: "not-eligible" });
  });

  it("marks the signals that fired, with their evidence", () => {
    const [child] = traceLifeMoments([SAMPLE.maternity], emma, { asOf: AS_OF });
    expect(child?.status).toBe("detected");
    expect(child?.signals.find((s) => s.id === "maternity")?.evidence).toEqual([SAMPLE.maternity]);
  });

  it("shows Jan's estate moment detected from age, assets and declared interest", () => {
    const [, estate] = traceLifeMoments([], jan, { asOf: AS_OF });
    expect(estate?.status).toBe("detected");
    expect(estate?.signals.filter((s) => s.met).map((s) => s.id)).toEqual([
      "age",
      "assets",
      "interest",
    ]);
  });

  it("marks estate planning not applicable without outreach consent", () => {
    const [, estate] = traceLifeMoments([], { ...jan, estateOutreachConsent: false });
    expect(estate?.status).toBe("not-eligible");
  });

  it("reports handled once the product exists", () => {
    const [child] = traceLifeMoments(
      [SAMPLE.maternity],
      { ...emma, ownedProducts: ["child-account"] },
      { asOf: AS_OF },
    );
    expect(child?.status).toBe("handled");
  });
});

describe("tax estimates", () => {
  it("applies 3% / 9% / 27% direct-line brackets per heir", () => {
    // One heir, €300k: 50k × 3% + 200k × 9% + 50k × 27% = 1,500 + 18,000 + 13,500
    expect(estimateFlemishInheritanceTax(300_000, 1)).toBe(33_000);
    expect(estimateFlemishInheritanceTax(100_000, 2)).toBe(3_000);
    expect(estimateFlemishInheritanceTax(0, 2)).toBe(0);
  });

  it("a registered gift today is taxed at 3% and lowers the estate that is inherited", () => {
    const withoutGift = estimateFlemishInheritanceTax(458_000, 2);
    const withGift = estimateTaxWithGift(458_000, 200_000, 2);
    expect(withGift).toBe(6_000 + estimateFlemishInheritanceTax(258_000, 2));
    expect(withGift).toBeLessThan(withoutGift);
  });

  it("clamps gifts to the estate", () => {
    expect(estimateTaxWithGift(100_000, 500_000, 2)).toBe(3_000);
  });
});
