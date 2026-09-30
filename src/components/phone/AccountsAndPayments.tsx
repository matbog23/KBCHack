"use client";

import { type LucideIcon, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { formatDayMonthNumeric, formatKbcAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKbcStore } from "@/store/useKbcStore";
import type { PSD2Transaction } from "@/types/psd2";

const VISIBLE_PAYMENTS = 3;

type FacetSet = readonly [string, string, string];
const LIGHT_FACETS: FacetSet = [
  FIGMA_ASSETS.facetLightA,
  FIGMA_ASSETS.facetLightB,
  FIGMA_ASSETS.facetLightC,
];
const NAVY_FACETS: FacetSet = [
  FIGMA_ASSETS.facetNavyA,
  FIGMA_ASSETS.facetNavyB,
  FIGMA_ASSETS.facetNavyC,
];

/** The three rotated polygons of Figma "Account artwork" (10:3176), positioned as designed. */
function Facets({ facets }: { facets: FacetSet }) {
  const [a, b, c] = facets;
  const layers = [
    {
      src: a,
      box: "left-[92px] top-[-2.88px] h-[171.322px] w-[176.458px]",
      rotate: "-rotate-[18deg]",
      size: "h-[134px] w-[142px]",
    },
    {
      src: b,
      box: "left-[-38.96px] top-[-35px] h-[196.83px] w-[198.607px]",
      rotate: "rotate-[48deg]",
      size: "h-[152px] w-[128px]",
    },
    {
      src: c,
      box: "left-[-56.94px] top-[28px] h-[157.533px] w-[154.965px]",
      rotate: "rotate-[18deg]",
      size: "h-[126px] w-[122px]",
    },
  ];
  return (
    <>
      {layers.map((layer) => (
        <div key={layer.src} className={cn("absolute flex items-center justify-center", layer.box)}>
          <div className={layer.rotate}>
            <div className={cn("relative", layer.size)}>
              <div className="absolute bottom-1/4 left-[6.7%] right-[6.7%] top-0">
                {/* biome-ignore lint/performance/noImgElement: Figma vector */}
                <img alt="" className="block size-full max-w-none" src={layer.src} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/** "5 565,74 EUR": whole euros large, cents and currency smaller, as in KBC Mobile. */
function CardBalance({ amount }: { amount: number }) {
  const formatted = formatKbcAmount(amount);
  const comma = formatted.lastIndexOf(",");
  const whole = formatted.slice(0, comma);
  const cents = formatted.slice(comma);
  const large = Math.abs(amount) >= 100_000;
  return (
    <p className="whitespace-nowrap font-bold text-app-text tabular-nums">
      <span className={large ? "text-[19px]" : "text-[22px]"}>{whole}</span>
      <span className="text-[16px]">{cents} EUR</span>
    </p>
  );
}

interface AccountCardProps {
  name: string;
  balance: number;
  icon: LucideIcon;
  tone: "light" | "navy";
  selected?: boolean;
  editable?: boolean;
  highlight?: boolean;
}

function AccountCard({
  name,
  balance,
  icon: Icon,
  tone,
  selected,
  editable,
  highlight,
}: AccountCardProps) {
  return (
    <div
      data-account-card
      className={cn(
        "relative h-[237px] w-[165px] shrink-0 snap-start",
        highlight && "duration-700 animate-in fade-in slide-in-from-right-8",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[10px] bg-app-card",
          highlight && "ring-2 ring-app-blue",
        )}
      >
        <div
          className={cn(
            "relative h-[126px] w-full shrink-0 overflow-hidden",
            tone === "light" ? "bg-app-blue-card" : "bg-app-navy",
          )}
        >
          <Facets facets={tone === "light" ? LIGHT_FACETS : NAVY_FACETS} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="size-[58px] text-app-card" strokeWidth={1.3} aria-hidden="true" />
          </div>
        </div>
        <div className="relative flex flex-1 flex-col gap-[6px] pl-[11px] pr-[10px] pt-[16px]">
          <p className="truncate text-[16px] text-app-subtle">{name}</p>
          <CardBalance amount={balance} />
          {selected && (
            <span className="absolute bottom-[10px] left-[10px] h-[5px] w-[143px] rounded-[3px] bg-app-blue" />
          )}
        </div>
      </div>
      {editable && (
        <span className="absolute right-[-7px] top-[-7px] flex size-[36px] items-center justify-center rounded-full border-2 border-app-bg bg-app-raised">
          <FigmaIcon src={FIGMA_ASSETS.pencil} className="size-[18px]" />
        </span>
      )}
    </div>
  );
}

function counterparty(transaction: PSD2Transaction): string {
  return transaction.amount > 0
    ? (transaction.debtorName ?? transaction.creditorName)
    : transaction.creditorName;
}

function PaymentRow({ transaction }: { transaction: PSD2Transaction }) {
  return (
    <li
      className={cn(
        "flex h-[36px] items-center",
        transaction.isSimulated &&
          "-mx-[12px] rounded-[8px] bg-app-blue/10 px-[12px] duration-700 animate-in fade-in slide-in-from-top-2",
      )}
    >
      <p className="w-[53px] shrink-0 text-[13px] text-app-muted">
        {formatDayMonthNumeric(transaction.bookingDate)}
      </p>
      <p className="min-w-0 flex-1 truncate text-[18px] text-app-text">
        {counterparty(transaction)}
      </p>
      <p className="w-[110px] shrink-0 text-right text-app-text tabular-nums">
        <span className="text-[16px]">{formatKbcAmount(transaction.amount)}</span>
        <span className="text-[11px]"> EUR</span>
      </p>
    </li>
  );
}

/** Figma 10:3168: account carousel and the three most recent payments on the selected account. */
export function AccountsAndPayments() {
  const persona = useKbcStore((state) => state.activePersona);
  const transactions = useKbcStore((state) => state.transactions);
  const kateAccounts = useKbcStore((state) => state.kateAccountBalances);
  const [expanded, setExpanded] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const accountCount = kateAccounts.length;

  // Bring a freshly opened account into view.
  useEffect(() => {
    if (accountCount === 0) return;
    const carousel = carouselRef.current;
    carousel?.scrollTo({ left: carousel.scrollWidth, behavior: "smooth" });
  }, [accountCount]);

  return (
    <section className="flex w-full flex-col gap-[26px]" aria-label="Rekeningen">
      <div
        ref={carouselRef}
        className="scrollbar-hide flex snap-x gap-[13px] overflow-x-auto scroll-px-[20px] px-[20px] pt-[8px]"
      >
        <AccountCard
          name="Privé"
          balance={persona.checkingBalance}
          icon={Wallet}
          tone="light"
          selected
          editable
        />
        <AccountCard
          name="Spaarrekening"
          balance={persona.savingsBalance}
          icon={PiggyBank}
          tone="light"
          editable
        />
        {kateAccounts.map((account) => (
          <AccountCard
            key={account.id}
            name={account.name}
            balance={account.balance}
            icon={account.kind === "savings" ? PiggyBank : TrendingUp}
            tone="navy"
            editable
            highlight
          />
        ))}
      </div>

      <div className="flex flex-col px-[48px]">
        {expanded && (
          <ul className="flex flex-col gap-px">
            {transactions.slice(0, VISIBLE_PAYMENTS).map((transaction) => (
              <PaymentRow key={transaction.transactionId} transaction={transaction} />
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex h-[35px] items-end gap-[14px] self-start"
          aria-expanded={expanded}
        >
          <FigmaIcon
            src={FIGMA_ASSETS.chevronUp}
            className={cn("size-[18px] transition-transform", !expanded && "rotate-180")}
          />
          <span className="text-[13px] font-semibold text-app-blue">
            {expanded ? "Verberg betalingen" : "Toon betalingen"}
          </span>
        </button>
      </div>
    </section>
  );
}
