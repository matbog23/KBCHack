import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Start", icon: FIGMA_ASSETS.navWalletCards, active: true },
  { label: "Mijn KBC", icon: FIGMA_ASSETS.navList, active: false },
  { label: "Beleggen", icon: FIGMA_ASSETS.navPiggyBank, active: false },
  { label: "Zakelijk", icon: FIGMA_ASSETS.navBriefcaseBusiness, active: false },
  { label: "Aanbod", icon: FIGMA_ASSETS.navLayers, active: false },
] as const;

/** Figma 10:3357: floating glass tab bar. */
export function BottomNav() {
  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="absolute bottom-[40px] left-[27px] z-30 flex h-[86px] w-[474px] items-center justify-between overflow-hidden rounded-[43px] border border-[#898b8d] bg-[rgba(91,93,94,0.9)] px-[14px] py-[10px] shadow-[0_8px_20px_0_rgba(0,0,0,0.4)] backdrop-blur-md"
    >
      {ITEMS.map((item) => (
        <span
          key={item.label}
          aria-current={item.active ? "page" : undefined}
          className="flex w-[78px] flex-col items-center justify-center gap-[5px]"
        >
          <FigmaIcon src={item.icon} className="size-[27px]" />
          <span
            className={cn(
              "whitespace-nowrap text-[13px] text-app-text",
              item.active ? "font-bold" : "font-medium",
            )}
          >
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

/** Figma 10:3247: the floating "overschrijven" action. */
export function TransferFab() {
  return (
    <span className="absolute bottom-[146px] right-[23px] z-30 flex size-[74px] items-center justify-center rounded-[37px] bg-app-blue shadow-[0_8px_20px_0_rgba(0,0,0,0.4)]">
      <FigmaIcon src={FIGMA_ASSETS.arrowLeftRight} className="size-[38px]" alt="Overschrijven" />
    </span>
  );
}
