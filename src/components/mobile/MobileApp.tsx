import { KateInsightList, KateInterceptor } from "@/components/mobile/KateInterceptor";
import { KbcTopBar } from "@/components/mobile/KbcTopBar";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { TransactionFeed } from "@/components/mobile/TransactionFeed";

export function MobileApp() {
  return (
    <PhoneFrame>
      <KbcTopBar />
      <div className="-mt-3 space-y-4 rounded-t-3xl bg-kbc-gray px-3 pb-10 pt-3">
        <KateInterceptor />
        <TransactionFeed />
        <KateInsightList />
      </div>
    </PhoneFrame>
  );
}
