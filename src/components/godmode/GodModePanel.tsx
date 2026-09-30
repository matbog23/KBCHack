"use client";

import {
  Baby,
  Check,
  Clock,
  Cpu,
  HardHat,
  HeartPulse,
  type LucideIcon,
  RotateCcw,
  Scale,
  Shield,
  Stethoscope,
  UserRound,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TRANSACTION_INJECTORS, type TransactionInjector } from "@/config/injectors";
import { PERSONA_IDS, PERSONAS } from "@/config/personas";
import { formatEuro, formatEuroRounded, formatMonthYear, formatSignedEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_TIME_JUMP_MONTHS, useKbcStore } from "@/store/useKbcStore";

const STORYLINE_META: Record<
  TransactionInjector["storyline"],
  { label: string; icon: LucideIcon }
> = {
  family: { label: "Family formation", icon: Baby },
  estate: { label: "Estate & legal", icon: Scale },
  home: { label: "Home & renovation", icon: HardHat },
};

const INJECTOR_ICONS: Record<string, LucideIcon> = {
  gynecology: Stethoscope,
  kraamgeld: Baby,
  childcare: Baby,
  notary: Scale,
  legal: Scale,
  insurance: Shield,
  hospital: HeartPulse,
  contractor: HardHat,
};

const STORYLINES = Object.keys(STORYLINE_META) as TransactionInjector["storyline"][];

