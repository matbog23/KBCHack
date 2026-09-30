"use client";

import { Baby, HardHat, House, type LucideIcon, Scale, ShieldPlus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import type { KateRuleId } from "@/types/psd2";

/** Line icons in the style of the Figma tip artwork, one per Kate rule. */
export const RULE_ICONS: Record<KateRuleId, LucideIcon> = {
  "new-child": Baby,
  "childcare-hospitalisation": ShieldPlus,
  "home-purchase": House,
  renovation: HardHat,
  successieplanning: Scale,
};

function DismissButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[24px] shrink-0 items-center justify-center rounded-[12px] bg-app-chip text-[12px] text-app-muted transition-colors hover:text-app-text"
    >
      ×
    </button>
  );
}

function KateLabel() {
  return (
    <span className="flex items-center gap-[7px]">
      <FigmaIcon src={FIGMA_ASSETS.kateMark} className="size-[16px]" />
      <span className="text-[13px] font-semibold text-app-text">Kate tip</span>
    </span>
  );
}

/** Figma 10:3226, "Voor jou": further Kate moments, then the standing editorial tips. */
export function ForYouSection({ moments }: { moments: ReactNode }) {
  const [hiddenStatic, setHiddenStatic] = useState<ReadonlySet<string>>(new Set());
  const hide = (id: string) => setHiddenStatic((current) => new Set(current).add(id));

  return (
    <section className="flex w-full flex-col gap-[20px] px-[21px]" aria-label="Voor jou">
      <div className="flex items-center justify-between whitespace-nowrap">
        <h2 className="text-[21px] font-medium text-app-text">Voor jou</h2>
        <span className="text-[16px] font-semibold text-app-blue">Alle communicatie</span>
      </div>

      {moments}

      {!hiddenStatic.has("energy") && (
        <article className="flex w-full gap-[17px] overflow-hidden rounded-[10px] bg-app-card py-[15px] pl-[19px] pr-[15px]">
          <span className="flex h-[67px] w-[44px] shrink-0 flex-col items-center justify-center">
            <FigmaIcon src={FIGMA_ASSETS.tipHouse} className="size-[40px]" />
            <FigmaIcon src={FIGMA_ASSETS.tipCoins} className="size-[20px]" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <KateLabel />
            <p className="text-[18px] leading-[1.55] text-app-subtle">
              Hoge energieprijzen? Met deze tips hou je de warmte binnen in je woning, en de winter
              buiten.
            </p>
          </div>
          <DismissButton onClick={() => hide("energy")} label="Tip verbergen" />
        </article>
      )}

      {!hiddenStatic.has("limits") && (
        <article className="flex w-full gap-[18px] overflow-hidden rounded-[10px] bg-app-card py-[15px] pl-[16px] pr-[15px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-[22px] bg-white">
            <FigmaIcon src={FIGMA_ASSETS.slidersHorizontal} className="size-[26px]" />
          </span>
          <p className="min-w-0 flex-1 text-[18px] leading-[1.55] text-app-subtle">
            De limieten op je betaalkaart en rekening kun je zelf aanpassen. Ontdek hoeveel controle
            je hebt in KBC Mobile.
          </p>
          <DismissButton onClick={() => hide("limits")} label="Bericht verbergen" />
        </article>
      )}
    </section>
  );
}
