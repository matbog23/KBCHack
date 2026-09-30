"use client";

import { PERSONA_IDS, PERSONAS } from "@/config/personas";
import { cn } from "@/lib/utils";
import { useKbcStore } from "@/store/useKbcStore";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2);
}

export function PersonaSwitch() {
  const personaId = useKbcStore((state) => state.personaId);
  const setPersona = useKbcStore((state) => state.setPersona);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-dash-muted">Customer profile</p>
      <div role="radiogroup" aria-label="Customer profile" className="grid gap-2 sm:grid-cols-2">
        {PERSONA_IDS.map((id) => {
          const { persona } = PERSONAS[id];
          const selected = id === personaId;
          return (
            // biome-ignore lint/a11y/useSemanticElements: card-style radio
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPersona(id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                selected
                  ? "border-dash-ink bg-white shadow-sm"
                  : "border-dash-line bg-transparent hover:bg-white/60",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  selected ? "bg-dash-ink text-white" : "bg-dash-surface text-dash-muted",
                )}
              >
                {initials(persona.name)}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-dash-ink">{persona.name}</span>
                <span className="block truncate text-xs text-dash-muted">{persona.tagline}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
