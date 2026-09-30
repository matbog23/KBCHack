"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { RULE_ICONS } from "@/components/phone/ForYouSection";
import { recogniseTransaction } from "@/engine/signals";
import { formatDayMonthNumeric, formatKbcAmount } from "@/lib/format";
import { useKbcStore } from "@/store/useKbcStore";
import type { KateAlert, KateTriggerSource, PaymentChannel, PSD2Transaction } from "@/types/psd2";

const CONFIRMATION_MS = 1_600;

const TRIGGER_EXPLANATION: Record<KateTriggerSource, string> = {
  PAYMENT_PATTERN: "Kate herkende deze betalingen:",
  INCOMING_CREDIT: "Kate herkende deze inkomende betaling:",
  LIFE_STAGE: "Kate combineerde je leeftijd met deze recente betalingen:",
};

const CHANNEL_NL: Record<PaymentChannel, string> = {
  card: "Kaartbetaling",
  transfer: "Overschrijving",
  "direct-debit": "Domiciliëring",
};

/** "Overschrijving · herkend aan „kraamafdeling”", so the customer sees exactly what Kate read. */
function evidenceLine(tx: PSD2Transaction): string {
  const words = recogniseTransaction(tx).flatMap((match) => match.matchedText);
  const unique = [...new Set(words)];
  const recognised = unique.length > 0 ? ` · herkend aan „${unique.join("”, „")}”` : "";
  const mcc =
    tx.channel === "card" && tx.merchantCategoryCode ? ` · MCC ${tx.merchantCategoryCode}` : "";
  return `${CHANNEL_NL[tx.channel]}${mcc}${recognised}`;
}

/** Bottom sheet with the full insight, the evidence behind it, and the product call-to-action. */
export function KateSheet({
  alert,
  onClose,
  onAccept,
  initiallyAccepted = false,
}: {
  alert: KateAlert;
  onClose: () => void;
  /** Opens the product flow for alerts that have one. */
  onAccept: (alert: KateAlert) => void;
  /** For simple alerts the card's "yes" lands here, straight on the confirmation. */
  initiallyAccepted?: boolean;
}) {
  const transactions = useKbcStore((state) => state.transactions);
  const dismissAlert = useKbcStore((state) => state.dismissAlert);
  const [accepted, setAccepted] = useState(initiallyAccepted);
  const Icon = RULE_ICONS[alert.ruleId];
  const evidence = transactions.filter((tx) =>
    alert.evidenceTransactionIds.includes(tx.transactionId),
  );

  useEffect(() => {
    if (!accepted) return;
    const timer = window.setTimeout(() => {
      dismissAlert(alert.id);
      onClose();
    }, CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [accepted, alert.id, dismissAlert, onClose]);

  return (
    <div className="absolute inset-0 z-[45] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 duration-300 animate-in fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={alert.title}
        className="relative flex flex-col gap-[22px] rounded-t-[40px] bg-app-card px-[30px] pb-[56px] pt-[14px] duration-500 animate-in slide-in-from-bottom"
      >
        <span className="mx-auto h-[5px] w-[54px] rounded-full bg-app-line" />
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[64px] items-center justify-center rounded-[20px] bg-app-chip">
            <Icon className="size-[34px] text-app-text" strokeWidth={1.4} aria-hidden="true" />
          </span>
          <span className="flex items-center gap-[7px] text-[15px] font-semibold text-app-subtle">
            <FigmaIcon src={FIGMA_ASSETS.kateMark} className="size-[16px]" />
            Kate · voor jou
          </span>
        </div>
        <div className="flex flex-col gap-[10px]">
          <h2 className="text-[27px] font-bold leading-[1.2] text-app-text">{alert.title}</h2>
          <p className="text-[18px] leading-[1.55] text-app-subtle">{alert.description}</p>
        </div>

        <div className="flex flex-col gap-[12px] rounded-[16px] bg-app-bg p-[18px]">
          <p className="text-[15px] font-semibold text-app-text">Waarom zie ik dit?</p>
          <p className="text-[13px] leading-[1.45] text-app-muted">
            Kate gebruikt je eigen betalingen alleen om je op het juiste moment te helpen. Je kan
            dit altijd uitzetten in je privacy-instellingen.
          </p>
          <p className="text-[15px] leading-[1.45] text-app-muted">
            {TRIGGER_EXPLANATION[alert.triggerSource]}
          </p>
          {evidence.map((tx) => (
            <div key={tx.transactionId} className="flex items-center gap-[12px] text-[15px]">
              <span className="w-[44px] shrink-0 text-app-muted">
                {formatDayMonthNumeric(tx.bookingDate)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-app-text">
                  {tx.amount > 0 ? (tx.debtorName ?? tx.creditorName) : tx.creditorName}
                </span>
                <span className="block truncate text-[13px] text-app-muted">
                  {evidenceLine(tx)}
                </span>
              </span>
              <span className="shrink-0 text-app-text tabular-nums">
                {formatKbcAmount(tx.amount)} <span className="text-[11px]">EUR</span>
              </span>
            </div>
          ))}
        </div>

        {accepted ? (
          <p className="flex h-[60px] items-center justify-center gap-[10px] rounded-[30px] bg-app-green text-[19px] font-semibold text-white duration-300 animate-in fade-in">
            <Check className="size-[24px]" aria-hidden="true" />
            We openen {alert.ctaText.charAt(0).toLowerCase() + alert.ctaText.slice(1)}
          </p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            <button
              type="button"
              onClick={() => (alert.flow === "confirm" ? setAccepted(true) : onAccept(alert))}
              className="h-[60px] rounded-[30px] bg-app-blue text-[19px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {alert.ctaText}
            </button>
            <button
              type="button"
              onClick={() => {
                dismissAlert(alert.id);
                onClose();
              }}
              className="h-[48px] text-[17px] font-semibold text-app-blue"
            >
              Niet nu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
