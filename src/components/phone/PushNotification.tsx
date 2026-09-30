"use client";

import { useEffect } from "react";
import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { useKbcStore } from "@/store/useKbcStore";
import type { KateAlert } from "@/types/psd2";

const VISIBLE_MS = 6_500;

/** iOS-style banner that drops in when Kate raises a new insight. */
export function PushNotification({ onOpen }: { onOpen: (alert: KateAlert) => void }) {
  const notification = useKbcStore((state) => state.notification);
  const clearNotification = useKbcStore((state) => state.clearNotification);
  // Prefer the live alert, so figures stay in sync when the time machine keeps moving.
  const liveAlert = useKbcStore((state) =>
    state.activeAlerts.find((candidate) => candidate.id === state.notification?.alert.id),
  );

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(clearNotification, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [notification, clearNotification]);

  if (!notification) return null;
  const { sequence } = notification;
  const alert = liveAlert ?? notification.alert;

  return (
    <button
      key={sequence}
      type="button"
      onClick={() => {
        clearNotification();
        onOpen(alert);
      }}
      className="absolute inset-x-[14px] top-[74px] z-50 flex gap-[14px] rounded-[34px] border border-white/10 bg-[#2c2f33]/85 p-[18px] text-left shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl duration-500 animate-in fade-in slide-in-from-top-12"
    >
      <span className="flex size-[54px] shrink-0 items-center justify-center rounded-[14px] bg-kbc-navy">
        <span className="text-[15px] font-black tracking-tight text-white">KBC</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center justify-between gap-[10px]">
          <span className="flex items-center gap-[6px] text-[16px] font-semibold uppercase tracking-wide text-app-subtle">
            KBC Mobile
          </span>
          <span className="text-[15px] text-app-muted">nu</span>
        </span>
        <span className="flex items-center gap-[7px] text-[18px] font-semibold text-white">
          <FigmaIcon src={FIGMA_ASSETS.kateMark} className="size-[14px]" />
          <span className="truncate">{alert.title}</span>
        </span>
        <span className="line-clamp-2 text-[16px] leading-[1.35] text-[#d4d5d6]">
          {alert.description}
        </span>
      </span>
    </button>
  );
}
