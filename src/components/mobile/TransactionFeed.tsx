"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Baby,
  BookOpen,
  Fuel,
  HardHat,
  Landmark,
  type LucideIcon,
  Pill,
  Scale,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  TrainFront,
  Tv,
  Utensils,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { formatDayMonth, formatSignedEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKbcStore } from "@/store/useKbcStore";
import { MCC, type PSD2Transaction } from "@/types/psd2";

const MCC_ICONS: Record<string, LucideIcon> = {
  [MCC.DOCTORS_GYNECOLOGY]: Stethoscope,
  [MCC.LEGAL_NOTARY]: Scale,
  [MCC.CHILD_CARE]: Baby,
  [MCC.GENERAL_CONTRACTORS]: HardHat,
  [MCC.GROCERY]: ShoppingCart,
  [MCC.EATING_PLACES]: Utensils,
  [MCC.FUEL]: Fuel,
  [MCC.UTILITIES]: Zap,
  [MCC.PHARMACY]: Pill,
  [MCC.TRANSIT]: TrainFront,
  [MCC.STREAMING]: Tv,
  [MCC.BOOKSTORES]: BookOpen,
  [MCC.GOVERNMENT_SERVICES]: Landmark,
};

function iconFor(transaction: PSD2Transaction): LucideIcon {
  const byMcc = transaction.merchantCategoryCode
    ? MCC_ICONS[transaction.merchantCategoryCode]
    : undefined;
  if (byMcc) return byMcc;
  return transaction.amount > 0 ? ArrowDownLeft : ArrowUpRight;
}

function counterparty(transaction: PSD2Transaction): string {
  return transaction.amount > 0
    ? (transaction.debtorName ?? transaction.creditorName)
    : transaction.creditorName;
}

function TransactionRow({
  transaction,
  isEvidence,
}: {
  transaction: PSD2Transaction;
  isEvidence: boolean;
}) {
  const Icon = iconFor(transaction);
  const isCredit = transaction.amount > 0;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        transaction.isSimulated &&
          "bg-kbc-blue-soft/60 duration-500 animate-in fade-in slide-in-from-top-2",
        isEvidence && "shadow-[inset_3px_0_0_0_#00A3E0]",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          isCredit ? "bg-emerald-50 text-emerald-600" : "bg-kbc-gray text-kbc-navy",
        )}
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-kbc-navy">
          <span className="truncate">{counterparty(transaction)}</span>
          {isEvidence && (
            <Sparkles className="size-3 shrink-0 text-kbc-blue" aria-label="Kate signal" />
          )}
        </p>
        <p className="truncate text-[11px] text-kbc-muted">
          {transaction.remittanceInformationUnstructured}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-kbc-muted/80">
          <span>{formatDayMonth(transaction.bookingDate)}</span>
          {transaction.merchantCategoryCode && (
            <span className="font-mono">MCC {transaction.merchantCategoryCode}</span>
          )}
          {transaction.isSimulated && (
            <span className="rounded bg-kbc-blue px-1 font-semibold uppercase tracking-wide text-white">
              Live
            </span>
          )}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-[13px] font-semibold tabular-nums",
          isCredit ? "text-emerald-600" : "text-kbc-navy",
        )}
      >
        {formatSignedEuro(transaction.amount)}
      </p>
    </li>
  );
}

export function TransactionFeed() {
  const transactions = useKbcStore((state) => state.transactions);
  const activeAlerts = useKbcStore((state) => state.activeAlerts);

  const evidenceIds = useMemo(
    () => new Set(activeAlerts.flatMap((alert) => alert.evidenceTransactionIds)),
    [activeAlerts],
  );

  return (
    <section aria-label="Recent transactions" className="overflow-hidden rounded-2xl bg-white">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h2 className="text-sm font-semibold text-kbc-navy">Recent transactions</h2>
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-kbc-muted">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          PSD2 feed
        </span>
      </div>
      <ul className="divide-y divide-kbc-line">
        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.transactionId}
            transaction={transaction}
            isEvidence={evidenceIds.has(transaction.transactionId)}
          />
        ))}
      </ul>
    </section>
  );
}
