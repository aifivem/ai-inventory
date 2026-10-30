import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

/** TGIANN pill buttons (docs/design.md): green `primary` for the view's one main action, grey `secondary` / `grey`, red `destructive`, round `icon`. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[0.8vh] rounded-full px-[1.6vh] whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out enabled:active:[transform:scale(0.97)] disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-tgi-green font-bold text-tgi-green-text enabled:hover:bg-tgi-green-hover",
        secondary:
          "bg-control font-medium text-white enabled:hover:bg-control-hover",
        grey: "bg-white/6 font-medium text-text-3 enabled:hover:bg-white/12 enabled:hover:text-white",
        destructive:
          "bg-danger-bg font-medium text-danger enabled:hover:bg-danger-solid enabled:hover:text-white",
        icon: "size-[3.2vh] bg-control px-0 text-[1.2vh] text-text-2 enabled:hover:bg-control-hover enabled:hover:text-white enabled:active:[transform:scale(0.9)]",
      },
      size: {
        md: "h-[3.6vh] text-[1.4vh]",
        sm: "h-[3vh] text-[1.25vh]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

interface ButtonProps
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Shows a spinner next to the label and disables the button while an action runs. */
  busy?: boolean;
}

export function Button({
  className,
  variant,
  size,
  busy = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy && (
        <FontAwesomeIcon icon={faSpinner} spin data-icon="inline-start" />
      )}
      {children}
    </button>
  );
}
