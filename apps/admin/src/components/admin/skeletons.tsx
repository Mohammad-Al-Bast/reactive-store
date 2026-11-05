import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading placeholders shaped like each admin page, shown while its data comes
 * from the API. One status message per page for screen readers; the blocks
 * themselves are hidden from them.
 */

function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-6", className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

const card = "rounded-xl border border-border bg-card";

function Lines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: count }, (_, i) => (
        // Vary the widths a little so it reads as text.
        <Skeleton key={i} className={cn("h-3.5", ["w-full", "w-11/12", "w-4/5", "w-2/3"][i % 4])} />
      ))}
    </div>
  );
}

/** A filter bar: a couple of fields and a button. */
export function FilterBarSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className={cn("grid gap-1.5", i === fields - 1 ? "min-w-48 flex-1" : "w-48")}>
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-24" />
    </div>
  );
}

/** Rows of a table, with a header row. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className={cn(card, "overflow-hidden")}>
      <div className="flex gap-6 bg-muted px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 1 ? "flex-2" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-t border-border px-4 py-4">
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className={cn("flex flex-col gap-1.5", c === 1 ? "flex-2" : "flex-1")}>
              <Skeleton className={cn("h-3.5", c === columns - 1 ? "w-20 rounded-full" : "w-4/5")} />
              {c === 1 ? <Skeleton className="h-3 w-1/2" /> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The product list: thumbnail, two lines and a status pill per row. */
export function ProductListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className={cn(card, "divide-y divide-border overflow-hidden")}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="size-14 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={cn("h-4", i % 2 ? "w-1/2" : "w-2/3")} />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Enquiry cards in two columns. */
export function EnquiryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(card, "flex flex-col gap-3 p-5")}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-56" />
          <Lines count={3} />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Pages ---------- */

export function DashboardSkeleton() {
  return (
    <Loading label="Loading the dashboard…">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={cn(card, "flex flex-col gap-4 p-6")}>
            <div className="flex items-start justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-20" />
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-2 border-y">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2 px-6 py-3 even:border-l">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="p-6">
          <Skeleton className="h-[260px] w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SectionTitleSkeleton />
        <TableSkeleton rows={5} columns={6} />
      </div>
      <div className="flex flex-col gap-3">
        <SectionTitleSkeleton />
        <EnquiryCardsSkeleton count={2} />
      </div>
    </Loading>
  );
}

function SectionTitleSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <Loading label="Loading orders…">
      <FilterBarSkeleton />
      <TableSkeleton rows={8} columns={6} />
    </Loading>
  );
}

export function OrderSkeleton() {
  return (
    <Loading label="Loading the order…">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3.5 w-72 basis-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Customer */}
          <div className={cn(card, "flex flex-col gap-3 p-5")}>
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="grid gap-x-6 sm:grid-cols-[120px_1fr]">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className={cn("h-3.5", i === 3 ? "w-2/3" : "w-1/2")} />
              </div>
            ))}
          </div>
          {/* Items */}
          <div className={cn(card, "flex flex-col gap-3 p-5")}>
            <Skeleton className="h-4 w-16" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-border pt-3">
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3.5 w-8" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            ))}
          </div>
          {/* History */}
          <div className={cn(card, "flex flex-col gap-3 p-5")}>
            <Skeleton className="h-4 w-20" />
            <Lines count={3} />
          </div>
        </div>
        {/* Actions */}
        <div className={cn(card, "flex flex-col gap-3 p-5")}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </Loading>
  );
}

export function EnquiriesSkeleton() {
  return (
    <Loading label="Loading enquiries…">
      <div className="flex gap-2">
        {[20, 24, 16].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <EnquiryCardsSkeleton count={6} />
    </Loading>
  );
}

export function ProductsSkeleton() {
  return (
    <Loading label="Loading products…">
      <FilterBarSkeleton fields={3} />
      <ProductListSkeleton rows={8} />
    </Loading>
  );
}

/** The product editor: text, photos and related products, with settings alongside. */
export function ProductEditorSkeleton() {
  return (
    <Loading label="Loading the product…">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <div className={cn(card, "flex flex-col gap-4 p-5")}>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, f) => (
                <div key={f} className="grid gap-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
          <div className={cn(card, "flex flex-col gap-3 p-5")}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-64" />
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-20 shrink-0" />
                <Skeleton className="h-11 flex-1" />
              </div>
            ))}
          </div>
          <div className={cn(card, "flex flex-col gap-3 p-5")}>
            <Skeleton className="h-4 w-36" />
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-4/5" />
              ))}
            </div>
          </div>
        </div>
        <div className={cn(card, "flex flex-col gap-4 p-5")}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </Loading>
  );
}

export function DepartmentsSkeleton() {
  return (
    <Loading label="Loading departments…" className="gap-4">
      <Skeleton className="h-3.5 w-2/3" />
      <TableSkeleton rows={5} columns={4} />
    </Loading>
  );
}

/** One department: title, the English/Arabic form, then its products. */
export function DepartmentSkeleton() {
  return (
    <Loading label="Loading the department…" className="gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>
      <div className={cn(card, "flex flex-col gap-6 p-6")}>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-4">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 4 }, (_, f) => (
                <div key={f} className="grid gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className={cn("w-full", f === 2 ? "h-20" : "h-11")} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-5">
          <div className="flex gap-4">
            <Skeleton className="h-11 w-72" />
            <Skeleton className="h-11 w-24" />
          </div>
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-11 w-36" />
        </div>
        <ProductListSkeleton rows={4} />
      </div>
    </Loading>
  );
}
