import { Sparkles } from "lucide-react";
import { GodModePanel } from "@/components/godmode/GodModePanel";
import { MobileApp } from "@/components/mobile/MobileApp";

export default function Home() {
  return (
    <main className="min-h-dvh">
      <header className="border-b border-kbc-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid size-8 place-items-center rounded-md bg-kbc-blue text-white">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-kbc-navy">Predictive Kate</p>
            <p className="text-xs text-kbc-muted">
              Event-driven life-moment engine for KBC Mobile · hackathon prototype
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <section aria-label="KBC Mobile preview" className="lg:sticky lg:top-8 lg:self-start">
          <MobileApp />
        </section>
        <section aria-label="God mode control panel">
          <GodModePanel />
        </section>
      </div>
    </main>
  );
}
