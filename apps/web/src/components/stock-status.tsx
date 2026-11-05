import { useTranslations } from "next-intl";

import type { Stock } from "@/lib/products";
import { cn } from "@/lib/utils";

const color: Record<Stock, string> = {
  "in-stock": "text-success",
  "low-stock": "text-warning",
  "to-order": "text-muted-foreground",
};

export function StockStatus({ stock, className }: { stock: Stock; className?: string }) {
  const t = useTranslations("Stock");
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", color[stock], className)}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {t(stock)}
    </span>
  );
}
