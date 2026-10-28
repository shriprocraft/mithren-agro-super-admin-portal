import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";

// Same variants and colours as the storefront Button (Modern Sage): pill shape, solid 2px #2E7D32
// focus ring, primary #2E7D32 → hover #1B5E20 → pressed #154A19. The storefront's gold "buy" variant
// is reserved for "Buy now" and is intentionally not offered here. "sm" exists for dense table rows.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "surface-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-border disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none",
        outline: "border-border bg-card text-primary hover:border-primary/35 hover:bg-soft hover:text-primary-hover",
        secondary: "border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_8%)]",
        ghost: "text-foreground hover:bg-soft hover:text-primary",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive",
        "destructive-solid": "bg-destructive text-white hover:bg-[color-mix(in_oklab,var(--destructive),black_15%)] focus-visible:ring-destructive",
        link: "h-auto px-0 text-primary underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner, disables the button and sets aria-busy. Not supported with asChild. */
    loading?: boolean;
  };

function Button({ className, variant, size, asChild = false, loading = false, disabled, children, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
