import { create } from "zustand";
import { DEFAULT_PERSONA_ID, DEMO_ANCHOR_DATE, PERSONAS } from "@/config/personas";
import { evaluateKateRules } from "@/engine/kateEngine";
import { belgianIban } from "@/lib/iban";
import {
  type BerlinGroupTransaction,
  buildBerlinGroupTransaction,
  parseBerlinGroupPayload,
  type TransactionDraft,
} from "@/psd2/berlinGroup";
import type {
  ISODateTime,
  KateAlert,
  KateProductId,
  PersonaId,
  PSD2Transaction,
  UserPersona,
} from "@/types/psd2";

const MAX_LOG_ENTRIES = 40;

export type EngineLogEntry =
  | {
      id: string;
      kind: "ingested";
      at: ISODateTime;
      transaction: PSD2Transaction;
      raisedAlerts: KateAlert[];
    }
  | { id: string; kind: "rejected"; at: ISODateTime; errors: string[] }
  | {
      id: string;
      kind: "persona";
      at: ISODateTime;
      personaId: PersonaId;
      raisedAlerts: KateAlert[];
    }
  | { id: string; kind: "product"; at: ISODateTime; summary: string };

/** An account opened from a Kate moment, in the customer's own name. */
export interface KateAccount {
  id: string;
  name: string;
  kind: "savings" | "investment";
  iban: string;
  monthlyContribution: number;
  initialDeposit: number;
}

export interface KateAccountWithBalance extends KateAccount {
  balance: number;
}

export interface OpenChildAccountInput {
  name: string;
  kind: KateAccount["kind"];
  monthlyContribution: number;
  initialDeposit: number;
}

export interface EstateAdviceInput {
  heirs: number;
  giftAmount: number;
}

export interface KateNotification {
  alert: KateAlert;
  /** Increments on every notification so the phone replays the banner even for the same alert. */
  sequence: number;
}

export type IngestResult =
  | { ok: true; transactions: PSD2Transaction[]; raisedAlerts: KateAlert[] }
  | { ok: false; errors: string[] };

interface SimulationInputs {
  personaId: PersonaId;
  /** Transactions entered on the dashboard and booked on the account, newest first. */
  ingestedTransactions: PSD2Transaction[];
  /** Alert id → detectedAt at the moment it was dismissed. Newer evidence resurfaces it. */
  dismissedAlerts: Record<string, ISODateTime>;
  kateAccounts: KateAccount[];
  estateAdvice: EstateAdviceInput | null;
}

interface DerivedState {
  activePersona: UserPersona;
  /** Accounts opened through Kate, with their balances. */
  kateAccountBalances: KateAccountWithBalance[];
  /** Seed + ingested transactions, newest first. */
  transactions: PSD2Transaction[];
  /** Every alert the engine currently raises, newest signal first. */
  allAlerts: KateAlert[];
  /** Alerts the user has not dismissed. */
  activeAlerts: KateAlert[];
  simulatedNow: ISODateTime;
}

interface SessionState {
  /** Monotonic counter for transaction ids, booking times and notifications. */
  sequence: number;
  /** The last payload that went over the wire, exactly as the ASPSP would send it. */
  lastPayload: BerlinGroupTransaction | null;
  notification: KateNotification | null;
  log: EngineLogEntry[];
}

interface KbcActions {
  setPersona: (personaId: PersonaId) => void;
  /** Builds a Berlin Group payload from the form and pushes it through the same ingestion path. */
  submitDraft: (draft: TransactionDraft) => IngestResult;
  /** Ingests a raw Berlin Group payload: a single transaction or a `transactions` response. */
  ingestPayload: (payload: unknown) => IngestResult;
  dismissAlert: (alertId: string) => void;
  /** Scenario 1: opens an account for the child in the parent's name. */
  openChildAccount: (input: OpenChildAccountInput) => KateAccount;
  /** Scenario 2: records a request for an estate-planning conversation. */
  requestEstateAdvice: (input: EstateAdviceInput) => void;
  clearNotification: () => void;
  resetSimulation: () => void;
}

export type KbcState = SimulationInputs & DerivedState & SessionState & KbcActions;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function byBookingDateDesc(a: PSD2Transaction, b: PSD2Transaction): number {
  return Date.parse(b.bookingDate) - Date.parse(a.bookingDate);
}

