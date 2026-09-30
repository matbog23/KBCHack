import { beforeEach, describe, expect, it } from "vitest";
import { TRANSACTION_INJECTORS } from "@/config/injectors";
import { PERSONAS } from "@/config/personas";
import { useKbcStore } from "@/store/useKbcStore";

function injector(id: string) {
  const found = TRANSACTION_INJECTORS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown injector ${id}`);
  return found.template;
}

describe("useKbcStore", () => {
  beforeEach(() => {
    useKbcStore.getState().setPersona("emma");
    useKbcStore.getState().resetSimulation();
  });

  it("injecting a gynecology visit surfaces the Pamperrekening banner and debits checking", () => {
    const before = useKbcStore.getState().activePersona.checkingBalance;
    const tx = useKbcStore.getState().injectTransaction(injector("gynecology"));
    const state = useKbcStore.getState();

    expect(state.transactions[0]).toEqual(tx);
    expect(tx).toMatchObject({ creditDebitIndicator: "DBIT", isSimulated: true });
    expect(state.activePersona.checkingBalance).toBeCloseTo(before - 65, 2);
    expect(state.activeAlerts[0]?.ruleId).toBe("pamperrekening");
  });

  it("books incoming grants to the persona's own account", () => {
    const tx = useKbcStore.getState().injectTransaction(injector("kraamgeld"));
    expect(tx).toMatchObject({
      creditDebitIndicator: "CRDT",
      creditorName: PERSONAS.emma.persona.name,
      creditorIban: PERSONAS.emma.persona.checkingIban,
      debtorName: "FONS Groeipakket",
    });
  });

  it("time jumps accumulate savings and eventually trigger the investment up-sell", () => {
    const { simulateTimeJump } = useKbcStore.getState();
    simulateTimeJump(1);
    expect(useKbcStore.getState().activeAlerts).toEqual([]);

    simulateTimeJump(12);
    const state = useKbcStore.getState();
    expect(state.activePersona.savingsBalance).toBe(12_000 + 450 * 12);
    expect(state.activeAlerts.map((alert) => alert.ruleId)).toContain("idle-savings-invest");
  });

  it("clamps time jumps to the supported range", () => {
    useKbcStore.getState().simulateTimeJump(999);
    expect(useKbcStore.getState().monthsElapsed).toBe(36);
    useKbcStore.getState().simulateTimeJump(-5);
    expect(useKbcStore.getState().monthsElapsed).toBe(0);
  });

  it("dismissed alerts stay hidden until newer evidence arrives", () => {
    useKbcStore.getState().setPersona("jan");
    const [estate] = useKbcStore.getState().activeAlerts;
    expect(estate?.ruleId).toBe("successieplanning");

    useKbcStore.getState().dismissAlert(estate?.id ?? "");
    expect(useKbcStore.getState().activeAlerts).toEqual([]);

    useKbcStore.getState().injectTransaction(injector("notary"));
    const [resurfaced] = useKbcStore.getState().activeAlerts;
    expect(resurfaced).toMatchObject({ ruleId: "successieplanning", priority: "high" });
  });

  it("legal and insurance payments escalate Jan's alert, but hospital payments need consent", () => {
    useKbcStore.getState().setPersona("jan");
    useKbcStore.getState().injectTransaction(injector("hospital"));
    expect(useKbcStore.getState().activeAlerts[0]).toMatchObject({
      ruleId: "successieplanning",
      priority: "medium",
      evidenceTransactionIds: [],
    });

    const legal = useKbcStore.getState().injectTransaction(injector("legal"));
    expect(useKbcStore.getState().activeAlerts[0]).toMatchObject({
      priority: "high",
      evidenceTransactionIds: [legal.transactionId],
    });

    const insurance = useKbcStore.getState().injectTransaction(injector("insurance"));
    expect(useKbcStore.getState().activeAlerts[0]?.evidenceTransactionIds).toEqual([
      insurance.transactionId,
      legal.transactionId,
    ]);
  });

  it("switching persona resets injected transactions and the clock", () => {
    useKbcStore.getState().injectTransaction(injector("gynecology"));
    useKbcStore.getState().simulateTimeJump(6);
    useKbcStore.getState().setPersona("jan");
    const state = useKbcStore.getState();

    expect(state.injectedTransactions).toEqual([]);
    expect(state.monthsElapsed).toBe(0);
    expect(state.transactions).toHaveLength(PERSONAS.jan.transactions.length);
  });
});
