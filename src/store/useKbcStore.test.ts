import { beforeEach, describe, expect, it } from "vitest";
import { PERSONAS } from "@/config/personas";
import { DRAFT_PRESETS } from "@/config/presets";
import type { TransactionDraft } from "@/psd2/berlinGroup";
import { useKbcStore } from "@/store/useKbcStore";

function preset(id: string): TransactionDraft {
  const found = DRAFT_PRESETS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown preset ${id}`);
  return found.draft;
}

const store = () => useKbcStore.getState();

describe("useKbcStore", () => {
  beforeEach(() => {
    store().setPersona("emma");
    store().resetSimulation();
  });

  describe("PSD2 ingestion", () => {
    it("a card payment is booked from its Berlin Group payload and debits checking", () => {
      const before = store().activePersona.checkingBalance;
      const result = store().submitDraft(preset("groceries"));

      expect(result).toMatchObject({ ok: true, raisedAlerts: [] });
      expect(store().transactions[0]).toMatchObject({
        transactionId: "sim-emma-0001",
        creditDebitIndicator: "DBIT",
        channel: "card",
        merchantCategoryCode: "5411",
        isSimulated: true,
      });
      expect(store().activePersona.checkingBalance).toBeCloseTo(before - 42.17, 2);
      expect(store().lastPayload).toMatchObject({
        transactionAmount: { currency: "EUR", amount: "-42.17" },
        bankTransactionCode: "PMNT-CCRD-POSD",
        kbcCardDetails: { merchantCategoryCode: "5411" },
      });
      expect(store().lastPayload).not.toHaveProperty("merchantCategoryCode");
      expect(store().notification).toBeNull();
    });

    it("books incoming grants to the persona's own account", () => {
      store().submitDraft(preset("kraamgeld"));
      expect(store().transactions[0]).toMatchObject({
        creditDebitIndicator: "CRDT",
        creditorName: PERSONAS.emma.persona.name,
        creditorIban: PERSONAS.emma.persona.checkingIban,
        debtorName: "FONS Groeipakket",
        channel: "transfer",
      });
    });

    it("books a direct debit with its SEPA code and no MCC", () => {
      store().submitDraft(preset("childcare"));
      expect(store().transactions[0]).toMatchObject({
        channel: "direct-debit",
        bankTransactionCode: "PMNT-RDDT-ESDD",
        merchantCategoryCode: undefined,
      });
    });

    it("rejects invalid raw payloads and logs why, without touching the ledger", () => {
      const before = store().transactions.length;
      expect(store().ingestPayload({ transactionId: "x" }).ok).toBe(false);
      expect(store().transactions).toHaveLength(before);
      expect(store().log[0]).toMatchObject({ kind: "rejected" });
    });

    it("rejects a transaction id that is already booked", () => {
      const seedId = PERSONAS.emma.transactions[0]?.transactionId ?? "";
      const result = store().ingestPayload({
        transactionId: seedId,
        bookingDate: "2026-09-30",
        transactionAmount: { currency: "EUR", amount: "-5.00" },
        creditorName: "Duplicate",
      });
      expect(result).toEqual({ ok: false, errors: [`transaction "${seedId}" is already booked.`] });
    });
  });

  describe("scenario 1: young mum", () => {
    it("a GP visit, same doctor's MCC as a gynaecologist, is booked but raises nothing", () => {
      const result = store().submitDraft(preset("gp"));
      expect(result).toMatchObject({ ok: true, raisedAlerts: [] });
      expect(store().notification).toBeNull();
    });

    it("a gynaecologist card payment pushes a baby-on-the-way moment", () => {
      store().submitDraft(preset("gynecology"));
      expect(store().notification?.alert).toMatchObject({
        ruleId: "new-child",
        eyebrow: "Moment · Kindje op komst",
      });
    });

    it("an unrelated payment after a moment does not push it again", () => {
      store().submitDraft(preset("gynecology"));
      const sequence = store().notification?.sequence;
      store().submitDraft(preset("groceries"));
      expect(store().notification?.sequence).toBe(sequence);
    });

    it("a maternity hospital bill pushes the new-child moment", () => {
      const result = store().submitDraft(preset("maternity"));
      expect(result.ok && result.raisedAlerts.map((alert) => alert.ruleId)).toEqual(["new-child"]);
      expect(store().notification?.alert.flow).toBe("open-child-account");
    });

    it("a second signal re-notifies with higher priority", () => {
      store().submitDraft(preset("maternity"));
      const first = store().notification?.sequence;
      store().submitDraft(preset("childcare"));
      expect(store().notification?.sequence).not.toBe(first);
      expect(store().activeAlerts[0]).toMatchObject({ ruleId: "new-child", priority: "high" });
    });

    it("opening the child account moves money and ends the moment", () => {
      store().submitDraft(preset("kraamgeld"));
      const checkingBefore = store().activePersona.checkingBalance;

      const account = store().openChildAccount({
        name: "Spaarrekening Lou",
        kind: "savings",
        monthlyContribution: 50,
        initialDeposit: 1_350,
      });

      expect(store().kateAccountBalances).toEqual([
        expect.objectContaining({ id: account.id, balance: 1_350 }),
      ]);
      expect(store().activePersona.checkingBalance).toBeCloseTo(checkingBefore - 1_350, 2);
      expect(store().activePersona.ownedProducts).toContain("child-account");
      expect(store().activeAlerts.map((alert) => alert.ruleId)).not.toContain("new-child");
    });

    it("childcare after the account is open suggests insuring the child", () => {
      store().openChildAccount({
        name: "Lou",
        kind: "savings",
        monthlyContribution: 25,
        initialDeposit: 0,
      });
      store().submitDraft(preset("childcare"));
      expect(store().activeAlerts[0]?.ruleId).toBe("childcare-hospitalisation");
    });
  });

  describe("scenario 2: elderly customer", () => {
    beforeEach(() => store().setPersona("jan"));

    it("switching to Jan raises nothing until a life event arrives", () => {
      expect(store().activeAlerts).toEqual([]);
      expect(store().notification).toBeNull();
    });

    it("a hospital bill pushes the estate moment", () => {
      store().submitDraft(preset("hospital"));
      expect(store().notification?.alert).toMatchObject({
        ruleId: "successieplanning",
        flow: "estate-planner",
        priority: "high",
      });
    });

    it("a notary about a will pushes the estate moment too", () => {
      store().submitDraft(preset("notary-estate"));
      expect(store().notification?.alert.ruleId).toBe("successieplanning");
    });

    it("requesting advice closes the moment", () => {
      store().submitDraft(preset("hospital"));
      store().requestEstateAdvice({ heirs: 2, giftAmount: 150_000 });
      expect(store().activeAlerts).toEqual([]);
      expect(store().log[0]).toMatchObject({ kind: "product" });
    });
  });

  describe("housekeeping", () => {
    it("rejects a raw payload that puts the MCC where Berlin Group has none", () => {
      const result = store().ingestPayload({
        transactionId: "raw-1",
        bookingDate: "2026-09-30",
        transactionAmount: { currency: "EUR", amount: "-65.00" },
        creditorName: "Dr. Peeters Gynaecologie",
        merchantCategoryCode: "8011",
      });
      expect(result.ok).toBe(false);
      expect(store().log[0]).toMatchObject({ kind: "rejected" });
    });

    it("dismissed alerts stay hidden until newer evidence arrives", () => {
      store().submitDraft(preset("maternity"));
      store().dismissAlert("new-child:emma");
      expect(store().activeAlerts).toEqual([]);
      store().submitDraft(preset("childcare"));
      expect(store().activeAlerts[0]?.ruleId).toBe("new-child");
    });

    it("switching persona resets ledger, accounts and log", () => {
      store().submitDraft(preset("maternity"));
      store().openChildAccount({
        name: "Lou",
        kind: "savings",
        monthlyContribution: 25,
        initialDeposit: 0,
      });
      store().setPersona("jan");
      expect(store()).toMatchObject({
        ingestedTransactions: [],
        kateAccounts: [],
        lastPayload: null,
      });
      expect(store().transactions).toHaveLength(PERSONAS.jan.transactions.length);
    });
  });
});
