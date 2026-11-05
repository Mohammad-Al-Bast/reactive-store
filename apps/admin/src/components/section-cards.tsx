import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { AdminDashboard } from "@reactive-store/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

/** Totals for the last `days` days and the `days` before that. */
export function periodTotals(daily: AdminDashboard["daily"], days: number) {
  const current = daily.slice(-days);
  const previous = daily.slice(-2 * days, -days);
  const sum = (points: typeof daily, key: "orders" | "sales") => points.reduce((n, p) => n + p[key], 0);
  return {
    orders: sum(current, "orders"),
    sales: sum(current, "sales"),
    previousOrders: sum(previous, "orders"),
    previousSales: sum(previous, "sales"),
  };
}

/** Percent change, or null when there is nothing to compare with. */
function change(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="outline">New</Badge>;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <Badge variant="outline" className={value >= 0 ? "text-success" : "text-destructive"}>
      <Icon />
      {value > 0 ? "+" : ""}
      {value}%
    </Badge>
  );
}

/** The four headline numbers at the top of the dashboard. */
export function SectionCards({ dashboard: d }: { dashboard: AdminDashboard }) {
  const t = periodTotals(d.daily, 30);
  const ordersChange = change(t.orders, t.previousOrders);
  const salesChange = change(t.sales, t.previousSales);
  const linkCard = "transition-colors hover:border-brand";

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-gold-soft *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className={cn("@container/card relative", linkCard, d.orders.new > 0 && "border-brand")}>
        <CardHeader>
          <CardDescription>
            <Link href="/orders?status=new" className="after:absolute after:inset-0">
              New orders
            </Link>
          </CardDescription>
          <CardTitle className="font-serif text-3xl font-medium tabular-nums @[250px]/card:text-4xl">
            {d.orders.new}
          </CardTitle>
          <CardAction>
            {d.orders.new > 0 ? (
              <Badge className="bg-gold text-gold-foreground">To confirm</Badge>
            ) : (
              <Badge variant="outline">All clear</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            {d.orders.today} today · {d.orders.last7Days} this week
          </div>
          <div className="text-muted-foreground">
            {d.orders.confirmed} confirmed, {d.orders.outForDelivery} out for delivery
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Orders, last 30 days</CardDescription>
          <CardTitle className="font-serif text-3xl font-medium tabular-nums @[250px]/card:text-4xl">{t.orders}</CardTitle>
          <CardAction>
            <Trend value={ordersChange} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">{t.previousOrders} in the 30 days before</div>
          <div className="text-muted-foreground">Includes cancelled orders</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sales, last 30 days</CardDescription>
          <CardTitle className="font-serif text-3xl font-medium tabular-nums @[250px]/card:text-4xl">
            {formatPrice(t.sales)}
          </CardTitle>
          <CardAction>
            <Trend value={salesChange} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">{formatPrice(t.previousSales)} in the 30 days before</div>
          <div className="text-muted-foreground">Priced items only, cancelled orders excluded</div>
        </CardFooter>
      </Card>

      <Card className={cn("@container/card relative", linkCard, d.enquiries.unhandled > 0 && "border-brand")}>
        <CardHeader>
          <CardDescription>
            <Link href="/enquiries" className="after:absolute after:inset-0">
              Open enquiries
            </Link>
          </CardDescription>
          <CardTitle className="font-serif text-3xl font-medium tabular-nums @[250px]/card:text-4xl">
            {d.enquiries.unhandled}
          </CardTitle>
          <CardAction>
            {d.enquiries.unhandled > 0 ? (
              <Badge className="bg-gold text-gold-foreground">To answer</Badge>
            ) : (
              <Badge variant="outline">All clear</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            Reply by phone or WhatsApp <ArrowRight className="size-4" />
          </div>
          <div className="text-muted-foreground">Mark each one handled once answered</div>
        </CardFooter>
      </Card>
    </div>
  );
}
