import type { ComponentProps } from "react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

/** Radix dropdown menu in Dark Minimal (docs/design.md): panel surface, hairline, raised row on hover / focus. */
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 4, ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[85] min-w-[18vh] animate-fade rounded-[0.8vh] border border-line bg-panel p-[0.4vh] [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.5)]",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex h-[3.4vh] cursor-pointer items-center gap-[1vh] rounded-[0.6vh] px-[1.2vh] text-[1.35vh] text-text-2 outline-none transition-colors duration-150 data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-raised data-[highlighted]:text-text",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("my-[0.4vh] h-px bg-line", className)} {...props} />;
}
