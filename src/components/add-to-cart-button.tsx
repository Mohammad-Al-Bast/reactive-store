"use client";

import * as React from "react";
import { Check, Minus, Plus } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useAddedFlash() {
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);
  return [added, () => setAdded(true)] as const;
}

/** Compact button used on product cards. */
export function AddToCartButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const { add } = useCart();
  const [added, flash] = useAddedFlash();
  return (
    <Button
      type="button"
      className={className}
      aria-label={`Add ${name} to cart`}
      onClick={() => {
        add(slug);
        flash();
      }}
    >
      {added ? (
        <>
          <Check /> Added
        </>
      ) : (
        "Add to cart"
      )}
    </Button>
  );
}

/** Quantity stepper + add button used on the product page. */
export function AddToCartWithQty({ slug, name }: { slug: string; name: string }) {
  const { add } = useCart();
  const [qty, setQty] = React.useState(1);
  const [added, flash] = useAddedFlash();
  return (
    <div className="flex flex-wrap gap-3">
      <div
        role="group"
        aria-label="Quantity"
        className="flex h-13 items-center rounded-md border border-input bg-card"
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          className="flex h-full w-12 items-center justify-center rounded-l-md hover:bg-muted disabled:opacity-40"
          disabled={qty <= 1}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          <Minus className="size-4" />
        </button>
        <output aria-live="polite" className="w-9 text-center font-semibold">
          {qty}
        </output>
        <button
          type="button"
          aria-label="Increase quantity"
          className="flex h-full w-12 items-center justify-center rounded-r-md hover:bg-muted"
          onClick={() => setQty((q) => q + 1)}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <Button
        type="button"
        size="lg"
        className={cn("flex-1 basis-48")}
        aria-label={`Add ${qty} ${name} to cart`}
        onClick={() => {
          add(slug, qty);
          flash();
        }}
      >
        {added ? (
          <>
            <Check /> Added to cart
          </>
        ) : (
          "Add to cart"
        )}
      </Button>
    </div>
  );
}
