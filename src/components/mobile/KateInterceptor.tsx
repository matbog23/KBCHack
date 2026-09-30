"use client";

import { CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKbcStore } from "@/store/useKbcStore";
import type { KateAlert, KateProductLine } from "@/types/psd2";

const PRODUCT_LINE_LABEL: Record<KateProductLine, string> = {
  bank: "Banking",
  insurance: "Insurance",
  investment: "Investing",
};

/** How long the "opening…" confirmation stays visible before the card clears. */
const LAUNCH_CONFIRMATION_MS = 1_800;

function InterceptorCard({ alert, moreCount }: { alert: KateAlert; moreCount: number }) {
  const dismissAlert = useKbcStore((state) => state.dismissAlert);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (!launched) return;
    const timer = window.setTimeout(() => dismissAlert(alert.id), LAUNCH_CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [launched, alert.id, dismissAlert]);

  return (
    <section
      aria-live="polite"
      aria-label="Kate suggestion"
      className="relative overflow-hidden rounded-2xl border border-kbc-blue/30 bg-white p-4 shadow-kate duration-500 animate-in fade-in slide-in-from-top-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kbc-blue to-kbc-navy" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-kbc-blue text-white animate-kate-pulse">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-kbc-navy">Kate</p>
            <p className="text-[11px] text-kbc-muted">Predictive insight</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge>{PRODUCT_LINE_LABEL[alert.productLine]}</Badge>
          <button
            type="button"
            onClick={() => dismissAlert(alert.id)}
            className="grid size-7 place-items-center rounded-full text-kbc-muted transition-colors hover:bg-kbc-gray hover:text-kbc-navy"
            aria-label="Dismiss suggestion"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <h2 className="mt-3 text-[15px] font-semibold leading-snug text-kbc-navy">{alert.title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-kbc-muted">{alert.description}</p>

      {launched ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-kbc-blue-soft px-3 py-2.5 text-[13px] font-medium text-kbc-blue-hover animate-in fade-in">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Opening {alert.ctaText.toLowerCase()}…
        </p>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <Button className="flex-1" onClick={() => setLaunched(true)}>
            {alert.ctaText}
            <ChevronRight />
          </Button>
          <Button variant="ghost" onClick={() => dismissAlert(alert.id)}>
            Not now
          </Button>
        </div>
      )}

      {moreCount > 0 && (
        <p className="mt-3 text-center text-[11px] font-medium text-kbc-muted">
          +{moreCount} more {moreCount === 1 ? "insight" : "insights"} from Kate below
        </p>
      )}
    </section>
  );
}

export function KateInterceptor() {
  const activeAlerts = useKbcStore((state) => state.activeAlerts);
  const [current] = activeAlerts;
  if (!current) return null;

  // Keying on detectedAt replays the slide-down whenever a signal is (re)detected.
  return (
    <InterceptorCard
      key={`${current.id}@${current.detectedAt}`}
      alert={current}
      moreCount={activeAlerts.length - 1}
    />
  );
}

export function KateInsightList() {
  const activeAlerts = useKbcStore((state) => state.activeAlerts);
  const rest = activeAlerts.slice(1);
  if (rest.length === 0) return null;

  return (
    <section aria-label="More suggestions from Kate" className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-kbc-muted">
        More from Kate
      </h2>
      {rest.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center gap-3 rounded-xl border border-kbc-line bg-white p-3 duration-300 animate-in fade-in"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-kbc-blue-soft text-kbc-blue">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-kbc-navy">{alert.title}</p>
            <p className="truncate text-[11px] text-kbc-muted">{alert.ctaText}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-kbc-muted" aria-hidden="true" />
        </div>
      ))}
    </section>
  );
}