function PersonaSelector() {
  const personaId = useKbcStore((state) => state.personaId);
  const setPersona = useKbcStore((state) => state.setPersona);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-kbc-blue" aria-hidden="true" />
          Persona
        </CardTitle>
        <CardDescription>Switching resets the account to the persona's seed data.</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Persona" className="grid gap-3 sm:grid-cols-2">
          {PERSONA_IDS.map((id) => {
            const { persona } = PERSONAS[id];
            const selected = id === personaId;
            return (
              // biome-ignore lint/a11y/useSemanticElements: styled card radio, keyboard accessible as a button
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPersona(id)}
                className={cn(
                  "relative rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-kbc-blue bg-kbc-blue-soft ring-1 ring-kbc-blue"
                    : "border-kbc-line bg-white hover:border-kbc-blue/50",
                )}
              >
                {selected && (
                  <Check
                    className="absolute right-3 top-3 size-4 text-kbc-blue"
                    aria-hidden="true"
                  />
                )}
                <p className="font-semibold text-kbc-navy">{persona.name.split(" ")[0]}</p>
                <p className="mt-0.5 text-xs text-kbc-muted">{persona.tagline}</p>
                <p className="mt-2 font-mono text-[11px] text-kbc-muted">
                  lifeStage: {persona.lifeStage}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionInjectors() {
  const injectTransaction = useKbcStore((state) => state.injectTransaction);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-kbc-blue" aria-hidden="true" />
          Transaction injectors
        </CardTitle>
        <CardDescription>
          Pushes a Berlin Group PSD2 transaction into the live feed and re-runs Kate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {STORYLINES.map((storyline) => {
          const { label, icon: StorylineIcon } = STORYLINE_META[storyline];
          const injectors = TRANSACTION_INJECTORS.filter((i) => i.storyline === storyline);
          return (
            <div key={storyline}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-kbc-muted">
                <StorylineIcon className="size-3.5" aria-hidden="true" />
                {label}
              </p>
              <div className="flex flex-wrap gap-2">
                {injectors.map((injector) => {
                  const Icon = INJECTOR_ICONS[injector.id] ?? Zap;
                  const { amount, merchantCategoryCode } = injector.template;
                  return (
                    <Button
                      key={injector.id}
                      variant="outline"
                      size="sm"
                      className="h-auto max-w-full flex-wrap justify-start whitespace-normal py-2 text-left"
                      onClick={() => injectTransaction(injector.template)}
                    >
                      <Icon className="text-kbc-blue" />
                      <span>Inject {injector.label}</span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          amount > 0 ? "text-emerald-600" : "text-kbc-navy",
                        )}
                      >
                        {formatSignedEuro(amount)}
                      </span>
                      {merchantCategoryCode && (
                        <span className="rounded bg-kbc-gray px-1 font-mono text-[10px] text-kbc-muted">
                          {merchantCategoryCode}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TimeMachine() {
  const monthsElapsed = useKbcStore((state) => state.monthsElapsed);
  const simulatedNow = useKbcStore((state) => state.simulatedNow);
  const persona = useKbcStore((state) => state.activePersona);
  const simulateTimeJump = useKbcStore((state) => state.simulateTimeJump);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-kbc-blue" aria-hidden="true" />
          Time machine
        </CardTitle>
        <CardDescription>
          Warps the clock forward. Monthly savings of{" "}
          {formatEuroRounded(persona.monthlySavingsContribution)} accumulate, and balance-based
          rules re-evaluate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold tabular-nums text-kbc-navy">
            +{monthsElapsed} <span className="text-sm font-medium text-kbc-muted">months</span>
          </p>
          <p className="text-sm font-medium text-kbc-muted">{formatMonthYear(simulatedNow)}</p>
        </div>
        <Slider
          className="mt-3"
          min={0}
          max={MAX_TIME_JUMP_MONTHS}
          step={1}
          value={[monthsElapsed]}
          onValueChange={([months]) => simulateTimeJump(months ?? 0)}
        />
        <div className="mt-1 flex justify-between text-[11px] text-kbc-muted">
          <span>Today</span>
          <span>+{MAX_TIME_JUMP_MONTHS / 12} years</span>
        </div>
        <p className="mt-3 rounded-md bg-kbc-gray px-3 py-2 text-sm text-kbc-navy">
          Projected savings:{" "}
          <span className="font-semibold">{formatEuro(persona.savingsBalance)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function EngineInspector() {
  const lastInjected = useKbcStore((state) => state.injectedTransactions[0]);
  const allAlerts = useKbcStore((state) => state.allAlerts);
  const activeAlerts = useKbcStore((state) => state.activeAlerts);
  const activeIds = new Set(activeAlerts.map((alert) => alert.id));

  return (
    <Card className="border-kbc-navy bg-kbc-navy text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Cpu className="size-4 text-kbc-blue" aria-hidden="true" />
          Kate engine output
        </CardTitle>
        <CardDescription className="text-white/60">
          evaluateKateRules(transactions, persona): {allAlerts.length} match
          {allAlerts.length === 1 ? "" : "es"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allAlerts.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/20 px-3 py-4 text-center text-sm text-white/60">
            No rules matched. Inject a transaction or jump forward in time.
          </p>
        ) : (
          <ul className="space-y-2">
            {allAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs"
              >
                <span className="font-mono text-kbc-blue">{alert.ruleId}</span>
                <Badge variant={alert.priority}>{alert.priority}</Badge>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  {alert.triggerSource}
                </Badge>
                <span className="ml-auto text-white/50">
                  {activeIds.has(alert.id) ? "shown" : "dismissed"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/60">Last injected PSD2 payload</p>
          <pre className="scrollbar-hide max-h-64 overflow-auto rounded-md bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-white/80">
            {lastInjected ? JSON.stringify(lastInjected, null, 2) : "// nothing injected yet"}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function GodModePanel() {
  const resetSimulation = useKbcStore((state) => state.resetSimulation);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-kbc-blue">God mode</p>
          <h1 className="text-2xl font-bold text-kbc-navy">Simulation control</h1>
        </div>
        <Button variant="outline" onClick={resetSimulation}>
          <RotateCcw />
          Reset
        </Button>
      </div>
      <PersonaSelector />
      <TransactionInjectors />
      <TimeMachine />
      <EngineInspector />
    </div>
  );
}
