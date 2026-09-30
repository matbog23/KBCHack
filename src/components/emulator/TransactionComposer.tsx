"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Braces,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Repeat,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { PersonaSwitch } from "@/components/emulator/PersonaSwitch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MCC_OPTIONS } from "@/config/mcc";
import { EMPTY_DRAFT, presetsFor } from "@/config/presets";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type BerlinGroupTransaction,
  buildBerlinGroupTransaction,
  type DraftField,
  isDebitPaymentType,
  normalizeAmount,
  type PaymentType,
  REMITTANCE_MAX_LENGTH,
  type TransactionDraft,
  validateDraft,
} from "@/psd2/berlinGroup";
import { type IngestResult, useKbcStore } from "@/store/useKbcStore";

/** Short pause so the payment visibly "travels" to the bank before the phone reacts. */
const PROCESSING_MS = 650;
const CUSTOM_MCC = "custom";
const RESULT_VISIBLE_MS = 5_000;

type Mode = "form" | "json";

const PAYMENT_TYPES: ReadonlyArray<{ value: PaymentType; label: string; icon: ReactNode }> = [
  { value: "card", label: "Card", icon: <CreditCard className="size-3.5" /> },
  { value: "transfer-out", label: "Transfer", icon: <ArrowUpRight className="size-3.5" /> },
  { value: "direct-debit", label: "Direct debit", icon: <Repeat className="size-3.5" /> },
  { value: "transfer-in", label: "Money in", icon: <ArrowDownLeft className="size-3.5" /> },
];

const COUNTERPARTY_LABEL: Record<PaymentType, string> = {
  card: "Merchant",
  "transfer-out": "Beneficiary (who you pay)",
  "direct-debit": "Creditor (who collects)",
  "transfer-in": "Payer (who pays you)",
};

function useNextPayloadContext() {
  const sequence = useKbcStore((state) => state.sequence);
  const personaId = useKbcStore((state) => state.personaId);
  const simulatedNow = useKbcStore((state) => state.simulatedNow);
  const persona = useKbcStore((state) => state.activePersona);
  return useMemo(() => {
    const next = sequence + 1;
    return {
      transactionId: `sim-${personaId}-${String(next).padStart(4, "0")}`,
      bookingDate: new Date(Date.parse(simulatedNow) + next * 60_000).toISOString().slice(0, 10),
      accountHolder: { name: persona.name, iban: persona.checkingIban },
    };
  }, [sequence, personaId, simulatedNow, persona]);
}

