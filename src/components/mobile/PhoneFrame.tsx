import { BatteryFull, SignalHigh, Wifi } from "lucide-react";
import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[400px] rounded-[3rem] bg-kbc-gray shadow-phone">
      <div className="pointer-events-none absolute left-1/2 top-3 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-[#0B1320]" />
      <div className="relative flex h-[820px] flex-col overflow-hidden rounded-[3rem]">
        <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between bg-kbc-navy px-8 pt-1 text-[13px] font-semibold text-white">
          <span className="tabular-nums">9:41</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <SignalHigh className="size-4" />
            <Wifi className="size-4" />
            <BatteryFull className="size-5" />
          </span>
        </div>
        <div className="scrollbar-hide flex-1 overflow-y-auto overscroll-contain pt-12">
          {children}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
          <div className="h-1.5 w-32 rounded-full bg-kbc-navy/80" />
        </div>
      </div>
    </div>
  );
}
