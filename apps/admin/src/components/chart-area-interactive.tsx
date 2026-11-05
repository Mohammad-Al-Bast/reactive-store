"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AdminDailyPoint } from "@reactive-store/shared";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPrice } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const ranges = [
  { value: "90", label: "Last 3 months" },
  { value: "30", label: "Last 30 days" },
  { value: "7", label: "Last 7 days" },
] as const;
type Range = (typeof ranges)[number]["value"];
type Metric = "orders" | "sales";

const chartConfig = {
  orders: { label: "Orders", color: "var(--chart-2)" },
  sales: { label: "Sales", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Dates are "2026-11-05" calendar days, so format them in UTC to keep the same day.
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtDate = (value: string) => shortDate.format(new Date(`${value}T00:00:00Z`));

/** Orders or sales per day, over 7, 30 or 90 days. */
export function ChartAreaInteractive({ daily }: { daily: AdminDailyPoint[] }) {
  const isMobile = useIsMobile();
  // Until the admin picks a range, phones show 30 days (more readable at that width).
  const [picked, setRange] = React.useState<Range | null>(null);
  const range: Range = picked ?? (isMobile ? "30" : "90");
  const [metric, setMetric] = React.useState<Metric>("orders");

  const data = daily.slice(-Number(range));
  const totals = {
    orders: data.reduce((n, p) => n + p.orders, 0),
    sales: data.reduce((n, p) => n + p.sales, 0),
  };
  const rangeLabel = ranges.find((r) => r.value === range)!.label;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{metric === "orders" ? "Orders per day" : "Sales per day"}</CardTitle>
        <CardDescription>{rangeLabel}, Lebanon time</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {ranges.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {ranges.map((r) => (
                <SelectItem key={r.value} value={r.value} className="rounded-lg">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <div className="grid grid-cols-2 border-y" role="group" aria-label="Show">
        {(["orders", "sales"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
            className={cn(
              "flex flex-col gap-0.5 px-6 py-3 text-left transition-colors even:border-l hover:bg-muted/60",
              metric === key && "bg-gold-soft",
            )}
          >
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: chartConfig[key].color }} />
              {chartConfig[key].label}
            </span>
            <span className="font-serif text-2xl tabular-nums">
              {key === "sales" ? formatPrice(totals.sales) : totals.orders}
            </span>
          </button>
        ))}
      </div>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8 }}>
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.6} />
                <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={fmtDate} />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => (metric === "sales" ? `$${v}` : String(v))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => fmtDate(String(value))}
                  formatter={(value) => (
                    <span className="flex w-full justify-between gap-4">
                      <span className="text-muted-foreground">{chartConfig[metric].label}</span>
                      <span className="font-semibold tabular-nums">
                        {metric === "sales" ? formatPrice(Number(value)) : value}
                      </span>
                    </span>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey={metric}
              type="monotone"
              fill={`url(#fill-${metric})`}
              stroke={`var(--color-${metric})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
