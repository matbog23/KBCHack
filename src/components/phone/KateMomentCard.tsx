"use client";

import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { cn } from "@/lib/utils";
import { useKbcStore } from "@/store/useKbcStore";
import type { KateAlert } from "@/types/psd2";

interface KateMomentCardProps {
  alert: KateAlert;
  onAccept: (alert: KateAlert) => void;
  onExplain: (alert: KateAlert) => void;
  /** Briefly pulses the card, e.g. after tapping the push notification. */
  spotlight?: boolean;
}

/** Kate's life-moment card: KBC cyan, navy type, one clear yes. */
export function KateMomentCard({ alert, onAccept, onExplain, spotlight }: KateMomentCardProps) {
  const dismissAlert = useKbcStore((state) => state.dismissAlert);

  return (
    <article
      aria-label={alert.title}
      className={cn(
        "relative overflow-hidden rounded-[22px] bg-kbc-blue px-[26px] pb-[24px] pt-[26px] text-kbc-navy shadow-[0_18px_40px_-18px_rgba(0,163,224,0.9)] duration-700 animate-in fade-in slide-in-from-top-6",
        spotlight && "ring-4 ring-white/70",
      )}
    >
      {/* Brand motif from the sketch: a ring around a softer disc, bleeding off the corner. */}
      <span className="pointer-events-none absolute -right-[58px] -top-[58px] size-[200px] rounded-full border-[22px] border-white/25" />
      <span className="pointer-events-none absolute -right-[18px] -top-[18px] size-[120px] rounded-full bg-[#0B8CC4]/45" />

      <div className="relative flex flex-col gap-[12px]">
        <p className="flex items-center gap-[8px] text-[14px] font-semibold uppercase tracking-[0.14em] text-kbc-navy/85">
          <FigmaIcon src={FIGMA_ASSETS.kateMark} className="size-[14px]" />
          {alert.eyebrow}
        </p>
        <h2 className="max-w-[360px] text-[27px] font-bold leading-[1.18] tracking-[-0.01em]">
          {alert.title}
        </h2>
        <p className="text-[18px] leading-[1.5] text-kbc-navy/85">{alert.description}</p>

        <div className="mt-[8px] flex items-center gap-[22px]">
          <button
            type="button"
            onClick={() => onAccept(alert)}
            className="h-[58px] rounded-full bg-kbc-navy px-[30px] text-[19px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(0,45,98,0.8)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {alert.ctaText}
          </button>
          <button
            type="button"
            onClick={() => dismissAlert(alert.id)}
            className="text-[19px] font-bold text-kbc-navy transition-opacity hover:opacity-75"
          >
            Niet nu
          </button>
        </div>
        <button
          type="button"
          onClick={() => onExplain(alert)}
          className="self-start text-[16px] font-medium text-kbc-navy underline decoration-1 underline-offset-[5px]"
        >
          Waarom zie ik dit?
        </button>
      </div>
    </article>
  );
}
