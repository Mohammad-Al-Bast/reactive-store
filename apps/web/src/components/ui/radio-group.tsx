"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

/** A whole-card radio option: the card is the hit area, styled when selected. */
function RadioCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        "flex min-h-18 flex-col items-start gap-0.5 rounded-lg border border-input bg-card px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=checked]:border-2 data-[state=checked]:border-brand data-[state=checked]:bg-gold-soft",
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioCard };
