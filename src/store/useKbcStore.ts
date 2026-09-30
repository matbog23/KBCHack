import { create } from "zustand";
import type { TransactionTemplate } from "@/config/injectors";
import { DEFAULT_PERSONA_ID, DEMO_ANCHOR_DATE, PERSONAS } from "@/config/personas";
import { evaluateKateRules } from "@/engine/kateEngine";
import { addMonths } from "@/lib/format";
import type { ISODateTime, KateAlert, PersonaId, PSD2Transaction, UserPersona } from "@/types/psd2";

export const MAX_TIME_JUMP_MONTHS = 36;

interface SimulationInputs {
  personaId: PersonaId;
  monthsElapsed: number;
  injectedTransactions: PSD2Transaction[];
  /** Alert id → detectedAt at the moment it was dismissed. Newer evidence resurfaces it. */
  dismissedAlerts: Record<string, ISODateTime>;
}

interface DerivedState {
  activePersona: UserPersona;
  /** Seed + injected transactions, newest first. */
  transactions: PSD2Transaction[];
  /** Every alert the engine currently raises, newest signal first. */
  allAlerts: KateAlert[];
  /** Alerts the user has not dismissed. */
  activeAlerts: KateAlert[];
  simulatedNow: ISODateTime;
}

interface KbcActions {
  setPersona: (personaId: PersonaId) => void;
  injectTransaction: (template: TransactionTemplate) => PSD2Transaction;
  /** Moves the simulation clock to `months` after the demo anchor date (absolute, not relative). */
  simulateTimeJump: (months: number) => void;
  dismissAlert: (alertId: string) => void;
  resetSimulation: () => void;
}

export type KbcState = SimulationInputs & DerivedState & KbcActions;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function byBookingDateDesc(a: PSD2Transaction, b: PSD2Transaction): number {
  return Date.parse(b.bookingDate) - Date.parse(a.bookingDate);
}

/** Projects the persona's balances forward and re-runs Kate over the resulting history. */
function derive(inputs: SimulationInputs): DerivedState {
  const { persona: base, transactions: seedTransactions } = PERSONAS[inputs.personaId];
  const months = inputs.monthsElapsed;

  const monthlyCheckingDrift =
    base.monthlyNetIncome - base.monthlyFixedCosts - base.monthlySavingsContribution;
  const injectedNet = inputs.injectedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const activePersona: UserPersona = {
    ...base,
    checkingBalance: roundCents(base.checkingBalance + monthlyCheckingDrift * months + injectedNet),
    savingsBalance: roundCents(base.savingsBalance + base.monthlySavingsContribution * months),
  };

  const simulatedNow = addMonths(DEMO_ANCHOR_DATE, months);
  const transactions = [...inputs.injectedTransactions, ...seedTransactions].sort(
    byBookingDateDesc,
  );
  const allAlerts = evaluateKateRules(transactions, activePersona, { asOf: simulatedNow });
  const activeAlerts = allAlerts.filter((alert) => {
    const dismissedAt = inputs.dismissedAlerts[alert.id];
    return dismissedAt === undefined || Date.parse(alert.detectedAt) > Date.parse(dismissedAt);
  });

  return { activePersona, transactions, allAlerts, activeAlerts, simulatedNow };
}

function initialInputs(personaId: PersonaId): SimulationInputs {
  return { personaId, monthsElapsed: 0, injectedTransactions: [], dismissedAlerts: {} };
}

function withDerived(inputs: SimulationInputs): SimulationInputs & DerivedState {
  return { ...inputs, ...derive(inputs) };
}

function inputsOf(state: KbcState): SimulationInputs {
  return {
    personaId: state.personaId,
    monthsElapsed: state.monthsElapsed,
    injectedTransactions: state.injectedTransactions,
    dismissedAlerts: state.dismissedAlerts,
  };
}

export const useKbcStore = create<KbcState>()((set, get) => ({
  ...withDerived(initialInputs(DEFAULT_PERSONA_ID)),

  setPersona: (personaId) => {
    if (personaId === get().personaId) return;
    set(withDerived(initialInputs(personaId)));
  },

  injectTransaction: (template) => {
    const state = get();
    const sequence = state.injectedTransactions.length + 1;
    // Each injection lands one minute after the previous one on the simulated clock,
    // so the feed order and the engine's "newest signal" ordering stay deterministic.
    const bookingDate = new Date(Date.parse(state.simulatedNow) + sequence * 60_000).toISOString();
    const isCredit = template.amount > 0;
    const persona = state.activePersona;

    const transaction: PSD2Transaction = {
      transactionId: `sim-${state.personaId}-${String(sequence).padStart(4, "0")}`,
      bookingDate,
      valueDate: bookingDate,
      bookingStatus: "booked",
      currency: "EUR",
      creditDebitIndicator: isCredit ? "CRDT" : "DBIT",
      isSimulated: true,
      ...template,
      creditorName: isCredit ? persona.name : template.creditorName,
      creditorIban: isCredit ? persona.checkingIban : template.creditorIban,
    };

    set(
      withDerived({
        ...inputsOf(state),
        injectedTransactions: [transaction, ...state.injectedTransactions],
      }),
    );
    return transaction;
  },

  simulateTimeJump: (months) => {
    const clamped = Math.min(MAX_TIME_JUMP_MONTHS, Math.max(0, Math.round(months)));
    const state = get();
    if (clamped === state.monthsElapsed) return;
    set(withDerived({ ...inputsOf(state), monthsElapsed: clamped }));
  },

  dismissAlert: (alertId) => {
    const state = get();
    const alert = state.allAlerts.find((candidate) => candidate.id === alertId);
    if (!alert) return;
    set(
      withDerived({
        ...inputsOf(state),
        dismissedAlerts: { ...state.dismissedAlerts, [alertId]: alert.detectedAt },
      }),
    );
  },

  resetSimulation: () => {
    set(withDerived(initialInputs(get().personaId)));
  },
}));
