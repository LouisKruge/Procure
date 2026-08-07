import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // Sunken face, hairline edge, no shadow: a field is milled *into*
        // the panel, so it should read as below the surface, not above it.
        "flex h-11 w-full rounded-[var(--r-md)] bg-[var(--layer-sunken)] px-3.5 py-2 text-base tracking-[-0.005em] transition-[background-color,box-shadow] duration-150",
        "ring-1 ring-inset ring-[var(--line-strong)]",
        "placeholder:text-[var(--text-disabled)]",
        "hover:ring-[oklch(1_0_0_/_0.18)]",
        "focus-visible:outline-none focus-visible:bg-[var(--layer-surface)] focus-visible:ring-[1.5px] focus-visible:ring-[oklch(1_0_0_/_0.55)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/** Big, centred quantity field for counting and receiving screens. */
const QtyInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      className={cn(
        "h-14 text-center text-2xl font-bold tabular [appearance:textfield]",
        "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  ),
);
QtyInput.displayName = "QtyInput";

export { Input, QtyInput };
