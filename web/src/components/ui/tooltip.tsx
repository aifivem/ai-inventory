import type { ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

/** Radix tooltip in Dark Minimal: panel surface, hairline, no arrow. */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[80] w-[28vh] animate-fade rounded-[0.8vh] border border-line bg-panel p-[1.2vh] text-[1.3vh] text-text-2 [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.5)]",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
