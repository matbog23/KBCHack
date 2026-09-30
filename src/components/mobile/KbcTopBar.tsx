"use client";

import { Bell, CalendarClock, PiggyBank, Wallet } from "lucide-react";
import { formatEuro, formatMonthYear } from "@/lib/format";
import { useKbcStore } from "@/store/useKbcStore";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function KbcTopBar() {
  const persona = useKbcStore((state) => state.activePersona);
  const alertCount = useKbcStore((state) => state.activeAlerts.length);
  const monthsElapsed = useKbcStore((state) => state.monthsElapsed);
  const simulatedNow = useKbcStore((state) => state.simulatedNow);

  const firstName = persona.name.split(" ")[0] ?? persona.name;
  const total = persona.checkingBalance + persona.savingsBalance;

  return (
    <header className="bg-kbc-navy px-5 pb-6 pt-3 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-11 place-items-center rounded-md bg-white text-[15px] font-black tracking-tight text-kbc-navy">
            KBC
          </span>
          <div className="leading-tight">
            <p className="text-[11px] text-white/60">Good morning</p>
            <p className="text-sm font-semibold">{firstName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative" role="img" aria-label={`${alertCount} new notifications`}>
            <Bell className="size-5 text-white/90" aria-hidden="true" />
            {alertCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-kbc-blue text-[10px] font-bold">
                {alertCount}
              </span>
            )}
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-kbc-blue text-xs font-bold">
            {initials(persona.name)}
          </span>
        </div>
      </div>

      {monthsElapsed > 0 && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          Simulated: {formatMonthYear(simulatedNow)}
        </p>
      )}

      <div className="mt-4">
        <p className="text-xs text-white/60">Total balance</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{formatEuro(total)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-white/70">
            <Wallet className="size-3.5" aria-hidden="true" />
            KBC Plus Account
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {formatEuro(persona.checkingBalance)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/50">{persona.checkingIban}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-white/70">
            <PiggyBank className="size-3.5" aria-hidden="true" />
            Savings account
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {formatEuro(persona.savingsBalance)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/50">{persona.savingsIban}</p>
        </div>
      </div>
    </header>
  );
}
