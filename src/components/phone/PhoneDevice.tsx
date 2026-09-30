"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** Native size of the device incl. bezel: a 528 × 1144 screen (Figma width, iPhone ratio) + 16px. */
const DEVICE_WIDTH = 560;
const DEVICE_HEIGHT = 1176;
const MAX_ZOOM = 0.85;
/** Below this width the page stacks and the phone sizes to the viewport instead of its column. */
const STACKED_BREAKPOINT = 1280;

/**
 * iPhone-style device shell. The screen is laid out at the Figma frame's native 528px width and
 * the whole device is zoomed to fill the space its parent gives it, so it never scrolls the page.
 */
export function PhoneDevice({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.62);

  useLayoutEffect(() => {
    const slot = frameRef.current?.parentElement;
    if (!slot) return;
    const fitToSlot = () => {
      const stacked = window.innerWidth < STACKED_BREAKPOINT;
      const height = stacked ? window.innerHeight - 48 : slot.clientHeight;
      const width = stacked ? window.innerWidth - 32 : Number.POSITIVE_INFINITY;
      setZoom(Math.min(MAX_ZOOM, height / DEVICE_HEIGHT, width / DEVICE_WIDTH));
    };
    fitToSlot();
    const observer = new ResizeObserver(fitToSlot);
    observer.observe(slot);
    window.addEventListener("resize", fitToSlot);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitToSlot);
    };
  }, []);

  return (
    <div ref={frameRef} style={{ zoom }} className="shrink-0">
      <div className="relative rounded-[92px] bg-[#16181b] p-[16px] shadow-[0_0_0_2px_#3a3d42,0_60px_120px_-30px_rgba(17,19,22,0.55),inset_0_0_0_2px_#0a0b0c]">
        <span className="absolute -left-[3px] top-[220px] h-[70px] w-[4px] rounded-l bg-[#2b2e33]" />
        <span className="absolute -left-[3px] top-[310px] h-[110px] w-[4px] rounded-l bg-[#2b2e33]" />
        <span className="absolute -right-[3px] top-[280px] h-[150px] w-[4px] rounded-r bg-[#2b2e33]" />
        <div className="relative h-[1144px] w-[528px] overflow-hidden rounded-[76px] bg-app-bg">
          <div className="pointer-events-none absolute left-1/2 top-[18px] z-50 h-[46px] w-[158px] -translate-x-1/2 rounded-full bg-black" />
          {children}
          <div className="pointer-events-none absolute bottom-[12px] left-1/2 z-50 h-[6px] w-[190px] -translate-x-1/2 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}
