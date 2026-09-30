"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import {
  FieldLabel,
  FlowScreen,
  FlowSuccess,
  PrimaryButton,
} from "@/components/phone/flows/FlowScreen";
import {
  estimateFlemishInheritanceTax,
  estimateTaxWithGift,
  FLEMISH_GIFT_TAX_RATE,
  KATE_THRESHOLDS,
} from "@/engine/kateEngine";
import { formatKbcAmount } from "@/lib/format";
import { useKbcStore } from "@/store/useKbcStore";

const GIFT_STEP = 10_000;
const MAX_HEIRS = 6;

function Amount({ value, className }: { value: number; className: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatKbcAmount(value).replace(/,\d\d$/, "")} <span className="text-[0.55em]">EUR</span>
    </span>
  );
}

/** Scenario 2, step 2: an indicative inheritance vs. gift simulator, then book an expert. */
export function EstatePlannerFlow({ onClose }: { onClose: () => void }) {
  const persona = useKbcStore((state) => state.activePersona);
  const requestEstateAdvice = useKbcStore((state) => state.requestEstateAdvice);
  const estate = Math.round(persona.checkingBalance + persona.savingsBalance);

  const [heirs, setHeirs] = useState<number>(KATE_THRESHOLDS.assumedHeirs);
  const [gift, setGift] = useState(Math.floor(estate / 3 / GIFT_STEP) * GIFT_STEP);
  const [requested, setRequested] = useState(false);

  const withoutPlanning = estimateFlemishInheritanceTax(estate, heirs);
  const withGift = estimateTaxWithGift(estate, gift, heirs);
  const saving = withoutPlanning - withGift;

  if (requested) {
    return (
      <FlowScreen
        title="Successieplanning"
        onBack={onClose}
        footer={<PrimaryButton onClick={onClose}>Terug naar start</PrimaryButton>}
      >
        <FlowSuccess title="Aanvraag verstuurd">
          <p className="max-w-[400px] text-[18px] leading-[1.5] text-app-subtle">
            Een KBC-expert successieplanning belt je binnen twee werkdagen. Je simulatie met {heirs}{" "}
            kinderen en een schenking van {formatKbcAmount(gift)} EUR staat al in je dossier.
          </p>
        </FlowSuccess>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen
      title="Successieplanning"
      onBack={onClose}
      footer={
        <PrimaryButton
          onClick={() => {
            requestEstateAdvice({ heirs, giftAmount: gift });
            setRequested(true);
          }}
        >
          Plan een gesprek met een expert
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-[26px]">
        <div className="rounded-[20px] bg-app-card p-[22px]">
          <p className="text-[16px] text-app-muted">Je vermogen bij KBC</p>
          <p className="mt-[4px] text-app-text">
            <Amount value={estate} className="text-[36px] font-bold" />
          </p>
        </div>

        <div className="flex items-center justify-between">
          <FieldLabel>Aantal kinderen</FieldLabel>
          <div className="flex items-center gap-[16px]">
            <button
              type="button"
              aria-label="Minder kinderen"
              onClick={() => setHeirs((value) => Math.max(1, value - 1))}
              className="flex size-[48px] items-center justify-center rounded-full bg-app-chip text-app-text"
            >
              <Minus className="size-[22px]" aria-hidden="true" />
            </button>
            <span className="w-[28px] text-center text-[26px] font-bold text-app-text">
              {heirs}
            </span>
            <button
              type="button"
              aria-label="Meer kinderen"
              onClick={() => setHeirs((value) => Math.min(MAX_HEIRS, value + 1))}
              className="flex size-[48px] items-center justify-center rounded-full bg-app-chip text-app-text"
            >
              <Plus className="size-[22px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <FieldLabel>Vandaag schenken</FieldLabel>
            <Amount value={gift} className="text-[20px] font-semibold text-app-text" />
          </div>
          <input
            type="range"
            min={0}
            max={Math.floor(estate / GIFT_STEP) * GIFT_STEP}
            step={GIFT_STEP}
            value={gift}
            onChange={(event) => setGift(Number(event.target.value))}
            aria-label="Bedrag dat je vandaag schenkt"
            className="h-[30px] w-full accent-[#4AA8E8]"
          />
        </div>

        <div className="grid grid-cols-2 gap-[12px]">
          <div className="rounded-[16px] bg-app-card p-[18px]">
            <p className="text-[15px] text-app-muted">Zonder planning</p>
            <p className="mt-[6px] text-app-text">
              <Amount value={withoutPlanning} className="text-[24px] font-bold" />
            </p>
            <p className="mt-[4px] text-[13px] text-app-muted">erfbelasting later</p>
          </div>
          <div className="rounded-[16px] bg-app-card p-[18px]">
            <p className="text-[15px] text-app-muted">Met schenking</p>
            <p className="mt-[6px] text-app-text">
              <Amount value={withGift} className="text-[24px] font-bold" />
            </p>
            <p className="mt-[4px] text-[13px] text-app-muted">
              incl. {Math.round(FLEMISH_GIFT_TAX_RATE * 100)}% schenkbelasting
            </p>
          </div>
        </div>

        <div className="rounded-[20px] bg-app-green p-[22px]">
          <p className="text-[16px] text-white/85">Je kinderen besparen samen</p>
          <p className="mt-[4px] text-white">
            <Amount value={Math.max(0, saving)} className="text-[38px] font-bold" />
          </p>
        </div>

        <p className="text-[14px] leading-[1.5] text-app-muted">
          Indicatieve berekening met de Vlaamse tarieven in rechte lijn, verdeeld over {heirs}{" "}
          {heirs === 1 ? "kind" : "kinderen"}. Een schenking moet je laten registreren. Een expert
          bekijkt je volledige situatie, ook je woning en je partner.
        </p>
      </div>
    </FlowScreen>
  );
}
