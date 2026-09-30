"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccountsAndPayments } from "@/components/phone/AccountsAndPayments";
import { AppHeader, StatusBar } from "@/components/phone/AppHeader";
import { BottomNav, TransferFab } from "@/components/phone/BottomNav";
import { CashOverview } from "@/components/phone/CashOverview";
import { ForYouSection } from "@/components/phone/ForYouSection";
import { ChildAccountFlow } from "@/components/phone/flows/ChildAccountFlow";
import { EstatePlannerFlow } from "@/components/phone/flows/EstatePlannerFlow";
import { KateMomentCard } from "@/components/phone/KateMomentCard";
import { KateSheet } from "@/components/phone/KateSheet";
import { KateWalletSection } from "@/components/phone/KateWalletSection";
import { PhoneDevice } from "@/components/phone/PhoneDevice";
import { PushNotification } from "@/components/phone/PushNotification";
import { useKbcStore } from "@/store/useKbcStore";
import type { KateAlert } from "@/types/psd2";

const SPOTLIGHT_MS = 1_400;

type Overlay =
  | { kind: "why"; alert: KateAlert; accepted: boolean }
  | { kind: "child-account" }
  | { kind: "estate-planner" };

/** The KBC Mobile "Start" screen from Figma 10:3133, wired to the emulator's live ledger. */
export function KbcHomeScreen() {
  const alerts = useKbcStore((state) => state.activeAlerts);
  const personaId = useKbcStore((state) => state.personaId);
  const clearNotification = useKbcStore((state) => state.clearNotification);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const forYouRef = useRef<HTMLDivElement>(null);

  // A different customer means a different phone: close whatever was open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on persona change only
  useEffect(() => setOverlay(null), [personaId]);

  useEffect(() => {
    if (!spotlightId) return;
    const timer = window.setTimeout(() => setSpotlightId(null), SPOTLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [spotlightId]);

  const accept = useCallback(
    (alert: KateAlert) => {
      clearNotification();
      if (alert.flow === "open-child-account") setOverlay({ kind: "child-account" });
      else if (alert.flow === "estate-planner") setOverlay({ kind: "estate-planner" });
      else setOverlay({ kind: "why", alert, accepted: true });
    },
    [clearNotification],
  );
  const explain = useCallback(
    (alert: KateAlert) => {
      clearNotification();
      setOverlay({ kind: "why", alert, accepted: false });
    },
    [clearNotification],
  );
  const close = useCallback(() => setOverlay(null), []);

  const showMoment = useCallback((alert: KateAlert) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setSpotlightId(alert.id);
  }, []);

  const [headline, ...others] = alerts;
  const card = (alert: KateAlert) => (
    <KateMomentCard
      key={alert.id}
      alert={alert}
      onAccept={accept}
      onExplain={explain}
      spotlight={spotlightId === alert.id}
    />
  );

  return (
    <PhoneDevice>
      <StatusBar />
      <div
        ref={scrollRef}
        className="scrollbar-hide h-full overflow-y-auto overscroll-contain pb-[150px] pt-[64px]"
      >
        <AppHeader
          onOpenInbox={() =>
            forYouRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
        <div className="flex w-full flex-col gap-[34px]">
          {headline && <div className="px-[20px]">{card(headline)}</div>}
          <AccountsAndPayments />
          <div ref={forYouRef} className="scroll-mt-[72px]">
            <ForYouSection moments={others.map(card)} />
          </div>
          <KateWalletSection />
          <CashOverview />
        </div>
      </div>
      <TransferFab />
      <BottomNav />
      <PushNotification onOpen={showMoment} />
      {overlay?.kind === "why" && (
        <KateSheet
          key={overlay.alert.id}
          alert={overlay.alert}
          onClose={close}
          onAccept={accept}
          initiallyAccepted={overlay.accepted}
        />
      )}
      {overlay?.kind === "child-account" && <ChildAccountFlow onClose={close} />}
      {overlay?.kind === "estate-planner" && <EstatePlannerFlow onClose={close} />}
    </PhoneDevice>
  );
}