/** Books every transaction on the persona's account and re-runs Kate over the full history. */
function derive(inputs: SimulationInputs): DerivedState {
  const { persona: base, transactions: seedTransactions } = PERSONAS[inputs.personaId];
  const ingestedNet = inputs.ingestedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Money moved into Kate accounts leaves the checking account.
  const kateAccountBalances = inputs.kateAccounts.map((account) => ({
    ...account,
    balance: roundCents(account.initialDeposit),
  }));
  const movedToKateAccounts = kateAccountBalances.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  const ownedProducts: KateProductId[] = [
    ...base.ownedProducts,
    ...(inputs.kateAccounts.length > 0 ? (["child-account"] as const) : []),
    ...(inputs.estateAdvice ? (["estate-advice"] as const) : []),
  ];

  const activePersona: UserPersona = {
    ...base,
    ownedProducts,
    checkingBalance: roundCents(base.checkingBalance + ingestedNet - movedToKateAccounts),
  };

  const transactions = [...inputs.ingestedTransactions, ...seedTransactions].sort(
    byBookingDateDesc,
  );
  // Evaluate "now": the anchor date, or the latest booking if the ledger has moved past it.
  const latestBooking = transactions[0]?.bookingDate;
  const asOf =
    latestBooking && Date.parse(latestBooking) > Date.parse(DEMO_ANCHOR_DATE)
      ? latestBooking
      : DEMO_ANCHOR_DATE;
  const allAlerts = evaluateKateRules(transactions, activePersona, { asOf });
  const activeAlerts = allAlerts.filter((alert) => {
    const dismissedAt = inputs.dismissedAlerts[alert.id];
    return dismissedAt === undefined || Date.parse(alert.detectedAt) > Date.parse(dismissedAt);
  });

  return {
    activePersona,
    kateAccountBalances,
    transactions,
    allAlerts,
    activeAlerts,
    simulatedNow: DEMO_ANCHOR_DATE,
  };
}

/**
 * What makes an alert "new" for notification purposes: its rule, evidence and priority.
 * A new piece of evidence or a priority bump re-notifies; re-evaluating the same facts does not.
 */
function alertSignature(alert: KateAlert): string {
  return `${alert.id}|${alert.priority}|${alert.evidenceTransactionIds.join(",")}`;
}

function newlyRaised(before: readonly KateAlert[], after: readonly KateAlert[]): KateAlert[] {
  const seen = new Set(before.map(alertSignature));
  return after.filter((alert) => !seen.has(alertSignature(alert)));
}

function initialInputs(personaId: PersonaId): SimulationInputs {
  return {
    personaId,
    ingestedTransactions: [],
    dismissedAlerts: {},
    kateAccounts: [],
    estateAdvice: null,
  };
}

function freshSession(): SessionState {
  return { sequence: 0, lastPayload: null, notification: null, log: [] };
}

function inputsOf(state: KbcState): SimulationInputs {
  return {
    personaId: state.personaId,
    ingestedTransactions: state.ingestedTransactions,
    dismissedAlerts: state.dismissedAlerts,
    kateAccounts: state.kateAccounts,
    estateAdvice: state.estateAdvice,
  };
}

function appendLog(log: readonly EngineLogEntry[], entry: EngineLogEntry): EngineLogEntry[] {
  return [entry, ...log].slice(0, MAX_LOG_ENTRIES);
}

/** Booking time of the next transaction: one simulated minute after the previous one. */
function arrivalTime(state: KbcState, sequence: number): ISODateTime {
  return new Date(Date.parse(state.simulatedNow) + sequence * 60_000).toISOString();
}

