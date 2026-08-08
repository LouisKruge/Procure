import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Sizes run one step larger than the shadcn defaults on purpose: the
 * baseline target here is a gloved thumb on a tablet, not a mouse pointer.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-sm font-medium tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* White face, black type. The brightest thing on the screen, which is
           the weight a commit action earns when nothing else uses colour. */
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_0_oklch(1_0_0_/_0.28)_inset] hover:bg-[var(--brass-bright)] active:bg-[oklch(0.76_0.05_85)]",
        /* Oxide, not signal. Dark enough to sit in a monochrome row. */
        destructive:
          "bg-destructive text-destructive-foreground ring-1 ring-inset ring-[oklch(0.62_0.14_25_/_0.32)] hover:bg-[oklch(0.37_0.10_25)]",
        outline:
          "bg-[var(--layer-surface)] text-[var(--text-primary)] ring-1 ring-inset ring-[var(--line-strong)] hover:bg-[var(--layer-elevated)] hover:ring-[oklch(1_0_0_/_0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--layer-interactive)]",
        ghost:
          "text-[var(--text-tertiary)] hover:bg-[var(--layer-interactive)] hover:text-[var(--text-primary)]",
        link: "text-[var(--text-primary)] underline-offset-4 hover:underline",
        /* An affirmative action is still a button, not a status: it gets the
           secondary chassis, and only the label carries the channel. */
        ok: "bg-[var(--layer-surface)] text-ok ring-1 ring-inset ring-[var(--line-strong)] hover:bg-[var(--layer-elevated)] hover:ring-[oklch(0.62_0.08_158_/_0.35)]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-14 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
