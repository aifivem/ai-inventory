import type { ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

/** Radix tooltip, TGIANN floating surface: #161616, ring, ambient shadow, no arrow. */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[80] w-[28vh] animate-fade rounded-[1vh] bg-float p-[1.2vh] text-[1.3vh] text-text-2 [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