function previewPayload(
  draft: TransactionDraft,
  context: ReturnType<typeof useNextPayloadContext>,
): BerlinGroupTransaction | null {
  if (normalizeAmount(draft.amount) === null) return null;
  return buildBerlinGroupTransaction(draft, context);
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-full bg-dash-surface p-1"
    >
      {options.map((option) => (
        // biome-ignore lint/a11y/useSemanticElements: segmented control styled as pills
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-white font-medium text-dash-ink shadow-sm"
              : "text-dash-muted hover:text-dash-ink",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] text-dash-muted">
          {label}
        </label>
        {hint && <span className="text-[11px] text-dash-faint">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const INPUT =
  "h-11 w-full rounded-2xl border border-dash-line bg-white px-4 text-[15px] text-dash-ink outline-none transition-shadow placeholder:text-dash-faint focus:border-kbc-blue focus:ring-4 focus:ring-kbc-blue/15";

export function TransactionComposer() {
  const id = useId();
  const submitDraft = useKbcStore((state) => state.submitDraft);
  const ingestPayload = useKbcStore((state) => state.ingestPayload);
  const nextContext = useNextPayloadContext();

  const [mode, setMode] = useState<Mode>("form");
  const personaId = useKbcStore((state) => state.personaId);
  const presets = presetsFor(personaId);
  const [draft, setDraft] = useState<TransactionDraft>(presets[0]?.draft ?? EMPTY_DRAFT);
  const [customMcc, setCustomMcc] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [touched, setTouched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  // Each customer starts from their own first example.
  useEffect(() => {
    setDraft(presetsFor(personaId)[0]?.draft ?? EMPTY_DRAFT);
    setCustomMcc(false);
    setResult(null);
    setTouched(false);
  }, [personaId]);

  // Success messages fade on their own; errors stay until the input changes.
  useEffect(() => {
    if (!result?.ok) return;
    const timer = window.setTimeout(() => setResult(null), RESULT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  const errors = validateDraft(draft);
  const visibleErrors: Partial<Record<DraftField, string>> = touched ? errors : {};
  const payload = useMemo(() => previewPayload(draft, nextContext), [draft, nextContext]);
  const amount = normalizeAmount(draft.amount);
  const isDebit = isDebitPaymentType(draft.paymentType);
  const isCard = draft.paymentType === "card";

  const update = <K extends DraftField>(field: K, value: TransactionDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setResult(null);
  };

  const switchMode = (next: Mode) => {
    if (next === "json") setJsonText(JSON.stringify(payload ?? {}, null, 2));
    setMode(next);
    setResult(null);
  };

  const submit = () => {
    setTouched(true);
    let run: () => IngestResult;
    if (mode === "form") {
      if (Object.keys(errors).length > 0) return;
      run = () => submitDraft(draft);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        setResult({ ok: false, errors: ["The payload is not valid JSON."] });
        return;
      }
      run = () => ingestPayload(parsed);
    }
    setProcessing(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(run());
      setProcessing(false);
    }, PROCESSING_MS);
  };

  const selectValue = customMcc ? CUSTOM_MCC : draft.merchantCategoryCode;
  const payLabel =
    mode === "json"
      ? "Book payload"
      : amount === null
        ? isDebit
          ? "Pay"
          : "Receive"
        : isDebit
          ? `Pay ${formatEuro(Number(amount))}`
          : `Receive ${formatEuro(Number(amount))}`;

  return (
    <Card>
      <CardHeader className="flex-wrap p-5 pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle>New transaction</CardTitle>
          <p className="text-sm text-dash-muted">
            Booked on the customer&apos;s KBC current account · Berlin Group format
          </p>
        </div>
        <Segmented
          label="Input mode"
          value={mode}
          onChange={switchMode}
          options={[
            { value: "form", label: "Form" },
            { value: "json", label: "Raw JSON", icon: <Braces className="size-3.5" /> },
          ]}
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <PersonaSwitch />

        {mode === "form" ? (
          <>
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-dash-surface px-6 py-4">
              <Segmented
                label="Payment type"
                value={draft.paymentType}
                onChange={(paymentType) => update("paymentType", paymentType)}
                options={PAYMENT_TYPES}
              />
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-light text-dash-faint">€</span>
                <input
                  id={`${id}-amount`}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Amount in euro"
                  value={draft.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  placeholder="0,00"
                  style={{ width: `${Math.max(draft.amount.length, 4) + 0.5}ch` }}
                  className="min-w-0 max-w-full bg-transparent text-5xl font-medium tracking-tight text-dash-ink outline-none placeholder:text-dash-faint"
                />
              </div>
              {visibleErrors.amount && (
                <p className="text-xs text-rose-600">{visibleErrors.amount}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px] text-dash-muted">Examples</span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDraft(preset.draft);
                    setCustomMcc(false);
                    setResult(null);
                  }}
                  className="rounded-full border border-dash-line bg-white px-3 py-1 text-[13px] text-dash-ink transition-colors hover:border-kbc-blue hover:text-kbc-blue"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={COUNTERPARTY_LABEL[draft.paymentType]}
                htmlFor={`${id}-name`}
                error={visibleErrors.counterpartyName}
              >
                <input
                  id={`${id}-name`}
                  className={INPUT}
                  value={draft.counterpartyName}
                  onChange={(event) => update("counterpartyName", event.target.value)}
                  placeholder={isDebit ? "Dr. Peeters Gynaecologie" : "FONS Groeipakket"}
                />
              </Field>
              {!isCard && (
                <Field
                  label="Counterparty IBAN"
                  hint="required for SEPA"
                  htmlFor={`${id}-iban`}
                  error={visibleErrors.counterpartyIban}
                >
                  <input
                    id={`${id}-iban`}
                    className={cn(INPUT, "font-mono text-sm uppercase")}
                    value={draft.counterpartyIban}
                    onChange={(event) => update("counterpartyIban", event.target.value)}
                    placeholder="BE71 0961 2345 6769"
                  />
                </Field>
              )}
              {isCard && (
                <Field
                  label="MCC code"
                  hint="ISO 18245"
                  htmlFor={`${id}-mcc`}
                  error={visibleErrors.merchantCategoryCode}
                >
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <select
                        id={`${id}-mcc`}
                        className={cn(INPUT, "appearance-none truncate pr-10")}
                        value={selectValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === CUSTOM_MCC) {
                            setCustomMcc(true);
                            update("merchantCategoryCode", "");
                          } else {
                            setCustomMcc(false);
                            update("merchantCategoryCode", value);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Choose the merchant&apos;s code
                        </option>
                        <optgroup label="Can support a Kate signal">
                          {MCC_OPTIONS.filter((option) => option.isKateSignal).map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.code} · {option.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Everyday spending">
                          {MCC_OPTIONS.filter((option) => !option.isKateSignal).map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.code} · {option.label}
                            </option>
                          ))}
                        </optgroup>
                        <option value={CUSTOM_MCC}>Other code…</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-dash-muted"
                        aria-hidden="true"
                      />
                    </div>
                    {customMcc && (
                      <input
                        aria-label="Custom MCC"
                        inputMode="numeric"
                        maxLength={4}
                        className={cn(INPUT, "w-24 shrink-0 text-center font-mono")}
                        value={draft.merchantCategoryCode}
                        onChange={(event) =>
                          update("merchantCategoryCode", event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="0000"
                      />
                    )}
                  </div>
                </Field>
              )}
              {isCard ? (
                <p className="text-[12px] leading-relaxed text-dash-faint sm:col-span-2">
                  The card scheme tells KBC the merchant&apos;s category code (MCC). A card payment
                  has no free-text message: the statement line is generated from the merchant name.
                </p>
              ) : (
                <div className="sm:col-span-2">
                  <Field
                    label="Payment message (mededeling)"
                    hint={`${draft.remittanceInformation.length}/${REMITTANCE_MAX_LENGTH}`}
                    htmlFor={`${id}-remittance`}
                    error={visibleErrors.remittanceInformation}
                  >
                    <input
                      id={`${id}-remittance`}
                      className={INPUT}
                      value={draft.remittanceInformation}
                      onChange={(event) => update("remittanceInformation", event.target.value)}
                      placeholder="Factuur 2026/48213"
                    />
                  </Field>
                </div>
              )}
            </div>

            <details className="group rounded-2xl border border-dash-line bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[13px] text-dash-muted">
                <span className="flex items-center gap-2">
                  <Braces className="size-3.5" aria-hidden="true" />
                  Show the payload the bank feed will carry
                </span>
                <span className="font-mono text-[11px] text-dash-faint">
                  {nextContext.transactionId}
                </span>
              </summary>
              <pre className="scrollbar-hide max-h-64 overflow-auto border-t border-dash-line px-4 py-3 font-mono text-[12px] leading-relaxed text-dash-ink">
                {payload
                  ? JSON.stringify(payload, null, 2)
                  : "// Enter an amount to build the payload"}
              </pre>
            </details>
          </>
        ) : (
          <Field
            label="Berlin Group transaction, or a full { transactions: { booked: [...] } } response"
            htmlFor={`${id}-json`}
          >
            <textarea
              id={`${id}-json`}
              spellCheck={false}
              value={jsonText}
              onChange={(event) => {
                setJsonText(event.target.value);
                setResult(null);
              }}
              className="scrollbar-hide min-h-[420px] w-full rounded-2xl border border-dash-line bg-white p-4 font-mono text-[12px] leading-relaxed text-dash-ink outline-none focus:border-kbc-blue focus:ring-4 focus:ring-kbc-blue/15"
            />
          </Field>
        )}

        <div className="relative">
          {result && (
            <div
              role="status"
              className={cn(
                "absolute inset-x-0 bottom-[calc(100%+10px)] z-10 flex items-start gap-3 rounded-2xl px-4 py-2.5 text-[13px] shadow-lg duration-300 animate-in fade-in slide-in-from-bottom-1",
                result.ok ? "bg-[#E3F4FB] text-dash-ink" : "bg-rose-50 text-rose-700",
              )}
            >
              {result.ok ? (
                <Check className="mt-0.5 size-4 shrink-0 text-kbc-blue" aria-hidden="true" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              {result.ok ? (
                <p>
                  Booked{" "}
                  <span className="font-mono text-xs">
                    {result.transactions.map((tx) => tx.transactionId).join(", ")}
                  </span>
                  {result.raisedAlerts.length > 0
                    ? ` · Kate raised ${result.raisedAlerts.map((alert) => `“${alert.title}”`).join(", ")}`
                    : " · no Kate rule matched"}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={processing}
            className="flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-kbc-blue text-lg font-semibold text-white shadow-[0_12px_30px_-10px_rgba(0,163,224,0.7)] transition-[background-color,transform] hover:bg-kbc-blue-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
          >
            {processing ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Booking…
              </>
            ) : (
              payLabel
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
