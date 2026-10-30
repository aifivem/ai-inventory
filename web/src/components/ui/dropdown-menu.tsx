import type { ComponentProps } from "react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import { cn } from "../../lib/utils";

/** Radix dropdown menu, TGIANN floating surface (tgiann-ui components.md): #161616, ring, ambient shadow, white-alpha row on hover. */
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[85] min-w-[18vh] animate-fade rounded-[1vh] bg-float p-[0.4vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex h-[3.2vh] cursor-pointer items-center gap-[0.8vh] rounded-[0.6vh] px-[0.8vh] text-[1.3vh] text-text-2 transition-colors duration-150 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/6 data-[highlighted]:text-white",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn("my-[0.4vh] h-px bg-white/8", className)}
      {...props}
    />
  );
}
