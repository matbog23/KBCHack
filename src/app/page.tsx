"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { KateReasoning } from "@/components/emulator/KateReasoning";
import { TransactionComposer } from "@/components/emulator/TransactionComposer";
import { KbcHomeScreen } from "@/components/phone/KbcHomeScreen";
import { useKbcStore } from "@/store/useKbcStore";

/** On desktop the page is exactly one screen tall; columns only scroll if the window is tiny. */
const COLUMN = "flex flex-col gap-5 xl:min-h-0 xl:overflow-y-auto scrollbar-hide";

export default function Home() {
  const resetSimulation = useKbcStore((state) => state.resetSimulation);

  return (
    <main className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
      <header className="mx-auto flex w-full max-w-[1640px] items-center justify-between gap-4 px-4 pb-2 pt-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-dash-ink text-white">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-[12px] text-dash-faint">Predictive Kate</p>
            <h1 className="text-xl font-medium tracking-tight">Life-moment simulator</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-dash-line bg-dash-card px-3 py-2 text-[13px] text-dash-muted sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Transaction feed · in-memory bank
          </span>
          <button
            type="button"
            onClick={resetSimulation}
            className="flex items-center gap-2 rounded-full bg-dash-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1640px] flex-1 grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-5 pt-3 sm:px-8 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)_auto]">
        <section aria-label="Transaction input" className={COLUMN}>
          <TransactionComposer />
        </section>
        <section aria-label="Kate's reasoning" className={COLUMN}>
          <KateReasoning />
        </section>
        <section aria-label="KBC Mobile preview" className="flex justify-center xl:min-h-0">
          <KbcHomeScreen />
        </section>
      </div>
    </main>
  );
}
