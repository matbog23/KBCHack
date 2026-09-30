import { cn } from "@/lib/utils";

interface FigmaIconProps {
  src: string;
  /** Tailwind size classes matching the Figma layer, e.g. "size-[22px]" or "h-[18px] w-[24px]". */
  className: string;
  alt?: string;
}

/** Renders an exported Figma vector in its original slot size. */
export function FigmaIcon({ src, className, alt = "" }: FigmaIconProps) {
  return (
    <span className={cn("relative block shrink-0", className)}>
      {/* biome-ignore lint/performance/noImgElement: static SVGs exported from Figma, no optimisation needed */}
      <img alt={alt} src={src} className="absolute inset-0 block size-full max-w-none" />
    </span>
  );
}
