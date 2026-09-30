"use client";

import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { useKbcStore } from "@/store/useKbcStore";

const SHORTCUTS = [
  { label: "MyNWS", icon: FIGMA_ASSETS.newspaper },
  { label: "MyHome", icon: FIGMA_ASSETS.shortcutHouse },
  { label: "MyMobility", icon: FIGMA_ASSETS.signpost },
] as const;

/** Figma 10:3135: pinned above the scrolling content, like the iOS status bar. */
export function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-40 flex h-[64px] items-center justify-between bg-app-bg pl-[53px] pr-[47px] pt-[20px]">
      <div className="flex items-center gap-[6px]">
        <p className="text-[22px] font-semibold text-white">20:48</p>
        <FigmaIcon src={FIGMA_ASSETS.bellOff} className="size-[19px]" />
      </div>
      <div className="flex items-center gap-[8px]">
        <FigmaIcon src={FIGMA_ASSETS.iosSignal} className="h-[18px] w-[22px]" />
        <FigmaIcon src={FIGMA_ASSETS.iosWifi} className="h-[18px] w-[24px]" />
        <FigmaIcon src={FIGMA_ASSETS.iosBatteryFull} className="h-[18px] w-[34px]" />
      </div>
    </div>
  );
}

/** Figma 10:3143 + 10:3155: settings, Kate search, notifications and service shortcuts. */
export function AppHeader({ onOpenInbox }: { onOpenInbox: () => void }) {
  const unread = useKbcStore((state) => state.activeAlerts.length);

  return (
    <header>
      <div className="flex h-[87px] items-center gap-[16px] px-[20px] pb-[13px] pt-[16px]">
        <span className="flex size-[58px] shrink-0 items-center justify-center rounded-[29px] border border-app-line bg-app-card">
          <FigmaIcon src={FIGMA_ASSETS.settings} className="size-[25px]" />
        </span>
        <div className="flex h-[52px] w-[340px] shrink-0 items-center gap-[10px] rounded-[26px] border-2 border-[#050607] bg-app-card px-[16px]">
          <FigmaIcon src={FIGMA_ASSETS.search} className="size-[22px]" />
          <p className="min-w-0 flex-1 text-[18px] text-app-subtle">Hoe kan ik je helpen?</p>
          <span className="flex items-center gap-[4px]">
            <FigmaIcon src={FIGMA_ASSETS.kateMark} className="size-[16px]" />
            <span className="text-[17px] font-bold text-app-text">Kate</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenInbox}
          className="relative shrink-0 rounded-full transition-opacity hover:opacity-90"
          aria-label={`Meldingen, ${unread} ongelezen`}
        >
          <FigmaIcon src={FIGMA_ASSETS.notifications} className="size-[58px]" />
          {unread > 0 && (
            <span className="absolute left-[33px] top-[12px] flex size-[18px] items-center justify-center text-[11px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </div>

      <div className="scrollbar-hide flex h-[96px] items-start gap-[10px] overflow-x-auto pb-[32px] pl-[20px] pr-[20px] pt-[22px]">
        <span className="flex h-[42px] w-[49px] shrink-0 items-center justify-center rounded-[21px] bg-app-text px-[12px]">
          <FigmaIcon src={FIGMA_ASSETS.shortcutWalletCards} className="size-[20px]" />
        </span>
        {SHORTCUTS.map((shortcut) => (
          <span
            key={shortcut.label}
            className="flex h-[42px] shrink-0 items-center justify-center gap-[8px] rounded-[21px] bg-app-chip px-[14px]"
          >
            <FigmaIcon src={shortcut.icon} className="size-[20px]" />
            <span className="whitespace-nowrap text-[18px] text-app-subtle">{shortcut.label}</span>
          </span>
        ))}
      </div>
    </header>
  );
}
