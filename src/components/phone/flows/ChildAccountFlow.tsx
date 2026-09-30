"use client";

import { PiggyBank, TrendingUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  FieldLabel,
  FlowScreen,
  FlowSuccess,
  PrimaryButton,
} from "@/components/phone/flows/FlowScreen";
import { formatKbcAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type KateAccount, useKbcStore } from "@/store/useKbcStore";

const MONTHLY_OPTIONS = [25, 50, 100, 150] as const;
const KRAAMGELD_PATTERN = /kraamgeld|groeipakket/i;

const KINDS = [
  {
    value: "savings",
    label: "Sparen",
    detail: "Spaarrekening · veilig en altijd opneembaar",
    icon: PiggyBank,
  },
  {
    value: "investment",
    label: "Beleggen",
    detail: "Beleggingsplan · meer kans op rendement over 18 jaar",
    icon: TrendingUp,
  },
] as const;

/** Scenario 1, step 2: open an account for the baby, in the parent's name. */
export function ChildAccountFlow({ onClose }: { onClose: () => void }) {
  const id = useId();
  const persona = useKbcStore((state) => state.activePersona);
  const transactions = useKbcStore((state) => state.transactions);
  const openChildAccount = useKbcStore((state) => state.openChildAccount);

  const kraamgeld = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            tx.amount > 0 &&
            KRAAMGELD_PATTERN.test(
              `${tx.remittanceInformationUnstructured} ${tx.debtorName ?? ""}`,
            ),
        )
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  const [kind, setKind] = useState<KateAccount["kind"]>("savings");
  const [name, setName] = useState("Spaarpot baby");
  const [monthly, setMonthly] = useState<number>(50);
  const [depositKraamgeld, setDepositKraamgeld] = useState(kraamgeld > 0);
  const [opened, setOpened] = useState<KateAccount | null>(null);

  const eighteenYears = monthly * 12 * 18 + (depositKraamgeld ? kraamgeld : 0);

  if (opened) {
    return (
      <FlowScreen
        title="Rekening geopend"
        onBack={onClose}
        footer={<PrimaryButton onClick={onClose}>Terug naar start</PrimaryButton>}
      >
        <FlowSuccess title="Welkom, kleintje!">
          <p className="max-w-[400px] text-[18px] leading-[1.5] text-app-subtle">
            “{opened.name}” staat klaar op naam van {persona.name}. Elke maand gaat er automatisch €{" "}
            {opened.monthlyContribution} naartoe.
          </p>
          <div className="mt-[10px] w-full rounded-[16px] bg-app-card p-[20px] text-left">
            <p className="text-[15px] text-app-muted">{opened.iban}</p>
            <p className="mt-[6px] text-[26px] font-bold text-app-text tabular-nums">
              {formatKbcAmount(opened.initialDeposit)} <span className="text-[16px]">EUR</span>
            </p>
          </div>
        </FlowSuccess>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen
      title="Sparen voor je kindje"
      onBack={onClose}
      footer={
        <PrimaryButton
          onClick={() =>
            setOpened(
              openChildAccount({
                name,
                kind,
                monthlyContribution: monthly,
                initialDeposit: depositKraamgeld ? kraamgeld : 0,
              }),
            )
          }
          disabled={name.trim() === ""}
        >
          Rekening openen
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-[28px]">
        <div className="rounded-[20px] bg-app-navy p-[22px]">
          <p className="text-[16px] text-white/70">Tegen de 18de verjaardag</p>
          <p className="mt-[4px] text-[38px] font-bold tracking-tight text-white tabular-nums">
            {formatKbcAmount(eighteenYears)} <span className="text-[18px]">EUR</span>
          </p>
          <p className="mt-[4px] text-[14px] text-white/60">
            Enkel je inleg, zonder rente of rendement.
          </p>
        </div>

        <div>
          <FieldLabel>Wat wil je doen?</FieldLabel>
          <div role="radiogroup" aria-label="Soort rekening" className="flex flex-col gap-[10px]">
            {KINDS.map((option) => {
              const Icon = option.icon;
              const selected = kind === option.value;
              return (
                // biome-ignore lint/a11y/useSemanticElements: card-style radio
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "flex items-center gap-[16px] rounded-[16px] border-2 bg-app-card p-[16px] text-left transition-colors",
                    selected ? "border-app-blue" : "border-transparent",
                  )}
                >
                  <span className="flex size-[48px] items-center justify-center rounded-full bg-app-chip">
                    <Icon
                      className="size-[26px] text-app-text"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <span className="block text-[19px] font-semibold text-app-text">
                      {option.label}
                    </span>
                    <span className="block text-[15px] text-app-muted">{option.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-name`}>
            <FieldLabel>Naam van de rekening</FieldLabel>
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="bv. Spaarpot Lou"
            className="h-[58px] w-full rounded-[14px] border border-app-line bg-app-card px-[18px] text-[19px] text-app-text outline-none focus:border-app-blue"
          />
        </div>

        <div>
          <FieldLabel>Elke maand automatisch</FieldLabel>
          <div className="flex gap-[10px]">
            {MONTHLY_OPTIONS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setMonthly(amount)}
                aria-pressed={monthly === amount}
                className={cn(
                  "h-[52px] flex-1 rounded-full text-[18px] font-semibold transition-colors",
                  monthly === amount ? "bg-app-blue text-white" : "bg-app-chip text-app-subtle",
                )}
              >
                € {amount}
              </button>
            ))}
          </div>
        </div>

        {kraamgeld > 0 && (
          <label className="flex cursor-pointer items-center justify-between gap-[16px] rounded-[16px] bg-app-card p-[18px]">
            <span>
              <span className="block text-[18px] font-semibold text-app-text">
                Kraamgeld er meteen op
              </span>
              <span className="block text-[15px] text-app-muted">
                {formatKbcAmount(kraamgeld)} EUR van je Privé-rekening
              </span>
            </span>
            <input
              type="checkbox"
              checked={depositKraamgeld}
              onChange={(event) => setDepositKraamgeld(event.target.checked)}
              className="size-[26px] accent-[#4AA8E8]"
            />
          </label>
        )}

        <p className="text-[14px] leading-[1.5] text-app-muted">
          De rekening staat op naam van {persona.name}. Jij beheert het geld tot je kind volwassen
          is.
        </p>
      </div>
    </FlowScreen>
  );
}
