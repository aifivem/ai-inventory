import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/** TGIANN pill input: translucent control fill, white hairline, green border on focus. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-[3.6vh] w-full min-w-0 rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] text-[1.3vh] text-white transition-colors duration-150 outline-none placeholder:text-text-4 hover:border-white/15 focus:border-tgi-green-40 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
