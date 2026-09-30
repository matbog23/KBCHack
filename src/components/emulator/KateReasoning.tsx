"use client";

import { Check, Circle, X } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mccLabel } from "@/config/mcc";
import { PERSONAS } from "@/config/personas";
import { type LifeMomentStatus, type LifeMomentTrace, traceLifeMoments } from "@/engine/kateEngine";
import { type MatchSource, markerLabel, recogniseTransaction } from "@/engine/signals";
import { formatDayMonth, formatSignedEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type EngineLogEntry, useKbcStore } from "@/store/useKbcStore";
import type { PaymentChannel, PSD2Transaction } from "@/types/psd2";

const CHANNEL_LABEL: Record<PaymentChannel, string> = {
  card: "Card payment",
  transfer: "SEPA transfer",
  "direct-debit": "SEPA direct debit",
};

const SOURCE_LABEL: Record<MatchSource, string> = {
  mcc: "MCC",
  counterparty: "name",
  remittance: "message",
};

/** "Gynaecologist or midwife (name + MCC)", or why nothing was recognised. */
function recognitionSummary(tx: PSD2Transaction): { text: string; recognised: boolean } {
  const matches = recogniseTransaction(tx);
  if (matches.length > 0) {
    return {
      recognised: true,
      text: matches
        .map((match) => {
          const sources = match.sources.map((source) => SOURCE_LABEL[source]).join(" + ");
          return `${markerLabel(match.marker)} (${sources})`;
        })
        .join(", "),
    };
  }
  const mcc = tx.channel === "card" ? tx.merchantCategoryCode : undefined;
  return {
    recognised: false,
    text: mcc
      ? `everyday spending · MCC ${mcc} ${mccLabel(mcc) ?? ""}`.trim()
      : "everyday payment · no life-event words",
  };
}

const STATUS: Record<LifeMomentStatus, { label: string; className: string }> = {
  "not-eligible": { label: "Not applicable", className: "bg-dash-surface text-dash-faint" },
  watching: { label: "Watching", className: "border border-dash-line text-dash-muted" },
  detected: { label: "Moment detected", className: "bg-kbc-blue text-white" },
  handled: { label: "Done · customer said yes", className: "bg-emerald-600 text-white" },
};

function counterparty(tx: { amount: number; debtorName?: string; creditorName: string }): string {
  return tx.amount > 0 ? (tx.debtorName ?? tx.creditorName) : tx.creditorName;
}

function MomentBlock({ trace, age }: { trace: LifeMomentTrace; age: number }) {
  const status = STATUS[trace.status];
  const eligible = trace.status !== "not-eligible";

  return (
    <div className={cn("flex flex-col gap-3", !eligible && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium">{trace.label}</h3>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", status.className)}>
          {status.label}
        </span>
      </div>
      <p className="flex items-center gap-2 text-[13px] text-dash-muted">
        {trace.eligibility.met ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <X className="size-3.5 text-dash-faint" aria-hidden="true" />
        )}
        {trace.eligibility.label} · customer is {age}
      </p>
      {eligible && (
        <>
          <p className="text-[12px] text-dash-faint">{trace.requirement}</p>
          <ul className="flex flex-col gap-2">
            {trace.signals.map((signal) => (
              <li key={signal.id} className="flex gap-2.5">
                {signal.met ? (
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-kbc-blue">
                    <Check className="size-2.5 text-white" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-dash-line" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className={cn("text-sm", signal.met ? "text-dash-ink" : "text-dash-muted")}>
                    {signal.label}
                  </p>
                  {signal.evidence.slice(0, 2).map((tx) => (
                    <p key={tx.transactionId} className="truncate text-[12px] text-dash-faint">
                      {formatDayMonth(tx.bookingDate)} · {counterparty(tx)} ·{" "}
                      {formatSignedEuro(tx.amount)}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Step({
  index,
  label,
  value,
  active,
}: {
  index: number;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          active ? "bg-kbc-blue text-white" : "bg-dash-surface text-dash-muted",
        )}
      >
        {index}
      </span>
      <p className="min-w-0 truncate text-[13px]">
        <span className="text-dash-muted">{label} </span>
        <span className={active ? "font-medium text-kbc-blue" : "text-dash-ink"}>{value}</span>
      </p>
    </li>
  );
}

function LastDecision({ entry }: { entry: Extract<EngineLogEntry, { kind: "ingested" }> }) {
  const tx = entry.transaction;
  const recognition = recognitionSummary(tx);
  const [raised] = entry.raisedAlerts;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">
        Last transaction
      </p>
      <ol className="flex flex-col gap-2">
        <Step
          index={1}
          label={`${CHANNEL_LABEL[tx.channel]} booked`}
          value={`${counterparty(tx)} ${formatSignedEuro(tx.amount)}`}
        />
        <Step
          index={2}
          label="Recognised as"
          value={recognition.text}
          active={recognition.recognised}
        />
        <Step
          index={3}
          label="Kate"
          value={
            raised
              ? `pushed “${raised.eyebrow.replace(/^\w+ · /, "")}” to the phone`
              : "no new moment"
          }
          active={Boolean(raised)}
        />
      </ol>
    </div>
  );
}

function ActivityEntry({ entry }: { entry: EngineLogEntry }) {
  switch (entry.kind) {
    case "ingested":
      return (
        <>
          {counterparty(entry.transaction)} {formatSignedEuro(entry.transaction.amount)}
          {entry.raisedAlerts.length > 0 && <span className="text-kbc-blue"> → Kate moment</span>}
        </>
      );
    case "rejected":
      return <span className="text-rose-600">Payload rejected ({entry.errors.length} errors)</span>;
    case "persona":
      return <>Switched to {PERSONAS[entry.personaId].persona.name}</>;
    case "product":
      return <span className="text-emerald-700">{entry.summary}</span>;
  }
}

export function KateReasoning() {
  const transactions = useKbcStore((state) => state.transactions);
  const persona = useKbcStore((state) => state.activePersona);
  const log = useKbcStore((state) => state.log);

  const traces = useMemo(() => {
    const all = traceLifeMoments(transactions, persona);
    // Show the scenario that applies to this customer first.
    return [...all].sort(
      (a, b) => Number(b.status !== "not-eligible") - Number(a.status !== "not-eligible"),
    );
  }, [transactions, persona]);

  const lastIngested = log.find(
    (entry): entry is Extract<EngineLogEntry, { kind: "ingested" }> => entry.kind === "ingested",
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle>How Kate decides</CardTitle>
          <p className="mt-1 text-[13px] text-dash-muted">
            Every booked transaction is read and checked live.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {traces.map((trace, index) => (
          <div key={trace.id} className={cn(index > 0 && "border-t border-dash-line pt-5")}>
            <MomentBlock trace={trace} age={persona.age} />
          </div>
        ))}
        {lastIngested && (
          <div className="border-t border-dash-line pt-5">
            <LastDecision entry={lastIngested} />
          </div>
        )}
        {log.length > 0 && (
          <details className="group border-t border-dash-line pt-4">
            <summary className="cursor-pointer list-none text-[13px] text-dash-muted hover:text-dash-ink">
              Activity log ({log.length})
            </summary>
            <ol className="mt-2 flex flex-col gap-1.5 text-[13px]">
              {log.slice(0, 12).map((entry) => (
                <li key={entry.id} className="truncate">
                  <ActivityEntry entry={entry} />
                </li>
              ))}
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