export const useKbcStore = create<KbcState>()((set, get) => {
  /** Recomputes derived state and, if Kate raised something new, queues a push notification. */
  function commit(
    inputs: SimulationInputs,
    session: Pick<SessionState, "sequence" | "lastPayload" | "log">,
    makeLogEntry: (raisedAlerts: KateAlert[]) => EngineLogEntry | null,
  ): KateAlert[] {
    const state = get();
    const derived = derive(inputs);
    const raisedAlerts = newlyRaised(state.activeAlerts, derived.activeAlerts);
    const [headline] = raisedAlerts;
    const entry = makeLogEntry(raisedAlerts);
    set({
      ...inputs,
      ...derived,
      ...session,
      log: entry ? appendLog(session.log, entry) : session.log,
      notification: headline ? { alert: headline, sequence: session.sequence } : state.notification,
    });
    return raisedAlerts;
  }

  return {
    ...initialInputs(DEFAULT_PERSONA_ID),
    ...derive(initialInputs(DEFAULT_PERSONA_ID)),
    ...freshSession(),

    setPersona: (personaId) => {
      const state = get();
      if (personaId === state.personaId) return;
      const sequence = state.sequence + 1;
      // Compare against an empty inbox: a new customer's standing insights count as new.
      set({ activeAlerts: [], notification: null });
      commit(initialInputs(personaId), { ...freshSession(), sequence }, (raisedAlerts) => ({
        id: `log-${sequence}`,
        kind: "persona",
        at: derive(initialInputs(personaId)).simulatedNow,
        personaId,
        raisedAlerts,
      }));
    },

    submitDraft: (draft) => {
      const state = get();
      const persona = state.activePersona;
      const sequence = state.sequence + 1;
      const payload = buildBerlinGroupTransaction(draft, {
        transactionId: `sim-${state.personaId}-${String(sequence).padStart(4, "0")}`,
        bookingDate: arrivalTime(state, sequence).slice(0, 10),
        accountHolder: { name: persona.name, iban: persona.checkingIban },
      });
      // Round-trip through JSON so the form takes exactly the same path as a raw payload.
      return get().ingestPayload(JSON.parse(JSON.stringify(payload)));
    },

    ingestPayload: (payload) => {
      const state = get();
      const sequence = state.sequence + 1;
      const receivedAt = arrivalTime(state, sequence);
      const persona = state.activePersona;
      const parsed = parseBerlinGroupPayload(payload, {
        accountHolder: { name: persona.name, iban: persona.checkingIban },
        receivedAt,
      });

      const known = new Set(state.transactions.map((tx) => tx.transactionId));
      const duplicateErrors = parsed.ok
        ? parsed.transactions
            .filter((tx) => known.has(tx.transactionId))
            .map((tx) => `transaction "${tx.transactionId}" is already booked.`)
        : [];
      const errors = parsed.ok ? duplicateErrors : parsed.errors;

      if (!parsed.ok || errors.length > 0) {
        set({
          sequence,
          log: appendLog(state.log, {
            id: `log-${sequence}`,
            kind: "rejected",
            at: receivedAt,
            errors,
          }),
        });
        return { ok: false, errors };
      }

      const raisedAlerts = commit(
        {
          ...inputsOf(state),
          ingestedTransactions: [...parsed.transactions, ...state.ingestedTransactions],
        },
        {
          sequence,
          lastPayload: isBerlinGroupTransaction(payload) ? payload : state.lastPayload,
          log: state.log,
        },
        () => null,
      );

      // One log line per booked transaction; the raised alerts belong to the last one.
      let log = get().log;
      parsed.transactions.forEach((transaction, index) => {
        const isLast = index === parsed.transactions.length - 1;
        log = appendLog(log, {
          id: `log-${sequence}-${index}`,
          kind: "ingested",
          at: receivedAt,
          transaction,
          raisedAlerts: isLast ? raisedAlerts : [],
        });
      });
      set({ log });

      return { ok: true, transactions: parsed.transactions, raisedAlerts };
    },

    dismissAlert: (alertId) => {
      const state = get();
      const alert = state.allAlerts.find((candidate) => candidate.id === alertId);
      if (!alert) return;
      const inputs: SimulationInputs = {
        ...inputsOf(state),
        dismissedAlerts: { ...state.dismissedAlerts, [alertId]: alert.detectedAt },
      };
      set({
        ...inputs,
        ...derive(inputs),
        notification: state.notification?.alert.id === alertId ? null : state.notification,
      });
    },

    openChildAccount: (input) => {
      const state = get();
      const sequence = state.sequence + 1;
      const account: KateAccount = {
        id: `kate-account-${sequence}`,
        name: input.name.trim() || "Spaarrekening kindje",
        kind: input.kind,
        iban: belgianIban("735", `20${String(sequence).padStart(5, "0")}`),
        monthlyContribution: Math.max(0, input.monthlyContribution),
        initialDeposit: Math.max(
          0,
          Math.min(input.initialDeposit, state.activePersona.checkingBalance),
        ),
      };
      commit(
        { ...inputsOf(state), kateAccounts: [...state.kateAccounts, account] },
        { sequence, lastPayload: state.lastPayload, log: state.log },
        () => ({
          id: `log-${sequence}`,
          kind: "product",
          at: state.simulatedNow,
          summary: `Opened “${account.name}” (${account.kind}) · €${account.monthlyContribution}/month`,
        }),
      );
      return account;
    },

    requestEstateAdvice: (input) => {
      const state = get();
      const sequence = state.sequence + 1;
      commit(
        { ...inputsOf(state), estateAdvice: input },
        { sequence, lastPayload: state.lastPayload, log: state.log },
        () => ({
          id: `log-${sequence}`,
          kind: "product",
          at: state.simulatedNow,
          summary: `Estate-planning call requested · ${input.heirs} heirs · gift €${input.giftAmount}`,
        }),
      );
    },

    clearNotification: () => set({ notification: null }),

    resetSimulation: () => {
      const inputs = initialInputs(get().personaId);
      set({ ...inputs, ...derive(inputs), ...freshSession() });
    },
  };
});

function isBerlinGroupTransaction(payload: unknown): payload is BerlinGroupTransaction {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "transactionId" in payload &&
    "transactionAmount" in payload
  );
}
