"use client";

import * as React from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Cart");
  const [added, flash] = useAddedFlash();
  return (
    <Button
      type="button"
      className={className}
      aria-label={t("addLabel", { name })}
      onClick={() => {
        add(slug);
        flash();
      }}
    >
      {added ? (
        <>
          <Check /> {t("added")}
        </>
      ) : (
        t("add")
      )}
    </Button>
  );
}

/** Quantity stepper + add button used on the product page. */
export function AddToCartWithQty({ slug, name }: { slug: string; name: string }) {
  const { add } = useCart();
  const t = useTranslations("Cart");
  const [qty, setQty] = React.useState(1);
  const [added, flash] = useAddedFlash();
  return (
    <div className="flex flex-wrap gap-3">
      <div
        role="group"
        aria-label={t("quantity")}
        className="flex h-13 items-center rounded-md border border-input bg-card"
      >
        <button
          type="button"
          aria-label={t("decrease")}
          className="flex h-full w-12 items-center justify-center rounded-s-md hover:bg-muted disabled:opacity-40"
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
          aria-label={t("increase")}
          className="flex h-full w-12 items-center justify-center rounded-e-md hover:bg-muted"
          onClick={() => setQty((q) => q + 1)}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <Button
        type="button"
        size="lg"
        className={cn("flex-1 basis-48")}
        aria-label={t("addQtyLabel", { qty, name })}
        onClick={() => {
          add(slug, qty);
          flash();
        }}
      >
        {added ? (
          <>
            <Check /> {t("addedToCart")}
          </>
        ) : (
          t("add")
        )}
      </Button>
    </div>
  );
}
