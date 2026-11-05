import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

/** Product photo on the warm grey ground, or a clear placeholder until a photo exists. */
export function ProductImage({
  product,
  className,
  sizes = "(max-width: 768px) 100vw, 300px",
  priority,
}: {
  product: Product;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const t = useTranslations("Common");
  return (
    <div className={cn("relative flex items-center justify-center bg-muted", className)}>
      {product.image ? (
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          // Uploads are already resized WebP files from the API.
          unoptimized={product.image.startsWith("/uploads/")}
          className="object-contain p-5 mix-blend-multiply"
        />
      ) : (
        <div className="m-4 flex size-[calc(100%-2rem)] flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-[#cdbf9f] text-center text-xs text-muted-foreground">
          <ImageIcon aria-hidden="true" className="size-6 text-brand" />
          {t("photoComingSoon")}
        </div>
      )}
    </div>
  );
}
