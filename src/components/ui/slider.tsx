"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-kbc-line">
        <SliderPrimitive.Range className="absolute h-full bg-kbc-blue" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Months into the future"
        className="block size-5 rounded-full border-2 border-kbc-blue bg-white shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-kbc-blue/30"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
