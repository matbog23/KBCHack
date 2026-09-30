import { Check, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Full-screen in-app page that slides over the home screen, in KBC Mobile's dark style. */
export function FlowScreen({
  title,
  onBack,
  children,
  footer,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-[45] flex flex-col bg-app-bg pt-[64px] duration-500 animate-in slide-in-from-right">
      <div className="flex h-[76px] shrink-0 items-center gap-[16px] px-[20px]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Terug"
          className="flex size-[52px] items-center justify-center rounded-full border border-app-line bg-app-card text-app-text"
        >
          <ChevronLeft className="size-[26px]" aria-hidden="true" />
        </button>
        <h2 className="text-[22px] font-semibold text-app-text">{title}</h2>
      </div>
      <div className="scrollbar-hide flex-1 overflow-y-auto px-[24px] pb-[24px]">{children}</div>
      <div className="shrink-0 px-[24px] pb-[48px] pt-[12px]">{footer}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[62px] w-full rounded-full bg-app-blue text-[20px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function FlowSuccess({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[18px] pt-[60px] text-center duration-500 animate-in fade-in zoom-in-95">
      <span className="flex size-[96px] items-center justify-center rounded-full bg-app-green">
        <Check className="size-[52px] text-white" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h3 className="text-[28px] font-bold text-app-text">{title}</h3>
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-[10px] text-[16px] font-medium text-app-subtle">{children}</p>;
}
