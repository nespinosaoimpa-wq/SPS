import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 uppercase tracking-[0.2em] font-mono haptic-light relative overflow-hidden active:scale-95 active:duration-75",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-black shadow-[0_0_20px_rgba(255,215,0,0.1)] hover:bg-accent hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] font-black",
        destructive:
          "bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm hover:bg-red-500/20",
        outline:
          "border border-white/10 bg-white/5 text-white shadow-sm hover:bg-white/10 hover:border-white/20",
        secondary:
          "bg-zinc-900 border border-white/5 text-white shadow-sm hover:bg-zinc-800",
        ghost: "text-zinc-500 hover:text-white hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
        tactical: "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 shadow-[0_0_15px_rgba(255,215,0,0.05)] font-black",
        vanguard: "bg-white text-black font-black hover:bg-primary shadow-xl",
      },
      size: {
        default: "h-12 px-8 py-2",
        sm: "h-9 px-4 text-[10px]",
        lg: "h-16 px-12 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
