"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { audienceLabel, type Audience, type Product } from "@/lib/products";

type Sort = "popular" | "price-asc" | "price-desc" | "name";

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Product grid with type / audience / stock filters, search and sort — all client-side. */
export function ProductBrowser({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim().toLowerCase();

  const types = React.useMemo(() => Array.from(new Set(products.map((p) => p.type))), [products]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [audiences, setAudiences] = React.useState<Audience[]>([]);
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [sort, setSort] = React.useState<Sort>("popular");
  const [showFilters, setShowFilters] = React.useState(false);

  const visible = React.useMemo(() => {
    const list = products.filter((p) => {
      if (query && !`${p.name} ${p.type} ${p.summary}`.toLowerCase().includes(query)) return false;
      if (selectedTypes.length && !selectedTypes.includes(p.type)) return false;
      if (audiences.length && !audiences.some((a) => p.audience.includes(a))) return false;
      if (inStockOnly && p.stock === "to-order") return false;
      return true;
    });
    const price = (p: Product) => p.price ?? Number.POSITIVE_INFINITY;
    if (sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "popular") list.sort((a, b) => Number(!!b.bestSeller) - Number(!!a.bestSeller));
    return list;
  }, [products, query, selectedTypes, audiences, inStockOnly, sort]);

  const activeCount = selectedTypes.length + audiences.length + (inStockOnly ? 1 : 0);
  const reset = () => {
    setSelectedTypes([]);
    setAudiences([]);
    setInStockOnly(false);
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside
        aria-label="Filters"
        className={`${showFilters ? "flex" : "hidden"} w-full shrink-0 flex-col gap-6 rounded-xl border border-border bg-card p-6 lg:flex lg:w-64`}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold">Filters</span>
          {activeCount ? (
            <button type="button" onClick={reset} className="text-sm font-semibold text-brand hover:underline">
              Clear
            </button>
          ) : null}
        </div>

        {types.length > 1 ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-semibold">Product type</legend>
            {types.map((t) => {
              const id = `type-${t}`;
              return (
                <div key={t} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={selectedTypes.includes(t)}
                    onCheckedChange={() => setSelectedTypes((s) => toggle(s, t))}
                  />
                  <Label htmlFor={id} className="flex-1 text-[15px] font-normal">
                    {t}
                    <span className="ml-auto text-muted-foreground">{products.filter((p) => p.type === t).length}</span>
                  </Label>
                </div>
              );
            })}
          </fieldset>
        ) : null}

        <fieldset className="flex flex-col gap-3 border-t border-[#efebe2] pt-5">
          <legend className="float-left mb-3 w-full pt-5 text-sm font-semibold">Best for</legend>
          {(Object.keys(audienceLabel) as Audience[]).map((a) => {
            const id = `aud-${a}`;
            return (
              <div key={a} className="flex items-center gap-2.5">
                <Checkbox id={id} checked={audiences.includes(a)} onCheckedChange={() => setAudiences((s) => toggle(s, a))} />
                <Label htmlFor={id} className="text-[15px] font-normal">
                  {audienceLabel[a]}
                </Label>
              </div>
            );
          })}
        </fieldset>

        <div className="flex items-center gap-2.5 border-t border-[#efebe2] pt-5">
          <Checkbox id="in-stock" checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(v === true)} />
          <Label htmlFor="in-stock" className="text-[15px] font-normal">
            In stock only
          </Label>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
            </Button>
            <p className="text-[15px] text-muted-foreground" aria-live="polite">
              Showing <strong className="text-foreground">{visible.length}</strong> of {products.length} products
              {query ? (
                <>
                  {" "}
                  for “<strong className="text-foreground">{params.get("q")}</strong>”
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Label htmlFor="sort">Sort by</Label>
            <NativeSelect id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-48">
              <option value="popular">Most popular</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </NativeSelect>
          </div>
        </div>

        {visible.length ? (
          <div className="grid gap-4.5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input bg-card p-8">
            <p className="font-semibold">No products match these filters.</p>
            <p className="text-muted-foreground">Try removing a filter, or ask us — we may be able to source it.</p>
            {activeCount ? (
              <Button variant="secondary" onClick={reset}>
                <X /> Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shown while the browser reads the search query (and for no-JS crawlers). */
export function ProductGridFallback({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
