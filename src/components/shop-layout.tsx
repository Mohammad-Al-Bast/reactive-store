import Link from "next/link";
import { Suspense } from "react";

import { ProductBrowser, ProductGridFallback } from "@/components/product-browser";
import { Button } from "@/components/ui/button";
import { categories, type CategorySlug, type Product } from "@/lib/products";
import { whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ShopLayout({
  title,
  description,
  products,
  active,
}: {
  title: string;
  description: string;
  products: Product[];
  active?: CategorySlug;
}) {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="container-page pt-7 pb-9">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            {active ? (
              <>
                <Link href="/shop" className="hover:text-foreground">
                  Shop
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-foreground" aria-current="page">
                  {title}
                </span>
              </>
            ) : (
              <span className="text-foreground" aria-current="page">
                Shop
              </span>
            )}
          </nav>
          <h1 className="display mt-4.5 mb-3 text-[clamp(2.1rem,4vw,3.25rem)]">{title}</h1>
          <p className="max-w-2xl text-[17px] text-body">{description}</p>
          <nav aria-label="Departments" className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/shop"
              className={cn(
                "flex h-10 items-center rounded-full border px-4 text-sm",
                !active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:border-foreground",
              )}
              aria-current={!active ? "page" : undefined}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                aria-current={active === c.slug ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-full border px-4 text-sm",
                  active === c.slug
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-input bg-card hover:border-foreground",
                )}
              >
                {c.short}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="container-page py-9 pb-18">
        <Suspense fallback={<ProductGridFallback products={products} />}>
          <ProductBrowser products={products} />
        </Suspense>
      </div>

      <section className="container-page pb-20">
        <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-6 rounded-2xl bg-ink p-[clamp(1.75rem,4vw,3rem)] text-[#f3efe6]">
          <div className="min-w-0 flex-[1_1_480px]">
            <h2 className="mb-2 font-serif text-[clamp(1.6rem,3vw,2.25rem)] font-medium leading-tight text-white">
              Not sure which product is right for you?
            </h2>
            <p className="text-ink-text">
              Tell us whether it is for a clinic, your studies or home use, and we will point you to the right model.
            </p>
          </div>
          <Button asChild variant="accent" size="lg">
            <a href={whatsappHref("Hello Reactive Store, I'd like advice choosing a product.")} target="_blank" rel="noreferrer">
              Ask us on WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
