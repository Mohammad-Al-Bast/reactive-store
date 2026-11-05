"use client";

import { Link } from "@/i18n/navigation";
import * as React from "react";
import { Check, MessageCircle, Minus, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { useCart } from "@/components/cart-provider";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  createOrderSchema,
  HONEYPOT_FIELD,
  type CreateOrderInput,
  type OrderSummary,
  type PaymentMethod,
} from "@reactive-store/shared";
import { useLocale } from "next-intl";

import { fieldErrors, postJson } from "@/lib/api-client";
import { formatPrice, site, telHref, whatsappHref } from "@/lib/site";
import { buildOrderMessage } from "@/lib/whatsapp";

type Field = "name" | "phone" | "city" | "address";
type Errors = Partial<Record<Field, string>>;
const fields: Field[] = ["name", "phone", "city", "address"];

export function Checkout() {
  const cart = useCart();
  const locale = useLocale();
  const [payment, setPayment] = React.useState<PaymentMethod>(site.paymentMethods[0].id);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [placed, setPlaced] = React.useState<OrderSummary | null>(null);

  function showErrors(next: Errors) {
    setErrors(next);
    const first = fields.find((k) => next[k]);
    if (first) document.getElementById(`co-${first}`)?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const order: CreateOrderInput = {
      locale: locale as CreateOrderInput["locale"],
      items: cart.lines.map((l) => ({ slug: l.slug, qty: l.qty })),
      customer: {
        name: get("name"),
        phone: get("phone"),
        governorate: get("governorate") as CreateOrderInput["customer"]["governorate"],
        city: get("city"),
        address: get("address"),
        notes: get("notes") || undefined,
      },
      paymentMethod: payment,
      [HONEYPOT_FIELD]: get(HONEYPOT_FIELD) || undefined,
    };

    // Same schema the API uses, so most mistakes are caught before the request.
    const check = createOrderSchema.safeParse(order);
    if (!check.success) {
      showErrors(fieldErrors(check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const res = await postJson<OrderSummary>("/orders", order);
    setSubmitting(false);

    if (res.ok) {
      setPlaced(res.data);
      cart.clear();
      window.scrollTo({ top: 0 });
      return;
    }
    if (res.status === 400) {
      showErrors(fieldErrors(res.body.issues));
    } else if (res.status === 422) {
      setFormError("Some items are no longer available and have been removed. Check your order and try again.");
      cart.refresh();
    } else if (res.status === 429) {
      setFormError(`Too many attempts. Please wait a few minutes, or call us on ${site.phoneDisplay}.`);
    } else {
      setFormError(
        `We couldn't place your order. Check your connection and try again, or call us on ${site.phoneDisplay}.`,
      );
    }
  }

  const clear = (k: Field) => () => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  if (placed) {
    return (
      <div className="container-page flex max-w-2xl flex-col items-center gap-4.5 py-24 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-[#e6f0e9]">
          <Check aria-hidden="true" className="size-9 text-success" strokeWidth={2.2} />
        </span>
        <h1 className="display text-[44px] leading-[1.1]">Thank you, we have your order.</h1>
        <p className="text-[17px] text-body" role="status">
          Your order number is <strong>{placed.number}</strong>. We will call you to confirm the total, delivery time
          and fees within {site.replyTime}.
        </p>
        <p className="text-[15px] text-muted-foreground">
          Want a faster reply? You can also send the order to us on WhatsApp. This is optional.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href={whatsappHref(buildOrderMessage(placed))} target="_blank" rel="noreferrer">
              <MessageCircle /> Send on WhatsApp
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="container-page flex max-w-2xl flex-col items-start gap-4 py-24">
        <h1 className="display text-[44px]">Your cart is empty</h1>
        <p className="text-[17px] text-body">Browse the shop, or tell us what you need and we will source it.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/shop">Continue shopping</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">Ask us</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 pb-22">
      <h1 className="display mb-2 text-[clamp(2.1rem,4vw,3rem)]">Your order</h1>
      <p className="mb-8 text-muted-foreground">
        No account needed. We confirm your order with you by phone before delivery.
      </p>

      <form noValidate onSubmit={onSubmit} className="relative flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Honeypot: hidden from people, so only bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
          <label htmlFor="co-website">Leave this empty</label>
          <input id="co-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="h-items" className="rounded-2xl border border-border bg-card p-6">
            <h2 id="h-items" className="mb-2 text-lg font-bold">
              1. Items
            </h2>
            {cart.error ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 py-6">
                <p className="text-destructive">We couldn&apos;t load your cart. Check your connection and try again.</p>
                <Button type="button" variant="secondary" onClick={cart.retry}>
                  Try again
                </Button>
              </div>
            ) : !cart.ready ? (
              <p className="py-6 text-muted-foreground">Loading your cart…</p>
            ) : null}
            <ul>
              {cart.lines.map(({ product, qty }) => (
                <li key={product.slug} className="flex flex-wrap items-center gap-4 border-b border-[#efebe2] py-4.5 last:border-0">
                  <ProductImage product={product} className="size-22 shrink-0 rounded-lg" sizes="88px" />
                  <div className="min-w-0 flex-[1_1_200px]">
                    <Link href={`/product/${product.slug}`} className="font-semibold hover:text-brand">
                      {product.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">{formatPrice(product.price)}</div>
                  </div>
                  <div role="group" aria-label={`Quantity for ${product.name}`} className="flex h-11 items-center rounded-md border border-input">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() => cart.setQty(product.slug, qty - 1)}
                      className="flex size-11 items-center justify-center hover:bg-muted"
                    >
                      <Minus className="size-4" />
                    </button>
                    <output className="w-7 text-center font-semibold">{qty}</output>
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => cart.setQty(product.slug, qty + 1)}
                      className="flex size-11 items-center justify-center hover:bg-muted"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="w-28 text-right font-bold">
                    {product.price == null ? <span className="text-sm text-muted-foreground">On request</span> : formatPrice(product.price * qty)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => cart.remove(product.slug)}
                    className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-delivery" className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
            <h2 id="h-delivery" className="text-lg font-bold sm:col-span-2">
              2. Delivery details
            </h2>
            <div className="grid gap-2">
              <Label htmlFor="co-name">Full name</Label>
              <Input id="co-name" name="name" autoComplete="name" aria-invalid={!!errors.name} onChange={clear("name")} />
              {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-phone">Phone / WhatsApp</Label>
              <Input id="co-phone" name="phone" type="tel" autoComplete="tel" placeholder="+961" aria-invalid={!!errors.phone} onChange={clear("phone")} />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-governorate">Governorate</Label>
              <NativeSelect id="co-governorate" name="governorate">
                {site.governorates.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-city">City / area</Label>
              <Input id="co-city" name="city" autoComplete="address-level2" aria-invalid={!!errors.city} onChange={clear("city")} />
              {errors.city ? <p className="text-sm text-destructive">{errors.city}</p> : null}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-address">Address and directions</Label>
              <Textarea
                id="co-address"
                name="address"
                rows={3}
                autoComplete="street-address"
                placeholder="Building, floor, nearby landmark"
                aria-invalid={!!errors.address}
                onChange={clear("address")}
              />
              {errors.address ? <p className="text-sm text-destructive">{errors.address}</p> : null}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="co-notes" name="notes" placeholder="Best time to call, clinic name for the invoice…" />
            </div>
          </section>

          <section aria-labelledby="h-pay" className="rounded-2xl border border-border bg-card p-6">
            <h2 id="h-pay" className="mb-4 text-lg font-bold">
              3. Payment
            </h2>
            <RadioGroup aria-labelledby="h-pay" value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="sm:grid-cols-2">
              {site.paymentMethods.map((m) => (
                <RadioCard key={m.id} value={m.id}>
                  <span className="text-[15px] font-bold">{m.name}</span>
                  <span className="text-[13px] text-muted-foreground">{m.description}</span>
                </RadioCard>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside aria-label="Order summary" className="flex w-full flex-col gap-3.5 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-6 lg:w-90">
          <h2 className="text-lg font-bold">Summary</h2>
          <div className="flex justify-between text-[15px]">
            <span className="text-muted-foreground">Items ({cart.count})</span>
            <span>{cart.subtotal > 0 ? formatPrice(cart.subtotal) : "To be confirmed"}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-muted-foreground">Delivery</span>
            <span>{site.deliveryFee}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3.5 text-xl font-bold">
            <span>Total</span>
            <span>{cart.subtotal > 0 && !cart.hasUnpriced ? formatPrice(cart.subtotal) : "We confirm by phone"}</span>
          </div>
          <p className="-mt-2 text-[13px] text-muted-foreground">Plus delivery, confirmed with you by phone.</p>
          {cart.hasUnpriced ? (
            <p className="text-[13px] text-muted-foreground">Some items are priced on request; we confirm the total before delivery.</p>
          ) : null}
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="mt-1.5"
            disabled={!cart.ready || cart.lines.length === 0 || submitting}
            aria-busy={submitting}
          >
            {submitting ? "Placing your order…" : "Place order"}
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">You pay nothing until we confirm your order by phone.</p>
          <div className="flex flex-col gap-2.5 border-t border-[#efebe2] pt-3.5 text-sm">
            <span className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden="true" className="size-4.5 text-brand" /> Warranty terms confirmed per item
            </span>
            <a href={telHref} className="flex items-center gap-2.5 hover:text-brand">
              <Phone aria-hidden="true" className="size-4.5 text-brand" /> Questions? {site.phoneDisplay}
            </a>
          </div>
        </aside>
      </form>
    </div>
  );
}
