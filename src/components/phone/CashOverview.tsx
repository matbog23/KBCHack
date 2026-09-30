"use client";

import { useMemo } from "react";
import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import {
  brusselsMonth,
  dutchMonthAbbreviation,
  formatKbcAmount,
  formatMonthNameNl,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKbcStore } from "@/store/useKbcStore";

/** Bar heights of the five previous months, as drawn in Figma 10:3323 (px out of 112). */
const HISTORY_BARS: ReadonlyArray<{ income: number; expense: number }> = [
  { income: 98, expense: 54 },
  { income: 62, expense: 54 },
  { income: 52, expense: 25 },
  { income: 47, expense: 46 },
  { income: 54, expense: 58 },
];
/** In Figma the current month's €3 073 income is drawn 70px tall. */
const PX_PER_EURO = 70 / 3073;
const MAX_BAR = 112;

function barHeight(amount: number): number {
  return Math.max(4, Math.min(MAX_BAR, Math.round(amount * PX_PER_EURO)));
}

function Total({ label, amount, tone }: { label: string; amount: number; tone: "in" | "out" }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[11px]">
      <span
        className={cn(
          "flex size-[52px] shrink-0 items-center justify-center rounded-[10px]",
          tone === "in" ? "bg-app-green" : "bg-app-yellow",
        )}
      >
        <FigmaIcon src={FIGMA_ASSETS.cashCoins} className="size-[28px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-[7px] whitespace-nowrap">
        <p className="text-[18px] text-app-subtle">{label}</p>
        <p className="text-app-text tabular-nums">
          <span className="text-[18px]">{formatKbcAmount(amount)}</span>
          <span className="text-[12px]"> EUR</span>
        </p>
      </div>
    </div>
  );
}

/** Figma 10:3297, "Zicht op je geldzaken": income vs. spending for the current month. */
export function CashOverview() {
  const transactions = useKbcStore((state) => state.transactions);
  const simulatedNow = useKbcStore((state) => state.simulatedNow);

  const { income, expenses, currentMonth } = useMemo(() => {
    const now = brusselsMonth(simulatedNow);
    let monthIncome = 0;
    let monthExpenses = 0;
    for (const transaction of transactions) {
      const booked = brusselsMonth(transaction.bookingDate);
      if (booked.year !== now.year || booked.month !== now.month) continue;
      if (transaction.amount > 0) monthIncome += transaction.amount;
      else monthExpenses += Math.abs(transaction.amount);
    }
    return { income: monthIncome, expenses: monthExpenses, currentMonth: now.month };
  }, [transactions, simulatedNow]);

  const bars = [
    ...HISTORY_BARS.map((bar, index) => ({
      ...bar,
      month: currentMonth - HISTORY_BARS.length + index,
      current: false,
    })),
    { income: barHeight(income), expense: barHeight(expenses), month: currentMonth, current: true },
  ];

  return (
    <section
      className="flex w-full flex-col gap-[20px] px-[21px]"
      aria-label="Zicht op je geldzaken"
    >
      <div className="flex items-center justify-between whitespace-nowrap">
        <h2 className="text-[21px] font-medium text-app-text">Zicht op je geldzaken</h2>
        <span className="text-[16px] font-semibold text-app-blue">Toon alles</span>
      </div>
      <div className="flex h-[330px] w-full flex-col gap-[20px] overflow-hidden rounded-[10px] bg-app-card px-[21px] pb-[14px] pt-[20px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px] whitespace-nowrap">
            <p className="text-[18px] text-app-text">In &amp; uit</p>
            <p className="text-[15px] text-app-muted">{formatMonthNameNl(simulatedNow)}</p>
          </div>
          <FigmaIcon src={FIGMA_ASSETS.moreOptions} className="h-[6px] w-[28px]" />
        </div>
        <div className="flex gap-[25px]">
          <Total label="Inkomsten" amount={income} tone="in" />
          <Total label="Uitgaven" amount={expenses} tone="out" />
        </div>
        <div className="flex h-[145px] items-end gap-[11px]">
          {bars.map((bar) => (
            <div
              key={bar.month}
              className="flex h-[145px] w-[62px] flex-col items-center justify-end gap-[11px]"
            >
              <div className="flex h-[112px] items-end gap-[7px]">
                <div
                  className={cn(
                    "w-[11px] rounded-t-[5px] transition-[height] duration-500",
                    bar.current ? "bg-app-green" : "bg-app-green-dim",
                  )}
                  style={{ height: bar.income }}
                />
                <div
                  className={cn(
                    "w-[11px] rounded-t-[5px] transition-[height] duration-500",
                    bar.current ? "bg-app-yellow" : "bg-app-yellow-dim",
                  )}
                  style={{ height: bar.expense }}
                />
              </div>
              <p
                className={cn(
                  "text-center text-[15px]",
                  bar.current ? "text-app-text" : "text-app-muted",
                )}
              >
                {dutchMonthAbbreviation(bar.month)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
