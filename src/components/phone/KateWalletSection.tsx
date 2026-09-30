import { FIGMA_ASSETS } from "@/components/phone/assets";
import { FigmaIcon } from "@/components/phone/FigmaIcon";

function AddBadge() {
  return (
    <>
      <FigmaIcon
        src={FIGMA_ASSETS.addBadge}
        className="!absolute right-[9px] top-[9px] size-[24px]"
      />
      <p className="absolute right-[31px] top-[7px] translate-x-full text-[24px] text-white">+</p>
    </>
  );
}

/** Figma 10:3249: static editorial block, reproduced as designed. */
export function KateWalletSection() {
  return (
    <section
      className="flex w-full flex-col gap-[20px] overflow-hidden px-[21px]"
      aria-label="Kate Wallet"
    >
      <div className="flex items-center justify-between whitespace-nowrap">
        <h2 className="text-[21px] font-medium text-app-text">Kate Wallet</h2>
        <span className="text-[16px] font-semibold text-app-blue">Open Kate Wallet</span>
      </div>
      <div className="relative flex h-[295px] w-full flex-col gap-[12px] overflow-hidden rounded-[10px] bg-app-wallet py-[20px] pl-[21px]">
        <p className="w-[260px] text-[24px] font-bold text-white">Kate Wallet</p>
        <p className="w-[270px] text-[15px] font-medium leading-[1.3] text-white">
          Bewaar je betaalkaarten en klantenkaarten op één plek om ze overal snel te kunnen
          gebruiken.
        </p>
        <span className="flex h-[36px] w-[191px] items-center justify-center rounded-[18px] border-[1.5px] border-white text-[17px] text-app-card">
          Open Kate Wallet
        </span>

        <div className="absolute left-[351px] top-[17px] h-[156px] w-[138px] overflow-hidden">
          <FigmaIcon
            src={FIGMA_ASSETS.handHelping}
            className="!absolute left-[66px] top-[91px] h-[66px] w-[72px]"
          />
          <div className="absolute left-[20px] top-[16.08px] flex h-[72.718px] w-[100.447px] items-center justify-center">
            <div className="-rotate-12">
              <div className="flex h-[55px] w-[91px] flex-col items-start justify-between overflow-hidden whitespace-nowrap rounded-[6px] border-2 border-[#245274] bg-[#2f7eb9] p-[8px] text-white">
                <p className="text-[8px] font-bold">KBC</p>
                <p className="text-[7px]">•••• 2026</p>
              </div>
            </div>
          </div>
          <div className="absolute left-[30px] top-[-25.15px] flex h-[152.698px] w-[129.957px] items-center justify-center">
            <div className="-rotate-[28deg]">
              <div className="flex h-[132px] w-[77px] flex-col gap-[6px] overflow-hidden rounded-[9px] border-2 border-[#294761] bg-[#eef3f5] p-[8px]">
                <div className="h-[12px] w-full rounded-[3px] bg-[#b7d6e7]" />
                <div className="flex flex-wrap content-start gap-[6px]">
                  {["a", "b", "c", "d"].map((tile) => (
                    <div
                      key={tile}
                      className="size-[24px] rounded-[3px] border border-[#7793a5] bg-white"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <FigmaIcon
          src={FIGMA_ASSETS.moreOptionsLight}
          className="!absolute right-[12px] top-[17px] h-[6px] w-[28px]"
        />

        <div className="absolute left-[21px] top-[176px] flex gap-[16px]">
          <div className="relative flex h-[94px] w-[127px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-app-card">
            <FigmaIcon src={FIGMA_ASSETS.brandMark} className="h-[42px] w-[46px]" />
            <AddBadge />
          </div>
          <div className="relative flex h-[94px] w-[127px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-app-card">
            <span className="flex size-[46px] items-center justify-center rounded-[23px] bg-[#d94150]">
              <FigmaIcon src={FIGMA_ASSETS.circleX} className="size-[27px]" />
            </span>
            <AddBadge />
          </div>
          <div className="relative flex h-[94px] w-[127px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-app-card">
            <div className="flex size-[48.655px] items-center justify-center">
              <div className="flex size-[42px] -rotate-[10deg] items-center justify-center rounded-[5px] bg-app-blue">
                <p className="text-[20px] font-bold text-white">ah</p>
              </div>
            </div>
            <AddBadge />
          </div>
          <div className="relative flex h-[94px] w-[127px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-app-card">
            <FigmaIcon src={FIGMA_ASSETS.gift} className="size-[42px]" />
            <AddBadge />
          </div>
        </div>
      </div>
    </section>
  );
}
