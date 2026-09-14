import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// Every variant defines hover AND active (pressed) states explicitly, plus a
// shared active:scale-[0.98] so clicking any button gives the same tactile
// feedback everywhere — before this, active/pressed states existed on none
// of the base variants, and the two gradient styles used site-wide
// ("gradient" for primary admin actions, "brand" for auth/CTA pages) were
// copy-pasted as raw className strings in ~35 places with inconsistent
// hover shades and no pressed state at all.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline",
        // The site-wide "primary admin action" style — Save, Create, Add —
        // was emerald-to-cyan (no relation to the brand palette at all); now
        // the brand coral, matching every other primary CTA on the public site.
        gradient:
          "bg-gradient-to-r from-brand-orange to-brand-orange-hot text-white shadow hover:opacity-90 active:opacity-80",
        // The site-wide auth/CTA style — Sign In, Create Account — previously
        // pasted inline as bg-gradient-to-r from-brand-blue-mid to-brand-blue-light.
        brand:
          "bg-gradient-to-r from-brand-blue-mid to-brand-blue-light text-white shadow hover:from-brand-blue-bright hover:to-brand-blue-light active:from-brand-blue-mid active:to-brand-blue-mid",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
